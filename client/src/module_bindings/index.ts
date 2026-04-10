// AUTO-GENERATED — regenerate after schema changes:
//   cd module/spacetimedb && spacetime generate --lang typescript \
//     --out-dir ../../client/src/module_bindings --module-path .
//
// Written manually for Phase 1 (spacetimedb@1.12.0 client SDK).

import {
  DbConnectionImpl,
  DbConnectionBuilder,
  t,
  table,
  reducerSchema,
  toCamelCase,
  type Identity,
  type DbConnectionConfig,
} from 'spacetimedb';

export type { Identity };

// ---------------------------------------------------------------------------
// Table schemas  (use table() to get strongly-typed column builders)
// ---------------------------------------------------------------------------

const userTableSchema = table({ name: 'user' }, {
  identity:   t.identity().primaryKey(),
  username:   t.string(),
  first_name: t.string(),
  last_name:  t.string(),
  github_id:  t.string(),
  avatar_url: t.string(),
  is_admin:   t.bool(),
});

const problemTableSchema = table({ name: 'problem' }, {
  id:                   t.u64().primaryKey().autoInc(),
  title:                t.string(),
  description:          t.string(),
  difficulty:           t.string(),
  method_name:          t.string(),
  sample_test_cases:    t.string(),
  sample_test_results:  t.string(),
  hidden_test_cases:    t.string(),
  hidden_test_results:  t.string(),
  boilerplate_python:   t.string(),
  boilerplate_java:     t.string(),
  boilerplate_cpp:      t.string(),
  compare_func_python:  t.string(),
  compare_func_java:    t.string(),
  compare_func_cpp:     t.string(),
  created_by:           t.identity(),
  is_approved:          t.bool(),
});

const roomTableSchema = table({ name: 'room' }, {
  code:           t.string().primaryKey(),
  host_identity:  t.identity(),
  guest_identity: t.identity().optional(),
  host_ready:     t.bool(),
  guest_ready:    t.bool(),
  status:         t.string(),
  settings:       t.string(),
});

const gameStateTableSchema = table({ name: 'game_state' }, {
  id:                     t.string().primaryKey(),
  room_code:              t.string(),
  player1_identity:       t.identity(),
  player2_identity:       t.identity(),
  player1_hp:             t.i32(),
  player2_hp:             t.i32(),
  player1_sp:             t.i32(),
  player2_sp:             t.i32(),
  player1_mp:             t.i32(),
  player2_mp:             t.i32(),
  player1_problem_index:  t.u32(),
  player2_problem_index:  t.u32(),
  player1_abilities:      t.string(),
  player2_abilities:      t.string(),
  problem_ids:            t.string(),
  status:                 t.string(),
  start_time:             t.timestamp(),
  winner_identity:        t.identity().optional(),
});

const chatMessageTableSchema = table({ name: 'chat_message' }, {
  id:              t.u64().primaryKey().autoInc(),
  game_id:         t.string(),
  sender_identity: t.identity(),
  text:            t.string(),
  sent:            t.timestamp(),
});

// ---------------------------------------------------------------------------
// Convert TableSchema → table def shape (tablesToSchema is not re-exported)
// The returned object satisfies the UntypedTableDef shape the SDK expects.
// ---------------------------------------------------------------------------

function toTableDef<T extends {
  tableName: string;
  rowType: { row: Record<string, any> };
  rowSpacetimeType: any;
  idxs: readonly any[];
  constraints: readonly any[];
}>(ts: T) {
  return {
    name:         ts.tableName,
    accessorName: toCamelCase(ts.tableName),
    columns:      ts.rowType.row,
    rowType:      ts.rowSpacetimeType,
    indexes:      ts.idxs,
    constraints:  ts.constraints,
  } as const;
}

const userTableDef        = toTableDef(userTableSchema);
const problemTableDef     = toTableDef(problemTableSchema);
const roomTableDef        = toTableDef(roomTableSchema);
const gameStateTableDef   = toTableDef(gameStateTableSchema);
const chatMessageTableDef = toTableDef(chatMessageTableSchema);

// ---------------------------------------------------------------------------
// Reducer schemas (for useReducer hook and remote module)
// ---------------------------------------------------------------------------

const _setProfile  = reducerSchema('set_profile',  { username: t.string(), first_name: t.string(), last_name: t.string() });
const _createRoom  = reducerSchema('create_room',  { code: t.string(), settings: t.string() });
const _joinRoom    = reducerSchema('join_room',    { code: t.string() });
const _leaveRoom   = reducerSchema('leave_room',   { code: t.string() });
const _setReady    = reducerSchema('set_ready',    { code: t.string(), ready: t.bool() });
const _sendChat    = reducerSchema('send_chat',    { game_id: t.string(), text: t.string() });

// ---------------------------------------------------------------------------
// Remote module (fed to DbConnectionImpl)
// ---------------------------------------------------------------------------

const ALL_TABLES = [userTableDef, problemTableDef, roomTableDef, gameStateTableDef, chatMessageTableDef];

const ALL_REDUCERS = [
  { name: _setProfile.reducerName, accessorName: _setProfile.accessorName, params: _setProfile.params.row, paramsType: _setProfile.paramsSpacetimeType },
  { name: _createRoom.reducerName, accessorName: _createRoom.accessorName, params: _createRoom.params.row, paramsType: _createRoom.paramsSpacetimeType },
  { name: _joinRoom.reducerName,   accessorName: _joinRoom.accessorName,   params: _joinRoom.params.row,   paramsType: _joinRoom.paramsSpacetimeType },
  { name: _leaveRoom.reducerName,  accessorName: _leaveRoom.accessorName,  params: _leaveRoom.params.row,  paramsType: _leaveRoom.paramsSpacetimeType },
  { name: _setReady.reducerName,   accessorName: _setReady.accessorName,   params: _setReady.params.row,   paramsType: _setReady.paramsSpacetimeType },
  { name: _sendChat.reducerName,   accessorName: _sendChat.accessorName,   params: _sendChat.params.row,   paramsType: _sendChat.paramsSpacetimeType },
] as const;

const REMOTE_MODULE = {
  tables:     ALL_TABLES,
  reducers:   ALL_REDUCERS,
  procedures: [] as never[],
  versionInfo: { cliVersion: '1.12.0' },
} as const;

// ---------------------------------------------------------------------------
// DbConnection
// ---------------------------------------------------------------------------

export class DbConnection extends DbConnectionImpl<typeof REMOTE_MODULE> {
  static builder(): DbConnectionBuilder<DbConnection> {
    return new DbConnectionBuilder(
      REMOTE_MODULE as any,
      (config: DbConnectionConfig<typeof REMOTE_MODULE>) => new DbConnection(config)
    );
  }
}

// ---------------------------------------------------------------------------
// Exported table defs — pass to useTable()
// ---------------------------------------------------------------------------

export const tables = {
  user:        userTableDef,
  problem:     problemTableDef,
  room:        roomTableDef,
  gameState:   gameStateTableDef,
  chatMessage: chatMessageTableDef,
};

// ---------------------------------------------------------------------------
// Exported reducer defs — pass to useReducer()
// ---------------------------------------------------------------------------

export const reducers = {
  setProfile: { name: _setProfile.reducerName, accessorName: _setProfile.accessorName, params: _setProfile.params.row, paramsType: _setProfile.paramsSpacetimeType },
  createRoom: { name: _createRoom.reducerName, accessorName: _createRoom.accessorName, params: _createRoom.params.row, paramsType: _createRoom.paramsSpacetimeType },
  joinRoom:   { name: _joinRoom.reducerName,   accessorName: _joinRoom.accessorName,   params: _joinRoom.params.row,   paramsType: _joinRoom.paramsSpacetimeType },
  leaveRoom:  { name: _leaveRoom.reducerName,  accessorName: _leaveRoom.accessorName,  params: _leaveRoom.params.row,  paramsType: _leaveRoom.paramsSpacetimeType },
  setReady:   { name: _setReady.reducerName,   accessorName: _setReady.accessorName,   params: _setReady.params.row,   paramsType: _setReady.paramsSpacetimeType },
  sendChat:   { name: _sendChat.reducerName,   accessorName: _sendChat.accessorName,   params: _sendChat.params.row,   paramsType: _sendChat.paramsSpacetimeType },
};

// ---------------------------------------------------------------------------
// Row types (snake_case to match wire format / server schema)
// ---------------------------------------------------------------------------

export type User = {
  identity:   Identity;
  username:   string;
  first_name: string;
  last_name:  string;
  github_id:  string;
  avatar_url: string;
  is_admin:   boolean;
};

export type Room = {
  code:           string;
  host_identity:  Identity;
  guest_identity: Identity | null | undefined;
  host_ready:     boolean;
  guest_ready:    boolean;
  status:         string;
  settings:       string;
};

export type GameState = {
  id:                    string;
  room_code:             string;
  player1_identity:      Identity;
  player2_identity:      Identity;
  player1_hp:            number;
  player2_hp:            number;
  player1_sp:            number;
  player2_sp:            number;
  player1_mp:            number;
  player2_mp:            number;
  player1_problem_index: number;
  player2_problem_index: number;
  player1_abilities:     string;
  player2_abilities:     string;
  problem_ids:           string;
  status:                string;
  start_time:            { microsSinceUnixEpoch: bigint };
  winner_identity:       Identity | null | undefined;
};

export type ChatMessage = {
  id:              bigint;
  game_id:         string;
  sender_identity: Identity;
  text:            string;
  sent:            { microsSinceUnixEpoch: bigint };
};
