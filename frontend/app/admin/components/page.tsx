'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Skeleton,
  ProductCardSkeleton,
  CategoryCardSkeleton,
  ListItemSkeleton,
  TextSkeleton,
} from '@/components/ui/Skeleton';

// Home Components
import { TrustBadges } from '@/components/home/TrustBadges';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';

// Icons
import {
  ShoppingCart,
  Heart,
  Star,
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  Search,
  Menu,
  User,
  Settings,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Package,
  Truck,
  CreditCard,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Copy,
  Share,
  Filter,
  ArrowLeft,
  ArrowRight,
  Home,
  FileText,
  Image as ImageIcon,
  Camera,
  Printer,
  Send,
  RefreshCw,
  Bell,
} from 'lucide-react';

// =============================================================================
// COMPONENT SECTION WRAPPER
// =============================================================================
function ComponentSection({
  id,
  title,
  description,
  importPath,
  children,
}: {
  id: string;
  title: string;
  description: string;
  importPath: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-2">{description}</p>
        <code className="text-xs bg-muted px-2 py-1 rounded">{importPath}</code>
      </div>
      {children}
    </section>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
function ComponentPreviewContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [activeSection, setActiveSection] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  const navSections = [
    { id: 'buttons', label: 'Buttons' },
    { id: 'cards', label: 'Cards' },
    { id: 'badges', label: 'Badges' },
    { id: 'form-inputs', label: 'Form Inputs' },
    { id: 'select', label: 'Select' },
    { id: 'dialogs', label: 'Dialogs' },
    { id: 'alert-dialogs', label: 'Alert Dialogs' },
    { id: 'skeletons', label: 'Skeletons' },
    { id: 'separators', label: 'Separators' },
    { id: 'product-card', label: 'ProductCard' },
    { id: 'cart-item', label: 'CartItem' },
    { id: 'trust-badges', label: 'TrustBadges' },
    { id: 'how-it-works', label: 'HowItWorks' },
    { id: 'promo-banner', label: 'PromoBanner' },
    { id: 'file-upload', label: 'FileUpload' },
    { id: 'template-card', label: 'TemplateCard' },
    { id: 'filter-sidebar', label: 'FilterSidebar' },
    { id: 'header', label: 'Header' },
    { id: 'icons', label: 'Icons' },
    { id: 'typography', label: 'Typography' },
    { id: 'colors', label: 'Colors' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-bold hidden sm:block">
                <span className="text-neon-gradient">Component Library</span>
              </h1>
            </div>
            <Badge variant="destructive">Admin Only</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Components ({navSections.length})
              </p>
              {navSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main>
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 lg:hidden">
                <span className="text-neon-gradient">Component Library</span>
              </h1>
              <p className="text-muted-foreground">
                Complete reference of all {navSections.length} UI components used
                in MakeBelieve Imprints. Use this page to find component names,
                see their variants, and understand their usage.
              </p>
            </div>

            {/* ============================================ */}
            {/* BUTTONS */}
            {/* ============================================ */}
            <ComponentSection
              id="buttons"
              title="Button"
              description="Primary action components with multiple variants and sizes."
              importPath="@/components/ui/button"
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variants</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4">
                    {[
                      { variant: 'default' as const, label: 'Default' },
                      { variant: 'secondary' as const, label: 'Secondary' },
                      { variant: 'destructive' as const, label: 'Destructive' },
                      { variant: 'outline' as const, label: 'Outline' },
                      { variant: 'ghost' as const, label: 'Ghost' },
                      { variant: 'link' as const, label: 'Link' },
                    ].map(({ variant, label }) => (
                      <div key={variant} className="text-center space-y-1">
                        <Button variant={variant}>{label}</Button>
                        <p className="text-xs text-muted-foreground">
                          variant="{variant}"
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sizes</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-end gap-4">
                    {[
                      { size: 'sm' as const, label: 'Small', h: '36px' },
                      { size: 'default' as const, label: 'Default', h: '44px' },
                      { size: 'lg' as const, label: 'Large', h: '48px' },
                    ].map(({ size, label, h }) => (
                      <div key={size} className="text-center space-y-1">
                        <Button size={size}>{label}</Button>
                        <p className="text-xs text-muted-foreground">
                          size="{size}" ({h})
                        </p>
                      </div>
                    ))}
                    <div className="text-center space-y-1">
                      <Button size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        size="icon" (44x44)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">States & Custom</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4">
                    <div className="text-center space-y-1">
                      <Button loading>Loading</Button>
                      <p className="text-xs text-muted-foreground">loading=true</p>
                    </div>
                    <div className="text-center space-y-1">
                      <Button disabled>Disabled</Button>
                      <p className="text-xs text-muted-foreground">disabled</p>
                    </div>
                    <div className="text-center space-y-1">
                      <Button>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        With Icon
                      </Button>
                      <p className="text-xs text-muted-foreground">with icon</p>
                    </div>
                    <div className="text-center space-y-1">
                      <Button className="btn-gradient">Gradient</Button>
                      <p className="text-xs text-muted-foreground">
                        className="btn-gradient"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* CARDS */}
            {/* ============================================ */}
            <ComponentSection
              id="cards"
              title="Card"
              description="Container components for grouped content with header, content, and footer sections."
              importPath="@/components/ui/card"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>CardTitle</CardTitle>
                    <CardDescription>CardDescription text here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>CardContent - Main content area</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>With Footer</CardTitle>
                    <CardDescription>Card with action buttons</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Content goes here</p>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </CardFooter>
                </Card>

                <Card className="card-glow">
                  <CardHeader>
                    <CardTitle>card-glow Class</CardTitle>
                    <CardDescription>Hover for glow effect</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Add <code className="bg-muted px-1">card-glow</code> class
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Interactive Card
                      <ChevronRight className="h-5 w-5" />
                    </CardTitle>
                    <CardDescription>Clickable with hover state</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>hover:bg-accent/50 transition-colors</p>
                  </CardContent>
                </Card>
              </div>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* BADGES */}
            {/* ============================================ */}
            <ComponentSection
              id="badges"
              title="Badge"
              description="Small status indicators and labels for categorization."
              importPath="@/components/ui/badge"
            >
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Standard Variants</h4>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="default">default</Badge>
                      <Badge variant="secondary">secondary</Badge>
                      <Badge variant="destructive">destructive</Badge>
                      <Badge variant="outline">outline</Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Order Status Badges (Custom)
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50 border">
                        Pending
                      </Badge>
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/50 border">
                        Confirmed
                      </Badge>
                      <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/50 border">
                        Printing
                      </Badge>
                      <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/50 border">
                        Shipped
                      </Badge>
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/50 border">
                        Delivered
                      </Badge>
                      <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/50 border">
                        Refunded
                      </Badge>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/50 border">
                        Cancelled
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* FORM INPUTS */}
            {/* ============================================ */}
            <ComponentSection
              id="form-inputs"
              title="Input, Label, Textarea"
              description="Form input fields with 44px height for touch accessibility."
              importPath="@/components/ui/input, label, textarea"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Input</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-input">Label</Label>
                      <Input
                        id="demo-input"
                        placeholder="Default input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>With Icon</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Disabled</Label>
                      <Input placeholder="Cannot edit" disabled />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Input Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="Enter password" />
                    </div>
                    <div className="space-y-2">
                      <Label>Number</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Textarea</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default</Label>
                        <Textarea
                          placeholder="Enter your message..."
                          value={textareaValue}
                          onChange={(e) => setTextareaValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Disabled</Label>
                        <Textarea placeholder="Cannot edit" disabled />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* SELECT */}
            {/* ============================================ */}
            <ComponentSection
              id="select"
              title="Select"
              description="Dropdown selection component built on Radix UI primitives."
              importPath="@/components/ui/select"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Basic Select</Label>
                      <Select value={selectValue} onValueChange={setSelectValue}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="option1">Option 1</SelectItem>
                          <SelectItem value="option2">Option 2</SelectItem>
                          <SelectItem value="option3">Option 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status Select</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Disabled</Label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Disabled" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Item</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* DIALOGS */}
            {/* ============================================ */}
            <ComponentSection
              id="dialogs"
              title="Dialog"
              description="Modal dialogs for focused interactions and forms."
              importPath="@/components/ui/dialog"
            >
              <Card>
                <CardContent className="pt-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>DialogTitle</DialogTitle>
                        <DialogDescription>
                          DialogDescription - Explain what this dialog does.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p>DialogContent area - any components can go here.</p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* ALERT DIALOGS */}
            {/* ============================================ */}
            <ComponentSection
              id="alert-dialogs"
              title="AlertDialog"
              description="Confirmation dialogs for destructive or important actions."
              importPath="@/components/ui/alert-dialog"
            >
              <Card>
                <CardContent className="pt-6 flex gap-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Item</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Confirm Action</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* SKELETONS */}
            {/* ============================================ */}
            <ComponentSection
              id="skeletons"
              title="Skeleton"
              description="Loading placeholder components with shimmer animation."
              importPath="@/components/ui/Skeleton"
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Base Skeleton</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-12 w-32" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Composite Skeletons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm font-medium mb-2">
                          ProductCardSkeleton
                        </p>
                        <ProductCardSkeleton />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">
                          CategoryCardSkeleton
                        </p>
                        <CategoryCardSkeleton />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">ListItemSkeleton</p>
                        <div className="border rounded-lg">
                          <ListItemSkeleton />
                          <ListItemSkeleton />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">TextSkeleton</p>
                        <TextSkeleton lines={4} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* SEPARATORS */}
            {/* ============================================ */}
            <ComponentSection
              id="separators"
              title="Separator"
              description="Visual dividers for content separation."
              importPath="@/components/ui/separator"
            >
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <p className="text-sm font-medium mb-3">
                      Horizontal (default)
                    </p>
                    <p className="mb-2">Content above</p>
                    <Separator />
                    <p className="mt-2">Content below</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-3">Vertical</p>
                    <div className="flex items-center gap-4 h-8">
                      <span>Left</span>
                      <Separator orientation="vertical" />
                      <span>Center</span>
                      <Separator orientation="vertical" />
                      <span>Right</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* PRODUCT CARD */}
            {/* ============================================ */}
            <ComponentSection
              id="product-card"
              title="ProductCard"
              description="Displays a product with image, name, price, and category badge. Used in product grids."
              importPath="@/components/products/ProductCard"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Mock ProductCard */}
                    <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer h-full flex flex-col">
                      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <ImageIcon className="h-12 w-12" />
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <Badge className="bg-primary text-primary-foreground">
                            Featured
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="flex-1 p-4">
                        <Badge variant="outline" className="text-xs mb-2">
                          Business Cards
                        </Badge>
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          Premium Business Cards
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          High-quality 400gsm with matt lamination
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <span className="text-2xl font-bold">£29.99</span>
                      </CardFooter>
                    </Card>

                    {/* Out of Stock variant */}
                    <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer h-full flex flex-col">
                      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <ImageIcon className="h-12 w-12" />
                        </div>
                        <div className="absolute top-2 left-2">
                          <Badge variant="destructive">Out of Stock</Badge>
                        </div>
                      </div>
                      <CardContent className="flex-1 p-4">
                        <Badge variant="outline" className="text-xs mb-2">
                          Stickers
                        </Badge>
                        <h3 className="font-semibold text-lg mb-1">
                          Custom Vinyl Stickers
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Waterproof vinyl stickers
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <span className="text-2xl font-bold">£12.99</span>
                      </CardFooter>
                    </Card>

                    {/* ProductCardSkeleton */}
                    <div>
                      <p className="text-sm font-medium mb-2">
                        ProductCardSkeleton
                      </p>
                      <ProductCardSkeleton />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* CART ITEM */}
            {/* ============================================ */}
            <ComponentSection
              id="cart-item"
              title="CartItem"
              description="Displays a cart line item with quantity controls and remove button."
              importPath="@/components/cart/CartItem"
            >
              <Card>
                <CardContent className="pt-6">
                  {/* Mock CartItem compact */}
                  <div className="max-w-md">
                    <p className="text-sm font-medium mb-3">
                      Compact mode (cart drawer)
                    </p>
                    <div className="flex gap-3 py-3 border-b">
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">
                          Premium Business Cards
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          A4 / Gloss / 400gsm
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6">
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">2</span>
                            <Button variant="outline" size="icon" className="h-6 w-6">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">£59.98</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-medium mb-3">Full mode (cart page)</p>
                    <div className="flex gap-4 py-4 border-b max-w-xl">
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">Premium Business Cards</p>
                            <p className="text-sm text-gray-500 mt-1">
                              A4 / Gloss / 400gsm
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">2</span>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">£59.98</p>
                            <p className="text-sm text-gray-500">£29.99 each</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* TRUST BADGES */}
            {/* ============================================ */}
            <ComponentSection
              id="trust-badges"
              title="TrustBadges"
              description="Trust indicators showing shipping, quality, and service features."
              importPath="@/components/home/TrustBadges"
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <TrustBadges />
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* HOW IT WORKS */}
            {/* ============================================ */}
            <ComponentSection
              id="how-it-works"
              title="HowItWorksSection"
              description="Step-by-step process explanation with icons and cards."
              importPath="@/components/home/HowItWorksSection"
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <HowItWorksSection />
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* PROMO BANNER */}
            {/* ============================================ */}
            <ComponentSection
              id="promo-banner"
              title="PromoBanner"
              description="Promotional banner with title, description, CTA, and image."
              importPath="@/components/home/PromoBanner"
            >
              <Card>
                <CardContent className="pt-6">
                  {/* Mock PromoBanner */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border border-primary/20">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                          PromoBanner Title
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8">
                          Description text goes here explaining the promotion or
                          feature.
                        </p>
                        <Button size="lg" className="btn-gradient px-8 py-6 text-lg">
                          CTA Button
                        </Button>
                      </div>
                      <div className="h-64 md:h-96 bg-gray-200 flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Props: title, description, ctaText, ctaLink, image,
                    imagePosition (left | right)
                  </p>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* FILE UPLOAD */}
            {/* ============================================ */}
            <ComponentSection
              id="file-upload"
              title="FileUpload"
              description="Drag-and-drop file upload with camera support on mobile (Capacitor)."
              importPath="@/components/design/FileUpload"
            >
              <Card>
                <CardContent className="pt-6">
                  {/* Mock FileUpload */}
                  <div className="max-w-md">
                    <Card className="relative overflow-hidden border-dashed border-2 p-8">
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 rounded-md bg-primary/20 flex items-center justify-center">
                            <Upload className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <div>
                          <p className="text-lg font-medium mb-2">
                            Upload your design
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Drag and drop or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Supports: JPG, PNG, WebP, GIF (Max 10MB)
                          </p>
                        </div>
                        <Button className="btn-gradient">Choose File</Button>
                      </div>
                    </Card>
                    <p className="text-sm text-muted-foreground mt-4">
                      Props: onFileSelect, acceptedTypes, maxSize, preview
                    </p>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* TEMPLATE CARD */}
            {/* ============================================ */}
            <ComponentSection
              id="template-card"
              title="TemplateCard"
              description="Design template card with preview, use, and premium badge support."
              importPath="@/components/templates/TemplateCard"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Mock TemplateCard */}
                    <Card className="group overflow-hidden hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/20">
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/10 border-white text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm" className="btn-gradient">
                            Use Template
                          </Button>
                        </div>
                        <Badge variant="secondary" className="absolute top-2 right-2">
                          Business
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm">Modern Minimal</h3>
                        <p className="text-xs text-muted-foreground">
                          Clean and professional design
                        </p>
                      </CardContent>
                    </Card>

                    {/* Premium TemplateCard */}
                    <Card className="group overflow-hidden hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/20">
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Premium
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm">
                          Creative Gradient
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Eye-catching premium design
                        </p>
                        <p className="text-sm font-semibold text-amber-600 mt-2">
                          £4.99
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* FILTER SIDEBAR */}
            {/* ============================================ */}
            <ComponentSection
              id="filter-sidebar"
              title="FilterSidebar"
              description="Product filtering sidebar with search, categories, price range, and more."
              importPath="@/components/products/FilterSidebar"
            >
              <Card>
                <CardContent className="pt-6">
                  {/* Mock FilterSidebar */}
                  <div className="max-w-xs">
                    <Card className="h-full flex flex-col overflow-hidden">
                      <div className="p-4 border-b flex items-center justify-between bg-card/50">
                        <h2 className="text-lg font-semibold">Filters</h2>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Clear All
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Search */}
                        <div>
                          <p className="text-sm font-medium mb-2">Search</p>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search products..." className="pl-9" />
                          </div>
                        </div>

                        {/* Categories */}
                        <div>
                          <button className="flex items-center justify-between w-full text-sm font-medium mb-2">
                            Categories
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <div className="space-y-2">
                            {['Business Cards', 'Stickers', 'Photo Prints'].map(
                              (cat) => (
                                <label
                                  key={cat}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <input type="checkbox" className="cursor-pointer" />
                                  {cat}
                                </label>
                              )
                            )}
                          </div>
                        </div>

                        {/* Sort */}
                        <div>
                          <p className="text-sm font-medium mb-2">Sort By</p>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="relevance">Relevance</SelectItem>
                              <SelectItem value="price-low">
                                Price: Low to High
                              </SelectItem>
                              <SelectItem value="price-high">
                                Price: High to Low
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* HEADER */}
            {/* ============================================ */}
            <ComponentSection
              id="header"
              title="Header"
              description="Main application header with logo, navigation, search, and user menu."
              importPath="@/components/layout/Header"
            >
              <Card>
                <CardContent className="pt-6">
                  {/* Mock Header */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-card/65 backdrop-blur-sm border-b">
                      <div className="px-4 py-2">
                        <div className="flex items-center justify-between gap-4">
                          {/* Logo */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                              <span className="text-primary-foreground font-bold">
                                M
                              </span>
                            </div>
                            <span className="font-bold hidden sm:block">
                              MakeBelieve
                            </span>
                          </div>

                          {/* Desktop Nav */}
                          <nav className="hidden lg:flex items-center gap-6">
                            <a className="text-sm text-muted-foreground hover:text-foreground">
                              Products
                            </a>
                            <a className="text-sm text-muted-foreground hover:text-foreground">
                              Business Cards
                            </a>
                            <a className="text-sm text-muted-foreground hover:text-foreground">
                              Custom Gifts
                            </a>
                          </nav>

                          {/* Search */}
                          <div className="hidden lg:block flex-1 max-w-md mx-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search products..."
                                className="pl-9"
                              />
                            </div>
                          </div>

                          {/* Right Section */}
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Bell className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <User className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="relative">
                              <ShoppingCart className="h-5 w-5" />
                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                3
                              </span>
                            </Button>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                              <Menu className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Props: variant (default | minimal | transparent), showSearch,
                    showCart, className
                  </p>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* ICONS */}
            {/* ============================================ */}
            <ComponentSection
              id="icons"
              title="Icons (Lucide React)"
              description="Commonly used icons from the lucide-react library."
              importPath="lucide-react"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-4">
                    {[
                      { icon: ShoppingCart, name: 'ShoppingCart' },
                      { icon: Heart, name: 'Heart' },
                      { icon: Star, name: 'Star' },
                      { icon: Check, name: 'Check' },
                      { icon: X, name: 'X' },
                      { icon: AlertTriangle, name: 'AlertTriangle' },
                      { icon: Info, name: 'Info' },
                      { icon: Search, name: 'Search' },
                      { icon: Menu, name: 'Menu' },
                      { icon: User, name: 'User' },
                      { icon: Settings, name: 'Settings' },
                      { icon: Mail, name: 'Mail' },
                      { icon: Phone, name: 'Phone' },
                      { icon: MapPin, name: 'MapPin' },
                      { icon: Calendar, name: 'Calendar' },
                      { icon: Clock, name: 'Clock' },
                      { icon: Package, name: 'Package' },
                      { icon: Truck, name: 'Truck' },
                      { icon: CreditCard, name: 'CreditCard' },
                      { icon: Download, name: 'Download' },
                      { icon: Upload, name: 'Upload' },
                      { icon: Edit, name: 'Edit' },
                      { icon: Trash2, name: 'Trash2' },
                      { icon: Plus, name: 'Plus' },
                      { icon: Minus, name: 'Minus' },
                      { icon: Eye, name: 'Eye' },
                      { icon: EyeOff, name: 'EyeOff' },
                      { icon: Copy, name: 'Copy' },
                      { icon: Share, name: 'Share' },
                      { icon: Filter, name: 'Filter' },
                      { icon: ArrowLeft, name: 'ArrowLeft' },
                      { icon: ArrowRight, name: 'ArrowRight' },
                      { icon: ChevronRight, name: 'ChevronRight' },
                      { icon: Home, name: 'Home' },
                      { icon: FileText, name: 'FileText' },
                      { icon: ImageIcon, name: 'Image' },
                      { icon: Camera, name: 'Camera' },
                      { icon: Printer, name: 'Printer' },
                      { icon: Send, name: 'Send' },
                      { icon: RefreshCw, name: 'RefreshCw' },
                    ].map(({ icon: Icon, name }) => (
                      <div
                        key={name}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors"
                        title={name}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[9px] text-muted-foreground text-center truncate w-full">
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* TYPOGRAPHY */}
            {/* ============================================ */}
            <ComponentSection
              id="typography"
              title="Typography"
              description="Text styles and heading hierarchy used throughout the app."
              importPath="Tailwind CSS classes"
            >
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold">
                      text-4xl font-bold (H1)
                    </h1>
                    <h2 className="text-3xl font-bold">
                      text-3xl font-bold (H2)
                    </h2>
                    <h3 className="text-2xl font-bold">
                      text-2xl font-bold (H3)
                    </h3>
                    <h4 className="text-xl font-semibold">
                      text-xl font-semibold (H4)
                    </h4>
                    <h5 className="text-lg font-semibold">
                      text-lg font-semibold (H5)
                    </h5>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-base">text-base - Regular body text</p>
                    <p className="text-sm text-muted-foreground">
                      text-sm text-muted-foreground - Secondary text
                    </p>
                    <p className="text-xs text-muted-foreground">
                      text-xs - Fine print, metadata
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-neon-gradient text-2xl font-bold">
                      text-neon-gradient (Brand gradient)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            <Separator className="my-8" />

            {/* ============================================ */}
            {/* COLORS */}
            {/* ============================================ */}
            <ComponentSection
              id="colors"
              title="Colors"
              description="Theme colors defined as CSS variables in the design system."
              importPath="CSS variables (globals.css)"
            >
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Theme Colors</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {[
                        { name: 'Primary', bg: 'bg-primary', text: 'text-primary-foreground' },
                        { name: 'Secondary', bg: 'bg-secondary', text: 'text-secondary-foreground' },
                        { name: 'Destructive', bg: 'bg-destructive', text: 'text-destructive-foreground' },
                        { name: 'Accent', bg: 'bg-accent', text: 'text-accent-foreground' },
                        { name: 'Muted', bg: 'bg-muted', text: 'text-foreground' },
                        { name: 'Card', bg: 'bg-card border', text: 'text-card-foreground' },
                      ].map(({ name, bg, text }) => (
                        <div key={name} className="space-y-1">
                          <div className={`h-12 rounded-lg ${bg} flex items-center justify-center`}>
                            <span className={`text-xs font-medium ${text}`}>{name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">{bg}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Status Colors</h4>
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                      {[
                        { name: 'Yellow', bg: 'bg-yellow-500' },
                        { name: 'Blue', bg: 'bg-blue-500' },
                        { name: 'Purple', bg: 'bg-purple-500' },
                        { name: 'Cyan', bg: 'bg-cyan-500' },
                        { name: 'Green', bg: 'bg-green-500' },
                        { name: 'Orange', bg: 'bg-orange-500' },
                        { name: 'Red', bg: 'bg-red-500' },
                      ].map(({ name, bg }) => (
                        <div key={name} className="space-y-1">
                          <div className={`h-10 rounded-lg ${bg} flex items-center justify-center`}>
                            <span className="text-xs font-medium text-white">{name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentSection>

            {/* Footer */}
            <Card className="mt-12">
              <CardContent className="py-6">
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-medium">
                    MakeBelieve Imprints Component Library
                  </p>
                  <p className="mt-1">
                    {navSections.length} components | React + Tailwind + Radix UI
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ComponentsPreviewPage() {
  return (
    <ProtectedRoute>
      <ComponentPreviewContent />
    </ProtectedRoute>
  );
}
