# 🚀 Quick Start Guide - Pulse POS

## Desktop App (Windows)

### 1. Start the Desktop Client
```powershell
cd d:\Projects\Pulse\apps\desktop-client
npm run dev
```

**What happens:**
- Vite dev server starts on `http://localhost:5173`
- Electron window opens automatically
- Database auto-seeds with 15 sample products

### 2. Test the POS Interface
1. Click **POS** in the sidebar
2. See product grid with sample items
3. Click a product to add to cart
4. Try keyboard shortcuts:
   - `F1` - Focus search bar
   - `F5` - Complete payment (with items in cart)
   - `Esc` - Clear cart

### 3. Test Inventory
1. Click **Inventory** in sidebar
2. See all products with stock levels
3. Color indicators:
   - 🔴 Red = Low stock (≤ minimum)
   - 🟠 Orange = Medium stock
   - 🟢 Green = Good stock
4. Use search to filter products

### 4. Configure Settings
1. Click **Settings** in sidebar
2. Set printer IP (e.g., `192.168.1.100`)
3. Enable/disable auto-sync
4. Click **Save Settings**

---

## Mobile App (Expo)

### 1. Start the Mobile Client
```powershell
cd d:\Projects\Pulse\apps\mobile-client
npm start
```

### 2. Choose Platform
- Press `a` - Android emulator/device
- Press `i` - iOS simulator (macOS only)
- Press `w` - Web browser

### 3. Explore

- **Dashboard**: See sales summary cards
- **Inventory**: Browse product list with stock badges
- **Pulse Button**: Center FAB opens Quick Actions menu
- **Barcode Scanner**: Tap Pulse Button -> Scan Item (requires camera permission)

### 4. Test Barcode Scanner

1. Tap the **Pulse Button** (center tab)
2. Tap **Scan Item**
3. Grant camera permission if asked
4. Scan a barcode (e.g., "111" for Espresso, "222" for Cappuccino)
5. See product details popup

---

## Testing Offline Mode (Desktop)

1. Open DevTools in Electron (View → Toggle Developer Tools)
2. Go to Network tab → Check "Offline"
3. Add products to cart and complete a sale
4. Notice: Sale saved locally (check console logs)
5. Uncheck "Offline" to reconnect
6. Observe: Automatic sync to Supabase (if configured)

---

## Testing Printer (Desktop)

### Option 1: Test Button

1. Go to **Settings**
2. Enter printer IP and port
3. Click **Test Printer**

### Option 2: Complete a Sale

1. Go to **POS**
2. Add items to cart
3. Press `F5` or click **Pay**
4. Receipt will print (if printer configured)

**Note**: Without a real printer, check the Electron console for formatted ESC/POS output.

---

## Market Mode Features (New)

### 1. Promotions

1. Go to **Promos** tab in sidebar
2. Click **New Promotion**
3. Create a "Buy 2 Get 1 Free" deal (BOGO)
4. Go to POS, add 3 matching items
5. Verify discount is applied automatically

### 2. Multi-Unit Barcodes

1. Go to **Inventory** -> Edit a product
2. Add an "Additional Barcode" with a multiplier (e.g., 6 for a case)
3. Go to POS, scan that barcode
4. Verify 6 units are added to cart

### 3. Scale Barcodes

1. In POS, type a weight-embedded barcode (e.g., `290000100500` for 0.5kg of SKU 00001)
2. Verify item is added with correct weight/price

---

## Troubleshooting

### Desktop won't start

```powershell
# Reinstall dependencies
cd d:\Projects\Pulse
npm install

# Clear cache and rebuild
cd apps\desktop-client
Remove-Item -Recurse node_modules, dist, dist-electron
npm install
npm run dev
```

### Mobile won't start

```powershell
# Reinstall dependencies
cd d:\Projects\Pulse\apps\mobile-client
Remove-Item -Recurse node_modules
npm install
npm start
```

### No sample data in Desktop

```powershell
# Open browser DevTools in Electron
# Run in console:
# await db.products.count()
# If 0, manually trigger seed:
# import { seedDatabase } from './utils/seedData'; await seedDatabase();
```

---

## Environment Setup (Optional)

### For Supabase Integration

1. Create a Supabase project at <https://supabase.com>
2. Copy `.env.example` to `.env.local` in `apps/desktop-client/`
3. Fill in your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WORKSPACE_ID=your-workspace-uuid
```

1. Restart the desktop app

### Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- See technical_architecture.txt for full schema
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency_code TEXT DEFAULT 'BGN',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  sku TEXT,
  cost_price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  stock_quantity NUMERIC(10,2) DEFAULT 0,
  min_stock_level NUMERIC(10,2) DEFAULT 5,
  category_id UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_products_workspace ON products(workspace_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_updated_at ON products(updated_at);
```

---

## Next Steps

1. ✅ Desktop app is fully functional for offline POS operations
2. 🔨 Mobile app needs barcode scanner implementation
3. 🔨 Both apps need Supabase integration for cloud sync
4. 📊 Analytics dashboard (charts, reports) coming in Phase 2

---

**Questions?** Check `README.md` and `BUILD_SUMMARY.md` for details.
