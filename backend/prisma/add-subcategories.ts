import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingSubcategories() {
  console.log('🌱 Adding missing subcategories...\n');

  // Get all categories
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map(c => [c.slug, c.id]));

  // Define all subcategories per the project-structure.md
  const subcategoriesData: Record<string, Array<{ name: string; slug: string; description: string; displayOrder: number }>> = {
    'home-lifestyle': [
      { name: 'Mugs', slug: 'mugs', description: 'Custom printed ceramic mugs and drinkware', displayOrder: 1 },
      { name: 'T-Shirts', slug: 't-shirts', description: 'Custom printed t-shirts and apparel', displayOrder: 2 },
      { name: 'Cushions', slug: 'cushions', description: 'Custom cushion covers and throw pillows', displayOrder: 3 },
      { name: 'Water Bottles', slug: 'water-bottles', description: 'Personalized water bottles and tumblers', displayOrder: 4 },
      { name: 'Mouse Mats', slug: 'mouse-mats', description: 'Custom printed mouse mats with non-slip base', displayOrder: 5 },
      { name: 'Key Chains', slug: 'key-chains', description: 'Personalized keychains in various shapes', displayOrder: 6 },
      { name: 'Tote Bags', slug: 'tote-bags', description: 'Custom printed tote bags and shopping bags', displayOrder: 7 },
      { name: 'Phone Cases', slug: 'phone-cases', description: 'Personalized phone cases for various models', displayOrder: 8 },
    ],
    'stationery': [
      { name: 'Business Cards', slug: 'business-cards', description: 'Professional business cards in various finishes', displayOrder: 1 },
      { name: 'Leaflets', slug: 'leaflets', description: 'Marketing leaflets and flyers', displayOrder: 2 },
      { name: 'Brochures', slug: 'brochures', description: 'Multi-page brochures and catalogs', displayOrder: 3 },
      { name: 'Letterheads', slug: 'letterheads', description: 'Professional letterhead printing', displayOrder: 4 },
      { name: 'Envelopes', slug: 'envelopes', description: 'Printed envelopes in various sizes', displayOrder: 5 },
      { name: 'Notepads', slug: 'notepads', description: 'Custom branded notepads', displayOrder: 6 },
      { name: 'Folders', slug: 'folders', description: 'Presentation folders and document wallets', displayOrder: 7 },
      { name: 'Postcards', slug: 'postcards', description: 'Printed postcards for marketing', displayOrder: 8 },
      { name: 'Booklets', slug: 'booklets', description: 'Saddle-stitched booklets and programs', displayOrder: 9 },
    ],
    'large-format': [
      { name: 'Vinyl Banners', slug: 'vinyl-banners', description: 'Durable outdoor vinyl banners with eyelets', displayOrder: 1 },
      { name: 'Roll-Up Banners', slug: 'roll-up-banners', description: 'Portable pull-up banner stands', displayOrder: 2 },
      { name: 'Posters', slug: 'posters', description: 'Large format poster prints', displayOrder: 3 },
      { name: 'Foam Boards', slug: 'foam-boards', description: 'Lightweight foam board signage', displayOrder: 4 },
      { name: 'Correx Signs', slug: 'correx-signs', description: 'Corrugated plastic signs for outdoor use', displayOrder: 5 },
      { name: 'Window Graphics', slug: 'window-graphics', description: 'Window decals and vinyl graphics', displayOrder: 6 },
      { name: 'Wall Murals', slug: 'wall-murals', description: 'Custom wall murals and wallpaper', displayOrder: 7 },
      { name: 'Vehicle Wraps', slug: 'vehicle-wraps', description: 'Full and partial vehicle wrapping', displayOrder: 8 },
      { name: 'A-Frames', slug: 'a-frames', description: 'Pavement signs and A-frame boards', displayOrder: 9 },
    ],
    'photo-prints': [
      { name: 'Canvas Prints', slug: 'canvas', description: 'Museum-quality canvas prints on stretched frames', displayOrder: 1 },
      { name: 'Aluminum Prints', slug: 'aluminum', description: 'Modern metal prints with vibrant colors', displayOrder: 2 },
      { name: 'Acrylic Prints', slug: 'acrylic', description: 'Sleek acrylic photo panels', displayOrder: 3 },
      { name: 'Acrylic LED Prints', slug: 'acrylic-led', description: 'Backlit acrylic prints with LED lighting', displayOrder: 4 },
      { name: 'Paper Prints', slug: 'paper', description: 'Professional photo paper prints', displayOrder: 5 },
      { name: 'Framed Prints', slug: 'framed', description: 'Ready-to-hang framed photographs', displayOrder: 6 },
      { name: 'Photo Books', slug: 'photo-books', description: 'Custom photo books and albums', displayOrder: 7 },
      { name: 'Photo Calendars', slug: 'calendars', description: 'Personalized photo calendars', displayOrder: 8 },
    ],
    'digital': [
      { name: 'Templates', slug: 'templates', description: 'Editable design templates', displayOrder: 1 },
      { name: 'Clipart & Graphics', slug: 'clipart', description: 'Digital clipart and graphic elements', displayOrder: 2 },
      { name: 'Fonts', slug: 'fonts', description: 'Custom fonts and typography', displayOrder: 3 },
      { name: 'Mockups', slug: 'mockups', description: 'Product mockup templates', displayOrder: 4 },
      { name: 'Design Bundles', slug: 'design-bundles', description: 'Bundled design resource packs', displayOrder: 5 },
    ],
  };

  for (const [categorySlug, subcategories] of Object.entries(subcategoriesData)) {
    const categoryId = categoryMap.get(categorySlug);
    if (!categoryId) {
      console.log(`⚠️  Category not found: ${categorySlug}`);
      continue;
    }

    console.log(`📁 Processing ${categorySlug}...`);

    for (const sub of subcategories) {
      // Check if subcategory already exists
      const existing = await prisma.subcategory.findFirst({
        where: {
          categoryId,
          slug: sub.slug,
        },
      });

      if (existing) {
        console.log(`   ✓ ${sub.name} already exists`);
      } else {
        await prisma.subcategory.create({
          data: {
            categoryId,
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            displayOrder: sub.displayOrder,
            isActive: true,
          },
        });
        console.log(`   + Added ${sub.name}`);
      }
    }
  }

  // Remove "Create a Custom Design" subcategories if they exist (cleanup)
  const customDesignSubs = await prisma.subcategory.findMany({
    where: {
      slug: {
        contains: 'create-custom-design',
      },
    },
  });

  if (customDesignSubs.length > 0) {
    console.log('\n🧹 Cleaning up "Create a Custom Design" subcategories...');
    for (const sub of customDesignSubs) {
      await prisma.subcategory.delete({ where: { id: sub.id } });
      console.log(`   - Removed ${sub.name}`);
    }
  }

  console.log('\n✅ Subcategories updated successfully!');

  // Print summary
  const allSubcategories = await prisma.subcategory.findMany({
    include: { category: true },
    orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
  });

  console.log('\n📊 Current Subcategories:');
  let currentCategory = '';
  for (const sub of allSubcategories) {
    if (sub.category.name !== currentCategory) {
      currentCategory = sub.category.name;
      console.log(`\n   ${currentCategory}:`);
    }
    console.log(`      - ${sub.name} (/${sub.category.slug}/${sub.slug})`);
  }
}

addMissingSubcategories()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
