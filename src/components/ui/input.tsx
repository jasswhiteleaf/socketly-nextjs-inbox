import { forwardRef } from 'react';
import { Field, FieldLabel, FieldDescription, FieldError } from './field';
import { cn } from './utils';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const base =
  'w-full rounded-lg border border-border bg-card text-foreground placeholder:text-subtle-foreground ' +
  'transition-colors hover:border-border-strong ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 ' +
  'disabled:cursor-not-allowed disabled:bg-muted disabled:text-subtle-foreground';

/** Ref-forwarding so `PasswordInput` can compose it rather than duplicate its classes. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(base, 'h-9 px-2.5 text-[13px]', className)}
        {...props}
      />
    );
  },
);

/** Origins, channel lists, anything the user types that the machine will parse. */
export function MonoTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      spellCheck={false}
      className={cn(base, 'px-2.5 py-2 font-mono text-xs leading-6 resize-y', className)}
      {...props}
    />
  );
}

/**
 * A label, a control, and whatever needs saying underneath — in one element.
 *
 * Built on the `Field` primitives rather than beside them, so a form assembled from this
 * and a form assembled from the primitives directly look the same. Reach for the
 * primitives when a field needs a shape this does not cover (a checkbox on the same line
 * as its label, a fieldset, more than one error); reach for this for the ordinary case,
 * which is most of them.
 *
 * It was called `Field` and collided with the primitive of the same name the moment both
 * were imported into one file. Same component, unambiguous name.
 */
export function LabelledField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {hint && !error ? <FieldDescription>{hint}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

/** A checkbox that matches the rest of the system instead of the browser's default. */
/**
 * The checkbox lives in `ui/checkbox.tsx` now.
 *
 * The version that used to be here drew its tick with a CSS background-image and its fill
 * with `checked:bg-primary`. Both were defeated at once: `tailwind-merge` treats every
 * `bg-*` as one group and kept only the last, dropping the fill — and the background-image
 * class carried literal spaces inside its arbitrary value, which Tailwind cannot parse, so
 * no rule was generated for it either. The result was a checkbox that toggled correctly,
 * enabled the button behind it, and looked untouched. It was checked; it just never said so.
 *
 * The replacement renders an explicit SVG indicator instead of relying on a background,
 * which cannot be merged away.
 */
