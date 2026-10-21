// Read-only diagnostics. Never prints keys, tokens, identities or learner records.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing public Supabase configuration');
for (const [name, path, method] of [
  ['auth-settings', '/auth/v1/settings', 'GET'],
  ['catalog', '/rest/v1/rpc/lt_catalog', 'POST'],
  ['learning-version', '/rest/v1/rpc/lt_learning_version', 'POST'],
  ['progress-version', '/rest/v1/rpc/lt_progress_version', 'POST'],
]) {
  try {
    const response = await fetch(url + path, { method, headers: { apikey: key, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    console.log(JSON.stringify({ check: name, status: response.status,
      ...(response.ok ? name === 'auth-settings' ? { anonymousEnabled: data.external?.anonymous_users }
        : name === 'catalog' ? { parts: data.length } : { version: data }
        : { code: data.code, message: data.message || data.msg }) }));
  } catch (error) { console.log(JSON.stringify({ check: name, error: error.cause?.code || error.name })); }
}
