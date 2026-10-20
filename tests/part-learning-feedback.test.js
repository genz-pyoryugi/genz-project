require('./load-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const catalog = require('./fixtures/reviewed-quiz-catalog.json');
const { buildLearningFeedback, correctOptions, learningItems, reviewedQuestions, confusionFeedback,
  matchingAttempt, comparableAttempt, submittedAnswers } = require('../src/app/quiz/learning-feedback.ts');
const PartLearningFeedback = require('../src/app/quiz/PartLearningFeedback.tsx').default;
const { freshRun, gradeRun } = require('../src/app/quiz/model.ts');
function answersFor(quiz) { return Object.fromEntries(quiz.questions.map(q => [q.id, { selectedOptions: correctOptions(q), correct: true }])); }
function wrongAnswer(question) {
  return { selectedOptions: question.options.filter(o => !correctOptions(question).includes(o.id)).slice(0,1).map(o => o.id), correct: false };
}
function snapshot(quiz, answers, id = 'current', time = '2026-10-20T06:00:00Z', mode = 'full') {
  return { id, quiz_version_id: quiz.id, mode, signature: quiz.questions.map(q => q.id).join(','), completed: true, started_at: time,
    answers: quiz.questions.map(q => ({ questionId: q.id, selectedOption: answers[q.id].selectedOptions.join(','), isCorrect: answers[q.id].correct })) };
}
test('actual catalog has seven parts of seven questions; all 49 immutable questions were reviewed', () => {
  assert.equal(catalog.length, 7); assert.equal(Object.keys(reviewedQuestions).length, 49);
  for (const quiz of catalog) {
    assert.equal(quiz.questions.length, 7);
    const labels = new Map();
    for (const q of quiz.questions) {
      const items = learningItems(quiz.id, q);
      assert.ok(items.length, `${quiz.title} / ${q.questionKey}`);
      for (const item of items) {
        assert.ok(item.description && item.review && item.label);
        for (const id of [...(item.optionIds || []), ...(item.wrongOptionIds || [])]) assert.ok(q.options.some(o => o.id === id));
        if (labels.has(item.id)) assert.equal(labels.get(item.id), item.label);
        labels.set(item.id, item.label);
      }
    }
  }
});
test('first attempt feedback is available for all parts without history or AI', () => {
  for (const quiz of catalog) {
    const groups = buildLearningFeedback(quiz.questions, quiz.id, answersFor(quiz));
    assert.ok(groups.length);
    assert.ok(groups.every(g => g.state === 'understood' && g.improved.length === 0 && g.recheck.length === 0));
    assert.deepEqual(new Set(groups.flatMap(g => g.evidence.map(e => e.question.id))), new Set(quiz.questions.map(q => q.id)));
  }
});
test('the same concept with a correct and wrong question is mixed, not a certain strength', () => {
  const quiz = catalog[2], answers = answersFor(quiz);
  answers[quiz.questions[5].id] = wrongAnswer(quiz.questions[5]);
  const group = buildLearningFeedback(quiz.questions, quiz.id, answers).find(g => g.id === 'read-vs-understood');
  assert.equal(group.state, 'mixed'); assert.equal(group.right.length, 1); assert.equal(group.wrong.length, 1);
  const html = renderToStaticMarkup(React.createElement(PartLearningFeedback, { quiz, questions: quiz.questions, answers, mode: 'full', attemptId: null, recordsReady: false }));
  assert.ok(html.includes('일부 상황은 이해했지만 추가 확인이 필요해요'));
  assert.ok(html.includes('잘 이해한 내용')); assert.ok(html.includes('한 번 더 확인할 내용'));
  assert.ok(!html.includes('복습 내용 · 관련 문제 보기')); assert.ok(!html.includes('선택했던 답'));
  assert.ok(!html.includes('같은 파트의 재응시 변화 보기'));
  assert.ok(!html.includes(quiz.questions[5].explanation));
});
test('wrong multi-select feedback targets only selected wrong / omitted correct options', () => {
  const quiz = catalog[0], q = quiz.questions[4];
  const answers = { [q.id]: { selectedOptions: ['option3','option4'], correct: false } }; // Only priority option was omitted.
  const groups = buildLearningFeedback(quiz.questions, quiz.id, answers);
  assert.deepEqual(groups.map(g => g.id), ['learning-priority']);
  const details = confusionFeedback(groups[0].wrong[0]);
  assert.equal(details.length, 1); assert.equal(details[0].omitted, true);
  assert.equal(details[0].message, q.feedback.option1);
  assert.equal(details[0].option, q.options[0].text);
  assert.equal(groups[0].right.length, 0); // Other partially selected items are not classified as correctly answered questions.
});
test('choosing a wrong gossip option does not classify the other unrelated actions as misunderstood', () => {
  const quiz = catalog[0], q = quiz.questions[4];
  const groups = buildLearningFeedback(quiz.questions, quiz.id, { [q.id]: { selectedOptions: ['option1','option2','option3','option4'], correct: false } });
  assert.deepEqual(groups.map(g => g.id), ['distance-from-gossip']);
  assert.equal(confusionFeedback(groups[0].wrong[0])[0].message, q.feedback.option2);
});
test('single-choice feedback respects preserved conditions instead of treating all topics as failed', () => {
  const quiz = catalog[6], q = quiz.questions[0];
  const groups = buildLearningFeedback(quiz.questions, quiz.id, { [q.id]: { selectedOptions: ['option3'], correct: false } });
  assert.deepEqual(groups.map(g => g.id), ['uncertain-item-treatment']); // option3 already considers frequency.
});
test('correct multi-choice covers reviewed items but does not independently grade combined-option items', () => {
  const quiz = catalog[0], q = quiz.questions[4];
  const groups = buildLearningFeedback(quiz.questions, quiz.id, { [q.id]: { selectedOptions: correctOptions(q), correct: true } });
  assert.equal(groups.length, 5);
  assert.ok(groups.find(g => g.id === 'meeting-preparation').evidence[0].item.sharedOption);
  assert.ok(groups.find(g => g.id === 'printer-after-use').evidence[0].item.sharedOption);
});
test('unknown or changed content/version receives no invented learning-item labels', () => {
  const quiz = catalog[0], q = quiz.questions[0];
  for (const modified of [{ ...q, id: 'other' }, { ...q, revision: 2 }, { ...q, question: q.question + ' changed' },
    { ...q, options: [{ ...q.options[0], text: 'changed' }, ...q.options.slice(1)] }, { ...q, correctOption: 'option1' }]) {
    assert.deepEqual(learningItems(quiz.id, modified), []);
  }
  assert.deepEqual(learningItems('another-part', q), []);
});
test('missing answers or aggregate score/wrong ids never reconstruct choices or competence', () => {
  const quiz = catalog[0];
  assert.deepEqual(buildLearningFeedback(quiz.questions, quiz.id, {}), []);
  const html = renderToStaticMarkup(React.createElement(PartLearningFeedback, { quiz, questions: quiz.questions, answers: {}, mode: 'full', attemptId: null, recordsReady: false }));
  assert.ok(html.includes('점수로 추정하지 않으며'));
});
test('retake changes are per identical question: improved and newly incorrect evidence are both preserved', () => {
  const quiz = catalog[2], before = answersFor(quiz), now = answersFor(quiz);
  before[quiz.questions[0].id] = wrongAnswer(quiz.questions[0]);
  now[quiz.questions[5].id] = wrongAnswer(quiz.questions[5]);
  const group = buildLearningFeedback(quiz.questions, quiz.id, now, before).find(g => g.id === 'read-vs-understood');
  assert.equal(group.state, 'mixed');
  assert.deepEqual(group.improved.map(e => e.number), [1]);
  assert.deepEqual(group.recheck.map(e => e.number), [6]);
});
test('an unassessed multi-select topic is not falsely counted as improved', () => {
  const quiz = catalog[0], q = quiz.questions[4];
  const before = { [q.id]: { selectedOptions: ['option3','option4'], correct: false } };
  const now = { [q.id]: { selectedOptions: correctOptions(q), correct: true } };
  const changed = buildLearningFeedback(quiz.questions, quiz.id, now, before).filter(g => g.improved.length);
  assert.deepEqual(changed.map(g => g.id), ['learning-priority']);
});
test('comparison rejects different parts, versions, membership, order, modes and incomplete answers', () => {
  const quiz = catalog[0], answers = answersFor(quiz);
  const current = snapshot(quiz, answers), previous = snapshot(quiz, answers, 'previous', '2026-10-19T06:00:00Z');
  assert.ok(comparableAttempt(current, previous, quiz.questions, quiz.id, 'full'));
  for (const altered of [{ ...previous, quiz_version_id: catalog[1].id }, { ...previous, mode: 'review' },
    { ...previous, signature: previous.signature.split(',').reverse().join(',') }, { ...previous, completed: false },
    { ...previous, answers: previous.answers.slice(1) }, { ...previous, id: current.id }, { ...previous, started_at: '2026-10-21T00:00:00Z' }]) {
    assert.equal(comparableAttempt(current, altered, quiz.questions, quiz.id, 'full'), false);
  }
  assert.equal(matchingAttempt(current, quiz.questions.slice(1), quiz.id, 'full'), false);
  assert.equal(Object.keys(submittedAnswers(current)).length, 7);
});
test('grading keeps original choices, preserves score and is idempotent', () => {
  const graded = gradeRun({ ...freshRun(), picked: [1] }, 'q1', false, ['option2']);
  assert.deepEqual(graded.answers.q1.selectedOptions, ['option2']);
  assert.equal(graded.score, 0); assert.deepEqual(graded.wrongIds, ['q1']);
  assert.strictEqual(gradeRun(graded, 'q1', true, ['option1']), graded);
});
