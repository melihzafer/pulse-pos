import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Star, LayoutGrid, Tag } from 'lucide-react';
import Fuse from 'fuse.js';
import { Product, MarketService, Promotion } from '@pulse/core-logic';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const marketService = new MarketService();

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fuse.js configuration for fuzzy search
  const fuse = useMemo(() => new Fuse(products, {
    keys: ['name', 'barcode', 'sku'],
    threshold: 0.3,
    includeScore: true,
  }), [products]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      if (activeTab === 'favorites') {
        setFilteredProducts(products.filter(p => p.is_quick_key));
      } else {
        setFilteredProducts(products);
      }
    } else {
      const results = fuse.search(searchQuery);
      setFilteredProducts(results.map(result => result.item));
    }
  }, [searchQuery, products, activeTab, fuse]);

  // Fetch active promotions
  useEffect(() => {
    const loadPromos = async () => {
      const promos = await marketService.getActivePromotions();
      setActivePromotions(promos);
    };
    loadPromos();
    
    // Reload promotions every 5 seconds to catch new ones
    const interval = setInterval(loadPromos, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 for Search
      if (e.key === 'F1') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      onProductClick(filteredProducts[0]);
      setSearchQuery('');
      // Optional: Keep focus or close search?
      // setShowSearch(false); 
    }
  };

  const getStockColor = (quantity: number, minLevel: number) => {
    if (quantity === 0) return 'text-red-500';
    if (quantity <= minLevel) return 'text-orange-500';
    return 'text-green-500';
  };

  const getProductPromo = (productId: string) => {
    return activePromotions.find(p => {
      const rules = p.rules as { product_id?: string };
      return rules && rules.product_id === productId;
    });
  };

  const getPromoLabel = (promo: Promotion) => {
    const rules = promo.rules as { 
      buy_qty?: number; 
      get_qty?: number; 
      discount_percent?: number; 
      fixed_amount?: number 
    };
    
    if (promo.type === 'bogo') {
      if (rules.discount_percent === 100) {
        return `${rules.buy_qty}+${rules.get_qty} FREE`;
      }
      return `${rules.discount_percent}% OFF`;
    } else if (promo.type === 'discount_percent' || promo.type === 'happy_hour') {
      return `${rules.discount_percent}% OFF`;
    } else if (promo.type === 'fixed_amount') {
      return `${rules.fixed_amount} BGN OFF`;
    }
    
    return 'PROMO';
  };

  const getPromoBadgeColor = (promo: Promotion) => {
    // Check if expiring soon (within 3 days)
    if (promo.end_date) {
      const end = new Date(promo.end_date);
      const now = new Date();
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 3) {
        return 'bg-orange-500'; // Expiring soon
      }
    }
    
    // Check usage limits
    if (promo.max_uses && promo.times_used) {
      const usagePercent = (promo.times_used / promo.max_uses) * 100;
      if (usagePercent >= 80) {
        return 'bg-yellow-500'; // Almost at limit
      }
    }
    
    return 'bg-red-500'; // Default active promo
  };

  const getPromoTooltip = (promo: Promotion) => {
    const parts = [promo.name];
    
    if (promo.end_date) {
      const end = new Date(promo.end_date);
      const now = new Date();
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        parts.push(`Ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`);
      }
    }
    
    if (promo.max_uses && promo.times_used !== undefined) {
      parts.push(`${promo.max_uses - promo.times_used} uses left`);
    }
    
    return parts.join(' • ');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      {showSearch && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('pos.searchPlaceholder')}
            className="w-full pl-10 pr-10 py-3 bg-white/90 dark:bg-slate-800/50 border border-gray-300/80 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-400 focus:border-transparent shadow-sm focus:shadow-md transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      {!showSearch && (
        <div className="flex gap-2 mb-4">
           <button
            onClick={() => setShowSearch(true)}
            className="flex-1 py-3 bg-white/90 dark:bg-slate-800/50 border border-gray-300/80 dark:border-slate-700 rounded-xl text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/50 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <Search size={20} />
            <span>{t('pos.searchButton')}</span>
          </button>
        </div>
      )}
      
      {/* Tabs */}
      {!showSearch && !searchQuery && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              "flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium",
              activeTab === 'all' 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
            )}
          >
            <LayoutGrid size={18} />
            {t('pos.allProducts')}
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={clsx(
              "flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium",
              activeTab === 'favorites' 
                ? "bg-amber-500 text-white shadow-md" 
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
            )}
          >
            <Star size={18} />
            {t('pos.favorites')}
          </button>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductClick(product)}
            style={product.is_quick_key && product.quick_key_color ? { borderColor: product.quick_key_color, borderWidth: '2px' } : {}}
            className={clsx(
              "glass-panel p-4 rounded-xl transition-all duration-200 max-h-48 hover:scale-105  hover:shadow-2xl hover:border-blue-300/80 dark:hover:border-blue-500/50 dark:hover:shadow-blue-500/20 text-left group relative overflow-hidden",
              product.stock_quantity === 0 && "opacity-50 cursor-not-allowed"
            )}
            disabled={product.stock_quantity === 0}
          >
            {product.is_quick_key && (
               <div className="absolute top-0 right-0 p-1">
                 <Star size={12} className="text-amber-400 fill-amber-400" />
               </div>
            )}
            {getProductPromo(product.id) && (
              <div 
                className={`absolute top-0 left-0 ${getPromoBadgeColor(getProductPromo(product.id)!)} text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-20 flex items-center gap-1 shadow-sm`}
                title={getPromoTooltip(getProductPromo(product.id)!)}
              >
                <Tag size={10} />
                {getPromoLabel(getProductPromo(product.id)!)}
              </div>
            )}
            {product.is_quick_key && product.quick_key_color && (
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ backgroundColor: product.quick_key_color }} 
              />
            )}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors relative z-10">{product.name}</h3>
            <p className="text-blue-600 dark:text-blue-400 font-mono text-lg font-bold mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 relative z-10">
              {product.sale_price.toFixed(2)} BGN
            </p>
            <div className="flex items-center justify-between text-sm relative z-10">
              <span className="text-gray-500 dark:text-slate-400">{t('pos.stock')}:</span>
              <span className={clsx("font-semibold", getStockColor(product.stock_quantity, product.min_stock_level))}>
                {product.stock_quantity}
              </span>
            </div>
            {product.barcode && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 font-mono relative z-10">{product.barcode}</p>
            )}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 dark:text-slate-500 text-lg">{t('pos.noProducts')}</p>
        </div>
      )}
    </div>
  );
};
