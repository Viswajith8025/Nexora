/**
 * Sanitize user search input before embedding in PostgREST filter expressions.
 * Removes characters that could alter filter logic or cause unexpected matches.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[%_,.()\\]/g, ' ')
    .replace(/[^\w\s@./:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}
