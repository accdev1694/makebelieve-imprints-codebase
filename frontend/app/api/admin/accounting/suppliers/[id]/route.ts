import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

/**
 * GET /api/admin/accounting/suppliers/[id]
 * Get a single supplier by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        expenses: {
          orderBy: { purchaseDate: 'desc' },
          take: 10,
          select: {
            id: true,
            description: true,
            amount: true,
            purchaseDate: true,
            category: true,
          },
        },
        _count: {
          select: { expenses: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Calculate total spent
    const totals = await prisma.expense.aggregate({
      where: { supplierId: supplier.id },
      _sum: { amount: true },
    });

    const supplierContactInfo = supplier.contactInfo as ContactInfo | null;

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        contactEmail: supplierContactInfo?.email || null,
        contactPhone: supplierContactInfo?.phone || null,
        address: supplierContactInfo?.address || null,
        taxId: supplierContactInfo?.taxId || null,
        expenses: supplier.expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
        })),
        totalSpent: Number(totals._sum.amount || 0),
        expenseCount: supplier._count.expenses,
      },
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/accounting/suppliers/[id]
 * Update a supplier
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, contactEmail, contactPhone, address, website, notes, taxId } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name (excluding current supplier)
    const duplicate = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });

    if (duplicate) {
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

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : Prisma.DbNull,
        website: website || null,
        notes: notes || null,
      },
    });

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
    console.error('Update supplier error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/accounting/suppliers/[id]
 * Delete a supplier
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if supplier has expenses
    if (existing._count.expenses > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete supplier with ${existing._count.expenses} associated expense(s). Remove the expenses first or reassign them to another supplier.`,
        },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return handleApiError(error);
  }
}
