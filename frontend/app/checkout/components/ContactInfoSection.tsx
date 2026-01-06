import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ContactInfoSectionProps {
  email: string;
  phone: string;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
}

export function ContactInfoSection({
  email,
  phone,
  onEmailChange,
  onPhoneChange,
}: ContactInfoSectionProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>We'll use this to send order updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email Address *
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            className="bg-card/50"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Phone Number (Optional)
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+44 7700 900000"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="bg-card/50"
          />
          <p className="text-xs text-muted-foreground mt-1">For delivery updates</p>
        </div>
      </CardContent>
    </Card>
  );
}
