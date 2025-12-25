import { use } from 'react';
import { Metadata } from 'next';
import { SubcategoryPage } from '@/components/category/SubcategoryPage';

interface PageProps {
  params: Promise<{ subcategory: string }>;
}

// Required for static export - returns empty array for client-side routing
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subcategory } = await params;
  const title = subcategory
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${title} | Home & Lifestyle | MakeBelieve Imprints`,
    description: `Shop our custom ${title.toLowerCase()} collection. Personalize with your own designs or choose from our templates.`,
  };
}

export default function HomeLifestyleSubcategoryPage({ params }: PageProps) {
  const { subcategory } = use(params);

  return <SubcategoryPage categorySlug="home-lifestyle" subcategorySlug={subcategory} />;
}
