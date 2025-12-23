'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect old sublimation URL to new home-lifestyle category
export default function SublimationRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/products/home-lifestyle');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
