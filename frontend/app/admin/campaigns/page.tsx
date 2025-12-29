'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Mail,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Users,
  FileText,
  Loader2,
  TestTube,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  content: string;
  type: 'NEWSLETTER' | 'PROMO' | 'ANNOUNCEMENT' | 'SEASONAL';
  promoId: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

interface Promo {
  id: string;
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
}

interface CampaignFormData {
  name: string;
  subject: string;
  previewText: string;
  content: string;
  type: 'NEWSLETTER' | 'PROMO' | 'ANNOUNCEMENT' | 'SEASONAL';
  promoId: string;
  scheduledAt: string;
}

const initialFormData: CampaignFormData = {
  name: '',
  subject: '',
  previewText: '',
  content: '',
  type: 'NEWSLETTER',
  promoId: '',
  scheduledAt: '',
};

const CAMPAIGN_TYPES = [
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'PROMO', label: 'Promo Announcement' },
  { value: 'ANNOUNCEMENT', label: 'Product Announcement' },
  { value: 'SEASONAL', label: 'Seasonal/Holiday' },
];

function AdminCampaignsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [stats, setStats] = useState({ draft: 0, sent: 0, scheduled: 0, activeSubscribers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Send/Test state
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchCampaigns();
    fetchPromos();
  }, [currentPage]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns?page=${currentPage}&limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load campaigns');
      }

      setCampaigns(data.campaigns);
      setTotalPages(data.pagination.totalPages);
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromos = async () => {
    try {
      const response = await fetch('/api/promos?status=active&limit=100');
      const data = await response.json();
      if (response.ok) {
        setPromos(data.promos || []);
      }
    } catch {
      // Silent fail - promos are optional
    }
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData(initialFormData);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      previewText: campaign.previewText || '',
      content: campaign.content,
      type: campaign.type,
      promoId: campaign.promoId || '',
      scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name,
        subject: formData.subject,
        previewText: formData.previewText || null,
        content: formData.content,
        type: formData.type,
        promoId: formData.promoId || null,
        scheduledAt: formData.scheduledAt || null,
      };

      const url = editingCampaign ? `/api/campaigns/${editingCampaign.id}` : '/api/campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save campaign');
      }

      setShowModal(false);
      fetchCampaigns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save campaign';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }

      fetchCampaigns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete campaign';
      setError(message);
    }
  };

  const handleSend = async (campaign: Campaign) => {
    if (!confirm(`Send "${campaign.name}" to ${stats.activeSubscribers} subscribers?`)) {
      return;
    }

    setSendingId(campaign.id);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send campaign');
      }

      alert(data.message);
      fetchCampaigns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send campaign';
      setError(message);
    } finally {
      setSendingId(null);
    }
  };

  const handleTest = async (campaign: Campaign) => {
    const testEmail = prompt('Enter email address to send test to:', user?.email || '');
    if (!testEmail) return;

    setTestingId(campaign.id);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      alert(data.message);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send test email';
      setError(message);
    } finally {
      setTestingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { className: string; icon: React.ReactNode }> = {
      DRAFT: { className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <FileText className="h-3 w-3" /> },
      SCHEDULED: { className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Clock className="h-3 w-3" /> },
      SENDING: { className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      SENT: { className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="h-3 w-3" /> },
      FAILED: { className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <AlertCircle className="h-3 w-3" /> },
      CANCELLED: { className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <X className="h-3 w-3" /> },
    };
    const badge = badges[status] || badges.DRAFT;
    return (
      <Badge className={`${badge.className} flex items-center gap-1`}>
        {badge.icon}
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      NEWSLETTER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      PROMO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      ANNOUNCEMENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      SEASONAL: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
    return <Badge className={colors[type] || 'bg-gray-500/20'}>{type.toLowerCase()}</Badge>;
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Email Campaigns</span>
            </h1>
          </div>
          <Button onClick={openCreateModal} className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.activeSubscribers}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Drafts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-400">{stats.draft}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-400">{stats.scheduled}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{stats.sent}</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>Create and send email campaigns to your subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading campaigns...</p>
                </div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No campaigns yet</p>
                <Button onClick={openCreateModal} className="mt-4">
                  Create Your First Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{campaign.name}</h4>
                        {getStatusBadge(campaign.status)}
                        {getTypeBadge(campaign.type)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{campaign.subject}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {campaign.status === 'SENT' && (
                          <span>
                            Sent to {campaign.sentCount} / {campaign.recipientCount}
                            {campaign.failedCount > 0 && ` (${campaign.failedCount} failed)`}
                          </span>
                        )}
                        {campaign.sentAt && (
                          <span>Sent {new Date(campaign.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        )}
                        {campaign.scheduledAt && campaign.status === 'SCHEDULED' && (
                          <span>Scheduled for {new Date(campaign.scheduledAt).toLocaleString('en-GB')}</span>
                        )}
                        {!campaign.sentAt && !campaign.scheduledAt && (
                          <span>Created {new Date(campaign.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTest(campaign)}
                            disabled={testingId === campaign.id}
                            title="Send test email"
                          >
                            {testingId === campaign.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSend(campaign)}
                            disabled={sendingId === campaign.id || stats.activeSubscribers === 0}
                            title="Send to all subscribers"
                            className="text-green-400 hover:text-green-300"
                          >
                            {sendingId === campaign.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(campaign)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {campaign.status !== 'SENT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(campaign)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-bold">
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Sale Announcement"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Summer Sale - Up to 30% Off!"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preview Text</label>
                <input
                  type="text"
                  value={formData.previewText}
                  onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                  placeholder="Short preview shown in inbox"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as CampaignFormData['type'] })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  >
                    {CAMPAIGN_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.type === 'PROMO' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Link Promo Code</label>
                    <select
                      value={formData.promoId}
                      onChange={(e) => setFormData({ ...formData, promoId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    >
                      <option value="">Select a promo...</option>
                      {promos.map((promo) => (
                        <option key={promo.id} value={promo.id}>
                          {promo.code} - {promo.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Content (HTML) *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="<h2>Hello!</h2><p>Check out our amazing deals...</p>"
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Write the main content in HTML. The email header, footer, and promo code block will be added automatically.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Schedule Send</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to save as draft for manual sending
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient" loading={submitting}>
                  {editingCampaign ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCampaignsPage() {
  return (
    <ProtectedRoute>
      <AdminCampaignsContent />
    </ProtectedRoute>
  );
}
