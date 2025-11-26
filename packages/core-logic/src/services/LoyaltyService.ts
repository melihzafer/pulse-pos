import { db } from '../database/dexieDb';
import { Sale } from '../types';

export class LoyaltyService {
  // 1 point per 10 BGN spent
  private static POINTS_PER_CURRENCY_UNIT = 0.1; 

  static async processSale(sale: Sale): Promise<{ pointsEarned: number; newTier: string; previousTier: string } | null> {
    if (!sale.customer_id) return null;

    const customer = await db.customers.get(sale.customer_id);
    if (!customer) return null;

    // 1. Calculate Points
    // Floor to integer points? Plan doesn't specify, but points are usually integers.
    const pointsEarned = Math.floor(sale.total_amount * LoyaltyService.POINTS_PER_CURRENCY_UNIT);
    
    // 2. Update Customer Stats
    const newTotalSpent = (customer.total_spent || 0) + sale.total_amount;
    const newVisitCount = (customer.visit_count || 0) + 1;
    const newPoints = (customer.points || 0) + pointsEarned;
    
    // 3. Determine Tier
    let newTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
    
    if (newPoints >= 2500) newTier = 'platinum';
    else if (newPoints >= 1000) newTier = 'gold';
    else if (newPoints >= 500) newTier = 'silver';
    
    // Only update if changed or just to ensure consistency
    await db.customers.update(customer.id, {
      points: newPoints,
      total_spent: newTotalSpent,
      visit_count: newVisitCount,
      last_visit_date: new Date().toISOString(),
      tier: newTier,
      updated_at: new Date().toISOString(),
    });
    
    return { 
      pointsEarned, 
      newTier, 
      previousTier: customer.tier 
    };
  }

  static async getCustomerTier(customerId: string) {
    const customer = await db.customers.get(customerId);
    return customer?.tier || 'bronze';
  }
}
