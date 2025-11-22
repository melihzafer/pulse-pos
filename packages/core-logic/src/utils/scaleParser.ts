export interface ParsedScaleBarcode {
  type: 'price_embedded' | 'weight_embedded';
  sku: string;
  value: number; // Price or Weight
  originalBarcode: string;
}

export const parseScaleBarcode = (barcode: string): ParsedScaleBarcode | null => {
  // Basic implementation for standard 13-digit EAN-13 starting with 27/29
  // Format: PP IIIII VVVVV C
  // PP: Prefix (27 = Price, 29 = Weight - configurable usually, but hardcoded for MVP)
  // IIIII: Item Code (SKU)
  // VVVVV: Value (Price in cents or Weight in grams)
  // C: Checksum
  
  if (!barcode || barcode.length !== 13) return null;

  const prefix = barcode.substring(0, 2);
  const itemCode = barcode.substring(2, 7);
  const valuePart = barcode.substring(7, 12);
  
  if (prefix === '27') {
    // Price embedded (e.g. 01250 = 12.50)
    const price = parseInt(valuePart, 10) / 100;
    return {
      type: 'price_embedded',
      sku: itemCode,
      value: price,
      originalBarcode: barcode
    };
  } else if (prefix === '29') {
    // Weight embedded (e.g. 01250 = 1.250 kg)
    const weight = parseInt(valuePart, 10) / 1000;
    return {
      type: 'weight_embedded',
      sku: itemCode,
      value: weight,
      originalBarcode: barcode
    };
  }

  return null;
};
