import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('src/app/calendar/data.ts', root), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const rows = context.exports.chapters.flatMap((chapter, chapterIndex) => chapter.topics.map((topic, position) =>
  `(${quote(topic.art)}, ${chapterIndex}, ${position}, ${quote(topic.quiz)}, ${topic.answer}, ${quote(topic.explanation)}, ${quote(topic.source)})`));
const sql = `-- Generated from the nine original calendar questions. Existing edits are preserved.\nbegin;\ninsert into public.calendar_quiz_questions (id, chapter, position, quiz, answer, explanation, source) values\n${rows.join(',\n')}\non conflict (id) do nothing;\ncommit;\n`;
fs.writeFileSync(new URL('supabase/seed-calendar-quiz.sql', root), sql, 'utf8');
console.log(`Prepared ${rows.length} quiz questions; no database writes performed.`);
