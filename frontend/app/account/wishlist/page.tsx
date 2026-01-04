'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist, WishlistItem } from '@/contexts/WishlistContext';
import { Heart, ShoppingCart, Trash2, Share2, Loader2 } from 'lucide-react';

export default function WishlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const { items: wishlistItems, removeItem, isSyncing } = useWishlist();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/account/wishlist');
    }
  }, [user, authLoading, router]);

  const handleRemove = (productId: string) => {
    removeItem(productId);
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productImage: item.productImage,
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

  if (authLoading) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Wishlist</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSyncing ? 'Syncing...' : `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          {wishlistItems.length > 0 && (
            <Button variant="outline" onClick={handleShare} className="gap-2 w-full sm:w-auto">
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
                <div className="relative aspect-square bg-muted">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Heart className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <Link href={`/product/${item.productSlug}`}>
                    <h3 className="font-medium hover:text-primary transition-colors line-clamp-2">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-lg font-bold mt-2">£{item.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(item.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <Button
                    className="w-full mt-4 gap-2"
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add All to Cart */}
        {wishlistItems.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              onClick={() => {
                wishlistItems.forEach(item => handleAddToCart(item));
              }}
              className="gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              Add All Items to Cart
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
