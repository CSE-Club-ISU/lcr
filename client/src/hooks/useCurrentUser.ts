import { useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';

/**
 * Returns the current user's row from the user table, or undefined if not yet loaded.
 *
 * Teaching note: this is a "selector hook" — it composes useSpacetimeDB +
 * useTypedTable + a find() into a single reusable unit. Any component that
 * needs "who am I?" can call this instead of repeating the 3-line pattern.
 */
export function useCurrentUser(): User | undefined {
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  if (!ctx.identity) return undefined;
  return users.find(u => identityEq(u.identity, ctx.identity!));
}
