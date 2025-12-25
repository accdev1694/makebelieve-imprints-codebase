-- AlterTable
ALTER TABLE "products" ALTER COLUMN "legacy_category" DROP NOT NULL,
ALTER COLUMN "legacy_product_type" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "product_variants_material_idx" ON "product_variants"("material");

-- CreateIndex
CREATE INDEX "product_variants_size_idx" ON "product_variants"("size");
