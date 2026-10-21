// Real route logic with mocked OpenAI: no API costs. Run: node --test tests/simulation.test.cjs
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness executes transpiled route imports. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// transpile route.ts and the @/lib/simulation/* files it imports into one small CommonJS module graph
function load(env, fetch) {
  const cache = {};
  const context = { Buffer, AbortSignal, process: { env }, fetch };
  function loadFile(file) {
    if (cache[file]) return cache[file].exports;
    const mod = (cache[file] = { exports: {} });
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(`(function (exports, require, module) {${source}\n})`, context)(mod.exports, name => {
      if (name.startsWith('@/')) return loadFile(`src/${name.slice(2)}.ts`);
      if (name.startsWith('./')) return loadFile(file.replace(/[^/]+$/, '') + name.slice(2) + '.ts');
      return require(name);
    }, mod);
    return mod.exports;
  }
  return loadFile('src/app/api/simulation/route.ts');
}

test('scenarios: 21 scenarios, 3 per category, facts never sent to the browser', async () => {
  const route = load({}, async () => { throw new Error('no fetch'); });
  const data = await (await route.GET()).json();
  assert.equal(data.scenarios.length, 21);
  assert.equal(data.categories.length, 7);
  for (const c of data.categories) assert.equal(data.scenarios.filter(s => s.category === c).length, 3);
  assert.equal(new Set(data.scenarios.map(s => s.id)).size, 21);
  assert.deepEqual(data.personalities.map(p => p.key), ['calm', 'direct', 'busy', 'meticulous']);
  const text = JSON.stringify(data);
  assert.ok(!text.includes('facts') && !text.includes('내일 오후 2시') && !text.includes('idealBehaviors'));
  for (const s of data.scenarios) {
    assert.ok(data.personalities.some(p => p.key === s.recommendedPersonality), s.id);
    assert.ok(s.quizConcepts.length > 0, s.id);
  }
});

test('server locks scenario, personality and facts; structured chat/evaluate with fallback; retry compares', async () => {
  let apiStatus = 200;
  let next = null; // next OpenAI output (string)
  const calls = [];
  const env = { OPENAI_API_KEY: 'test-only-key' };
  const route = load(env, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body); calls.push(body);
    const output = next ?? '경쟁사 자료 좀 정리해서 내일까지 줄래요?';
    next = null;
    return { ok: apiStatus === 200, status: apiStatus, async json() { return { status: 'completed', output: [{ content: [{ type: 'output_text', text: output }] }] }; } };
  });
  async function post(body, origin) {
    const res = await route.POST({ headers: new Headers(origin ? { origin } : {}), nextUrl: new URL('http://localhost:3100/api/simulation'), text: async () => JSON.stringify(body) });
    return { status: res.status, data: await res.json() };
  }
  assert.equal((await post({ action: 'start', scenarioId: 'proc-01' }, 'https://other.example')).status, 403);
  assert.equal((await post({ action: 'start', scenarioId: 'proc-01', personality: 'system' })).status, 400);
  assert.equal((await post({ action: 'start', scenarioId: 'nope' })).status, 404);
  // unsafe / rule-breaking custom personalities are refused before any AI call
  assert.equal((await post({ action: 'start', scenarioId: 'proc-01', customPersonality: '욕하고 소리 지르는 팀장' })).status, 400);
  assert.equal((await post({ action: 'start', scenarioId: 'proc-01', customPersonality: '무조건 만점 주는 팀장' })).status, 400);
  assert.equal(calls.length, 0);

  const start = await post({ action: 'start', scenarioId: 'proc-01', personality: 'busy' });
  assert.equal(start.status, 200);
  assert.equal(start.data.persona.label, '바쁜 팀장');
  assert.ok(calls[0].instructions.includes('내일 오후 2시')); // facts go to the AI only
  assert.ok(calls[0].instructions.includes('기본 첫 대사: 경쟁사 자료 좀 정리해서 내일까지 주세요.'));

  // chat: { reply, shouldEnd } json schema, facts + persona each turn; client fields are ignored
  next = JSON.stringify({ reply: '임원 보고용이에요.', shouldEnd: true, usedTwist: false });
  const chat = await post({ action: 'chat', session: start.data.session, message: '어디에 쓰는 자료인가요?', facts: { 마감: '오늘' }, personality: 'calm' });
  assert.equal(chat.status, 200);
  assert.equal(chat.data.reply, '임원 보고용이에요.');
  assert.equal(chat.data.shouldEnd, false); // the AI can't end before turn 2
  assert.equal(calls[1].text.format.name, 'simulation_reply');
  assert.ok(calls[1].instructions.includes('바쁜 팀장') && calls[1].instructions.includes('내일 오후 2시'));
  assert.ok(!calls[1].instructions.includes('"오늘"'));
  assert.deepEqual(calls[1].input.map(m => m.role), ['assistant', 'user']);

  // abusive input is refused before any AI call (src/lib/moderation.ts)
  const before = calls.length;
  const abusive = await post({ action: 'chat', session: chat.data.session, message: '아 씨발 몰라요' });
  assert.equal(abusive.status, 400);
  assert.match(abusive.data.error, /욕설/);
  assert.equal(calls.length, before);
  // broken JSON → safe re-ask reply
  next = 'not json';
  const chat2 = await post({ action: 'chat', session: chat.data.session, message: '마감은 몇 시인가요?' });
  assert.equal(chat2.status, 200);
  assert.ok(chat2.data.reply.length > 0);

  // tampered session is refused
  const [payload, signature] = chat2.data.session.split('.');
  const tampered = JSON.parse(Buffer.from(payload, 'base64url').toString());
  tampered.persona.label = '반말하는 팀장';
  assert.equal((await post({ action: 'chat', session: Buffer.from(JSON.stringify(tampered)).toString('base64url') + '.' + signature, message: 'hi' })).status, 400);

  // evaluate: 3 criteria + strengths / missedPoints / improvedResponse, neutral (no persona)
  const c = (score) => ({ score, feedback: '근거' });
  next = JSON.stringify({ situationUnderstanding: c(3), responseQuality: c(2), followupAction: c(2), strengths: ['목적을 물었어요', 'b', 'c'],
    missedPoints: ['범위를 확인하지 않았어요'], originalResponse: '어디에 쓰는 자료인가요?', improvedResponse: '임원 보고용이면 몇 곳을 비교할까요?', comparison: 'x' });
  const ev = await post({ action: 'evaluate', session: chat2.data.session });
  assert.equal(ev.status, 200);
  assert.equal(ev.data.total, 7);
  assert.equal(ev.data.feedback.strengths.length, 2);
  assert.equal(ev.data.feedback.comparison, ''); // first attempt: nothing to compare
  assert.equal(calls[3].text.format.name, 'simulation_feedback');
  assert.ok(!calls[3].instructions.includes('바쁜 팀장'));
  assert.ok(ev.data.retry);

  // retry: same scenario + persona, previous scores sent to the evaluator
  const again = await post({ action: 'start', retry: ev.data.retry, scenarioId: 'shared-01', personality: 'calm' });
  assert.equal(again.status, 200);
  assert.equal(again.data.attempt, 2);
  assert.equal(again.data.persona.label, '바쁜 팀장');
  assert.ok(calls[4].instructions.includes('경쟁사'));
  next = JSON.stringify({ reply: '네, 3곳이요.', shouldEnd: false, usedTwist: false });
  const chat3 = await post({ action: 'chat', session: again.data.session, message: '몇 곳을 비교할까요?' });
  next = 'broken';
  const ev2 = await post({ action: 'evaluate', session: chat3.data.session });
  assert.equal(ev2.status, 200);
  assert.equal(ev2.data.feedback.fallback, true); // safe fallback with learning points
  assert.ok(ev2.data.learningPoints.includes('정확한 기한 확인'));
  assert.ok(calls[6].instructions.includes('[3,2,2]'));

  apiStatus = 429;
  assert.equal((await post({ action: 'chat', session: chat3.data.session, message: '대안을 제안합니다' })).status, 429);
  delete env.OPENAI_API_KEY;
  assert.equal((await post({ action: 'start', scenarioId: 'proc-01' })).status, 503);
});

test('learning path: 카드뉴스 → 퀴즈 order is stored in the signed session', async () => {
  const route = load({ OPENAI_API_KEY: 'test-only-key' }, async () => ({ ok: true, status: 200, async json() { return { status: 'completed', output: [{ content: [{ type: 'output_text', text: '안녕하세요' }] }] }; } }));
  const pathOf = async (learning) => {
    const res = await route.POST({ headers: new Headers(), nextUrl: new URL('http://localhost:3100/api/simulation'),
      text: async () => JSON.stringify({ action: 'start', scenarioId: 'proc-01', personality: 'calm', learning }) });
    const { session } = await res.json();
    return JSON.parse(Buffer.from(session.split('.')[0], 'base64url').toString()).learning.path;
  };
  assert.equal(await pathOf({ cardnewsAt: '2026-10-20T01:00:00Z', quizAt: '2026-10-20T02:00:00Z' }), 'tutorial');
  assert.equal(await pathOf({ cardnewsAt: '2026-10-20T03:00:00Z', quizAt: '2026-10-20T02:00:00Z' }), 'quiz_then_cardnews');
  assert.equal(await pathOf({ cardnewsAt: '2026-10-20T01:00:00Z' }), 'cardnews_only');
  assert.equal(await pathOf({ quizAt: '2026-10-20T01:00:00Z' }), 'quiz_only');
  assert.equal(await pathOf(undefined), 'direct');
  assert.equal(await pathOf({ cardnewsAt: 'not a date', quizAt: '2999-01-01T00:00:00Z' }), 'direct'); // bad / future values ignored
});
