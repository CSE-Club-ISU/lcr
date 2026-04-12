import './index.css';
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './module_bindings';
import { SettingsContext, useSettingsState } from './hooks/useSettings';
import App from './App';

const SPACETIMEDB_URI = import.meta.env.VITE_SPACETIMEDB_URI ?? 'ws://localhost:3000';
const MODULE_NAME     = import.meta.env.VITE_MODULE_NAME ?? 'lcr';
const TOKEN_KEY       = 'lcr_auth_token';

function Root() {
  const settingsState = useSettingsState();
  const connectionBuilder = useMemo(
    () =>
      DbConnection.builder()
        .withUri(SPACETIMEDB_URI)
        .withDatabaseName(MODULE_NAME)
        .withToken(localStorage.getItem(TOKEN_KEY) ?? undefined)
        .onConnect((conn, _identity, token) => {
          // Persist the SpacetimeDB token (distinct from the OIDC id_token)
          localStorage.setItem(TOKEN_KEY, token);
          // Subscribe to all public tables
          conn.subscriptionBuilder().subscribeToAllTables();
        })
        .onConnectError((_ctx, err) => {
          console.error('[SpacetimeDB] connection error:', err);
        })
        .onDisconnect((_ctx, err) => {
          if (err) console.warn('[SpacetimeDB] disconnected:', err);
        }),
    []
  );

  return (
    <SettingsContext.Provider value={settingsState}>
      <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
        <App />
      </SpacetimeDBProvider>
    </SettingsContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
