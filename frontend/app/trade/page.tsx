import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Percent, Clock, Users, Shield, CheckCircle, ArrowRight, Briefcase, CreditCard, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Trade & Corporate Accounts | MakeBelieve Imprints',
  description: 'Exclusive trade pricing for businesses and resellers. Apply for a trade account and enjoy wholesale rates.',
};

export default function TradePage() {
  const benefits = [
    {
      icon: Percent,
      title: 'Wholesale Pricing',
      description: 'Access exclusive trade discounts of up to 40% off retail prices on all products.',
    },
    {
      icon: CreditCard,
      title: 'NET Payment Terms',
      description: 'Approved accounts receive NET 30 payment terms with flexible credit limits.',
    },
    {
      icon: Users,
      title: 'Dedicated Account Manager',
      description: 'Get personalized support from a dedicated account manager who knows your business.',
    },
    {
      icon: Truck,
      title: 'Priority Fulfilment',
      description: 'Trade orders get priority production and shipping to meet your deadlines.',
    },
    {
      icon: Shield,
      title: 'White Label Options',
      description: 'Offer branded packaging with your company details for a seamless customer experience.',
    },
    {
      icon: Clock,
      title: 'Quick Turnaround',
      description: 'Rush orders available with expedited production when you need it most.',
    },
  ];

  const accountTypes = [
    {
      title: 'Trade Account',
      description: 'For print resellers, design agencies, and marketing companies.',
      requirements: [
        'Registered business (Ltd, PLC, or sole trader)',
        'Valid VAT number (if applicable)',
        'Minimum monthly order value of £250',
        'Trade references may be required',
      ],
      perks: ['Up to 30% discount', 'NET 14 payment terms', 'Dedicated account manager'],
    },
    {
      title: 'Corporate Account',
      description: 'For businesses with regular bulk printing needs.',
      requirements: [
        'Established business with verifiable history',
        'Regular ordering requirements',
        'Minimum order value of £500/month',
        'Credit check may be required',
      ],
      perks: ['Up to 40% discount', 'NET 30 payment terms', 'Priority support line', 'Custom branding options'],
    },
  ];

  const industries = [
    { name: 'Marketing Agencies', icon: Briefcase },
    { name: 'Event Planners', icon: Users },
    { name: 'Print Resellers', icon: Building2 },
    { name: 'Corporate Offices', icon: Building2 },
    { name: 'Schools & Universities', icon: Building2 },
    { name: 'Charities & Non-profits', icon: Users },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm mb-6">
              <Building2 className="h-4 w-4" />
              For Businesses & Resellers
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Trade & Corporate Accounts
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Join hundreds of businesses who trust MakeBelieve Imprints for their printing needs.
              Enjoy exclusive wholesale pricing, flexible payment terms, and dedicated support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#apply">
                <Button size="lg" variant="secondary">
                  Apply Now
                </Button>
              </Link>
              <Link href="#benefits">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Benefits */}
        <section id="benefits" className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Trade Account Benefits</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Our trade program is designed to help your business grow with competitive pricing and premium support.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardContent className="pt-6">
                  <benefit.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Account Types */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Account Type</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {accountTypes.map((account) => (
              <Card key={account.title} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-purple-600" />
                <CardHeader>
                  <CardTitle className="text-xl">{account.title}</CardTitle>
                  <p className="text-muted-foreground">{account.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Requirements:</h4>
                    <ul className="space-y-2">
                      {account.requirements.map((req) => (
                        <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">What You Get:</h4>
                    <ul className="space-y-2">
                      {account.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="#apply">
                    <Button className="w-full gap-2">
                      Apply for {account.title} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Industries */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Who We Work With</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            We partner with businesses across various industries to deliver quality print solutions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry) => (
              <Card key={industry.name} className="text-center hover:border-primary transition-colors">
                <CardContent className="pt-6">
                  <industry.icon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">{industry.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Application Form */}
        <section id="apply" className="mb-16">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Apply for a Trade Account</CardTitle>
              <p className="text-muted-foreground mt-2">
                Complete the form below and we&apos;ll review your application within 2-3 business days.
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
                    <label className="text-sm font-medium">Business Email *</label>
                    <input
                      type="email"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number *</label>
                    <input
                      type="tel"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name *</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company Registration Number</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">VAT Number</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="GB123456789"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Address *</label>
                  <textarea
                    rows={3}
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="text-sm font-medium">Account Type *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select account type</option>
                    <option value="trade">Trade Account</option>
                    <option value="corporate">Corporate Account</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Industry *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select your industry</option>
                    <option value="marketing">Marketing / Advertising Agency</option>
                    <option value="events">Events / Exhibition Company</option>
                    <option value="reseller">Print Reseller</option>
                    <option value="corporate">Corporate / Business</option>
                    <option value="education">Education / School</option>
                    <option value="charity">Charity / Non-profit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Monthly Spend *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select estimated spend</option>
                    <option value="250-500">£250 - £500</option>
                    <option value="500-1000">£500 - £1,000</option>
                    <option value="1000-2500">£1,000 - £2,500</option>
                    <option value="2500-5000">£2,500 - £5,000</option>
                    <option value="5000+">£5,000+</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tell Us About Your Business *</label>
                  <textarea
                    rows={4}
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="What products do you sell or services do you provide? What printing needs do you have?"
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="text-sm font-medium">Website (Optional)</label>
                  <input
                    type="url"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://www.yourcompany.com"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="terms" className="mt-1" required />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and
                    consent to a credit check being performed if applying for a Corporate Account. *
                  </label>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Submit Application
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section className="text-center py-12 bg-muted/30 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Have Questions?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Our trade team is here to help. Get in touch to discuss your requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="gap-2">
                Contact Trade Team <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Call: 0800 123 4567
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
