import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../database/dexieDb', () => ({
  db: {
    commission_rates: {
      where: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
    },
    commission_earned: {
      where: vi.fn(),
      bulkAdd: vi.fn(),
      update: vi.fn(),
    },
    commission_payouts: {
      where: vi.fn(),
      add: vi.fn(),
    },
  },
}));

import { CommissionService } from '../CommissionService';
import { db } from '../../database/dexieDb';

const rates = db.commission_rates as any;
const earned = db.commission_earned as any;
const payouts = db.commission_payouts as any;

function createFilterableResult(data: any[]) {
  return {
    filter: vi.fn().mockImplementation((fn: any) => createFilterableResult(data.filter(fn))),
    toArray: vi.fn().mockResolvedValue(data),
    reverse: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue(data) }),
    sortBy: vi.fn().mockResolvedValue(data),
    first: vi.fn().mockResolvedValue(data[0]),
  };
}

describe('CommissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setRate', () => {
    it('creates a commission rate', async () => {
      rates.add.mockResolvedValue('rate-id');

      const result = await CommissionService.setRate({
        workspaceId: 'ws-1',
        userId: 'user-1',
        type: 'percentage',
        rate: 5,
      });

      expect(result.type).toBe('percentage');
      expect(result.rate).toBe(5);
      expect(result.is_active).toBe(true);
      expect(rates.add).toHaveBeenCalledOnce();
    });

    it('rejects negative rate', async () => {
      await expect(CommissionService.setRate({
        workspaceId: 'ws-1',
        userId: 'user-1',
        type: 'percentage',
        rate: -5,
      })).rejects.toThrow('RATE_CANNOT_BE_NEGATIVE');
    });

    it('rejects percentage rate over 100', async () => {
      await expect(CommissionService.setRate({
        workspaceId: 'ws-1',
        userId: 'user-1',
        type: 'percentage',
        rate: 150,
      })).rejects.toThrow('PERCENTAGE_RATE_EXCEEDS_100');
    });
  });

  describe('calculateForSale', () => {
    it('calculates percentage commission for matching items', async () => {
      rates.where.mockReturnValue({
        equals: vi.fn().mockReturnValue(
          createFilterableResult([
            { id: 'r1', type: 'percentage', rate: 10, is_active: true, workspace_id: 'ws-1' },
          ])
        ),
      });
      earned.bulkAdd.mockResolvedValue(undefined);

      const result = await CommissionService.calculateForSale({
        id: 'sale-1',
        cashier_id: 'user-1',
        workspace_id: 'ws-1',
        items: [
          { id: 'item-1', product_id: 'p1', price: 100, quantity: 2 },
        ],
      });

      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(20); // 100 * 2 * 10%
    });

    it('returns empty when no rates configured', async () => {
      rates.where.mockReturnValue({
        equals: vi.fn().mockReturnValue(createFilterableResult([])),
      });

      const result = await CommissionService.calculateForSale({
        id: 'sale-1',
        cashier_id: 'user-1',
        workspace_id: 'ws-1',
        items: [{ id: 'item-1', product_id: 'p1', price: 50, quantity: 1 }],
      });

      expect(result.length).toBe(0);
    });
  });

  describe('processPayout', () => {
    it('throws when no pending commissions', async () => {
      earned.where.mockReturnValue({
        equals: vi.fn().mockReturnValue(createFilterableResult([])),
      });

      await expect(CommissionService.processPayout({
        workspaceId: 'ws-1',
        userId: 'user-1',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
      })).rejects.toThrow('NO_PENDING_COMMISSIONS');
    });

    it('pays out all pending and creates payout record', async () => {
      const pendingItems = [
        { id: 'e1', amount: 20, status: 'pending', workspace_id: 'ws-1' },
        { id: 'e2', amount: 15, status: 'pending', workspace_id: 'ws-1' },
      ];
      earned.where.mockReturnValue({
        equals: vi.fn().mockReturnValue(createFilterableResult(pendingItems)),
      });
      earned.update.mockResolvedValue(1);
      payouts.add.mockResolvedValue('payout-id');

      const result = await CommissionService.processPayout({
        workspaceId: 'ws-1',
        userId: 'user-1',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
      });

      expect(result.amount).toBe(35);
      expect(result.status).toBe('paid');
      expect(earned.update).toHaveBeenCalledTimes(2);
      expect(payouts.add).toHaveBeenCalledOnce();
    });
  });
});
