import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Returns & <span className="text-primary">Refunds</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Our policy for returns, refunds, and replacements
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto max-w-4xl px-4 py-12">
        {/* Important Notice */}
        <Card className="card-glow border-amber-500/50 mb-8">
          <CardContent className="py-6">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">Important: Custom Products</h3>
                <p className="text-muted-foreground">
                  All our products are custom-made to your specifications. Due to the personalized nature of our products, we cannot accept returns for change of mind. However, we stand behind our quality and will always make things right if there's an issue with your order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Policy */}
        <div className="space-y-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                When We Accept Returns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We will happily provide a replacement or refund in the following cases:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Damaged in Transit</p>
                    <p className="text-sm text-muted-foreground">If your order arrives damaged or broken</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Print Quality Issues</p>
                    <p className="text-sm text-muted-foreground">If there are noticeable defects in print quality</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Wrong Item Received</p>
                    <p className="text-sm text-muted-foreground">If we sent you the wrong product or design</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Our Printing Error</p>
                    <p className="text-sm text-muted-foreground">If we made an error in printing your design</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                What We Cannot Accept
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Unfortunately, we cannot accept returns in the following cases:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Change of Mind</p>
                    <p className="text-sm text-muted-foreground">Products are custom-made and cannot be resold</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Customer Design Errors</p>
                    <p className="text-sm text-muted-foreground">Spelling mistakes or wrong images in your uploaded design</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Low Resolution Images</p>
                    <p className="text-sm text-muted-foreground">Blurry prints due to low-quality source images</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Color Differences</p>
                    <p className="text-sm text-muted-foreground">Minor color variations between screen and print (see our color note below)</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                How to Request a Return
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">1</div>
                  <p className="text-sm font-medium">Contact Us</p>
                  <p className="text-xs text-muted-foreground">Within 14 days of delivery</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">2</div>
                  <p className="text-sm font-medium">Provide Photos</p>
                  <p className="text-xs text-muted-foreground">Show the issue clearly</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">3</div>
                  <p className="text-sm font-medium">We Review</p>
                  <p className="text-xs text-muted-foreground">Usually within 24 hours</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">4</div>
                  <p className="text-sm font-medium">Resolution</p>
                  <p className="text-xs text-muted-foreground">Replacement or refund</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                To start a return request, email us at admin@makebelieveimprints.co.uk with your order number and photos of the issue. We'll get back to you within 24 hours.
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Refund Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Once your return request is approved:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Refunds are processed within 5-7 business days
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Refund will be issued to your original payment method
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  You'll receive an email confirmation when processed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Bank processing may take an additional 3-5 days
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Color Note */}
          <Card className="card-glow bg-primary/5">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-2">A Note About Colors</h3>
              <p className="text-sm text-muted-foreground">
                Please be aware that colors on screen may appear differently in print due to the difference between digital displays (RGB) and printing (CMYK). Minor color variations are normal and do not constitute a defect. If color accuracy is critical for your project, please contact us before ordering to discuss proofing options.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact CTA */}
        <Card className="card-glow mt-12">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Need to request a return?</h2>
            <p className="text-muted-foreground mb-6">
              Contact us with your order number and we'll help resolve any issues.
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
