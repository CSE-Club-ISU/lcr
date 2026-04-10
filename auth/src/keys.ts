import { generateKeyPair, exportJWK, importPKCS8, importSPKI } from 'jose';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const KEYS_FILE = './keys.json';

export interface KeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: Record<string, string>;
  kid: string;
}

let _keyPair: KeyPair | null = null;

async function loadOrGenerateKeys(): Promise<KeyPair> {
  const kid = 'lcr-auth-key-1';

  // Load from env if set (production)
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256');
    const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY, 'RS256');
    const publicJwk = await exportJWK(publicKey) as Record<string, string>;
    return { privateKey, publicKey, publicJwk: { ...publicJwk, kid, alg: 'RS256', use: 'sig' }, kid };
  }

  // Load from file if exists (dev persistence)
  if (existsSync(KEYS_FILE)) {
    try {
      const stored = JSON.parse(readFileSync(KEYS_FILE, 'utf-8'));
      const privateKey = await importPKCS8(stored.privateKeyPem, 'RS256');
      const publicKey = await importSPKI(stored.publicKeyPem, 'RS256');
      const publicJwk = await exportJWK(publicKey) as Record<string, string>;
      return { privateKey, publicKey, publicJwk: { ...publicJwk, kid, alg: 'RS256', use: 'sig' }, kid };
    } catch {
      // Fall through to generate new keys
    }
  }

  // Generate fresh keypair
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = await exportJWK(publicKey) as Record<string, string>;

  // Persist to file for dev
  const { exportPKCS8, exportSPKI } = await import('jose');
  const privateKeyPem = await exportPKCS8(privateKey);
  const publicKeyPem = await exportSPKI(publicKey);
  try {
    writeFileSync(KEYS_FILE, JSON.stringify({ privateKeyPem, publicKeyPem }));
  } catch {
    // Non-fatal — container may be read-only
  }

  return { privateKey, publicKey, publicJwk: { ...publicJwk, kid, alg: 'RS256', use: 'sig' }, kid };
}

export async function getKeyPair(): Promise<KeyPair> {
  if (!_keyPair) {
    _keyPair = await loadOrGenerateKeys();
  }
  return _keyPair;
}
