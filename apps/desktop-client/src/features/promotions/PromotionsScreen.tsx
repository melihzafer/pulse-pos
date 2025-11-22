import React, { useEffect, useState } from 'react';
import { db, Promotion, Product } from '@pulse/core-logic';
import { Plus, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@pulse/core-logic/src/utils';

export const PromotionsScreen: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [promoType, setPromoType] = useState<'bogo' | 'discount_percent' | 'fixed_amount' | 'happy_hour'>('bogo');
  const [buySku, setBuySku] = useState('');
  const [getSku, setGetSku] = useState('');
  const [buyQty, setBuyQty] = useState(1);
  const [getQty, setGetQty] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(100);
  const [fixedAmount, setFixedAmount] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [minPurchase, setMinPurchase] = useState<number | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const promos = await db.promotions.toArray();
    const prods = await db.products.toArray();
    setPromotions(promos);
    setProducts(prods);
  };

  const handleCreate = async () => {
    if (!name) {
      toast.error('Promotion name is required');
      return;
    }

    if (promoType === 'bogo' && !buySku) {
      toast.error('Product is required for BOGO promotion');
      return;
    }

    let rules: any = {};
    let targetProducts: string[] = [];

    // Build rules based on promotion type
    if (promoType === 'bogo') {
      const buyProduct = products.find(p => p.barcode === buySku || p.sku === buySku);
      if (!buyProduct) {
        toast.error('Product not found');
        return;
      }
      
      let targetProductId = buyProduct.id;
      if (getSku) {
        const getProduct = products.find(p => p.barcode === getSku || p.sku === getSku);
        if (getProduct) targetProductId = getProduct.id;
      }
      
      rules = {
        product_id: targetProductId,
        buy_qty: Number(buyQty),
        get_qty: Number(getQty),
        discount_percent: Number(discountPercent)
      };
      targetProducts = [buyProduct.id];
    } else if (promoType === 'discount_percent') {
      rules = { discount_percent: Number(discountPercent) };
      if (buySku) {
        const product = products.find(p => p.barcode === buySku || p.sku === buySku);
        if (product) targetProducts = [product.id];
      }
    } else if (promoType === 'fixed_amount') {
      rules = { fixed_amount: Number(fixedAmount) };
      if (buySku) {
        const product = products.find(p => p.barcode === buySku || p.sku === buySku);
        if (product) targetProducts = [product.id];
      }
    } else if (promoType === 'happy_hour') {
      rules = { discount_percent: Number(discountPercent) };
      if (buySku) {
        const product = products.find(p => p.barcode === buySku || p.sku === buySku);
        if (product) targetProducts = [product.id];
      }
    }

    const newPromo: Promotion = {
      id: generateId(),
      workspace_id: 'default',
      name,
      description,
      type: promoType,
      is_active: true,
      priority: 1,
      rules,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      max_uses: maxUses,
      times_used: 0,
      min_purchase_amount: minPurchase,
      target_variants: targetProducts.length > 0 ? targetProducts : undefined,
      conditions: (selectedDays.length > 0 || timeStart || timeEnd) ? {
        days_of_week: selectedDays.length > 0 ? selectedDays : undefined,
        time_range: (timeStart || timeEnd) ? { start: timeStart, end: timeEnd } : undefined,
      } : undefined,
      created_at: new Date().toISOString()
    };

    await db.promotions.add(newPromo);
    toast.success('Promotion created successfully!');
    setIsCreating(false);
    loadData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      await db.promotions.delete(id);
      toast.success('Promotion deleted');
      loadData();
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPromoType('bogo');
    setBuySku('');
    setGetSku('');
    setBuyQty(1);
    setGetQty(1);
    setDiscountPercent(100);
    setFixedAmount(0);
    setStartDate('');
    setEndDate('');
    setMaxUses(undefined);
    setMinPurchase(undefined);
    setSelectedDays([]);
    setTimeStart('');
    setTimeEnd('');
  };

  const getPromoStatusBadge = (promo: Promotion) => {
    const now = new Date();
    const start = promo.start_date ? new Date(promo.start_date) : null;
    const end = promo.end_date ? new Date(promo.end_date) : null;

    if (end && end < now) {
      return <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">EXPIRED</span>;
    }
    if (start && start > now) {
      return <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">SCHEDULED</span>;
    }
    if (promo.max_uses && promo.times_used >= promo.max_uses) {
      return <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">LIMIT REACHED</span>;
    }
    return <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">ACTIVE</span>;
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Tag className="text-blue-500" />
          Promotions
        </h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Promotion
        </button>
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm mb-6 border border-gray-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Create Promotion</h2>
          
          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="e.g. Buy 2 Get 1 Free"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={promoType}
                  onChange={e => setPromoType(e.target.value as any)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  <option value="bogo">Buy X Get Y (BOGO)</option>
                  <option value="discount_percent">Percentage Discount</option>
                  <option value="fixed_amount">Fixed Amount Off</option>
                  <option value="happy_hour">Happy Hour</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Optional details about this promotion"
                rows={2}
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {promoType === 'bogo' ? 'Product Barcode/SKU *' : 'Product Barcode/SKU (optional)'}
                </label>
                <input
                  type="text"
                  value={buySku}
                  onChange={e => setBuySku(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder={promoType === 'bogo' ? 'Scan or type barcode' : 'Leave empty for all products'}
                />
              </div>
              {promoType === 'bogo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reward Product (optional)</label>
                  <input
                    type="text"
                    value={getSku}
                    onChange={e => setGetSku(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="Same as above if empty"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Discount Details</h3>
            
            {promoType === 'bogo' && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buy Qty</label>
                  <input
                    type="number"
                    value={buyQty}
                    onChange={e => setBuyQty(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Get Qty</label>
                  <input
                    type="number"
                    value={getQty}
                    onChange={e => setGetQty(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}

            {(promoType === 'discount_percent' || promoType === 'happy_hour') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>
            )}

            {promoType === 'fixed_amount' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fixed Amount Off (BGN)</label>
                <input
                  type="number"
                  value={fixedAmount}
                  onChange={e => setFixedAmount(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Discount Presets</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setDiscountPercent(100)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 100 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  100% OFF (FREE)
                </button>
                <button type="button" onClick={() => setDiscountPercent(75)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 75 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  75% OFF
                </button>
                <button type="button" onClick={() => setDiscountPercent(50)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 50 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  50% OFF
                </button>
                <button type="button" onClick={() => setDiscountPercent(25)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 25 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  25% OFF
                </button>
                <button type="button" onClick={() => setDiscountPercent(10)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 10 ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  10% OFF
                </button>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Validity Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Conditions (Optional)</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active Days</label>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {getDayName(day)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty for all days</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Start (HH:MM)</label>
                <input
                  type="time"
                  value={timeStart}
                  onChange={e => setTimeStart(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time End (HH:MM)</label>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={e => setTimeEnd(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Limits (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Purchase Amount (BGN)</label>
                <input
                  type="number"
                  value={minPurchase || ''}
                  onChange={e => setMinPurchase(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  min="0"
                  step="0.01"
                  placeholder="No minimum"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Uses</label>
                <input
                  type="number"
                  value={maxUses || ''}
                  onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
            <button
              onClick={() => { setIsCreating(false); resetForm(); }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Promotion
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map(promo => {
          const now = new Date();
          const hasExpiry = promo.end_date && new Date(promo.end_date) > now;
          const daysLeft = hasExpiry ? Math.ceil((new Date(promo.end_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
          
          return (
            <div key={promo.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg dark:text-white flex-1">{promo.name}</h3>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg dark:hover:bg-red-900/20 flex-shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              {promo.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{promo.description}</p>
              )}

              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">
                  {promo.type.toUpperCase().replace('_', ' ')}
                </span>
                {getPromoStatusBadge(promo)}
              </div>

              {promo.type === 'bogo' && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Buy {promo.rules.buy_qty}, Get {promo.rules.get_qty} at {promo.rules.discount_percent}% off
                </div>
              )}
              {promo.type === 'discount_percent' && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {promo.rules.discount_percent}% discount
                </div>
              )}
              {promo.type === 'fixed_amount' && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {promo.rules.fixed_amount} BGN off
                </div>
              )}

              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t dark:border-slate-700">
                {promo.start_date && (
                  <div>📅 Starts: {new Date(promo.start_date).toLocaleString()}</div>
                )}
                {promo.end_date && (
                  <div className={daysLeft && daysLeft <= 3 ? 'text-red-500 font-semibold' : ''}>
                    ⏰ Ends: {new Date(promo.end_date).toLocaleString()}
                    {daysLeft && daysLeft > 0 && ` (${daysLeft} days left)`}
                  </div>
                )}
                {promo.min_purchase_amount && (
                  <div>💰 Min purchase: {promo.min_purchase_amount} BGN</div>
                )}
                {promo.max_uses && (
                  <div>
                    🎟️ Uses: {promo.times_used || 0} / {promo.max_uses}
                  </div>
                )}
                {promo.conditions?.days_of_week && promo.conditions.days_of_week.length > 0 && (
                  <div>📆 Days: {promo.conditions.days_of_week.map(d => getDayName(d)).join(', ')}</div>
                )}
                {promo.conditions?.time_range && (promo.conditions.time_range.start || promo.conditions.time_range.end) && (
                  <div>
                    ⏱️ Time: {promo.conditions.time_range.start || '00:00'} - {promo.conditions.time_range.end || '23:59'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {promotions.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            No promotions found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
};
