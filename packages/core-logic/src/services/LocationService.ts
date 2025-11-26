import { db } from '../database/dexieDb';
import type { Location } from '../types';

export class LocationService {
  /**
   * Get all active locations for a workspace
   */
  static async getAllLocations(workspaceId: string): Promise<Location[]> {
    return await db.locations
      .where('workspace_id')
      .equals(workspaceId)
      .and(loc => loc.is_active === true)
      .toArray();
  }

  /**
   * Get a location by ID
   */
  static async getLocationById(locationId: string): Promise<Location | undefined> {
    return await db.locations.get(locationId);
  }

  /**
   * Create a new location
   */
  static async createLocation(location: Omit<Location, 'id' | 'created_at'>): Promise<string> {
    const newLocation: Location = {
      id: crypto.randomUUID(),
      ...location,
      created_at: new Date().toISOString(),
    };

    await db.locations.add({
      ...newLocation,
      _synced: false,
      _dirty: true,
    });

    return newLocation.id;
  }

  /**
   * Update an existing location
   */
  static async updateLocation(locationId: string, updates: Partial<Location>): Promise<void> {
    await db.locations.update(locationId, {
      ...updates,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  }

  /**
   * Deactivate a location (soft delete)
   */
  static async deactivateLocation(locationId: string): Promise<void> {
    await db.locations.update(locationId, {
      is_active: false,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  }

  /**
   * Get or create default location for workspace
   */
  static async getOrCreateDefaultLocation(workspaceId: string): Promise<Location> {
    const locations = await db.locations
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();

    if (locations.length > 0) {
      return locations[0];
    }

    // Create default location
    const defaultLocation: Location = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      name: 'Main Location',
      is_active: true,
      timezone: 'Europe/Sofia',
      currency: 'BGN',
      created_at: new Date().toISOString(),
    };

    await db.locations.add({
      ...defaultLocation,
      _synced: false,
      _dirty: true,
    });

    return defaultLocation;
  }

  /**
   * Get stock levels across all locations for a product
   */
  static async getProductStockByLocation(productId: string): Promise<Array<{
    location: Location;
    stock: number;
  }>> {
    const product = await db.products.get(productId);
    if (!product) return [];

    const locations = await db.locations
      .where('workspace_id')
      .equals(product.workspace_id)
      .and(loc => loc.is_active === true)
      .toArray();

    // Get products for each location
    const stockByLocation = await Promise.all(
      locations.map(async (location) => {
        const locationProducts = await db.products
          .where('[workspace_id+location_id]')
          .equals([product.workspace_id, location.id])
          .toArray();

        const productAtLocation = locationProducts.find(p => p.id === productId);
        
        return {
          location,
          stock: productAtLocation?.stock_quantity || 0,
        };
      })
    );

    return stockByLocation;
  }

  /**
   * Get location-specific pricing for a product
   */
  static async getLocationPricing(locationId: string, productId: string): Promise<number | null> {
    const pricing = await db.location_pricing
      .where('[location_id+product_id]')
      .equals([locationId, productId])
      .and(p => p.is_active === true)
      .first();

    return pricing?.sale_price ?? null;
  }

  /**
   * Set location-specific pricing for a product
   */
  static async setLocationPricing(
    locationId: string,
    productId: string,
    salePrice: number
  ): Promise<void> {
    const existing = await db.location_pricing
      .where('[location_id+product_id]')
      .equals([locationId, productId])
      .first();

    if (existing) {
      await db.location_pricing.update(existing.id, {
        sale_price: salePrice,
        is_active: true,
        updated_at: new Date().toISOString(),
        _dirty: true,
      });
    } else {
      await db.location_pricing.add({
        id: crypto.randomUUID(),
        location_id: locationId,
        product_id: productId,
        sale_price: salePrice,
        is_active: true,
        created_at: new Date().toISOString(),
        _synced: false,
        _dirty: true,
      });
    }
  }

  /**
   * Remove location-specific pricing
   */
  static async removeLocationPricing(locationId: string, productId: string): Promise<void> {
    const pricing = await db.location_pricing
      .where('[location_id+product_id]')
      .equals([locationId, productId])
      .first();

    if (pricing) {
      await db.location_pricing.update(pricing.id, {
        is_active: false,
        updated_at: new Date().toISOString(),
        _dirty: true,
      });
    }
  }

  /**
   * Get sales for a location by date range
   */
  static async getLocationSales(locationId: string, period: 'today' | 'week' | 'month'): Promise<any[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const sales = await db.sales
      .where('location_id')
      .equals(locationId)
      .and(sale => sale.created_at ? new Date(sale.created_at) >= startDate : false)
      .toArray();

    // Get items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const items = await db.sale_items
          .where('sale_id')
          .equals(sale.id)
          .toArray();
        return { ...sale, items };
      })
    );

    return salesWithItems;
  }

  /**
   * Get sales for a location within a specific date range
   */
  static async getLocationSalesInRange(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    const sales = await db.sales
      .where('location_id')
      .equals(locationId)
      .and(sale => {
        if (!sale.created_at) return false;
        const saleDate = new Date(sale.created_at);
        return saleDate >= start && saleDate <= end;
      })
      .toArray();

    // Get items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const items = await db.sale_items
          .where('sale_id')
          .equals(sale.id)
          .toArray();
        return { ...sale, items };
      })
    );

    return salesWithItems;
  }

  /**
   * Get inventory for a location
   */
  static async getLocationInventory(locationId: string): Promise<any[]> {
    return await db.products
      .where('location_id')
      .equals(locationId)
      .toArray();
  }

  /**
   * Convert static methods to instance methods for easier component usage
   */
  async getAllLocations(workspaceId?: string): Promise<Location[]> {
    if (workspaceId) {
      return LocationService.getAllLocations(workspaceId);
    }
    // Get all locations across all workspaces
    return await db.locations
      .filter(loc => loc.is_active === true)
      .toArray();
  }

  async getLocationById(locationId: string): Promise<Location | undefined> {
    return LocationService.getLocationById(locationId);
  }

  async createLocation(location: Omit<Location, 'id' | 'created_at'>): Promise<string> {
    return LocationService.createLocation(location);
  }

  async updateLocation(locationId: string, updates: Partial<Location>): Promise<void> {
    return LocationService.updateLocation(locationId, updates);
  }

  async deactivateLocation(locationId: string): Promise<void> {
    return LocationService.deactivateLocation(locationId);
  }

  async getLocationSales(locationId: string, period: 'today' | 'week' | 'month'): Promise<any[]> {
    return LocationService.getLocationSales(locationId, period);
  }

  async getLocationSalesInRange(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return LocationService.getLocationSalesInRange(locationId, startDate, endDate);
  }

  async getLocationInventory(locationId: string): Promise<any[]> {
    return LocationService.getLocationInventory(locationId);
  }
}
