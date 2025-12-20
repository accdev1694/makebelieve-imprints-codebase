import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MakeBelieve Imprints',
  description: 'Custom print service with personalized designs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
