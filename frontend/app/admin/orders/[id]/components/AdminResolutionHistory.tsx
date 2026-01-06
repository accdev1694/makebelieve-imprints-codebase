'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Resolution, getResolutionStatusColor, getReasonLabel } from './types';

interface AdminResolutionHistoryProps {
  resolutions: Resolution[];
}

export function AdminResolutionHistory({ resolutions }: AdminResolutionHistoryProps) {
  if (resolutions.length === 0) {
    return null;
  }

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Resolution History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {resolutions.map((resolution) => (
          <div
            key={resolution.id}
            className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm"
          >
            <div className="flex justify-between items-start">
              <Badge className={`${getResolutionStatusColor(resolution.status)} border`}>
                {resolution.type}
              </Badge>
              <Badge variant="outline" className={getResolutionStatusColor(resolution.status)}>
                {resolution.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium">Reason:</span> {getReasonLabel(resolution.reason)}
            </p>
            {resolution.notes && (
              <p className="text-muted-foreground">
                <span className="font-medium">Notes:</span> {resolution.notes}
              </p>
            )}
            {resolution.reprintOrderId && (
              <p className="text-muted-foreground">
                <span className="font-medium">Reprint Order:</span>{' '}
                <Link
                  href={`/admin/orders/${resolution.reprintOrderId}`}
                  className="text-primary hover:underline"
                >
                  {resolution.reprintOrderId.slice(0, 8).toUpperCase()}
                </Link>
              </p>
            )}
            {resolution.refundAmount && (
              <p className="text-muted-foreground">
                <span className="font-medium">Refund:</span> &pound;{Number(resolution.refundAmount).toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70">
              {new Date(resolution.createdAt).toLocaleString('en-GB')}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
