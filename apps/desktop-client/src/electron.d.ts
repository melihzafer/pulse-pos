// Type definitions for Electron API exposed to renderer
interface ElectronAPI {
  printReceipt: (data: {
    items: { name: string; quantity: number; price: number }[];
    total: number;
    paymentMethod: string;
    timestamp?: string;
    printerSettings?: {
      ip: string;
      port: number;
    };
  }) => Promise<{ success: boolean; error?: string }>;
  showNotification: (data: { title: string; body: string }) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
