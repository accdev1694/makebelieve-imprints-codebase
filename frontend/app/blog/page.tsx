import { Metadata } from 'next';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog & Inspiration | MakeBelieve Imprints',
  description: 'Design tips, printing guides, and inspiration for your custom print projects.',
};

const blogPosts = [
  {
    id: 1,
    title: '10 Creative Ways to Use Custom Mugs for Your Business',
    excerpt: 'Discover how custom printed mugs can boost your brand visibility and create lasting impressions with clients and employees.',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    category: 'Marketing Tips',
    date: '2024-01-15',
    readTime: '5 min read',
    slug: 'creative-ways-custom-mugs-business',
  },
  {
    id: 2,
    title: 'The Ultimate Guide to Choosing the Right Paper for Your Prints',
    excerpt: 'From glossy to matte, silk to uncoated - learn which paper type works best for different print projects.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    category: 'Printing Guide',
    date: '2024-01-10',
    readTime: '8 min read',
    slug: 'guide-choosing-right-paper-prints',
  },
  {
    id: 3,
    title: 'How to Design Eye-Catching Business Cards That Stand Out',
    excerpt: 'First impressions matter. Learn the design principles that make business cards memorable and effective.',
    image: 'https://images.unsplash.com/photo-1589330273594-faddc14a63e9?w=800&q=80',
    category: 'Design Tips',
    date: '2024-01-05',
    readTime: '6 min read',
    slug: 'design-eye-catching-business-cards',
  },
  {
    id: 4,
    title: 'Canvas vs Acrylic Prints: Which One is Right for You?',
    excerpt: 'Compare the look, feel, and durability of canvas and acrylic prints to make the best choice for your photos.',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    category: 'Product Comparison',
    date: '2024-01-01',
    readTime: '7 min read',
    slug: 'canvas-vs-acrylic-prints-comparison',
  },
  {
    id: 5,
    title: 'Event Branding: Creating a Cohesive Look for Your Next Event',
    excerpt: 'From banners to badges, learn how to create consistent branding across all your event materials.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    category: 'Events',
    date: '2023-12-28',
    readTime: '10 min read',
    slug: 'event-branding-cohesive-look',
  },
  {
    id: 6,
    title: 'Sustainable Printing: Eco-Friendly Options for Your Business',
    excerpt: 'Discover our range of eco-friendly printing options and how to make your print projects more sustainable.',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    category: 'Sustainability',
    date: '2023-12-20',
    readTime: '6 min read',
    slug: 'sustainable-printing-eco-friendly-options',
  },
];

const categories = [
  'All',
  'Design Tips',
  'Printing Guide',
  'Marketing Tips',
  'Product Comparison',
  'Events',
  'Sustainability',
];

export default function BlogPage() {
  const featuredPost = blogPosts[0];
  const recentPosts = blogPosts.slice(1);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 to-purple-600/10 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">Blog & Inspiration</h1>
            <p className="text-xl text-muted-foreground">
              Tips, guides, and ideas to help you create stunning custom prints.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-12 justify-center">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === 'All' ? 'default' : 'outline'}
              size="sm"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Featured Post */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Featured Article</h2>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative aspect-video lg:aspect-auto">
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <CardContent className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {featuredPost.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(featuredPost.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {featuredPost.readTime}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{featuredPost.title}</h3>
                <p className="text-muted-foreground mb-6">{featuredPost.excerpt}</p>
                <div>
                  <Button className="gap-2">
                    Read Article <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </section>

        {/* Recent Posts */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Recent Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="bg-muted px-2 py-1 rounded">
                      {post.category}
                    </span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="font-semibold mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(post.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1">
                      Read <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Load More */}
        <div className="text-center mb-16">
          <Button variant="outline" size="lg">
            Load More Articles
          </Button>
        </div>

        {/* Newsletter */}
        <section className="text-center py-12 bg-primary text-white rounded-2xl">
          <div className="max-w-xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-4">Stay Inspired</h2>
            <p className="text-white/90 mb-6">
              Subscribe to our newsletter for design tips, exclusive offers, and inspiration
              delivered straight to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-foreground"
                required
              />
              <Button variant="secondary" size="lg">
                Subscribe
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
