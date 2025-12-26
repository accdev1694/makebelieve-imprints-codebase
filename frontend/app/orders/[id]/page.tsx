import { use } from 'react';
import OrderDetailsClient from './OrderDetailsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Required for static export - returns empty array for client-side routing

export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function OrderDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  return <OrderDetailsClient orderId={id} />;
}
