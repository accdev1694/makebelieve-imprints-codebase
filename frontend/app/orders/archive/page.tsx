import { redirect } from 'next/navigation';

/**
 * Legacy archive page - redirects to the unified orders page with completed tab
 */
export default function OrderArchivePage() {
  redirect('/orders?tab=completed');
}
