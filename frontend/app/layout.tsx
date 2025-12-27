import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { NativeProvider } from '@/providers/NativeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// Configure Inter font (body text)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

// Configure Poppins font (headings)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MakeBelieve Imprints',
  description: 'Custom print service with personalized designs and templates',
  keywords: ['custom prints', 'personalized gifts', 'design templates', 'photo printing'],
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', rel: 'icon' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        <QueryProvider>
          <NativeProvider>
            <AuthProvider>
              <CartProvider>
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
                <CartDrawer />
              </CartProvider>
            </AuthProvider>
          </NativeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
