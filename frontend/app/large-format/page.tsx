import { Metadata } from 'next';
import { CategoryLandingPage } from '@/components/category/CategoryLandingPage';

export const metadata: Metadata = {
  title: 'Large Format Printing | MakeBelieve Imprints',
  description: 'Vinyl banners, roll-up banners, posters, and signage. High-impact large format printing for events and advertising.',
};

export default function LargeFormatPage() {
  return (
    <CategoryLandingPage
      categorySlug="large-format"
      categoryName="Large Format"
      categoryDescription="Make a big impression with our large format printing. Perfect for events, retail displays, and outdoor advertising."
    />
  );
}
