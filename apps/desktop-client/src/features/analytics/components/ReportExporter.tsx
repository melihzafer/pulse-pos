import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '@pulse/core-logic';
import { isWithinInterval, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportExporterProps {
  dateRange: { start: Date; end: Date };
}

export const ReportExporter: React.FC<ReportExporterProps> = ({ dateRange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Get data
      const sales = await db.sales
        .filter((sale) => {
          const saleDate = new Date(sale.created_at || '');
          return isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end });
        })
        .toArray();

      // Create PDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text('Pulse POS - Sales Report', 14, 22);
      
      doc.setFontSize(10);
      doc.text(
        `Period: ${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
        14,
        30
      );
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 14, 36);

      // Summary
      const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
      doc.setFontSize(12);
      doc.text('Summary', 14, 46);
      doc.setFontSize(10);
      doc.text(`Total Sales: ${sales.length}`, 14, 52);
      doc.text(`Total Revenue: ${totalRevenue.toFixed(2)} BGN`, 14, 58);

      // Sales table
      const tableData = sales.map((sale) => [
        format(new Date(sale.created_at || ''), 'MMM d, yyyy HH:mm'),
        sale.id.slice(0, 8),
        sale.payment_method,
        `${sale.total_amount.toFixed(2)} BGN`,
        sale.status,
      ]);

      autoTable(doc, {
        head: [['Date', 'Receipt', 'Payment', 'Amount', 'Status']],
        body: tableData,
        startY: 66,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      // Save
      doc.save(`pulse-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Get data
      const sales = await db.sales
        .filter((sale) => {
          const saleDate = new Date(sale.created_at || '');
          return isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end });
        })
        .toArray();

      // Get all sale items
      const saleIds = sales.map((s) => s.id);
      const allSaleItems = await db.sale_items
        .filter((item) => saleIds.includes(item.sale_id))
        .toArray();

      // Summary sheet
      const summaryData = [
        ['Pulse POS - Sales Report'],
        [`Period: ${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`],
        [`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`],
        [],
        ['Total Sales:', sales.length],
        ['Total Revenue:', sales.reduce((sum, s) => sum + s.total_amount, 0).toFixed(2) + ' BGN'],
      ];

      // Sales sheet
      const salesData = [
        ['Date', 'Receipt ID', 'Payment Method', 'Amount (BGN)', 'Status'],
        ...sales.map((sale) => [
          format(new Date(sale.created_at || ''), 'yyyy-MM-dd HH:mm'),
          sale.id,
          sale.payment_method,
          sale.total_amount,
          sale.status,
        ]),
      ];

      // Items sheet
      const itemsData = [
        ['Sale ID', 'Product', 'Quantity', 'Unit Price', 'Total'],
        ...allSaleItems.map((item) => [
          item.sale_id,
          item.product_name_snapshot,
          item.quantity,
          item.price_snapshot,
          item.price_snapshot * item.quantity,
        ]),
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const wsSales = XLSX.utils.aoa_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

      const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Items');

      // Save
      XLSX.writeFile(wb, `pulse-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={18} />
        <span className="text-sm font-medium">{t('analytics.export.title')}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2">
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
            >
              <FileText size={18} className="text-red-600" />
              <div className="text-left">
                <div className="font-medium">{t('analytics.export.pdf')}</div>
                <div className="text-xs text-gray-500">{t('analytics.export.pdfDescription')}</div>
              </div>
            </button>

            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet size={18} className="text-green-600" />
              <div className="text-left">
                <div className="font-medium">{t('analytics.export.excel')}</div>
                <div className="text-xs text-gray-500">{t('analytics.export.excelDescription')}</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
