/**
 * Feedback store with local JSON fallback for development.
 * Production adapters (Supabase, Google Sheets) are stubbed below but not activated.
 */
import { FeedbackPayload } from './types';
import path from 'path';
import fs from 'fs';

const LOCAL_FEEDBACK_PATH = path.join(process.cwd(), 'data', 'feedback-store.json');

function ensureDataDir() {
  const dir = path.dirname(LOCAL_FEEDBACK_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLocalFeedback(): FeedbackPayload[] {
  try {
    if (fs.existsSync(LOCAL_FEEDBACK_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_FEEDBACK_PATH, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalFeedback(entries: FeedbackPayload[]): void {
  ensureDataDir();
  fs.writeFileSync(LOCAL_FEEDBACK_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

// TODO: Supabase adapter — activate when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
// async function saveToSupabase(payload: FeedbackPayload): Promise<void> {
//   const { createClient } = await import('@supabase/supabase-js');
//   const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
//   await supabase.from('topic_pulse_feedback').insert([payload]);
// }

// TODO: Google Sheets adapter — activate when GOOGLE_SHEETS_ENABLED=true and GOOGLE_SHEETS_ID is set
// async function saveToGoogleSheets(payload: FeedbackPayload): Promise<void> {
//   // Use googleapis to append a row to the configured sheet
// }

export async function saveFeedback(payload: FeedbackPayload): Promise<void> {
  const mode = process.env.FEEDBACK_STORE_MODE || 'local';
  const entry = { ...payload, timestamp: payload.timestamp || new Date().toISOString() };

  if (mode === 'local') {
    const all = readLocalFeedback();
    all.push(entry);
    writeLocalFeedback(all);
    return;
  }

  // Future: mode === 'supabase' | 'sheets'
  console.warn(`[feedbackStore] Unknown FEEDBACK_STORE_MODE "${mode}", using local fallback`);
  const all = readLocalFeedback();
  all.push(entry);
  writeLocalFeedback(all);
}
