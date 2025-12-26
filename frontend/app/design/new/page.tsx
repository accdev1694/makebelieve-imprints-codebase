'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/design/FileUpload';
import { MaterialSelector } from '@/components/design/MaterialSelector';
import { SizeSelector } from '@/components/design/SizeSelector';
import { TemplateSelector } from '@/components/design/TemplateSelector';
import { ProductMockupPreview } from '@/components/mockup';
import { designsService, Material, PrintSize, Orientation } from '@/lib/api/designs';
import { storageService } from '@/lib/api/storage';
import { Template, getTemplateById } from '@/lib/templates';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Layers } from 'lucide-react';

function DesignEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Design state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [designMode, setDesignMode] = useState<'upload' | 'template'>('upload');
  const [preview, setPreview] = useState<string>('');
  const [material, setMaterial] = useState<Material>('GLOSSY');
  const [printSize, setPrintSize] = useState<PrintSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('PORTRAIT');
  const [customWidth, setCustomWidth] = useState<number>(0);
  const [customHeight, setCustomHeight] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState<'simple' | 'mockup'>('simple');

  // Handle URL query parameters (template pre-selection from gifts page)
  useEffect(() => {
    const templateId = searchParams.get('template');
    const mode = searchParams.get('mode') as 'upload' | 'template' | null;

    // Set design mode from query param
    if (mode === 'upload') {
      setDesignMode('upload');
    } else if (mode === 'template' || templateId) {
      setDesignMode('template');
    }

    // Pre-select template if provided
    if (templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        handleTemplateSelect(template);
      }
    }
  }, [searchParams]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedTemplate(null); // Clear template when file is uploaded
    setError('');

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setSelectedFile(null); // Clear file when template is selected
    setPreview(template.previewUrl);

    // Auto-fill recommended settings
    setMaterial(template.recommendedMaterial);
    setPrintSize(template.recommendedSize);
    if (!name) {
      setName(template.name);
    }
  };

  const handleSave = async () => {
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter a name for your design');
      return;
    }

    if (!selectedFile && !selectedTemplate) {
      setError('Please upload an image or select a template');
      return;
    }

    if (printSize === 'CUSTOM' && (!customWidth || !customHeight)) {
      setError('Please enter custom dimensions');
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string;

      // Upload file to backend storage if user uploaded a file
      if (selectedFile) {
        imageUrl = await storageService.uploadFile(selectedFile);
      } else if (selectedTemplate) {
        // Use template preview URL for template-based designs
        imageUrl = selectedTemplate.previewUrl;
      } else {
        setError('No image source selected');
        setLoading(false);
        return;
      }

      // Create design in database
      await designsService.create({
        name,
        description: description || undefined,
        imageUrl,
        printSize,
        material,
        orientation,
        customWidth: printSize === 'CUSTOM' ? customWidth : undefined,
        customHeight: printSize === 'CUSTOM' ? customHeight : undefined,
      });

      // Redirect to designs gallery
      router.push('/design/my-designs');
    } catch (err: any) {
      // Extract error message from various possible formats
      let errorMessage = 'Failed to save design. Please try again.';

      // Handle validation errors with specific field messages
      if (err?.data?.error?.errors || err?.error?.errors) {
        const errors = err?.data?.error?.errors || err?.error?.errors;
        const errorMessages = Object.entries(errors)
          .map(([field, msgs]: [string, any]) => {
            const messages = Array.isArray(msgs) ? msgs : [msgs];
            return `${field}: ${messages.join(', ')}`;
          })
          .join('; ');
        errorMessage = `Validation failed: ${errorMessages}`;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.data?.error?.message) {
        errorMessage = err.data.error.message;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error) {
        errorMessage = typeof err.error === 'string' ? err.error : errorMessage;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Create Design</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/design/my-designs')}>
              My Designs
            </Button>
            <Button
              className="btn-gradient"
              onClick={handleSave}
              disabled={loading || (!selectedFile && !selectedTemplate) || !name}
            >
              {loading ? 'Saving...' : 'Save Design'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-8">
            {/* Design Info */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Design Details</CardTitle>
                <CardDescription>Give your design a name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Design Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="My Awesome Design"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-card/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Description (Optional)
                  </label>
                  <Input
                    id="description"
                    type="text"
                    placeholder="Add a description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-card/50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Material Selection */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Choose Material</CardTitle>
                <CardDescription>Select the material for your print</CardDescription>
              </CardHeader>
              <CardContent>
                <MaterialSelector selected={material} onSelect={setMaterial} />
              </CardContent>
            </Card>

            {/* Size Selection */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Size & Orientation</CardTitle>
                <CardDescription>Choose the size and orientation for your print</CardDescription>
              </CardHeader>
              <CardContent>
                <SizeSelector
                  selectedSize={printSize}
                  selectedOrientation={orientation}
                  customWidth={customWidth}
                  customHeight={customHeight}
                  onSizeSelect={setPrintSize}
                  onOrientationSelect={setOrientation}
                  onCustomDimensionsChange={(w, h) => {
                    setCustomWidth(w);
                    setCustomHeight(h);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Upload & Preview */}
          <div className="space-y-8">
            {/* Design Source Selection */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Choose Your Design</CardTitle>
                <CardDescription>
                  Upload your own image or select from our templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tab Buttons */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                  <Button
                    variant={designMode === 'upload' ? 'default' : 'ghost'}
                    className={`flex-1 ${designMode === 'upload' ? 'btn-gradient' : ''}`}
                    onClick={() => setDesignMode('upload')}
                  >
                    Upload Image
                  </Button>
                  <Button
                    variant={designMode === 'template' ? 'default' : 'ghost'}
                    className={`flex-1 ${designMode === 'template' ? 'btn-gradient' : ''}`}
                    onClick={() => setDesignMode('template')}
                  >
                    Choose Template
                  </Button>
                </div>

                {/* Content based on selected mode */}
                {designMode === 'upload' ? (
                  <FileUpload onFileSelect={handleFileSelect} preview={selectedFile ? preview : ''} />
                ) : (
                  <TemplateSelector onSelect={handleTemplateSelect} selectedTemplate={selectedTemplate} />
                )}
              </CardContent>
            </Card>

            {/* Preview */}
            {preview && (
              <Card className="card-glow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Preview</CardTitle>
                      <CardDescription>How your design will look</CardDescription>
                    </div>
                    {/* Preview Mode Toggle */}
                    <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                      <Button
                        variant={previewMode === 'simple' ? 'default' : 'ghost'}
                        size="sm"
                        className={`gap-1 ${previewMode === 'simple' ? 'btn-gradient' : ''}`}
                        onClick={() => setPreviewMode('simple')}
                      >
                        <Eye className="h-4 w-4" />
                        Simple
                      </Button>
                      <Button
                        variant={previewMode === 'mockup' ? 'default' : 'ghost'}
                        size="sm"
                        className={`gap-1 ${previewMode === 'mockup' ? 'btn-gradient' : ''}`}
                        onClick={() => setPreviewMode('mockup')}
                      >
                        <Layers className="h-4 w-4" />
                        Mockup
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {previewMode === 'simple' ? (
                    <div className="space-y-4">
                      <div className="aspect-square w-full bg-card/30 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={preview}
                          alt="Design preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Material</p>
                          <p className="font-medium text-primary">{material.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Size</p>
                          <p className="font-medium text-secondary">{printSize}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Orientation</p>
                          <p className="font-medium text-accent">{orientation}</p>
                        </div>
                        {printSize === 'CUSTOM' && (
                          <div>
                            <p className="text-muted-foreground">Dimensions</p>
                            <p className="font-medium">
                              {customWidth} × {customHeight} cm
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <ProductMockupPreview
                      designUrl={preview}
                      showProductSelector={true}
                      size={400}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewDesignPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
        <DesignEditorContent />
      </Suspense>
    </ProtectedRoute>
  );
}
