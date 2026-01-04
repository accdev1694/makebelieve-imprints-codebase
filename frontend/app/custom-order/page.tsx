'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInputUK } from '@/components/ui/date-input-uk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CartIcon } from '@/components/cart/CartIcon';
import {
  MessageSquare,
  Upload,
  FileText,
  Send,
  CheckCircle,
  ArrowLeft,
  Palette,
  Package,
  Clock,
} from 'lucide-react';

export default function CustomOrderPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: '',
    projectType: '',
    quantity: '',
    deadline: '',
    description: '',
    budget: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please describe your project');
      return;
    }

    setSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In production, this would send to an API endpoint
    console.log('Custom order inquiry:', { ...formData, file });

    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background">
        {/* Header */}
        <header className="relative z-50 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              <span className="text-neon-gradient">MakeBelieve</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/products">
                <Button variant="ghost">Products</Button>
              </Link>
              <CartIcon />
            </nav>
          </div>
        </header>

        {/* Success Message */}
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-4">Inquiry Submitted!</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Thank you for your custom order inquiry. Our team will review your request and get back to you within 1-2 business days.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild className="btn-gradient">
                  <Link href="/products">Browse Products</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="relative z-50 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link href="/templates">
              <Button variant="ghost">Templates</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <CartIcon />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="btn-gradient">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 py-12">
        <div className="container mx-auto px-4">
          <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Custom Order Request</h1>
          <p className="text-muted-foreground max-w-2xl">
            Have a unique project in mind? Fill out the form below and our team will work with you to bring your vision to life.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Tell Us About Your Project
                </CardTitle>
                <CardDescription>
                  Provide as much detail as possible so we can give you an accurate quote.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="font-semibold mb-4">Contact Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Name *</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email *</label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <Input
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+44 7XXX XXXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Company</label>
                        <Input
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          placeholder="Your company (optional)"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Project Details */}
                  <div>
                    <h3 className="font-semibold mb-4">Project Details</h3>
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Project Type</label>
                          <select
                            name="projectType"
                            value={formData.projectType}
                            onChange={handleInputChange}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select a type</option>
                            <option value="bulk-order">Bulk Order</option>
                            <option value="custom-design">Custom Design</option>
                            <option value="corporate-branding">Corporate Branding</option>
                            <option value="event-materials">Event Materials</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Quantity</label>
                          <Input
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            placeholder="e.g., 100-500 units"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Deadline</label>
                          <DateInputUK
                            value={formData.deadline}
                            onChange={(value) => setFormData((prev) => ({ ...prev, deadline: value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Budget Range</label>
                          <select
                            name="budget"
                            value={formData.budget}
                            onChange={handleInputChange}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select budget</option>
                            <option value="under-100">Under £100</option>
                            <option value="100-500">£100 - £500</option>
                            <option value="500-1000">£500 - £1,000</option>
                            <option value="1000-5000">£1,000 - £5,000</option>
                            <option value="5000+">£5,000+</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Project Description *</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Describe your project in detail. Include any specific requirements, materials, colors, dimensions, or special requests."
                          rows={6}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Attach Files (optional)
                        </label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                            accept=".pdf,.png,.jpg,.jpeg,.ai,.psd"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {file ? file.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, PNG, JPG, AI, or PSD (max 10MB)
                            </p>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-gradient gap-2" loading={submitting}>
                    <Send className="h-4 w-4" />
                    Submit Inquiry
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* What to Expect */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What to Expect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">1. Submit Your Request</p>
                    <p className="text-xs text-muted-foreground">Fill out the form with your project details</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">2. We Review & Contact</p>
                    <p className="text-xs text-muted-foreground">Our team reviews and reaches out within 1-2 days</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Palette className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">3. Design & Quote</p>
                    <p className="text-xs text-muted-foreground">We create mockups and provide a detailed quote</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">4. Production & Delivery</p>
                    <p className="text-xs text-muted-foreground">Once approved, we produce and deliver your order</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-semibold">Quick Response</p>
                    <p className="text-sm text-muted-foreground">We typically respond within 24-48 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Popular Custom Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popular Custom Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Corporate Gifts</Badge>
                  <Badge variant="secondary">Event Merchandise</Badge>
                  <Badge variant="secondary">Wedding Favors</Badge>
                  <Badge variant="secondary">Team Uniforms</Badge>
                  <Badge variant="secondary">Promotional Items</Badge>
                  <Badge variant="secondary">Custom Packaging</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
