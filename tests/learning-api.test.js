require('./load-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { authorizeRecords, verifyRecordUser, recordsHandler } = require('../src/lib/learning-server.ts');
const { reportFilters, csvCell, reportCsv } = require('../src/lib/learning-report.ts');
const empty = () => ({ attempts: [], total: 0, comparisons: [], paths: [], visits: [], visitTotal: 0, topics: [] });

test('server auth rejects absent, malformed and forged authentication', async () => {
  for (const header of ['', 'Bearer', 'Basic abc', 'Bearer token extra']) {
    await assert.rejects(authorizeRecords(new Request('http://local/api', { headers: { Authorization: header } }), true), e => e.status === 401);
  }
  await assert.rejects(verifyRecordUser({ auth: { getUser: async token => {
    assert.equal(token, 'forged'); return { data: { user: null }, error: new Error('invalid JWT') };
  } } }, 'forged', true), e => e.status === 401);
});
test('server uses verified Auth user and DB membership; user metadata cannot appoint operators', async () => {
  let calls = 0;
  const client = { auth: { getUser: async token => { assert.equal(token, 'verified'); return { data: { user: { id: 'u', is_anonymous: true, user_metadata: { admin: true } } } }; } }, rpc: async () => { calls++; return { data: true }; } };
  await verifyRecordUser(client, 'verified', false);
  await assert.rejects(verifyRecordUser(client, 'verified', true), e => e.status === 403);
  assert.equal(calls, 0);
  client.auth.getUser = async () => ({ data: { user: { id: 'u', is_anonymous: false, user_metadata: { admin: true } } } });
  client.rpc = async name => { assert.equal(name, 'lt_is_admin'); return { data: false }; };
  await assert.rejects(verifyRecordUser(client, 'verified', true), e => e.status === 403);
  client.rpc = async () => ({ data: true }); await verifyRecordUser(client, 'verified', true);
  client.rpc = async () => ({ data: false });
  await assert.rejects(verifyRecordUser(client, 'verified', true), e => e.status === 403);
});
test('history and admin endpoints enforce server-selected scope and do not cache private data', async () => {
  for (const admin of [false, true]) {
    const handler = recordsHandler(admin, async (request, scope) => {
      assert.equal(scope, admin);
      return { rpc: async (name, params) => { assert.equal(name, 'lt_records'); assert.equal(params.p_admin, admin); return { data: empty() }; } };
    });
    const response = await handler(new Request('http://local/api?admin=true&p_admin=true&visitor_id=other'));
    assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(response.headers.get('Vary'), 'Authorization');
    assert.deepEqual(await response.json(), empty());
  }
  const response = await recordsHandler(true)(new Request('http://local/api?format=csv'));
  assert.equal(response.status, 401); // CSV has exactly the same authorization boundary.
});
test('filter parsing uses inclusive KST calendar days and validates routes/pages', () => {
  const f = reportFilters(new URL('http://local?from=2026-10-19&to=2026-10-20&topic=work&path=cardnews&page=2'), true);
  assert.equal(f.p_from, '2026-10-18T15:00:00.000Z');
  assert.equal(f.p_to, '2026-10-20T15:00:00.000Z');
  assert.equal(f.p_offset, 100); assert.equal(f.p_topic, 'work'); assert.equal(f.p_path, 'cardnews');
  for (const query of ['from=2026-02-30', 'from=invalid', 'from=2026-10-21&to=2026-10-20', 'path=anything', 'page=-1', 'page=1.5']) {
    assert.throws(() => reportFilters(new URL(`http://local?${query}`), true), e => e.status === 400);
  }
});
test('CSV quotes Korean, commas, quotes and line breaks, neutralizes formulas and exports prior answers', () => {
  assert.equal(csvCell('텍스트,"내용"\n다음'), '"텍스트,""내용""\n다음"');
  for (const value of ['=HYPERLINK("bad")', ' +1+2', '-4+3', '@SUM(A1)', '\tformula', '\rline']) assert.ok(csvCell(value).startsWith('"\''));
  const report = empty();
  report.attempts = [{ id: 'attempt', visitor_id: 'u', visit_id: 'v', title: '업무', quiz_version_id: 'quiz-v1', revision: 1,
    signature: 'q1', mode: 'review', source_attempt_id: 'original', started_at: '2026-10-20T00:00:00Z', completed: true,
    path: 'cardnews', first_choice: 'files', question_count: 1, answered_count: 1, correct_count: 0, wrong_count: 1, score: 0, max_score: 1,
    events: [{ sequence: 1, type: 'cardnews_opened', at: '2026-10-19T23:00:00Z' }],
    answers: [{ questionId: 'q1', question: '=formula', selectedOption: 'b', options: [{ id: 'a', text: '정답' }, { id: 'b', text: '내 답안' }], correctOptions: ['a'], isCorrect: false, points: 0 }],
  }];
  const csv = reportCsv(report);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"오답 복습","original"'));
  assert.ok(csv.includes('"\'=formula","내 답안","정답","오답"'));
  assert.ok(csv.includes('카드뉴스 열기')); assert.ok(csv.endsWith('\r\n'));
  report.visits = [{ id: 'v', visitor_id: 'u', started_at: 'time', first_choice: null, events: [] }];
  assert.ok(reportCsv(report, true).includes('"미수집"'));
});
test('CSV uses the full filtered dataset once, never silently exports only the UI page', async () => {
  let params;
  const handler = recordsHandler(true, async () => ({ rpc: async (_name, args) => {
    params = args; return { data: { ...empty(), total: 10001 } };
  } }));
  const result = await handler(new Request('http://local?format=csv&page=7&topic=work'));
  assert.equal(params.p_limit, 10000); assert.equal(params.p_offset, 0); assert.equal(params.p_topic, 'work');
  assert.equal(result.status, 422); assert.match((await result.json()).error, /10,000/);
  const success = await recordsHandler(true, async () => ({ rpc: async () => ({ data: empty() }) }))(new Request('http://local?format=csv'));
  assert.equal(success.status, 200); assert.match(success.headers.get('Content-Type'), /text\/csv/);
  assert.match(success.headers.get('Content-Disposition'), /attachment/);
});
test('RPC failures show a useful error without exposing database internals', async () => {
  const handler = recordsHandler(false, async () => ({ rpc: async () => ({ error: { code: '42883', message: 'internal details' } }) }));
  const response = await handler(new Request('http://local'));
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /internal details/);
});
