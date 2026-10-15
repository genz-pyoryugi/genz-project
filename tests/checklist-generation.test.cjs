const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const { pageRange, storagePdfUrl, validateDraft, readAIResult, checklistSchemaForRange } = require('../.checklist-tests/checklist-core.js');
const { analyzePdf, saveChecklist, requireOperator, limitedPdf, jsonBody } = require('../.checklist-tests/checklist-server.js');
const base = 'https://test.supabase.co';
const source = { id: 90, title: '업무 이해', category: '업무 절차·기준', url: `${base}/storage/v1/object/public/genz-materials/02-work-understanding.pdf` };
const draft = () => ({ title:'업무 전 확인', description:'원문 기반 확인 행동', items:Array.from({length:5},(_,i)=>({text:`확인 행동 ${i+1}`,page:2,evidence:`원문 근거 ${i+1}`})) });
process.env.NEXT_PUBLIC_SUPABASE_URL = base;
process.env.OPENAI_API_KEY = 'test-only';
process.env.SUPABASE_SECRET_KEY = 'test-only';
process.env.CHECKLIST_ADMIN_TOKEN = 'local-test-token';

test('external, private, redirected path and credential URLs cannot be submitted as PDFs',()=>{
  assert.equal(storagePdfUrl(source.url,base),source.url);
  for (const url of ['http://127.0.0.1/a.pdf',`${base}/storage/v1/object/authenticated/genz-materials/a.pdf`,`${base}/storage/v1/object/public/genz-materials/a.pdf?redirect=x`,`${base}/storage/v1/object/public/genz-materials/a/b.pdf`,`${base.replace('https://','https://name:pass@')}/storage/v1/object/public/genz-materials/a.pdf`]) assert.throws(()=>storagePdfUrl(url,base));
});
test('page range and original-page references reject out-of-range and fractional values',()=>{
  assert.deepEqual(pageRange(40,59),{start:40,end:59});
  for(const range of [[0,5],[1,21],[8,7],[1.5,5],['1',5]]) assert.throws(()=>pageRange(...range));
  const bad=draft(); bad.items[0].page=1; assert.throws(()=>validateDraft(bad,2,3));
  const duplicate=draft(); duplicate.items[4].text=duplicate.items[0].text; assert.throws(()=>validateDraft(duplicate,2,3));
});
test('refusal, truncated AI response and invalid evidence never produce a savable draft',()=>{
  assert.throws(()=>readAIResult({status:'incomplete',output:[]},1,3));
  assert.throws(()=>readAIResult({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]},1,3));
  const bad=draft();bad.items[0].page=99;
  assert.throws(()=>readAIResult({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(bad)}]}]},1,3));
});
test('generation schema admits only actual selected source pages without sharing state across requests',()=>{
  const short=checklistSchemaForRange(1,12);
  const shifted=checklistSchemaForRange(40,42);
  assert.deepEqual(short.properties.items.items.properties.page.enum,Array.from({length:12},(_,i)=>i+1));
  assert.deepEqual(shifted.properties.items.items.properties.page.enum,[40,41,42]);
  assert.equal(short.properties.items.items.properties.page.enum.includes(13),false);
  assert.throws(()=>checklistSchemaForRange(1,21));
});
test('operator token and same-origin protection are required before paid or write operations',()=>{
  const request=(url,headers={})=>new Request(url,{headers});
  assert.throws(()=>requireOperator(request('http://localhost:3001/api')));
  assert.throws(()=>requireOperator(request('https://deployed.example/api',{'x-checklist-token':'local-test-token'})));
  assert.throws(()=>requireOperator(request('http://localhost:3001/api',{'x-checklist-token':'local-test-token',origin:'https://other.example'})));
  assert.doesNotThrow(()=>requireOperator(request('http://localhost:3001/api',{'x-checklist-token':'local-test-token',origin:'http://localhost:3001'})));
});
test('Next internal localhost URL accepts actual loopback Host but rejects other ports and sites',()=>{
  const make=(host,origin)=>new Request('http://localhost:3001/api',{headers:{host,origin,'x-checklist-token':'local-test-token'}});
  assert.doesNotThrow(()=>requireOperator(make('127.0.0.1:3001','http://127.0.0.1:3001')));
  assert.doesNotThrow(()=>requireOperator(make('localhost:3001','http://localhost:3001')));
  assert.doesNotThrow(()=>requireOperator(make('[::1]:3001','http://[::1]:3001')));
  assert.throws(()=>requireOperator(make('127.0.0.1:3001','http://127.0.0.1:4000')));
  assert.throws(()=>requireOperator(make('127.0.0.1:3001','https://127.0.0.1:3001')));
  assert.throws(()=>requireOperator(make('evil.example:3001','http://evil.example:3001')));
});
test('request size is enforced even without content-length; malformed JSON rejected',async()=>{
  await assert.rejects(jsonBody(new Request('http://localhost',{method:'POST',body:'x'.repeat(16001)})));
  await assert.rejects(jsonBody(new Request('http://localhost',{method:'POST',body:'null'})));
});
test('actual PDF is sliced to requested pages and sent with original-page mapping',async()=>{
  const pdf=await PDFDocument.create();for(let i=0;i<4;i++)pdf.addPage();const bytes=await pdf.save();
  const sourceHeight=pdf.getPage(1).getHeight();
  let input;
  const original=global.fetch;
  global.fetch=async(url,options)=>{
    if(String(url)===source.url)return new Response(bytes,{headers:{'content-type':'application/pdf'}});
    assert.equal(String(url),'https://api.openai.com/v1/responses');input=JSON.parse(options.body);
    return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]});
  };
  try {
    const result=await analyzePdf(source,2,3);assert.equal(result.pageCount,4);
    const encoded=input.input[0].content[0].file_data.split(',')[1];
    const excerpt=await PDFDocument.load(Buffer.from(encoded,'base64'));
    assert.equal(excerpt.getPageCount(),2);
    assert.equal(excerpt.getPage(0).getHeight(),pdf.getPage(1).getHeight()+22);
    assert.equal(pdf.getPage(1).getHeight(),sourceHeight);
    assert.deepEqual(input.text.format.schema.properties.items.items.properties.page.enum,[2,3]);
    assert.equal(result.draft.items[0].page,2);
    assert.match(input.input[0].content[1].text,/2~3/);
    assert.equal(input.text.format.strict,true);
    assert.equal(input.store,false);
  } finally {global.fetch=original;}
});
test('PDF size overflow, non-PDF and pages beyond document fail before AI call',async()=>{
  const original=global.fetch;
  try {
    global.fetch=async()=>new Response('not a PDF');await assert.rejects(limitedPdf(source.url));
    global.fetch=async()=>new Response('x',{headers:{'content-length':String(26*1024*1024)}});await assert.rejects(limitedPdf(source.url));
    const pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save();
    global.fetch=async()=>new Response(bytes);await assert.rejects(analyzePdf(source,2,3),/1쪽/);
  } finally {global.fetch=original;}
});
test('save inserts exact existing table fields and repeat save updates same generated row',async()=>{
  const original=global.fetch;let saved=null,inserts=0,updates=0;
  global.fetch=async(url,options)=>{
    const method=options?.method||'GET';
    assert.match(String(url),/\/rest\/v1\/checklists/);
    if(method==='GET')return Response.json(saved?[{id:12}]:[]);
    const payload=JSON.parse(options.body);const row=Array.isArray(payload)?payload[0]:payload;
    assert.equal(row.status,'완료');assert.equal(row.category,source.category);assert.equal(row.source_url,source.url);
    assert.equal(row.item5,'확인 행동 5');assert.match(row.description,/PDF 2쪽/);
    if(method==='POST')inserts++;else if(method==='PATCH')updates++;else assert.fail(method);
    saved={...row,id:12};return Response.json(saved);
  };
  try {
    const first=await saveChecklist(source,2,3,draft());assert.equal(first.updated,false);
    const second=await saveChecklist(source,2,3,draft());assert.equal(second.updated,true);
    assert.equal(inserts,1);assert.equal(updates,1);assert.equal(second.checklist.id,12);
  } finally {global.fetch=original;}
});
test('database errors are visible and never reported as successful saves',async()=>{
  const original=global.fetch;
  global.fetch=async()=>Response.json({message:'invalid column',code:'42703'},{status:400});
  try {await assert.rejects(saveChecklist(source,2,3,draft()),/조회에 실패/);} finally {global.fetch=original;}
});
