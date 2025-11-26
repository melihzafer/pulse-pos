import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, User } from 'lucide-react';
import { LayawayService } from '@pulse/core-logic';
import { db } from '@pulse/core-logic';
import type { Product, Customer } from '@pulse/core-logic';
import { toast } from 'sonner';
import clsx from 'clsx';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

interface LayawayItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CreateLayawayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateLayawayModal: React.FC<CreateLayawayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'customer' | 'products' | 'payment'>('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [layawayItems, setLayawayItems] = useState<LayawayItem[]>([]);
  
  const [depositPercentage, setDepositPercentage] = useState(20);
  const [depositAmount, setDepositAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    const subtotal = layawayItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.2;
    const total = subtotal + tax;
    const minDeposit = total * (depositPercentage / 100);
    setDepositAmount(minDeposit);
  }, [layawayItems, depositPercentage]);

  const loadCustomers = async () => {
    try {
      const allCustomers = await db.customers.where('workspace_id').equals(WORKSPACE_ID).toArray();
      setCustomers(allCustomers.filter((c) => !c._deleted));
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await db.products.where('workspace_id').equals(WORKSPACE_ID).toArray();
      const activeProducts = allProducts.filter((p) => !p._deleted && p.is_active && (p.quantity_on_hand || 0) > 0);
      console.log('📦 Loaded products for layaway:', activeProducts.length);
      setProducts(activeProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const calculateSubtotal = () => {
    return layawayItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.2; // 20% VAT
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (customer.phone && customer.phone.includes(customerSearch))
  );

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (product.barcode && product.barcode.includes(productSearch))
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep('products');
  };

  const handleAddProduct = (product: Product) => {
    const existing = layawayItems.find((item) => item.product.id === product.id);
    if (existing) {
      handleUpdateQuantity(product.id, existing.quantity + 1);
    } else {
      const newItem: LayawayItem = {
        product,
        quantity: 1,
        unitPrice: product.sale_price,
        subtotal: product.sale_price,
      };
      setLayawayItems([...layawayItems, newItem]);
    }
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQuantity > (product.quantity_on_hand || 0)) {
      toast.error(`Only ${product.quantity_on_hand} units available`);
      return;
    }

    setLayawayItems(
      layawayItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setLayawayItems(layawayItems.filter((item) => item.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (layawayItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (depositAmount < calculateTotal() * 0.2) {
      toast.error('Deposit must be at least 20% of total');
      return;
    }

    setIsSubmitting(true);
    try {
      await LayawayService.createLayawayOrder(WORKSPACE_ID, {
        customerId: selectedCustomer.id,
        userId: '00000000-0000-0000-0000-000000000000', // TODO: Get from auth
        items: layawayItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        depositAmount,
        depositPercentage,
        notes,
      });

      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Failed to create layaway:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create layaway order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('customer');
    setSelectedCustomer(null);
    setLayawayItems([]);
    setCustomerSearch('');
    setProductSearch('');
    setDepositPercentage(20);
    setDepositAmount(0);
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Layaway Order</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Step {step === 'customer' ? '1' : step === 'products' ? '2' : '3'} of 3
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center px-6 py-3 bg-gray-50 dark:bg-slate-900/50">
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all',
            step === 'customer' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          )}>
            <User size={16} />
            Customer
          </div>
          <div className="flex-1 h-px bg-gray-300 dark:bg-slate-600 mx-2" />
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all',
            step === 'products' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          )}>
            Products
          </div>
          <div className="flex-1 h-px bg-gray-300 dark:bg-slate-600 mx-2" />
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all',
            step === 'payment' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          )}>
            Payment
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'customer' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Search Customer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name, email, or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {customer.email && <span>{customer.email}</span>}
                      {customer.email && customer.phone && <span className="mx-2">•</span>}
                      {customer.phone && <span>{customer.phone}</span>}
                    </div>
                    {customer.points > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {customer.points} points
                      </div>
                    )}
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                    No customers found
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'products' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Product Search */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Search Products
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full p-3 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                          <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                            Stock: {product.quantity_on_hand || 0} • {product.sale_price.toFixed(2)} BGN
                          </div>
                        </div>
                        <Plus size={18} className="text-blue-600" />
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                      No products found
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
                  Selected Items ({layawayItems.length})
                </h3>
                {layawayItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                    No items added yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layawayItems.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {item.product.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                              {item.unitPrice.toFixed(2)} BGN each
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            min="1"
                            max={item.product.quantity_on_hand || 0}
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            +
                          </button>
                          <div className="ml-auto text-sm font-medium text-gray-900 dark:text-white">
                            {item.subtotal.toFixed(2)} BGN
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="max-w-md mx-auto space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">{calculateSubtotal().toFixed(2)} BGN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Tax (20%)</span>
                    <span className="text-gray-900 dark:text-white">{calculateTax().toFixed(2)} BGN</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-700 font-medium">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">{calculateTotal().toFixed(2)} BGN</span>
                  </div>
                </div>
              </div>

              {/* Deposit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Deposit Percentage (min 20%)
                </label>
                <input
                  type="number"
                  value={depositPercentage}
                  onChange={(e) => setDepositPercentage(Math.max(20, parseInt(e.target.value) || 20))}
                  min="20"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                  Deposit Amount: <span className="font-medium">{depositAmount.toFixed(2)} BGN</span>
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Balance Due: <span className="font-medium">{(calculateTotal() - depositAmount).toFixed(2)} BGN</span>
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button
            onClick={() => {
              if (step === 'customer') {
                onClose();
              } else if (step === 'products') {
                setStep('customer');
              } else {
                setStep('products');
              }
            }}
            className="px-6 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {step === 'customer' ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (step === 'customer') {
                if (!selectedCustomer) {
                  toast.error('Please select a customer');
                  return;
                }
                setStep('products');
              } else if (step === 'products') {
                if (layawayItems.length === 0) {
                  toast.error('Please add at least one product');
                  return;
                }
                setStep('payment');
              } else {
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Creating...' : step === 'payment' ? 'Create Layaway' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
