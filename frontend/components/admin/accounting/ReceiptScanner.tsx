'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useReceiptScanner, ScanStatus } from '@/hooks/useReceiptScanner';
import { ParsedReceipt, parseReceiptText } from '@/lib/ocr/receipt-parser';
import { cn } from '@/lib/utils';
import {
  Camera,
  Upload,
  X,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ClipboardPaste,
  FileText,
} from 'lucide-react';

function formatDateUK(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface ReceiptScannerProps {
  onDataExtracted: (data: Partial<ExtractedReceiptData>) => void;
  onClose?: () => void;
  mode: 'expense' | 'income';
}

export interface ExtractedReceiptData {
  description: string;
  amount: number;
  date: Date;
  vatAmount?: number;
  vatRate?: number;
  vendor?: string;
}

export function ReceiptScanner({ onDataExtracted, onClose, mode }: ReceiptScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [pastedText, setPastedText] = useState('');
  const [textResult, setTextResult] = useState<ParsedReceipt | null>(null);

  const {
    status,
    progress,
    progressMessage,
    result,
    error,
    scanReceipt,
    reset,
  } = useReceiptScanner();

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file) {
        await scanReceipt(file);
      }
    },
    [scanReceipt]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleTextExtract = useCallback(() => {
    if (!pastedText.trim()) return;
    const parsed = parseReceiptText(pastedText);
    setTextResult(parsed);
  }, [pastedText]);

  const handleResetText = useCallback(() => {
    setPastedText('');
    setTextResult(null);
  }, []);

  const handleApplyData = useCallback(() => {
    // Use text result if in text mode, otherwise use image scan result
    const receipt = inputMode === 'text' ? textResult : result?.receipt;
    if (!receipt) return;

    const data: Partial<ExtractedReceiptData> = {};

    if (receipt.vendor) {
      data.description = receipt.vendor;
      data.vendor = receipt.vendor;
    }

    if (receipt.total !== undefined) {
      data.amount = receipt.total;
    }

    if (receipt.date) {
      data.date = receipt.date;
    }

    if (receipt.vatAmount !== undefined) {
      data.vatAmount = receipt.vatAmount;
    }

    if (receipt.vatRate !== undefined) {
      data.vatRate = receipt.vatRate;
    }

    onDataExtracted(data);
    onClose?.();
  }, [inputMode, textResult, result, onDataExtracted, onClose]);

  const renderProgress = () => (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-medium"
          style={{ fontSize: '10px' }}
        >
          {progress}%
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{progressMessage}</p>
      <div className="w-full max-w-xs bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" onClick={reset}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );

  const renderResult = (receipt: ParsedReceipt, isTextMode: boolean = false) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">
          {isTextMode ? 'Data Extracted Successfully' : 'Receipt Scanned Successfully'}
        </span>
      </div>

      {!isTextMode && result?.imagePreview && (
        <div className="relative aspect-[3/4] max-h-48 overflow-hidden rounded-lg border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imagePreview}
            alt="Scanned receipt"
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
        <h4 className="font-medium text-sm">Extracted Data:</h4>
        <div className="grid gap-2 text-sm">
          {receipt.vendor && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor:</span>
              <span className="font-medium">{receipt.vendor}</span>
            </div>
          )}
          {receipt.date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {formatDateUK(receipt.date)}
              </span>
            </div>
          )}
          {receipt.total !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">£{receipt.total.toFixed(2)}</span>
            </div>
          )}
          {receipt.vatAmount !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT:</span>
              <span className="font-medium">
                £{receipt.vatAmount.toFixed(2)}
                {receipt.vatRate && ` (${receipt.vatRate}%)`}
              </span>
            </div>
          )}
          {!isTextMode && (
            <div className="flex justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">Confidence:</span>
              <span className={cn(
                "font-medium",
                receipt.confidence >= 70 ? "text-green-600" :
                receipt.confidence >= 50 ? "text-yellow-600" : "text-red-600"
              )}>
                {Math.round(receipt.confidence)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApplyData} className="flex-1">
          Apply to {mode === 'expense' ? 'Expense' : 'Income'}
        </Button>
        <Button variant="outline" onClick={isTextMode ? handleResetText : reset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {isTextMode ? 'Try Again' : 'Scan Another'}
        </Button>
      </div>
    </div>
  );

  const renderTextInput = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-4 border-muted-foreground/25">
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste your receipt text here...&#10;&#10;Example:&#10;TESCO STORES&#10;15/01/2024&#10;Milk £2.50&#10;Bread £1.20&#10;Total: £3.70&#10;VAT: £0.00"
          className="w-full h-40 bg-transparent border-0 resize-none focus:outline-none text-sm placeholder:text-muted-foreground/50"
        />
      </div>
      <Button
        onClick={handleTextExtract}
        disabled={!pastedText.trim()}
        className="w-full"
      >
        <FileText className="h-4 w-4 mr-2" />
        Extract Data
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Copy text from an email, PDF, or webpage and paste it above
      </p>
    </div>
  );

  const renderUploadArea = () => (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground mb-4">
        Drag and drop a receipt image here, or
      </p>
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose File
        </Button>
        {/* Hide camera button on desktop - only useful on mobile/tablet */}
        <Button
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          className="lg:hidden"
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      <p className="text-xs text-muted-foreground mt-4">
        Supports JPG, PNG, HEIC. Max 10MB.
      </p>
    </div>
  );

  const isProcessing: boolean = ['preprocessing', 'scanning', 'parsing'].includes(status);

  // Determine if we should show mode toggle (only when idle or showing text input without result)
  const showModeToggle = (inputMode === 'image' && status === 'idle') ||
                         (inputMode === 'text' && !textResult);

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {inputMode === 'text' ? 'Extract' : 'Scan'} {mode === 'expense' ? 'Expense' : 'Income'} Receipt
          </h3>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mode Toggle */}
        {showModeToggle && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={inputMode === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('image')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Image
            </Button>
            <Button
              variant={inputMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('text')}
              className="flex-1"
            >
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Paste Text
            </Button>
          </div>
        )}

        {/* Image Mode */}
        {inputMode === 'image' && (
          <>
            {status === 'idle' && renderUploadArea()}
            {isProcessing && renderProgress()}
            {status === 'error' && renderError()}
            {status === 'complete' && result?.receipt && renderResult(result.receipt, false)}
          </>
        )}

        {/* Text Mode */}
        {inputMode === 'text' && (
          <>
            {!textResult && renderTextInput()}
            {textResult && renderResult(textResult, true)}
          </>
        )}
      </CardContent>
    </Card>
  );
}
