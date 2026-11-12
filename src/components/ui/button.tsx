'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from './utils';
import type { ButtonHTMLAttributes } from 'react';

/**
 * Variant and size names follow shadcn's vocabulary, because that is what components from
 * the baseui-cn registry pass — `<Button size="icon" variant="ghost" />` appears inside the
 * dialog primitives, and a registry component asking for a variant this file does not have
 * renders unstyled.
 *
 * `primary`, `secondary`, `danger` and `md` are kept as aliases for the names already used
 * across this app, so both vocabularies work and no call site had to churn.
 */
/**
 * Radius scale, so controls and surfaces relate to each other instead of each picking a
 * number: controls are `rounded-lg` (8px), surfaces are the registry card's `rounded-2xl`
 * (16px), pills stay `rounded-full`. A control nested in a card with ~28px of padding
 * reads correctly at half the card's radius; at 6px it read as a different design system.
 */
const buttonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap',
    'select-none transition-[background-color,border-color,color,box-shadow] duration-100',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    'focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  ),
  {
    variants: {
      variant: {
        default:
          'border border-primary-hover bg-primary text-primary-foreground shadow-xs hover:border-primary-hover hover:bg-primary-hover disabled:border-transparent disabled:bg-secondary disabled:text-subtle-foreground disabled:shadow-none',
        outline:
          'border border-border-strong bg-card text-foreground shadow-xs hover:border-border-strong hover:bg-muted disabled:border-border disabled:text-subtle-foreground disabled:shadow-none',
        ghost:
          'border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground disabled:text-subtle-foreground',
        destructive:
          'border border-danger-solid-hover bg-danger-solid text-danger-solid-fg shadow-xs hover:bg-danger-solid-hover disabled:border-transparent disabled:bg-secondary disabled:text-subtle-foreground disabled:shadow-none',
        link: 'border border-transparent text-primary underline-offset-2 hover:underline',
      },
      size: {
        default: 'h-9 gap-2 px-3.5 text-[13px]',
        sm: 'h-7 gap-1.5 px-2.5 text-[13px]',
        lg: 'h-10 gap-2 px-5 text-[14px]',
        md: 'h-9 gap-2 px-3.5 text-[13px]',
        icon: 'size-8 gap-0 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type Variant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
type Size = NonNullable<VariantProps<typeof buttonVariants>['size']>;

/** Names this app already used, mapped onto the canonical set. */
const VARIANT_ALIAS = {
  primary: 'default',
  secondary: 'outline',
  danger: 'destructive',
} as const satisfies Record<string, Variant>;

const SIZE_ALIAS = { md: 'default' } as const satisfies Record<string, Size>;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant | keyof typeof VARIANT_ALIAS;
  size?: Size | keyof typeof SIZE_ALIAS;
  /**
   * Render as something else, keeping the styling.
   *
   * A link that looks like a button is a link — `<Button render={<Link href="…" />}>`
   * keeps the anchor semantics, middle-click, and the router's client-side navigation,
   * where an onClick on a <button> gives up all three. Without this every such call site
   * reached for `buttonVariants()` by hand, which is the same styling applied in a second
   * place and free to drift.
   */
  render?: useRender.ComponentProps<'button'>['render'];
};

export function Button({ variant, size, className, render, ...props }: ButtonProps) {
  const resolvedVariant = (
    variant && variant in VARIANT_ALIAS
      ? VARIANT_ALIAS[variant as keyof typeof VARIANT_ALIAS]
      : variant
  ) as Variant | undefined;

  const resolvedSize = (
    size && size in SIZE_ALIAS ? SIZE_ALIAS[size as keyof typeof SIZE_ALIAS] : size
  ) as Size | undefined;

  const defaultProps = {
    className: cn(
      buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
      className,
    ),
  };

  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(defaultProps, props),
    render,
  });
}

/** A square icon-only control, sized to sit flush beside an input. */
export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg border border-border',
        'bg-card text-subtle-foreground transition-colors',
        'hover:border-border-strong hover:bg-muted hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'focus-visible:ring-offset-background focus-visible:outline-none',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { buttonVariants };
