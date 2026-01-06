'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShoppingCart, RefreshCw, MessageCircle } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('checkout-error');

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Checkout error:', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Checkout Error</h1>

        <p className="text-muted-foreground mb-2">
          We encountered an issue processing your checkout. Don&apos;t worry — your cart is safe.
        </p>

        <p className="text-sm text-muted-foreground mb-6">
          If you were charged, please contact support with the error ID below.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <Link href="/cart">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <ShoppingCart className="h-4 w-4" />
              Return to Cart
            </Button>
          </Link>
        </div>

        <Link href="/contact" className="inline-block mt-4">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </Button>
        </Link>

        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md inline-block">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
