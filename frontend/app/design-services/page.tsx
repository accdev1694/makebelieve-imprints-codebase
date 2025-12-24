import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, PenTool, FileImage, Layers, CheckCircle, ArrowRight, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Design Services | MakeBelieve Imprints',
  description: 'Professional design services for your print projects. From logo design to complete branding packages.',
};

export default function DesignServicesPage() {
  const services = [
    {
      icon: Palette,
      title: 'Logo Design',
      description: 'Create a memorable brand identity with a professionally designed logo.',
      price: 'From £99',
      features: ['3 initial concepts', '2 revision rounds', 'Final files in all formats', 'Brand guidelines'],
    },
    {
      icon: PenTool,
      title: 'Custom Artwork',
      description: 'Unique illustrations and artwork for your products and marketing.',
      price: 'From £49',
      features: ['Custom illustrations', 'Vector artwork', 'Print-ready files', 'Commercial license'],
    },
    {
      icon: FileImage,
      title: 'File Preparation',
      description: 'Get your files print-ready with our expert file preparation service.',
      price: 'From £15',
      features: ['Resolution optimization', 'Color conversion (CMYK)', 'Bleed setup', 'File format conversion'],
    },
    {
      icon: Layers,
      title: 'Complete Branding',
      description: 'Full branding package including logo, stationery, and marketing materials.',
      price: 'From £299',
      features: ['Logo design', 'Business card design', 'Letterhead & envelope', 'Social media kit'],
    },
  ];

  const portfolio = [
    {
      title: 'Bloom Bakery Rebrand',
      category: 'Complete Branding',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    },
    {
      title: 'TechStart Logo',
      category: 'Logo Design',
      image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80',
    },
    {
      title: 'Green Earth Packaging',
      category: 'Custom Artwork',
      image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80',
    },
    {
      title: 'Event Poster Series',
      category: 'Print Design',
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      company: 'Bloom Bakery',
      text: 'The team completely transformed our brand. The new logo and packaging have received so many compliments from our customers!',
      rating: 5,
    },
    {
      name: 'David Chen',
      company: 'TechStart Solutions',
      text: 'Professional, creative, and delivered on time. Our new logo perfectly captures our company vision.',
      rating: 5,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Professional Design Services
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Don&apos;t have design skills? No problem. Our expert designers will bring your
              vision to life with stunning, print-ready artwork.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#services">
                <Button size="lg" variant="secondary">
                  View Services
                </Button>
              </Link>
              <Link href="#contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Get a Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Services */}
        <section id="services" className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Our Design Services</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            From simple file fixes to complete brand identities, we&apos;ve got you covered.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service) => (
              <Card key={service.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <service.icon className="h-10 w-10 text-primary mb-3" />
                    <span className="text-lg font-bold text-primary">{service.price}</span>
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-6 gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Brief', description: 'Tell us about your project and share any inspiration or requirements.' },
              { step: '2', title: 'Design', description: 'Our designers create initial concepts based on your brief.' },
              { step: '3', title: 'Revise', description: 'Provide feedback and we\'ll refine the design until it\'s perfect.' },
              { step: '4', title: 'Deliver', description: 'Receive your final files, ready for print or digital use.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Portfolio */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Our Work</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            See some of our recent design projects.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {portfolio.map((item) => (
              <Card key={item.title} className="overflow-hidden group cursor-pointer">
                <div className="relative aspect-square">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center text-white p-4">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-white/80">{item.category}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Clients Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">&ldquo;{testimonial.text}&rdquo;</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="mb-16">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Request a Design Quote</CardTitle>
              <p className="text-muted-foreground mt-2">
                Tell us about your project and we&apos;ll get back to you within 24 hours.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <input
                      type="email"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Service Required *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select a service</option>
                    <option value="logo">Logo Design</option>
                    <option value="artwork">Custom Artwork</option>
                    <option value="file-prep">File Preparation</option>
                    <option value="branding">Complete Branding</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Project Details *</label>
                  <textarea
                    rows={4}
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Tell us about your project, including any specific requirements, style preferences, or examples you like..."
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="text-sm font-medium">Budget Range</label>
                  <select className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Select budget range</option>
                    <option value="under-50">Under £50</option>
                    <option value="50-100">£50 - £100</option>
                    <option value="100-250">£100 - £250</option>
                    <option value="250-500">£250 - £500</option>
                    <option value="500+">£500+</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Reference Files (Optional)</label>
                  <input
                    type="file"
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.ai,.psd"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload any reference images, logos, or inspiration (Max 10MB each)
                  </p>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="text-center py-12 bg-muted/30 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Questions About Design Services?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Check our FAQ or get in touch with our design team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/faq">
              <Button variant="outline" size="lg">View FAQ</Button>
            </Link>
            <Link href="/contact">
              <Button size="lg">Contact Us</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
