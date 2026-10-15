const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
}
const { materialChecklists, linkedPdfRows } = load('src/lib/pdf-checklists.ts');
const { groupsFor, rowsForVisit, readChecks, visitKey, storageKey } = load('src/app/checklist/model.ts');
const base = 'https://materials.example.test';
const sources = materialChecklists.map(checklist => ({
  title: checklist.file, category: checklist.category,
  url: `${base}/storage/v1/object/public/genz-materials/${checklist.file}`,
}));

test('every topic has three distinct PDF-grounded lists with five nonempty items', () => {
  const rows = linkedPdfRows(sources, base);
  assert.equal(rows.length, 21);
  assert.equal(new Set(rows.map(row => row.id)).size, 21);
  const categories = [...new Set(rows.map(row => row.category))];
  assert.equal(categories.length, 7);
  for (const category of categories) {
    const groups = groupsFor(rows, category);
    assert.equal(groups.length, 3);
    assert.equal(new Set(groups.map(group => group.items.map(item => item.text).join('|'))).size, 3);
    for (const group of groups) {
      assert.equal(group.items.length, 5);
      assert.equal(new Set(group.items.map(item => item.text)).size, 5);
      assert.ok(group.items.every(item => item.text.trim()));
      assert.ok(group.sourcePages.every(page => Number.isInteger(page) && page > 0));
      assert.ok(group.sourceEvidence);
    }
  }
});

test('only PDFs still linked to the matching admin topic are used', () => {
  assert.deepEqual(linkedPdfRows([], base), []);
  assert.deepEqual(linkedPdfRows(sources, 'https://other.example.test'), []);
  assert.deepEqual(linkedPdfRows(sources.map(source => ({ ...source, category: 'unrelated' })), base), []);
  const removed = sources.filter(source => !source.url.endsWith('/01-organization.pdf'));
  assert.equal(linkedPdfRows(removed, base).filter(row => row.category === sources[0].category).length, 0);
});

test('refresh changes every topic while saved check identities remain stable', () => {
  const store = new Map();
  global.sessionStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  global.localStorage = { getItem: key => store.get(key) || null };
  const rows = linkedPdfRows(sources, base);
  let previous = rowsForVisit(rows);
  const checkedKey = groupsFor(previous, previous[0].category)[0].items[0].key;
  store.set(storageKey, JSON.stringify({ [checkedKey]: true }));
  for (let i = 0; i < 100; i++) {
    const current = rowsForVisit(rows);
    assert.equal(current.length, 7);
    for (const row of current) assert.notEqual(row.id, previous.find(old => old.category === row.category).id);
    assert.equal(readChecks()[checkedKey], true);
    previous = current;
  }
  store.set(visitKey, 'invalid JSON');
  assert.equal(rowsForVisit(rows).length, 7);
  global.sessionStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(rowsForVisit(rows).length, 7);
  assert.deepEqual(rowsForVisit([]), []);
  assert.equal(rowsForVisit([rows[0]])[0].id, rows[0].id);
});
