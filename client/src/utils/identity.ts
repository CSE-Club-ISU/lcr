export const identityEq = (
  a: { toHexString(): string } | null | undefined,
  b: { toHexString(): string } | null | undefined,
): boolean => !!a && !!b && a.toHexString() === b.toHexString();
