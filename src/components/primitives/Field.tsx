'use client';

import { createContext, useContext, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Field owns the wiring that gets forgotten: label association, hint and error
 * ids on aria-describedby, aria-invalid, and the required marker. Controls read
 * it from context, so a form field cannot be half-labelled by accident.
 */
type FieldContextValue = {
  id: string;
  hintId: string;
  errorId: string;
  hasError: boolean;
  describedBy: string | undefined;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export function useField() {
  return useContext(FieldContext);
}

/** Props a control should spread onto itself to be correctly described. */
export function useFieldControl() {
  const field = useField();
  if (!field) return {};
  return {
    id: field.id,
    'aria-describedby': field.describedBy,
    'aria-invalid': field.hasError || undefined,
    'aria-required': field.required || undefined,
  };
}

export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> {
  label: React.ReactNode;
  /** Guidance shown before the reader makes a mistake. */
  hint?: React.ReactNode;
  /** Validation message. Its presence puts the field into the error state. */
  error?: React.ReactNode;
  required?: boolean;
  /** Hide the label visually but keep it for assistive technology. */
  labelHidden?: boolean;
  id?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required = false,
  labelHidden = false,
  id,
  className,
  children,
  ...props
}: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const hasError = Boolean(error);

  const describedBy =
    [hint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider
      value={{ id: fieldId, hintId, errorId, hasError, describedBy, required }}
    >
      <div className={cn('flex flex-col gap-[var(--spacing-2)]', className)} {...props}>
        <label
          htmlFor={fieldId}
          className={cn(
            'text-sm font-medium text-ink',
            labelHidden && 'sr-only',
          )}
        >
          {label}
          {required ? (
            <span className="ml-[var(--spacing-1)] text-ink-subtle" aria-hidden>
              *
            </span>
          ) : null}
        </label>

        {hint ? (
          <p id={hintId} className="text-xs text-ink-subtle">
            {hint}
          </p>
        ) : null}

        {children}

        {hasError ? (
          /* Announced when it appears, so a keyboard user is told without
             having to navigate back to the field. */
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
