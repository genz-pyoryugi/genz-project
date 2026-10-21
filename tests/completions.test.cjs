const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/app/checklist/completions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(moduleUnderTest, moduleUnderTest.exports);
const { readCompletions, saveCompletion, deleteCompletion, restoreCompletions, completionsKey } = moduleUnderTest.exports;
const date = new Date('2026-10-15T14:59:00Z');
const groups = () => [{ id:'mission-1', title:'Saved title', sourceUrl:'https://example.test/source.pdf', sourcePages:[42], sourceTitle:'PDF title',
  items:[{key:'item-1',text:'First action'},{key:'item-2',text:'Second action'}] }];
const checked = {'item-1':true,'item-2':true};
function storage() {
  const data = new Map();
  global.localStorage = { getItem:key=>data.get(key)||null, setItem:(key,value)=>data.set(key,value) };
  return data;
}

test('completed content survives reload and changes to the live checklist', () => {
  storage();
  const live = groups();
  const saved = saveCompletion('Category',live,checked,date);
  live[0].title='Changed title';live[0].items[0].text='Changed action';live[0].sourcePages[0]=99;
  assert.equal(saved[0].groups[0].title,'Saved title');
  assert.equal(saved[0].groups[0].items[0].text,'First action');
  assert.deepEqual(saved[0].groups[0].sourcePages,[42]);
  assert.deepEqual(readCompletions(),saved);
  assert.equal(saved[0].completedAt,date.toISOString());
});

test('repeated clicks save once per Korean day and preserve other tabs records', () => {
  storage();
  saveCompletion('Category',groups(),checked,date);
  assert.equal(saveCompletion('Category',groups(),checked,new Date('2026-10-15T14:59:30Z')).length,1);
  const nextDay = saveCompletion('Category',groups(),checked,new Date('2026-10-15T15:01:00Z'));
  assert.equal(nextDay.length,2);
  const other = groups();other[0].id='mission-2';other[0].title='Other mission';
  assert.equal(saveCompletion('Category',other,checked,date).length,3);
  assert.equal(readCompletions().length,3);
});

test('incomplete missions cannot create records', () => {
  storage();
  assert.throws(()=>saveCompletion('Category',groups(),{'item-1':true},date));
  assert.throws(()=>saveCompletion('Category',[],checked,date));
  assert.deepEqual(readCompletions(),[]);
});

test('storage failures and corrupt history are reported without overwriting history', () => {
  const data = storage();
  data.set(completionsKey,'broken JSON');
  assert.throws(()=>saveCompletion('Category',groups(),checked,date));
  assert.equal(data.get(completionsKey),'broken JSON');
  data.set(completionsKey,JSON.stringify([{id:'bad',completedAt:'not a date'}]));
  assert.throws(()=>readCompletions());
  global.localStorage = {getItem:()=>null,setItem:()=>{throw Error('quota exceeded');}};
  assert.throws(()=>saveCompletion('Category',groups(),checked,date),/quota exceeded/);
});
test('deleting one record preserves other records and undo merges with the latest history', () => {
  const data=storage();
  const original=saveCompletion('Category',groups(),checked,date)[0];
  const second=groups();second[0].id='mission-2';
  saveCompletion('Other category',second,checked,new Date('2026-10-16T00:00:00Z'));
  data.set('genz-checklist-page-v1',JSON.stringify(checked));data.set('genz-office-desk-notes-v1','pinned snapshot');
  const result=deleteCompletion(original.id);assert.equal(result.history.length,1);assert.deepEqual(result.removed,original);
  assert.equal(readCompletions().length,1);assert.equal(data.get('genz-checklist-page-v1'),JSON.stringify(checked));assert.equal(data.get('genz-office-desk-notes-v1'),'pinned snapshot');
  const third=groups();third[0].id='mission-3';saveCompletion('Newest',third,checked,new Date('2026-10-17T00:00:00Z'));
  const restored=restoreCompletions([original]);assert.equal(restored.length,3);assert.equal(restored[0].category,'Newest');assert.deepEqual(restored[2],original);
  assert.equal(restoreCompletions([original]).length,3,'Undo never duplicates a restored record');
  assert.equal(deleteCompletion('missing id').removed,undefined);
});
test('failed deletion leaves the original history intact',()=>{
  const data=storage();const original=saveCompletion('Category',groups(),checked,date)[0];
  global.localStorage.setItem=()=>{throw Error('storage blocked');};
  assert.throws(()=>deleteCompletion(original.id),/storage blocked/);assert.equal(JSON.parse(data.get(completionsKey)).length,1);
});
