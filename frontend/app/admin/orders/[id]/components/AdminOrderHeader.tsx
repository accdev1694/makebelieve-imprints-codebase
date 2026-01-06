'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Order } from '@/lib/api/orders';

interface AdminOrderHeaderProps {
  order: Order;
  copied: boolean;
  onCopyShareLink: () => void;
}

export function AdminOrderHeader({ order, copied, onCopyShareLink }: AdminOrderHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              &larr; Back to Orders
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            <span className="text-neon-gradient">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </h1>
        </div>
        {order.shareToken && (
          <Button
            variant="outline"
            size="sm"
            className="border-cyan-500/50 text-cyan-500 hover:text-cyan-600"
            onClick={onCopyShareLink}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Share Tracking Link
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
