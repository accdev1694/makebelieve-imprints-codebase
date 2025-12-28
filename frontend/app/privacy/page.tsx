import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Privacy <span className="text-primary">Policy</span>
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
              MakeBelieve Imprints ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our website and services.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <p>
              We collect information you provide directly, including:
            </p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, password when you create an account</li>
              <li><strong>Order Information:</strong> Shipping address, billing address, phone number, payment details</li>
              <li><strong>Design Content:</strong> Images, text, and designs you upload for printing</li>
              <li><strong>Communication:</strong> Messages you send to us via contact forms or email</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <p>
              When you visit our website, we automatically collect:
            </p>
            <ul>
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent</li>
              <li>Referring website</li>
              <li>Cookie data (see Cookie Policy)</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>
              We use your information to:
            </p>
            <ul>
              <li>Process and fulfill your orders</li>
              <li>Create and manage your account</li>
              <li>Communicate about your orders and our services</li>
              <li>Provide customer support</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>4. Legal Basis for Processing (UK GDPR)</h2>
            <p>
              We process your personal data based on:
            </p>
            <ul>
              <li><strong>Contract:</strong> To fulfill orders and provide services you've requested</li>
              <li><strong>Legitimate Interests:</strong> To improve our services and prevent fraud</li>
              <li><strong>Consent:</strong> For marketing communications and non-essential cookies</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
            </ul>

            <h2>5. Sharing Your Information</h2>
            <p>
              We may share your information with:
            </p>
            <ul>
              <li><strong>Service Providers:</strong> Payment processors, shipping carriers, email services</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
            </ul>
            <p>
              We do not sell your personal information to third parties.
            </p>

            <h2>6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data, including:
            </p>
            <ul>
              <li>SSL encryption for data transmission</li>
              <li>Secure password storage</li>
              <li>Regular security assessments</li>
              <li>Access controls and staff training</li>
            </ul>

            <h2>7. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to:
            </p>
            <ul>
              <li>Fulfill the purposes described in this policy</li>
              <li>Comply with legal requirements</li>
              <li>Resolve disputes and enforce agreements</li>
            </ul>
            <p>
              Order data is typically retained for 7 years for accounting purposes. Account data is retained until you request deletion.
            </p>

            <h2>8. Your Rights</h2>
            <p>
              Under UK GDPR, you have the right to:
            </p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for marketing at any time</li>
            </ul>
            <p>
              To exercise these rights, please contact us at admin@makebelieveimprints.co.uk.
            </p>

            <h2>9. Cookies</h2>
            <p>
              We use cookies and similar technologies to enhance your experience. For detailed information, please see our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>

            <h2>10. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party sites. We are not responsible for their privacy practices. We encourage you to review their privacy policies.
            </p>

            <h2>11. Children's Privacy</h2>
            <p>
              Our services are not directed to children under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us.
            </p>

            <h2>12. International Transfers</h2>
            <p>
              We primarily store and process data in the UK. If data is transferred internationally, we ensure appropriate safeguards are in place.
            </p>

            <h2>13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes by posting a notice on our website or sending an email.
            </p>

            <h2>14. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at:
            </p>
            <ul>
              <li>Email: admin@makebelieveimprints.co.uk</li>
              <li>Contact Form: <Link href="/contact" className="text-primary hover:underline">Contact Page</Link></li>
            </ul>

            <h2>15. Supervisory Authority</h2>
            <p>
              You have the right to lodge a complaint with the Information Commissioner's Office (ICO) if you believe your data protection rights have been violated.
            </p>
            <ul>
              <li>Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a></li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
