require('./load-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { findSensitive } = require('../src/lib/simulation/safety.ts');

test('screen and server use the same sensitive-situation words', () => {
  const server = readFileSync('src/lib/simulation/safety.ts', 'utf8');
  const screen = readFileSync('public/web/js/simulation.js', 'utf8');
  const pick = (text, name) => text.match(new RegExp(`const ${name} = (/[^\\n]+/);`))[1];
  assert.equal(pick(screen, 'SENSITIVE_CRISIS'), pick(server, 'CRISIS'));
  assert.equal(pick(screen, 'SENSITIVE_HARASSMENT'), pick(server, 'HARASSMENT'));
});

test('harassment and crisis signals are recognised, ordinary practice answers are not', () => {
  for (const t of ['요즘 팀장님이 매일 폭언을 해요', '동료들이 저를 따돌려요', '회의 때 소리를 질렀어요', '선배한테 성희롱을 당했어요'])
    assert.equal(findSensitive(t), 'harassment', t);
  for (const t of ['너무 힘들어서 죽고 싶어요', '사라지고 싶다는 생각이 들어요'])
    assert.equal(findSensitive(t), 'crisis', t);
  // 띄어쓰기를 지우면 낱말이 생기는 문장 ("혼자 해" → 자해, "혼자 살아요" → 자살)도 잘못 잡지 않는다
  for (const t of ['혼자 해 주기로 하고 마케팅팀에 답장한다', '저는 요즘 혼자 살아요', '팀장님, 확인해 보고 오늘 오후 3시까지 말씀드리겠습니다', '이 업무는 제가 맡겠습니다', '자료를 정리해서 공유할게요', '일정이 밀리면 바로 보고드릴게요'])
    assert.equal(findSensitive(t), null, t);
});
