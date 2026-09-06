/**
 * File sizes, in the unit a reader can act on.
 *
 * Rounded rather than exact: the number exists so somebody on a slow connection
 * can decide whether to open the file, and "2.4 MB" answers that question while
 * "2,517,842 bytes" does not.
 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
