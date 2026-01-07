import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatMoney } from '@pulse/core-logic';
import type { ReceiptTemplate, ReceiptData, ReceiptComponent } from './types';

interface ReceiptPreviewProps {
  template: ReceiptTemplate;
  data?: Partial<ReceiptData>;
  scale?: number;
}

const SAMPLE_DATA: ReceiptData = {
  receiptNumber: 'INV-2025-001234',
  date: '27/11/2025',
  time: '14:32:45',
  items: [
    { name: 'Coca-Cola 500ml', quantity: 2, price: 2.50, total: 5.00 },
    { name: 'Sandwich - Chicken', quantity: 1, price: 6.90, discount: 1.00, total: 5.90 },
    { name: 'Water 1L', quantity: 3, price: 1.20, total: 3.60 },
  ],
  subtotal: 14.50,
  discountTotal: 1.00,
  taxTotal: 2.30,
  total: 15.80,
  paymentMethod: 'Cash',
  amountTendered: 20.00,
  change: 4.20,
  customer: {
    name: 'John Smith',
    phone: '+359 888 123 456',
    email: 'john@example.com',
    loyaltyPoints: 158,
    tier: 'Silver',
  },
  cashier: 'Maria K.',
  storeName: 'Pulse Store',
  storeAddress: '123 Main Street, Sofia',
  storePhone: '+359 2 123 4567',
  promotionMessage: '10% off on weekends!',
};

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ 
  template, 
  data = SAMPLE_DATA,
  scale = 1 
}) => {
  const mergedData = { ...SAMPLE_DATA, ...data };
  const paperWidth = template.paperWidth === '58mm' ? 220 : 300;

  const shouldShow = (component: ReceiptComponent): boolean => {
    if (!component.showIf) return true;
    
    switch (component.showIf) {
      case 'has_customer':
        return !!mergedData.customer;
      case 'has_discount':
        return (mergedData.discountTotal || 0) > 0;
      case 'has_promo':
        return !!mergedData.promotionMessage;
      case 'is_cash':
        return mergedData.paymentMethod?.toLowerCase() === 'cash';
      case 'is_card':
        return mergedData.paymentMethod?.toLowerCase() === 'card';
      default:
        return true;
    }
  };

  const getFieldValue = (field: string): string => {
    switch (field) {
      case 'store_name':
        return mergedData.storeName || 'Store Name';
      case 'store_address':
        return mergedData.storeAddress || '';
      case 'store_phone':
        return mergedData.storePhone || '';
      case 'date':
        return mergedData.date;
      case 'time':
        return mergedData.time;
      case 'date_time':
        return `${mergedData.date} ${mergedData.time}`;
      case 'receipt_number':
        return `Receipt #: ${mergedData.receiptNumber}`;
      case 'cashier':
        return `Cashier: ${mergedData.cashier || 'N/A'}`;
      case 'customer_name':
        return `Customer: ${mergedData.customer?.name || 'N/A'}`;
      case 'customer_phone':
        return mergedData.customer?.phone || '';
      case 'customer_email':
        return mergedData.customer?.email || '';
      case 'loyalty_points':
        return `Points earned: ${mergedData.customer?.loyaltyPoints || 0}`;
      case 'customer_tier':
        return `Tier: ${mergedData.customer?.tier || 'Bronze'}`;
      case 'subtotal':
        return `Subtotal: ${formatMoney(mergedData.subtotal)}`;
      case 'discount_total':
        return `Discount: -${formatMoney(mergedData.discountTotal)}`;
      case 'tax_total':
        return `VAT (20%): ${formatMoney(mergedData.taxTotal)}`;
      case 'total':
        return `TOTAL: ${formatMoney(mergedData.total)}`;
      case 'payment_method':
        return `Payment: ${mergedData.paymentMethod}`;
      case 'amount_tendered':
        return `Tendered: ${formatMoney(mergedData.amountTendered || 0)}`;
      case 'change':
        return `Change: ${formatMoney(mergedData.change || 0)}`;
      case 'promo_message':
        return mergedData.promotionMessage || '';
      default:
        return '';
    }
  };

  const getFontSize = (size?: string): string => {
    switch (size) {
      case 'small': return '10px';
      case 'normal': return '12px';
      case 'large': return '16px';
      case 'xlarge': return '20px';
      default: return '12px';
    }
  };

  const getAlignment = (alignment?: string): string => {
    switch (alignment) {
      case 'left': return 'flex-start';
      case 'center': return 'center';
      case 'right': return 'flex-end';
      default: return 'flex-start';
    }
  };

  const renderComponent = (component: ReceiptComponent) => {
    if (!shouldShow(component)) return null;

    const baseStyle: React.CSSProperties = {
      width: '100%',
      display: 'flex',
      justifyContent: getAlignment(component.alignment),
      fontSize: getFontSize(component.fontSize),
      fontWeight: component.bold ? 'bold' : 'normal',
      fontStyle: component.italic ? 'italic' : 'normal',
      textDecoration: component.underline ? 'underline' : 'none',
      padding: '2px 0',
    };

    switch (component.type) {
      case 'text':
        return (
          <div key={component.id} style={baseStyle}>
            {component.content}
          </div>
        );

      case 'field': {
        const value = getFieldValue(component.field || '');
        if (!value) return null;
        return (
          <div key={component.id} style={baseStyle}>
            {value}
          </div>
        );
      }

      case 'logo':
        return (
          <div key={component.id} style={{ ...baseStyle, padding: '8px 0' }}>
            <div 
              style={{
                width: 60,
                height: 60,
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 14,
              }}
            >
              PULSE
            </div>
          </div>
        );

      case 'divider':
        return (
          <div key={component.id} style={{ width: '100%', padding: '4px 0' }}>
            <div style={{ borderTop: '1px dashed #666', width: '100%' }} />
          </div>
        );

      case 'spacer':
        return <div key={component.id} style={{ height: component.height || 10 }} />;

      case 'items':
        return (
          <div key={component.id} style={{ width: '100%', fontSize: '11px' }}>
            {mergedData.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <div style={{ flex: 1 }}>
                  <div>{item.name}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {item.quantity} x {item.price.toFixed(2)}
                    {item.discount ? ` (-${item.discount.toFixed(2)})` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 'bold' }}>{item.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        );

      case 'totals':
        return (
          <div key={component.id} style={{ width: '100%', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Subtotal:</span>
              <span>{formatMoney(mergedData.subtotal)}</span>
            </div>
            {mergedData.discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#22c55e' }}>
                <span>Discount:</span>
                <span>-{formatMoney(mergedData.discountTotal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>VAT (20%):</span>
              <span>{formatMoney(mergedData.taxTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid #333', marginTop: '4px' }}>
              <span>TOTAL:</span>
              <span>{formatMoney(mergedData.total)}</span>
            </div>
          </div>
        );

      case 'barcode':
        return (
          <div key={component.id} style={{ ...baseStyle, padding: '8px 0' }}>
            <div style={{ background: '#000', color: '#fff', padding: '8px 16px', fontFamily: 'monospace', fontSize: '10px' }}>
              ||| || ||| | || ||| || |
            </div>
          </div>
        );

      case 'qrcode':
        return (
          <div key={component.id} style={{ ...baseStyle, padding: '8px 0' }}>
            <QRCodeSVG 
              value={`https://receipts.pulse.app/view/${mergedData.receiptNumber}`}
              size={80}
              level="M"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      style={{
        width: paperWidth * scale,
        background: '#fff',
        color: '#000',
        fontFamily: '"Courier New", monospace',
        padding: 16 * scale,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {template.components.map((component) => renderComponent(component))}
    </div>
  );
};

export default ReceiptPreview;
