-- Rename SUBLIMATION to HOME_LIFESTYLE in ProductCategory enum

-- Step 1: Add the new enum value
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'HOME_LIFESTYLE';

-- Step 2: Update existing products that use SUBLIMATION to use HOME_LIFESTYLE
UPDATE "products" SET "legacy_category" = 'HOME_LIFESTYLE' WHERE "legacy_category" = 'SUBLIMATION';

-- Note: PostgreSQL doesn't allow removing enum values directly.
-- The old SUBLIMATION value will remain in the enum but won't be used.
-- This is safe and the application code no longer references SUBLIMATION.
