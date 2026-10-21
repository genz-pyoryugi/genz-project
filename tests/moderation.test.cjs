// 입력 유효성 검사(욕설 · 비하 · 혐오 · 위협): 서버용 src/lib/moderation.ts 와 화면용 public/web/js/moderation.js 가 같은지, 막을 것만 막는지
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./load-ts.cjs');
const server = require('../src/lib/moderation.ts');
const client = require('../public/web/js/moderation.js');

test('server and browser lists are identical', () => {
  assert.deepEqual(client.BLOCKED_WORDS, server.BLOCKED_WORDS);
  assert.deepEqual(client.ALLOW_WORDS, server.ALLOW_WORDS);
  assert.equal(client.MODERATION_MESSAGE, server.MODERATION_MESSAGE);
});

const BAD = ['아 씨발 진짜', '시1발 팀장', 'ㅅㅂ 몰라요', '병.신 같은 일', '개새끼야', '존나 힘들어', '틀딱 상사', '죽여버린다', 'FUCK this', '지랄하지 마'];
const GOOD = [
  '오늘이 프로젝트의 시발점이에요', '새끼손가락을 다쳤어요', '다시 발표 준비할게요', '불이 꺼져 있어요', '애자일 방식으로 일해요',
  '보지 못했어요', '미친 듯이 바빠요', '탕비실 걸레질은 누가 하나요?', '병원 신청서를 냈어요', '마감이 내일 오후 2시예요',
  '팀장님께 메일로 보고드렸어요', '어떻게 회신하면 될까요?',
];

for (const m of [server, client]) {
  const name = m === server ? 'server' : 'browser';
  test(`${name}: blocks abusive input`, () => {
    for (const s of BAD) assert.ok(m.findBlocked(s), s);
  });
  test(`${name}: lets normal workplace sentences through`, () => {
    for (const s of GOOD) assert.equal(m.findBlocked(s), null, s);
  });
}

test('several fields are checked together', () => {
  assert.ok(server.findBlocked('정상 제목', undefined, '본문에 ㅂㅅ'));
  assert.equal(server.findBlocked('정상 제목', null, '정상 본문'), null);
});
