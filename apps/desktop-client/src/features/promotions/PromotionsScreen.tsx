import React, { useEffect, useState } from 'react';
import { db, Promotion, Product } from '@pulse/core-logic';
import { Plus, Trash2, Tag, Edit2, X, Search, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@pulse/core-logic/src/utils';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/Alert';

export const PromotionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{ isOpen: boolean; promoId?: string; promoName?: string }>({ isOpen: false });
  
  // Product search states
  const [showBuyProductList, setShowBuyProductList] = useState(false);
  const [showGetProductList, setShowGetProductList] = useState(false);
  const [buyProductSearch, setBuyProductSearch] = useState('');
  const [getProductSearch, setGetProductSearch] = useState('');
  
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
      toast.error(t('promotions.messages.nameRequired'));
      return;
    }

    if (promoType === 'bogo' && !buySku) {
      toast.error(t('promotions.messages.productRequired'));
      return;
    }

    let rules: any = {};
    let targetProducts: string[] = [];

    // Build rules based on promotion type
    if (promoType === 'bogo') {
      const buyProduct = products.find(p => p.barcode === buySku || p.sku === buySku);
      if (!buyProduct) {
        toast.error(t('promotions.messages.productNotFound'));
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

    const promoData: Promotion = {
      id: editingPromo ? editingPromo.id : generateId(),
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
      times_used: editingPromo ? editingPromo.times_used : 0,
      min_purchase_amount: minPurchase,
      target_variants: targetProducts.length > 0 ? targetProducts : undefined,
      conditions: (selectedDays.length > 0 || timeStart || timeEnd) ? {
        days_of_week: selectedDays.length > 0 ? selectedDays : undefined,
        time_range: (timeStart || timeEnd) ? { start: timeStart, end: timeEnd } : undefined,
      } : undefined,
      created_at: editingPromo ? editingPromo.created_at : new Date().toISOString()
    };

    if (editingPromo) {
      await db.promotions.update(editingPromo.id, promoData);
      toast.success(t('promotions.messages.updated'));
      setEditingPromo(null);
    } else {
      await db.promotions.add(promoData);
      toast.success(t('promotions.messages.created'));
    }
    
    setIsCreating(false);
    loadData();
    resetForm();
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setIsCreating(true);
    setName(promo.name);
    setDescription(promo.description || '');
    setPromoType(promo.type);
    
    // Load rules based on type
    if (promo.type === 'bogo') {
      setBuyQty(promo.rules.buy_qty || 1);
      setGetQty(promo.rules.get_qty || 1);
      setDiscountPercent(promo.rules.discount_percent || 100);
      if (promo.rules.product_id) {
        const product = products.find(p => p.id === promo.rules.product_id);
        if (product) setBuySku(product.barcode || product.sku || '');
      }
    } else if (promo.type === 'discount_percent') {
      setDiscountPercent(promo.rules.discount_percent || 0);
    } else if (promo.type === 'fixed_amount') {
      setFixedAmount(promo.rules.fixed_amount || 0);
    } else if (promo.type === 'happy_hour') {
      setDiscountPercent(promo.rules.discount_percent || 0);
    }
    
    // Load conditions
    setStartDate(promo.start_date ? promo.start_date.split('T')[0] : '');
    setEndDate(promo.end_date ? promo.end_date.split('T')[0] : '');
    setMaxUses(promo.max_uses);
    setMinPurchase(promo.min_purchase_amount);
    setSelectedDays(promo.conditions?.days_of_week || []);
    setTimeStart(promo.conditions?.time_range?.start || '');
    setTimeEnd(promo.conditions?.time_range?.end || '');
  };

  const handleDeleteConfirm = (promoId: string, promoName: string) => {
    setDeleteAlert({ isOpen: true, promoId, promoName });
  };

  const handleDelete = async () => {
    if (deleteAlert.promoId) {
      await db.promotions.delete(deleteAlert.promoId);
      toast.success(t('promotions.messages.deleted'));
      loadData();
    }
    setDeleteAlert({ isOpen: false });
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
    setEditingPromo(null);
    setBuyProductSearch('');
    setGetProductSearch('');
    setShowBuyProductList(false);
    setShowGetProductList(false);
  };

  const getPromoStatusBadge = (promo: Promotion) => {
    const now = new Date();
    const start = promo.start_date ? new Date(promo.start_date) : null;
    const end = promo.end_date ? new Date(promo.end_date) : null;

    if (end && end < now) {
      return <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">{t('promotions.status.expired')}</span>;
    }
    if (start && start > now) {
      return <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{t('promotions.status.scheduled')}</span>;
    }
    if (promo.max_uses && promo.times_used >= promo.max_uses) {
      return <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{t('promotions.status.limitReached')}</span>;
    }
    return <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{t('promotions.status.active')}</span>;
  };

  const getDayName = (day: number) => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t(`promotions.days.${days[day]}`);
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
          {t('promotions.title')}
        </h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          {t('promotions.new')}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm mb-6 border border-gray-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white">
              {editingPromo ? t('promotions.edit') : t('promotions.create')}
            </h2>
            <button
              onClick={() => { setIsCreating(false); resetForm(); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.name')} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="e.g. Buy 2 Get 1 Free"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.type')}</label>
                <select
                  value={promoType}
                  onChange={e => setPromoType(e.target.value as any)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  <option value="bogo">{t('promotions.types.bogo')}</option>
                  <option value="discount_percent">{t('promotions.types.discount_percent')}</option>
                  <option value="fixed_amount">{t('promotions.types.fixed_amount')}</option>
                  <option value="happy_hour">{t('promotions.types.happy_hour')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.description')}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder={t('promotions.descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('promotions.product')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {promoType === 'bogo' ? t('promotions.productBarcodeRequired') : t('promotions.productBarcodeOptional')}
                </label>
                
                {/* Barcode Input with Search Toggle */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={buySku}
                      onChange={e => {
                        setBuySku(e.target.value);
                        setBuyProductSearch(e.target.value);
                      }}
                      onFocus={() => setShowBuyProductList(true)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder={promoType === 'bogo' ? t('promotions.scanOrType') : t('promotions.allProducts')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBuyProductList(!showBuyProductList)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title={t('promotions.searchInStock')}
                  >
                    <Search size={18} />
                  </button>
                </div>

                {/* Product Search Dropdown */}
                {showBuyProductList && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {products
                      .filter(p => 
                        !buyProductSearch || 
                        p.name.toLowerCase().includes(buyProductSearch.toLowerCase()) ||
                        p.barcode?.toLowerCase().includes(buyProductSearch.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(buyProductSearch.toLowerCase())
                      )
                      .slice(0, 10)
                      .map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setBuySku(product.barcode || product.sku || '');
                            setBuyProductSearch(product.name);
                            setShowBuyProductList(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-600 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {product.barcode || product.sku} • {product.sale_price.toFixed(2)} BGN
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Stok: {product.stock_quantity}
                          </div>
                        </button>
                      ))}
                    {products.filter(p => 
                      !buyProductSearch || 
                      p.name.toLowerCase().includes(buyProductSearch.toLowerCase()) ||
                      p.barcode?.toLowerCase().includes(buyProductSearch.toLowerCase()) ||
                      p.sku?.toLowerCase().includes(buyProductSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {t('promotions.noProductsFound')}
                        <div className="mt-2 text-xs">
                          {t('promotions.typeManually')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {promoType === 'bogo' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.rewardProduct')}</label>
                  
                  {/* Get Product Input with Search */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={getSku}
                        onChange={e => {
                          setGetSku(e.target.value);
                          setGetProductSearch(e.target.value);
                        }}
                        onFocus={() => setShowGetProductList(true)}
                        className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        placeholder={t('promotions.sameAsAbove')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGetProductList(!showGetProductList)}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      title={t('promotions.searchInStock')}
                    >
                      <Search size={18} />
                    </button>
                  </div>

                  {/* Get Product Search Dropdown */}
                  {showGetProductList && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-auto">
                      {products
                        .filter(p => 
                          !getProductSearch || 
                          p.name.toLowerCase().includes(getProductSearch.toLowerCase()) ||
                          p.barcode?.toLowerCase().includes(getProductSearch.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(getProductSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setGetSku(product.barcode || product.sku || '');
                              setGetProductSearch(product.name);
                              setShowGetProductList(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-600 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {product.barcode || product.sku} • {product.sale_price.toFixed(2)} BGN
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Stok: {product.stock_quantity}
                            </div>
                          </button>
                        ))}
                      {products.filter(p => 
                        !getProductSearch || 
                        p.name.toLowerCase().includes(getProductSearch.toLowerCase()) ||
                        p.barcode?.toLowerCase().includes(getProductSearch.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(getProductSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          {t('promotions.noProductsFound')}
                          <div className="mt-2 text-xs">
                            {t('promotions.typeManually')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('promotions.discountDetails')}</h3>
            
            {promoType === 'bogo' && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.buyQty')}</label>
                  <input
                    type="number"
                    value={buyQty}
                    onChange={e => setBuyQty(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.getQty')}</label>
                  <input
                    type="number"
                    value={getQty}
                    onChange={e => setGetQty(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.discountPercent')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.discountPercent')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.fixedAmount')}</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('promotions.quickPresets')}</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setDiscountPercent(100)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 100 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  {t('promotions.free')}
                </button>
                <button type="button" onClick={() => setDiscountPercent(75)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 75 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  {t('promotions.off75')}
                </button>
                <button type="button" onClick={() => setDiscountPercent(50)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 50 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  {t('promotions.off50')}
                </button>
                <button type="button" onClick={() => setDiscountPercent(25)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 25 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  {t('promotions.off25')}
                </button>
                <button type="button" onClick={() => setDiscountPercent(10)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${discountPercent === 10 ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}>
                  {t('promotions.off10')}
                </button>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('promotions.dateRange')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.startDate')}</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.endDate')}</label>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('promotions.conditions')}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('promotions.daysOfWeek')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.startTime')}</label>
                <input
                  type="time"
                  value={timeStart}
                  onChange={e => setTimeStart(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.endTime')}</label>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('promotions.conditions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.minPurchase')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.maxUses')}</label>
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
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
            >
              {t('promotions.cancel')}
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingPromo ? t('common.save') : t('promotions.createButton')}
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
            <div key={promo.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg dark:text-white flex-1">{promo.name}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(promo.id, promo.name)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
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

      <Alert
        isOpen={deleteAlert.isOpen}
        onClose={() => setDeleteAlert({ isOpen: false })}
        onConfirm={handleDelete}
        title={t('common.delete')}
        message={t('promotions.messages.deleteConfirm') + (deleteAlert.promoName ? ` "${deleteAlert.promoName}"?` : '')}
        type="confirm"
        confirmText={t('common.yes')}
        cancelText={t('common.no')}
      />
    </div>
  );
};
