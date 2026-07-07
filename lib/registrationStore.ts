/**
 * Registration store with local JSON fallback for development/demo.
 * Mirrors feedbackStore's local-file pattern. Safe for read-only production
 * filesystems (e.g. Vercel) — write failures are swallowed and reported via
 * the boolean return value instead of throwing.
 */
import { RegistrationPayload } from './types';
import path from 'path';
import fs from 'fs';

const LOCAL_REGISTRATION_PATH = path.join(process.cwd(), 'data', 'topic-pulse-registrations.json');

function ensureDataDir() {
  const dir = path.dirname(LOCAL_REGISTRATION_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLocalRegistrations(): RegistrationPayload[] {
  try {
    if (fs.existsSync(LOCAL_REGISTRATION_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_REGISTRATION_PATH, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveRegistration(payload: RegistrationPayload): Promise<boolean> {
  const entry = { ...payload, timestamp: payload.timestamp || new Date().toISOString() };

  try {
    ensureDataDir();
    const all = readLocalRegistrations();
    all.push(entry);
    fs.writeFileSync(LOCAL_REGISTRATION_PATH, JSON.stringify(all, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}
