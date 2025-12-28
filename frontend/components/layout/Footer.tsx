'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, CreditCard, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from './header/Logo';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
  { label: 'Shipping Info', href: '/shipping' },
  { label: 'Returns', href: '/returns' },
];

const CATEGORY_LINKS = [
  { label: 'Home & Lifestyle', href: '/home-lifestyle' },
  { label: 'Stationery', href: '/stationery' },
  { label: 'Large Format', href: '/large-format' },
  { label: 'Photo Prints', href: '/photo-prints' },
  { label: 'Digital Downloads', href: '/digital-downloads' },
];

const ACCOUNT_LINKS = [
  { label: 'My Dashboard', href: '/dashboard' },
  { label: 'My Orders', href: '/orders' },
  { label: 'My Designs', href: '/design/my-designs' },
  { label: 'Track Order', href: '/track' },
];

const SOCIAL_LINKS = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'FOOTER' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to subscribe');
        return;
      }

      setMessage(data.message);
      setSubscribed(true);
      setEmail('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-card border-t border-border">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Logo size="lg" className="mb-4" />
            <p className="text-muted-foreground text-sm mb-4 max-w-sm">
              Your trusted custom print service. Quality prints, personalized with care,
              delivered to your door.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 mb-4 text-sm">
              <a
                href="mailto:admin@makebelieveimprints.co.uk"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                admin@makebelieveimprints.co.uk
              </a>
              <a
                href="tel:+447389100532"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                +44 7389 100532
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'bg-muted hover:bg-primary hover:text-primary-foreground',
                    'transition-colors'
                  )}
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              {CATEGORY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="font-semibold mb-4">Your Account</h3>
            <ul className="space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Stay Updated</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get 10% off your first order and exclusive deals.
            </p>
            {subscribed ? (
              <p className="text-sm text-primary font-medium">
                {message || 'Check your email to confirm!'}
              </p>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background"
                />
                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full btn-gradient"
                  size="sm"
                  loading={loading}
                >
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
            <span className="text-sm">We accept:</span>
            <div className="flex gap-2 text-xs">
              <span className="px-3 py-1.5 bg-muted rounded flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Visa
              </span>
              <span className="px-3 py-1.5 bg-muted rounded flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Mastercard
              </span>
              <span className="px-3 py-1.5 bg-muted rounded">PayPal</span>
              <span className="px-3 py-1.5 bg-muted rounded">Apple Pay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MakeBelieve Imprints. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
