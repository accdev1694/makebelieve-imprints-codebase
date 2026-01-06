'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, RefreshCw, DollarSign, Info, Lock, Unlock } from 'lucide-react';
import { Issue, ReviewAction, canReviewIssue, canProcessIssue, canConcludeIssue, canReopenIssue } from './types';

interface IssueStatusManagerProps {
  issue: Issue;
  actionLoading: boolean;
  onReviewAction: (action: ReviewAction) => void;
  onProcess: () => void;
  onConclude: () => void;
  onReopen: () => void;
}

export function IssueStatusManager({
  issue,
  actionLoading,
  onReviewAction,
  onProcess,
  onConclude,
  onReopen,
}: IssueStatusManagerProps) {
  const canReview = canReviewIssue(issue);
  const canProcess = canProcessIssue(issue);
  const canConclude = canConcludeIssue(issue);
  const canReopen = canReopenIssue(issue);

  if (!canReview && !canProcess && !canConclude && !canReopen) {
    return null;
  }

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canReview && (
          <>
            <Button
              className="w-full bg-purple-500 hover:bg-purple-600"
              onClick={() => onReviewAction('approve_reprint')}
              disabled={actionLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Approve Reprint
            </Button>
            <Button
              className="w-full bg-green-500 hover:bg-green-600"
              onClick={() => onReviewAction('approve_refund')}
              disabled={actionLoading}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Approve Refund
            </Button>
            <Button
              variant="outline"
              className="w-full border-orange-500/50 text-orange-500 hover:text-orange-600"
              onClick={() => onReviewAction('request_info')}
              disabled={actionLoading}
            >
              <Info className="w-4 h-4 mr-2" />
              Request More Info
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-500/50 text-red-500 hover:text-red-600"
              onClick={() => onReviewAction('reject')}
              disabled={actionLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Reject Issue
            </Button>
          </>
        )}

        {canProcess && (
          <Button
            className="w-full"
            onClick={onProcess}
            disabled={actionLoading}
          >
            <Check className="w-4 h-4 mr-2" />
            {issue.status === 'APPROVED_REPRINT' ? 'Create Reprint Order' : 'Process Refund'}
          </Button>
        )}

        {/* Conclude/Reopen Actions */}
        {(canReview || canProcess) && canConclude && (
          <div className="pt-2 border-t border-border" />
        )}

        {canConclude && (
          <Button
            variant="outline"
            className="w-full border-border text-muted-foreground hover:text-foreground"
            onClick={onConclude}
            disabled={actionLoading}
          >
            <Lock className="w-4 h-4 mr-2" />
            Conclude Issue
          </Button>
        )}

        {canReopen && (
          <Button
            variant="outline"
            className="w-full border-green-500/50 text-green-500 hover:text-green-600"
            onClick={onReopen}
            disabled={actionLoading}
          >
            <Unlock className="w-4 h-4 mr-2" />
            Reopen Issue
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
