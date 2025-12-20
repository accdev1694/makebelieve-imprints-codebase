# Epic 6: Financial Management & Accounting

## Description

Comprehensive financial management system with automated invoicing, payment processing, expense tracking, inventory management, and accounting dashboard with reporting capabilities.

## Features

### Automated Invoicing
- Auto-generate invoices when orders are confirmed
- VAT calculations (20% UK standard rate, configurable)
- Multi-currency support (GBP base with conversion)
- Unique invoice numbering (INV-2025-0001)
- PDF generation and storage
- Invoice status tracking (DRAFT → ISSUED → PAID → OVERDUE)

### Payment Processing
- Stripe integration for card payments
- PayPal integration
- Direct card payment support
- Full payment only (no deposits/partial payments)
- Transaction tracking and audit trail
- Refund capability
- Payment gateway response storage

### Expense & Procurement Tracking
- Business expense categorization:
  - Materials (paper, ink, etc.)
  - Packaging supplies
  - Shipping supplies
  - Equipment
  - Software subscriptions
  - Utilities
  - Marketing
  - Other
- Supplier database with ratings
- Google search integration for procurement:
  - Text-based product search
  - Image-based product search
  - Price comparison across suppliers
  - Best price tracking
- Receipt upload and storage
- Expense numbering (EXP-2025-0001)
- Multi-currency expense tracking

### Inventory Management
- Material stock tracking (paper, ink, packaging, equipment)
- Automatic inventory updates:
  - Additions when materials purchased
  - Deductions when orders fulfilled
- Stock level monitoring
- Reorder point alerts
- Reorder quantity suggestions
- Unit cost tracking for profit margins
- SKU/barcode support
- Material usage reporting

### Accounting Dashboard
- Real-time financial overview
- Revenue tracking (from orders)
- Expense tracking (from procurements)
- Profit/loss calculations
- Charts and visualizations:
  - Revenue vs Expenses over time
  - Expense breakdown by category
  - Profit margins
  - Best-selling products/sizes
  - Material usage trends
- VAT collected tracking
- Quick financial health indicators

### Financial Reporting
- Daily reports (automated)
- Weekly reports (automated)
- Monthly reports (automated)
- Yearly summaries
- Customizable date ranges
- Report includes:
  - Total revenue
  - Total expenses
  - Net profit
  - VAT collected
  - Order count
  - Expense breakdown
  - Top expenses
  - Inventory valuation
- PDF export capability
- Report caching for performance

### Google Search Integration
- Procurement search functionality:
  - Search by text description
  - Search by uploading product image
  - Compare prices from multiple suppliers
  - View product specifications
  - Save search results to expense metadata
  - Track price changes over time
- Supplier discovery and rating
- Best deal recommendations

## User Stories

### Admin (Printer)

1. **As a printer, I want invoices to be automatically generated when I confirm an order**, so I don't have to manually create them.

2. **As a printer, I want to accept payments via Stripe, PayPal, and direct card payments**, so customers have multiple payment options.

3. **As a printer, I want to search for materials using Google (text and image search)**, so I can find the best prices from different suppliers.

4. **As a printer, I want to track all my business expenses by category**, so I know where my money is going.

5. **As a printer, I want automatic inventory updates when I buy materials or fulfill orders**, so my stock levels are always accurate.

6. **As a printer, I want alerts when materials are running low**, so I can reorder before running out of stock.

7. **As a printer, I want to see a financial dashboard showing revenue, expenses, and profit**, so I understand my business performance at a glance.

8. **As a printer, I want to generate monthly financial reports**, so I can file my taxes and track profitability over time.

9. **As a printer, I want to compare supplier prices before purchasing**, so I always get the best deal on materials.

10. **As a printer, I want to track VAT collected on all invoices**, so I can easily calculate what I owe HMRC.

### Customer

1. **As a customer, I want to receive a professional invoice when I place an order**, so I have a record of my purchase.

2. **As a customer, I want to pay securely using Stripe or PayPal**, so my payment information is protected.

3. **As a customer, I want to see the VAT breakdown on my invoice**, so I understand what I'm paying.

## Technical Implementation

### Database Models
- `Invoice` - Auto-generated invoices with VAT
- `Payment` - Payment records with gateway integration
- `Expense` - Business expenses with categories
- `Supplier` - Supplier database for comparison
- `Inventory` - Stock tracking
- `InventoryAddition` - Purchase logs
- `InventoryUsage` - Usage logs
- `FinancialReport` - Cached reports

### API Endpoints

**Invoices:**
- `POST /api/invoices` - Create invoice (auto-triggered)
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices` - List all invoices (with filters)
- `PUT /api/invoices/:id/status` - Update invoice status
- `GET /api/invoices/:id/pdf` - Download invoice PDF

**Payments:**
- `POST /api/payments/stripe` - Process Stripe payment
- `POST /api/payments/paypal` - Process PayPal payment
- `POST /api/payments/:id/refund` - Refund payment
- `GET /api/payments/:id` - Get payment details

**Expenses:**
- `POST /api/expenses` - Create expense
- `GET /api/expenses` - List expenses (with filters)
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/search` - Google search for products

**Suppliers:**
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers` - List suppliers
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

**Inventory:**
- `GET /api/inventory` - List all inventory items
- `GET /api/inventory/:id` - Get inventory item
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `GET /api/inventory/low-stock` - Get items below reorder point
- `POST /api/inventory/:id/add` - Add stock (from purchase)
- `POST /api/inventory/:id/use` - Use stock (from order)

**Reports:**
- `GET /api/reports/dashboard` - Get dashboard summary
- `GET /api/reports/daily` - Get daily report
- `GET /api/reports/weekly` - Get weekly report
- `GET /api/reports/monthly` - Get monthly report
- `GET /api/reports/custom?start=&end=` - Custom date range
- `GET /api/reports/:id/pdf` - Download report PDF

### Services

**InvoiceService:**
- `generateInvoice(orderId)` - Auto-create invoice on order confirmation
- `calculateVAT(subtotal, rate)` - Calculate VAT amount
- `generatePDF(invoiceId)` - Generate invoice PDF
- `updateStatus(invoiceId, status)` - Update invoice status

**PaymentService:**
- `processStripePayment(orderId, paymentMethodId)` - Process Stripe payment
- `processPayPalPayment(orderId, token)` - Process PayPal payment
- `handleWebhook(gateway, payload)` - Handle payment gateway webhooks
- `refundPayment(paymentId)` - Process refund

**ExpenseService:**
- `createExpense(data)` - Create expense record
- `linkToInventory(expenseId, inventoryId)` - Link expense to inventory addition
- `searchProducts(query, type)` - Google search integration
- `comparePrices(productQuery)` - Compare prices across suppliers

**InventoryService:**
- `addStock(inventoryId, quantity, expenseId)` - Add stock from purchase
- `useStock(inventoryId, quantity, orderId)` - Deduct stock for order
- `checkReorderAlerts()` - Get items below reorder point
- `calculateStockValue()` - Calculate total inventory value

**ReportService:**
- `generateDailyReport(date)` - Generate daily report
- `generateWeeklyReport(weekStart)` - Generate weekly report
- `generateMonthlyReport(month, year)` - Generate monthly report
- `getDashboardSummary()` - Get real-time dashboard data
- `exportToPDF(reportId)` - Export report to PDF

**GoogleSearchService:**
- `searchByText(query)` - Search products by text
- `searchByImage(imageUrl)` - Search products by image
- `compareSuppliers(results)` - Compare prices from search results

### Frontend Components

**Dashboard:**
- `FinancialDashboard` - Main accounting dashboard
- `RevenueChart` - Revenue over time graph
- `ExpenseChart` - Expense breakdown pie chart
- `ProfitChart` - Profit trend line
- `QuickStats` - Key metrics cards
- `RecentTransactions` - Latest invoices/payments/expenses

**Invoices:**
- `InvoiceList` - List of all invoices
- `InvoiceDetail` - Invoice view/download
- `InvoiceStatus` - Status badges

**Payments:**
- `StripeCheckout` - Stripe payment form
- `PayPalButton` - PayPal payment button
- `PaymentHistory` - Payment transaction list

**Expenses:**
- `ExpenseForm` - Create/edit expense
- `ExpenseList` - List of expenses with filters
- `ProductSearch` - Google search interface
- `PriceComparison` - Side-by-side supplier comparison
- `SupplierRating` - Rate and review suppliers

**Inventory:**
- `InventoryList` - Stock levels table
- `InventoryAlerts` - Low stock warnings
- `StockAdjustment` - Add/use stock form
- `InventoryValue` - Total stock valuation

**Reports:**
- `ReportGenerator` - Select period and generate
- `ReportViewer` - View report with charts
- `ReportExport` - Download PDF button

## Dependencies

### Backend
- Stripe SDK (`stripe`)
- PayPal SDK (`@paypal/checkout-server-sdk`)
- PDF generation (`pdfkit` or `puppeteer`)
- Google Custom Search API
- Google Vision API (for image search)
- Chart generation for PDFs (`chart.js` or similar)

### Frontend
- Payment UI components (Stripe Elements, PayPal Buttons)
- Chart library (`recharts` or `chart.js`)
- Date range picker for reports
- File upload for receipts/images

## Success Metrics

- 100% of confirmed orders generate invoices automatically
- 95%+ payment success rate
- Average time to record expense: <2 minutes
- Stock-out incidents: 0 (via reorder alerts)
- Monthly report generation: <5 seconds
- Supplier price savings: Track and report
- VAT calculation accuracy: 100%

## Priority

**High** - Financial management is critical for business viability and tax compliance.

## Dependencies on Other Epics

- Epic 4 (Material Management) - Inventory system integrates with expense tracking
- Epic 5 (Order Fulfillment) - Invoices and payments are created when orders are placed/confirmed

## Timeline

- Week 1-2: Invoice and payment processing
- Week 3-4: Expense tracking and Google search integration
- Week 5-6: Inventory management integration
- Week 7-8: Reporting and dashboard
- Week 9-10: Testing, refinement, PDF generation
