'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Camera, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { IssueMessage, canMessageOnIssue, Issue } from './types';
import { storageService } from '@/lib/api/storage';

interface IssueMessagingProps {
  issue: Issue;
  sendingMessage: boolean;
  onSendMessage: (content: string, imageUrls: string[]) => Promise<void>;
}

function MessageBubble({ message }: { message: IssueMessage }) {
  const isAdmin = message.sender === 'ADMIN';

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isAdmin
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {isAdmin ? 'Admin' : 'Customer'}
          </span>
          <span className={`text-xs ${isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.imageUrls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-12 h-12 rounded overflow-hidden border border-border/50 hover:border-border transition-colors relative"
              >
                <Image
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function IssueMessaging({ issue, sendingMessage, onSendMessage }: IssueMessagingProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageImages, setMessageImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const canMessage = canMessageOnIssue(issue);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [issue.messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (messageImages.length >= 5) {
      alert('Maximum 5 images allowed per message');
      return;
    }

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await storageService.uploadFile(file);
      setMessageImages((prev) => [...prev, imageUrl]);
    } catch (err: unknown) {
      const error = err as { message?: string };
      alert(error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setMessageImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!messageContent.trim() && messageImages.length === 0) || sendingMessage) return;

    await onSendMessage(
      messageContent.trim() || (messageImages.length > 0 ? '(Image attached)' : ''),
      messageImages.length > 0 ? messageImages : []
    );
    setMessageContent('');
    setMessageImages([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Correspondence
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issue.messages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No messages yet.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {issue.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {canMessage && (
          <div className="mt-4 pt-4 border-t border-border">
            <Textarea
              placeholder="Type your message to customer..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={3}
              className="mb-3"
            />

            {/* Image Preview */}
            {messageImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {messageImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border relative">
                      <Image
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              {/* Image Upload Button */}
              <div>
                {messageImages.length < 5 && (
                  <label htmlFor="admin-message-image-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                      {uploadingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Add Image</span>
                        </>
                      )}
                    </div>
                  </label>
                )}
                <input
                  id="admin-message-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={(!messageContent.trim() && messageImages.length === 0) || sendingMessage}
                loading={sendingMessage}
              >
                Send Message
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
