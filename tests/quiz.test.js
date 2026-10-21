const test = require('node:test');
const assert = require('node:assert/strict');
const { freshRun, gradeRun, runQuestions } = require('../src/app/quiz/model.ts');

const questions = ['q1', 'q2', 'q3'].map(id => ({ id }));
const next = run => ({ ...run, index: run.index + 1, picked: [], graded: false });

test('review includes only wrong answers in their original order', () => {
  let run = gradeRun(freshRun(), 'q1', false);
  run = gradeRun(next(run), 'q2', true);
  run = gradeRun(next(run), 'q3', false);
  assert.equal(run.score, 1);
  const review = freshRun(run.wrongIds);
  assert.deepEqual(runQuestions(questions, review).map(q => q.id), ['q1', 'q3']);
  assert.equal(review.score, 0);
  assert.equal(review.index, 0);
  assert.deepEqual(review.picked, []);
  assert.deepEqual(review.wrongIds, []);
});

test('repeated review narrows down to answers still wrong', () => {
  let review = freshRun(['q1', 'q3']);
  review = gradeRun(review, 'q1', true);
  review = gradeRun(next(review), 'q3', false);
  const retry = freshRun(review.wrongIds);
  assert.deepEqual(runQuestions(questions, retry).map(q => q.id), ['q3']);
  const completed = gradeRun(retry, 'q3', true);
  assert.deepEqual(completed.wrongIds, []);
  assert.equal(completed.score, 1);
});

test('duplicate grading does not duplicate wrong answers or scores', () => {
  const wrong = gradeRun(freshRun(), 'q1', false);
  assert.strictEqual(gradeRun(wrong, 'q1', false), wrong);
  const correct = gradeRun(freshRun(), 'q1', true);
  assert.strictEqual(gradeRun(correct, 'q1', true), correct);
  assert.equal(correct.score, 1);
});

test('full restart and topic change restore all questions and clear review', () => {
  const run = freshRun();
  assert.equal(run.reviewIds, null);
  assert.deepEqual(run.wrongIds, []);
  assert.strictEqual(runQuestions(questions, run), questions);
  assert.deepEqual(runQuestions([{ id: 'other-topic' }], run), [{ id: 'other-topic' }]);
});
