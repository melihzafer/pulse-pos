# Pulse POS & Inventory Management System

> **Offline-First Point of Sale and Inventory Management for Modern Retail**

Pulse is a high-performance, production-ready POS and Inventory Management System built with a modern tech stack. It features full offline capability, real-time sync, thermal receipt printing, and a beautiful glassmorphism UI.

---

## 🌟 Key Features

### Desktop Client (Electron)
- **POS Interface**: Fast product grid with fuzzy search (Fuse.js), keyboard shortcuts (F1, F5, Esc)
- **Offline-First**: Dexie (IndexedDB) for local storage with automatic Supabase sync
- **Thermal Printer Support**: ESC/POS commands over network (IP:Port)
- **Inventory Management**: Real-time stock tracking with color-coded levels (Red/Orange/Green)
- **Settings Panel**: Configure printer, workspace, and sync preferences

### Mobile Client (React Native + Expo)
- **Barcode Scanner**: Fast scanning with expo-camera (planned)
- **Floating Tab Bar**: Custom glassmorphism design with center FAB
- **Stock Management**: Quick stock checks and receive inventory on-the-go
- **Dashboard**: Today's sales, transactions, and alerts

### Shared Core Logic
- **Type-Safe**: 100% TypeScript with Zod validation
- **State Management**: Zustand for global state, React Query for server state
- **Database Schema**: Products, Sales, Stock Movements, Workspaces
- **Sync Engine**: Delta sync with exponential backoff retry

---

## 🏗️ Architecture

```
/pulse-monorepo
├── /apps
│   ├── /desktop-client       # Electron + React + Vite
│   │   ├── /electron          # Main & Preload (Printer IPC)
│   │   └── /src
│   │       ├── /features      # POS, Inventory, Settings
│   │       └── /layouts       # Sidebar
│   └── /mobile-client         # Expo + React Native
│       ├── /app               # Expo Router (file-based routing)
│       │   ├── /(tabs)        # Dashboard, Inventory
│       │   └── /modals        # Scanner, Quick Actions
│       └── /components
└── /packages
    └── /core-logic            # Shared Business Logic
        ├── /database          # Dexie & Supabase
        ├── /store             # Zustand Stores (Cart, etc.)
        ├── /types             # Zod Schemas & TS Types
        ├── /utils             # Currency, Date, UUID
        └── /services          # Sync Service
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 18+ (tested on 20.x)
- **npm**: 9+ or **pnpm**: 8+ (workspaces)
- **Supabase Account** (optional, for cloud sync)
- **Thermal Printer** (optional, ESC/POS compatible)

### Installation

```powershell
# Clone the repository
git clone https://github.com/your-org/pulse.git
cd pulse

# Install all dependencies (monorepo)
npm install

# Desktop Client Setup
cd apps/desktop-client
cp .env.example .env.local
# Edit .env.local with your Supabase credentials (optional)

# Mobile Client Setup
cd ../mobile-client
# No additional setup needed
```

---

## 📦 Desktop Client

### Development
```powershell
cd apps/desktop-client
npm run dev
```

**Keyboard Shortcuts:**
- `F1`: Focus search
- `F5`: Complete payment
- `Esc`: Clear cart

### Build & Package
```powershell
npm run build       # Builds for current OS
```

### Features
- **Seed Data**: Auto-populated with 15 sample products on first run
- **Offline Mode**: All operations work without internet
- **Sync Status**: Visual indicator in settings (pending sales, last sync time)

---

## 📱 Mobile Client

### Development
```powershell
cd apps/mobile-client
npm start           # Opens Expo DevTools
npm run android     # Android emulator/device
npm run ios         # iOS simulator (macOS only)
```

### Features
- **Floating Tab Bar**: Detached from bottom edge with blur effect
- **Pulse Button**: Center FAB for quick actions (planned)
- **Dark Mode Native**: Optimized for low-light warehouse environments

---

## 🗄️ Database Schema

### Supabase (PostgreSQL)
```sql
-- Products: The core inventory asset
CREATE TABLE products (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  cost_price NUMERIC(10,2),
  sale_price NUMERIC(10,2),
  stock_quantity NUMERIC(10,2),
  updated_at TIMESTAMPTZ
);

-- Sales: Transaction header
CREATE TABLE sales (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  total_amount NUMERIC(10,2),
  payment_method TEXT,
  created_at TIMESTAMPTZ
);

-- Sale Items: Line items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  product_id UUID,
  product_name_snapshot TEXT,
  cost_snapshot NUMERIC(10,2),
  price_snapshot NUMERIC(10,2),
  quantity NUMERIC(10,2)
);

-- Stock Movements: Audit trail
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  product_id UUID,
  quantity_change NUMERIC(10,2),
  reason TEXT, -- 'sale', 'restock', 'waste', etc.
  created_at TIMESTAMPTZ
);
```

### Local Storage (Dexie / SQLite)
Mirrors the Supabase schema with additional fields:
- `_synced`: Boolean flag
- `_dirty`: Indicates unsaved changes
- `synced_at`: Timestamp of last sync

---

## 🔄 Offline Sync Strategy

1. **Writes**: Always write to local DB first
2. **Queue**: Mark unsynced records (`synced_at = ''`)
3. **Background Sync**: Auto-retry every 5 minutes (configurable)
4. **Conflict Resolution**: Server wins for product details, additive for stock
5. **Delta Pull**: Only fetch records `updated_at > last_sync_timestamp`

```typescript
// Start auto-sync
import { syncService } from '@pulse/core-logic';
syncService.startAutoSync(300); // 5 minutes

// Manual sync
await syncService.syncAll();

// Check status
const status = await syncService.getSyncStatus();
// { isOnline, isSyncing, pendingSales, pendingMovements, lastSync }
```

---

## 🖨️ Thermal Printer Setup

### Supported Printers
- Any ESC/POS compatible printer (80mm thermal)
- Network connection (IP:Port, default 9100)

### Configuration
1. Open **Settings** in Desktop Client
2. Enter printer IP (e.g., `192.168.1.100`)
3. Enter port (default: `9100`)
4. Click **Test Printer** to verify

### Receipt Format
- Header: Store name, timestamp
- Items: Name, Quantity, Price
- Total: Bold, large font
- Payment Method
- Footer: "Thank you!"

---

## 🎨 Design System

### Colors
- **Neon Blue**: `#00f3ff` (Primary actions, glow effects)
- **Slate Dark**: `#0f172a` (Background)
- **Glassmorphism**: `rgba(15, 23, 42, 0.9)` with backdrop blur

### Typography
- **Sans**: Inter (UI text)
- **Mono**: JetBrains Mono (numbers, codes)

### Components
- **Glassmorphism Panels**: Semi-transparent with subtle blur
- **Neon Accents**: Box-shadow glow on primary buttons
- **Stock Indicators**: 🔴 Low (≤ min) | 🟠 Medium | 🟢 Good

---

## 🧪 Testing

### Desktop
```powershell
cd apps/desktop-client
npm run lint        # ESLint
npm run typecheck   # TypeScript
```

### Core Logic
```powershell
cd packages/core-logic
npm test            # Vitest
```

---

## 📝 Environment Variables

### Desktop `.env.local`
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_WORKSPACE_ID=your-workspace-uuid
```

### Mobile (Expo)
Environment variables are managed via `app.config.js` for Expo projects.

---

## 🛠️ Tech Stack

| Layer | Desktop | Mobile | Shared |
|-------|---------|--------|--------|
| **Framework** | Electron + React 18 | Expo SDK 54 | TypeScript 5 |
| **Build Tool** | Vite | Metro | Turborepo |
| **Styling** | Tailwind + SCSS | NativeWind | — |
| **State** | Zustand | Zustand | Zustand |
| **Server State** | React Query | React Query | React Query |
| **Local DB** | Dexie (IndexedDB) | expo-sqlite | — |
| **Validation** | Zod | Zod | Zod |
| **Backend** | Supabase (PostgreSQL) | Supabase | @supabase/supabase-js |

---

## 🚧 Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Desktop POS with offline sync
- [x] Inventory grid with stock indicators
- [x] Thermal printer support (ESC/POS)
- [x] Settings panel
- [x] Mobile app structure (Expo Router)

### Phase 2: Mobile Features (Next)
- [ ] Barcode scanner (expo-camera)
- [ ] Quick Action modal (New Sale, Receive Stock)
- [ ] SQLite integration
- [ ] Sync service for mobile

### Phase 3: Advanced Features
- [ ] Dashboard with charts (Sales trends, Top products)
- [ ] Multi-user support (Roles: Admin, Cashier)
- [ ] Reports (End of Day, Profit/Loss)
- [ ] Supplier management
- [ ] Low stock alerts (Push notifications)

---

## 📄 License

Proprietary - All rights reserved

---

## 🤝 Contributing

This is a private project. For contributions, contact the repository owner.

---

## 📞 Support

For issues or questions:
- **Email**: support@pulse-pos.com
- **GitHub Issues**: (if public)

---

## 🙏 Acknowledgments

- **Electron Vite**: Fast HMR for Electron
- **Expo**: Amazing mobile development experience
- **Supabase**: Firebase alternative with PostgreSQL
- **Dexie.js**: Excellent IndexedDB wrapper

---

**Built with ❤️ for modern retail businesses**
