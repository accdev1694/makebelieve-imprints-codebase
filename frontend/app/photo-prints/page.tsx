import { Metadata } from 'next';
import { CategoryLandingPage } from '@/components/category/CategoryLandingPage';

export const metadata: Metadata = {
  title: 'Photo Prints | MakeBelieve Imprints',
  description: 'Canvas prints, aluminum prints, acrylic prints, and framed photos. Premium quality photo printing that lasts a lifetime.',
};

export default function PhotoPrintsPage() {
  return (
    <CategoryLandingPage
      categorySlug="photo-prints"
      categoryName="Photo Prints"
      categoryDescription="Transform your memories into stunning wall art. Museum-quality prints on canvas, aluminum, acrylic, and more."
    />
  );
}
