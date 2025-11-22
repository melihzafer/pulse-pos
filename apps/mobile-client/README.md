# Pulse Mobile Client

React Native mobile companion app for the Pulse POS system.

## Features

- **Dashboard**: Real-time sales metrics, inventory overview, low stock alerts
- **Inventory Management**: View products, search, barcode scanning (planned)
- **Quick Actions**: Fast access to common tasks via floating action button
- **Offline-First**: Full functionality without internet using Dexie (IndexedDB)
- **Shared Logic**: Uses `@pulse/core-logic` for type safety and business logic consistency

## Tech Stack

- **Framework**: React Native + Expo SDK 52
- **Routing**: Expo Router (file-based navigation)
- **Database**: Dexie (same as desktop for consistency)
- **State**: Zustand (lightweight, performant)
- **Styling**: NativeWind (Tailwind for React Native)
- **TypeScript**: Strict mode enabled

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Studio (Windows/Mac/Linux)
- For physical devices: Expo Go app

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Project Structure

```
apps/mobile-client/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Dashboard
│   │   ├── inventory.tsx  # Inventory screen
│   │   └── pulse.tsx      # Quick actions trigger
│   ├── modals/            # Modal screens
│   │   ├── quick-action.tsx
│   │   └── scan.tsx       # Barcode scanner
│   └── _layout.tsx        # Root layout
├── lib/
│   └── db.ts              # Dexie database (shared schema with desktop)
├── components/            # Reusable UI components
├── assets/                # Images, fonts, icons
└── app.json               # Expo configuration
```

## Database

Uses **Dexie** (IndexedDB abstraction) with the same schema as desktop:

- `products` - Product catalog
- `sales` - Transaction records
- `sale_items` - Line items
- `promotions` - Active promotions
- `customers` - Customer database
- `product_barcodes` - Multi-barcode support
- `stock_movements` - Inventory tracking

## Planned Features

- [ ] Barcode scanning with `expo-camera`
- [ ] Mobile POS checkout flow
- [ ] Push notifications for low stock
- [ ] Sync with desktop via Supabase
- [ ] Offline queue for sales
- [ ] Receipt printing via Bluetooth
- [ ] Multi-language support (i18next)

## Development

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Clear cache
npx expo start -c
```

## Build & Deploy

```bash
# Create development build
npx expo build:android
npx expo build:ios

# For production
eas build --platform android
eas build --platform ios
```

## Notes

- **Expo SDK 52** used for stability (SDK 54 doesn't exist yet)
- NativeWind v4 for better performance than v2
- Shared types with desktop via `@pulse/core-logic`
- Dark mode enabled by default (`userInterfaceStyle: "dark"`)
