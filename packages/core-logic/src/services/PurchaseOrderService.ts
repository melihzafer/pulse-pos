import { db } from '../database';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PurchaseOrderService {
  /**
   * Generate next PO number (PO-001, PO-002, etc.)
   */
  static async generatePONumber(workspaceId: string): Promise<string> {
    const existingPOs = await db.purchase_orders
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    const poNumbers = existingPOs
      .map((po) => po.po_number)
      .filter((num) => num.startsWith('PO-'))
      .map((num) => parseInt(num.replace('PO-', ''), 10))
      .filter((num) => !isNaN(num));

    const maxNumber = poNumbers.length > 0 ? Math.max(...poNumbers) : 0;
    const nextNumber = maxNumber + 1;

    return `PO-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Create a new purchase order
   */
  static async createPurchaseOrder(
    workspaceId: string,
    data: {
      supplierId: string;
      expectedDeliveryDate?: string;
      notes?: string;
      items: Array<{
        productId: string;
        quantityOrdered: number;
        unitCost: number;
      }>;
    }
  ): Promise<{ po: PurchaseOrder; items: PurchaseOrderItem[] }> {
    const poNumber = await this.generatePONumber(workspaceId);
    const now = new Date().toISOString();

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0
    );
    const tax = subtotal * 0.2; // 20% VAT - make configurable
    const shipping = 0; // Make configurable
    const total = subtotal + tax + shipping;

    const po: PurchaseOrder = {
      id: uuidv4(),
      workspace_id: workspaceId,
      po_number: poNumber,
      supplier_id: data.supplierId,
      status: 'draft',
      order_date: now,
      expected_delivery_date: data.expectedDeliveryDate,
      actual_delivery_date: undefined,
      subtotal,
      tax,
      shipping,
      total,
      notes: data.notes,
      created_at: now,
    };

    await db.purchase_orders.add({
      ...po,
      _synced: false,
      _dirty: true,
    });

    // Create PO items
    const items: PurchaseOrderItem[] = [];
    for (const itemData of data.items) {
      // Get product name for snapshot
      const product = await db.products.get(itemData.productId);
      
      const item: PurchaseOrderItem = {
        id: uuidv4(),
        po_id: po.id,
        product_id: itemData.productId,
        product_name: product?.name || 'Unknown Product',
        quantity_ordered: itemData.quantityOrdered,
        quantity_received: 0,
        unit_cost: itemData.unitCost,
        total_cost: itemData.quantityOrdered * itemData.unitCost,
      };

      await db.purchase_order_items.add({
        ...item,
        _synced: false,
        _dirty: true,
        _deleted: false,
      });

      items.push(item);
    }

    return { po, items };
  }

  /**
   * Update purchase order status
   */
  static async updatePOStatus(
    poId: string,
    status: PurchaseOrderStatus,
    actualDeliveryDate?: string
  ): Promise<void> {
    const updates: any = {
      status,
      _dirty: true,
      _synced: false,
    };

    if (actualDeliveryDate) {
      updates.actual_delivery_date = actualDeliveryDate;
    }

    await db.purchase_orders.update(poId, updates);
  }

  /**
   * Receive items from a purchase order (full or partial)
   */
  static async receiveItems(
    poId: string,
    receivedItems: Array<{
      itemId: string;
      quantityReceived: number;
    }>
  ): Promise<void> {
    const po = await db.purchase_orders.get(poId);
    if (!po) throw new Error('Purchase order not found');

    // Update each item's received quantity
    for (const received of receivedItems) {
      const item = await db.purchase_order_items.get(received.itemId);
      if (!item) continue;

      const newQuantityReceived = item.quantity_received + received.quantityReceived;

      await db.purchase_order_items.update(received.itemId, {
        quantity_received: newQuantityReceived,
        _dirty: true,
        _synced: false,
      });

      // Update product stock
      const product = await db.products.get(item.product_id);
      if (product) {
        await db.products.update(item.product_id, {
          stock_quantity: product.stock_quantity + received.quantityReceived,
          cost_price: item.unit_cost, // Update cost to latest purchase price
          _dirty: true,
          _synced: false,
        });

        // Create stock movement record
        await db.stock_movements.add({
          id: uuidv4(),
          workspace_id: po.workspace_id,
          product_id: item.product_id,
          quantity_change: received.quantityReceived,
          reason: 'restock',
          reference_id: poId,
          created_at: new Date().toISOString(),
          _synced: false,
        });
      }
    }

    // Check if all items are fully received
    const allItems = await db.purchase_order_items
      .where('po_id')
      .equals(poId)
      .toArray();

    const allReceived = allItems.every(
      (item) => item.quantity_received >= item.quantity_ordered
    );

    if (allReceived) {
      await this.updatePOStatus(poId, 'received', new Date().toISOString());
    } else {
      // Partial receiving
      await this.updatePOStatus(poId, 'confirmed');
    }
  }

  /**
   * Get all purchase orders for a workspace
   */
  static async getPurchaseOrders(
    workspaceId: string,
    filters?: {
      status?: PurchaseOrderStatus;
      supplierId?: string;
    }
  ): Promise<PurchaseOrder[]> {
    let query = db.purchase_orders.where('workspace_id').equals(workspaceId);

    let pos = await query.toArray();
    pos = pos.filter((po) => !po._deleted);

    if (filters?.status) {
      pos = pos.filter((po) => po.status === filters.status);
    }

    if (filters?.supplierId) {
      pos = pos.filter((po) => po.supplier_id === filters.supplierId);
    }

    // Sort by order date descending
    pos.sort((a, b) => {
      const dateA = new Date(a.order_date).getTime();
      const dateB = new Date(b.order_date).getTime();
      return dateB - dateA;
    });

    return pos;
  }

  /**
   * Get a single purchase order with its items
   */
  static async getPurchaseOrderById(poId: string): Promise<{
    po: PurchaseOrder;
    items: PurchaseOrderItem[];
    supplier: any;
  } | null> {
    const po = await db.purchase_orders.get(poId);
    if (!po || po._deleted) return null;

    const items = await db.purchase_order_items.where('po_id').equals(poId).toArray();
    const activeItems = items.filter((item) => !item._deleted);

    const supplier = await db.suppliers.get(po.supplier_id);

    return {
      po,
      items: activeItems,
      supplier,
    };
  }

  /**
   * Get items with product details for a PO
   */
  static async getPOItemsWithProducts(poId: string): Promise<
    Array<{
      item: PurchaseOrderItem;
      product: any;
    }>
  > {
    const items = await db.purchase_order_items.where('po_id').equals(poId).toArray();
    const activeItems = items.filter((item) => !item._deleted);

    const results = await Promise.all(
      activeItems.map(async (item) => {
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
   * Cancel a purchase order
   */
  static async cancelPurchaseOrder(poId: string): Promise<void> {
    await db.purchase_orders.update(poId, {
      status: 'cancelled',
      _dirty: true,
      _synced: false,
    });
  }

  /**
   * Delete a purchase order (soft delete)
   */
  static async deletePurchaseOrder(poId: string): Promise<void> {
    await db.purchase_orders.update(poId, {
      _deleted: true,
      _dirty: true,
      _synced: false,
    });

    // Also delete associated items
    const items = await db.purchase_order_items.where('po_id').equals(poId).toArray();
    for (const item of items) {
      await db.purchase_order_items.update(item.id, {
        _deleted: true,
        _dirty: true,
        _synced: false,
      });
    }
  }

  /**
   * Get low stock products that need reordering
   */
  static async getLowStockProducts(workspaceId: string): Promise<
    Array<{
      product: any;
      preferredSupplier: any;
      suggestedQuantity: number;
    }>
  > {
    const products = await db.products.where('workspace_id').equals(workspaceId).toArray();
    const lowStockProducts = products.filter(
      (p) => !p._deleted && p.stock_quantity <= p.min_stock_level
    );

    const results = await Promise.all(
      lowStockProducts.map(async (product) => {
        // Get preferred supplier
        const productSuppliers = await db.product_suppliers
          .where('product_id')
          .equals(product.id)
          .toArray();

        const activeSuppliers = productSuppliers.filter((ps) => !ps._deleted);
        const preferred = activeSuppliers.find((ps) => ps.is_preferred) || activeSuppliers[0];

        let supplier = null;
        if (preferred) {
          supplier = await db.suppliers.get(preferred.supplier_id);
        }

        // Suggest ordering to reach 2x min_stock_level
        const suggestedQuantity = Math.max(
          product.min_stock_level * 2 - product.stock_quantity,
          preferred?.min_order_quantity || 1
        );

        return {
          product,
          preferredSupplier: supplier,
          suggestedQuantity,
        };
      })
    );

    return results;
  }

  /**
   * Get backorder items (ordered but not fully received)
   */
  static async getBackorders(workspaceId: string): Promise<
    Array<{
      po: PurchaseOrder;
      item: PurchaseOrderItem;
      product: any;
      quantityPending: number;
    }>
  > {
    const pos = await db.purchase_orders.where('workspace_id').equals(workspaceId).toArray();
    const activePOs = pos.filter(
      (po) => !po._deleted && (po.status === 'confirmed' || po.status === 'sent')
    );

    const backorders: Array<{
      po: PurchaseOrder;
      item: PurchaseOrderItem;
      product: any;
      quantityPending: number;
    }> = [];

    for (const po of activePOs) {
      const items = await db.purchase_order_items.where('po_id').equals(po.id).toArray();

      for (const item of items) {
        if (item._deleted) continue;

        const quantityPending = item.quantity_ordered - item.quantity_received;
        if (quantityPending > 0) {
          const product = await db.products.get(item.product_id);
          backorders.push({
            po,
            item,
            product: product!,
            quantityPending,
          });
        }
      }
    }

    return backorders;
  }
}
