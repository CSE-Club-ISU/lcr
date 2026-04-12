export const identityEq = (
  a: { toHexString(): string } | null | undefined,
  b: { toHexString(): string } | null | undefined,
): boolean => !!a && !!b && a.toHexString() === b.toHexString();

export function resolveUser<T extends { identity: { toHexString(): string } }>(
  users: T[],
  id: { toHexString(): string } | null | undefined,
): T | undefined {
  return id ? users.find(u => identityEq(u.identity, id)) : undefined;
}
