import { db } from '../database';
import type { Supplier, ProductSupplier } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SupplierService {
  /**
   * Create a new supplier
   */
  static async createSupplier(
    workspaceId: string,
    data: Omit<Supplier, 'id' | 'workspace_id' | 'created_at'>
  ): Promise<Supplier> {
    const supplier: Supplier = {
      id: uuidv4(),
      workspace_id: workspaceId,
      name: data.name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone,
      address: data.address,
      payment_terms: data.payment_terms,
      lead_time_days: data.lead_time_days,
      is_active: data.is_active ?? true,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    await db.suppliers.add({
      ...supplier,
      _synced: false,
      _dirty: true,
    });

    return supplier;
  }

  /**
   * Update an existing supplier
   */
  static async updateSupplier(
    supplierId: string,
    updates: Partial<Omit<Supplier, 'id' | 'workspace_id' | 'created_at'>>
  ): Promise<void> {
    await db.suppliers.update(supplierId, {
      ...updates,
      _dirty: true,
      _synced: false,
    });
  }

  /**
   * Deactivate a supplier (soft delete)
   */
  static async deactivateSupplier(supplierId: string): Promise<void> {
    await db.suppliers.update(supplierId, {
      is_active: false,
      _dirty: true,
      _synced: false,
      _deleted: true,
    });
  }

  /**
   * Get all suppliers for a workspace
   */
  static async getSuppliers(
    workspaceId: string,
    options?: { activeOnly?: boolean }
  ): Promise<Supplier[]> {
    let query = db.suppliers.where('workspace_id').equals(workspaceId);

    if (options?.activeOnly) {
      const all = await query.toArray();
      return all.filter((s) => s.is_active && !s._deleted);
    }

    const suppliers = await query.toArray();
    return suppliers.filter((s) => !s._deleted);
  }

  /**
   * Get a single supplier by ID
   */
  static async getSupplierById(supplierId: string): Promise<Supplier | undefined> {
    const supplier = await db.suppliers.get(supplierId);
    if (supplier && !supplier._deleted) {
      return supplier;
    }
    return undefined;
  }

  /**
   * Search suppliers by name
   */
  static async searchSuppliers(
    workspaceId: string,
    searchTerm: string
  ): Promise<Supplier[]> {
    const suppliers = await this.getSuppliers(workspaceId, { activeOnly: true });
    const term = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.contact_person?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term)
    );
  }

  /**
   * Link a product to a supplier
   */
  static async linkProductToSupplier(
    productId: string,
    supplierId: string,
    data: Omit<ProductSupplier, 'id' | 'product_id' | 'supplier_id'>
  ): Promise<ProductSupplier> {
    const productSupplier: ProductSupplier = {
      id: uuidv4(),
      product_id: productId,
      supplier_id: supplierId,
      supplier_sku: data.supplier_sku,
      cost_price: data.cost_price,
      is_preferred: data.is_preferred ?? false,
      min_order_quantity: data.min_order_quantity ?? 1,
    };

    await db.product_suppliers.add({
      ...productSupplier,
      _synced: false,
      _dirty: true,
    });

    return productSupplier;
  }

  /**
   * Update product-supplier relationship
   */
  static async updateProductSupplier(
    productSupplierId: string,
    updates: Partial<Omit<ProductSupplier, 'id' | 'product_id' | 'supplier_id'>>
  ): Promise<void> {
    await db.product_suppliers.update(productSupplierId, {
      ...updates,
      _dirty: true,
      _synced: false,
    });
  }

  /**
   * Unlink a product from a supplier
   */
  static async unlinkProductFromSupplier(productSupplierId: string): Promise<void> {
    await db.product_suppliers.update(productSupplierId, {
      _dirty: true,
      _synced: false,
      _deleted: true,
    });
  }

  /**
   * Get all suppliers for a product
   */
  static async getSuppliersForProduct(productId: string): Promise<
    Array<{
      supplier: Supplier;
      supplierProduct: ProductSupplier;
    }>
  > {
    const productSuppliers = await db.product_suppliers
      .where('product_id')
      .equals(productId)
      .toArray();

    const activeSuppliersData = productSuppliers.filter((ps) => !ps._deleted);

    const results = await Promise.all(
      activeSuppliersData.map(async (ps) => {
        const supplier = await db.suppliers.get(ps.supplier_id);
        return {
          supplier: supplier!,
          supplierProduct: ps,
        };
      })
    );

    return results.filter((r) => r.supplier && !r.supplier._deleted);
  }

  /**
   * Get the preferred supplier for a product
   */
  static async getPreferredSupplier(productId: string): Promise<{
    supplier: Supplier;
    supplierProduct: ProductSupplier;
  } | null> {
    const suppliers = await this.getSuppliersForProduct(productId);
    const preferred = suppliers.find((s) => s.supplierProduct.is_preferred);
    return preferred || (suppliers.length > 0 ? suppliers[0] : null);
  }

  /**
   * Get all products for a supplier
   */
  static async getProductsForSupplier(supplierId: string): Promise<
    Array<{
      product: any; // Product type
      supplierProduct: ProductSupplier;
    }>
  > {
    const productSuppliers = await db.product_suppliers
      .where('supplier_id')
      .equals(supplierId)
      .toArray();

    const activeProducts = productSuppliers.filter((ps) => !ps._deleted);

    const results = await Promise.all(
      activeProducts.map(async (ps) => {
        const product = await db.products.get(ps.product_id);
        return {
          product: product!,
          supplierProduct: ps,
        };
      })
    );

    return results.filter((r) => r.product && !r.product._deleted);
  }

  /**
   * Get supplier statistics
   */
  static async getSupplierStats(supplierId: string): Promise<{
    totalProducts: number;
    totalPurchaseOrders: number;
    totalSpend: number;
  }> {
    const products = await this.getProductsForSupplier(supplierId);
    
    // Get purchase orders for this supplier
    const purchaseOrders = await db.purchase_orders
      .where('supplier_id')
      .equals(supplierId)
      .toArray();
    
    const activePOs = purchaseOrders.filter((po) => !po._deleted);
    
    const totalSpend = activePOs.reduce((sum, po) => sum + (po.total || 0), 0);

    return {
      totalProducts: products.length,
      totalPurchaseOrders: activePOs.length,
      totalSpend,
    };
  }
}
