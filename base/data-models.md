# Data Models

## Core Entities and Relationships

```sql
-- Users (Customers and a single admin/printer)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'admin')),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile JSONB, -- Flexible for additional customer data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(type);

-- Refresh tokens for JWT authentication
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for refresh tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Designs (User-uploaded or template-assisted)
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  file_url VARCHAR(500), -- S3/Object Storage URL
  metadata JSONB, -- Personalization or template metadata, tags
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for designs
CREATE INDEX idx_designs_user_id ON designs(user_id);
CREATE INDEX idx_designs_created_at ON designs(created_at DESC);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  design_id UUID REFERENCES designs(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled')),
  total_price DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  royalmail_order_id VARCHAR(255),
  tracking_number VARCHAR(255),
  carrier VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_tracking_number ON orders(tracking_number);

-- Reviews (For orders)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE REFERENCES orders(id), -- One review per order
  reviewer_id UUID REFERENCES users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for reviews
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id), -- One preference set per user
  preferences JSONB, -- Colors, hobbies, etc. for template selection and previews
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for user preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## Prisma Schema Equivalent

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  type          String   @db.VarChar(20)
  email         String   @unique @db.VarChar(255)
  passwordHash  String   @map("password_hash") @db.VarChar(255)
  name          String   @db.VarChar(255)
  profile       Json?    @db.JsonB
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at")

  designs         Design[]
  orders          Order[]
  reviews         Review[]
  refreshTokens   RefreshToken[]
  preferences     UserPreference?

  @@index([email])
  @@index([type])
  @@map("users")
}

model RefreshToken {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  tokenHash   String   @map("token_hash") @db.VarChar(255)
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model Design {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  title     String?  @db.VarChar(255)
  fileUrl   String   @map("file_url") @db.VarChar(500)
  metadata  Json?    @db.JsonB
  createdAt DateTime @default(now()) @map("created_at")

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders Order[]

  @@index([userId])
  @@index([createdAt(sort: Desc)])
  @@map("designs")
}

model Order {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerId       String   @map("customer_id") @db.Uuid
  designId         String   @map("design_id") @db.Uuid
  status           String   @default("pending") @db.VarChar(20)
  totalPrice       Decimal  @map("total_price") @db.Decimal(10, 2)
  shippingAddress  Json     @map("shipping_address") @db.JsonB
  royalmailOrderId String?  @map("royalmail_order_id") @db.VarChar(255)
  trackingNumber   String?  @map("tracking_number") @db.VarChar(255)
  carrier          String?  @db.VarChar(50)
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @default(now()) @updatedAt @map("updated_at")

  customer User    @relation(fields: [customerId], references: [id])
  design   Design  @relation(fields: [designId], references: [id])
  review   Review?

  @@index([customerId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([trackingNumber])
  @@map("orders")
}

model Review {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId    String   @unique @map("order_id") @db.Uuid
  reviewerId String   @map("reviewer_id") @db.Uuid
  rating     Int
  comment    String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  order    Order @relation(fields: [orderId], references: [id])
  reviewer User  @relation(fields: [reviewerId], references: [id])

  @@index([orderId])
  @@index([rating])
  @@index([createdAt(sort: Desc)])
  @@map("reviews")
}

model UserPreference {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @unique @map("user_id") @db.Uuid
  preferences Json?    @db.JsonB
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("user_preferences")
}
```

## Special Considerations

### Authentication
- **JWT Strategy:** No session storage in database. JWTs are stateless.
- **Refresh Tokens:** Stored in `refresh_tokens` table for long-lived sessions with revocation capability
- **Token Rotation:** When refreshing access tokens, optionally rotate refresh tokens for security

### Data Integrity
- **UUIDs:** Prevent ID conflicts and enumeration attacks
- **Cascading Deletes:** User deletion cascades to designs, orders, and refresh tokens
- **Check Constraints:** Validate enum values (user type, order status, rating range) at database level
- **NOT NULL:** Critical fields like email, password_hash, total_price are required

### Performance Optimizations
- **Indexes:** Added on all foreign keys and frequently queried columns (email, status, created_at)
- **Descending Indexes:** created_at uses DESC for efficient "recent items first" queries
- **JSONB vs JSON:** Use JSONB for flexible data with indexing capability (GIN indexes can be added if needed)

### JSONB Usage Guidelines
- **Good uses:**
  - `shipping_address`: Flexible address formats (domestic vs international)
  - `user.profile`: Optional fields like phone, avatar, bio
  - `user_preferences.preferences`: Template customization data
  - `design.metadata`: Tags, dimensions, color palette
- **Avoid:**
  - Storing relational data (use proper foreign keys instead)
  - Frequently filtered data (use indexed columns instead)
  - Large binary data (use object storage URLs instead)

### Scalability
- **Partitioning:** Consider partitioning `orders` table by created_at if volume exceeds 1M+ rows
- **Archival:** Move completed orders older than 2 years to archive table
- **JSONB Indexing:** Add GIN indexes on JSONB columns if querying nested keys becomes slow:
  ```sql
  CREATE INDEX idx_orders_shipping_country ON orders USING GIN ((shipping_address->'country'));
  ```

### Migration Strategy
1. Use Prisma Migrate for schema changes: `prisma migrate dev`
2. Test migrations on staging database first
3. For zero-downtime deployments, use expand-contract pattern:
   - Add new column (nullable)
   - Deploy code that writes to both old and new
   - Backfill data
   - Deploy code that reads from new
   - Remove old column

### Backup and Recovery
- **Automated Backups:** IONOS Managed PostgreSQL handles daily backups
- **Point-in-Time Recovery:** Enable WAL archiving for critical data
- **Test Restores:** Quarterly restore tests to staging environment

---

## Financial Management System

### Overview
Comprehensive financial management with automated invoicing, payment processing, expense tracking, inventory management, and reporting.

### Financial Models

#### Invoice
Automated invoice generation with VAT calculations and multi-currency support.

**Fields:**
- `invoiceNumber` - Unique identifier (INV-2025-0001)
- `orderId` - Links to order (one-to-one)
- `subtotal`, `vatRate`, `vatAmount`, `total` - Pricing breakdown
- `currency`, `exchangeRate` - Multi-currency support (default GBP)
- `issueDate`, `dueDate` - Timeline tracking
- `status` - DRAFT, ISSUED, PAID, OVERDUE, CANCELLED
- `pdfUrl` - Generated invoice PDF storage

**Behavior:**
- Auto-created when order status → "confirmed"
- VAT rate defaults to 20% (UK standard, configurable)
- Status updates: DRAFT → ISSUED (on confirmation) → PAID (on payment)

#### Payment
Payment processing with Stripe, PayPal, and card integration.

**Fields:**
- `orderId` - Links to order (one-to-one)
- `amount`, `currency` - Payment details
- `paymentMethod` - STRIPE, PAYPAL, CARD, BANK_TRANSFER, CASH
- `status` - PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED
- `stripePaymentId`, `paypalTransactionId` - Gateway transaction IDs
- `gatewayResponse` - Full gateway response (JSONB)
- `paidAt`, `refundedAt` - Timestamp tracking

**Behavior:**
- Full payment only (no partial payments/deposits)
- Gateway responses stored for audit trail
- Refund tracking capability

#### Expense
Business expense tracking with supplier management and procurement search.

**Fields:**
- `expenseNumber` - Unique identifier (EXP-2025-0001)
- `category` - MATERIALS, PACKAGING, SHIPPING_SUPPLIES, EQUIPMENT, SOFTWARE, UTILITIES, MARKETING, OTHER
- `description`, `amount`, `currency` - Expense details
- `supplierId` - Links to supplier
- `receiptUrl` - Receipt/invoice upload
- `searchMetadata` - Google search results, price comparison data (JSONB)
- `purchaseDate` - When expense occurred

**Use Cases:**
- Procurement via Google search (text and image search)
- Price comparison across suppliers
- Material purchases linked to inventory additions

#### Supplier
Supplier database with rating system for price comparison.

**Fields:**
- `name` - Supplier name
- `contactInfo` - Email, phone, address (JSONB)
- `website` - Supplier website
- `rating` - Rating out of 5.00 for comparison
- `notes` - Internal notes

**Behavior:**
- Tracks supplier performance
- Enables price comparison
- Links to expenses

#### Inventory
Material stock tracking with automatic updates.

**Fields:**
- `itemName`, `category`, `description` - Item details
- `currentStock`, `unit` - Stock level (e.g., 500 sheets)
- `reorderPoint`, `reorderQuantity` - Auto-reorder alerts
- `unitCost`, `currency` - Cost tracking for margins
- `sku` - Optional SKU/barcode
- `metadata` - Additional data (JSONB)

**Relationships:**
- `additions` - Inventory additions (from purchases)
- `usages` - Inventory usages (from orders)

**Behavior:**
- Auto-updated on expense creation (additions)
- Auto-updated on order fulfillment (usages)
- Alerts when stock < reorderPoint

#### InventoryAddition
Logs when inventory is added (purchases).

**Fields:**
- `inventoryId`, `expenseId` - Links to inventory and expense
- `quantity`, `unitCost` - Addition details
- `addedAt` - Timestamp

**Behavior:**
- Created when materials purchased
- Updates `inventory.currentStock` automatically

#### InventoryUsage
Logs when inventory is used (orders).

**Fields:**
- `inventoryId`, `orderId` - Links to inventory and order
- `quantity` - Amount used
- `usedAt` - Timestamp

**Behavior:**
- Created when order is printed
- Deducts from `inventory.currentStock` automatically

#### FinancialReport
Cached financial reports for performance.

**Fields:**
- `period` - DAILY, WEEKLY, MONTHLY, YEARLY
- `startDate`, `endDate` - Report period
- `totalRevenue`, `totalExpenses`, `netProfit` - Financial summary
- `vatCollected` - VAT tracking for tax filing
- `orderCount` - Order statistics
- `reportData` - Detailed data for charts (JSONB)
- `pdfUrl` - Generated report PDF

**Behavior:**
- Generated via cron jobs (daily/weekly/monthly)
- Cached for performance (recalculated periodically)
- Exportable as PDF

### Financial System Data Flow

```
1. Order Placed → Invoice (DRAFT) created
2. Order Confirmed → Invoice status → ISSUED
3. Payment Processed → Payment record created
4. Payment Complete → Invoice status → PAID
5. Order Printing → Inventory usage logged (stock deducted)
6. Material Purchase → Expense + InventoryAddition created (stock increased)
7. End of Period → FinancialReport generated
```

### Indexes for Financial Models

All financial models include indexes for:
- Foreign keys (orderId, inventoryId, supplierId)
- Status fields (invoice.status, payment.status)
- Date fields (DESC for recent-first queries)
- Unique fields (invoiceNumber, expenseNumber)

### Multi-Currency Handling

All financial models support multi-currency:
- Base currency: GBP
- `exchangeRate` field stores conversion rate at transaction time
- Enables currency conversion for reporting
- Prices displayed in GBP by default

### VAT/Tax Considerations

- Default VAT rate: 20% (UK standard rate)
- Configurable per invoice (stored in `vatRate` field)
- VAT collected tracked in financial reports
- Supports zero-rated and exempt items (vatRate = 0)

### Google Search Integration

Expense model includes `searchMetadata` JSONB field for:
- Text search results (Google Custom Search API)
- Image search results (Google Vision API)
- Price comparison data across suppliers
- Product specifications
- Best price tracking

**Example searchMetadata:**
```json
{
  "query": "A4 matte photo paper 100 sheets",
  "results": [
    {
      "supplier": "Amazon UK",
      "price": 15.99,
      "url": "...",
      "rating": 4.5
    },
    {
      "supplier": "Office Supplies Ltd",
      "price": 14.50,
      "url": "...",
      "rating": 4.2
    }
  ],
  "selectedSupplier": "Office Supplies Ltd",
  "savingsVsHighest": 1.49
}
```
