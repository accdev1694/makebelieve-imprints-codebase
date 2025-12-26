import { use } from 'react';
import ProductEditClient from './ProductEditClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductEditPage({ params }: PageProps) {
  const { id } = use(params);
  return <ProductEditClient productId={id} />;
}
