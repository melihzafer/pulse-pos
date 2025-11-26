import React, { useState } from 'react';
import { Check, Printer, Mail, QrCode, ArrowRight, FileText, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, CartItem, db, PaymentMethod, Product } from '@pulse/core-logic';
import clsx from 'clsx';
import { toast } from 'sonner';
import { downloadReceiptPDF } from '../../utils/pdfGenerator';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  change: number;
  total: number;
  items?: CartItem[];
  onPrint: () => void;
  onEmail: (email: string) => void;
  onInstall?: () => void;
  saleId?: string;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, change, total, items, onPrint, onEmail, onInstall, saleId, paymentMethod = 'cash', cashierName }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [fiscalReceiptNumber, setFiscalReceiptNumber] = useState<string | null>(null);
  const [dbItems, setDbItems] = useState<CartItem[]>([]);

  // Check if fiscal receipt already exists and load items from DB
  React.useEffect(() => {
    const loadSaleData = async () => {
      if (isOpen && saleId) {
        try {
          const sale = await db.sales.get(saleId);
          if (sale) {
            if (sale.fiscal_receipt_number) {
              setFiscalReceiptNumber(sale.fiscal_receipt_number);
            }

            // Map DB items to CartItem structure for PDF generation
            // This ensures we have the exact items from the saved sale
            if (sale.items && sale.items.length > 0) {
              const mappedItems: CartItem[] = sale.items.map(dbItem => ({
                id: dbItem.id || crypto.randomUUID(),
                product: {
                  id: dbItem.product_id,
                  workspace_id: sale.workspace_id,
                  name: dbItem.product_name_snapshot,
                  sale_price: dbItem.price_snapshot,
                  cost_price: dbItem.cost_snapshot,
                  stock_quantity: 0, // Not needed for receipt
                  min_stock_level: 0,
                  is_quick_key: false,
                  age_restricted: false
                } as Product,
                quantity: dbItem.quantity,
                subtotal: (dbItem.price_snapshot * dbItem.quantity) - (dbItem.discount || 0),
                discount: dbItem.discount
              }));
              setDbItems(mappedItems);
            }
          }
        } catch (error) {
          console.error('Error loading sale data:', error);
        }
      }
    };
    loadSaleData();
  }, [isOpen, saleId]);

  const handleInstallReceipt = async () => {
    if (onInstall) {
      onInstall();
      return;
    }

    if (!saleId) {
      toast.error(t('receipt.installError') || 'Cannot install receipt: Sale ID missing');
      return;
    }

    setIsInstalling(true);
    
    try {
      // Generate fiscal receipt with invoice number and tax breakdown
      const invoiceNumber = `INV-${Date.now()}`;
      const taxRate = 0.20; // 20% VAT
      const subtotalAmount = total / (1 + taxRate);
      const taxAmount = total - subtotalAmount;
      
      // Save fiscal receipt information to database
      const sale = await db.sales.get(saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }

      // Update sale with fiscal receipt number
      await db.sales.update(saleId, {
        fiscal_receipt_number: invoiceNumber,
        fiscal_receipt_generated_at: new Date().toISOString(),
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        subtotal_before_tax: parseFloat(subtotalAmount.toFixed(2)),
      });

      setFiscalReceiptNumber(invoiceNumber);
      toast.success(t('receipt.fiscalGenerated', { number: invoiceNumber }));
      
      // Log fiscal receipt generation for audit trail
      console.log('Fiscal Receipt Installed:', {
        saleId,
        invoiceNumber,
        subtotal: subtotalAmount.toFixed(2),
        tax: taxAmount.toFixed(2),
        total: total.toFixed(2),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error installing fiscal receipt:', error);
      toast.error(t('receipt.installError') || 'Failed to install fiscal receipt');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const taxRate = 0.20;
      const subtotalAmount = total / (1 + taxRate);
      const taxAmount = total - subtotalAmount;

      // Convert payment method to readable label
      const paymentMethodLabel = paymentMethod === 'cash' 
        ? t('payment.cash') 
        : paymentMethod === 'card' 
        ? t('payment.card') 
        : paymentMethod;

      // Use items from DB if available (more reliable), otherwise fall back to props
      const itemsToUse = dbItems.length > 0 ? dbItems : (items || []);

      downloadReceiptPDF({
        receiptNumber: saleId,
        fiscalReceiptNumber: fiscalReceiptNumber || undefined,
        date: new Date().toLocaleString(),
        items: itemsToUse,
        subtotal: subtotalAmount,
        tax: taxAmount,
        total: total,
        paymentMethod: paymentMethodLabel,
        change: change,
        cashierName: cashierName,
      });

      toast.success(t('receipt.downloaded') || 'Receipt PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('receipt.downloadError') || 'Failed to download receipt');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
            <Check size={48} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('receipt.paymentSuccessful')}</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">{t('receipt.thankYou')}</p>

          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 w-full mb-6">
            {items && items.length > 0 && (
              <div className="mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-slate-400">
                      {item.quantity}x {item.product.name}
                    </span>
                    <div className="text-right">
                      <span className="text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</span>
                      {item.discount && item.discount > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Promo: -{formatCurrency(item.discount)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 dark:text-slate-400">{t('payment.totalAmount')}</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600 dark:text-slate-400">{t('payment.change')}</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-3">
            <button 
              onClick={onPrint}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Printer size={24} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium">{t('receipt.print')}</span>
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download size={24} className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium">{t('receipt.download')}</span>
            </button>
            <button 
              onClick={() => setShowEmailInput(!showEmailInput)}
              className={clsx(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors",
                showEmailInput 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              <Mail size={24} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium">{t('receipt.email')}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <button 
              onClick={handleInstallReceipt}
              disabled={isInstalling || !!fiscalReceiptNumber}
              className={clsx(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors",
                fiscalReceiptNumber
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 cursor-not-allowed"
                  : isInstalling
                  ? "border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 cursor-wait"
                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
              title={fiscalReceiptNumber ? `${t('receipt.installed')}: ${fiscalReceiptNumber}` : t('receipt.installTooltip')}
            >
              {isInstalling ? (
                <div className="animate-spin">
                  <FileText size={24} className="text-purple-400 dark:text-purple-500" />
                </div>
              ) : fiscalReceiptNumber ? (
                <Check size={24} className="text-green-600 dark:text-green-400" />
              ) : (
                <FileText size={24} className="text-purple-600 dark:text-purple-400" />
              )}
              <span className="text-xs font-medium">
                {fiscalReceiptNumber ? t('receipt.installed') : t('receipt.install')}
              </span>
            </button>
            <button 
              onClick={() => setShowQR(!showQR)}
              className={clsx(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors",
                showQR 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              <QrCode size={24} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium">{t('receipt.qr')}</span>
            </button>
          </div>

          {showEmailInput && (
            <div className="w-full mb-6 animate-in slide-in-from-top-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={() => onEmail(email)}
                  className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700"
                >
                  {t('common.send')}
                </button>
              </div>
            </div>
          )}

          {showQR && (
            <div className="w-full mb-6 flex justify-center animate-in slide-in-from-top-2">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                {/* Placeholder for QR Code */}
                <div className="w-32 h-32 bg-gray-900 flex items-center justify-center text-white text-xs">
                  QR Code
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span>{t('receipt.newSale')}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
