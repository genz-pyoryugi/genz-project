// Client-side behaviour of public/tracking/learning-tracker.js against an in-memory fake of lt_ingest.
// Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { Tracker } = require('../public/tracking/learning-tracker.js');

const mem = () => { const m = new Map(); return { get length() { return m.size; }, key: i => [...m.keys()][i],
  getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

function fakeServer() {
  const events = new Map(); const log = []; let failNext = 0; let rejectType = null;
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    rpc: async (name, { p }) => {
      if (failNext > 0) { failNext--; return { error: { code: '', message: 'network' } }; }
      if (rejectType === p.type) return { error: { code: 'P0001', message: 'Invalid' } };
      const prior = events.get(p.id);
      if (prior) { if (JSON.stringify(prior) !== JSON.stringify(p)) return { error: { code: 'P0001', message: 'conflict' } }; return { error: null }; }
      events.set(p.id, p); log.push(p); return { error: null };
    } };
  return { client, events, log, fail: n => { failNext = n; }, reject: t => { rejectType = t; } };
}
const make = server => new Tracker({ storage: mem(), session: mem(), timers: false, getClient: async () => server.client });
const types = server => server.log.map(e => e.type);

test('office-first path is stored in order with a single first choice', async () => {
  const s = fakeServer(); const t = make(s);
  t.record('office_entered'); t.choose('postit'); t.record('office_object_opened', { object: 'postit' });
  t.choose('files'); t.record('cardnews_opened', { object: 'files' });
  await t.retry();
  assert.deepStrictEqual(types(s), ['visit_started', 'office_entered', 'first_choice', 'office_object_opened', 'cardnews_opened']);
  assert.strictEqual(s.log.filter(e => e.type === 'first_choice').length, 1);
  assert.strictEqual(s.log.find(e => e.type === 'first_choice').choice, 'postit');
  assert.strictEqual(new Set(s.log.map(e => e.visitId)).size, 1);
});

test('cardnews-first path keeps its own first choice', async () => {
  const s = fakeServer(); const t = make(s);
  t.choose('files'); t.record('cardnews_opened', { object: 'files' }); t.record('cardnews_last_slide');
  t.record('office_entered'); await t.retry();
  assert.deepStrictEqual(types(s), ['visit_started', 'first_choice', 'cardnews_opened', 'cardnews_last_slide', 'office_entered']);
  assert.strictEqual(s.log[1].choice, 'files');
});

test('retake produces separate attempts with distinct ids', async () => {
  const s = fakeServer(); const t = make(s);
  const run = () => { const a = t.newId(); t.record('quiz_started', { attemptId: a, quizVersionId: 'qv' });
    t.record('answer_submitted', { attemptId: a, questionVersionId: 'q1', selectedOption: 'a' });
    t.record('quiz_completed', { attemptId: a }); return a; };
  const a1 = run(), a2 = run(); await t.retry();
  assert.notStrictEqual(a1, a2);
  assert.strictEqual(s.log.filter(e => e.type === 'quiz_started').length, 2);
});

test('transient failure keeps events, retry sends each exactly once', async () => {
  const s = fakeServer(); const t = make(s);
  s.fail(2); t.record('office_entered'); await t.retry();
  assert.ok(t.queue.items().length > 0, 'events retained after failure');
  await t.retry(); await t.retry();
  assert.strictEqual(t.queue.items().length, 0);
  assert.strictEqual(s.log.length, new Set(s.log.map(e => e.id)).size);
  assert.deepStrictEqual(types(s), ['visit_started', 'office_entered']);
});

test('a re-sent event (lost response) is acknowledged without a duplicate', async () => {
  const s = fakeServer(); const t = make(s);
  t.record('office_entered'); await t.retry();
  const sent = s.log[1]; t.queue.enqueue({ ...sent });  // same id and payload again
  await t.retry();
  assert.strictEqual(s.log.length, 2); assert.strictEqual(t.queue.items().length, 0);
});

test('permanently rejected event is set aside and does not block later ones', async () => {
  const s = fakeServer(); const t = make(s);
  s.reject('cardnews_last_slide'); t.record('cardnews_last_slide'); t.record('office_entered'); await t.retry();
  assert.deepStrictEqual(types(s), ['visit_started', 'office_entered']);
  assert.strictEqual(t.queue.items().length, 0);
});

test('unconfigured Supabase keeps records on the device', async () => {
  const t = new Tracker({ storage: mem(), session: mem(), timers: false, getClient: async () => null });
  t.record('office_entered'); await t.retry();
  assert.strictEqual(t.status.state, 'unconfigured'); assert.strictEqual(t.queue.items().length, 2);
});
