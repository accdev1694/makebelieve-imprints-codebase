/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Type workaround for @react-pdf/renderer with React 19
const PDFDocument = Document as any;
const PDFPage = Page as any;
const PDFText = Text as any;
const PDFView = View as any;

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2px solid #6366f1',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.4,
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 11,
    marginBottom: 3,
  },
  invoiceDate: {
    fontSize: 10,
    color: '#666',
  },
  paidBadge: {
    marginTop: 10,
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '5px 12px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerBox: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  customerDetail: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    padding: 10,
    borderRadius: '4px 4px 0 0',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1px solid #e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 250,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: '#4b5563',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: '2px solid #6366f1',
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 15,
  },
  footerText: {
    marginBottom: 3,
  },
  thankYou: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    textAlign: 'center',
  },
  thankYouText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: 'bold',
  },
  thankYouSubtext: {
    fontSize: 10,
    color: '#0369a1',
    marginTop: 5,
  },
});

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;

  // Customer
  customerName: string;
  customerEmail: string;

  // Order reference
  orderReference: string;

  // Items
  items: InvoiceItem[];

  // Totals
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
}

interface InvoicePDFProps {
  data: InvoiceData;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function InvoicePDF({ data }: InvoicePDFProps) {
  return (
    <PDFDocument>
      <PDFPage size="A4" style={styles.page}>
        {/* Header */}
        <PDFView style={styles.header}>
          <PDFView style={styles.companyInfo}>
            <PDFText style={styles.companyName}>MakeBelieve Imprints</PDFText>
            <PDFText style={styles.companyDetails}>
              Custom Print Services{'\n'}
              United Kingdom{'\n'}
              hello@makebelieveimprints.co.uk
            </PDFText>
          </PDFView>
          <PDFView style={styles.invoiceInfo}>
            <PDFText style={styles.invoiceTitle}>INVOICE</PDFText>
            <PDFText style={styles.invoiceNumber}>{data.invoiceNumber}</PDFText>
            <PDFText style={styles.invoiceDate}>
              Date: {formatDate(data.issueDate)}
            </PDFText>
            <PDFView style={styles.paidBadge}>
              <PDFText>PAID</PDFText>
            </PDFView>
          </PDFView>
        </PDFView>

        {/* Bill To */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Bill To</PDFText>
          <PDFView style={styles.customerBox}>
            <PDFText style={styles.customerName}>{data.customerName}</PDFText>
            <PDFText style={styles.customerDetail}>{data.customerEmail}</PDFText>
            <PDFText style={styles.customerDetail}>
              Order Reference: #{data.orderReference}
            </PDFText>
          </PDFView>
        </PDFView>

        {/* Items Table */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Order Details</PDFText>
          <PDFView style={styles.table}>
            {/* Table Header */}
            <PDFView style={styles.tableHeader}>
              <PDFText style={[styles.tableHeaderCell, styles.colDescription]}>
                Description
              </PDFText>
              <PDFText style={[styles.tableHeaderCell, styles.colQty]}>
                Qty
              </PDFText>
              <PDFText style={[styles.tableHeaderCell, styles.colPrice]}>
                Price
              </PDFText>
              <PDFText style={[styles.tableHeaderCell, styles.colTotal]}>
                Total
              </PDFText>
            </PDFView>

            {/* Table Rows */}
            {data.items.map((item, index) => (
              <PDFView
                key={index}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <PDFText style={styles.colDescription}>{item.description}</PDFText>
                <PDFText style={styles.colQty}>{item.quantity}</PDFText>
                <PDFText style={styles.colPrice}>
                  {formatCurrency(item.unitPrice, data.currency)}
                </PDFText>
                <PDFText style={styles.colTotal}>
                  {formatCurrency(item.total, data.currency)}
                </PDFText>
              </PDFView>
            ))}
          </PDFView>
        </PDFView>

        {/* Totals */}
        <PDFView style={styles.totalsSection}>
          <PDFView style={styles.totalsBox}>
            <PDFView style={styles.totalRow}>
              <PDFText style={styles.totalLabel}>Subtotal (excl. VAT)</PDFText>
              <PDFText style={styles.totalValue}>
                {formatCurrency(data.subtotal, data.currency)}
              </PDFText>
            </PDFView>
            <PDFView style={styles.totalRow}>
              <PDFText style={styles.totalLabel}>VAT ({data.vatRate}%)</PDFText>
              <PDFText style={styles.totalValue}>
                {formatCurrency(data.vatAmount, data.currency)}
              </PDFText>
            </PDFView>
            <PDFView style={styles.grandTotalRow}>
              <PDFText style={styles.grandTotalLabel}>Total Paid</PDFText>
              <PDFText style={styles.grandTotalValue}>
                {formatCurrency(data.total, data.currency)}
              </PDFText>
            </PDFView>
          </PDFView>
        </PDFView>

        {/* Thank You */}
        <PDFView style={styles.thankYou}>
          <PDFText style={styles.thankYouText}>
            Thank you for your order!
          </PDFText>
          <PDFText style={styles.thankYouSubtext}>
            We appreciate your business and hope you love your custom prints.
          </PDFText>
        </PDFView>

        {/* Footer */}
        <PDFView style={styles.footer}>
          <PDFText style={styles.footerText}>
            MakeBelieve Imprints | Custom Print Services
          </PDFText>
          <PDFText style={styles.footerText}>
            www.makebelieveimprints.co.uk | hello@makebelieveimprints.co.uk
          </PDFText>
          <PDFText style={styles.footerText}>
            Invoice {data.invoiceNumber} | Generated automatically
          </PDFText>
        </PDFView>
      </PDFPage>
    </PDFDocument>
  );
}
