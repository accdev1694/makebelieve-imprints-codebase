import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Terms of <span className="text-primary">Service</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Last updated: December 2024
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto max-w-4xl px-4 py-12">
        <Card className="card-glow">
          <CardContent className="prose prose-sm max-w-none py-8 px-6 md:px-8">
            <h2>1. Introduction</h2>
            <p>
              Welcome to MakeBelieve Imprints. These Terms of Service ("Terms") govern your use of our website and services. By accessing or using our services, you agree to be bound by these Terms.
            </p>

            <h2>2. Services</h2>
            <p>
              MakeBelieve Imprints provides custom printing services, including but not limited to:
            </p>
            <ul>
              <li>Custom product printing (mugs, t-shirts, keychains, etc.)</li>
              <li>Business stationery printing</li>
              <li>Large format printing</li>
              <li>Photo printing services</li>
              <li>Digital templates and downloads</li>
            </ul>

            <h2>3. Orders and Payment</h2>
            <h3>3.1 Placing Orders</h3>
            <p>
              By placing an order, you confirm that you are at least 18 years old and have the legal authority to enter into this agreement. All orders are subject to acceptance and availability.
            </p>

            <h3>3.2 Pricing</h3>
            <p>
              All prices are displayed in GBP and include VAT where applicable. We reserve the right to modify prices at any time, but changes will not affect orders already placed.
            </p>

            <h3>3.3 Payment</h3>
            <p>
              Payment is required at the time of order. We accept major credit/debit cards and PayPal. All transactions are processed securely.
            </p>

            <h2>4. Custom Products</h2>
            <h3>4.1 Design Responsibility</h3>
            <p>
              You are responsible for ensuring that any designs, images, or content you upload:
            </p>
            <ul>
              <li>Do not infringe on any third-party intellectual property rights</li>
              <li>Do not contain offensive, defamatory, or illegal content</li>
              <li>Are of sufficient quality for the intended print size</li>
            </ul>

            <h3>4.2 Proof Approval</h3>
            <p>
              For orders where a proof is provided, you are responsible for reviewing and approving the proof before production begins. We are not liable for errors that were visible in the approved proof.
            </p>

            <h2>5. Intellectual Property</h2>
            <p>
              You retain ownership of any original content you upload. By uploading content, you grant us a non-exclusive license to use, reproduce, and modify it solely for the purpose of fulfilling your order.
            </p>
            <p>
              All website content, including designs, templates, and graphics created by MakeBelieve Imprints, remains our intellectual property and may not be copied or used without permission.
            </p>

            <h2>6. Delivery</h2>
            <p>
              We aim to dispatch orders within the stated production times. Delivery times are estimates and not guaranteed. We are not liable for delays caused by factors outside our control.
            </p>
            <p>
              Risk of loss passes to you upon delivery. Please ensure the delivery address provided is correct.
            </p>

            <h2>7. Returns and Refunds</h2>
            <p>
              Due to the custom nature of our products, we cannot accept returns for change of mind. Please see our <Link href="/returns" className="text-primary hover:underline">Returns Policy</Link> for full details on when refunds and replacements are available.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law:
            </p>
            <ul>
              <li>Our liability is limited to the value of your order</li>
              <li>We are not liable for indirect, consequential, or incidental damages</li>
              <li>We are not responsible for issues arising from customer-provided content</li>
            </ul>

            <h2>9. Website Use</h2>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use the website for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of the website</li>
              <li>Upload malicious code or content</li>
            </ul>

            <h2>10. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> to understand how we collect, use, and protect your personal information.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of our services after changes constitutes acceptance of the new Terms. We recommend reviewing this page periodically.
            </p>

            <h2>12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>

            <h2>13. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <ul>
              <li>Email: hello@makebelieveimprints.com</li>
              <li>Contact Form: <Link href="/contact" className="text-primary hover:underline">Contact Page</Link></li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
