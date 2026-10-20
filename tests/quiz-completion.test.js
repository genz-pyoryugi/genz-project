require('./load-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { default: QuizCompletion, CompletionSaveStatus } = require('../src/app/quiz/QuizCompletion.tsx');
const { freshRun, runQuestions } = require('../src/app/quiz/model.ts');
const render = props => renderToStaticMarkup(React.createElement(QuizCompletion, { score: 1, total: 7, wrongIds: ['q2', 'q5'], reviewing: false, onRetry() {}, ...props }));
function find(element, predicate) {
  if (!React.isValidElement(element)) return null;
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props.children)) { const result = find(child, predicate); if (result) return result; }
  return null;
}

test('completion uses real score, original mascot and only two actions', () => {
  const html = render({ score: 4, wrongIds: ['q2','q5','q7'] });
  assert.match(html, /7문제 중 4문제 정답/);
  assert.match(html, /pen-reading/);
  assert.match(html, /틀린 문제 다시 풀기/);
  assert.match(html, /gq-retry-count">3</);
  assert.match(html, /href="\/web\/simulation.html"/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.equal((html.match(/<a /g) || []).length, 1);
  assert.doesNotMatch(html, /전체 다시 풀기|내 학습 기록/);
});

test('retry passes only this attempt wrong questions and starts without previous answers/score', () => {
  const ids = ['q2','q5']; let retry;
  const element = QuizCompletion({ score: 5, total: 7, wrongIds: ids, reviewing: false, onRetry(value) { retry = value; } });
  find(element, e => e.type === 'button').props.onClick();
  assert.deepEqual(retry, ids); assert.notStrictEqual(retry, ids);
  const run = freshRun(retry, 'original-attempt');
  assert.deepEqual(runQuestions([{id:'q1'},{id:'q2'},{id:'q5'}],run).map(q=>q.id),ids);
  assert.equal(run.score, 0); assert.deepEqual(run.answers, {}); assert.equal(run.sourceAttemptId, 'original-attempt');
});

test('perfect results have no retry button and review denominator is actual subset size', () => {
  const html = render({ score: 7, wrongIds: [] });
  assert.match(html, /틀린 문제가 없어요!/); assert.doesNotMatch(html, /<button/);
  const review = render({ score: 2, total: 3, wrongIds: ['q5'], reviewing: true });
  assert.match(review, /3문제 중 2문제 정답/); assert.match(review, /한 걸음 더 배웠어요!/);
});

test('completion storage text follows actual queue state, including unavailable review storage', () => {
  const status = (save, extra = {}) => renderToStaticMarkup(React.createElement(CompletionSaveStatus, { save, reviewing: false, recordsReady: true, ...extra }));
  assert.equal(status({state:'saved',message:''}), '');
  assert.match(status({state:'pending',message:''}), /저장하고 있어요/);
  assert.match(status(null), /저장하고 있어요/);
  assert.match(status({state:'error',message:'연결 오류'}), /저장하지 못했어요.*연결 오류/);
  assert.doesNotMatch(status({state:'error',message:'연결 오류'}), /결과가 저장됐어요/);
  assert.match(status({state:'unconfigured',message:''}), /이 기기에만 보관/);
  assert.match(status({state:'saved',message:''},{reviewing:true,recordsReady:false}), /SQL 적용 후/);
});
