import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../database/dexieDb', () => ({
  db: {
    customer_debt_accounts: {
      where: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
    },
    debt_transactions: {
      where: vi.fn(),
      add: vi.fn(),
    },
  },
}));

import { DebtService } from '../DebtService';
import { db } from '../../database/dexieDb';

const accounts = db.customer_debt_accounts as any;
const txns = db.debt_transactions as any;

function createFilterableResult(data: any[]) {
  return {
    filter: vi.fn().mockImplementation((fn: any) => createFilterableResult(data.filter(fn))),
    first: vi.fn().mockResolvedValue(data[0]),
    toArray: vi.fn().mockResolvedValue(data),
  };
}

describe('DebtService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAccount', () => {
    it('creates a new debt account', async () => {
      accounts.where.mockReturnValue({
        equals: vi.fn().mockReturnValue(createFilterableResult([])),
      });
      accounts.add.mockResolvedValue('acc-id');

      const result = await DebtService.createAccount({
        workspaceId: 'ws-1',
        customerId: 'cust-1',
        creditLimit: 500,
      });

      expect(result.customer_id).toBe('cust-1');
      expect(result.credit_limit).toBe(500);
      expect(result.current_balance).toBe(0);
      expect(result.status).toBe('active');
    });

    it('throws if account already exists', async () => {
      accounts.where.mockReturnValue({
        equals: vi.fn().mockReturnValue(
          createFilterableResult([{ id: 'existing', status: 'active', workspace_id: 'ws-1' }])
        ),
      });

      await expect(DebtService.createAccount({
        workspaceId: 'ws-1',
        customerId: 'cust-1',
      })).rejects.toThrow('ACCOUNT_EXISTS');
    });
  });

  describe('recordTransaction', () => {
    it('records a charge and updates balance', async () => {
      accounts.get.mockResolvedValue({
        id: 'acc-1', current_balance: 100, credit_limit: 500, status: 'active',
      });
      txns.add.mockResolvedValue('tx-id');
      accounts.update.mockResolvedValue(1);

      const result = await DebtService.recordTransaction({
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        customerId: 'cust-1',
        type: 'charge',
        amount: 50,
        createdBy: 'user-1',
      });

      expect(result.amount).toBe(50);
      expect(result.balance_after).toBe(150);
    });

    it('throws when credit limit exceeded', async () => {
      accounts.get.mockResolvedValue({
        id: 'acc-1', current_balance: 450, credit_limit: 500, status: 'active',
      });

      await expect(DebtService.recordTransaction({
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        customerId: 'cust-1',
        type: 'charge',
        amount: 100,
        createdBy: 'user-1',
      })).rejects.toThrow('CREDIT_LIMIT_EXCEEDED');
    });

    it('reduces balance on payment', async () => {
      accounts.get.mockResolvedValue({
        id: 'acc-1', current_balance: 200, credit_limit: 500, status: 'active',
      });
      txns.add.mockResolvedValue('tx-id');
      accounts.update.mockResolvedValue(1);

      const result = await DebtService.recordTransaction({
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        customerId: 'cust-1',
        type: 'payment',
        amount: 75,
        createdBy: 'user-1',
      });

      expect(result.amount).toBe(-75);
      expect(result.balance_after).toBe(125);
    });

    it('throws on zero or negative amount', async () => {
      await expect(DebtService.recordTransaction({
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        customerId: 'cust-1',
        type: 'charge',
        amount: 0,
        createdBy: 'user-1',
      })).rejects.toThrow('AMOUNT_MUST_BE_POSITIVE');

      await expect(DebtService.recordTransaction({
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        customerId: 'cust-1',
        type: 'payment',
        amount: -10,
        createdBy: 'user-1',
      })).rejects.toThrow('AMOUNT_MUST_BE_POSITIVE');
    });
  });
});
