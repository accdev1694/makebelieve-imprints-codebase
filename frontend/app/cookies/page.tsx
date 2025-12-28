import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Cookie <span className="text-primary">Policy</span>
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
            <h2>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit a website. They help websites remember your preferences, understand how you use the site, and improve your experience.
            </p>

            <h2>2. How We Use Cookies</h2>
            <p>
              MakeBelieve Imprints uses cookies for various purposes, including:
            </p>
            <ul>
              <li>Keeping you signed in to your account</li>
              <li>Remembering items in your shopping cart</li>
              <li>Understanding how you use our website</li>
              <li>Improving our website and services</li>
              <li>Providing personalized content</li>
            </ul>

            <h2>3. Types of Cookies We Use</h2>

            <h3>3.1 Essential Cookies</h3>
            <p>
              These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Cookie</th>
                  <th className="text-left p-2 border-b">Purpose</th>
                  <th className="text-left p-2 border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b">session_id</td>
                  <td className="p-2 border-b">User authentication</td>
                  <td className="p-2 border-b">Session</td>
                </tr>
                <tr>
                  <td className="p-2 border-b">cart_token</td>
                  <td className="p-2 border-b">Shopping cart</td>
                  <td className="p-2 border-b">7 days</td>
                </tr>
                <tr>
                  <td className="p-2 border-b">csrf_token</td>
                  <td className="p-2 border-b">Security</td>
                  <td className="p-2 border-b">Session</td>
                </tr>
              </tbody>
            </table>

            <h3>3.2 Functional Cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalization, such as remembering your preferences.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Cookie</th>
                  <th className="text-left p-2 border-b">Purpose</th>
                  <th className="text-left p-2 border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b">theme</td>
                  <td className="p-2 border-b">Dark/light mode preference</td>
                  <td className="p-2 border-b">1 year</td>
                </tr>
                <tr>
                  <td className="p-2 border-b">currency</td>
                  <td className="p-2 border-b">Currency preference</td>
                  <td className="p-2 border-b">1 year</td>
                </tr>
              </tbody>
            </table>

            <h3>3.3 Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Cookie</th>
                  <th className="text-left p-2 border-b">Purpose</th>
                  <th className="text-left p-2 border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b">_ga</td>
                  <td className="p-2 border-b">Google Analytics - user identification</td>
                  <td className="p-2 border-b">2 years</td>
                </tr>
                <tr>
                  <td className="p-2 border-b">_gid</td>
                  <td className="p-2 border-b">Google Analytics - session identification</td>
                  <td className="p-2 border-b">24 hours</td>
                </tr>
              </tbody>
            </table>

            <h3>3.4 Marketing Cookies</h3>
            <p>
              These cookies are used to track visitors across websites to display relevant advertisements.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Cookie</th>
                  <th className="text-left p-2 border-b">Purpose</th>
                  <th className="text-left p-2 border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b">_fbp</td>
                  <td className="p-2 border-b">Facebook Pixel</td>
                  <td className="p-2 border-b">3 months</td>
                </tr>
              </tbody>
            </table>

            <h2>4. Managing Cookies</h2>
            <h3>4.1 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul>
              <li>View cookies stored on your device</li>
              <li>Delete existing cookies</li>
              <li>Block all or certain cookies</li>
              <li>Set preferences for specific websites</li>
            </ul>
            <p>
              Please note that blocking essential cookies may affect website functionality.
            </p>

            <h3>4.2 Browser-Specific Instructions</h3>
            <ul>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
            </ul>

            <h2>5. Third-Party Cookies</h2>
            <p>
              Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. The third parties have their own privacy policies:
            </p>
            <ul>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Privacy Policy</a></li>
              <li><a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Facebook Privacy Policy</a></li>
            </ul>

            <h2>6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date.
            </p>

            <h2>7. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies, please contact us:
            </p>
            <ul>
              <li>Email: admin@makebelieveimprints.co.uk</li>
              <li>Contact Form: <Link href="/contact" className="text-primary hover:underline">Contact Page</Link></li>
            </ul>

            <p className="mt-8">
              For more information about how we handle your personal data, please see our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
