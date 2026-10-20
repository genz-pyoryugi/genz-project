require('./load-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { partFeedbackHandler } = require('../src/lib/part-feedback-server.ts');
const currentId = '00000000-0000-4000-8000-000000000020';
const previousId = '00000000-0000-4000-8000-000000000010';
const current = { id: currentId, visitor_id: 'user-a', quiz_version_id: 'version-1', mode: 'full', signature: 'q1,q2',
  completed: true, started_at: '2026-10-20T06:00:00+00:00', answers: [] };
const before = { ...current, id: previousId, started_at: '2026-10-19T06:00:00+00:00' };
function fakeClient(rows) {
  const calls = [];
  return { calls, from(table) {
    assert.equal(table, 'lt_learning_records');
    const filters = [], orders = []; let cap = Infinity;
    const call = { filters, orders, clause: null }; calls.push(call);
    const query = {
      select: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      or: clause => { call.clause = clause; return query; },
      order: (key, options) => { orders.push([key, options.ascending]); return query; },
      limit: size => { cap = size; return query; },
      maybeSingle: async () => {
        let result = rows.filter(row => filters.every(([key,value]) => row[key] === value));
        if (call.clause) {
          const [, time, id] = /^started_at\.lt\.([^,]+),and\(started_at\.eq\.[^,]+,id\.lt\.([^\)]+)\)$/.exec(call.clause);
          result = result.filter(row => Date.parse(row.started_at) < Date.parse(time) || (Date.parse(row.started_at) === Date.parse(time) && row.id < id));
        }
        result.sort((a,b) => {
          for (const [key,ascending] of orders) { if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (ascending ? 1 : -1); }
          return 0;
        });
        result = result.slice(0,cap);
        return { data: result[0] || null, error: null };
      },
    };
    return query;
  } };
}
const request = (id = currentId, extra = '') => new Request(`http://local/api/learning/part-feedback?attempt=${id}${extra}`);
test('part feedback requires server authentication including direct API requests', async () => {
  const response = await partFeedbackHandler()(request());
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});
test('learner endpoint selects the owned current run and the latest matching completed prior run', async () => {
  const newerWrongVersion = { ...before, id: 'version-change', quiz_version_id: 'version-2', started_at: '2026-10-20T05:59:00+00:00' };
  const otherMode = { ...before, id: 'review', mode: 'review', started_at: '2026-10-20T05:58:00+00:00' };
  const otherComposition = { ...before, id: 'other-questions', signature: 'q1,q3', started_at: '2026-10-20T05:57:00+00:00' };
  const incomplete = { ...before, id: 'unfinished', completed: false, started_at: '2026-10-20T05:56:00+00:00' };
  const later = { ...before, id: 'future', started_at: '2026-10-21T00:00:00+00:00' };
  const otherVisitor = { ...before, id: 'other-user', visitor_id: 'user-b', started_at: '2026-10-20T05:55:00+00:00' };
  const older = { ...before, id: 'older', started_at: '2026-10-18T00:00:00+00:00' };
  const client = fakeClient([current, before, newerWrongVersion, otherMode, otherComposition, incomplete, later, otherVisitor, older]);
  const handler = partFeedbackHandler(async () => ({ client, user: { id: 'user-a' } }));
  const response = await handler(request(currentId, '&visitor=user-b&version=version-2&mode=review'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.current.id, currentId); assert.equal(data.previous.id, previousId);
  assert.ok(client.calls.every(call => call.filters.some(([k,v]) => k === 'visitor_id' && v === 'user-a')));
  assert.equal(response.headers.get('Vary'), 'Authorization');
});
test('ordinary users and operators using the learner endpoint cannot request another visitor history', async () => {
  for (const user of [{ id: 'user-b' }, { id: 'operator', isOperator: true }]) {
    const response = await partFeedbackHandler(async () => ({ client: fakeClient([current, before]), user }))(request());
    assert.equal(response.status, 404);
  }
});
test('first completed attempt returns no fabricated prior attempt', async () => {
  const response = await partFeedbackHandler(async () => ({ client: fakeClient([current]), user: { id: 'user-a' } }))(request());
  assert.equal(response.status, 200); assert.equal((await response.json()).previous, null);
});
test('incomplete current run and malformed attempt IDs are not compared', async () => {
  const client = fakeClient([{ ...current, completed: false }]);
  const handler = partFeedbackHandler(async () => ({ client, user: { id: 'user-a' } }));
  assert.equal((await handler(request())).status, 409);
  assert.equal((await handler(request('malformed'))).status, 400);
  assert.equal(client.calls.length, 1);
});
test('same timestamps have a deterministic ID tie break; review compositions stay isolated', async () => {
  const reviewCurrent = { ...current, mode: 'review', signature: 'q1' };
  const reviewBefore = { ...reviewCurrent, id: previousId };
  const otherSubset = { ...reviewBefore, id: 'other-subset', signature: 'q2' };
  const client = fakeClient([reviewCurrent, reviewBefore, otherSubset, before]);
  const response = await partFeedbackHandler(async () => ({ client, user: { id: 'user-a' } }))(request());
  assert.equal((await response.json()).previous.id, previousId);
});
