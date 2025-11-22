import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, Sun, Moon, Tag } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, theme, onThemeToggle }) => {
  const { t } = useTranslation();

  const navItems = [
    { id: 'pos', icon: ShoppingCart, label: t('sidebar.pos') },
    { id: 'inventory', icon: Package, label: t('sidebar.inventory') },
    { id: 'promotions', icon: Tag, label: 'Promos' },
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { id: 'settings', icon: Settings, label: t('sidebar.settings') },
  ];

  return (
    <div className="h-screen w-20 flex flex-col items-center py-6 bg-white/95 backdrop-blur-sm border-r border-gray-200/80 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 rounded-xl shadow-lg" />
      </div>

      <nav className="flex-1 flex flex-col gap-3 w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              "p-3 rounded-xl flex flex-col items-center justify-center transition-all duration-200",
              activeTab === item.id
                ? "bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 shadow-md border border-blue-100 dark:from-blue-900/30 dark:to-cyan-900/30 dark:border-blue-800 dark:text-blue-400"
                : "text-gray-500 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700"
            )}
          >
            <item.icon size={22} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Theme Toggle Button */}
      <button 
        onClick={onThemeToggle}
        className="p-3 mb-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
        title={t('sidebar.toggleTheme')}
      >
        {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
      </button>

      <button 
        className="p-3 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
        title={t('sidebar.logout')}
      >
        <LogOut size={22} />
      </button>
    </div>
  );
};
