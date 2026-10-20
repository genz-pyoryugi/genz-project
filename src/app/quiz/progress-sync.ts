import type { Tracker } from '@/lib/learning-client';
import type { Draft } from './progress';

// Replays the immutable submitted prefix before the draft. This also repairs a crash
// between writing the local snapshot and writing its outbox events. All IDs stay stable.
export function queueDraft(tracker: Tracker, owner: string, draft: Draft) {
  const fields = { attemptId: draft.attempt.id, attemptVisitId: draft.attempt.visitId, progressOwner: owner };
  tracker.record('quiz_started', { ...fields, quizVersionId: draft.quizId, mode: draft.run.reviewIds ? 'review' : 'full',
    ...(draft.run.sourceAttemptId ? { sourceAttemptId: draft.run.sourceAttemptId } : {}) });
  const ids = draft.questionIds.filter(id => !draft.run.reviewIds || draft.run.reviewIds.includes(id));
  for (const id of ids) {
    const answer = draft.run.answers[id];
    if (answer) tracker.record('answer_submitted', { ...fields, questionVersionId: id, selectedOption: [...answer.selectedOptions].sort().join(',') });
  }
  if (ids.length && ids.every(id => draft.run.answers[id])) tracker.record('quiz_completed', fields);
  tracker.record('quiz_progress', { ...fields, snapshot: draft });
}
