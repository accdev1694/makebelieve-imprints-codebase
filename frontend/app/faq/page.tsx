'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Search, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Ordering
  {
    category: 'Ordering',
    question: 'How do I place an order?',
    answer: 'Simply browse our products, select the item you want, customize it using our design tools or upload your own design, add it to your cart, and proceed to checkout. You\'ll receive an order confirmation email once your order is placed.',
  },
  {
    category: 'Ordering',
    question: 'Can I modify my order after placing it?',
    answer: 'If your order hasn\'t entered production yet, we may be able to make changes. Please contact us as soon as possible at admin@makebelieveimprints.co.uk with your order number.',
  },
  {
    category: 'Ordering',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay.',
  },
  // Design & Customization
  {
    category: 'Design & Customization',
    question: 'What file formats do you accept for custom designs?',
    answer: 'We accept JPG, PNG, PDF, AI, and PSD files. For best results, we recommend high-resolution images (300 DPI or higher) and vector files for logos.',
  },
  {
    category: 'Design & Customization',
    question: 'Can I use the online design editor?',
    answer: 'Yes! Our online design editor allows you to add text, shapes, clipart, and upload your own images. You can also choose from our library of templates and customize them to your needs.',
  },
  {
    category: 'Design & Customization',
    question: 'Will I get a proof before printing?',
    answer: 'For standard products, you\'ll see a digital preview during the design process. For bulk or custom orders, we provide a digital proof for approval before printing.',
  },
  // Shipping
  {
    category: 'Shipping',
    question: 'How long does shipping take?',
    answer: 'UK standard shipping takes 3-5 business days. Express shipping (1-2 business days) is available for an additional fee. International shipping typically takes 5-14 business days depending on the destination. Production time is typically 1-2 business days.',
  },
  {
    category: 'Shipping',
    question: 'Do you ship internationally?',
    answer: 'Yes! We ship to many countries worldwide via Royal Mail International. This includes Europe, North America, Australia, and select Asian countries. Shipping costs and delivery times vary by destination.',
  },
  {
    category: 'Shipping',
    question: 'How can I track my order?',
    answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track your order in your account dashboard or on our Track Order page.',
  },
  // Returns & Refunds
  {
    category: 'Returns & Refunds',
    question: 'What is your return policy?',
    answer: 'Since all products are custom-made, we cannot accept returns unless there\'s a defect in the product or we made an error with your order. Please contact us within 14 days of receiving your order if there\'s an issue.',
  },
  {
    category: 'Returns & Refunds',
    question: 'What if my order arrives damaged?',
    answer: 'If your order arrives damaged, please contact us within 48 hours with photos of the damage. We\'ll arrange a replacement at no extra cost.',
  },
  {
    category: 'Returns & Refunds',
    question: 'How long do refunds take to process?',
    answer: 'Once approved, refunds are processed within 5-7 business days. The time it takes to appear in your account depends on your payment provider.',
  },
  // Product Quality
  {
    category: 'Product Quality',
    question: 'What materials do you use?',
    answer: 'We use only premium quality materials. Our mugs are made from high-grade ceramic, t-shirts are 100% cotton or cotton blends, and our print materials are professional-grade with vibrant, long-lasting inks.',
  },
  {
    category: 'Product Quality',
    question: 'Are your products safe for food/drink?',
    answer: 'Yes, all our mugs and drinkware are food-safe and dishwasher safe. The inks we use are non-toxic and won\'t leach into beverages.',
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...new Set(faqs.map((faq) => faq.category))];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Find answers to common questions about our products and services
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto max-w-4xl px-4 py-12">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <Card className="card-glow">
              <CardContent className="py-12 text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter to find what you're looking for.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFaqs.map((faq, index) => (
              <Card key={index} className="card-glow overflow-hidden">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full text-left p-6 flex items-start justify-between gap-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <span className="text-xs text-primary font-medium">{faq.category}</span>
                    <h3 className="font-semibold mt-1">{faq.question}</h3>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                      openItems.includes(index) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openItems.includes(index) && (
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Still Need Help */}
        <Card className="card-glow mt-12">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-6">
              Can't find what you're looking for? We're here to help!
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
