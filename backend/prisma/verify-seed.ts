import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying seeded data...\n');

  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const imageCount = await prisma.productImage.count();
  const templateCount = await prisma.productTemplate.count();

  console.log(`✅ Products: ${productCount} (expected: 16)`);
  console.log(`✅ Product Variants: ${variantCount}`);
  console.log(`✅ Product Images: ${imageCount} (expected: 16)`);
  console.log(`✅ Product Templates: ${templateCount} (expected: 7)`);

  // Get a sample product with relations
  const sampleProduct = await prisma.product.findFirst({
    where: { slug: 'custom-sublimation-tshirt' },
    include: {
      variants: true,
      images: true,
    },
  });

  console.log('\n📦 Sample Product (T-Shirt):');
  console.log(`  - Name: ${sampleProduct?.name}`);
  console.log(`  - Variants: ${sampleProduct?.variants.length}`);
  console.log(`  - Images: ${sampleProduct?.images.length}`);

  // Get a template-based product
  const templateProduct = await prisma.product.findFirst({
    where: { slug: 'premium-business-cards' },
    include: {
      templates: true,
    },
  });

  console.log('\n📋 Sample Template Product (Business Cards):');
  console.log(`  - Name: ${templateProduct?.name}`);
  console.log(`  - Templates: ${templateProduct?.templates.length}`);

  console.log('\n✅ Verification complete!');
}

verify()
  .catch((e) => {
    console.error('❌ Error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
