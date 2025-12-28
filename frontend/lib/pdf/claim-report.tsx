/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// Type workaround for @react-pdf/renderer with React 19
const PDFDocument = Document as any;
const PDFPage = Page as any;
const PDFText = Text as any;
const PDFView = View as any;
const PDFImage = Image as any;

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    flex: 1,
    color: '#000',
  },
  highlightRow: {
    flexDirection: 'row',
    marginBottom: 4,
    backgroundColor: '#fff3cd',
    padding: 4,
  },
  statement: {
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderLeft: '3px solid #007bff',
  },
  statementText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  messageContainer: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSender: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  messageDate: {
    fontSize: 8,
    color: '#666',
  },
  messageContent: {
    fontSize: 9,
    lineHeight: 1.3,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  evidenceImage: {
    width: 150,
    height: 150,
    objectFit: 'cover',
    border: '1px solid #ddd',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTop: '1px solid #ddd',
    paddingTop: 10,
  },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#e7f3ff',
    fontSize: 8,
    lineHeight: 1.4,
  },
  summaryBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#d4edda',
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  summaryLabel: {
    width: 160,
    fontWeight: 'bold',
  },
  summaryValue: {
    flex: 1,
    fontSize: 11,
  },
});

const REASON_LABELS: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item Sent',
  PRINTING_ERROR: 'Printing Error',
  NEVER_ARRIVED: 'Never Arrived',
  OTHER: 'Other',
};

interface ClaimReportData {
  claimReference: string | null;
  orderId: string;
  orderDate: Date;
  trackingNumber: string;
  carrier: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  } | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  itemValue: number;
  issueId: string;
  issueDate: Date;
  issueReason: string;
  customerStatement: string;
  evidenceImages: string[];
  resolutionType: string | null;
  refundAmount: number | null;
  messages: {
    sender: string;
    content: string;
    date: Date;
  }[];
}

interface ClaimReportProps {
  data: ClaimReportData;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClaimReportPDF({ data }: ClaimReportProps) {
  const address = data.shippingAddress;
  const addressString = address
    ? [
        address.name,
        address.addressLine1,
        address.addressLine2,
        address.city,
        address.postcode,
        address.country,
      ]
        .filter(Boolean)
        .join(', ')
    : 'N/A';

  return (
    <PDFDocument>
      <PDFPage size="A4" style={styles.page}>
        {/* Header */}
        <PDFView style={styles.header}>
          <PDFText style={styles.title}>CARRIER DAMAGE CLAIM REPORT</PDFText>
          <PDFText style={styles.subtitle}>
            Royal Mail Compensation Claim Documentation
          </PDFText>
          <PDFText style={styles.subtitle}>
            Generated: {formatDateTime(new Date())}
          </PDFText>
        </PDFView>

        {/* Claim Summary Box */}
        <PDFView style={styles.summaryBox}>
          <PDFText style={styles.summaryTitle}>Claim Summary</PDFText>
          <PDFView style={styles.summaryRow}>
            <PDFText style={styles.summaryLabel}>Tracking Number:</PDFText>
            <PDFText style={styles.summaryValue}>{data.trackingNumber}</PDFText>
          </PDFView>
          <PDFView style={styles.summaryRow}>
            <PDFText style={styles.summaryLabel}>Issue Type:</PDFText>
            <PDFText style={styles.summaryValue}>
              {REASON_LABELS[data.issueReason] || data.issueReason}
            </PDFText>
          </PDFView>
          <PDFView style={styles.summaryRow}>
            <PDFText style={styles.summaryLabel}>Item Value (Claim Amount):</PDFText>
            <PDFText style={styles.summaryValue}>
              £{data.itemValue.toFixed(2)}
            </PDFText>
          </PDFView>
          {data.claimReference && (
            <PDFView style={styles.summaryRow}>
              <PDFText style={styles.summaryLabel}>Claim Reference:</PDFText>
              <PDFText style={styles.summaryValue}>{data.claimReference}</PDFText>
            </PDFView>
          )}
        </PDFView>

        {/* Shipment Details */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Shipment Details</PDFText>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Tracking Number:</PDFText>
            <PDFText style={styles.value}>{data.trackingNumber}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Carrier:</PDFText>
            <PDFText style={styles.value}>{data.carrier}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Order ID:</PDFText>
            <PDFText style={styles.value}>{data.orderId.slice(0, 8).toUpperCase()}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Order Date:</PDFText>
            <PDFText style={styles.value}>{formatDate(data.orderDate)}</PDFText>
          </PDFView>
        </PDFView>

        {/* Customer Details */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Customer Details</PDFText>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Name:</PDFText>
            <PDFText style={styles.value}>{data.customerName}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Email:</PDFText>
            <PDFText style={styles.value}>{data.customerEmail}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Delivery Address:</PDFText>
            <PDFText style={styles.value}>{addressString}</PDFText>
          </PDFView>
        </PDFView>

        {/* Item Details */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Item Details</PDFText>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Product:</PDFText>
            <PDFText style={styles.value}>
              {data.productName}
              {data.variantName ? ` - ${data.variantName}` : ''}
            </PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Quantity:</PDFText>
            <PDFText style={styles.value}>{data.quantity}</PDFText>
          </PDFView>
          <PDFView style={styles.highlightRow}>
            <PDFText style={styles.label}>Item Value:</PDFText>
            <PDFText style={styles.value}>£{data.itemValue.toFixed(2)}</PDFText>
          </PDFView>
        </PDFView>

        {/* Issue Details */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Issue Details</PDFText>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Issue ID:</PDFText>
            <PDFText style={styles.value}>{data.issueId.slice(0, 8).toUpperCase()}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Date Reported:</PDFText>
            <PDFText style={styles.value}>{formatDate(data.issueDate)}</PDFText>
          </PDFView>
          <PDFView style={styles.row}>
            <PDFText style={styles.label}>Issue Type:</PDFText>
            <PDFText style={styles.value}>
              {REASON_LABELS[data.issueReason] || data.issueReason}
            </PDFText>
          </PDFView>
          {data.resolutionType && (
            <PDFView style={styles.row}>
              <PDFText style={styles.label}>Resolution:</PDFText>
              <PDFText style={styles.value}>
                {data.resolutionType === 'REPRINT'
                  ? 'Replacement item sent'
                  : data.resolutionType === 'FULL_REFUND'
                  ? `Full refund issued (£${data.refundAmount?.toFixed(2) || data.itemValue.toFixed(2)})`
                  : `Partial refund issued (£${data.refundAmount?.toFixed(2) || '0.00'})`}
              </PDFText>
            </PDFView>
          )}
        </PDFView>

        {/* Customer Statement */}
        <PDFView style={styles.section}>
          <PDFText style={styles.sectionTitle}>Customer Statement</PDFText>
          <PDFView style={styles.statement}>
            <PDFText style={styles.statementText}>{data.customerStatement}</PDFText>
          </PDFView>
        </PDFView>

        {/* Disclaimer */}
        <PDFView style={styles.disclaimer}>
          <PDFText>
            This document is generated for the purpose of filing a compensation claim
            with Royal Mail. All information provided is accurate to the best of our
            knowledge at the time of generation. Evidence images (if any) are attached
            as separate pages.
          </PDFText>
        </PDFView>

        {/* Footer */}
        <PDFText style={styles.footer}>
          Claim Report Generated by MKBL Print System | Issue ID: {data.issueId}
        </PDFText>
      </PDFPage>

      {/* Evidence Images Page (if any) */}
      {data.evidenceImages.length > 0 && (
        <PDFPage size="A4" style={styles.page}>
          <PDFView style={styles.header}>
            <PDFText style={styles.title}>EVIDENCE IMAGES</PDFText>
            <PDFText style={styles.subtitle}>
              Tracking: {data.trackingNumber} | {data.evidenceImages.length} image(s)
            </PDFText>
          </PDFView>

          <PDFView style={styles.imageGrid}>
            {data.evidenceImages.map((imageUrl, index) => (
              <PDFImage key={index} src={imageUrl} style={styles.evidenceImage} />
            ))}
          </PDFView>

          <PDFText style={styles.footer}>
            Evidence Images | Issue ID: {data.issueId}
          </PDFText>
        </PDFPage>
      )}

      {/* Correspondence Page (if any messages) */}
      {data.messages.length > 0 && (
        <PDFPage size="A4" style={styles.page}>
          <PDFView style={styles.header}>
            <PDFText style={styles.title}>CORRESPONDENCE LOG</PDFText>
            <PDFText style={styles.subtitle}>
              Customer communication regarding this issue
            </PDFText>
          </PDFView>

          {data.messages.map((message, index) => (
            <PDFView key={index} style={styles.messageContainer}>
              <PDFView style={styles.messageHeader}>
                <PDFText style={styles.messageSender}>
                  {message.sender === 'CUSTOMER' ? 'Customer' : 'Support Team'}
                </PDFText>
                <PDFText style={styles.messageDate}>
                  {formatDateTime(message.date)}
                </PDFText>
              </PDFView>
              <PDFText style={styles.messageContent}>{message.content}</PDFText>
            </PDFView>
          ))}

          <PDFText style={styles.footer}>
            Correspondence Log | Issue ID: {data.issueId}
          </PDFText>
        </PDFPage>
      )}
    </PDFDocument>
  );
}
