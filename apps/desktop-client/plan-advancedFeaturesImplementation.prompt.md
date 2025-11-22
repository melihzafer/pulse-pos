# Advanced Features Implementation Roadmap for Pulse POS

**TL;DR:** Systematically implement 18 feature categories across the Pulse POS system by following a phased approach. Start with high-impact, low-risk analytics features that leverage existing data, then expand to CRM enhancements, inventory upgrades, and finally complex multi-location and integration features. Each phase builds on previous work while maintaining backward compatibility and the offline-first architecture.

---

## Phase 1: Analytics & Business Intelligence (2-3 weeks)

### 1.1 Create Analytics Dashboard Screen
- Add new sidebar navigation item for Analytics/Reports
- Implement dashboard layout with responsive grid
- **Revenue Trends Component:**
  - Line/bar charts using recharts library
  - Daily, weekly, monthly, yearly views with date range picker
  - Compare current period vs previous period
  - Revenue by payment method breakdown
- **Top Products Analysis:**
  - Top 10 products by sales volume (quantity sold)
  - Top 10 products by revenue (total BGN)
  - Top 10 products by profit margin
  - Visual bar charts with product images
- **Profit Margin Analysis:**
  - Calculate profit per sale item: (sale_price - cost_snapshot) × quantity
  - Aggregate by product, category, time period
  - Identify low-margin items for pricing review
- **Hourly Sales Heatmap:**
  - Visualize sales by hour of day and day of week
  - Identify peak hours for staffing optimization
  - Color-coded heat cells (red=high, blue=low)
- **Cashier Performance Metrics:**
  - Sales count and revenue per employee per shift
  - Average transaction value
  - Items per transaction
  - Refund/void rates
- **Low Stock Alerts Widget:**
  - Products below min_stock_level
  - Visual indicators (critical/warning/ok)
  - Quick action buttons to reorder

### 1.2 Report Export System
- **PDF Generation:**
  - Install jsPDF and jspdf-autotable
  - Create customizable PDF templates (header with logo, footer with page numbers)
  - Include charts as images using html2canvas
  - Support for multi-page reports
- **Excel Export:**
  - Install SheetJS (xlsx library)
  - Export raw data with formatting
  - Multiple sheets per workbook (Summary, Details, Products, Customers)
  - Auto-column sizing
- **Scheduled Reports:**
  - Configure email delivery schedule (daily at 9am, weekly on Monday)
  - Email service integration (SendGrid, AWS SES, or Nodemailer)
  - Report templates selection
  - Recipient list management
- **UI Components:**
  - Date range picker with presets (Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom)
  - Filter by category, cashier, payment method
  - Export button with format selection dropdown

### 1.3 Real-time Notifications System
- **Desktop Notifications:**
  - Use Electron notification API for native OS notifications
  - Critical alerts: Stock reaches 0, High-value sale (>1000 BGN), Failed sync
  - Configurable notification preferences in settings
- **In-App Toast Notifications:**
  - Already using Sonner library - extend usage
  - Success: Sale completed, Product updated, Sync successful
  - Warning: Low stock, Shift approaching end time
  - Error: Sync failed, Printer offline, Database error
- **Alert Configuration Screen:**
  - Enable/disable notification types
  - Set thresholds (e.g., notify when stock < 5 units)
  - Sound preferences
  - Do Not Disturb schedule

---

## Phase 2: Enhanced CRM & Loyalty (2 weeks)

### 2.1 Extend Customer Schema
- **Database Migration to v7:**
  ```typescript
  customer table additions:
  - birth_date: string (ISO date)
  - tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  - total_spent: number (lifetime value)
  - visit_count: number
  - last_visit_date: string
  - preferences: JSON (favorite products, allergies, notes)
  - tags: string[] (VIP, Wholesale, Family, etc.)
  - referral_code: string (unique code for referral program)
  - referred_by: string (customer_id of referrer)
  ```
- **Automatic Point Accumulation:**
  - Add points calculation in cartStore during checkout
  - Configurable rules: 1 point per 10 BGN spent
  - Bonus points for specific products or promotions
  - Point expiration logic (e.g., expire after 1 year)

### 2.2 Build Customer Profile Screen
- **Layout:**
  - Customer header card (name, tier badge, total spent, points balance)
  - Tabs: Overview, Purchase History, Loyalty, Notes
- **Purchase History Tab:**
  - Searchable, sortable table of all transactions
  - Columns: Date, Receipt #, Items, Total, Payment Method
  - Click to view full receipt details
  - Filter by date range, product, amount
- **Loyalty Tab:**
  - Current tier with progress bar to next tier
  - Tier benefits list
  - Point earning/redemption history
  - Upcoming rewards (birthday, anniversary)
- **Notes & Preferences:**
  - Free-form notes field (staff observations)
  - Favorite products auto-detected from purchase history
  - Dietary preferences/allergies
  - Communication preferences (Email, SMS, WhatsApp)

### 2.3 Loyalty Automation Engine
- **Point Earning Rules:**
  - Configurable point-to-currency ratio
  - Bonus point multipliers (2x points on Fridays, 3x for specific categories)
  - Promotional campaigns (Spend 100 BGN, get 50 bonus points)
- **Tier System:**
  - Bronze: Default (0-499 points)
  - Silver: 500-999 points (5% discount on all purchases)
  - Gold: 1000-2499 points (10% discount + birthday gift)
  - Platinum: 2500+ points (15% discount + priority service + monthly gift)
  - Automatic tier upgrades/downgrades based on annual spending
- **Automated Birthday Rewards:**
  - Daily cron job to check upcoming birthdays
  - Generate 1-time use coupon code
  - Send email/SMS with birthday message
  - Auto-apply discount at POS when customer is selected
- **Referral Program:**
  - Each customer gets unique referral code
  - Referee gets 100 points on first purchase
  - Referrer gets 50 points when referee makes first purchase
  - Track referral chain in database

---

## Phase 3: Advanced Inventory & Suppliers (2 weeks)

### 3.1 Supplier Management Module
- **New Database Tables (v8):**
  ```typescript
  suppliers table:
  - id, name, contact_person, email, phone, address
  - payment_terms: 'cash' | 'net15' | 'net30' | 'net60'
  - lead_time_days: number
  - is_active: boolean
  - notes: string
  
  product_suppliers table (many-to-many):
  - product_id, supplier_id
  - supplier_sku: string
  - cost_price: number (supplier-specific pricing)
  - is_preferred: boolean
  - min_order_quantity: number
  ```
- **Supplier Directory Screen:**
  - Grid/list view of all suppliers
  - Search and filter (active/inactive, by product)
  - Supplier profile cards with quick stats (# products, total spend)
  - Add/Edit/Deactivate supplier modal

### 3.2 Purchase Order System
- **New Tables:**
  ```typescript
  purchase_orders table:
  - id, po_number (auto-increment PO-001, PO-002), supplier_id
  - status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
  - order_date, expected_delivery_date, actual_delivery_date
  - subtotal, tax, shipping, total
  - notes
  
  purchase_order_items table:
  - po_id, product_id
  - quantity_ordered, quantity_received
  - unit_cost, total_cost
  ```
- **PO Creation Workflow:**
  - Select supplier → Add products from catalog → Set quantities
  - Auto-suggest reorder based on low stock items
  - Calculate totals with tax
  - Generate PDF PO document for emailing to supplier
  - Status transitions: Draft → Sent (via email) → Confirmed → Received
- **Receiving Interface:**
  - Scan/select PO to receive
  - Check off items as they arrive (partial receiving supported)
  - Discrepancy handling (received less/more than ordered)
  - Auto-update product stock quantities
  - Generate receiving report
- **Backorder Tracking:**
  - If quantity_received < quantity_ordered, create backorder
  - Backorder notification widget
  - Re-send PO for backordered items

### 3.3 Enhanced Stock Features
- **Batch/Lot Tracking:**
  - Add batch_number and expiration_date to stock_movements
  - FIFO logic: sell oldest batches first
  - Expiration alerts (30 days, 7 days, expired)
  - Batch recall functionality
- **Stock Adjustment Audit:**
  - Stock adjustment modal with mandatory reason dropdown:
    - Damaged, Expired, Theft, Counting Error, Promotion, Sample
  - Adjustment history log with user tracking
  - Photo upload for evidence (damage/expiration photos)
- **Stock Transfer Between Locations:**
  - Transfer request workflow: Location A requests from Location B
  - Manager approval required
  - Status: Requested → Approved → In Transit → Received
  - Automatic stock adjustments at both locations
  - Transfer manifest printout

---

## Phase 4: Payment & Financial Features (1-2 weeks)

### 4.1 Gift Card System
- **New Table:**
  ```typescript
  gift_cards table:
  - id, card_number (barcode format), balance, original_amount
  - is_active, issued_date, last_used_date
  - issued_by_user_id, sold_to_customer_id
  - notes
  ```
- **Gift Card Operations:**
  - Sell gift card as product (create new card with balance)
  - Redeem at checkout (scan card barcode, apply balance to transaction)
  - Check balance (lookup screen)
  - Reload gift card (add value to existing card)
  - Bulk generation for corporate orders
- **Printing:**
  - Thermal printer template for gift card receipts
  - Include barcode, balance, expiration date

### 4.2 Store Credit Implementation
- **Customer Table Addition:**
  - Add `credit_balance: number` field
- **Issue Credit:**
  - On refund, offer "Cash" or "Store Credit" option
  - Store credit adds to customer.credit_balance
  - Track credit transactions in new `credit_transactions` table
- **Redeem Credit:**
  - In PaymentModal, show customer credit balance if customer is selected
  - "Use Store Credit" button applies credit_balance to transaction
  - Deduct used amount from customer.credit_balance
- **Credit History:**
  - Customer profile shows credit transaction log
  - Issued date, amount, reason, expiration

### 4.3 Payment Terms & Layaway
- **Layaway System:**
  - New table: `layaway_orders` (similar to sales but status=layaway)
  - Initial deposit required (e.g., 20% of total)
  - Payment schedule with due dates
  - Customer makes installment payments (tracked in `layaway_payments` table)
  - When paid in full, convert to regular sale and release items
  - Item reservation: reduce stock but don't mark as sold
  - Cancellation policy: refund minus restocking fee
- **Installment Plans:**
  - Similar to layaway but customer takes items immediately
  - Payment schedule enforcement
  - Late payment fees configurable
  - Payment reminders via SMS/Email

---

## Phase 5: Multi-Location Support (2-3 weeks)

### 5.1 Location/Branch Management
- **New Table:**
  ```typescript
  locations table:
  - id, name, address, phone, email
  - manager_user_id
  - timezone, currency (for international)
  - is_active, created_at
  ```
- **Location-Aware Data:**
  - Add `location_id` to: products, sales, shifts, stock_movements
  - Default location set in settings
  - Location selector in top navigation bar (dropdown)
- **Centralized Inventory View:**
  - Inventory screen shows stock across all locations
  - Columns: Product, Location A Stock, Location B Stock, Total Stock
  - Filter by location

### 5.2 Stock Transfer System
- **New Tables:**
  ```typescript
  stock_transfers table:
  - id, transfer_number, from_location_id, to_location_id
  - status: 'requested' | 'approved' | 'shipped' | 'received' | 'cancelled'
  - requested_by_user_id, approved_by_user_id
  - requested_date, approved_date, shipped_date, received_date
  - notes
  
  stock_transfer_items table:
  - transfer_id, product_id
  - quantity_requested, quantity_approved, quantity_received
  ```
- **Transfer Workflow:**
  1. Location B creates transfer request for products from Location A
  2. Location A manager approves (can adjust quantities)
  3. Location A marks as shipped (creates negative stock_movement)
  4. Location B receives shipment (creates positive stock_movement)
  5. Discrepancy resolution if quantity_received ≠ quantity_approved
- **UI Screens:**
  - Transfer requests list (inbox for managers)
  - Create transfer request modal
  - Approve/reject transfer modal
  - Receiving interface with barcode scanning

### 5.3 Consolidated Reporting
- **Multi-Location Dashboard:**
  - KPI cards for each location (today's sales, active orders)
  - Combined total row
  - Location comparison charts (sales by location bar chart)
- **P&L by Location:**
  - Revenue, COGS, gross profit per location
  - Consolidate to company-wide P&L
  - Export to Excel with separate sheets per location
- **Location-Specific Pricing:**
  - Add `location_pricing` table for price overrides
  - If location pricing exists, use it; else use default product.sale_price

---

## Phase 6: Employee Management & RBAC (2 weeks)

### 6.1 User Authentication System
- **New Tables:**
  ```typescript
  users table:
  - id, username, email, password_hash (bcrypt)
  - full_name, employee_id, location_id
  - role_id, is_active, created_at, last_login
  - pin_code (4-6 digit for quick POS login)
  
  roles table:
  - id, name ('admin', 'manager', 'cashier', 'stock_clerk')
  - description, permissions (JSON array of permission keys)
  
  permissions table:
  - id, key (e.g., 'pos.sell', 'inventory.edit', 'reports.view')
  - name, description, category
  ```
- **Login Screen:**
  - Username/password or PIN code entry
  - "Remember me" for auto-login
  - Password reset flow via email
- **Session Management:**
  - Store active user in Zustand store
  - JWT token for API authentication
  - Automatic logout after 30 minutes of inactivity
  - Activity tracking for session extension

### 6.2 Role-Based Access Control
- **Predefined Roles:**
  - **Admin:** Full access to everything
  - **Manager:** All except system settings, can approve refunds/discounts
  - **Cashier:** POS, customer lookup, basic reports (can't edit prices)
  - **Stock Clerk:** Inventory management, receiving, no sales access
- **Permission Matrix Examples:**
  ```
  pos.sell, pos.refund, pos.void, pos.discount
  inventory.view, inventory.edit, inventory.delete
  reports.view, reports.export
  settings.general, settings.users, settings.system
  customers.view, customers.edit, customers.delete
  ```
- **UI Enforcement:**
  - Hide/disable features based on permissions
  - Permission check wrapper component: `<RequirePermission permission="pos.refund">`
  - Unauthorized access shows error toast

### 6.3 Employee Features
- **Time Clock:**
  - Punch in/out on POS screen (button in header when logged in)
  - Automatic calculation of hours worked
  - Break tracking (paid/unpaid)
  - Overtime calculation (hours > 8 per day)
  - Export timesheet to Excel for payroll
- **Commission Tracking:**
  - Set commission rate per employee (fixed % or tiered)
  - Calculate commission on each sale (tracked in sales.cashier_id)
  - Commission report: total sales, commission owed, paid status
  - Payment tracking (mark commission as paid)
- **Performance Dashboard:**
  - Sales metrics per employee
  - Average transaction value, items per sale, conversion rate
  - Leaderboard (top performers)
  - Goal setting and progress tracking
- **Shift Schedules:**
  - Weekly calendar view with drag-and-drop scheduling
  - Assign employees to shifts
  - Shift swap requests (pending manager approval)
  - Availability management (employees set their available hours)

---

## Phase 7: Receipt & Document Enhancements (1 week)

### 7.1 Custom Receipt Designer
- **Visual Template Builder:**
  - Drag-and-drop interface with components:
    - Text blocks (header, footer, thank you message)
    - Logo image (upload and position)
    - Dynamic fields (date, receipt #, items, totals, barcode)
    - Dividers, spacers
  - Live preview panel
  - Save multiple templates (default, gift, wholesale)
- **Template Settings:**
  - Paper width (58mm, 80mm)
  - Font size and style
  - Alignment (left, center, right)
  - Conditional sections (show promotion message if promo applied)
- **Multi-Language Support:**
  - Select template per language
  - Auto-switch based on customer preference or POS language setting

### 7.2 Digital Receipts
- **QR Code Generation:**
  - Generate unique URL for each receipt: `https://receipts.pulse.app/view/[receipt_id]`
  - QR code printed at bottom of receipt
  - Receipt viewer web page (public, no login required)
- **Email Receipts:**
  - Checkbox in PaymentModal: "Email receipt?"
  - Require customer email if not on file
  - HTML email template with branding
  - Include itemized list, totals, return policy
  - Attach PDF version
- **SMS Receipts:**
  - Send short receipt summary via SMS with link to full receipt
  - Integrate Twilio or similar SMS API
  - Character limit optimization
- **Receipt Portal:**
  - Customer-facing web app to view all receipts
  - Login with phone number + OTP
  - Search receipts by date, store, amount
  - Reprint or download PDF

### 7.3 Document Generation
- **Invoice Templates:**
  - Professional invoice layout for B2B sales
  - Include business details, tax ID, payment terms
  - Line items with descriptions, quantities, prices
  - Subtotal, tax breakdown, total due
  - Payment instructions and due date
- **Product Label Printing:**
  - Connect to Dymo or Zebra label printer
  - Print barcode labels for inventory (product barcode + name + price)
  - Print shelf tags (larger format with product info)
  - Batch print labels for multiple products
- **Daily Z-Report (Fiscal):**
  - End-of-shift report summarizing all transactions
  - Total sales by payment method
  - Refunds and voids
  - Cash drawer reconciliation
  - VAT breakdown
  - Store in database for audit trail
  - Print and require manager signature

---

## Phase 8: Returns & Exchanges (1 week)

### 8.1 Return Management System
- **Returns Table:**
  ```typescript
  returns table:
  - id, return_number, original_sale_id
  - return_date, reason, notes
  - status: 'pending' | 'approved' | 'rejected' | 'completed'
  - approved_by_user_id, refund_method
  - subtotal, restocking_fee, refund_amount
  
  return_items table:
  - return_id, sale_item_id, quantity, reason
  ```
- **Return Authorization Workflow:**
  1. Cashier scans receipt or looks up sale by receipt number
  2. Select items to return + quantities
  3. Choose return reason (dropdown): Defective, Wrong Item, Changed Mind, Duplicate, Other
  4. System checks return window (e.g., 30 days from purchase)
  5. If over limit (e.g., >100 BGN), require manager approval
  6. Manager reviews, approves/rejects with notes
  7. If approved, process refund (original payment method or store credit)
  8. Restock items (add back to inventory with stock_movement reason: 'return')
- **Restocking Fee:**
  - Configurable % or fixed amount
  - Applied to "Changed Mind" returns only
  - Display clearly before finalizing return
- **Warranty Tracking:**
  - Add `warranty_months` to products
  - Check if return is within warranty period
  - Different return policies for warranty vs non-warranty

### 8.2 Exchange Mode
- **Exchange Workflow:**
  1. Start return process for original items
  2. Instead of refund, enter "Exchange Mode"
  3. Add new items to cart (same or different products)
  4. Calculate price difference:
     - If new items cost more, customer pays difference
     - If new items cost less, refund difference or issue store credit
  5. Complete exchange transaction (linked to original sale)
  6. Print exchange receipt showing original items, new items, difference
- **No Transaction Split:**
  - Exchange is single atomic operation
  - Not 2 separate transactions (return + new sale)
  - Simplifies reporting and inventory tracking

---

## Phase 9: Distributor/Wholesale Features (3 weeks)

### 9.1 Wholesale Customer Management
- **Schema from Previous Design:**
  - `wholesale_customers` table (as designed earlier)
  - `price_tiers` table for product-specific wholesale pricing
- **Customer Profile:**
  - Extended fields: business_name, tax_id, territory, credit_limit
  - Payment terms (Cash, Net 15/30/60/90)
  - Assigned sales rep
  - Visit frequency preferences
- **Tiered Pricing:**
  - Product pricing by tier: Retail (full price), Wholesale (-20%), VIP (-30%)
  - Volume discounts: Buy 100+ units, get additional 5% off
  - Customer-specific contracts with custom pricing
- **Credit Management:**
  - Set credit limit per customer
  - Track outstanding invoices
  - Auto-block orders if over credit limit
  - Payment due alerts and reminders

### 9.2 Sales Rep Module
- **Sales Rep Profiles:**
  - `sales_reps` table with territory assignments
  - Commission rate (% of sales)
  - Performance targets (monthly/quarterly quotas)
- **Route Planning:**
  - Map view showing customer locations (using lat/lng)
  - Optimize route using TSP algorithm (Google Maps API or open-source)
  - Assign customers to daily routes
  - GPS tracking for rep location during visits
- **Visit Logging:**
  - Mobile app feature: Check-in at customer location
  - GPS verification (must be within 50m of customer address)
  - Visit notes and action items
  - Order creation during visit
  - Photo capture (shelf conditions, displays)
  - Check-out time tracking
- **Performance Dashboard:**
  - Sales by rep (leaderboard)
  - Conversion rate (visits → orders)
  - Average order value per rep
  - Territory coverage (% of customers visited this month)

### 9.3 Wholesale Order System
- **Order Entry:**
  - Similar to POS but optimized for bulk quantities
  - Apply wholesale pricing automatically based on customer tier
  - Volume discount calculation
  - Minimum order quantity enforcement
  - Backorder handling (allocate available stock, backorder rest)
- **Order Approval Workflow:**
  - Orders >10,000 BGN require manager approval
  - Credit check (ensure customer has available credit)
  - Inventory allocation (reserve stock for approved orders)
  - Status: Pending → Approved → Packed → Shipped → Delivered
- **Order Fulfillment:**
  - Packing interface: Scan items to confirm pick
  - Packing slip printout
  - Shipping label generation
  - Delivery scheduling and assignment to driver
- **Proof of Delivery:**
  - Mobile app feature for drivers
  - Signature capture on tablet/phone
  - Photo of delivered goods
  - Timestamp and GPS location
  - Automatic status update to "Delivered"

### 9.4 Customer Portal (Mobile App for Retailers)
- **Retailer Mobile App Features:**
  - Login with customer credentials
  - View wholesale product catalog with pricing
  - Add products to cart and place orders
  - View order history and status tracking
  - View account balance and outstanding invoices
  - Make payments (integrate payment gateway)
  - Reorder from previous orders (one-click)
  - Push notifications for order updates
  - Chat with assigned sales rep
- **Admin Dashboard for Distributor:**
  - View all customer orders
  - Approve/reject orders
  - View rep performance
  - Manage territories and routes

---

## Phase 10: Tax & Compliance (1-2 weeks)

### 10.1 Tax Management
- **Multiple Tax Rates:**
  - Add `tax_rate` field to products (% VAT)
  - Support different rates: Standard 20%, Reduced 9%, Zero 0%, Exempt
  - Tax jurisdiction support (different rates per location/state)
  - Tax-inclusive vs tax-exclusive pricing toggle
- **Tax Calculation:**
  - Calculate tax per line item based on product tax rate
  - Tax breakdown on receipt (show subtotal, VAT amount, total)
  - Support for composite taxes (State + County + City)
- **Tax Reports:**
  - VAT report by period (total sales, VAT collected, VAT payable)
  - Export for tax authority submission (XML or CSV format)
  - Tax exemption certificates (store per customer)
  - Tax audit trail (all transactions with tax details)

### 10.2 Fiscal Printer Integration (Bulgaria)
- **Fiscal Device Support:**
  - Integrate with Bulgarian fiscal printers (Daisy, Tremol, Datecs)
  - ESC/POS fiscal commands (different from regular receipt printing)
  - Mandatory features:
    - Daily fiscal memory
    - Z-report at end of day
    - Unique fiscal receipt numbers
    - Cannot delete or modify fiscal receipts
- **Fiscal Receipt Format:**
  - Includes fiscal memory number, device serial number
  - QR code with fiscal verification data
  - Compliance with Bulgarian NRA requirements
- **Z-Report Generation:**
  - End-of-shift mandatory report
  - Totals by payment method, VAT amounts
  - Fiscal memory writeout
  - Cannot perform sales after Z-report until next shift opens
  - Store Z-report in database for audit

### 10.3 Age Verification
- **Age-Restricted Products:**
  - Flag products as age-restricted (cigarettes, alcohol)
  - Set minimum age (16, 18, 21)
- **POS Verification:**
  - When age-restricted item scanned, show popup: "Verify customer age"
  - Require button confirmation or manager PIN
  - Log verification in audit trail (product, timestamp, cashier)
- **Audit Log:**
  - Track all age verification events
  - Export for compliance audits
  - Alert if high refusal rate (possible training issue)

---

## Phase 11: Mobile App Development (4-6 weeks)

### 11.1 Rebuild Mobile App from Scratch
- **Database Setup:**
  - Implement expo-sqlite with same schema as desktop (Dexie → SQLite)
  - Write SQL migration scripts matching Dexie versions
  - Create database service layer (CRUD operations)
- **Sync Service:**
  - Port desktop SyncService to mobile
  - Handle background sync (when app is backgrounded)
  - Conflict resolution UI for offline changes
  - Progress indicators for large syncs
- **POS Interface:**
  - Touch-optimized product grid (larger tiles)
  - Barcode scanner using expo-camera
  - Cart management with swipe-to-delete
  - Payment modal with mobile payment options (NFC, QR codes)
- **Offline-First:**
  - All operations work without internet
  - Queue API calls for later sync
  - Visual offline indicator

### 11.2 Mobile-Specific Features
- **Bluetooth Printer:**
  - Integrate react-native-bluetooth-escpos-printer
  - Pair with portable thermal printers
  - Receipt printing over Bluetooth
- **Camera Features:**
  - Photo inventory (capture product photos during stock counts)
  - Barcode scanning with auto-focus
  - Document scanning (invoices, receipts)
- **GPS & Location:**
  - expo-location for GPS tracking
  - Check-in/check-out at customer locations (for sales reps)
  - Route navigation integration (open Google Maps with route)
- **Signature Capture:**
  - react-native-signature-canvas for delivery confirmations
  - Save signature as image
  - Attach to orders/returns

### 11.3 Mobile Parity with Desktop
- **Feature Coverage:**
  - Inventory management (view, search, edit stock)
  - Customer lookup and creation
  - Shift open/close with cash count
  - Basic reports (today's sales, low stock)
  - Settings sync with desktop
- **UI/UX Optimizations:**
  - Bottom navigation instead of sidebar
  - Pull-to-refresh for data updates
  - Swipe gestures for common actions
  - Voice search for products
  - Dark mode that respects system settings

---

## Phase 12: Integrations & API (2-3 weeks)

### 12.1 Public REST API
- **API Framework:**
  - Create Express.js server (or Next.js API routes)
  - JWT authentication with API keys
  - Rate limiting to prevent abuse
  - CORS configuration for web clients
- **Core Endpoints:**
  - Products: GET, POST, PUT, DELETE /api/products
  - Sales: GET, POST /api/sales
  - Customers: GET, POST, PUT /api/customers
  - Inventory: GET /api/inventory, POST /api/inventory/adjust
  - Reports: GET /api/reports/sales, GET /api/reports/inventory
- **Webhook System:**
  - Configure webhook URLs in settings
  - Trigger events: sale.created, product.updated, inventory.low
  - Retry logic for failed webhooks (exponential backoff)
  - Webhook logs and debugging UI
- **API Documentation:**
  - Generate OpenAPI/Swagger specs
  - Interactive API explorer (Swagger UI)
  - Code examples in multiple languages
  - Authentication guide

### 12.2 Accounting Software Integration
- **QuickBooks Online:**
  - OAuth2 authentication flow
  - Sync customers, products, invoices
  - Auto-create invoices from sales
  - Payment recording in QB
  - Expense import (map to COGS)
- **Xero Integration:**
  - Similar to QuickBooks (OAuth2)
  - Bank feed reconciliation
  - Chart of accounts mapping
- **Generic CSV Export:**
  - Configurable column mapping
  - Schedule automatic exports (daily/weekly)
  - FTP/SFTP upload to accounting software import folder

### 12.3 E-commerce Sync
- **Shopify Integration:**
  - Shopify API using REST or GraphQL
  - Bidirectional inventory sync (POS → Shopify, Shopify → POS)
  - Product catalog sync (title, price, images, variants)
  - Order import: Create sale in POS when online order placed
  - Fulfillment update: Mark Shopify order as fulfilled when shipped
- **WooCommerce:**
  - WordPress REST API integration
  - Similar sync features as Shopify
  - Webhook listeners for real-time updates
- **Multi-Channel Inventory:**
  - Central inventory shared across POS, Shopify, WooCommerce
  - Oversell prevention (check available stock before order confirmation)
  - Allocation rules (reserve X units for online, rest for in-store)

### 12.4 Payment Gateway Integration
- **Stripe Terminal:**
  - Stripe Terminal SDK for physical card readers
  - EMV chip and contactless (NFC) support
  - Payment intent creation and confirmation
  - Refund processing
  - Receipt integration (include Stripe receipt ID)
- **PayPal QR Codes:**
  - Generate PayPal QR code for invoice amount
  - Customer scans and pays via PayPal app
  - Webhook confirmation when payment received
- **Apple Pay / Google Pay:**
  - NFC tap-to-pay via Stripe Terminal or similar
  - Mobile app payment flow
- **Payment Reconciliation:**
  - Auto-match bank deposits to POS sales
  - Highlight discrepancies (missing deposits, extra charges)
  - Export reconciliation report

### 12.5 Marketing Integrations
- **Mailchimp:**
  - Sync customer list to Mailchimp audience
  - Segment customers (VIP, inactive, recent purchasers)
  - Trigger campaigns (welcome email, win-back, birthday)
  - Track campaign ROI (sales attributed to email clicks)
- **Twilio SMS:**
  - Send transactional SMS (receipt, order status, appointment reminder)
  - Marketing SMS (promotions, flash sales)
  - Two-way SMS (customer replies routed to inbox)
  - Opt-in/opt-out management
- **Social Media APIs:**
  - Facebook/Instagram post promotion announcements
  - Share product images to Instagram
  - Facebook Pixel integration for remarketing
- **Zapier Webhooks:**
  - Configure Zapier triggers for POS events
  - Connect to 5000+ apps (Google Sheets, Slack, Trello, etc.)
  - Example Zaps:
    - New customer → Add to Google Contacts
    - Large sale → Send Slack notification
    - Low stock → Create Trello card for reorder

---

## Phase 13: Security & Audit (1 week)

### 13.1 Enhanced Security
- **Two-Factor Authentication:**
  - SMS OTP using Twilio
  - Email OTP
  - TOTP apps (Google Authenticator, Authy) using speakeasy library
  - Backup codes for account recovery
  - Enforce 2FA for admin and manager roles
- **PIN Protection:**
  - Require manager PIN for:
    - Refunds/voids
    - Large discounts (>10%)
    - Price overrides
    - Deleting transactions
    - Opening cash drawer without sale
  - PIN entry modal with timeout (3 failed attempts = lockout)
- **Data Encryption:**
  - Encrypt sensitive fields at rest (customer email, phone, credit card tokens)
  - Use AES-256 encryption
  - Key management (store encryption key securely, not in code)
- **Session Security:**
  - Automatic logout after 30 minutes inactivity (configurable)
  - Lock screen with PIN to resume (faster than full re-login)
  - Force logout on all devices (remote session kill)

### 13.2 Audit & Activity Logs
- **Activity Logs Table:**
  ```typescript
  activity_logs table:
  - id, timestamp, user_id, action
  - entity_type (sale, product, customer), entity_id
  - before_value (JSON), after_value (JSON)
  - ip_address, device_info
  ```
- **Logged Actions:**
  - All CRUD operations (create, update, delete)
  - Sensitive operations (refunds, voids, price changes, discounts)
  - Login/logout events
  - Permission changes
  - Settings modifications
- **Audit Log Viewer:**
  - Searchable, filterable table
  - Date range picker
  - Filter by user, action type, entity
  - Export audit log to PDF/CSV
  - Highlight suspicious patterns (e.g., many voids by one cashier)
- **Alerting:**
  - Anomaly detection (sales spike/drop, unusual refund rate)
  - Email/SMS alerts for critical events (large void, inventory adjusted to 0)
  - Dashboard widget showing recent alerts

---

## Additional Considerations

### Kitchen Display System (KDS) - For Restaurants
- **Order Routing:**
  - Send orders to kitchen display screen (separate app or web view on tablet)
  - Group items by preparation area (grill, fryer, salad station)
  - Color-coded urgency (red=late, yellow=approaching due time, green=on time)
- **Preparation Tracking:**
  - Kitchen staff tap items to mark as "Preparing"
  - Tap again to mark as "Ready"
  - Notification to front-of-house when order complete
- **Order Modifications:**
  - Special instructions per item (no onions, extra cheese)
  - Substitutions and additions
  - Allergies highlighted in red
- **Table Management:**
  - Assign orders to table numbers
  - Table status (occupied, available, needs cleaning)
  - Merge/split bills
- **Course Management:**
  - Hold appetizers vs fire mains
  - Timing coordination between courses

### Self-Checkout Kiosk Mode
- **Simplified UI:**
  - Large product tiles with images
  - Minimal text, icon-based navigation
  - High-contrast, accessible design
- **Customer Flow:**
  - Start transaction → Scan items → Review cart → Pay → Print receipt
  - Help button to call staff
  - Age-restricted items lock and require staff override
- **Payment Integration:**
  - Card reader (chip, contactless, swipe)
  - Cash acceptor (bill and coin)
  - Mobile wallet (QR code)
- **Security:**
  - Scale integration to detect unscanned items (weight verification)
  - Video monitoring
  - Intervention alerts to staff

### Queue Management System
- **Digital Queue:**
  - Customer takes ticket (printed or digital via QR code)
  - Display current serving number on TV screen
  - Estimated wait time calculation
- **Staff Dashboard:**
  - Call next customer button
  - Recall customer if missed
  - Pause/resume queue
  - Multiple counters with separate queues
- **Notifications:**
  - SMS notification when customer's turn is approaching
  - In-app notification (if customer has mobile app)

### Advanced Barcode Features
- **Label Printer Integration:**
  - Dymo, Zebra, Brother label printers
  - Print shelf labels with barcode, product name, price
  - Batch print labels for selected products
  - QR code labels for inventory tracking
- **Barcode Format Support:**
  - Code 128, Code 39, EAN-8, EAN-13, UPC-A, UPC-E
  - QR codes (for URLs, product info, serial numbers)
  - Data Matrix (for small items)
- **Batch Barcode Generation:**
  - Generate barcodes for products without them
  - Auto-assign from range (e.g., 2000001-2000999)
  - Check-digit calculation (EAN-13, UPC-A)
- **Product Lookup by Image:**
  - Camera-based visual search
  - Machine learning model to identify products
  - Fallback to barcode if image search fails

### Voice Commands
- **Speech Recognition:**
  - Web Speech API or AssemblyAI
  - Voice commands: "Add Coca Cola", "Remove last item", "Apply 10% discount"
  - Multi-language support
- **Voice Feedback:**
  - Text-to-speech confirmation (e.g., "Added Coca Cola to cart")
  - Audio alerts (low stock, price check needed)

---

## Implementation Recommendations

### Testing Strategy
- **Unit Tests:**
  - Vitest for services, utilities, stores
  - Test pure functions (calculations, validators)
  - Mock Dexie for database tests
- **Integration Tests:**
  - Test POS workflows (add item → checkout → payment)
  - Test sync scenarios (offline → online)
- **E2E Tests:**
  - Playwright for full user journeys
  - Test critical paths (complete sale, process refund)
  - Run on CI/CD pipeline

### Development Workflow
- **Feature Branches:**
  - One branch per phase (e.g., `feat/analytics-dashboard`)
  - Pull request reviews before merge to main
  - Keep main branch always deployable
- **Version Control:**
  - Semantic versioning (v1.0.0, v1.1.0, v2.0.0)
  - Changelog generation from commit messages
  - Tag releases in Git
- **CI/CD Pipeline:**
  - GitHub Actions or GitLab CI
  - Automated testing on pull requests
  - Automated builds for desktop (Electron) and mobile (Expo)
  - Deploy to staging environment for QA

### Documentation
- **Developer Documentation:**
  - Architecture overview (diagrams of data flow, components)
  - Database schema documentation (ERD diagrams)
  - API documentation (OpenAPI/Swagger)
  - Setup guides for local development
- **User Documentation:**
  - User manual with screenshots
  - Video tutorials for common tasks
  - FAQ section
  - In-app help tooltips
- **Admin Documentation:**
  - Deployment guide
  - Backup and recovery procedures
  - Troubleshooting common issues

---

## Priority Recommendations

Based on business impact and implementation complexity, here's the suggested order:

### High Priority (Implement First):
1. **Analytics Dashboard** - Immediate business insights, no schema changes
2. **Enhanced CRM & Loyalty** - Increase customer retention and lifetime value
3. **Employee Management & RBAC** - Essential for multi-user environments
4. **Advanced Inventory & Suppliers** - Operational efficiency gains

### Medium Priority (Implement Next):
5. **Multi-Location Support** - For businesses planning to expand
6. **Payment & Financial Features** - Improve cash flow management
7. **Distributor/Wholesale** - If B2B is part of business model
8. **Receipt & Document Enhancements** - Professional presentation

### Lower Priority (Nice-to-Have):
9. **Tax & Compliance** - Required for specific markets (Bulgaria fiscal printers)
10. **Mobile App Development** - Only if mobile POS is critical to operations
11. **Integrations & API** - When ready to connect with external systems
12. **Returns & Exchanges** - If return volume justifies dedicated system

### Optional (Niche Use Cases):
13. **Kitchen Display System** - Restaurants only
14. **Self-Checkout Kiosk** - Large retail stores only
15. **Queue Management** - High-traffic locations only
16. **Security & Audit** - Enterprises with compliance requirements

---

## Success Metrics

Track these KPIs to measure success of new features:

- **Analytics Dashboard:** Adoption rate (% of daily users accessing reports)
- **CRM & Loyalty:** Customer retention rate, repeat purchase rate, average customer lifetime value
- **Inventory:** Stock-out frequency reduction, inventory turnover improvement
- **Employee Management:** Time to complete tasks, error rate reduction
- **Multi-Location:** Cross-location transfer frequency, inventory optimization
- **Payment Features:** Gift card sales volume, store credit redemption rate
- **Integrations:** API usage growth, sync success rate
- **Mobile App:** Daily active users, offline transaction volume

---

**Next Steps:**
1. Review and prioritize phases with stakeholders
2. Estimate resources and timeline for Phase 1
3. Set up development environment and testing framework
4. Create detailed user stories and acceptance criteria for first feature set
5. Begin implementation of Analytics Dashboard (Phase 1)
