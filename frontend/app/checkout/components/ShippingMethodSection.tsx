import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/api/products';
import { ShippingMethod, ShippingOption, SHIPPING_OPTIONS } from '../constants';

interface ShippingMethodSectionProps {
  shippingMethod: ShippingMethod;
  onMethodChange: (method: ShippingMethod) => void;
  qualifiesForFreeShipping: boolean;
}

export function ShippingMethodSection({
  shippingMethod,
  onMethodChange,
  qualifiesForFreeShipping,
}: ShippingMethodSectionProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Method
        </CardTitle>
        <CardDescription>Choose your delivery speed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {SHIPPING_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isSelected = shippingMethod === option.id;
          const isFreeStandard = option.id === 'standard' && qualifiesForFreeShipping;
          return (
            <div
              key={option.id}
              onClick={() => onMethodChange(option.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`p-2 rounded-full ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.name}</span>
                  {isFreeStandard && (
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">FREE</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option.deliveryDays}</p>
              </div>
              <div className="text-right">
                {isFreeStandard ? (
                  <span className="text-green-500 font-medium">FREE</span>
                ) : option.price === 0 ? (
                  <span className="font-medium">FREE</span>
                ) : (
                  <span className="font-medium">{formatPrice(option.price)}</span>
                )}
              </div>
              {isSelected && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
