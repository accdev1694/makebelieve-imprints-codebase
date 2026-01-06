'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Issue } from './types';

interface IssueCustomerInfoProps {
  issue: Issue;
}

export function IssueCustomerInfo({ issue }: IssueCustomerInfoProps) {
  const { customer, shippingAddress } = issue.orderItem.order;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="font-medium">{customer.name}</div>
        <div>
          <a
            href={`mailto:${customer.email}`}
            className="text-primary hover:underline"
          >
            {customer.email}
          </a>
        </div>
        <div className="pt-2 border-t border-border text-muted-foreground">
          <p>{shippingAddress.addressLine1}</p>
          {shippingAddress.addressLine2 && (
            <p>{shippingAddress.addressLine2}</p>
          )}
          <p>
            {shippingAddress.city}, {shippingAddress.postcode}
          </p>
          <p>{shippingAddress.country}</p>
        </div>
      </CardContent>
    </Card>
  );
}
