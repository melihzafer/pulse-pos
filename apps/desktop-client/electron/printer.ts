import { ipcMain } from 'electron';
import * as net from 'net';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  timestamp?: string;
  printerSettings?: {
    ip: string;
    port: number;
  };
}

// ESC/POS Commands (Hex)
const ESC = '\x1B';
const GS = '\x1D';

const Commands = {
  INIT: ESC + '@', // Initialize printer
  ALIGN_CENTER: ESC + 'a' + '1',
  ALIGN_LEFT: ESC + 'a' + '0',
  ALIGN_RIGHT: ESC + 'a' + '2',
  BOLD_ON: ESC + 'E' + '1',
  BOLD_OFF: ESC + 'E' + '0',
  SIZE_NORMAL: GS + '!' + '\x00',
  SIZE_DOUBLE: GS + '!' + '\x11',
  CUT: GS + 'V' + '1', // Partial cut
  FEED: '\n',
};

/**
 * Format receipt text with ESC/POS commands
 */
function formatReceipt(data: ReceiptData): string {
  const lines: string[] = [];

  // Initialize
  lines.push(Commands.INIT);

  // Header - Centered, Bold, Large
  lines.push(Commands.ALIGN_CENTER);
  lines.push(Commands.SIZE_DOUBLE);
  lines.push(Commands.BOLD_ON);
  lines.push('PULSE POS');
  lines.push(Commands.FEED);
  lines.push(Commands.BOLD_OFF);
  lines.push(Commands.SIZE_NORMAL);
  lines.push('================================');
  lines.push(Commands.FEED);

  // Timestamp
  lines.push(Commands.ALIGN_LEFT);
  const timestamp = data.timestamp || new Date().toLocaleString();
  lines.push(`Date: ${timestamp}`);
  lines.push(Commands.FEED);
  lines.push('================================');
  lines.push(Commands.FEED);

  // Items
  lines.push(Commands.BOLD_ON);
  lines.push(padLine('Item', 'Qty', 'Price'));
  lines.push(Commands.BOLD_OFF);
  lines.push('--------------------------------');
  lines.push(Commands.FEED);

  data.items.forEach((item) => {
    const itemName = item.name.substring(0, 20);
    const qty = `x${item.quantity}`;
    const price = formatCurrency(item.price * item.quantity);
    lines.push(padLine(itemName, qty, price));
    lines.push(Commands.FEED);
  });

  // Total
  lines.push('================================');
  lines.push(Commands.FEED);
  lines.push(Commands.BOLD_ON);
  lines.push(Commands.SIZE_DOUBLE);
  lines.push(Commands.ALIGN_RIGHT);
  lines.push(`TOTAL: ${formatCurrency(data.total)}`);
  lines.push(Commands.FEED);
  lines.push(Commands.BOLD_OFF);
  lines.push(Commands.SIZE_NORMAL);
  lines.push(Commands.ALIGN_LEFT);

  // Payment method
  lines.push('--------------------------------');
  lines.push(Commands.FEED);
  lines.push(`Payment: ${data.paymentMethod.toUpperCase()}`);
  lines.push(Commands.FEED);

  // Footer
  lines.push('================================');
  lines.push(Commands.FEED);
  lines.push(Commands.ALIGN_CENTER);
  lines.push('Thank you!');
  lines.push(Commands.FEED);
  lines.push('Visit us again');
  lines.push(Commands.FEED);
  lines.push(Commands.FEED);
  lines.push(Commands.FEED);

  // Cut paper
  lines.push(Commands.CUT);

  return lines.join('');
}

/**
 * Pad a line with 3 columns
 */
function padLine(col1: string, col2: string, col3: string): string {
  const lineWidth = 32; // Standard 32 char width for thermal printers
  const col2Width = 5;
  const col3Width = 8;
  const col1Width = lineWidth - col2Width - col3Width;

  const paddedCol1 = col1.padEnd(col1Width, ' ').substring(0, col1Width);
  const paddedCol2 = col2.padEnd(col2Width, ' ').substring(0, col2Width);
  const paddedCol3 = col3.padStart(col3Width, ' ').substring(0, col3Width);

  return paddedCol1 + paddedCol2 + paddedCol3;
}

/**
 * Format currency (BGN)
 */
function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} BGN`;
}

/**
 * Send data to network printer
 */
async function printToNetworkPrinter(
  ip: string,
  port: number,
  data: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.setTimeout(5000); // 5 second timeout

    client.connect(port, ip, () => {
      console.log(`Connected to printer at ${ip}:${port}`);
      client.write(data, 'binary');
    });

    client.on('data', (response) => {
      console.log('Printer response:', response.toString());
      client.destroy();
      resolve();
    });

    client.on('close', () => {
      console.log('Connection closed');
      resolve();
    });

    client.on('error', (err) => {
      console.error('Printer error:', err);
      reject(err);
    });

    client.on('timeout', () => {
      console.error('Printer timeout');
      client.destroy();
      reject(new Error('Printer connection timeout'));
    });

    // Auto-close after write if no response expected
    setTimeout(() => {
      if (!client.destroyed) {
        client.destroy();
        resolve();
      }
    }, 1000);
  });
}

/**
 * Setup IPC handlers for printer
 */
export function setupPrinterIPC() {
  ipcMain.handle('print-receipt', async (_event, data: ReceiptData) => {
    try {
      // Get printer settings from data or use defaults
      const printerIP = data.printerSettings?.ip || '192.168.1.100';
      const printerPort = data.printerSettings?.port || 9100;

      const formattedReceipt = formatReceipt(data);
      await printToNetworkPrinter(printerIP, printerPort, formattedReceipt);

      return { success: true };
    } catch (error) {
      console.error('Print failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
