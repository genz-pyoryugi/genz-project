const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/app/checklist/desk-notes.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {readDeskNotes,saveDeskNote,deskNoteRow,deskNotesKey}=mod.exports;
const note={id:'checklist:42',kind:'checklist',category:'Category',title:'Original mission',rowId:'42',sourceUrl:'https://example.test/source.pdf',sourcePages:[3],items:Array.from({length:5},(_,i)=>({key:`42:item${i+1}:Action ${i+1}`,text:`Action ${i+1}`}))};
function storage(){const data=new Map();global.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};return data;}
test('pinning preserves exact content across reload and duplicate pins update the same note',()=>{
  storage();saveDeskNote(note);assert.deepEqual(readDeskNotes(),[note]);
  saveDeskNote({...note,title:'Updated mission'});assert.equal(readDeskNotes().length,1);assert.equal(readDeskNotes()[0].title,'Updated mission');
  const row=deskNoteRow(note);assert.equal(row.id,'42');assert.equal(row.item1,'Action 1');assert.equal(row.item5,'Action 5');assert.equal(row.source_url,note.sourceUrl);
});
test('completed records are distinct pins and do not overwrite current checklist notes',()=>{
  storage();saveDeskNote(note);saveDeskNote({...note,id:'completed:record-1',kind:'completed',recordId:'record-1'});assert.equal(readDeskNotes().length,2);
});
test('reopening a checklist with empty fields preserves its original check identities',()=>{
  const partial={...note,items:[note.items[1],note.items[4]]};
  const row=deskNoteRow(partial);assert.equal(row.item1,null);assert.equal(row.item2,'Action 2');assert.equal(row.item5,'Action 5');
});
test('blocked or corrupt storage is not reported as a successful pin',()=>{
  const data=storage();data.set(deskNotesKey,'bad data');assert.throws(()=>saveDeskNote(note));assert.equal(data.get(deskNotesKey),'bad data');
  data.set(deskNotesKey,JSON.stringify([{...note,sourceUrl:'javascript:alert(1)'}]));assert.throws(()=>readDeskNotes());
  global.localStorage={getItem:()=>null,setItem:()=>{throw Error('quota');}};assert.throws(()=>saveDeskNote(note),/quota/);
});
