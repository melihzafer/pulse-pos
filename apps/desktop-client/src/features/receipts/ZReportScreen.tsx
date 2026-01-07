import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Gift,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Printer,
  CheckCircle2,
  User,
  MapPin,
  Hash,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { db, useAuthStore, formatMoney } from '@pulse/core-logic';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import type { ZReportData } from './types';

export const ZReportScreen: React.FC = () => {
  const { currentUser, currentCashier } = useAuthStore();
  const [reportData, setReportData] = useState<ZReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [actualCash, setActualCash] = useState<string>('');
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [shiftClosed, setShiftClosed] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const date = parseISO(selectedDate);
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      // Get all sales for the day
      const sales = await db.sales
        .where('created_at')
        .between(dayStart, dayEnd)
        .toArray();

      // Get all sale items
      const saleIds = sales.map(s => s.id);
      const saleItems = await db.sale_items
        .where('sale_id')
        .anyOf(saleIds)
        .toArray();

      // Calculate totals
      const completedSales = sales.filter(s => s.status === 'completed');
      const refunds = sales.filter(s => s.status === 'refunded');
      const voids = sales.filter(s => s.status === 'void');

      const totalSales = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
      const cashSales = completedSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
      const cardSales = completedSales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + s.total_amount, 0);
      const foodVoucherSales = completedSales.filter(s => s.payment_method === 'food_voucher').reduce((sum, s) => sum + s.total_amount, 0);
      const splitSales = completedSales.filter(s => s.payment_method === 'split').reduce((sum, s) => sum + s.total_amount, 0);
      
      const itemsSold = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate VAT (20%)
      const vatRate = 0.20;
      const taxableAmount = totalSales / (1 + vatRate);
      const vatAmount = totalSales - taxableAmount;

      // Get top products
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      for (const item of saleItems) {
        const product = await db.products.get(item.product_id);
        const productName = product?.name || 'Unknown Product';
        
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { name: productName, quantity: 0, revenue: 0 };
        }
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].revenue += item.quantity * item.price_snapshot;
      }

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Check localStorage for existing Z-report
      const savedReports = localStorage.getItem('pulse-z-reports');
      const existingReports = savedReports ? JSON.parse(savedReports) : {};
      const existingReport = existingReports[selectedDate];

      if (existingReport) {
        setShiftClosed(true);
        setActualCash(existingReport.actual_cash?.toString() || '');
      } else {
        setShiftClosed(false);
      }

      // Get opening cash from settings or default
      const settings = localStorage.getItem('pulse-settings');
      const openingCash = settings ? JSON.parse(settings).openingCash || 100 : 100;

      const report: ZReportData = {
        reportNumber: `Z-${format(date, 'yyyyMMdd')}-001`,
        date: format(date, 'yyyy-MM-dd'),
        shiftStart: '09:00',
        shiftEnd: format(new Date(), 'HH:mm'),
        cashier: currentUser?.full_name || currentCashier?.id || 'System',
        location: 'Main Store',
        
        totalSales,
        transactionCount: completedSales.length,
        itemsSold,
        averageTransaction: completedSales.length > 0 ? totalSales / completedSales.length : 0,
        
        cashSales,
        cardSales,
        giftCardSales: foodVoucherSales, // Map to food voucher for now
        storeCreditSales: splitSales, // Map to split payments for now
        
        refundsCount: refunds.length,
        refundsTotal: refunds.reduce((sum, s) => sum + s.total_amount, 0),
        voidsCount: voids.length,
        voidsTotal: voids.reduce((sum, s) => sum + s.total_amount, 0),
        
        openingCash,
        expectedCash: openingCash + cashSales - refunds.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + r.total_amount, 0),
        actualCash: parseFloat(actualCash) || 0,
        difference: 0,
        
        taxableAmount,
        vatAmount,
        vatRate: vatRate * 100,
        
        topProducts,
      };

      report.difference = report.actualCash - report.expectedCash;
      
      setReportData(report);
    } catch (error) {
      console.error('Failed to load Z-report:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, actualCash, currentUser, currentCashier]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleCloseShift = async () => {
    if (!reportData) return;
    
    if (!actualCash) {
      toast.error('Please enter actual cash count');
      return;
    }

    setIsClosingShift(true);
    try {
      // Store Z-report in database
      const zReport = {
        id: crypto.randomUUID(),
        workspace_id: 'default-workspace',
        report_number: reportData.reportNumber,
        date: reportData.date,
        cashier_id: currentUser?.id || currentCashier?.id || '',
        location_id: 'default',
        
        total_sales: reportData.totalSales,
        transaction_count: reportData.transactionCount,
        items_sold: reportData.itemsSold,
        
        cash_sales: reportData.cashSales,
        card_sales: reportData.cardSales,
        gift_card_sales: reportData.giftCardSales,
        store_credit_sales: reportData.storeCreditSales,
        
        refunds_count: reportData.refundsCount,
        refunds_total: reportData.refundsTotal,
        voids_count: reportData.voidsCount,
        voids_total: reportData.voidsTotal,
        
        opening_cash: reportData.openingCash,
        expected_cash: reportData.expectedCash,
        actual_cash: parseFloat(actualCash),
        cash_difference: parseFloat(actualCash) - reportData.expectedCash,
        
        vat_amount: reportData.vatAmount,
        vat_rate: reportData.vatRate,
        
        created_at: new Date().toISOString(),
        _synced: false,
        _dirty: true,
      };

      // Store Z-report in localStorage (no database table for now)
      const savedReports = localStorage.getItem('pulse-z-reports');
      const existingReports = savedReports ? JSON.parse(savedReports) : {};
      existingReports[reportData.date] = zReport;
      localStorage.setItem('pulse-z-reports', JSON.stringify(existingReports));

      setShiftClosed(true);
      toast.success('Shift closed successfully. Z-Report generated.');
      
      // Refresh report with actual cash
      loadReport();
    } catch (error) {
      console.error('Failed to close shift:', error);
      toast.error('Failed to close shift');
    } finally {
      setIsClosingShift(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    
    // Format report for printing
    if (window.electronAPI?.printReceipt) {
      // Create dummy items for the Z-Report summary
      const items = [
        { name: 'Cash Sales', quantity: 1, price: reportData.cashSales },
        { name: 'Card Sales', quantity: 1, price: reportData.cardSales },
        { name: 'Other Sales', quantity: 1, price: reportData.giftCardSales + reportData.storeCreditSales },
      ].filter(item => item.price > 0);
      
      window.electronAPI.printReceipt({
        items,
        total: reportData.totalSales,
        paymentMethod: 'Z-Report',
        timestamp: new Date().toISOString(),
      });
      toast.success('Printing Z-Report...');
    } else {
      // Fallback to browser print
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Z-Report / End of Day</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Daily sales summary and cash reconciliation
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
              />
            </div>
            
            <button
              onClick={loadReport}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            
            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {reportData && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Report Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-5 h-5 text-gray-400" />
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{reportData.reportNumber}</span>
                    {shiftClosed && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
                        CLOSED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {reportData.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {reportData.cashier}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {reportData.location}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatMoney(reportData.totalSales)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">Total Sales</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                icon={ShoppingCart}
                label="Transactions"
                value={reportData.transactionCount.toString()}
                color="blue"
              />
              <StatCard
                icon={Package}
                label="Items Sold"
                value={reportData.itemsSold.toString()}
                color="green"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg Transaction"
                value={formatMoney(reportData.averageTransaction)}
                color="purple"
              />
              <StatCard
                icon={DollarSign}
                label="VAT Collected"
                value={formatMoney(reportData.vatAmount)}
                color="amber"
              />
            </div>

            {/* Payment Breakdown & Cash Drawer */}
            <div className="grid grid-cols-2 gap-6">
              {/* Payment Breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Breakdown</h3>
                <div className="space-y-3">
                  <PaymentRow icon={Banknote} label="Cash" amount={reportData.cashSales} color="green" />
                  <PaymentRow icon={CreditCard} label="Card" amount={reportData.cardSales} color="blue" />
                  <PaymentRow icon={Gift} label="Gift Cards" amount={reportData.giftCardSales} color="purple" />
                  <PaymentRow icon={Wallet} label="Store Credit" amount={reportData.storeCreditSales} color="amber" />
                  <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">
                        {formatMoney(reportData.totalSales)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Drawer Reconciliation */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cash Drawer</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-slate-400">Opening Cash</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatMoney(reportData.openingCash)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-slate-400">+ Cash Sales</span>
                    <span className="font-medium text-green-600">{formatMoney(reportData.cashSales)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-slate-400">- Cash Refunds</span>
                    <span className="font-medium text-red-500">
                      -{formatMoney(reportData.refundsTotal * (reportData.cashSales / (reportData.totalSales || 1)))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-slate-700">
                    <span className="font-semibold text-gray-900 dark:text-white">Expected</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatMoney(reportData.expectedCash)}</span>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Actual Cash Count
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      disabled={shiftClosed}
                      placeholder="Enter cash count..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-lg font-medium disabled:opacity-60"
                    />
                    {actualCash && (
                      <div className={`flex items-center justify-between mt-3 p-3 rounded-lg ${
                        parseFloat(actualCash) - reportData.expectedCash === 0
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : parseFloat(actualCash) - reportData.expectedCash > 0
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        <span className="font-medium">Difference</span>
                        <span className={`font-bold ${
                          parseFloat(actualCash) - reportData.expectedCash === 0
                            ? 'text-green-600'
                            : parseFloat(actualCash) - reportData.expectedCash > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          {parseFloat(actualCash) - reportData.expectedCash >= 0 ? '+' : ''}
                          {formatMoney(parseFloat(actualCash) - reportData.expectedCash)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Refunds & Voids */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Refunds & Voids</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.refundsCount} ({formatMoney(reportData.refundsTotal)})
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">Refunds</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.voidsCount} ({formatMoney(reportData.voidsTotal)})
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">Voids</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
              <div className="space-y-3">
                {reportData.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-slate-700 rounded-full text-xs font-bold text-gray-600 dark:text-slate-400">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-500 dark:text-slate-400">{product.quantity} sold</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(product.revenue)}</span>
                    </div>
                  </div>
                ))}
                {reportData.topProducts.length === 0 && (
                  <p className="text-gray-400 dark:text-slate-500 text-center py-4">No products sold</p>
                )}
              </div>
            </div>

            {/* Close Shift Button */}
            {!shiftClosed && (
              <div className="flex justify-center">
                <button
                  onClick={handleCloseShift}
                  disabled={isClosingShift || !actualCash}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClosingShift ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Close Shift & Generate Z-Report
                </button>
              </div>
            )}

            {shiftClosed && (
              <div className="flex items-center justify-center gap-3 py-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">Shift Closed - Z-Report Generated</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-slate-400">{label}</div>
    </div>
  );
};

const PaymentRow: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  amount: number;
  color: 'green' | 'blue' | 'purple' | 'amber';
}> = ({ icon: Icon, label, amount, color }) => {
  const colors = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-gray-600 dark:text-slate-400">{label}</span>
      </div>
      <span className="font-medium text-gray-900 dark:text-white">{formatMoney(amount)}</span>
    </div>
  );
};

export default ZReportScreen;
