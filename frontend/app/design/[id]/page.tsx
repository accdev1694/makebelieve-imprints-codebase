import { use } from 'react';
import DesignDetailsClient from './DesignDetailsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Required for static export - returns empty array for client-side routing

export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function DesignDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  return <DesignDetailsClient designId={id} />;
}
