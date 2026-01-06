'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Issue } from './types';

interface IssueOrderInfoProps {
  issue: Issue;
}

export function IssueOrderInfo({ issue }: IssueOrderInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">Order ID:</span>{' '}
          <Link href={`/admin/orders/${issue.orderItem.order.id}`} className="text-primary hover:underline font-mono">
            {issue.orderItem.order.id.slice(0, 8).toUpperCase()}
          </Link>
        </div>
        <div>
          <span className="text-muted-foreground">Order Status:</span>{' '}
          {issue.orderItem.order.status}
        </div>
        {issue.orderItem.order.trackingNumber && (
          <div>
            <span className="text-muted-foreground">Tracking:</span>{' '}
            <span className="font-mono text-xs">{issue.orderItem.order.trackingNumber}</span>
          </div>
        )}
        {issue.orderItem.order.carrier && (
          <div>
            <span className="text-muted-foreground">Carrier:</span>{' '}
            {issue.orderItem.order.carrier}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
