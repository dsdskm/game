export function canAccessGame(ownerKey: string | null, userKey: string | null): boolean {
  return ownerKey === null || ownerKey === userKey;
}