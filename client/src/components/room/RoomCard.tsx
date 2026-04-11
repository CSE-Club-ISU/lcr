import type { Identity } from 'spacetimedb';
import type { Room, User } from '../../module_bindings/types';

interface Props {
  room:       Room;
  users:      User[];
  myIdentity: Identity | undefined;
  onJoin:     (code: string) => void;
}

export default function RoomCard({ room, users, myIdentity, onJoin }: Props) {
  const host  = users.find(u => u.identity.toHexString() === room.hostIdentity.toHexString());
  const isMine = myIdentity && room.hostIdentity.toHexString() === myIdentity.toHexString();
  const isFull = !!room.guestIdentity;

  const settings = (() => {
    try { return JSON.parse(room.settings); } catch { return {}; }
  })();

  return (
    <div className="card flex items-center justify-between px-[18px] py-[14px]">
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold text-[15px] text-gh-bright">{room.code}</span>
        <span className="text-[13px] text-gh-muted">{host?.username ?? 'unknown'}</span>
        {settings.difficulty && (
          <span className="chip py-[2px]">{settings.difficulty}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-gh-muted">{isFull ? '2/2' : '1/2'}</span>
        {!isMine && !isFull && (
          <button className="btn-primary px-4 py-1.5 text-[13px]" onClick={() => onJoin(room.code)}>
            Join
          </button>
        )}
        {isMine && (
          <span className="text-[13px] text-gh-lightblue">Your room</span>
        )}
      </div>
    </div>
  );
}
