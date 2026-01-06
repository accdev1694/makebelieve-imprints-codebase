'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck } from 'lucide-react';
import { Issue, CarrierFault } from './types';

interface IssueCarrierFaultProps {
  issue: Issue;
  actionLoading: boolean;
  onCarrierFaultChange: (value: CarrierFault) => void;
}

export function IssueCarrierFault({ issue, actionLoading, onCarrierFaultChange }: IssueCarrierFaultProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Carrier Fault
        </CardTitle>
        <CardDescription>
          Mark for insurance claims
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={issue.carrierFault}
          onValueChange={(value: CarrierFault) => onCarrierFaultChange(value)}
          disabled={actionLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNKNOWN">Unknown</SelectItem>
            <SelectItem value="CARRIER_FAULT">Carrier Fault</SelectItem>
            <SelectItem value="NOT_CARRIER_FAULT">Not Carrier Fault</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
