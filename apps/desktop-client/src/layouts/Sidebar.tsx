import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, Sun, Moon, Tag, BarChart3, Truck, FileText, Clock, MapPin, ArrowLeftRight, Building2, TrendingUp, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, theme, onThemeToggle, onLogout }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'pos', icon: ShoppingCart, label: t('sidebar.pos') },
    { id: 'inventory', icon: Package, label: t('sidebar.inventory') },
    { id: 'suppliers', icon: Truck, label: t('sidebar.suppliers', 'Suppliers') },
    { id: 'purchase-orders', icon: FileText, label: t('sidebar.purchaseOrders', 'Purchase Orders') },
    { id: 'layaway', icon: Clock, label: t('sidebar.layaway', 'Layaway') },
    { id: 'promotions', icon: Tag, label: t('sidebar.promotions') },
    { id: 'analytics', icon: BarChart3, label: t('sidebar.analytics') },
    { id: 'locations', icon: MapPin, label: t('sidebar.locations', 'Locations') },
    { id: 'transfers', icon: ArrowLeftRight, label: t('sidebar.transfers', 'Transfers') },
    { id: 'multi-location-dashboard', icon: Building2, label: t('sidebar.multiLocationDashboard', 'Multi-Location') },
    { id: 'location-pl', icon: TrendingUp, label: t('sidebar.locationPL', 'P&L Report') },
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { id: 'settings', icon: Settings, label: t('sidebar.settings') },
  ];

  return (
    <div 
      className={clsx(
        "h-screen flex flex-col py-4 bg-white/95 backdrop-blur-sm border-r border-gray-200/80 dark:bg-slate-800 dark:border-slate-700 shadow-sm transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between px-4 mb-6">
        <div className={clsx("flex items-center gap-3 overflow-hidden transition-all duration-300", isExpanded ? "w-auto opacity-100" : "w-0 opacity-0")}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 rounded-lg shadow-lg flex-shrink-0" />
          <span className="font-bold text-xl text-gray-800 dark:text-white whitespace-nowrap">Pulse POS</span>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors",
            !isExpanded && "mx-auto"
          )}
        >
          {isExpanded ? <ChevronLeft size={20} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
        <nav className="flex flex-col gap-2 w-full">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "p-3 rounded-xl flex items-center transition-all duration-200 group relative",
                activeTab === item.id
                  ? "bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 shadow-md border border-blue-100 dark:from-blue-900/30 dark:to-cyan-900/30 dark:border-blue-800 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700",
                !isExpanded && "justify-center"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <item.icon size={22} className={clsx("flex-shrink-0", activeTab === item.id && "text-blue-600 dark:text-blue-400")} />
              <span 
                className={clsx(
                  "ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
              
              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-2">
        {/* Theme Toggle Button */}
        <button 
          onClick={onThemeToggle}
          className={clsx(
            "p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center",
            !isExpanded && "justify-center"
          )}
          title={!isExpanded ? t('sidebar.toggleTheme') : undefined}
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          <span 
            className={clsx(
              "ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 overflow-hidden",
              isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            )}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        <button 
          onClick={onLogout}
          className={clsx(
            "p-3 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 flex items-center",
            !isExpanded && "justify-center"
          )}
          title={!isExpanded ? t('sidebar.logout') : undefined}
        >
          <LogOut size={22} />
          <span 
            className={clsx(
              "ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 overflow-hidden",
              isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            )}
          >
            {t('sidebar.logout')}
          </span>
        </button>
      </div>
    </div>
  );
};
