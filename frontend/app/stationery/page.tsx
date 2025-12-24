import { Metadata } from 'next';
import { CategoryLandingPage } from '@/components/category/CategoryLandingPage';

export const metadata: Metadata = {
  title: 'Stationery | MakeBelieve Imprints',
  description: 'Professional business cards, leaflets, brochures, and letterheads. High-quality stationery printing for your business.',
};

export default function StationeryPage() {
  return (
    <CategoryLandingPage
      categorySlug="stationery"
      categoryName="Stationery"
      categoryDescription="Professional printing for your business. From business cards to brochures, make a lasting impression with quality stationery."
    />
  );
}
