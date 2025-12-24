import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Percent, Clock, Users, CheckCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bulk & Trade Orders | MakeBelieve Imprints',
  description: 'Volume discounts for bulk orders. Trade accounts available for businesses and resellers.',
};

export default function BulkOrdersPage() {
  const discountTiers = [
    { quantity: '50-99 units', discount: '10% off' },
    { quantity: '100-249 units', discount: '15% off' },
    { quantity: '250-499 units', discount: '20% off' },
    { quantity: '500-999 units', discount: '25% off' },
    { quantity: '1000+ units', discount: '30% off' },
  ];

  const benefits = [
    {
      icon: Percent,
      title: 'Volume Discounts',
      description: 'Save up to 30% on large orders with our tiered pricing structure.',
    },
    {
      icon: Clock,
      title: 'Priority Production',
      description: 'Bulk orders get priority scheduling to meet your deadlines.',
    },
    {
      icon: Users,
      title: 'Dedicated Support',
      description: 'Get a dedicated account manager for personalized service.',
    },
    {
      icon: Package,
      title: 'Flexible Delivery',
      description: 'Split deliveries to multiple locations at no extra cost.',
    },
  ];

  const popularProducts = [
    { name: 'Custom T-Shirts', minOrder: '25 units', leadTime: '5-7 days' },
    { name: 'Business Cards', minOrder: '250 cards', leadTime: '3-5 days' },
    { name: 'Promotional Mugs', minOrder: '25 units', leadTime: '5-7 days' },
    { name: 'Vinyl Banners', minOrder: '5 units', leadTime: '3-5 days' },
    { name: 'Tote Bags', minOrder: '25 units', leadTime: '7-10 days' },
    { name: 'Brochures', minOrder: '100 units', leadTime: '5-7 days' },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Bulk & Trade Orders
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Big savings on large orders. Whether you&apos;re a business, event organizer,
              or reseller, we&apos;ve got competitive pricing for volume orders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#quote-form">
                <Button size="lg" variant="secondary">
                  Get a Quote
                </Button>
              </Link>
              <Link href="/trade">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Apply for Trade Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Order in Bulk?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardContent className="pt-6 text-center">
                  <benefit.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Discount Tiers */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Volume Discounts</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            The more you order, the more you save. Our tiered pricing makes bulk ordering
            more affordable than ever.
          </p>
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {discountTiers.map((tier, index) => (
                    <div
                      key={tier.quantity}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{tier.quantity}</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{tier.discount}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-6 text-center">
                  * Discounts apply to most products. Some exclusions may apply.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Popular Products */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Bulk Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularProducts.map((product) => (
              <Card key={product.name} className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum Order:</span>
                      <span className="font-medium">{product.minOrder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead Time:</span>
                      <span className="font-medium">{product.leadTime}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 gap-2">
                    Get Quote <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quote Form */}
        <section id="quote-form" className="mb-16">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Request a Bulk Order Quote</CardTitle>
              <p className="text-muted-foreground mt-2">
                Fill out the form below and we&apos;ll get back to you within 24 hours.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name *</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name *</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <input
                      type="email"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Products Interested In *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select a product category</option>
                    <option value="apparel">Apparel (T-Shirts, Caps, etc.)</option>
                    <option value="promotional">Promotional Items (Mugs, Bags, etc.)</option>
                    <option value="stationery">Business Stationery</option>
                    <option value="signage">Signage & Banners</option>
                    <option value="packaging">Packaging</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Quantity *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select quantity range</option>
                    <option value="50-99">50 - 99 units</option>
                    <option value="100-249">100 - 249 units</option>
                    <option value="250-499">250 - 499 units</option>
                    <option value="500-999">500 - 999 units</option>
                    <option value="1000+">1000+ units</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Project Details *</label>
                  <textarea
                    rows={4}
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Tell us about your project, including any specific requirements, colors, or deadlines..."
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="text-sm font-medium">Upload Files (Optional)</label>
                  <input
                    type="file"
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.ai,.psd"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted formats: PDF, JPG, PNG, AI, PSD (Max 10MB each)
                  </p>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Submit Quote Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Trade Account CTA */}
        <section className="text-center py-12 bg-muted/30 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Regular Bulk Orders?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Apply for a trade account to get exclusive pricing, NET payment terms,
            and a dedicated account manager.
          </p>
          <Link href="/trade">
            <Button size="lg" className="gap-2">
              Apply for Trade Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </div>
    </main>
  );
}
