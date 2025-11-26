import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CartItem, formatCurrency } from '@pulse/core-logic';

interface ReceiptData {
  receiptNumber?: string;
  fiscalReceiptNumber?: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  change?: number;
  customerName?: string;
  cashierName?: string;
}

export const generateReceiptPDF = (data: ReceiptData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = 20;

  // --- Header Section ---
  // Store Name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PULSE POS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Store Address (Mock)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Business Blvd, Tech City', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('Tel: +1 (555) 123-4567 | Email: support@pulse-pos.com', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('VAT: BG123456789', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Receipt Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES RECEIPT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // --- Info Section (Left & Right) ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const leftColX = margin;
  const rightColX = pageWidth - margin - 60;

  // Left Column
  doc.text(`Date: ${data.date}`, leftColX, yPosition);
  yPosition += 5;
  if (data.receiptNumber) {
    doc.text(`Receipt #: ${data.receiptNumber.slice(0, 8)}...`, leftColX, yPosition);
    yPosition += 5;
  }
  if (data.fiscalReceiptNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Fiscal #: ${data.fiscalReceiptNumber}`, leftColX, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 5;
  }

  // Reset Y for Right Column
  let rightY = yPosition - (data.fiscalReceiptNumber ? 15 : 10);
  if (data.receiptNumber) rightY -= 0; // Adjust if needed

  // Right Column
  if (data.cashierName) {
    doc.text(`Cashier: ${data.cashierName}`, rightColX, rightY);
    rightY += 5;
  }
  if (data.customerName) {
    doc.text(`Customer: ${data.customerName}`, rightColX, rightY);
    rightY += 5;
  }
  
  // Payment Method - Ensure it doesn't overflow or look weird
  const paymentLabel = `Payment: ${data.paymentMethod}`;
  // Check if text is too long for the space
  const maxPaymentWidth = pageWidth - rightColX - margin;
  const paymentLines = doc.splitTextToSize(paymentLabel, maxPaymentWidth);
  doc.text(paymentLines, rightColX, rightY);
  
  yPosition = Math.max(yPosition, rightY + (paymentLines.length * 5)) + 10;

  // --- Items Table ---
  if (!data.items || data.items.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No items in this receipt', pageWidth / 2, yPosition + 10, { align: 'center' });
    yPosition += 20;
  } else {
    const tableData = data.items.map(item => [
      item.product.name,
      item.quantity.toString(),
      formatCurrency(item.product.sale_price),
      item.discount ? `-${formatCurrency(item.discount)}` : '-',
      formatCurrency(item.subtotal),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Item Description', 'Qty', 'Price', 'Disc.', 'Amount']],
      body: tableData,
      theme: 'striped',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [41, 128, 185], // Blue header
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 30, halign: 'right', textColor: [200, 0, 0] }, // Red text for discount, increased width
        4: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    // @ts-expect-error - jspdf-autotable adds finalY property
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // --- Totals Section ---
  const totalsWidth = 70;
  const totalsX = pageWidth - margin - totalsWidth;
  
  // Draw box for totals with background
  doc.setFillColor(245, 247, 250); // Light gray/blue background
  doc.setDrawColor(200, 200, 200);
  doc.rect(totalsX - 5, yPosition - 5, totalsWidth + 5, 45, 'FD'); // Fill and Draw

  doc.setFontSize(10);
  
  // Subtotal
  doc.text('Subtotal:', totalsX, yPosition);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 7;

  // Tax
  doc.text('Tax (20%):', totalsX, yPosition);
  doc.text(formatCurrency(data.tax), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 7;

  // Divider
  doc.setLineWidth(0.2);
  doc.line(totalsX, yPosition - 2, pageWidth - margin, yPosition - 2);
  yPosition += 2;

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, yPosition);
  doc.text(formatCurrency(data.total), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 10;

  // Change
  if (data.change !== undefined) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Change Due:', totalsX, yPosition);
    doc.text(formatCurrency(data.change), pageWidth - margin, yPosition, { align: 'right' });
  }

  // --- Footer Section ---
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for shopping with us!', pageWidth / 2, footerY, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Returns accepted within 30 days with original receipt.', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text('www.pulse-pos.com', pageWidth / 2, footerY + 10, { align: 'center' });

  // Fiscal Notice
  if (data.fiscalReceiptNumber) {
    doc.setFontSize(7);
    doc.text('*** FISCAL RECEIPT ***', pageWidth / 2, footerY + 18, { align: 'center' });
  }

  return doc;
};

export const downloadReceiptPDF = (data: ReceiptData, filename?: string) => {
  const doc = generateReceiptPDF(data);
  const defaultFilename = filename || `receipt_${data.fiscalReceiptNumber || data.receiptNumber || Date.now()}.pdf`;
  doc.save(defaultFilename);
};
