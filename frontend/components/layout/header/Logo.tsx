'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeConfig = {
    sm: { width: 45, height: 45 },
    md: { width: 60, height: 60 },
    lg: { width: 75, height: 75 },
  };

  const { width, height } = sizeConfig[size];

  return (
    <Link href="/" className={cn('flex items-center', className)}>
      <Image
        src="/images/logo.png"
        alt="MakeBelieve Imprints"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </Link>
  );
}
