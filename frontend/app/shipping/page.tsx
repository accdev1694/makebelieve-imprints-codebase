import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Clock, Package, MapPin, CheckCircle } from 'lucide-react';

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Shipping <span className="text-primary">Information</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about how we deliver your orders
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto max-w-4xl px-4 py-12">
        {/* Shipping Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="card-glow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Standard Delivery</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-3xl font-bold text-primary mb-2">3-5 days</p>
              <p className="text-muted-foreground mb-4">Business days</p>
              <p className="text-sm">
                <span className="font-semibold">Free</span> on orders over £50
              </p>
              <p className="text-sm text-muted-foreground">£3.99 otherwise</p>
            </CardContent>
          </Card>

          <Card className="card-glow border-primary">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Express Delivery</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-3xl font-bold text-primary mb-2">1-2 days</p>
              <p className="text-muted-foreground mb-4">Business days</p>
              <p className="text-sm font-semibold">£7.99</p>
              <p className="text-sm text-muted-foreground">Faster delivery</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Rush Delivery</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-3xl font-bold text-primary mb-2">Next Day</p>
              <p className="text-muted-foreground mb-4">Order by 12pm</p>
              <p className="text-sm font-semibold">£14.99</p>
              <p className="text-sm text-muted-foreground">Priority production</p>
            </CardContent>
          </Card>
        </div>

        {/* Shipping Details */}
        <div className="space-y-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Delivery Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We currently ship to all addresses within the United Kingdom, including:
              </p>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  England
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Wales
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Scotland
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Northern Ireland
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Channel Islands
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Isle of Man
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Note: Delivery times to Scottish Highlands, Northern Ireland, and remote areas may take an additional 1-2 business days.
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Production Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                All our products are custom-made to order. Here are the typical production times:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Standard Products</p>
                  <p className="text-sm text-muted-foreground">1-2 business days</p>
                  <p className="text-xs text-muted-foreground mt-1">Mugs, t-shirts, keychains, etc.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Large Format Prints</p>
                  <p className="text-sm text-muted-foreground">2-3 business days</p>
                  <p className="text-xs text-muted-foreground mt-1">Banners, posters, signage</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Stationery Items</p>
                  <p className="text-sm text-muted-foreground">2-5 business days</p>
                  <p className="text-xs text-muted-foreground mt-1">Business cards, brochures, leaflets</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Photo Products</p>
                  <p className="text-sm text-muted-foreground">3-5 business days</p>
                  <p className="text-xs text-muted-foreground mt-1">Canvas prints, photo books, albums</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Tracking Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Once your order has been dispatched, you'll receive a confirmation email with your tracking number. You can track your order:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Via the tracking link in your email</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>In your account dashboard under "My Orders"</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>On our Track Order page with your order number</span>
                </li>
              </ul>
              <div className="pt-4">
                <Link href="/track">
                  <Button variant="outline">Track Your Order</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact CTA */}
        <Card className="card-glow mt-12">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Questions about shipping?</h2>
            <p className="text-muted-foreground mb-6">
              Our team is ready to help with any shipping-related queries.
            </p>
            <Link href="/contact">
              <Button className="btn-gradient">Contact Us</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
