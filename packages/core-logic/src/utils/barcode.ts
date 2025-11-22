/**
 * Parses a barcode to extract product code and weight/price if it's a weight-embedded barcode.
 * Standard format (EAN-13): PP IIIII WWWWW C
 * PP: Prefix (usually 27, 28, 29 for in-store)
 * IIIII: Item Code (PLU)
 * WWWWW: Weight in grams (or price in cents)
 * C: Checksum
 */

export interface ParsedBarcode {
  original: string;
  isWeightEmbedded: boolean;
  productCode?: string;
  weight?: number; // in kg
  price?: number; // if price embedded
}

export function parseBarcode(barcode: string): ParsedBarcode {
  // Basic validation for EAN-13
  if (!barcode || barcode.length !== 13) {
    return { original: barcode, isWeightEmbedded: false };
  }

  const prefix = barcode.substring(0, 2);

  // Check for weight-embedded prefix (commonly 27, 28, 29)
  // This can be configured per store, but we'll use defaults for now
  if (['27', '28', '29'].includes(prefix)) {
    const itemCode = barcode.substring(2, 7);
    const weightPart = barcode.substring(7, 12);
    
    // Weight is usually in grams (e.g., 01500 = 1.5kg)
    const weightInGrams = parseInt(weightPart, 10);
    const weightInKg = weightInGrams / 1000;

    return {
      original: barcode,
      isWeightEmbedded: true,
      productCode: itemCode, // This should match the 'sku' or specific 'plu' field in product
      weight: weightInKg
    };
  }

  return { original: barcode, isWeightEmbedded: false };
}
