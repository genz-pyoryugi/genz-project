require('./load-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { saveQuiz, restoreQuiz, saveQuizProgress, restoreQuizProgress } = require('../src/app/quiz/persistence.ts');
const { freshRun, gradeRun } = require('../src/app/quiz/model.ts');
const storage = () => { const values = new Map(); return { setItem: (k,v) => values.set(k,v), getItem: k => values.get(k) ?? null }; };
const quizzes = [{ id: 'version-1', questions: [{ id: 'q1', options: [{ id: 'a' }, { id: 'b' }] }, { id: 'q2', options: [{ id: 'a' }, { id: 'b' }] }] }];
const attempt = { id: 'attempt-1', quizId: 'version-1', visitId: 'visit-1' };
test('refresh preserves the same attempt id, graded answer, score and progress', () => {
  const s = storage(); const run = gradeRun({ ...freshRun(), picked: [1] }, 'q1', false, ['b']);
  saveQuiz(s, 'user-a', { quizId: 'version-1', run, attempt });
  const loaded = restoreQuiz(s, 'user-a', quizzes);
  assert.deepEqual(loaded.run, run); assert.deepEqual(loaded.attempt, attempt); assert.equal(loaded.topic, 0);
  assert.equal(restoreQuiz(s, 'user-b', quizzes), null);
  assert.equal(restoreQuiz(s, 'user-a', [{ ...quizzes[0], id: 'new-version' }]), null);
});

test('legacy resume data without selected-answer history stays unknown rather than inferred from score', () => {
  const s = storage(); const run = { ...freshRun(), index: 2, score: 1, wrongIds: ['q1'] };
  delete run.answers;
  saveQuiz(s, 'legacy', { quizId: 'version-1', run, attempt });
  const restored = restoreQuiz(s, 'legacy', quizzes);
  assert.deepEqual(restored.run.answers, {}); assert.equal(restored.run.score, 1);
});
test('review source/membership and finished state survive refresh; malformed state is discarded', () => {
  const s = storage(); const run = { ...freshRun(['q1'], 'source-attempt'), index: 1, score: 1 };
  saveQuiz(s, 'a', { quizId: 'version-1', run, attempt });
  assert.deepEqual(restoreQuiz(s, 'a', quizzes).run, run);
  saveQuiz(s, 'a', { quizId: 'version-1', run: { ...run, index: 99 }, attempt });
  assert.equal(restoreQuiz(s, 'a', quizzes), null);
  saveQuiz(s, 'a', { quizId: 'version-1', run: { ...run, sourceAttemptId: null }, attempt });
  assert.equal(restoreQuiz(s, 'a', quizzes), null);
});

test('closing a tab preserves the unsubmitted choice, position and same attempt in durable storage', () => {
  const persistent=storage(),session=storage();
  const run={...freshRun(), index:1, picked:[1], score:1, answers:{q1:{selectedOptions:['a'],correct:true}}};
  saveQuizProgress(persistent,session,'user-a',{quizId:'version-1',run,attempt});
  const restored=restoreQuizProgress(persistent,storage(),'user-a',quizzes);
  assert.deepEqual(restored.run,run); assert.deepEqual(restored.attempt,attempt);
  assert.equal(restored.run.graded,false); assert.equal(Object.keys(restored.run.answers).length,1);
  assert.equal(restoreQuizProgress(persistent,storage(),'user-b',quizzes),null);
});

test('old tab-only progress migrates and an unsubmitted review can resume before its first graded answer', () => {
  const persistent=storage(),session=storage();
  const run={...freshRun(['q1'],'source-attempt'),picked:[1]};
  saveQuiz(session,'user-a',{quizId:'version-1',run,attempt:null});
  assert.deepEqual(restoreQuizProgress(persistent,session,'user-a',quizzes).run,run);
  const reopened=restoreQuizProgress(persistent,storage(),'user-a',quizzes);
  assert.deepEqual(reopened.run,run); assert.equal(reopened.attempt,null);
});

test('disabled durable storage falls back to the current tab without losing progress', () => {
  const unavailable={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}},session=storage();
  saveQuizProgress(unavailable,session,'user-a',{quizId:'version-1',run:freshRun(),attempt:null});
  assert.ok(restoreQuizProgress(unavailable,session,'user-a',quizzes));
});
