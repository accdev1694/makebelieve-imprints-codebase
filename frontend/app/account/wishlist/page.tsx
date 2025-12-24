'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Heart, ShoppingCart, Trash2, Share2 } from 'lucide-react';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  inStock: boolean;
  addedAt: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/account/wishlist');
    }
  }, [user, authLoading, router]);

  // Load wishlist (mock data for now)
  useEffect(() => {
    if (user) {
      // TODO: Fetch from API
      setWishlistItems([
        {
          id: '1',
          productId: 'prod-1',
          name: 'Custom Sublimation Mug',
          slug: 'custom-sublimation-mug',
          price: 8.99,
          image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80',
          inStock: true,
          addedAt: '2024-01-15',
        },
        {
          id: '2',
          productId: 'prod-2',
          name: 'Premium Canvas Print',
          slug: 'premium-canvas-print',
          price: 25.00,
          image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80',
          inStock: true,
          addedAt: '2024-01-10',
        },
        {
          id: '3',
          productId: 'prod-3',
          name: 'Custom T-Shirt',
          slug: 'custom-sublimation-tshirt',
          price: 12.99,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
          inStock: false,
          addedAt: '2024-01-05',
        },
      ]);
      setLoading(false);
    }
  }, [user]);

  const handleRemove = (itemId: string) => {
    setWishlistItems(wishlistItems.filter(item => item.id !== itemId));
    // TODO: Remove via API
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      productId: item.productId,
      productName: item.name,
      productSlug: item.slug,
      productImage: item.image,
      quantity: 1,
      unitPrice: item.price,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wishlist - MakeBelieve Imprints',
          text: 'Check out my wishlist!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <span className="mx-2">/</span>
          <span>Wishlist</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
            <p className="text-muted-foreground">
              {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          {wishlistItems.length > 0 && (
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Wishlist
            </Button>
          )}
        </div>

        {/* Wishlist Items */}
        {wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-6">
                Save items you love by clicking the heart icon on any product.
              </p>
              <Link href="/products">
                <Button>Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
                <div className="relative aspect-square">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white text-black px-3 py-1 rounded-full text-sm font-medium">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="font-medium hover:text-primary transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-lg font-bold mt-2">£{item.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </p>
                  <Button
                    className="w-full mt-4 gap-2"
                    disabled={!item.inStock}
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {item.inStock ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add All to Cart */}
        {wishlistItems.length > 0 && wishlistItems.some(item => item.inStock) && (
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              onClick={() => {
                wishlistItems
                  .filter(item => item.inStock)
                  .forEach(item => handleAddToCart(item));
              }}
              className="gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              Add All Available Items to Cart
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
