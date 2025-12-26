import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button className="btn-gradient">Go Home</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">Browse Products</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
