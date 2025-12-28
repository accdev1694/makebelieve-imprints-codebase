'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscribers/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to unsubscribe');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Unsubscribed</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          You have been successfully unsubscribed from our newsletter.
          We&apos;re sorry to see you go!
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Changed your mind? You can always subscribe again from our website.
        </p>
        <Link href="/">
          <Button className="btn-gradient">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center max-w-md mx-auto">
      <Mail className="w-16 h-16 text-primary mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4">Unsubscribe</h1>
      <p className="text-muted-foreground mb-8">
        Enter your email address below to unsubscribe from our newsletter.
      </p>

      <form onSubmit={handleUnsubscribe} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <Button
          type="submit"
          loading={loading}
          variant="outline"
          className="w-full"
        >
          Unsubscribe
        </Button>
      </form>

      <p className="text-sm text-muted-foreground mt-8">
        Want to stay connected?{' '}
        <Link href="/" className="text-primary hover:underline">
          Go back to our website
        </Link>
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
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
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}
