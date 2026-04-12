import { useTable } from 'spacetimedb/react';

/**
 * Thin wrapper around useTable that binds the row type to the caller-supplied
 * generic T.  The cast is intentional: SpacetimeDB's useTable returns the rows
 * as the SDK's internal row type, but the generated module_bindings/types.ts
 * declares the exact same shape with proper names.  The caller must ensure T
 * matches the table's generated type (e.g. useTypedTable<Problem>(tables.problem)).
 */
export function useTypedTable<T>(...args: Parameters<typeof useTable>): [T[], boolean] {
  const [rows, loading] = useTable(args[0], args[1]);
  // The SDK row type and the generated type are structurally identical;
  // this cast bridges the nominal gap between the two representations.
  return [rows as unknown as T[], loading];
}
