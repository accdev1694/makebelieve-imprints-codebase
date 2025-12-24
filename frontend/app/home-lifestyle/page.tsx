import { Metadata } from 'next';
import { CategoryLandingPage } from '@/components/category/CategoryLandingPage';

export const metadata: Metadata = {
  title: 'Home & Lifestyle | MakeBelieve Imprints',
  description: 'Custom printed mugs, t-shirts, cushions, water bottles, and more. Personalize your everyday items with your own designs.',
};

export default function HomeLifestylePage() {
  return (
    <CategoryLandingPage
      categorySlug="home-lifestyle"
      categoryName="Home & Lifestyle"
      categoryDescription="Transform everyday items into personalized treasures. From custom mugs to printed t-shirts, make your lifestyle uniquely yours."
    />
  );
}
