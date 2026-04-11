import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Room, User } from '../module_bindings/types';
import RoomCard       from '../components/room/RoomCard';
import CreateRoomForm from '../components/room/CreateRoomForm';

export default function LobbyPage() {
  const navigate  = useNavigate();
  const ctx       = useSpacetimeDB();
  const [roomRows] = useTable(tables.room);
  const [userRows] = useTable(tables.user);
  const joinRoom  = useReducer(reducers.joinRoom);

  const rooms = roomRows as unknown as Room[];
  const users = userRows as unknown as User[];

  const myIdentity    = ctx.identity;
  const waitingRooms  = rooms.filter(r => r.status === 'waiting');

  const myUser = myIdentity
    ? users.find(u => u.identity.toHexString() === myIdentity.toHexString())
    : undefined;

  const handleJoin = (code: string) => {
    joinRoom({ code });
    navigate(`/room/${code}`);
  };

  const handleCreated = (code: string) => {
    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 h-14 border-b border-gh-border bg-gh-card">
        <span className="font-bold text-xl tracking-[-0.5px]">LCR</span>
        <span className="text-sm text-gh-muted">{myUser?.username ?? '…'}</span>
      </header>

      <main className="max-w-[800px] mx-auto py-8 px-6 flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-base font-semibold text-gh-bright">Create a room</h2>
          <CreateRoomForm onCreated={handleCreated} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-base font-semibold text-gh-bright">Open rooms</h2>
          {waitingRooms.length === 0 ? (
            <p className="m-0 text-gh-muted text-sm">No open rooms yet — create one above!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {waitingRooms.map(room => (
                <RoomCard
                  key={room.code}
                  room={room}
                  users={users}
                  myIdentity={myIdentity}
                  onJoin={handleJoin}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
