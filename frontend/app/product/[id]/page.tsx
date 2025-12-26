import { use } from 'react';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Required for static export - returns empty array for client-side routing

export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <ProductDetailClient productId={id} />;
}
