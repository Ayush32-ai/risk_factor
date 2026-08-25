'use client';

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Icon wrapper to prevent hydration issues with Lucide icons
interface IconProps {
  icon: React.ComponentType<any>;
  className?: string;
  fallbackClassName?: string;
  [key: string]: any;
}

export function Icon({ icon: IconComponent, className = '', fallbackClassName, ...props }: IconProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`${fallbackClassName || className.replace(/text-\w+-\d+/, 'bg-gray-500')} rounded`} />;
  }

  return <IconComponent className={className} {...props} />;
}