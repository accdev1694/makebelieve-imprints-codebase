'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const error = searchParams.get('error');

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Subscription Confirmed!</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Thank you for confirming your subscription. You&apos;ll now receive our latest updates,
          exclusive offers, and a special 10% discount code in your welcome email.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/products">
            <Button className="btn-gradient">Start Shopping</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Already confirmed
  if (status === 'already_confirmed') {
    return (
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Already Confirmed</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Your email is already confirmed. You&apos;re all set to receive our updates!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/products">
            <Button className="btn-gradient">Browse Products</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error states
  let errorMessage = 'Something went wrong. Please try again later.';
  if (error === 'missing_token') {
    errorMessage = 'The confirmation link is invalid. Please check your email for the correct link.';
  } else if (error === 'invalid_token') {
    errorMessage = 'This confirmation link has expired or is invalid. Please subscribe again.';
  }

  return (
    <div className="text-center">
      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4">Confirmation Failed</h1>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{errorMessage}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/">
          <Button className="btn-gradient">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}

export default function SubscribeConfirmPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center py-16 px-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <ConfirmContent />
      </Suspense>
    </main>
  );
}
