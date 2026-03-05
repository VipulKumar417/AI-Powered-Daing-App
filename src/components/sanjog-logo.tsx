import React from 'react';
import { Heart, Sparkles } from 'lucide-react';

interface SanjogLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function SanjogLogo({ size = 'md', showText = true, className = '' }: SanjogLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center relative`}>
        <Heart className={`${iconSizeClasses[size]} text-white`} />
        <Sparkles className={`${iconSizeClasses[size]} text-white absolute -top-1 -right-1 ${size === 'sm' ? 'w-2 h-2' : ''}`} />
      </div>
      
      {/* Brand Text */}
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent font-bold`}>
            Sanjog
          </h1>
          {size !== 'sm' && (
            <p className={`text-xs text-muted-foreground ${size === 'lg' ? 'text-sm' : ''}`}>
              AI powered Dating
            </p>
          )}
        </div>
      )}
    </div>
  );
}