/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness for transpiled Next route. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PDFDocument } = require('pdf-lib');
const { NextRequest } = require('next/server');
function load(path, extras = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require, Buffer, File, Response, AbortSignal, ...extras });
  return exports;
}
const contract = load('src/lib/manual-conversion.ts');
function sample(schema) {
  if (schema.type === 'string') return 'Manual learning example';
  if (schema.type === 'integer') return schema.minimum;
  if (schema.type === 'array') return Array.from({ length: schema.minItems }, () => sample(schema.items));
  return Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, sample(v)]));
}
test('validates the complete UI contract, answer indexes and physical page references', () => {
  const data = sample(contract.manualSchema);
  assert(contract.validateManual(data, 2));
  data.quiz[0].answer = 4;
  assert(!contract.validateManual(data, 2));
  data.quiz[0].answer = 0;
  data.guide.stepsPage = 3;
  assert(!contract.validateManual(data, 2));
  data.guide.stepsPage = 1;
  data.checklist = [];
  assert(!contract.validateManual(data, 2));
});
test('PDF route validates bytes and pages, returns structured learning, handles provider failures', async () => {
  const env = { OPENAI_API_KEY: 'test-only-key' };
  let status = 200, output = sample(contract.manualSchema), calls = 0;
  const route = load('src/app/api/manuals/convert/route.ts', {
    process: { env },
    require(name) { return name === '@/lib/manual-conversion' ? contract : require(name); },
    async fetch(url, options) {
      calls++;
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(options.body);
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      assert(body.input[0].content[0].file_data.startsWith('data:application/pdf;base64,'));
      return { ok: status === 200, status, async json() { return { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }; } };
    },
  });
  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = await pdf.save();
  async function post(content = bytes, origin) {
    const form = new FormData(); form.append('file', new Blob([content], { type: 'application/pdf' }), 'manual.pdf');
    return route.POST(new NextRequest('http://localhost:3000/api/manuals/convert', { method: 'POST', headers: origin ? { origin } : {}, body: form }));
  }
  assert.equal((await post(bytes, 'https://other.example')).status, 403);
  assert.equal((await post(Buffer.from('not pdf'))).status, 400);
  assert.equal(calls, 0);
  const response = await post(); assert.equal(response.status, 200);
  assert.equal((await response.json()).pageCount, 1);
  output.guide.page = 2;
  assert.equal((await post()).status, 502);
  output = sample(contract.manualSchema);
  status = 429; assert.equal((await post()).status, 429);
  delete env.OPENAI_API_KEY;
  assert.equal((await post()).status, 503);
});
