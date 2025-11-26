import { db } from '../database';
import type { GiftCard } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class GiftCardService {
  /**
   * Generate a unique gift card number (barcode format)
   * Format: GC-XXXXXXXXXXXX (14 digits total)
   */
  static generateCardNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `GC${timestamp}${random}`;
  }

  /**
   * Issue a new gift card (sell)
   */
  static async issueGiftCard(
    workspaceId: string,
    data: {
      amount: number;
      issuedByUserId: string;
      soldToCustomerId?: string;
      notes?: string;
    }
  ): Promise<GiftCard> {
    const cardNumber = this.generateCardNumber();
    const now = new Date().toISOString();

    const giftCard: GiftCard = {
      id: uuidv4(),
      workspace_id: workspaceId,
      card_number: cardNumber,
      balance: data.amount,
      original_amount: data.amount,
      is_active: true,
      issued_date: now,
      last_used_date: undefined,
      issued_by_user_id: data.issuedByUserId,
      sold_to_customer_id: data.soldToCustomerId,
      notes: data.notes,
    };

    await db.gift_cards.add({
      ...giftCard,
      _synced: false,
      _dirty: true,
    });

    return giftCard;
  }

  /**
   * Redeem a gift card (apply balance to transaction)
   */
  static async redeemGiftCard(
    cardNumber: string,
    amount: number
  ): Promise<{ success: boolean; newBalance: number; message: string }> {
    // Find the gift card
    const allCards = await db.gift_cards.toArray();
    const card = allCards.find(
      (c) => c.card_number === cardNumber && !c._deleted
    );

    if (!card) {
      return {
        success: false,
        newBalance: 0,
        message: 'Gift card not found',
      };
    }

    if (!card.is_active) {
      return {
        success: false,
        newBalance: card.balance,
        message: 'Gift card is inactive',
      };
    }

    if (card.balance <= 0) {
      return {
        success: false,
        newBalance: 0,
        message: 'Gift card has no balance',
      };
    }

    if (amount > card.balance) {
      return {
        success: false,
        newBalance: card.balance,
        message: `Insufficient balance. Available: ${card.balance.toFixed(2)}`,
      };
    }

    // Redeem the amount
    const newBalance = card.balance - amount;
    const now = new Date().toISOString();

    await db.gift_cards.update(card.id, {
      balance: newBalance,
      last_used_date: now,
      is_active: newBalance > 0, // Deactivate if fully redeemed
      _dirty: true,
      _synced: false,
    });

    return {
      success: true,
      newBalance,
      message: newBalance > 0
        ? `Redeemed ${amount.toFixed(2)}. Remaining balance: ${newBalance.toFixed(2)}`
        : 'Gift card fully redeemed',
    };
  }

  /**
   * Check gift card balance
   */
  static async checkBalance(
    cardNumber: string
  ): Promise<{ found: boolean; balance: number; isActive: boolean }> {
    const allCards = await db.gift_cards.toArray();
    const card = allCards.find(
      (c) => c.card_number === cardNumber && !c._deleted
    );

    if (!card) {
      return { found: false, balance: 0, isActive: false };
    }

    return {
      found: true,
      balance: card.balance,
      isActive: card.is_active,
    };
  }

  /**
   * Reload (add value) to an existing gift card
   */
  static async reloadGiftCard(
    cardNumber: string,
    amount: number
  ): Promise<{ success: boolean; newBalance: number; message: string }> {
    const allCards = await db.gift_cards.toArray();
    const card = allCards.find(
      (c) => c.card_number === cardNumber && !c._deleted
    );

    if (!card) {
      return {
        success: false,
        newBalance: 0,
        message: 'Gift card not found',
      };
    }

    const newBalance = card.balance + amount;
    const now = new Date().toISOString();

    await db.gift_cards.update(card.id, {
      balance: newBalance,
      is_active: true, // Reactivate if it was inactive
      last_used_date: now,
      _dirty: true,
      _synced: false,
    });

    return {
      success: true,
      newBalance,
      message: `Added ${amount.toFixed(2)}. New balance: ${newBalance.toFixed(2)}`,
    };
  }

  /**
   * Get gift card by card number
   */
  static async getGiftCard(cardNumber: string): Promise<GiftCard | null> {
    const allCards = await db.gift_cards.toArray();
    const card = allCards.find(
      (c) => c.card_number === cardNumber && !c._deleted
    );
    return card || null;
  }

  /**
   * Get all gift cards for a workspace
   */
  static async getGiftCards(
    workspaceId: string,
    filters?: {
      activeOnly?: boolean;
      customerId?: string;
    }
  ): Promise<GiftCard[]> {
    let cards = await db.gift_cards
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    cards = cards.filter((c) => !c._deleted);

    if (filters?.activeOnly) {
      cards = cards.filter((c) => c.is_active && c.balance > 0);
    }

    if (filters?.customerId) {
      cards = cards.filter((c) => c.sold_to_customer_id === filters.customerId);
    }

    // Sort by issued date descending
    cards.sort((a, b) => {
      const dateA = new Date(a.issued_date).getTime();
      const dateB = new Date(b.issued_date).getTime();
      return dateB - dateA;
    });

    return cards;
  }

  /**
   * Deactivate a gift card
   */
  static async deactivateGiftCard(cardId: string): Promise<void> {
    await db.gift_cards.update(cardId, {
      is_active: false,
      _dirty: true,
      _synced: false,
    });
  }

  /**
   * Bulk generate gift cards (for corporate orders)
   */
  static async bulkGenerateGiftCards(
    workspaceId: string,
    data: {
      count: number;
      amount: number;
      issuedByUserId: string;
      notes?: string;
    }
  ): Promise<GiftCard[]> {
    const cards: GiftCard[] = [];

    for (let i = 0; i < data.count; i++) {
      const card = await this.issueGiftCard(workspaceId, {
        amount: data.amount,
        issuedByUserId: data.issuedByUserId,
        notes: data.notes,
      });
      cards.push(card);
    }

    return cards;
  }

  /**
   * Get gift card statistics for workspace
   */
  static async getGiftCardStats(workspaceId: string): Promise<{
    totalIssued: number;
    totalValue: number;
    totalRedeemed: number;
    activeCards: number;
    activeBalance: number;
  }> {
    const cards = await db.gift_cards
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    const activeCards = cards.filter((c) => !c._deleted);

    const totalIssued = activeCards.length;
    const totalValue = activeCards.reduce((sum, c) => sum + c.original_amount, 0);
    const currentBalance = activeCards.reduce((sum, c) => sum + c.balance, 0);
    const totalRedeemed = totalValue - currentBalance;
    const activeCount = activeCards.filter((c) => c.is_active && c.balance > 0).length;

    return {
      totalIssued,
      totalValue,
      totalRedeemed,
      activeCards: activeCount,
      activeBalance: currentBalance,
    };
  }
}
