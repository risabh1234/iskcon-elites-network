import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 * Without twMerge, a `className` prop passed into a component cannot override
 * the component's own padding or colour — it just appends and loses.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
