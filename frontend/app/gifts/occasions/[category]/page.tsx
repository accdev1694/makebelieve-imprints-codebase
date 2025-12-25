import OccasionPageClient from './OccasionPageClient';

// Required for static export - returns empty array for client-side routing
export function generateStaticParams() {
  return [];
}

export default function OccasionPage() {
  return <OccasionPageClient />;
}
