import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ShippingAddress } from '@/lib/api/orders';
import { SHIPPING_COUNTRIES } from '../constants';

interface ShippingAddressSectionProps {
  shippingAddress: ShippingAddress;
  onAddressChange: (address: ShippingAddress) => void;
}

export function ShippingAddressSection({
  shippingAddress,
  onAddressChange,
}: ShippingAddressSectionProps) {
  const updateField = (field: keyof ShippingAddress, value: string) => {
    onAddressChange({ ...shippingAddress, [field]: value });
  };

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
        <CardDescription>Where should we send your order?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Recipient Name *
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Smith"
            value={shippingAddress.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            className="bg-card/50"
          />
        </div>

        <div>
          <label htmlFor="addressLine1" className="block text-sm font-medium text-foreground mb-2">
            Address Line 1 *
          </label>
          <Input
            id="addressLine1"
            type="text"
            placeholder="123 Main Street"
            value={shippingAddress.addressLine1}
            onChange={(e) => updateField('addressLine1', e.target.value)}
            required
            className="bg-card/50"
          />
        </div>

        <div>
          <label htmlFor="addressLine2" className="block text-sm font-medium text-foreground mb-2">
            Address Line 2 (Optional)
          </label>
          <Input
            id="addressLine2"
            type="text"
            placeholder="Apartment, suite, etc."
            value={shippingAddress.addressLine2}
            onChange={(e) => updateField('addressLine2', e.target.value)}
            className="bg-card/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-foreground mb-2">
              City *
            </label>
            <Input
              id="city"
              type="text"
              placeholder="London"
              value={shippingAddress.city}
              onChange={(e) => updateField('city', e.target.value)}
              required
              className="bg-card/50"
            />
          </div>

          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-foreground mb-2">
              Postcode *
            </label>
            <Input
              id="postcode"
              type="text"
              placeholder="SW1A 1AA"
              value={shippingAddress.postcode}
              onChange={(e) => updateField('postcode', e.target.value)}
              required
              className="bg-card/50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
            Country *
          </label>
          <select
            id="country"
            value={shippingAddress.country}
            onChange={(e) => updateField('country', e.target.value)}
            required
            className="w-full h-10 px-3 rounded-md border border-input bg-card/50 text-foreground"
          >
            {SHIPPING_COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">We ship internationally via Royal Mail</p>
        </div>
      </CardContent>
    </Card>
  );
}
