'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Issue, ClaimStatus } from './types';

interface IssueInsuranceClaimProps {
  issue: Issue;
  onSaveClaim: (data: {
    claimReference: string;
    claimStatus: ClaimStatus;
    claimPayoutAmount: string;
    claimNotes: string;
  }) => Promise<void>;
  onDownloadReport: () => Promise<void>;
}

export function IssueInsuranceClaim({ issue, onSaveClaim, onDownloadReport }: IssueInsuranceClaimProps) {
  const [claimReference, setClaimReference] = useState('');
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('NOT_FILED');
  const [claimPayoutAmount, setClaimPayoutAmount] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Sync claim fields when issue loads
  useEffect(() => {
    setClaimReference(issue.claimReference || '');
    setClaimStatus(issue.claimStatus || 'NOT_FILED');
    setClaimPayoutAmount(issue.claimPayoutAmount ? String(issue.claimPayoutAmount) : '');
    setClaimNotes(issue.claimNotes || '');
  }, [issue]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSaveClaim({
        claimReference,
        claimStatus,
        claimPayoutAmount,
        claimNotes,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await onDownloadReport();
    } finally {
      setDownloading(false);
    }
  };

  // Only show for carrier fault issues
  if (issue.carrierFault !== 'CARRIER_FAULT') {
    return null;
  }

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Insurance Claim
        </CardTitle>
        <CardDescription>
          Royal Mail compensation claim tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Download Report Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download className="w-4 h-4 mr-2" />
          {downloading ? 'Generating...' : 'Download Claim Report PDF'}
        </Button>

        {/* Claim Status */}
        <div>
          <Label className="text-xs text-muted-foreground">Claim Status</Label>
          <Select
            value={claimStatus}
            onValueChange={(value: ClaimStatus) => setClaimStatus(value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_FILED">Not Filed</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Claim Reference */}
        <div>
          <Label className="text-xs text-muted-foreground">Claim Reference</Label>
          <Input
            placeholder="e.g., RM-12345678"
            value={claimReference}
            onChange={(e) => setClaimReference(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Payout Amount - show if approved or paid */}
        {(claimStatus === 'APPROVED' || claimStatus === 'PAID') && (
          <div>
            <Label className="text-xs text-muted-foreground">Payout Amount (GBP)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={claimPayoutAmount}
              onChange={(e) => setClaimPayoutAmount(e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea
            placeholder="Any notes about this claim..."
            value={claimNotes}
            onChange={(e) => setClaimNotes(e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          loading={saving}
          className="w-full"
        >
          Save Claim Details
        </Button>

        {/* Show submitted date if available */}
        {issue.claimSubmittedAt && (
          <p className="text-xs text-muted-foreground text-center">
            Submitted: {format(new Date(issue.claimSubmittedAt), 'dd MMM yyyy')}
          </p>
        )}
        {issue.claimPaidAt && (
          <p className="text-xs text-green-500 text-center">
            Paid: {format(new Date(issue.claimPaidAt), 'dd MMM yyyy')} - £{issue.claimPayoutAmount?.toFixed(2)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
