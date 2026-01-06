import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Lock, ExternalLink } from 'lucide-react';

export function PaymentSection() {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment
        </CardTitle>
        <CardDescription>Secure payment via Stripe</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-card/50 rounded-lg border border-border">
          <div className="flex-1">
            <p className="font-medium">Secure Checkout</p>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Stripe to complete your payment securely.
            </p>
          </div>
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>Your payment information is encrypted and secure</span>
        </div>
        <div className="flex gap-2">
          <Image src="https://cdn.brandfolder.io/KGT2DTA4/at/8vbr8k4mr5xjwk4hxq4t9vs/Visa-logo.svg" alt="Visa" width={50} height={32} className="h-8 w-auto" />
          <Image src="https://cdn.brandfolder.io/KGT2DTA4/at/rvgw3kcc58g4g4fm9n7bh3/Mastercard-logo.svg" alt="Mastercard" width={50} height={32} className="h-8 w-auto" />
          <Image src="https://cdn.brandfolder.io/KGT2DTA4/at/x5v5z6w7h8fh8qxt6b5ggn/Amex-logo.svg" alt="Amex" width={50} height={32} className="h-8 w-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
