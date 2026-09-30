export function isAllowedAuthOrigin(origin: string | null, allowedOrigin: string): boolean {
  return origin === allowedOrigin;
}