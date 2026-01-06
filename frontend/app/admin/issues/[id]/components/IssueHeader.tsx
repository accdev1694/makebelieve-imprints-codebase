'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { Issue, STATUS_COLORS, STATUS_LABELS } from './types';

interface IssueHeaderProps {
  issue: Issue;
}

export function IssueHeader({ issue }: IssueHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/returns">
            <Button variant="ghost" size="sm">
              &larr; Back to Issues
            </Button>
          </Link>
          <h1 className="text-xl font-bold">
            <span className="text-neon-gradient">Issue Management</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${STATUS_COLORS[issue.status]} border`}>
            {STATUS_LABELS[issue.status]}
          </Badge>
          {issue.isConcluded && (
            <Badge className="bg-muted text-muted-foreground border-border border">
              <Lock className="w-3 h-3 mr-1" />
              Concluded
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
