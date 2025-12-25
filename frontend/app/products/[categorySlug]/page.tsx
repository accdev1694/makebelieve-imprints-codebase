import { use } from 'react';
import CategoryPageClient from './CategoryPageClient';

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

// Required for static export - returns empty array for client-side routing
export function generateStaticParams() {
  return [];
}

export default function CategoryPage({ params }: PageProps) {
  const { categorySlug } = use(params);
  return <CategoryPageClient categorySlug={categorySlug} />;
}
