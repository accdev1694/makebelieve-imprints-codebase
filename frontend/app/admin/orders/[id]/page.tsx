import { use } from 'react';
import AdminOrderDetailsClient from './AdminOrderDetailsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Required for static export - returns empty array for client-side routing
export function generateStaticParams() {
  return [];
}

export default function AdminOrderDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  return <AdminOrderDetailsClient orderId={id} />;
}
