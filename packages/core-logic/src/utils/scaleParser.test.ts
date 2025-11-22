import { describe, it, expect } from 'vitest';
import { parseScaleBarcode } from '../utils/scaleParser';

describe('scaleParser', () => {
  it('should parse price embedded barcode (27 prefix)', () => {
    // 27 01234 01250 C
    // SKU: 01234
    // Price: 12.50
    const barcode = '2701234012509';
    const result = parseScaleBarcode(barcode);
    
    expect(result).not.toBeNull();
    expect(result?.type).toBe('price_embedded');
    expect(result?.sku).toBe('01234');
    expect(result?.value).toBe(12.50);
  });

  it('should parse weight embedded barcode (29 prefix)', () => {
    // 29 54321 00500 C
    // SKU: 54321
    // Weight: 0.500 kg
    const barcode = '2954321005005';
    const result = parseScaleBarcode(barcode);
    
    expect(result).not.toBeNull();
    expect(result?.type).toBe('weight_embedded');
    expect(result?.sku).toBe('54321');
    expect(result?.value).toBe(0.5);
  });

  it('should return null for invalid length', () => {
    expect(parseScaleBarcode('123')).toBeNull();
  });

  it('should return null for unknown prefix', () => {
    expect(parseScaleBarcode('1234567890123')).toBeNull();
  });
});
