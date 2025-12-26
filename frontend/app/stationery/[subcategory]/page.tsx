import { use } from 'react';
import { Metadata } from 'next';
import { SubcategoryPage } from '@/components/category/SubcategoryPage';

interface PageProps {
  params: Promise<{ subcategory: string }>;
}

// Required for static export - returns empty array for client-side routing

export function generateStaticParams() {
  return [{ subcategory: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subcategory } = await params;
  const title = subcategory
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${title} | Stationery | MakeBelieve Imprints`,
    description: `Professional ${title.toLowerCase()} printing services. High-quality custom stationery for your business.`,
  };
}

export default function StationerySubcategoryPage({ params }: PageProps) {
  const { subcategory } = use(params);

  return <SubcategoryPage categorySlug="stationery" subcategorySlug={subcategory} />;
}
