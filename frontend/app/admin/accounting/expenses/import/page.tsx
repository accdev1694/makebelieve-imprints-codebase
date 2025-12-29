'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'results';

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

interface PreviewData {
  headers: string[];
  columnMapping: Record<string, string>;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  rows: ParsedRow[];
  categories: Array<{ value: string; label: string }>;
}

interface ImportResult {
  batchId: string;
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ImportBatch {
  id: string;
  fileName: string;
  recordCount: number;
  successCount: number;
  errorCount: number;
  status: string;
  createdAt: string;
}

const EXPENSE_FIELDS = [
  { value: '', label: '-- Skip Column --' },
  { value: 'description', label: 'Description *', required: true },
  { value: 'amount', label: 'Amount *', required: true },
  { value: 'category', label: 'Category' },
  { value: 'purchaseDate', label: 'Purchase Date *', required: true },
  { value: 'supplier', label: 'Supplier' },
  { value: 'externalReference', label: 'Invoice/Reference #' },
  { value: 'vatAmount', label: 'VAT Amount' },
  { value: 'vatRate', label: 'VAT Rate' },
  { value: 'isVatReclaimable', label: 'VAT Reclaimable' },
  { value: 'notes', label: 'Notes' },
];

function CSVImportContent() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load import history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: { batches: ImportBatch[] } }>(
          '/admin/accounting/expenses/import'
        );
        if (response.data?.data?.batches) {
          setImportHistory(response.data.data.batches);
        }
      } catch {
        // Ignore error
      }
    };
    loadHistory();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');

      const response = await apiClient.post<{ success: boolean; data: PreviewData; error?: string }>(
        '/admin/accounting/expenses/import',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data?.data) {
        setPreviewData(response.data.data);
        setColumnMapping(response.data.data.columnMapping);
        setStep('map');
      } else {
        setError(response.data?.error || 'Failed to parse CSV');
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (header: string, field: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [header]: field,
    }));
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const response = await apiClient.post<{ success: boolean; data: PreviewData; error?: string }>(
        '/admin/accounting/expenses/import',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data?.data) {
        setPreviewData(response.data.data);
        setStep('preview');
      } else {
        setError(response.data?.error || 'Failed to preview data');
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to preview data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setStep('importing');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const response = await apiClient.post<{ success: boolean; data: ImportResult; error?: string }>(
        '/admin/accounting/expenses/import',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data?.data) {
        setImportResult(response.data.data);
        setStep('results');
      } else {
        setError(response.data?.error || 'Import failed');
        setStep('preview');
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Import failed');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/admin/accounting/expenses/import?action=template', '_blank');
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setImportResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const requiredFieldsMapped = () => {
    const mappedFields = Object.values(columnMapping);
    return (
      mappedFields.includes('description') &&
      mappedFields.includes('amount') &&
      mappedFields.includes('purchaseDate')
    );
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
            <Link href="/admin/accounting/expenses">
              <Button variant="ghost" size="sm">
                ← Back to Expenses
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-neon-gradient">Import Expenses from CSV</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload and import expenses from a CSV file
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['upload', 'map', 'preview', 'results'] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s || (step === 'importing' && s === 'preview')
                    ? 'bg-primary text-primary-foreground'
                    : ['upload', 'map', 'preview', 'results'].indexOf(step === 'importing' ? 'preview' : step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {['upload', 'map', 'preview', 'results'].indexOf(step === 'importing' ? 'preview' : step) > i ? '✓' : i + 1}
              </div>
              <span className="ml-2 text-sm hidden sm:inline capitalize">{s}</span>
              {i < 3 && <div className="w-8 sm:w-16 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Select a CSV file containing your expense data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-4xl mb-4">📄</div>
                  {file ? (
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Click to select a CSV file</p>
                      <p className="text-sm text-muted-foreground">
                        or drag and drop
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="flex-1"
                  >
                    {loading ? 'Processing...' : 'Upload & Continue'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                  >
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import History */}
            {importHistory.length > 0 && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Imports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {importHistory.slice(0, 5).map((batch) => (
                      <div
                        key={batch.id}
                        className="flex items-center justify-between p-3 bg-card/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{batch.fileName || 'CSV Import'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(batch.createdAt).toLocaleDateString('en-GB')} •{' '}
                            {batch.successCount}/{batch.recordCount} imported
                          </p>
                        </div>
                        <Badge
                          variant={batch.status === 'COMPLETED' ? 'default' : 'secondary'}
                        >
                          {batch.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 'map' && previewData && (
          <div className="max-w-4xl mx-auto">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
                <CardDescription>
                  Match your CSV columns to expense fields. Required fields are marked with *
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {previewData.headers.map((header) => (
                    <div
                      key={header}
                      className="flex items-center gap-4 p-3 bg-card/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium font-mono">{header}</p>
                        {previewData.rows[0]?.data[columnMapping[header] || header] && (
                          <p className="text-sm text-muted-foreground truncate">
                            Example: {previewData.rows[0].data[columnMapping[header] || header]}
                          </p>
                        )}
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <Select
                        value={columnMapping[header] || ''}
                        onValueChange={(value: string) => handleMappingChange(header, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {!requiredFieldsMapped() && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-3 rounded-lg">
                    Please map the required fields: Description, Amount, and Purchase Date
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('upload')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePreview}
                    disabled={!requiredFieldsMapped() || loading}
                    className="flex-1"
                  >
                    {loading ? 'Processing...' : 'Preview Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && previewData && (
          <div className="max-w-6xl mx-auto">
            <Card className="card-glow mb-6">
              <CardHeader>
                <CardTitle>Preview Import</CardTitle>
                <CardDescription>
                  Review the parsed data before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-card/50 rounded-lg">
                    <p className="text-2xl font-bold">{previewData.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{previewData.validRows}</p>
                    <p className="text-sm text-muted-foreground">Valid</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-500">{previewData.warningRows}</p>
                    <p className="text-sm text-muted-foreground">Warnings</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-red-500">{previewData.errorRows}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Row</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Description</th>
                        <th className="text-right py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Category</th>
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`border-b ${
                            row.errors.length > 0
                              ? 'bg-red-500/5'
                              : row.warnings.length > 0
                              ? 'bg-yellow-500/5'
                              : ''
                          }`}
                        >
                          <td className="py-2 px-3">{row.rowNumber}</td>
                          <td className="py-2 px-3">
                            {row.errors.length > 0 ? (
                              <Badge variant="destructive">Error</Badge>
                            ) : row.warnings.length > 0 ? (
                              <Badge className="bg-yellow-500">Warning</Badge>
                            ) : (
                              <Badge variant="default">Valid</Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 max-w-[200px] truncate">
                            {row.data.description || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {row.data.amount || '-'}
                          </td>
                          <td className="py-2 px-3">{row.data.category || '-'}</td>
                          <td className="py-2 px-3">{row.data.purchaseDate || '-'}</td>
                          <td className="py-2 px-3">
                            {row.errors.length > 0 && (
                              <span className="text-red-500 text-xs">
                                {row.errors.join(', ')}
                              </span>
                            )}
                            {row.warnings.length > 0 && (
                              <span className="text-yellow-500 text-xs">
                                {row.warnings.join(', ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep('map')}
                  >
                    Back to Mapping
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={previewData.validRows === 0 || loading}
                    className="flex-1"
                  >
                    {loading ? 'Importing...' : `Import ${previewData.validRows} Expenses`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3.5: Importing */}
        {step === 'importing' && (
          <div className="max-w-md mx-auto">
            <Card className="card-glow">
              <CardContent className="py-12 text-center">
                <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4" />
                <p className="text-lg font-medium">Importing expenses...</p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we process your data
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && importResult && (
          <div className="max-w-2xl mx-auto">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>
                  {importResult.failed === 0 ? '✅ Import Complete!' : '⚠️ Import Complete with Errors'}
                </CardTitle>
                <CardDescription>
                  Your expense data has been processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-card/50 rounded-lg">
                    <p className="text-2xl font-bold">{importResult.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{importResult.imported}</p>
                    <p className="text-sm text-muted-foreground">Imported</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-red-500">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="font-medium text-red-500 mb-2">Import Errors:</p>
                    <ul className="text-sm space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={resetImport}
                    className="flex-1"
                  >
                    Import Another File
                  </Button>
                  <Link href="/admin/accounting/expenses" className="flex-1">
                    <Button className="w-full">
                      View Expenses
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CSVImportPage() {
  return (
    <ProtectedRoute>
      <CSVImportContent />
    </ProtectedRoute>
  );
}
