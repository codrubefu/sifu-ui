import type React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../../utils/ui/cn';

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
  danger: 'border border-red-200 bg-white text-red-600 shadow-sm hover:border-red-300 hover:bg-red-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3 text-sm',
  md: 'h-10 rounded-lg px-4 text-sm',
  icon: 'h-10 w-10 rounded-lg p-0',
};

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  );
}

export function ButtonLink({ variant = 'secondary', size = 'md', className, children, ...props }: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      {...props}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-indigo-100',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Link>
  );
}
