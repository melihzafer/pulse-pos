import { db } from '../database';
import type { LayawayOrder, LayawayOrderItem, LayawayPayment, LayawayOrderStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LayawayService {
  /**
   * Generate next layaway order number (LAY-001, LAY-002, etc.)
   */
  static async generateLayawayNumber(workspaceId: string): Promise<string> {
    const existing = await db.layaway_orders
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    const numbers = existing
      .map((lay) => lay.order_number)
      .filter((num) => num.startsWith('LAY-'))
      .map((num) => parseInt(num.replace('LAY-', ''), 10))
      .filter((num) => !isNaN(num));

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    return `LAY-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Create a new layaway order
   */
  static async createLayawayOrder(
    workspaceId: string,
    data: {
      customerId: string;
      userId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
      }>;
      depositAmount: number;
      depositPercentage: number;
      restockingFeePercent?: number;
      notes?: string;
    }
  ): Promise<{ order: LayawayOrder; items: LayawayOrderItem[] }> {
    const orderNumber = await this.generateLayawayNumber(workspaceId);
    const now = new Date().toISOString();

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const tax = subtotal * 0.2; // 20% VAT - make configurable
    const total = subtotal + tax;

    // Validate deposit
    const minDeposit = total * (data.depositPercentage / 100);
    if (data.depositAmount < minDeposit) {
      throw new Error(
        `Deposit must be at least ${data.depositPercentage}% (${minDeposit.toFixed(2)} BGN)`
      );
    }

    const order: LayawayOrder = {
      id: uuidv4(),
      workspace_id: workspaceId,
      order_number: orderNumber,
      customer_id: data.customerId,
      user_id: data.userId,
      status: 'active',
      subtotal,
      tax,
      total,
      deposit_amount: data.depositAmount,
      balance_due: total - data.depositAmount,
      deposit_percentage: data.depositPercentage,
      restocking_fee_percent: data.restockingFeePercent || 10,
      notes: data.notes,
      created_at: now,
    };

    await db.layaway_orders.add({
      ...order,
      _synced: false,
      _dirty: true,
    });

    // Create layaway items and reserve stock
    const items: LayawayOrderItem[] = [];
    for (const itemData of data.items) {
      // Get product for snapshot
      const product = await db.products.get(itemData.productId);
      if (!product) {
        throw new Error(`Product ${itemData.productId} not found`);
      }
      
      const item: LayawayOrderItem = {
        id: uuidv4(),
        layaway_id: order.id,
        product_id: itemData.productId,
        product_name: product.name,
        quantity: itemData.quantity,
        unit_price: itemData.unitPrice,
        subtotal: itemData.quantity * itemData.unitPrice,
      };

      await db.layaway_order_items.add({
        ...item,
        _synced: false,
      });

      items.push(item);

      // Reserve stock (reduce available quantity)
      await db.products.update(itemData.productId, {
        stock_quantity: product.stock_quantity - itemData.quantity,
        _dirty: true,
        _synced: false,
      });

      // Create stock movement for reservation
      await db.stock_movements.add({
        id: uuidv4(),
        workspace_id: workspaceId,
        product_id: itemData.productId,
        quantity_change: -itemData.quantity,
        reason: 'correction', // Use 'correction' for layaway reservations
        reference_id: order.id,
        created_at: now,
        adjustment_reason: 'other',
        adjustment_notes: `Layaway reservation: ${orderNumber}`,
        _synced: false,
      });
    }

    // Record the deposit payment
    await this.recordPayment(order.id, data.depositAmount, 'Deposit payment');

    return { order, items };
  }

  /**
   * Record a payment towards a layaway order
   */
  static async recordPayment(
    layawayId: string,
    amount: number,
    notes?: string
  ): Promise<LayawayPayment> {
    const order = await db.layaway_orders.get(layawayId);
    if (!order) throw new Error('Layaway order not found');

    if (order.status !== 'active') {
      throw new Error('Can only make payments on active layaway orders');
    }

    const now = new Date().toISOString();

    const payment: LayawayPayment = {
      id: uuidv4(),
      layaway_id: layawayId,
      amount,
      payment_date: now,
      notes,
    };

    await db.layaway_payments.add({
      ...payment,
      _synced: false,
    });

    // Update order balance
    const newBalance = order.balance_due - amount;

    await db.layaway_orders.update(layawayId, {
      balance_due: newBalance,
      _dirty: true,
      _synced: false,
    });

    // If fully paid, complete the layaway
    if (newBalance <= 0) {
      await this.completeLayaway(layawayId);
    }

    return payment;
  }

  /**
   * Complete a layaway order (convert to sale)
   */
  static async completeLayaway(layawayId: string): Promise<void> {
    const order = await db.layaway_orders.get(layawayId);
    if (!order) throw new Error('Layaway order not found');

    const now = new Date().toISOString();

    // Update order status
    await db.layaway_orders.update(layawayId, {
      status: 'completed',
      completed_at: now,
      _dirty: true,
      _synced: false,
    });

    // Items are already removed from stock during reservation
    // No additional stock adjustments needed
  }

  /**
   * Cancel a layaway order
   */
  static async cancelLayaway(
    layawayId: string,
    applyRestockingFee: boolean = true
  ): Promise<{ refundAmount: number }> {
    const order = await db.layaway_orders.get(layawayId);
    if (!order) throw new Error('Layaway order not found');

    if (order.status !== 'active') {
      throw new Error('Can only cancel active layaway orders');
    }

    const now = new Date().toISOString();

    // Calculate total paid
    const payments = await db.layaway_payments
      .where('layaway_id')
      .equals(layawayId)
      .toArray();

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate refund (minus restocking fee if applicable)
    let refundAmount = totalPaid;
    if (applyRestockingFee) {
      const restockingFee = totalPaid * (order.restocking_fee_percent / 100);
      refundAmount = totalPaid - restockingFee;
    }

    // Update order status
    await db.layaway_orders.update(layawayId, {
      status: 'cancelled',
      cancelled_at: now,
      _dirty: true,
      _synced: false,
    });

    // Return items to stock
    const items = await db.layaway_order_items
      .where('layaway_id')
      .equals(layawayId)
      .toArray();

    for (const item of items) {
      const product = await db.products.get(item.product_id);
      if (product) {
        await db.products.update(item.product_id, {
          stock_quantity: product.stock_quantity + item.quantity,
          _dirty: true,
          _synced: false,
        });

        // Create stock movement for return
        await db.stock_movements.add({
          id: uuidv4(),
          workspace_id: order.workspace_id,
          product_id: item.product_id,
          quantity_change: item.quantity,
          reason: 'correction',
          reference_id: order.id,
          created_at: now,
          adjustment_reason: 'other',
          adjustment_notes: `Layaway cancelled: ${order.order_number}`,
          _synced: false,
        });
      }
    }

    return { refundAmount };
  }

  /**
   * Get all layaway orders for a workspace
   */
  static async getLayawayOrders(
    workspaceId: string,
    filters?: {
      status?: LayawayOrderStatus;
      customerId?: string;
    }
  ): Promise<LayawayOrder[]> {
    let orders = await db.layaway_orders
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    orders = orders.filter((o) => !o._deleted);

    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }

    if (filters?.customerId) {
      orders = orders.filter((o) => o.customer_id === filters.customerId);
    }

    // Sort by created date descending
    orders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return orders;
  }

  /**
   * Get a single layaway order with details
   */
  static async getLayawayOrderById(layawayId: string): Promise<{
    order: LayawayOrder;
    items: LayawayOrderItem[];
    payments: LayawayPayment[];
    customer: any;
  } | null> {
    const order = await db.layaway_orders.get(layawayId);
    if (!order || order._deleted) return null;

    const items = await db.layaway_order_items
      .where('layaway_id')
      .equals(layawayId)
      .toArray();

    const payments = await db.layaway_payments
      .where('layaway_id')
      .equals(layawayId)
      .toArray();

    const customer = await db.customers.get(order.customer_id);

    return {
      order,
      items,
      payments,
      customer,
    };
  }

  /**
   * Get layaway items with product details
   */
  static async getLayawayItemsWithProducts(layawayId: string): Promise<
    Array<{
      item: LayawayOrderItem;
      product: any;
    }>
  > {
    const items = await db.layaway_order_items
      .where('layaway_id')
      .equals(layawayId)
      .toArray();

    const results = await Promise.all(
      items.map(async (item) => {
        const product = await db.products.get(item.product_id);
        return {
          item,
          product: product!,
        };
      })
    );

    return results.filter((r) => r.product);
  }

  /**
   * Get payment history for a layaway order
   */
  static async getPaymentHistory(layawayId: string): Promise<LayawayPayment[]> {
    const payments = await db.layaway_payments
      .where('layaway_id')
      .equals(layawayId)
      .toArray();

    // Sort by payment date ascending
    payments.sort((a, b) => {
      const dateA = new Date(a.payment_date).getTime();
      const dateB = new Date(b.payment_date).getTime();
      return dateA - dateB;
    });

    return payments;
  }

  /**
   * Get layaway statistics for workspace
   */
  static async getLayawayStats(workspaceId: string): Promise<{
    activeOrders: number;
    totalValue: number;
    totalCollected: number;
    totalOutstanding: number;
  }> {
    const orders = await db.layaway_orders
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    const activeOrders = orders.filter((o) => !o._deleted && o.status === 'active');

    const totalValue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOutstanding = activeOrders.reduce((sum, o) => sum + o.balance_due, 0);
    const totalCollected = totalValue - totalOutstanding;

    return {
      activeOrders: activeOrders.length,
      totalValue,
      totalCollected,
      totalOutstanding,
    };
  }
}
