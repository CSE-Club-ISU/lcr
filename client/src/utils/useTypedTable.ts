import { useTable } from "spacetimedb/react";

export function useTypedTable<T>(...args: Parameters<typeof useTable>): [T[], boolean] {
  const [rows, loading] = useTable(args[0], args[1]);
  return [rows as T[], loading];
}
