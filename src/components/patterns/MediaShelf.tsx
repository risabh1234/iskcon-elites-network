import Image from 'next/image';
import { FileText } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/cn';

export type ShelfItem = {
  id: string;
  title: string;
  description?: string | null;
  url: string | null;
  bytes: number;
};

export interface MediaShelfProps {
  photos: ShelfItem[];
  documents: ShelfItem[];
  className?: string;
}

/**
 * Photographs and published documents, in that order.
 *
 * Documents are a list rather than a grid of file-type tiles: a PDF has no
 * thumbnail worth showing, and a row that names the file, says what it is and
 * states its size is what somebody deciding whether to open it needs. The size
 * is not a detail — it is the whole decision on a slow connection.
 */
export function MediaShelf({ photos, documents, className }: MediaShelfProps) {
  if (photos.length === 0 && documents.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-[var(--spacing-9)]', className)}>
      {photos.length > 0 ? (
        <section>
          <h3 className="text-2xs uppercase tracking-wide text-ink-subtle">Photographs</h3>
          <ul className="mt-[var(--spacing-5)] grid list-none grid-cols-1 gap-[var(--spacing-5)] p-0 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) =>
              photo.url ? (
                <li key={photo.id}>
                  <figure className="m-0">
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-sm border border-line bg-paper-sunken">
                      <Image
                        src={photo.url}
                        alt={photo.title}
                        fill
                        sizes="(min-width: 64rem) 20rem, (min-width: 40rem) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    {photo.description ? (
                      <figcaption className="mt-[var(--spacing-2)] text-xs text-ink-subtle">
                        {photo.description}
                      </figcaption>
                    ) : null}
                  </figure>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section>
          <h3 className="text-2xs uppercase tracking-wide text-ink-subtle">Documents</h3>
          <ul className="mt-[var(--spacing-4)] flex list-none flex-col p-0">
            {documents.map((document) =>
              document.url ? (
                <li key={document.id} className="border-t border-line last:border-b">
                  <a
                    href={document.url}
                    // Opened rather than navigated to: a PDF replacing the page
                    // strands the reader on a viewer with no way back.
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-[var(--spacing-4)] py-[var(--spacing-4)] no-underline transition-colors duration-[var(--dur-fast)] ease-standard hover:bg-paper-sunken"
                  >
                    <FileText
                      className="mt-[var(--spacing-1)] size-[var(--spacing-4)] shrink-0 text-ink-faint"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-ink underline decoration-line-strong">
                        {document.title}
                      </span>
                      {document.description ? (
                        <span className="mt-[var(--spacing-1)] block text-sm text-ink-muted">
                          {document.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-ink-subtle" data-numeric>
                      PDF · {formatBytes(document.bytes)}
                    </span>
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
