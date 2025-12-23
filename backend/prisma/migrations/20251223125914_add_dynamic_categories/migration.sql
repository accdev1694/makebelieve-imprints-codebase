-- CreateTable: categories
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: subcategories
CREATE TABLE "subcategories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_slug_idx" ON "categories"("slug");
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");
CREATE INDEX "categories_display_order_idx" ON "categories"("display_order");

CREATE UNIQUE INDEX "subcategories_slug_key" ON "subcategories"("slug");
CREATE INDEX "subcategories_category_id_idx" ON "subcategories"("category_id");
CREATE INDEX "subcategories_slug_idx" ON "subcategories"("slug");
CREATE INDEX "subcategories_is_active_idx" ON "subcategories"("is_active");
CREATE INDEX "subcategories_display_order_idx" ON "subcategories"("display_order");

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert initial categories based on existing enum values
INSERT INTO "categories" ("id", "name", "slug", "description", "display_order") VALUES
    (gen_random_uuid(), 'Home & Lifestyle', 'home-lifestyle', 'Custom mugs, keychains, t-shirts, and personalized lifestyle products', 1),
    (gen_random_uuid(), 'Business Stationery', 'stationery', 'Business cards, letterheads, and professional print materials', 2),
    (gen_random_uuid(), 'Large Format Prints', 'large-format', 'Banners, posters, and signage for maximum impact', 3),
    (gen_random_uuid(), 'Photo Prints', 'photo-prints', 'Canvas prints, framed photos, and photo albums', 4),
    (gen_random_uuid(), 'Digital Products', 'digital', 'Templates, designs, and digital downloads', 5);

-- Insert subcategories for Home & Lifestyle
INSERT INTO "subcategories" ("id", "category_id", "name", "slug", "description", "display_order")
SELECT
    gen_random_uuid(),
    c.id,
    s.name,
    s.slug,
    s.description,
    s.display_order
FROM "categories" c
CROSS JOIN (
    VALUES
        ('Mugs', 'mugs', 'Custom printed mugs and drinkware', 1),
        ('Keychains', 'keychains', 'Personalized keychains and accessories', 2),
        ('T-Shirts', 'tshirts', 'Custom printed t-shirts and apparel', 3),
        ('Water Bottles', 'water-bottles', 'Branded water bottles and tumblers', 4),
        ('Throw Pillow Cushions', 'throw-pillows', 'Custom cushion covers and pillows', 5),
        ('Face Caps', 'face-caps', 'Embroidered and printed caps', 6)
) AS s(name, slug, description, display_order)
WHERE c.slug = 'home-lifestyle';

-- Insert subcategories for Business Stationery
INSERT INTO "subcategories" ("id", "category_id", "name", "slug", "description", "display_order")
SELECT
    gen_random_uuid(),
    c.id,
    s.name,
    s.slug,
    s.description,
    s.display_order
FROM "categories" c
CROSS JOIN (
    VALUES
        ('Business Cards', 'business-cards', 'Professional business cards', 1),
        ('Leaflets & Flyers', 'leaflets', 'Marketing leaflets and flyers', 2),
        ('Greeting Cards', 'greeting-cards', 'Custom greeting cards', 3),
        ('Postcards', 'postcards', 'Printed postcards', 4)
) AS s(name, slug, description, display_order)
WHERE c.slug = 'stationery';

-- Insert subcategories for Large Format
INSERT INTO "subcategories" ("id", "category_id", "name", "slug", "description", "display_order")
SELECT
    gen_random_uuid(),
    c.id,
    s.name,
    s.slug,
    s.description,
    s.display_order
FROM "categories" c
CROSS JOIN (
    VALUES
        ('Banners', 'banners', 'Vinyl and fabric banners', 1),
        ('Posters', 'posters', 'Large format posters', 2),
        ('Canvas Prints', 'canvas-prints', 'Gallery wrapped canvas', 3),
        ('Aluminium Prints', 'aluminium-prints', 'Metal photo prints', 4),
        ('Acrylic LED Prints', 'acrylic-led-prints', 'Backlit acrylic displays', 5)
) AS s(name, slug, description, display_order)
WHERE c.slug = 'large-format';

-- Insert subcategories for Photo Prints
INSERT INTO "subcategories" ("id", "category_id", "name", "slug", "description", "display_order")
SELECT
    gen_random_uuid(),
    c.id,
    s.name,
    s.slug,
    s.description,
    s.display_order
FROM "categories" c
CROSS JOIN (
    VALUES
        ('Photo Paper Prints', 'photo-paper', 'High quality photo prints', 1),
        ('Canvas Photo Prints', 'canvas-photo', 'Photos on canvas', 2),
        ('Framed Prints', 'framed-prints', 'Ready to hang framed prints', 3)
) AS s(name, slug, description, display_order)
WHERE c.slug = 'photo-prints';

-- Insert subcategories for Digital Products
INSERT INTO "subcategories" ("id", "category_id", "name", "slug", "description", "display_order")
SELECT
    gen_random_uuid(),
    c.id,
    s.name,
    s.slug,
    s.description,
    s.display_order
FROM "categories" c
CROSS JOIN (
    VALUES
        ('Digital Templates', 'digital-templates', 'Editable design templates', 1),
        ('Digital Downloads', 'digital-downloads', 'Instant download products', 2)
) AS s(name, slug, description, display_order)
WHERE c.slug = 'digital';

-- Rename existing columns to legacy
ALTER TABLE "products" RENAME COLUMN "category" TO "legacy_category";
ALTER TABLE "products" RENAME COLUMN "product_type" TO "legacy_product_type";

-- Add new category_id and subcategory_id columns
ALTER TABLE "products" ADD COLUMN "category_id" UUID;
ALTER TABLE "products" ADD COLUMN "subcategory_id" UUID;

-- Update products with category_id based on legacy_category
UPDATE "products" p
SET "category_id" = c.id
FROM "categories" c
WHERE
    (p."legacy_category" = 'SUBLIMATION' AND c.slug = 'home-lifestyle') OR
    (p."legacy_category" = 'STATIONERY' AND c.slug = 'stationery') OR
    (p."legacy_category" = 'LARGE_FORMAT' AND c.slug = 'large-format') OR
    (p."legacy_category" = 'PHOTO_PRINTS' AND c.slug = 'photo-prints') OR
    (p."legacy_category" = 'DIGITAL' AND c.slug = 'digital');

-- Set category_id to Home & Lifestyle for any remaining products (fallback)
UPDATE "products" p
SET "category_id" = (SELECT id FROM "categories" WHERE slug = 'home-lifestyle' LIMIT 1)
WHERE p."category_id" IS NULL;

-- Update products with subcategory_id based on legacy_product_type
UPDATE "products" p
SET "subcategory_id" = s.id
FROM "subcategories" s
WHERE
    (p."legacy_product_type" = 'MUG' AND s.slug = 'mugs') OR
    (p."legacy_product_type" = 'WATER_BOTTLE' AND s.slug = 'water-bottles') OR
    (p."legacy_product_type" = 'KEYCHAIN' AND s.slug = 'keychains') OR
    (p."legacy_product_type" = 'CUSHION_PILLOW' AND s.slug = 'throw-pillows') OR
    (p."legacy_product_type" = 'TSHIRT' AND s.slug = 'tshirts') OR
    (p."legacy_product_type" = 'BUSINESS_CARD' AND s.slug = 'business-cards') OR
    (p."legacy_product_type" = 'LEAFLET' AND s.slug = 'leaflets') OR
    (p."legacy_product_type" = 'GREETING_CARD' AND s.slug = 'greeting-cards') OR
    (p."legacy_product_type" = 'POSTCARD' AND s.slug = 'postcards') OR
    (p."legacy_product_type" = 'BANNER' AND s.slug = 'banners') OR
    (p."legacy_product_type" = 'POSTER' AND s.slug = 'posters') OR
    (p."legacy_product_type" = 'CANVAS_PRINT' AND s.slug = 'canvas-prints') OR
    (p."legacy_product_type" = 'ALUMINUM_PRINT' AND s.slug = 'aluminium-prints') OR
    (p."legacy_product_type" = 'ACRYLIC_LED_PRINT' AND s.slug = 'acrylic-led-prints') OR
    (p."legacy_product_type" = 'PHOTO_PAPER_PRINT' AND s.slug = 'photo-paper') OR
    (p."legacy_product_type" = 'DIGITAL_PDF' AND s.slug = 'digital-downloads');

-- Make category_id NOT NULL after data migration
ALTER TABLE "products" ALTER COLUMN "category_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_subcategory_id_idx" ON "products"("subcategory_id");

-- Drop old indexes if they exist
DROP INDEX IF EXISTS "products_category_idx";
DROP INDEX IF EXISTS "products_productType_idx";

-- Create indexes for legacy columns
CREATE INDEX "products_legacy_category_idx" ON "products"("legacy_category");
CREATE INDEX "products_legacy_product_type_idx" ON "products"("legacy_product_type");
