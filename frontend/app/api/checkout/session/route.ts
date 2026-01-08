import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { validateAndRecordPromoUsage } from '@/lib/server/promo-service';
import { redeemPoints } from '@/lib/server/points-service';
import { cancelUserCampaigns, checkRecoveryConversion } from '@/lib/server/recovery-service';
import { nanoid } from 'nanoid';
import { TOKEN_LENGTH, TAX } from '@/lib/config/constants';
import { Prisma } from '@prisma/client';

// Lazy initialization of Stripe to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

function generateShareToken(): string {
  return nanoid(TOKEN_LENGTH.SHARE_TOKEN);
}

/**
 * POST /api/checkout/session
 * Create order from cart items and return Stripe checkout session
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const {
      cartItemIds,
      shippingAddress,
      shippingMethod: _shippingMethod,
      email,
      phone: _phone,
      promoCode,
      pointsToRedeem,
    } = body;

    // Validate required fields
    if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return NextResponse.json(
        { error: 'No items selected for checkout' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.addressLine1) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      );
    }

    // Fetch cart items with product and variant details
    const cartItems = await prisma.cartItem.findMany({
      where: {
        id: { in: cartItemIds },
        userId: user.userId,
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid cart items found' },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = cartItems.map((item) => {
      const unitPrice = item.variant?.price
        ? Number(item.product?.basePrice || 0) + Number(item.variant.price)
        : Number(item.product?.basePrice || 0);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        product: { connect: { id: item.productId } },
        variant: item.variantId ? { connect: { id: item.variantId } } : undefined,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        customization: item.customization as Prisma.InputJsonValue || undefined,
      };
    });

    // Calculate tax (UK VAT 20%)
    const tax = subtotal * TAX.VAT_RATE;

    // Apply promo discount if provided
    let discountAmount = 0;
    if (promoCode) {
      // Validate promo code
      const promo = await prisma.promo.findUnique({
        where: { code: promoCode.toUpperCase() },
      });

      if (promo && promo.isActive) {
        const discountValue = Number(promo.discountValue);
        if (promo.discountType === 'PERCENTAGE') {
          discountAmount = (subtotal * discountValue) / 100;
        } else {
          discountAmount = discountValue;
        }
      }
    }

    // Apply points discount
    let pointsDiscount = 0;
    if (pointsToRedeem && pointsToRedeem > 0) {
      pointsDiscount = pointsToRedeem / 100; // 100 points = £1
    }

    const totalPrice = Math.max(0, subtotal + tax - discountAmount - pointsDiscount);

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId: user.userId,
          subtotal,
          discountAmount,
          promoCode: promoCode || null,
          totalPrice,
          shippingAddress,
          status: 'pending',
          shareToken: generateShareToken(),
          pointsUsed: pointsToRedeem || 0,
          pointsDiscount,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Record promo usage if applicable
      if (promoCode && discountAmount > 0) {
        const promoResult = await validateAndRecordPromoUsage(tx, promoCode, {
          userId: user.userId,
          email: email?.toLowerCase() || user.email?.toLowerCase(),
          orderId: newOrder.id,
          discountAmount,
          cartTotal: subtotal,
        });

        if (!promoResult.success) {
          throw new Error(`Promo code error: ${promoResult.error}`);
        }
      }

      // Redeem points if applicable
      if (pointsToRedeem && pointsToRedeem > 0) {
        await redeemPoints(user.userId, pointsToRedeem, newOrder.id);
      }

      return newOrder;
    });

    // Clear cart items that were used for this order
    try {
      await prisma.cartItem.deleteMany({
        where: {
          id: { in: cartItemIds },
          userId: user.userId,
        },
      });

      // Cancel any recovery campaigns
      await cancelUserCampaigns(user.userId);

      // Check for recovery conversion
      if (promoCode) {
        await checkRecoveryConversion(user.userId, order.id, promoCode, totalPrice);
      }
    } catch (err) {
      console.error('[Checkout] Post-order cleanup error (non-fatal):', err);
    }

    // Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.product?.name || 'Product',
          description: item.variant?.name || undefined,
        },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item if applicable
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'VAT (20%)',
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    // Get the base URL for redirects
    const origin = request.headers.get('origin') || 'https://www.makebelieveimprints.co.uk';

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/orders/${order.id}?payment=success`,
      cancel_url: `${origin}/orders/${order.id}?payment=cancelled`,
      customer_email: email || order.customer?.email,
      metadata: {
        orderId: order.id,
        customerId: user.userId,
      },
      shipping_address_collection: {
        allowed_countries: [
          'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT',
          'SE', 'DK', 'FI', 'NO', 'CH', 'PL', 'CZ', 'GR', 'HU', 'RO',
          'AU', 'NZ', 'CA', 'US', 'JP', 'SG', 'HK', 'AE',
        ],
      },
    };

    // Apply discounts if there were any
    if (discountAmount > 0 || pointsDiscount > 0) {
      const couponId = await createOrGetStripeCoupon(discountAmount + pointsDiscount);
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    // Create pending payment record
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        stripePaymentId: session.id,
        status: 'PENDING',
      },
      create: {
        orderId: order.id,
        amount: totalPrice,
        currency: 'GBP',
        paymentMethod: 'CARD',
        status: 'PENDING',
        stripePaymentId: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return handleApiError(error);
  }
}

/**
 * Create or get a Stripe coupon for the discount amount
 */
async function createOrGetStripeCoupon(amount: number): Promise<string> {
  const couponId = `discount_${Math.round(amount * 100)}`;

  try {
    // Try to retrieve existing coupon
    await getStripe().coupons.retrieve(couponId);
    return couponId;
  } catch {
    // Create new coupon if it doesn't exist
    const coupon = await getStripe().coupons.create({
      id: couponId,
      amount_off: Math.round(amount * 100),
      currency: 'gbp',
      duration: 'once',
    });
    return coupon.id;
  }
}
