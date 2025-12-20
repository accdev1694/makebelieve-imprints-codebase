'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
  Spinner,
  Link,
  Container,
} from '@/components/ui';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <Container>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display-1 text-gradient mb-4">
            MakeBelieve Imprints
          </h1>
          <p className="text-xl text-slate-600">
            Custom print service with personalized designs
          </p>
          <Badge variant="warning" className="mt-4">
            🚧 Component Library Showcase
          </Badge>
        </div>

        {/* Buttons Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="success">Success Button</Button>
              <Button variant="error">Error Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="md">
                Medium
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
              <Button variant="primary" isLoading>
                Loading...
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inputs Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                helperText="We'll never share your email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
              />
              <Input
                label="Invalid Input"
                type="text"
                error="This field has an error"
                placeholder="This has an error"
              />
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Regular Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This is a regular card component with a clean, modern design.
              </p>
            </CardContent>
          </Card>

          <Card hover>
            <CardHeader>
              <CardTitle>Hover Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This card has hover effects. Try hovering over it!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Modal & Spinner Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Modal & Spinner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Modal
              </Button>
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>

        {/* Links Section */}
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Link href="/about">Internal Link</Link>
              </div>
              <div>
                <Link href="https://example.com" external>
                  External Link
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Example Modal"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              This is a modal component with overlay, keyboard support (ESC to close),
              and smooth animations.
            </p>
            <Input
              label="Example Input"
              placeholder="You can interact with content inside"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </Container>
    </main>
  );
}
