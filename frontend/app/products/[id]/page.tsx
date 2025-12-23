'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home } from 'lucide-react';
import { Product, ProductCategory, productsService, CATEGORY_LABELS } from '@/lib/api/products';
import { CartIcon } from '@/components/cart/CartIcon';

// Product detail components
import { ProductImageGallery } from '@/components/product-detail/ProductImageGallery';
import { ProductInfo } from '@/components/product-detail/ProductInfo';
import { VariantSelector } from '@/components/product-detail/VariantSelector';
import { AddToCartSection } from '@/components/product-detail/AddToCartSection';
import { ProductTabs } from '@/components/product-detail/ProductTabs';
import { RelatedProducts } from '@/components/product-detail/RelatedProducts';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Variant selection state
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedFinish, setSelectedFinish] = useState<string | null>(null);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch the product
        const productData = await productsService.get(productId);
        setProduct(productData);

        // Fetch related products (same category)
        if (productData.category) {
          const related = await productsService.list({
            category: productData.category,
            limit: 4,
            status: 'ACTIVE',
          });
          // Filter out current product
          setRelatedProducts(related.products.filter((p) => p.id !== productId));
        }
      } catch (err: any) {
        setError(err?.error || err?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  // Get primary image URL for cart
  const getPrimaryImage = () => {
    const primaryImg = product?.images?.find((img) => img.isPrimary);
    return primaryImg?.imageUrl || product?.images?.[0]?.imageUrl || '/placeholder-product.png';
  };

  // Build selected variant info
  const getSelectedVariant = () => {
    if (!selectedSize && !selectedMaterial && !selectedColor && !selectedFinish) {
      return undefined;
    }
    return {
      id: [selectedSize, selectedMaterial, selectedColor, selectedFinish].filter(Boolean).join('-'),
      name: [selectedSize, selectedMaterial, selectedColor, selectedFinish].filter(Boolean).join(', '),
      size: selectedSize || undefined,
      material: selectedMaterial || undefined,
      color: selectedColor || undefined,
      finish: selectedFinish || undefined,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Link href="/products">
            <Button className="btn-gradient">Browse All Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Mock variant options (in real app, these would come from product variants)
  const sizeOptions = [
    { id: 'small', name: 'Small', available: true },
    { id: 'medium', name: 'Medium', available: true },
    { id: 'large', name: 'Large', available: true },
    { id: 'xl', name: 'Extra Large', available: false },
  ];

  const materialOptions = [
    { id: 'ceramic', name: 'Ceramic', available: true, price: 0 },
    { id: 'glass', name: 'Glass', available: true, price: 2 },
    { id: 'metal', name: 'Metal', available: true, price: 5 },
  ];

  const colorOptions = [
    { id: 'white', name: 'White', available: true },
    { id: 'black', name: 'Black', available: true },
    { id: 'blue', name: 'Blue', available: true },
    { id: 'red', name: 'Red', available: false },
  ];

  const finishOptions = [
    { id: 'matte', name: 'Matte', available: true },
    { id: 'glossy', name: 'Glossy', available: true },
  ];

  // Product images (using product images or placeholders)
  const primaryImage = product.images?.find((img) => img.isPrimary)?.imageUrl;
  const productImages = product.images && product.images.length > 0
    ? product.images.map((img) => img.imageUrl)
    : [
        primaryImage || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80',
        'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
        'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&q=80',
        'https://images.unsplash.com/photo-1495556650867-99590cea3657?w=800&q=80',
      ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="relative z-50 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link href="/gifts">
              <Button variant="ghost">Gifts</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <CartIcon />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {user.name}
                </span>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="btn-gradient">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/products" className="hover:text-foreground transition-colors">
              Products
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-4 w-4" />
                <Link
                  href={`/products?category=${product.category}`}
                  className="hover:text-foreground transition-colors"
                >
                  {CATEGORY_LABELS[product.category]}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium truncate max-w-xs">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      {/* Product Detail Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Image Gallery - 5 columns */}
          <div className="lg:col-span-5">
            <ProductImageGallery images={productImages} productName={product.name} />
          </div>

          {/* Product Info & Variants - 4 columns */}
          <div className="lg:col-span-4 space-y-8">
            <ProductInfo product={product} />

            {/* Variant Selectors */}
            <div className="space-y-6 pt-6 border-t border-border">
              <VariantSelector
                label="Size"
                options={sizeOptions}
                selected={selectedSize}
                onSelect={setSelectedSize}
              />

              <VariantSelector
                label="Material"
                options={materialOptions}
                selected={selectedMaterial}
                onSelect={setSelectedMaterial}
              />

              <VariantSelector
                label="Color"
                options={colorOptions}
                selected={selectedColor}
                onSelect={setSelectedColor}
                type="color"
              />

              <VariantSelector
                label="Finish"
                options={finishOptions}
                selected={selectedFinish}
                onSelect={setSelectedFinish}
              />
            </div>
          </div>

          {/* Add to Cart Section - 3 columns */}
          <div className="lg:col-span-3">
            <AddToCartSection
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              productImage={getPrimaryImage()}
              price={typeof product.basePrice === 'string' ? parseFloat(product.basePrice) : product.basePrice}
              isCustomizable={product.customizationType !== null}
              selectedVariant={getSelectedVariant()}
            />
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <ProductTabs description={product.description} />
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts products={relatedProducts} />
    </main>
  );
}
