import { db, LocalProductBatch, LocalBatchTransaction } from '../database/dexieDb';
import type { ProductBatch } from '../types';

export const BatchService = {
  async addBatch(data: {
    workspaceId: string;
    productId: string;
    locationId?: string;
    batchNumber?: string;
    lotNumber?: string;
    quantity: number;
    cost: number;
    expiryDate?: string;
    supplierId?: string;
    notes?: string;
  }): Promise<ProductBatch> {
    const now = new Date().toISOString();
    const batch: LocalProductBatch = {
      id: crypto.randomUUID(),
      workspace_id: data.workspaceId,
      product_id: data.productId,
      location_id: data.locationId,
      batch_number: data.batchNumber,
      lot_number: data.lotNumber,
      quantity: data.quantity,
      cost: data.cost,
      expiry_date: data.expiryDate,
      received_at: now,
      is_expired: false,
      is_depleted: false,
      supplier_id: data.supplierId,
      notes: data.notes,
      created_at: now,
      _synced: false,
      _dirty: true,
    };

    await db.product_batches.add(batch);

    // Record receive transaction
    await db.batch_transactions.add({
      id: crypto.randomUUID(),
      batch_id: batch.id,
      type: 'receive',
      quantity: data.quantity,
      balance_after: data.quantity,
      created_at: now,
      _synced: false,
      _dirty: true,
    } as LocalBatchTransaction);

    return batch;
  },

  async consumeFromBatches(productId: string, quantity: number, locationId?: string): Promise<{
    consumed: Array<{ batch_id: string; batch_number?: string; consumed: number; cost: number }>;
    shortage: number;
  }> {
    // FIFO: oldest batches consumed first
    let query = db.product_batches
      .where('product_id')
      .equals(productId)
      .filter(b => !b.is_expired && !b.is_depleted && b.quantity > 0);

    if (locationId) {
      query = db.product_batches
        .where('product_id')
        .equals(productId)
        .filter(b => !b.is_expired && !b.is_depleted && b.quantity > 0 && b.location_id === locationId);
    }

    const batches = await query.sortBy('received_at');
    const consumed: Array<{ batch_id: string; batch_number?: string; consumed: number; cost: number }> = [];
    let remaining = quantity;
    const now = new Date().toISOString();

    for (const batch of batches) {
      if (remaining <= 0) break;

      const fromBatch = Math.min(batch.quantity, remaining);
      const newQty = batch.quantity - fromBatch;

      await db.batch_transactions.add({
        id: crypto.randomUUID(),
        batch_id: batch.id,
        type: 'sell',
        quantity: -fromBatch,
        balance_after: newQty,
        created_at: now,
        _synced: false,
        _dirty: true,
      } as LocalBatchTransaction);

      await db.product_batches.update(batch.id, {
        quantity: newQty,
        is_depleted: newQty === 0,
        _dirty: true,
      });

      consumed.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        consumed: fromBatch,
        cost: batch.cost || 0,
      });

      remaining -= fromBatch;
    }

    return { consumed, shortage: remaining };
  },

  async markExpiredBatches(workspaceId: string): Promise<number> {
    const now = new Date().toISOString();
    const expired = await db.product_batches
      .where('workspace_id')
      .equals(workspaceId)
      .filter(b => !b.is_expired && b.expiry_date != null && b.expiry_date < now && b.quantity > 0)
      .toArray();

    for (const batch of expired) {
      await db.product_batches.update(batch.id, { is_expired: true, _dirty: true });
    }

    return expired.length;
  },

  async getActiveBatches(workspaceId: string): Promise<ProductBatch[]> {
    return db.product_batches
      .where('workspace_id')
      .equals(workspaceId)
      .filter(b => b.quantity > 0 && !b.is_depleted)
      .toArray();
  },

  async getExpiringSoon(workspaceId: string, daysAhead: number = 30, locationId?: string): Promise<ProductBatch[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString();

    return db.product_batches
      .where('workspace_id')
      .equals(workspaceId)
      .filter(b =>
        !b.is_expired &&
        !b.is_depleted &&
        b.expiry_date != null &&
        b.expiry_date <= futureDateStr &&
        b.quantity > 0 &&
        (!locationId || b.location_id === locationId)
      )
      .sortBy('expiry_date');
  },

  async wasteExpiredBatch(batchId: string): Promise<void> {
    const batch = await db.product_batches.get(batchId);
    if (!batch) throw new Error('BATCH_NOT_FOUND');

    const now = new Date().toISOString();

    await db.batch_transactions.add({
      id: crypto.randomUUID(),
      batch_id: batchId,
      type: 'waste',
      quantity: -batch.quantity,
      balance_after: 0,
      created_at: now,
      _synced: false,
      _dirty: true,
    } as LocalBatchTransaction);

    await db.product_batches.update(batchId, {
      quantity: 0,
      is_depleted: true,
      _dirty: true,
    });
  },

  async getBatchesByProduct(productId: string, includeEmpty: boolean = false): Promise<ProductBatch[]> {
    return db.product_batches
      .where('product_id')
      .equals(productId)
      .filter(b => includeEmpty || b.quantity > 0)
      .sortBy('received_at');
  },
};
