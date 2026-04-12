import { tables } from '../module_bindings';
import type { Room } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';

/**
 * Returns the room row for a given room code, or undefined if not found.
 */
export function useMyRoom(code: string): Room | undefined {
  const [rooms] = useTypedTable<Room>(tables.room);
  return rooms.find(r => r.code === code);
}
