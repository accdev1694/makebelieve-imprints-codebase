import { Metadata } from 'next';
import { CategoryLandingPage } from '@/components/category/CategoryLandingPage';

export const metadata: Metadata = {
  title: 'Digital Downloads | MakeBelieve Imprints',
  description: 'Instant download templates, graphics, fonts, and design assets. Professional digital resources for your creative projects.',
};

export default function DigitalDownloadsPage() {
  return (
    <CategoryLandingPage
      categorySlug="digital"
      categoryName="Digital Downloads"
      categoryDescription="Instant access to professional design resources. Templates, graphics, fonts, and more for your creative projects."
    />
  );
}
