import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { sendRecoveryEmail } from './email';
import { RecoveryType } from '@prisma/client';

// Configuration constants
const RECOVERY_THRESHOLD_DAYS = 3;
const RECOVERY_PROMO_DISCOUNT = 10; // 10%
const RECOVERY_PROMO_VALIDITY_DAYS = 7;
const MIN_RECOVERY_EMAIL_INTERVAL_DAYS = 14;
const PROMO_CODE_PREFIX = 'COMEBACK';

interface RecoveryItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
}

interface EligibleUser {
  userId: string;
  email: string;
  name: string;
  type: RecoveryType;
  items: RecoveryItem[];
  oldestItemDate: Date;
  totalValue: number;
}

/**
 * Generate a unique promo code for recovery campaigns
 */
export function generateRecoveryPromoCode(): string {
  return `${PROMO_CODE_PREFIX}-${nanoid(7).toUpperCase()}`;
}

/**
 * Find users eligible for recovery campaigns
 * - Has cart or wishlist items older than threshold
 * - No recent orders (within threshold days)
 * - No active recovery campaign
 * - No recent recovery email (within interval)
 */
export async function findEligibleRecoveryUsers(): Promise<EligibleUser[]> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - RECOVERY_THRESHOLD_DAYS);

  const minEmailDate = new Date();
  minEmailDate.setDate(minEmailDate.getDate() - MIN_RECOVERY_EMAIL_INTERVAL_DAYS);

  const eligibleUsers: EligibleUser[] = [];

  // Find users with stale cart items
  const usersWithStaleCart = await prisma.user.findMany({
    where: {
      cartItems: {
        some: {
          addedAt: { lte: thresholdDate },
        },
      },
      // No recent recovery email
      OR: [
        { lastRecoveryEmailAt: null },
        { lastRecoveryEmailAt: { lte: minEmailDate } },
      ],
      // No active recovery campaign
      recoveryCampaigns: {
        none: {
          status: { in: ['PENDING', 'SENT'] },
        },
      },
      // No recent orders
      orders: {
        none: {
          createdAt: { gte: thresholdDate },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      cartItems: {
        where: {
          addedAt: { lte: thresholdDate },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: {
                select: { imageUrl: true },
                take: 1,
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { addedAt: 'asc' },
      },
    },
  });

  for (const user of usersWithStaleCart) {
    if (user.cartItems.length > 0) {
      const items: RecoveryItem[] = user.cartItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
        price: Number(item.unitPrice),
      }));

      const totalValue = user.cartItems.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0
      );

      eligibleUsers.push({
        userId: user.id,
        email: user.email,
        name: user.name || 'there',
        type: 'CART' as RecoveryType,
        items,
        oldestItemDate: user.cartItems[0].addedAt,
        totalValue,
      });
    }
  }

  // Find users with stale wishlist items (if no cart items found)
  const existingCartUserIds = eligibleUsers.map((u) => u.userId);

  const usersWithStaleWishlist = await prisma.user.findMany({
    where: {
      id: { notIn: existingCartUserIds },
      wishlistItems: {
        some: {
          createdAt: { lte: thresholdDate },
        },
      },
      OR: [
        { lastRecoveryEmailAt: null },
        { lastRecoveryEmailAt: { lte: minEmailDate } },
      ],
      recoveryCampaigns: {
        none: {
          status: { in: ['PENDING', 'SENT'] },
        },
      },
      orders: {
        none: {
          createdAt: { gte: thresholdDate },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      wishlistItems: {
        where: {
          createdAt: { lte: thresholdDate },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              images: {
                select: { imageUrl: true },
                take: 1,
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  for (const user of usersWithStaleWishlist) {
    if (user.wishlistItems.length > 0) {
      const items: RecoveryItem[] = user.wishlistItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
        price: Number(item.product.basePrice),
      }));

      const totalValue = user.wishlistItems.reduce(
        (sum, item) => sum + Number(item.product.basePrice),
        0
      );

      eligibleUsers.push({
        userId: user.id,
        email: user.email,
        name: user.name || 'there',
        type: 'WISHLIST' as RecoveryType,
        items,
        oldestItemDate: user.wishlistItems[0].createdAt,
        totalValue,
      });
    }
  }

  return eligibleUsers;
}

/**
 * Create a recovery promo code for a user
 */
export async function createRecoveryPromo(_userId: string): Promise<{ id: string; code: string }> {
  const code = generateRecoveryPromoCode();
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RECOVERY_PROMO_VALIDITY_DAYS);

  const promo = await prisma.promo.create({
    data: {
      code,
      name: `Recovery ${RECOVERY_PROMO_DISCOUNT}% Off`,
      description: `Recovery discount - ${RECOVERY_PROMO_DISCOUNT}% off for returning customer`,
      discountType: 'PERCENTAGE',
      discountValue: RECOVERY_PROMO_DISCOUNT,
      scope: 'ALL_PRODUCTS',
      maxUses: 1,
      maxUsesPerUser: 1,
      startsAt: now,
      expiresAt,
      isActive: true,
      isRecoveryPromo: true,
    },
  });

  return { id: promo.id, code: promo.code };
}

/**
 * Create a recovery campaign for a user
 */
export async function createRecoveryCampaign(
  user: EligibleUser
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RECOVERY_PROMO_VALIDITY_DAYS);

  // Create promo and campaign in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the promo
    const promoCode = generateRecoveryPromoCode();
    const now = new Date();

    const promo = await tx.promo.create({
      data: {
        code: promoCode,
        name: `Recovery ${RECOVERY_PROMO_DISCOUNT}% Off`,
        description: `Recovery discount - ${RECOVERY_PROMO_DISCOUNT}% off for returning customer`,
        discountType: 'PERCENTAGE',
        discountValue: RECOVERY_PROMO_DISCOUNT,
        scope: 'ALL_PRODUCTS',
        maxUses: 1,
        maxUsesPerUser: 1,
        startsAt: now,
        expiresAt,
        isActive: true,
        isRecoveryPromo: true,
      },
    });

    // Create the campaign
    const campaign = await tx.recoveryCampaign.create({
      data: {
        userId: user.userId,
        type: user.type,
        status: 'PENDING',
        triggerItemCount: user.items.length,
        triggerTotalValue: user.totalValue,
        oldestItemDate: user.oldestItemDate,
        promoId: promo.id,
        promoCode: promo.code,
        expiresAt,
      },
    });

    return campaign.id;
  });

  return result;
}

/**
 * Process a pending recovery campaign (send email)
 */
export async function processRecoveryCampaign(campaignId: string): Promise<boolean> {
  const campaign = await prisma.recoveryCampaign.findUnique({
    where: { id: campaignId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!campaign || campaign.status !== 'PENDING') {
    console.log(`[Recovery] Campaign ${campaignId} not found or not pending`);
    return false;
  }

  // Get items to include in email
  let items: RecoveryItem[] = [];

  if (campaign.type === 'CART') {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: campaign.userId },
      include: {
        product: {
          select: {
            name: true,
            images: {
              select: { imageUrl: true },
              take: 1,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      take: 5,
    });

    items = cartItems.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
      price: Number(item.unitPrice),
    }));
  } else {
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: campaign.userId },
      include: {
        product: {
          select: {
            name: true,
            basePrice: true,
            images: {
              select: { imageUrl: true },
              take: 1,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      take: 5,
    });

    items = wishlistItems.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
      price: Number(item.product.basePrice),
    }));
  }

  // Calculate days left
  const daysLeft = Math.ceil(
    (campaign.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Send the email
  const emailSent = await sendRecoveryEmail({
    to: campaign.user.email,
    firstName: campaign.user.name?.split(' ')[0] || 'there',
    type: campaign.type,
    items,
    promoCode: campaign.promoCode!,
    discountPercent: RECOVERY_PROMO_DISCOUNT,
    daysLeft,
  });

  if (emailSent) {
    // Update campaign and user
    await prisma.$transaction([
      prisma.recoveryCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'SENT',
          emailSentAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: campaign.userId },
        data: {
          lastRecoveryEmailAt: new Date(),
        },
      }),
    ]);

    console.log(`[Recovery] Email sent for campaign ${campaignId}`);
    return true;
  }

  console.error(`[Recovery] Failed to send email for campaign ${campaignId}`);
  return false;
}

/**
 * Check if an order used a recovery promo and mark campaign as converted
 */
export async function checkRecoveryConversion(
  userId: string,
  orderId: string,
  promoCode: string,
  orderTotal: number
): Promise<boolean> {
  // Find a campaign with this promo code
  const campaign = await prisma.recoveryCampaign.findFirst({
    where: {
      userId,
      promoCode,
      status: 'SENT',
    },
  });

  if (!campaign) {
    return false;
  }

  // Mark as converted
  await prisma.recoveryCampaign.update({
    where: { id: campaign.id },
    data: {
      status: 'CONVERTED',
      convertedOrderId: orderId,
      convertedAt: new Date(),
      recoveredRevenue: orderTotal,
    },
  });

  console.log(`[Recovery] Campaign ${campaign.id} converted with order ${orderId}`);
  return true;
}

/**
 * Mark expired campaigns
 */
export async function markExpiredCampaigns(): Promise<number> {
  const now = new Date();

  const result = await prisma.recoveryCampaign.updateMany({
    where: {
      status: { in: ['PENDING', 'SENT'] },
      expiresAt: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (result.count > 0) {
    console.log(`[Recovery] Marked ${result.count} campaigns as expired`);
  }

  return result.count;
}

/**
 * Cancel pending/sent campaigns for a user (e.g., when they place an order)
 */
export async function cancelUserCampaigns(userId: string): Promise<number> {
  const result = await prisma.recoveryCampaign.updateMany({
    where: {
      userId,
      status: { in: ['PENDING', 'SENT'] },
    },
    data: {
      status: 'CANCELLED',
    },
  });

  if (result.count > 0) {
    console.log(`[Recovery] Cancelled ${result.count} campaigns for user ${userId}`);
  }

  return result.count;
}

/**
 * Get recovery automation settings
 */
export async function getRecoverySettings(): Promise<{ isPaused: boolean }> {
  // For now, store in a simple way - could be expanded to use a settings table
  const setting = await prisma.$queryRaw<{ value: string }[]>`
    SELECT value FROM system_settings WHERE key = 'recovery_automation_paused' LIMIT 1
  `.catch(() => [] as { value: string }[]);

  const firstSetting = setting[0];
  return {
    isPaused: firstSetting?.value === 'true',
  };
}

/**
 * Update recovery automation settings
 */
export async function updateRecoverySettings(isPaused: boolean): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES ('recovery_automation_paused', ${isPaused ? 'true' : 'false'}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${isPaused ? 'true' : 'false'}, updated_at = NOW()
  `.catch(async () => {
    // Table doesn't exist, create it
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('recovery_automation_paused', ${isPaused ? 'true' : 'false'}, NOW())
    `;
  });
}
