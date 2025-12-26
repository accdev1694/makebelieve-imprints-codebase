import { use } from 'react';
import ProductEditClient from './ProductEditClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Required for static export - admin pages are client-side rendered

export function generateStaticParams() {
  return [];
}

export default function ProductEditPage({ params }: PageProps) {
  const { id } = use(params);
  return <ProductEditClient productId={id} />;
}
