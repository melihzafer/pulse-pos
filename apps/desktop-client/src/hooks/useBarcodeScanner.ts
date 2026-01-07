import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@pulse/core-logic';
import type { Product } from '@pulse/core-logic';

export interface BarcodeScannerOptions {
  /**
   * Threshold in milliseconds between keystrokes to detect scanner vs manual typing
   * Scanners typically send characters much faster than human typing
   */
  scannerThreshold?: number;
  /**
   * Minimum barcode length to be considered valid
   */
  minBarcodeLength?: number;
  /**
   * Whether the scanner is enabled
   */
  enabled?: boolean;
  /**
   * Callback when a barcode is successfully scanned
   */
  onScan?: (barcode: string, product?: Product | null) => void;
  /**
   * Callback when an unknown barcode is scanned (product not found)
   */
  onUnknownBarcode?: (barcode: string) => void;
  /**
   * Input elements to exclude from barcode detection (e.g., search inputs)
   */
  excludeInputIds?: string[];
}

export interface BarcodeScannerResult {
  /** Whether scanning is currently in progress */
  isScanning: boolean;
  /** The last successfully scanned barcode */
  lastBarcode: string | null;
  /** Current buffer being accumulated */
  buffer: string;
  /** Manually trigger a barcode scan/lookup */
  manualScan: (barcode: string) => Promise<void>;
  /** Clear the current buffer */
  clearBuffer: () => void;
  /** Enable/disable scanner */
  setEnabled: (enabled: boolean) => void;
  /** Whether scanner is enabled */
  enabled: boolean;
}

/**
 * Global hook for barcode scanner detection
 * 
 * Detects rapid keystrokes characteristic of barcode scanners vs manual typing.
 * Automatically looks up products in the database when a valid barcode is detected.
 * 
 * @example
 * ```tsx
 * const { isScanning, lastBarcode, buffer, manualScan } = useBarcodeScanner({
 *   enabled: true,
 *   onScan: (barcode, product) => {
 *     if (product) {
 *       addToCart(product);
 *     }
 *   },
 *   onUnknownBarcode: (barcode) => {
 *     showCreateProductModal(barcode);
 *   },
 * });
 * ```
 */
export function useBarcodeScanner(options: BarcodeScannerOptions = {}): BarcodeScannerResult {
  const {
    scannerThreshold = 50,
    minBarcodeLength = 4,
    enabled: initialEnabled = true,
    onScan,
    onUnknownBarcode,
    excludeInputIds = [],
  } = options;

  const [enabled, setEnabled] = useState(initialEnabled);
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [buffer, setBuffer] = useState('');
  
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lookupProduct = useCallback(async (barcode: string) => {
    try {
      const product = await db.products.where('barcode').equals(barcode).first();
      return product;
    } catch (error) {
      console.error('Error looking up product:', error);
      return null;
    }
  }, []);

  const processBarcode = useCallback(async (barcode: string) => {
    if (barcode.length < minBarcodeLength) return;

    setLastBarcode(barcode);
    setIsScanning(false);

    const product = await lookupProduct(barcode);

    if (product) {
      onScan?.(barcode, product);
    } else {
      onUnknownBarcode?.(barcode);
    }
  }, [minBarcodeLength, lookupProduct, onScan, onUnknownBarcode]);

  const manualScan = useCallback(async (barcode: string) => {
    await processBarcode(barcode);
  }, [processBarcode]);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    setBuffer('');
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in excluded input
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Check if this input is in the exclude list
        if (excludeInputIds.includes(target.id)) {
          return;
        }
        // For other inputs, still capture scanner input but check pattern
        // Scanners often trigger on focused inputs too
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // If too much time has passed, this is likely manual typing - clear buffer
      if (timeSinceLastKey > scannerThreshold && bufferRef.current.length > 0) {
        bufferRef.current = '';
        setBuffer('');
        setIsScanning(false);
      }

      lastKeyTimeRef.current = now;

      // Handle Enter key - process barcode
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minBarcodeLength) {
          e.preventDefault();
          e.stopPropagation();
          processBarcode(bufferRef.current);
        }
        bufferRef.current = '';
        setBuffer('');
        return;
      }

      // Only accumulate printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
        setBuffer(bufferRef.current);
        setIsScanning(true);

        // Clear scanning indicator after threshold
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        scanTimeoutRef.current = setTimeout(() => {
          setIsScanning(false);
        }, scannerThreshold * 3);
      }
    };

    // Use keydown for Enter detection, keypress for character accumulation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && bufferRef.current.length >= minBarcodeLength) {
        e.preventDefault();
      }
    };

    window.addEventListener('keypress', handleKeyPress, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keypress', handleKeyPress, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [enabled, scannerThreshold, minBarcodeLength, processBarcode, excludeInputIds]);

  return {
    isScanning,
    lastBarcode,
    buffer,
    manualScan,
    clearBuffer,
    setEnabled,
    enabled,
  };
}

export default useBarcodeScanner;
