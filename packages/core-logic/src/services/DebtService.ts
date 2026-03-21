import { db, LocalCustomerDebtAccount, LocalDebtTransaction } from '../database/dexieDb';
import type { CustomerDebtAccount, DebtTransaction, DebtTransactionType } from '../types';

export const DebtService = {
  async createAccount(data: {
    workspaceId: string;
    customerId: string;
    creditLimit?: number;
  }): Promise<CustomerDebtAccount> {
    const existing = await db.customer_debt_accounts
      .where('customer_id')
      .equals(data.customerId)
      .filter(a => a.workspace_id === data.workspaceId && a.status !== 'closed')
      .first();

    if (existing) throw new Error('ACCOUNT_EXISTS');

    const now = new Date().toISOString();
    const account: LocalCustomerDebtAccount = {
      id: crypto.randomUUID(),
      workspace_id: data.workspaceId,
      customer_id: data.customerId,
      credit_limit: data.creditLimit ?? 0,
      current_balance: 0,
      is_active: true,
      status: 'active',
      created_at: now,
      updated_at: now,
      _synced: false,
      _dirty: true,
    };

    await db.customer_debt_accounts.add(account);
    return account;
  },

  async getAccount(accountId: string): Promise<CustomerDebtAccount | undefined> {
    return db.customer_debt_accounts.get(accountId);
  },

  async getAccountByCustomer(customerId: string, workspaceId: string): Promise<CustomerDebtAccount | undefined> {
    return db.customer_debt_accounts
      .where('customer_id')
      .equals(customerId)
      .filter(a => a.workspace_id === workspaceId && a.status !== 'closed')
      .first();
  },

  async getAllAccounts(workspaceId: string): Promise<CustomerDebtAccount[]> {
    return db.customer_debt_accounts
      .where('workspace_id')
      .equals(workspaceId)
      .filter(a => a.status !== 'closed')
      .toArray();
  },

  async recordTransaction(data: {
    workspaceId: string;
    accountId: string;
    customerId: string;
    type: DebtTransactionType;
    amount: number;
    referenceId?: string;
    referenceType?: string;
    notes?: string;
    createdBy: string;
  }): Promise<DebtTransaction> {
    if (data.amount <= 0) throw new Error('AMOUNT_MUST_BE_POSITIVE');

    const account = await db.customer_debt_accounts.get(data.accountId);
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    if (account.status !== 'active') throw new Error('ACCOUNT_NOT_ACTIVE');

    // Calculate signed amount: charge adds debt, payment reduces
    const signedAmount = ['charge', 'interest'].includes(data.type) ? Math.abs(data.amount) : -Math.abs(data.amount);
    const newBalance = account.current_balance + signedAmount;

    // Check credit limit for charges
    if (signedAmount > 0 && account.credit_limit > 0 && newBalance > account.credit_limit) {
      throw new Error('CREDIT_LIMIT_EXCEEDED');
    }

    const now = new Date().toISOString();

    const transaction: LocalDebtTransaction = {
      id: crypto.randomUUID(),
      workspace_id: data.workspaceId,
      account_id: data.accountId,
      customer_id: data.customerId,
      type: data.type,
      amount: signedAmount,
      balance_after: newBalance,
      reference_id: data.referenceId,
      reference_type: data.referenceType,
      notes: data.notes,
      created_by: data.createdBy,
      created_at: now,
      _synced: false,
      _dirty: true,
    };

    await db.debt_transactions.add(transaction);
    await db.customer_debt_accounts.update(data.accountId, {
      current_balance: newBalance,
      last_transaction_at: now,
      updated_at: now,
      _dirty: true,
    });

    return transaction;
  },

  async getTransactions(accountId: string): Promise<DebtTransaction[]> {
    return db.debt_transactions
      .where('account_id')
      .equals(accountId)
      .reverse()
      .sortBy('created_at');
  },

  async getBalance(accountId: string): Promise<number> {
    const account = await db.customer_debt_accounts.get(accountId);
    return account?.current_balance ?? 0;
  },

  async suspendAccount(accountId: string): Promise<void> {
    await db.customer_debt_accounts.update(accountId, {
      status: 'suspended',
      is_active: false,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },

  async reactivateAccount(accountId: string): Promise<void> {
    await db.customer_debt_accounts.update(accountId, {
      status: 'active',
      is_active: true,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },

  async closeAccount(accountId: string): Promise<void> {
    const account = await db.customer_debt_accounts.get(accountId);
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    if (account.current_balance !== 0) throw new Error('BALANCE_NOT_ZERO');

    await db.customer_debt_accounts.update(accountId, {
      status: 'closed',
      is_active: false,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },

  async updateCreditLimit(accountId: string, newLimit: number): Promise<void> {
    await db.customer_debt_accounts.update(accountId, {
      credit_limit: newLimit,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },
};
