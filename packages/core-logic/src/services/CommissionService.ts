import { db, LocalCommissionRate, LocalCommissionEarned, LocalCommissionPayout } from '../database/dexieDb';
import type { CommissionRate, CommissionEarned, CommissionPayout } from '../types';

export const CommissionService = {
  async setRate(data: {
    workspaceId: string;
    userId: string;
    type: 'percentage' | 'fixed' | 'per_unit';
    rate: number;
    productId?: string;
    categoryId?: string;
  }): Promise<CommissionRate> {
    if (data.rate < 0) throw new Error('RATE_CANNOT_BE_NEGATIVE');
    if (data.type === 'percentage' && data.rate > 100) throw new Error('PERCENTAGE_RATE_EXCEEDS_100');

    const now = new Date().toISOString();
    const commRate: LocalCommissionRate = {
      id: crypto.randomUUID(),
      workspace_id: data.workspaceId,
      user_id: data.userId,
      type: data.type,
      rate: data.rate,
      product_id: data.productId,
      category_id: data.categoryId,
      is_active: true,
      created_at: now,
      updated_at: now,
      _synced: false,
      _dirty: true,
    };

    await db.commission_rates.add(commRate);
    return commRate;
  },

  async getRates(userId: string, workspaceId: string): Promise<CommissionRate[]> {
    return db.commission_rates
      .where('user_id')
      .equals(userId)
      .filter(r => r.workspace_id === workspaceId && r.is_active)
      .toArray();
  },

  async deactivateRate(rateId: string): Promise<void> {
    await db.commission_rates.update(rateId, {
      is_active: false,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },

  async calculateForSale(sale: {
    id: string;
    cashier_id: string;
    workspace_id: string;
    items: Array<{
      id: string;
      product_id: string;
      category_id?: string;
      price: number;
      quantity: number;
    }>;
  }): Promise<CommissionEarned[]> {
    const rates = await this.getRates(sale.cashier_id, sale.workspace_id);
    if (rates.length === 0) return [];

    const earned: LocalCommissionEarned[] = [];
    const now = new Date().toISOString();

    for (const rate of rates) {
      const applicableItems = sale.items.filter(item =>
        (!rate.product_id || item.product_id === rate.product_id) &&
        (!rate.category_id || item.category_id === rate.category_id)
      );

      for (const item of applicableItems) {
        let amount = 0;
        switch (rate.type) {
          case 'percentage':
            amount = (item.price * item.quantity * rate.rate) / 100;
            break;
          case 'fixed':
            amount = rate.rate; // flat amount per matching sale line
            break;
          case 'per_unit':
            amount = rate.rate * item.quantity;
            break;
        }

        if (amount > 0) {
          earned.push({
            id: crypto.randomUUID(),
            workspace_id: sale.workspace_id,
            user_id: sale.cashier_id,
            sale_id: sale.id,
            sale_item_id: item.id,
            product_id: item.product_id,
            amount,
            rate_type: rate.type,
            rate_value: rate.rate,
            status: 'pending',
            created_at: now,
            _synced: false,
            _dirty: true,
          });
        }
      }
    }

    if (earned.length > 0) {
      await db.commission_earned.bulkAdd(earned);
    }

    return earned;
  },

  async getSummary(userId: string, workspaceId: string, startDate: string, endDate: string): Promise<{
    totalEarned: number;
    pending: number;
    approved: number;
    paid: number;
    transactionCount: number;
  }> {
    const earned = await db.commission_earned
      .where('user_id')
      .equals(userId)
      .filter(e =>
        e.workspace_id === workspaceId &&
        (e.created_at || '') >= startDate &&
        (e.created_at || '') <= endDate
      )
      .toArray();

    return {
      totalEarned: earned.reduce((sum, e) => sum + e.amount, 0),
      pending: earned.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
      approved: earned.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
      paid: earned.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0),
      transactionCount: earned.length,
    };
  },

  async processPayout(data: {
    workspaceId: string;
    userId: string;
    periodStart: string;
    periodEnd: string;
    notes?: string;
  }): Promise<CommissionPayout> {
    const pending = await db.commission_earned
      .where('user_id')
      .equals(data.userId)
      .filter(e =>
        e.workspace_id === data.workspaceId &&
        e.status === 'pending'
      )
      .toArray();

    if (pending.length === 0) throw new Error('NO_PENDING_COMMISSIONS');

    const totalAmount = pending.reduce((sum, e) => sum + e.amount, 0);
    const now = new Date().toISOString();

    // Mark all pending as paid
    for (const item of pending) {
      await db.commission_earned.update(item.id, { status: 'paid', _dirty: true });
    }

    const payout: LocalCommissionPayout = {
      id: crypto.randomUUID(),
      workspace_id: data.workspaceId,
      user_id: data.userId,
      amount: totalAmount,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      status: 'paid',
      paid_at: now,
      notes: data.notes,
      created_at: now,
      _synced: false,
      _dirty: true,
    };

    await db.commission_payouts.add(payout);
    return payout;
  },

  async getPayouts(userId: string, workspaceId: string): Promise<CommissionPayout[]> {
    return db.commission_payouts
      .where('user_id')
      .equals(userId)
      .filter(p => p.workspace_id === workspaceId)
      .reverse()
      .sortBy('created_at');
  },
};
