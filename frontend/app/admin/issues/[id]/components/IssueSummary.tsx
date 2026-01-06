'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Issue, REASON_LABELS } from './types';

interface IssueSummaryProps {
  issue: Issue;
}

export function IssueSummary({ issue }: IssueSummaryProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Issue #{issue.id.slice(0, 8).toUpperCase()}
              {issue.carrierFault === 'CARRIER_FAULT' && (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/50 border">
                  <Truck className="w-3 h-3 mr-1" />
                  Carrier Fault
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Reported {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item Info */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">
            {issue.orderItem.product?.name || 'Product'}
            {issue.orderItem.variant && ` - ${issue.orderItem.variant.name}`}
          </h4>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Quantity:</span> {issue.orderItem.quantity}
            </div>
            <div>
              <span className="text-muted-foreground">Item Value:</span> £{Number(issue.orderItem.totalPrice).toFixed(2)}
            </div>
            <div>
              <span className="text-muted-foreground">Issue Reason:</span>{' '}
              <span className="font-medium">{REASON_LABELS[issue.reason] || issue.reason}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Order Total:</span> £{Number(issue.orderItem.order.totalPrice).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Customer Notes */}
        {issue.initialNotes && (
          <div>
            <p className="text-sm font-medium mb-1">Customer Notes:</p>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg italic">
              &quot;{issue.initialNotes}&quot;
            </p>
          </div>
        )}

        {/* Evidence Photos */}
        {issue.imageUrls && issue.imageUrls.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Evidence Photos</p>
            <div className="flex flex-wrap gap-2">
              {issue.imageUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-20 h-20 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors relative"
                >
                  <Image
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Resolution Status */}
        {issue.status === 'COMPLETED' && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="font-medium text-green-500">Resolved</p>
            {issue.resolvedType === 'REPRINT' && (
              <p className="text-sm text-muted-foreground">
                Reprint order created:{' '}
                <Link href={`/admin/orders/${issue.reprintOrderId}`} className="text-primary hover:underline font-mono">
                  {issue.reprintOrderId?.slice(0, 8).toUpperCase()}
                </Link>
              </p>
            )}
            {(issue.resolvedType === 'FULL_REFUND' || issue.resolvedType === 'PARTIAL_REFUND') && (
              <p className="text-sm text-muted-foreground">
                {issue.resolvedType === 'FULL_REFUND' ? 'Full' : 'Partial'} refund: £{Number(issue.refundAmount).toFixed(2)}
                {issue.stripeRefundId && (
                  <span className="font-mono text-xs ml-2">({issue.stripeRefundId})</span>
                )}
              </p>
            )}
          </div>
        )}

        {issue.status === 'REJECTED' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="font-medium text-red-500">
              {issue.rejectionFinal ? 'Rejected (Final)' : 'Rejected'}
            </p>
            {issue.rejectionReason && (
              <p className="text-sm text-muted-foreground mt-1">{issue.rejectionReason}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
