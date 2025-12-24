import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileImage, FileText, Download, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const metadata: Metadata = {
  title: 'File Guidelines | MakeBelieve Imprints',
  description: 'Learn how to prepare your files for printing. Accepted formats, resolution requirements, and design tips.',
};

export default function FileGuidelinesPage() {
  const acceptedFormats = [
    { format: 'PDF', description: 'Preferred format for print-ready files', recommended: true },
    { format: 'PNG', description: 'Best for images with transparency', recommended: true },
    { format: 'JPG/JPEG', description: 'Good for photographs', recommended: false },
    { format: 'AI', description: 'Adobe Illustrator files', recommended: true },
    { format: 'PSD', description: 'Adobe Photoshop files', recommended: false },
    { format: 'EPS', description: 'Vector graphics format', recommended: true },
    { format: 'SVG', description: 'Scalable vector graphics', recommended: true },
    { format: 'TIFF', description: 'High-quality image format', recommended: false },
  ];

  const resolutionGuide = [
    { product: 'Business Cards', resolution: '300 DPI minimum', size: '89mm x 51mm' },
    { product: 'Posters (A3)', resolution: '150-300 DPI', size: '297mm x 420mm' },
    { product: 'Banners', resolution: '100-150 DPI', size: 'Varies' },
    { product: 'Canvas Prints', resolution: '150-300 DPI', size: 'Varies by size' },
    { product: 'T-Shirts', resolution: '300 DPI minimum', size: 'Max 35cm x 45cm' },
    { product: 'Mugs', resolution: '300 DPI minimum', size: '240mm x 100mm wrap' },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 to-purple-600/10 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">File Guidelines</h1>
            <p className="text-xl text-muted-foreground">
              Follow these guidelines to ensure your prints come out perfectly every time.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="pt-6">
              <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Use High Resolution</h3>
              <p className="text-sm text-muted-foreground">
                Always use 300 DPI for best print quality. Low resolution images will appear pixelated.
              </p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
            <CardContent className="pt-6">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mb-3" />
              <h3 className="font-semibold mb-2">Include Bleed</h3>
              <p className="text-sm text-muted-foreground">
                Add 3mm bleed around all edges for products that are trimmed after printing.
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="pt-6">
              <Info className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">Use CMYK Colors</h3>
              <p className="text-sm text-muted-foreground">
                Convert your files to CMYK color mode for accurate color reproduction.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accepted Formats */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Accepted File Formats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {acceptedFormats.map((item) => (
              <Card key={item.format} className={item.recommended ? 'border-primary' : ''}>
                <CardContent className="pt-6 text-center">
                  <FileImage className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-bold text-lg">.{item.format}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  {item.recommended && (
                    <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Resolution Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Resolution Requirements</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-4 font-semibold">Minimum Resolution</th>
                      <th className="text-left py-3 px-4 font-semibold">Document Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolutionGuide.map((item) => (
                      <tr key={item.product} className="border-b last:border-0">
                        <td className="py-3 px-4">{item.product}</td>
                        <td className="py-3 px-4">{item.resolution}</td>
                        <td className="py-3 px-4">{item.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Color Mode */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Color Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CMYK for Print</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  CMYK (Cyan, Magenta, Yellow, Black) is the standard color mode for printing.
                  Files in RGB may appear different when printed.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Use for all physical print products
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Accurate color reproduction
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Industry standard for commercial printing
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>RGB for Digital</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  RGB (Red, Green, Blue) is used for digital displays. We&apos;ll convert RGB files to CMYK,
                  but colors may shift slightly.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Use for digital downloads only
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Colors may appear different when printed
                  </li>
                  <li className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    We offer free color conversion
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bleed and Safe Zone */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Bleed & Safe Zone</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">What is Bleed?</h3>
                  <p className="text-muted-foreground mb-4">
                    Bleed is the area of your design that extends beyond the trim line.
                    It ensures there are no white edges when the product is cut.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li>• Standard bleed: <strong>3mm</strong> on all sides</li>
                    <li>• Large format: <strong>5mm</strong> on all sides</li>
                    <li>• Extend backgrounds and images to the bleed line</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Safe Zone</h3>
                  <p className="text-muted-foreground mb-4">
                    Keep important text and elements at least 3mm inside the trim line
                    to prevent them from being cut off.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li>• Safe margin: <strong>3mm</strong> inside trim line</li>
                    <li>• Keep logos and text within safe zone</li>
                    <li>• Don&apos;t place critical elements near edges</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Download Templates */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Download Templates</h2>
          <p className="text-muted-foreground mb-6">
            Use our pre-made templates to ensure your files are set up correctly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Business Cards', 'Flyers (A5)', 'Posters (A3)', 'Banners', 'Canvas Prints', 'T-Shirts'].map((template) => (
              <Card key={template} className="hover:border-primary transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{template}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Need Help */}
        <section className="text-center py-12 bg-muted/30 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Need Help With Your Files?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Our design team can help you prepare your files for printing.
            We offer professional design services at affordable rates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/design-services">
              <Button size="lg">Design Services</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">Contact Support</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
