import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tag, X, Loader2, Coins } from 'lucide-react';
import { formatPrice } from '@/lib/api/products';
import { Design, MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import { CartItem } from '@/lib/cart';
import { CheckoutMode, ShippingOption } from '../constants';

interface AppliedPromo {
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  discountAmount: number;
}

interface OrderSummarySectionProps {
  mode: CheckoutMode;
  // Cart mode props
  cartItems: CartItem[];
  itemCount: number;
  // Design mode props
  design: Design | null;
  dimensions: { width: number; height: number };
  // Pricing
  finalSubtotal: number;
  finalTax: number;
  actualShippingCost: number;
  selectedShipping: ShippingOption | undefined;
  finalTotal: number;
  // Promo
  promoCode: string;
  promoValidating: boolean;
  promoError: string;
  appliedPromo: AppliedPromo | null;
  onPromoCodeChange: (code: string) => void;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  // Loyalty points
  userPoints: number;
  usePoints: boolean;
  pointsToUse: number;
  maxRedeemablePoints: number;
  pointsDiscount: number;
  onUsePointsChange: (use: boolean) => void;
  onPointsToUseChange: (points: number) => void;
}

export function OrderSummarySection({
  mode,
  cartItems,
  itemCount,
  design,
  dimensions,
  finalSubtotal,
  finalTax,
  actualShippingCost,
  selectedShipping,
  finalTotal,
  promoCode,
  promoValidating,
  promoError,
  appliedPromo,
  onPromoCodeChange,
  onApplyPromo,
  onRemovePromo,
  userPoints,
  usePoints,
  pointsToUse,
  maxRedeemablePoints,
  pointsDiscount,
  onUsePointsChange,
  onPointsToUseChange,
}: OrderSummarySectionProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>
          {mode === 'cart' ? `${itemCount} item${itemCount !== 1 ? 's' : ''} in your order` : 'Review your order details'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        {mode === 'cart' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 py-2 border-b border-border last:border-0">
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={item.productImage || '/placeholder-product.svg'}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                  {(item.size || item.color || item.material) && (
                    <p className="text-xs text-muted-foreground">
                      {[item.size, item.color, item.material].filter(Boolean).join(' / ')}
                    </p>
                  )}
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                    <span className="text-sm font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Design Order (Legacy) */}
        {mode === 'design' && design && (
          <>
            <div className="relative aspect-square w-full bg-card/30 rounded-lg overflow-hidden">
              <Image
                src={design.previewUrl || design.imageUrl}
                alt={design.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            <div>
              <h3 className="font-semibold text-lg">{design.name}</h3>
              {design.description && (
                <p className="text-sm text-muted-foreground">{design.description}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material:</span>
                <span className="font-medium">{MATERIAL_LABELS[design.material]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{PRINT_SIZE_LABELS[design.printSize]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions:</span>
                <span className="font-medium">
                  {dimensions.width} x {dimensions.height} cm
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Promo Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Promo Code</label>
          {appliedPromo ? (
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-500" />
                <div>
                  <span className="font-mono font-bold text-green-500">{appliedPromo.code}</span>
                  <p className="text-xs text-muted-foreground">{appliedPromo.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500 font-medium">-{formatPrice(appliedPromo.discountAmount)}</span>
                <button
                  type="button"
                  onClick={onRemovePromo}
                  className="p-1 hover:bg-green-500/20 rounded"
                >
                  <X className="h-4 w-4 text-green-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
                className="bg-card/50 uppercase"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onApplyPromo())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onApplyPromo}
                disabled={promoValidating || !promoCode.trim()}
              >
                {promoValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          )}
          {promoError && (
            <p className="text-xs text-red-500">{promoError}</p>
          )}
        </div>

        {/* Loyalty Points Redemption */}
        {userPoints >= 500 && (
          <div className="space-y-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                Use Loyalty Points
              </label>
              <Switch
                checked={usePoints}
                onCheckedChange={(checked: boolean) => {
                  onUsePointsChange(checked);
                }}
              />
            </div>
            {usePoints && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Available: {userPoints} pts</span>
                  <span className="text-muted-foreground">(£{(userPoints / 100).toFixed(2)})</span>
                </div>
                <Slider
                  value={[pointsToUse]}
                  onValueChange={(values: number[]) => onPointsToUseChange(values[0])}
                  max={maxRedeemablePoints}
                  min={500}
                  step={100}
                  className="mt-2"
                />
                <div className="flex justify-between text-sm">
                  <span>Using: {pointsToUse} points</span>
                  <span className="text-green-500 font-medium">-£{(pointsToUse / 100).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}
        {userPoints > 0 && userPoints < 500 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Coins className="h-3 w-3" />
            You have {userPoints} points. Earn {500 - userPoints} more to redeem!
          </p>
        )}

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatPrice(finalSubtotal)}</span>
          </div>
          {mode === 'cart' && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (20%):</span>
              <span>{formatPrice(finalTax)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Shipping ({selectedShipping?.name || 'Standard'}):
            </span>
            {actualShippingCost === 0 ? (
              <span className="text-green-500">FREE</span>
            ) : (
              <span>{formatPrice(actualShippingCost)}</span>
            )}
          </div>
          {appliedPromo && (
            <div className="flex justify-between text-sm text-green-500">
              <span>Discount ({appliedPromo.code}):</span>
              <span>-{formatPrice(appliedPromo.discountAmount)}</span>
            </div>
          )}
          {usePoints && pointsDiscount > 0 && (
            <div className="flex justify-between text-sm text-yellow-500">
              <span>Points Discount:</span>
              <span>-{formatPrice(pointsDiscount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">{formatPrice(finalTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
