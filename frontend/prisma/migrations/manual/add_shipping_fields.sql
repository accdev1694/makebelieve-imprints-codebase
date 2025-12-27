-- Add shipping-related fields to orders table for Royal Mail integration
-- Run this migration manually on your database

-- Add royalmail_order_id column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS royalmail_order_id VARCHAR(255);

-- Add tracking_number column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255);

-- Add carrier column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(50);

-- Create index on tracking_number for faster lookups
CREATE INDEX IF NOT EXISTS orders_tracking_number_idx ON orders(tracking_number);
