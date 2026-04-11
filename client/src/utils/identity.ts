import type { Identity } from "spacetimedb";

export const identityEq = (
  a: Identity | null | undefined,
  b: Identity | null | undefined
): boolean => {
  if (!a || !b) return false;
  return a.toHexString() === b.toHexString();
};
