'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { IssueDetailsClient } from './components/IssueDetailsClient';

function AdminIssueDetailContent() {
  const params = useParams();
  const issueId = params.id as string;

  return <IssueDetailsClient issueId={issueId} />;
}

export default function AdminIssueDetailPage() {
  return (
    <ProtectedRoute>
      <AdminIssueDetailContent />
    </ProtectedRoute>
  );
}
