'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Issue } from './types';

interface IssueConcludedStatusProps {
  issue: Issue;
}

export function IssueConcludedStatus({ issue }: IssueConcludedStatusProps) {
  if (!issue.isConcluded) {
    return null;
  }

  return (
    <Card className="border-border bg-muted/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-muted-foreground">Issue Concluded</p>
            <p className="text-sm text-muted-foreground mt-1">
              This issue has been concluded. No further actions by the customer are possible.
            </p>
            {issue.concludedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Concluded {format(new Date(issue.concludedAt), 'PPP')} at {format(new Date(issue.concludedAt), 'p')}
              </p>
            )}
            {issue.concludedReason && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                &quot;{issue.concludedReason}&quot;
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
