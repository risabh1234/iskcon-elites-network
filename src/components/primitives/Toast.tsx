'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toast as RxToast } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'neutral' | 'success' | 'danger';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback<ToastContextValue['toast']>(({ title, description, tone = 'neutral' }) => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), title, description, tone }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <RxToast.Provider swipeDirection="right" duration={6000}>
        {children}

        {items.map((item) => (
          <RxToast.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== item.id));
            }}
            className={cn(
              'flex items-start gap-[var(--spacing-3)]',
              'rounded-sm border bg-paper-raised p-[var(--spacing-4)] shadow-overlay',
              'data-[state=open]:animate-slide-in-right data-[state=closed]:animate-fade-out',
              item.tone === 'success' && 'border-success/30',
              item.tone === 'danger' && 'border-danger/30',
              item.tone === 'neutral' && 'border-line',
            )}
          >
            <div className="flex-1">
              <RxToast.Title
                className={cn(
                  'text-sm font-medium',
                  item.tone === 'danger' ? 'text-danger' : 'text-ink',
                )}
              >
                {item.title}
              </RxToast.Title>
              {item.description ? (
                <RxToast.Description className="mt-[var(--spacing-1)] text-xs text-ink-muted">
                  {item.description}
                </RxToast.Description>
              ) : null}
            </div>

            <RxToast.Close
              className={cn(
                'grid size-[var(--spacing-5)] shrink-0 place-items-center rounded-xs text-ink-subtle',
                'transition-colors duration-[var(--dur-instant)] ease-standard hover:bg-paper-sunken hover:text-ink',
              )}
            >
              <X className="size-[var(--spacing-3)]" />
              <span className="sr-only">Dismiss</span>
            </RxToast.Close>
          </RxToast.Root>
        ))}

        <RxToast.Viewport
          className={cn(
            'fixed bottom-0 right-0 z-[var(--z-toast)] flex w-[min(24rem,100vw)] flex-col gap-[var(--spacing-3)]',
            'm-0 list-none p-[var(--spacing-5)] outline-none',
          )}
        />
      </RxToast.Provider>
    </ToastContext.Provider>
  );
}
