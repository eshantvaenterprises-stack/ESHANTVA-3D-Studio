import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

type LinkButtonProps = CommonProps & { to: string; ariaLabel?: string };
type NativeButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: never };

const styles: Record<ButtonVariant, string> = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
};

export function Button(props: LinkButtonProps | NativeButtonProps) {
  const variant = props.variant ?? 'primary';
  const className = `${styles[variant]} ${props.className ?? ''}`.trim();

  if ('to' in props && props.to) {
    return (
      <Link href={props.to} className={className} aria-label={props.ariaLabel}>
        {props.children}
      </Link>
    );
  }

  const { children, variant: _variant, className: _className, ...buttonProps } = props as NativeButtonProps;
  void _variant;
  void _className;
  return (
    <button className={className} {...buttonProps}>
      {children}
    </button>
  );
}
