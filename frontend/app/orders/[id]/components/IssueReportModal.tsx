'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { storageService } from '@/lib/api/storage';
import apiClient from '@/lib/api/client';
import type { OrderItemWithIssue, ItemIssue } from './types';
import { ISSUE_REASONS } from './types';

interface IssueReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  selectedItem: OrderItemWithIssue | null;
  itemIssues: Record<string, ItemIssue>;
  onIssueSubmitted: () => void;
}

export function IssueReportModal({
  open,
  onOpenChange,
  orderId,
  selectedItem,
  itemIssues,
  onIssueSubmitted,
}: IssueReportModalProps) {
  const [issueReason, setIssueReason] = useState('');
  const [issuePreference, setIssuePreference] = useState<'REPRINT' | 'REFUND' | ''>('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueImages, setIssueImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [issueError, setIssueError] = useState('');

  const resetForm = () => {
    setIssueReason('');
    setIssuePreference('');
    setIssueNotes('');
    setIssueImages([]);
    setIssueError('');
    setIssueSuccess(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (issueImages.length >= 5) {
      setIssueError('Maximum 5 images allowed');
      return;
    }

    const file = files[0];

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setIssueError('Please upload a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setIssueError('Image must be less than 10MB. Large images will be automatically compressed.');
      return;
    }

    setUploadingImage(true);
    setIssueError('');

    try {
      const imageUrl = await storageService.uploadFile(file);
      setIssueImages((prev) => [...prev, imageUrl]);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setIssueError(error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setIssueImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReportIssue = async () => {
    if (!selectedItem) return;
    if (!issueReason) {
      setIssueError('Please select an issue type');
      return;
    }
    if (!issuePreference) {
      setIssueError('Please select what you would like us to do (replacement or refund)');
      return;
    }
    if (!issueNotes.trim()) {
      setIssueError('Please provide additional details about the issue');
      return;
    }
    if (issueImages.length === 0) {
      setIssueError('Please upload at least one photo showing the issue');
      return;
    }

    setSubmittingIssue(true);
    setIssueError('');

    try {
      await apiClient.post(`/orders/${orderId}/items/${selectedItem.id}/issue`, {
        reason: issueReason,
        preferredResolution: issuePreference,
        notes: issueNotes,
        imageUrls: issueImages,
      });
      setIssueSuccess(true);
      onIssueSubmitted();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setIssueError(
        error?.response?.data?.error || error?.message || 'Failed to submit issue report'
      );
    } finally {
      setSubmittingIssue(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            {selectedItem && (
              <span>
                Reporting issue for: <strong>{selectedItem.product?.name || 'Item'}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {issueSuccess ? (
          <div className="py-6 text-center">
            <div className="text-4xl mb-4">{'\u2713'}</div>
            <h3 className="text-lg font-semibold text-green-500 mb-2">
              Issue Reported Successfully
            </h3>
            <p className="text-muted-foreground mb-4">
              Our team will review your issue and respond within 1-2 business days.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              {selectedItem && itemIssues[selectedItem.id] && (
                <Link href={`/account/issues/${itemIssues[selectedItem.id].id}`}>
                  <Button>View Issue</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="issue-reason">
                  What&apos;s the issue? <span className="text-destructive">*</span>
                </Label>
                <Select value={issueReason} onValueChange={setIssueReason}>
                  <SelectTrigger id="issue-reason">
                    <SelectValue placeholder="Select issue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        <div>
                          <div className="font-medium">{reason.label}</div>
                          <div className="text-xs text-muted-foreground">{reason.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution Preference */}
              <div className="space-y-2">
                <Label>
                  What would you like us to do? <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIssuePreference('REPRINT')}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      issuePreference === 'REPRINT'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                        : 'border-border hover:border-purple-500/50 hover:bg-purple-500/5'
                    }`}
                  >
                    <div className="text-2xl mb-1">{'\uD83D\uDD04'}</div>
                    <div className="font-medium">Send Replacement</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Free reprint shipped to you
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssuePreference('REFUND')}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      issuePreference === 'REFUND'
                        ? 'border-green-500 bg-green-500/10 text-green-500'
                        : 'border-border hover:border-green-500/50 hover:bg-green-500/5'
                    }`}
                  >
                    <div className="text-2xl mb-1">{'\uD83D\uDCB0'}</div>
                    <div className="font-medium">Issue Refund</div>
                    <div className="text-xs text-muted-foreground mt-1">Get your money back</div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-notes">
                  Additional Details <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="issue-notes"
                  placeholder="Please describe the issue in detail..."
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Please provide a detailed description of the issue to help us resolve it quickly.
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>
                  Photos of the Issue <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Please upload at least 1 photo (up to 5) showing the damage or issue to help us
                  investigate.
                </p>

                {issueImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {issueImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-border relative">
                          <Image
                            src={url}
                            alt={`Issue photo ${index + 1}`}
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {issueImages.length < 5 && (
                  <div className="flex gap-2">
                    <label htmlFor="issue-image-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                        {uploadingImage ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                            <span className="text-sm">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {issueImages.length === 0 ? 'Add Photos' : 'Add More'}
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                    <input
                      id="issue-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {issueError && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm">
                  {issueError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReportIssue}
                disabled={
                  !issueReason || !issuePreference || !issueNotes.trim() || issueImages.length === 0
                }
                loading={submittingIssue}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Submit Report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
