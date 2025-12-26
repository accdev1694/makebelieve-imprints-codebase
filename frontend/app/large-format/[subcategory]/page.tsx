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
    title: `${title} | Large Format Printing | MakeBelieve Imprints`,
    description: `Custom ${title.toLowerCase()} printing for events, retail, and outdoor advertising. High-quality large format prints.`,
  };
}

export default function LargeFormatSubcategoryPage({ params }: PageProps) {
  const { subcategory } = use(params);

  return <SubcategoryPage categorySlug="large-format" subcategorySlug={subcategory} />;
}
