import { Truck, Clock, Zap } from 'lucide-react';

export type CheckoutMode = 'cart' | 'design';

export type ShippingMethod = 'standard' | 'express' | 'rush';

export interface ShippingOption {
  id: ShippingMethod;
  name: string;
  price: number;
  description: string;
  deliveryDays: string;
  icon: React.ElementType;
}

// Countries supported for shipping (Royal Mail International)
export const SHIPPING_COUNTRIES = [
  'United Kingdom',
  'Ireland',
  'France',
  'Germany',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Austria',
  'Portugal',
  'Sweden',
  'Denmark',
  'Finland',
  'Norway',
  'Switzerland',
  'Poland',
  'Czech Republic',
  'Greece',
  'Hungary',
  'Romania',
  'Australia',
  'New Zealand',
  'Canada',
  'United States',
  'Japan',
  'Singapore',
  'Hong Kong',
  'United Arab Emirates',
] as const;

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    price: 0,
    description: 'Free on orders over £50',
    deliveryDays: '3-5 business days',
    icon: Truck,
  },
  {
    id: 'express',
    name: 'Express Delivery',
    price: 7.99,
    description: 'Faster delivery',
    deliveryDays: '1-2 business days',
    icon: Clock,
  },
  {
    id: 'rush',
    name: 'Rush Delivery',
    price: 14.99,
    description: 'Priority production & shipping',
    deliveryDays: 'Next business day',
    icon: Zap,
  },
];

export const FREE_SHIPPING_THRESHOLD = 50;
