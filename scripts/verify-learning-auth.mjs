// Creates a diagnostic anonymous Auth session, but no visits, attempts or answers.
// The deliberately invalid ingest request rolls back without writing learning data.
import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const { error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`Anonymous login: ${error.code || error.status}`);
  const version = await client.rpc('lt_learning_version');
  if (version.error || version.data !== 3) throw new Error(`History version: ${version.error?.code || version.data}`);
  console.log('Authenticated history version: 3');
  const progress = await client.rpc('lt_progress_version');
  if (progress.error || progress.data !== 1) throw new Error(`Progress version: ${progress.error?.code || progress.data}`);
  const drafts = await client.rpc('lt_resume_progress');
  if (drafts.error || !Array.isArray(drafts.data)) throw new Error(`Progress access: ${drafts.error?.code || 'invalid response'}`);
  console.log(`Authenticated progress version: 1; own draft access: OK (${drafts.data.length} drafts)`);
  const records = await client.from('lt_learning_records').select('id').limit(1);
  if (records.error) throw new Error(`Own history access: ${records.error.code}`);
  console.log(`Own history access: OK (${records.data.length} records; no attempts created)`);
  const ingest = await client.rpc('lt_ingest', { p: {} });
  if (ingest.error?.code !== 'P0001' || ingest.error.message !== 'Missing event identity')
    throw new Error(`Ingest validation: ${ingest.error?.code || 'unexpected success'}`);
  console.log('Authenticated ingest permission and validation: OK (invalid payload rejected; no learning data written)');
} finally {
  await client.auth.signOut();
}
