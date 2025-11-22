# Pulse Market Mode

This document outlines the technical implementation of the Market Mode features.

## 1. Database Schema Changes

### Core Logic (Desktop/Web)

- **New Tables**:
  - `product_barcodes`: Stores multi-unit barcodes (Cases, Packs).
  - `promotions`: Stores promotion rules (BOGO, Bundles).
- **Product Updates**:
  - `age_restricted`: Boolean flag for age verification.
  - `deposit_sku_id`: Link to a deposit product (e.g., Bottle Deposit).

### Mobile Client

- **New Tables**: `product_barcodes`, `promotions`.
- **Product Updates**: Added `age_restricted` and `deposit_sku_id` columns.

## 2. Features

### Multi-Unit Barcodes

- Allows multiple barcodes for a single product.
- Each barcode has a `multiplier` (e.g., Case of 6 = multiplier 6).
- **Usage**: `MarketService.findProduct(barcode)` checks this table automatically.

### Scale Parser

- Supports Price-Embedded (`27xxxxx`) and Weight-Embedded (`29xxxxx`) barcodes.
- **Format**: `PP IIIII VVVVV C` (Prefix, SKU, Value, Checksum).
- **Logic**:
  - `27`: Value is Price. Quantity = Value / Unit Price.
  - `29`: Value is Weight (kg). Quantity = Value.

### Promotion Engine

- **Structure**: JSON-based rules stored in `promotions` table.
- **Supported Types**:
  - `bogo`: Buy X Get Y.
- **Usage**: `MarketService.applyPromotions(cart)` calculates discounts.

## 3. Usage Example

```typescript
import { MarketService } from '@pulse/core-logic';

const marketService = new MarketService();

// 1. Scan Item
const result = await marketService.findProduct('2700123012509');
if (result) {
  // Add to cart
  cart.addItem(result.product, result.quantity);
}

// 2. Apply Promotions
const updatedCart = await marketService.applyPromotions(cart.items);
```
