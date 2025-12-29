import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

/**
 * GET /api/admin/accounting/suppliers
 * List all suppliers with expense totals
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate total spent per supplier
    const supplierStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const totals = await prisma.expense.aggregate({
          where: { supplierId: supplier.id },
          _sum: { amount: true },
        });

        const lastExpense = await prisma.expense.findFirst({
          where: { supplierId: supplier.id },
          orderBy: { purchaseDate: 'desc' },
          select: { purchaseDate: true },
        });

        const supplierContactInfo = supplier.contactInfo as ContactInfo | null;

        return {
          ...supplier,
          contactEmail: supplierContactInfo?.email || null,
          contactPhone: supplierContactInfo?.phone || null,
          address: supplierContactInfo?.address || null,
          taxId: supplierContactInfo?.taxId || null,
          totalSpent: Number(totals._sum.amount || 0),
          expenseCount: supplier._count.expenses,
          lastPurchase: lastExpense?.purchaseDate || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        suppliers: supplierStats,
      },
    });
  } catch (error) {
    console.error('List suppliers error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/accounting/suppliers
 * Create a new supplier
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { name, contactEmail, contactPhone, address, website, notes, taxId } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A supplier with this name already exists' },
        { status: 400 }
      );
    }

    // Build contactInfo JSON
    const contactInfo: Record<string, string> = {};
    if (contactEmail) contactInfo.email = contactEmail;
    if (contactPhone) contactInfo.phone = contactPhone;
    if (address) contactInfo.address = address;
    if (taxId) contactInfo.taxId = taxId;

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : Prisma.DbNull,
        website: website || null,
        notes: notes || null,
      },
    });

    // Extract contactInfo for response
    const supplierContactInfo = supplier.contactInfo as ContactInfo | null;

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        contactEmail: supplierContactInfo?.email || null,
        contactPhone: supplierContactInfo?.phone || null,
        address: supplierContactInfo?.address || null,
        taxId: supplierContactInfo?.taxId || null,
      },
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return handleApiError(error);
  }
}
