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
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
  };

  const { width, height } = sizeConfig[size];

  return (
    <Link href="/" className={cn('flex items-center', className)}>
      <Image
        src="/logo.png"
        alt="MakeBelieve Imprints"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </Link>
  );
}
