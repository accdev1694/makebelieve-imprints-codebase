'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Order } from '@/lib/api/orders';
import { Resolution, getReasonLabel } from './types';

interface AdminIssueResolutionProps {
  order: Order;
  pendingIssues: Resolution[];
  onOpenReprintModal: () => void;
  onOpenRefundModal: () => void;
  onOpenProcessIssueModal: (issue: Resolution, action: 'REPRINT' | 'REFUND') => void;
}

export function AdminIssueResolution({
  order,
  pendingIssues,
  onOpenReprintModal,
  onOpenRefundModal,
  onOpenProcessIssueModal,
}: AdminIssueResolutionProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Issue Resolution
          {pendingIssues.length > 0 && (
            <Badge className="bg-red-500 text-white">
              {pendingIssues.length} Pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Handle customer issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Customer Issues */}
        {pendingIssues.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-yellow-500">Customer Reported Issues:</p>
            {pendingIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-yellow-500">
                      {getReasonLabel(issue.reason)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported {new Date(issue.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                    Awaiting Review
                  </Badge>
                </div>
                {issue.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    &quot;{issue.notes}&quot;
                  </p>
                )}
                {/* Customer uploaded images */}
                {issue.imageUrls && issue.imageUrls.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Customer Photos:</p>
                    <div className="flex flex-wrap gap-2">
                      {issue.imageUrls.map((url, imgIndex) => (
                        <a
                          key={imgIndex}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors relative"
                        >
                          <Image
                            src={url}
                            alt={`Issue photo ${imgIndex + 1}`}
                            fill
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                    onClick={() => onOpenProcessIssueModal(issue, 'REPRINT')}
                  >
                    Approve Reprint
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-orange-500/50 text-orange-500 hover:text-orange-600"
                    onClick={() => onOpenProcessIssueModal(issue, 'REFUND')}
                    disabled={order.status === 'pending'}
                  >
                    Issue Refund
                  </Button>
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}

        {/* Manual resolution options */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Or create a resolution manually:</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={onOpenReprintModal}
            disabled={order.status === 'cancelled' || order.status === 'refunded'}
          >
            Create Reprint Order
          </Button>
          <Button
            variant="outline"
            className="w-full text-orange-500 hover:text-orange-600 border-orange-500/50 hover:border-orange-600"
            onClick={onOpenRefundModal}
            disabled={order.status === 'cancelled' || order.status === 'refunded' || order.status === 'pending'}
          >
            Issue Refund
          </Button>
        </div>
        {order.status === 'refunded' && (
          <p className="text-sm text-muted-foreground text-center py-2">
            This order has been refunded.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
