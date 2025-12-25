import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ============================================
  // HOME & LIFESTYLE PRODUCTS
  // ============================================

  console.log('📦 Seeding home & lifestyle products...');

  // T-Shirt
  const tshirt = await prisma.product.create({
    data: {
      name: 'Custom Sublimation T-Shirt',
      slug: 'custom-sublimation-tshirt',
      description:
        'High-quality polyester t-shirt perfect for vibrant, full-color sublimation printing. Soft, breathable fabric with excellent color reproduction.',
      category: 'HOME_LIFESTYLE',
      productType: 'TSHIRT',
      customizationType: 'UPLOAD_OWN',
      basePrice: 12.99,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Custom Sublimation T-Shirt | Full-Color Printing',
      seoDescription:
        'Create your own custom sublimation t-shirt with vibrant, full-color printing. Perfect for gifts, events, or personal wear.',
      seoKeywords: 'custom t-shirt, sublimation printing, personalized shirt',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: tshirt.id,
        name: 'Small - White',
        sku: 'TSHIRT-S-WHT',
        size: 'S',
        color: 'White',
        price: 0,
        stock: 50,
        isDefault: true,
      },
      {
        productId: tshirt.id,
        name: 'Medium - White',
        sku: 'TSHIRT-M-WHT',
        size: 'M',
        color: 'White',
        price: 0,
        stock: 50,
      },
      {
        productId: tshirt.id,
        name: 'Large - White',
        sku: 'TSHIRT-L-WHT',
        size: 'L',
        color: 'White',
        price: 0,
        stock: 50,
      },
      {
        productId: tshirt.id,
        name: 'X-Large - White',
        sku: 'TSHIRT-XL-WHT',
        size: 'XL',
        color: 'White',
        price: 2.0,
        stock: 30,
      },
    ],
  });

  await prisma.productImage.createMany({
    data: [
      {
        productId: tshirt.id,
        imageUrl: 'https://placehold.co/800x800/white/black?text=Custom+T-Shirt',
        altText: 'Custom Sublimation T-Shirt',
        displayOrder: 0,
        isPrimary: true,
      },
      {
        productId: tshirt.id,
        imageUrl: 'https://placehold.co/800x800/white/black?text=T-Shirt+Detail',
        altText: 'T-Shirt Detail View',
        displayOrder: 1,
        isPrimary: false,
      },
    ],
  });

  // Mug
  const mug = await prisma.product.create({
    data: {
      name: 'Custom Sublimation Mug',
      slug: 'custom-sublimation-mug',
      description:
        'Premium ceramic mug with brilliant color reproduction. Dishwasher and microwave safe. Perfect for photos, designs, or logos.',
      category: 'HOME_LIFESTYLE',
      productType: 'MUG',
      customizationType: 'UPLOAD_OWN',
      basePrice: 8.99,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Custom Sublimation Mug | Personalized Photo Mug',
      seoDescription:
        'Create your own custom sublimation mug with your photos or designs. Dishwasher safe and vibrant colors.',
      seoKeywords: 'custom mug, photo mug, personalized mug, sublimation',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: mug.id,
        name: '11oz - White',
        sku: 'MUG-11OZ-WHT',
        size: '11oz',
        color: 'White',
        material: 'Ceramic',
        price: 0,
        stock: 100,
        isDefault: true,
      },
      {
        productId: mug.id,
        name: '15oz - White',
        sku: 'MUG-15OZ-WHT',
        size: '15oz',
        color: 'White',
        material: 'Ceramic',
        price: 2.0,
        stock: 75,
      },
    ],
  });

  await prisma.productImage.createMany({
    data: [
      {
        productId: mug.id,
        imageUrl: 'https://placehold.co/800x800/white/black?text=Custom+Mug',
        altText: 'Custom Sublimation Mug',
        displayOrder: 0,
        isPrimary: true,
      },
      {
        productId: mug.id,
        imageUrl: 'https://placehold.co/800x800/white/black?text=Mug+With+Photo',
        altText: 'Mug with Photo Example',
        displayOrder: 1,
        isPrimary: false,
      },
    ],
  });

  // Water Bottle
  const waterBottle = await prisma.product.create({
    data: {
      name: 'Custom Sublimation Water Bottle',
      slug: 'custom-sublimation-water-bottle',
      description:
        'Stainless steel water bottle with sublimation coating. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free and eco-friendly.',
      category: 'HOME_LIFESTYLE',
      productType: 'WATER_BOTTLE',
      customizationType: 'UPLOAD_OWN',
      basePrice: 14.99,
      status: 'ACTIVE',
      featured: false,
      seoTitle: 'Custom Sublimation Water Bottle | Stainless Steel',
      seoDescription:
        'Personalized stainless steel water bottle with full-color sublimation printing. Keeps drinks cold or hot.',
      seoKeywords: 'custom water bottle, sublimation bottle, personalized',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: waterBottle.id,
        name: '500ml - White',
        sku: 'BOTTLE-500ML-WHT',
        size: '500ml',
        color: 'White',
        material: 'Stainless Steel',
        price: 0,
        stock: 40,
        isDefault: true,
      },
      {
        productId: waterBottle.id,
        name: '750ml - White',
        sku: 'BOTTLE-750ML-WHT',
        size: '750ml',
        color: 'White',
        material: 'Stainless Steel',
        price: 3.0,
        stock: 30,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: waterBottle.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Water+Bottle',
      altText: 'Custom Sublimation Water Bottle',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Mousemat
  const mousemat = await prisma.product.create({
    data: {
      name: 'Custom Sublimation Mousemat',
      slug: 'custom-sublimation-mousemat',
      description:
        'High-quality fabric surface with rubber base. Perfect for photos, artwork, or branding. Non-slip and smooth tracking.',
      category: 'HOME_LIFESTYLE',
      productType: 'MOUSEMAT',
      customizationType: 'UPLOAD_OWN',
      basePrice: 6.99,
      status: 'ACTIVE',
      featured: false,
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: mousemat.id,
      name: 'Standard - 220x180mm',
      sku: 'MOUSEMAT-STD',
      size: '220x180mm',
      material: 'Fabric',
      price: 0,
      stock: 60,
      isDefault: true,
    },
  });

  await prisma.productImage.create({
    data: {
      productId: mousemat.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Mousemat',
      altText: 'Custom Sublimation Mousemat',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Cushion Pillow
  const cushion = await prisma.product.create({
    data: {
      name: 'Custom Sublimation Cushion Pillow',
      slug: 'custom-sublimation-cushion',
      description:
        'Soft polyester cushion with removable, washable cover. Perfect for home décor, gifts, or personalized designs.',
      category: 'HOME_LIFESTYLE',
      productType: 'CUSHION_PILLOW',
      customizationType: 'UPLOAD_OWN',
      basePrice: 11.99,
      status: 'ACTIVE',
      featured: false,
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: cushion.id,
        name: '40x40cm - White',
        sku: 'CUSHION-40X40-WHT',
        size: '40x40cm',
        color: 'White',
        material: 'Polyester',
        price: 0,
        stock: 30,
        isDefault: true,
      },
      {
        productId: cushion.id,
        name: '50x50cm - White',
        sku: 'CUSHION-50X50-WHT',
        size: '50x50cm',
        color: 'White',
        material: 'Polyester',
        price: 4.0,
        stock: 20,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: cushion.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Cushion',
      altText: 'Custom Sublimation Cushion Pillow',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Keychain
  const keychain = await prisma.product.create({
    data: {
      name: 'Custom Sublimation Keychain',
      slug: 'custom-sublimation-keychain',
      description:
        'Durable MDF keychain with high-quality sublimation coating. Perfect for photos, logos, or small gifts.',
      category: 'HOME_LIFESTYLE',
      productType: 'KEYCHAIN',
      customizationType: 'UPLOAD_OWN',
      basePrice: 3.99,
      status: 'ACTIVE',
      featured: false,
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: keychain.id,
        name: 'Round - 50mm',
        sku: 'KEYCHAIN-ROUND-50MM',
        size: '50mm',
        material: 'MDF',
        finish: 'Glossy',
        price: 0,
        stock: 100,
        isDefault: true,
      },
      {
        productId: keychain.id,
        name: 'Square - 50x50mm',
        sku: 'KEYCHAIN-SQUARE-50MM',
        size: '50x50mm',
        material: 'MDF',
        finish: 'Glossy',
        price: 0,
        stock: 100,
      },
      {
        productId: keychain.id,
        name: 'Heart - 50mm',
        sku: 'KEYCHAIN-HEART-50MM',
        size: '50mm',
        material: 'MDF',
        finish: 'Glossy',
        price: 0.5,
        stock: 75,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: keychain.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Keychain',
      altText: 'Custom Sublimation Keychain',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // ============================================
  // STATIONERY PRODUCTS
  // ============================================

  console.log('✉️ Seeding stationery products...');

  // Business Cards
  const businessCard = await prisma.product.create({
    data: {
      name: 'Premium Business Cards',
      slug: 'premium-business-cards',
      description:
        'Professional business cards on 400gsm silk card stock. Double-sided printing with vibrant colors.',
      category: 'STATIONERY',
      productType: 'BUSINESS_CARD',
      customizationType: 'TEMPLATE_BASED',
      basePrice: 15.0,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Premium Business Cards | Professional Printing',
      seoDescription:
        'High-quality business cards on premium card stock. Choose from templates or upload your own design.',
      seoKeywords: 'business cards, professional cards, custom cards',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: businessCard.id,
        name: '50 Cards - Silk Finish',
        sku: 'BIZCARD-50-SILK',
        size: '85x55mm',
        material: '400gsm Silk',
        finish: 'Silk',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: businessCard.id,
        name: '100 Cards - Silk Finish',
        sku: 'BIZCARD-100-SILK',
        size: '85x55mm',
        material: '400gsm Silk',
        finish: 'Silk',
        price: 10.0,
        stock: 0,
      },
      {
        productId: businessCard.id,
        name: '250 Cards - Silk Finish',
        sku: 'BIZCARD-250-SILK',
        size: '85x55mm',
        material: '400gsm Silk',
        finish: 'Silk',
        price: 20.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: businessCard.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Business+Cards',
      altText: 'Premium Business Cards',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  await prisma.productTemplate.createMany({
    data: [
      {
        productId: businessCard.id,
        name: 'Modern Professional',
        description: 'Clean, modern design with bold typography',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Modern',
        designFileUrl: 'https://placehold.co/850x550/white/black?text=Modern+Template',
        category: 'Business',
        tags: JSON.stringify(['professional', 'modern', 'minimal']),
        isPremium: false,
        price: 0,
      },
      {
        productId: businessCard.id,
        name: 'Classic Elegant',
        description: 'Timeless elegant design with traditional layout',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Classic',
        designFileUrl: 'https://placehold.co/850x550/white/black?text=Classic+Template',
        category: 'Business',
        tags: JSON.stringify(['elegant', 'classic', 'professional']),
        isPremium: false,
        price: 0,
      },
      {
        productId: businessCard.id,
        name: 'Creative Designer',
        description: 'Bold creative design for designers and creatives',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Creative',
        designFileUrl: 'https://placehold.co/850x550/white/black?text=Creative+Template',
        category: 'Business',
        tags: JSON.stringify(['creative', 'bold', 'unique']),
        isPremium: true,
        price: 2.99,
      },
    ],
  });

  // Greeting Cards
  const greetingCard = await prisma.product.create({
    data: {
      name: 'Custom Greeting Cards',
      slug: 'custom-greeting-cards',
      description:
        'Beautiful greeting cards for any occasion. Includes envelope. Printed on premium 300gsm card stock.',
      category: 'STATIONERY',
      productType: 'GREETING_CARD',
      customizationType: 'TEMPLATE_BASED',
      basePrice: 2.99,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Custom Greeting Cards | Personalized Cards',
      seoDescription:
        'Create custom greeting cards for birthdays, weddings, or any occasion. Premium quality with envelope included.',
      seoKeywords: 'greeting cards, custom cards, birthday cards',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: greetingCard.id,
        name: 'A6 - Portrait',
        sku: 'GREETCARD-A6-PORT',
        size: 'A6',
        material: '300gsm Card',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: greetingCard.id,
        name: 'A5 - Landscape',
        sku: 'GREETCARD-A5-LAND',
        size: 'A5',
        material: '300gsm Card',
        price: 1.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: greetingCard.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Greeting+Cards',
      altText: 'Custom Greeting Cards',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  await prisma.productTemplate.createMany({
    data: [
      {
        productId: greetingCard.id,
        name: 'Happy Birthday',
        description: 'Fun and colorful birthday card design',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Birthday',
        designFileUrl: 'https://placehold.co/600x800/white/black?text=Birthday+Template',
        category: 'Birthday',
        tags: JSON.stringify(['birthday', 'celebration', 'fun']),
        isPremium: false,
        price: 0,
      },
      {
        productId: greetingCard.id,
        name: 'Wedding Congratulations',
        description: 'Elegant wedding card with floral elements',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Wedding',
        designFileUrl: 'https://placehold.co/600x800/white/black?text=Wedding+Template',
        category: 'Wedding',
        tags: JSON.stringify(['wedding', 'elegant', 'romantic']),
        isPremium: false,
        price: 0,
      },
      {
        productId: greetingCard.id,
        name: 'Thank You',
        description: 'Simple and heartfelt thank you card',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Thank+You',
        designFileUrl: 'https://placehold.co/600x800/white/black?text=Thank+You+Template',
        category: 'Thank You',
        tags: JSON.stringify(['thanks', 'gratitude', 'simple']),
        isPremium: false,
        price: 0,
      },
      {
        productId: greetingCard.id,
        name: 'Christmas Greetings',
        description: 'Festive Christmas card with seasonal design',
        thumbnailUrl: 'https://placehold.co/400x250/white/black?text=Christmas',
        designFileUrl: 'https://placehold.co/600x800/white/black?text=Christmas+Template',
        category: 'Christmas',
        tags: JSON.stringify(['christmas', 'festive', 'holiday']),
        isPremium: true,
        price: 1.99,
      },
    ],
  });

  // Leaflets
  const leaflet = await prisma.product.create({
    data: {
      name: 'Custom Leaflets',
      slug: 'custom-leaflets',
      description:
        'High-quality leaflets for marketing, events, or information. Double-sided printing on 150gsm gloss paper.',
      category: 'STATIONERY',
      productType: 'LEAFLET',
      customizationType: 'UPLOAD_OWN',
      basePrice: 20.0,
      status: 'ACTIVE',
      featured: false,
      seoTitle: 'Custom Leaflets | Marketing Flyers',
      seoDescription:
        'Professional leaflets for your business or event. High-quality printing on gloss paper.',
      seoKeywords: 'leaflets, flyers, marketing materials',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: leaflet.id,
        name: '50 Leaflets - A5',
        sku: 'LEAFLET-50-A5',
        size: 'A5',
        material: '150gsm Gloss',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: leaflet.id,
        name: '100 Leaflets - A5',
        sku: 'LEAFLET-100-A5',
        size: 'A5',
        material: '150gsm Gloss',
        price: 15.0,
        stock: 0,
      },
      {
        productId: leaflet.id,
        name: '250 Leaflets - A5',
        sku: 'LEAFLET-250-A5',
        size: 'A5',
        material: '150gsm Gloss',
        price: 30.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: leaflet.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Leaflets',
      altText: 'Custom Leaflets',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // ============================================
  // LARGE FORMAT PRODUCTS
  // ============================================

  console.log('🖼️ Seeding large format products...');

  // Poster
  const poster = await prisma.product.create({
    data: {
      name: 'Custom Poster Print',
      slug: 'custom-poster-print',
      description:
        'Eye-catching poster prints for events, promotions, or décor. Printed on high-quality 200gsm satin paper.',
      category: 'LARGE_FORMAT',
      productType: 'POSTER',
      customizationType: 'UPLOAD_OWN',
      basePrice: 8.99,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Custom Poster Prints | Large Format Printing',
      seoDescription:
        'High-quality poster prints in various sizes. Perfect for events, marketing, or home décor.',
      seoKeywords: 'poster printing, custom posters, large format',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: poster.id,
        name: 'A3 - Satin',
        sku: 'POSTER-A3-SATIN',
        size: 'A3',
        material: '200gsm Satin',
        finish: 'Satin',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: poster.id,
        name: 'A2 - Satin',
        sku: 'POSTER-A2-SATIN',
        size: 'A2',
        material: '200gsm Satin',
        finish: 'Satin',
        price: 8.0,
        stock: 0,
      },
      {
        productId: poster.id,
        name: 'A1 - Satin',
        sku: 'POSTER-A1-SATIN',
        size: 'A1',
        material: '200gsm Satin',
        finish: 'Satin',
        price: 15.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: poster.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Poster',
      altText: 'Custom Poster Print',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Banner
  const banner = await prisma.product.create({
    data: {
      name: 'Custom Vinyl Banner',
      slug: 'custom-vinyl-banner',
      description:
        'Durable outdoor banner printed on weather-resistant vinyl. Includes eyelets for easy hanging.',
      category: 'LARGE_FORMAT',
      productType: 'BANNER',
      customizationType: 'UPLOAD_OWN',
      basePrice: 35.0,
      status: 'ACTIVE',
      featured: false,
      seoTitle: 'Custom Vinyl Banners | Outdoor Banners',
      seoDescription:
        'Weather-resistant vinyl banners for outdoor use. Custom sizes and designs available.',
      seoKeywords: 'vinyl banner, outdoor banner, custom banner',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: banner.id,
        name: '1m x 0.5m',
        sku: 'BANNER-1X05',
        size: '1m x 0.5m',
        material: 'PVC Vinyl',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: banner.id,
        name: '2m x 1m',
        sku: 'BANNER-2X1',
        size: '2m x 1m',
        material: 'PVC Vinyl',
        price: 30.0,
        stock: 0,
      },
      {
        productId: banner.id,
        name: '3m x 1m',
        sku: 'BANNER-3X1',
        size: '3m x 1m',
        material: 'PVC Vinyl',
        price: 50.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: banner.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Banner',
      altText: 'Custom Vinyl Banner',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // ============================================
  // PHOTO PRINTS (PREMIUM)
  // ============================================

  console.log('🎨 Seeding photo print products...');

  // Canvas Print
  const canvas = await prisma.product.create({
    data: {
      name: 'Premium Canvas Print',
      slug: 'premium-canvas-print',
      description:
        'Museum-quality canvas print on stretched frame. UV-resistant inks for long-lasting color.',
      category: 'PHOTO_PRINTS',
      productType: 'CANVAS_PRINT',
      customizationType: 'UPLOAD_OWN',
      basePrice: 25.0,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Premium Canvas Prints | Gallery Quality',
      seoDescription:
        'Turn your photos into stunning canvas art. Museum-quality printing on stretched frames.',
      seoKeywords: 'canvas print, photo canvas, wall art',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: canvas.id,
        name: '30x40cm - Stretched',
        sku: 'CANVAS-30X40',
        size: '30x40cm',
        material: 'Canvas',
        finish: 'Matte',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: canvas.id,
        name: '50x70cm - Stretched',
        sku: 'CANVAS-50X70',
        size: '50x70cm',
        material: 'Canvas',
        finish: 'Matte',
        price: 20.0,
        stock: 0,
      },
      {
        productId: canvas.id,
        name: '70x100cm - Stretched',
        sku: 'CANVAS-70X100',
        size: '70x100cm',
        material: 'Canvas',
        finish: 'Matte',
        price: 45.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: canvas.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Canvas+Print',
      altText: 'Premium Canvas Print',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Aluminum Print
  const aluminum = await prisma.product.create({
    data: {
      name: 'Aluminum Photo Print',
      slug: 'aluminum-photo-print',
      description:
        'Modern and sleek aluminum print with vibrant colors and metallic finish. Ready to hang.',
      category: 'PHOTO_PRINTS',
      productType: 'ALUMINUM_PRINT',
      customizationType: 'UPLOAD_OWN',
      basePrice: 35.0,
      status: 'ACTIVE',
      featured: false,
      seoTitle: 'Aluminum Photo Prints | Metal Wall Art',
      seoDescription:
        'Stunning aluminum prints with vibrant colors and modern metallic finish.',
      seoKeywords: 'aluminum print, metal print, photo wall art',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: aluminum.id,
        name: '20x30cm',
        sku: 'ALUMINUM-20X30',
        size: '20x30cm',
        material: 'Aluminum',
        finish: 'Glossy',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: aluminum.id,
        name: '40x60cm',
        sku: 'ALUMINUM-40X60',
        size: '40x60cm',
        material: 'Aluminum',
        finish: 'Glossy',
        price: 25.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: aluminum.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Aluminum+Print',
      altText: 'Aluminum Photo Print',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Acrylic LED Print
  const acrylicLed = await prisma.product.create({
    data: {
      name: 'Acrylic LED Photo Print',
      slug: 'acrylic-led-photo-print',
      description:
        'Stunning acrylic print with integrated LED edge lighting. Creates a beautiful glowing effect.',
      category: 'PHOTO_PRINTS',
      productType: 'ACRYLIC_LED_PRINT',
      customizationType: 'UPLOAD_OWN',
      basePrice: 65.0,
      status: 'ACTIVE',
      featured: true,
      seoTitle: 'Acrylic LED Photo Prints | Illuminated Wall Art',
      seoDescription:
        'Premium acrylic prints with LED edge lighting for a stunning glowing effect.',
      seoKeywords: 'acrylic print, LED print, illuminated photo',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: acrylicLed.id,
        name: '30x40cm - LED',
        sku: 'ACRYLIC-LED-30X40',
        size: '30x40cm',
        material: 'Acrylic',
        finish: 'Glossy',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: acrylicLed.id,
        name: '40x60cm - LED',
        sku: 'ACRYLIC-LED-40X60',
        size: '40x60cm',
        material: 'Acrylic',
        finish: 'Glossy',
        price: 30.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: acrylicLed.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Acrylic+LED',
      altText: 'Acrylic LED Photo Print',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // Photo Paper Print
  const photoPaper = await prisma.product.create({
    data: {
      name: 'Premium Photo Paper Print',
      slug: 'premium-photo-paper-print',
      description:
        'Professional photo prints on high-quality lustre paper. Perfect for framing.',
      category: 'PHOTO_PRINTS',
      productType: 'PHOTO_PAPER_PRINT',
      customizationType: 'UPLOAD_OWN',
      basePrice: 5.99,
      status: 'ACTIVE',
      featured: false,
      seoTitle: 'Premium Photo Prints | Professional Quality',
      seoDescription:
        'High-quality photo prints on professional lustre paper. Perfect for framing and displaying.',
      seoKeywords: 'photo prints, photo paper, professional prints',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: photoPaper.id,
        name: '4x6 inch - Lustre',
        sku: 'PHOTO-4X6-LUSTRE',
        size: '4x6 inch',
        material: 'Lustre Photo Paper',
        finish: 'Lustre',
        price: 0,
        stock: 0,
        isDefault: true,
      },
      {
        productId: photoPaper.id,
        name: '5x7 inch - Lustre',
        sku: 'PHOTO-5X7-LUSTRE',
        size: '5x7 inch',
        material: 'Lustre Photo Paper',
        finish: 'Lustre',
        price: 2.0,
        stock: 0,
      },
      {
        productId: photoPaper.id,
        name: '8x10 inch - Lustre',
        sku: 'PHOTO-8X10-LUSTRE',
        size: '8x10 inch',
        material: 'Lustre Photo Paper',
        finish: 'Lustre',
        price: 4.0,
        stock: 0,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: photoPaper.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Photo+Print',
      altText: 'Premium Photo Paper Print',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  // ============================================
  // DIGITAL PRODUCTS
  // ============================================

  console.log('💾 Seeding digital products...');

  // Digital PDF
  const digitalPdf = await prisma.product.create({
    data: {
      name: 'Digital Design Templates',
      slug: 'digital-design-templates',
      description:
        'Professionally designed templates in PDF format. Instant download. Editable in Adobe Illustrator or similar software.',
      category: 'DIGITAL',
      productType: 'DIGITAL_PDF',
      customizationType: 'DIGITAL_DOWNLOAD',
      basePrice: 4.99,
      status: 'ACTIVE',
      featured: false,
      seoTitle: 'Digital Design Templates | Instant Download',
      seoDescription:
        'Professionally designed templates for instant download. Editable PDF files.',
      seoKeywords: 'digital templates, PDF templates, design templates',
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: digitalPdf.id,
        name: 'Business Card Template',
        sku: 'DIGITAL-BIZCARD-TEMPLATE',
        size: 'Digital',
        price: 0,
        stock: 999,
        isDefault: true,
      },
      {
        productId: digitalPdf.id,
        name: 'Flyer Template Pack',
        sku: 'DIGITAL-FLYER-PACK',
        size: 'Digital',
        price: 5.0,
        stock: 999,
      },
      {
        productId: digitalPdf.id,
        name: 'Social Media Pack',
        sku: 'DIGITAL-SOCIAL-PACK',
        size: 'Digital',
        price: 7.0,
        stock: 999,
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      productId: digitalPdf.id,
      imageUrl: 'https://placehold.co/800x800/white/black?text=Digital+Templates',
      altText: 'Digital Design Templates',
      displayOrder: 0,
      isPrimary: true,
    },
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`
📊 Summary:
  - Home & Lifestyle Products: 6 (T-shirt, Mug, Water Bottle, Mousemat, Cushion, Keychain)
  - Stationery Products: 3 (Business Cards, Greeting Cards, Leaflets)
  - Large Format Products: 2 (Poster, Banner)
  - Photo Prints: 4 (Canvas, Aluminum, Acrylic LED, Photo Paper)
  - Digital Products: 1 (Digital Templates)

  Total: 16 products with multiple variants each

🖼️ Images: All products have placeholder images
📋 Templates: 7 templates added (3 business card + 4 greeting card templates)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
