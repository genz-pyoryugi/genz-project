// Explicit live verification: creates isolated anonymous users and removes only its own test rows.
const {chromium}=require('../.tools/browser/node_modules/playwright');
const {createClient}=require('@supabase/supabase-js');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
const {randomUUID}=require('node:crypto');
process.loadEnvFile('.env.local');
const compiled=ts.transpileModule(fs.readFileSync('src/app/checklist/personal-store.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleUnderTest={exports:{}};new Function('exports',compiled)(moduleUnderTest.exports);
const {personalStore}=moduleUnderTest.exports;
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3000';
const client=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const check=result=>{if(result.error)throw Object.assign(new Error('Supabase request failed'),{code:result.error.code,status:result.status});return result.data;};
const wait=async(read,predicate)=>{for(let n=0;n<80;n++){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,150));}throw Error('Timed out waiting for real Supabase confirmation');};
const owned=[],clients=[];
let browser,context,page,storeA,userA;
async function sessionFromBrowser(){
 const session=await page.evaluate(()=>{const key=Object.keys(localStorage).find(name=>/^sb-.*-auth-token$/.test(name));return key?JSON.parse(localStorage.getItem(key)):null;});
 if(!session)throw Error('Browser anonymous session missing');
 return session;
}
(async()=>{
 const publicClient=client();clients.push(publicClient);
 const denied=await publicClient.from('personal_checklists').select('id').limit(1);
 assert.equal(denied.error?.code,'42501','Remote table exists and denies unauthenticated access');
 browser=await chromium.launch();context=await browser.newContext({viewport:{width:560,height:820},reducedMotion:'reduce'});page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/checklist');await page.locator('.cute-note input:not(:disabled)').first().waitFor();
 await page.getByRole('button',{name:'근거 보기',exact:true}).click();
 const evidence=page.getByRole('dialog',{name:'자료와 근거',exact:true});
 const pdfUrl=await evidence.getByRole('link',{name:'전체 PDF 열기',exact:true}).getAttribute('href');
 assert.ok(/^https:\/\//.test(pdfUrl));assert.ok((await page.request.head(pdfUrl)).ok(),'Connected PDF actually responds');
 for(const link of await evidence.locator('.folder-page-link').all()){
  const label=(await link.innerText()).trim(),href=await link.getAttribute('href');assert.equal(href,`${pdfUrl}#page=${parseInt(label,10)}`);
 }
 await evidence.getByRole('button',{name:'근거 팝업 닫기',exact:true}).click();
 console.log('PASS actual source PDF responds, and linked page destinations match displayed page numbers');
 await page.getByRole('button',{name:'만들기',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'나만의 체크리스트',exact:true}),detail=page.getByRole('dialog',{name:'내 체크리스트',exact:true});
 const title=`실제 저장 검증 ${randomUUID().slice(0,8)}`;
 await editor.getByLabel('목록 제목').fill(title);await editor.getByRole('textbox',{name:'1번 항목',exact:true}).fill('서버에 저장할 검증 항목');
 await editor.getByRole('button',{name:'＋ 항목 추가',exact:true}).click();await editor.getByRole('textbox',{name:'2번 항목',exact:true}).fill('편집 중 삭제할 검증 항목');
 const session=await sessionFromBrowser();userA=session.user.id;
 const a=client();clients.push(a);check(await a.auth.setSession(session));storeA=personalStore(a,userA);
 // Register created rows even if a later UI assertion fails.
 owned.push({client:a,userId:userA,title});
 await editor.getByRole('button',{name:'저장하기',exact:true}).click();await detail.getByRole('heading',{name:title,exact:true}).waitFor();
 let row=(await storeA.list()).find(entry=>entry.title===title);assert.ok(row,'Browser save persisted in actual Supabase');owned[0].id=row.id;
 const id=row.id;assert.equal(row.items.length,2);
 console.log('PASS actual browser anonymous auth and Supabase creation');
 await detail.getByRole('button',{name:'편집',exact:true}).click();await editor.getByLabel('목록 제목').fill(title+' 수정');
 await editor.getByRole('textbox',{name:'1번 항목',exact:true}).fill('수정해서 저장한 검증 항목');await editor.getByRole('button',{name:'2번 항목 삭제',exact:true}).click();
 await editor.getByRole('button',{name:'＋ 항목 추가',exact:true}).click();await editor.getByRole('textbox',{name:'2번 항목',exact:true}).fill('새로 추가한 검증 항목');
 await editor.getByRole('button',{name:'저장하기',exact:true}).click();await detail.getByRole('heading',{name:title+' 수정',exact:true}).waitFor();
 await detail.getByRole('checkbox').first().check();
 row=await wait(async()=>(await storeA.list()).find(entry=>entry.id===id),entry=>entry?.items[0].checked);
 assert.equal(row.title,title+' 수정');assert.equal(row.items[0].text,'수정해서 저장한 검증 항목');assert.equal(row.items[1].text,'새로 추가한 검증 항목');
 await page.reload();await page.locator('.cute-note input:not(:disabled)').first().waitFor();
 await page.locator('.cute-history-button').click();await page.locator('.personal-history-entry').filter({hasText:title+' 수정'}).click();await detail.waitFor();
 assert.equal(await detail.getByRole('checkbox').first().isChecked(),true);assert.equal((await sessionFromBrowser()).user.id,userA);
 console.log('PASS real title/item edits, item add/delete, completion check, history reopen, reload and anonymous session reuse');
 await detail.getByRole('button',{name:'책상에 붙이기',exact:true}).click();await page.waitForURL('**/intro/index.html?**');await page.waitForSelector('#officeStage.is-ready');
 const card=page.locator(`[data-note-id="personal:${id}"]`);await card.waitFor();
 row=await wait(async()=>(await storeA.list()).find(entry=>entry.id===id),entry=>entry?.pinned&&entry.position);
 const before=structuredClone(row.position);let bounds;
 await wait(async()=>{bounds=await card.locator('summary').boundingBox();return bounds;},value=>!!value);
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(100,350,{steps:12});await page.mouse.up();
 row=await wait(async()=>(await storeA.list()).find(entry=>entry.id===id),entry=>entry?.position&&Math.hypot(entry.position.x-before.x,entry.position.y-before.y)>.04);
 const position=structuredClone(row.position);
 await page.reload();await page.waitForSelector('#officeStage.is-ready');await card.waitFor();
 await wait(()=>card.boundingBox(),box=>box&&Math.abs(box.x-position.x*560)<3&&Math.abs(box.y-position.y*820)<3);
 await card.locator('summary').click();await card.getByRole('checkbox').nth(1).check();
 row=await wait(async()=>(await storeA.list()).find(entry=>entry.id===id),entry=>entry?.items.every(item=>item.checked));
 fs.mkdirSync('.tools/screenshots',{recursive:true});await page.screenshot({path:'.tools/screenshots/personal-live-verified.png'});
 console.log('PASS real desk pin, drag to saved cloud coordinates, reload position restore and desk completion check');
 await card.getByRole('button',{name:/책상에서 떼기/}).click();
 row=await wait(async()=>(await storeA.list()).find(entry=>entry.id===id),entry=>entry&&!entry.pinned);
 assert.deepEqual(row.position,position);assert.equal(row.items.length,2);assert.equal(row.deleted_at,null);
 console.log('PASS real unpin preserves checklist, checks and last position');
 const b=client();clients.push(b);check(await b.auth.signInAnonymously());const userB=(await b.auth.getSession()).data.session.user.id;assert.notEqual(userA,userB);
 const storeB=personalStore(b,userB),other=await storeB.create('격리 검증용 목록',[{id:randomUUID(),text:'다른 사용자 접근 검증',checked:false}]);owned.push({client:b,userId:userB,id:other.id});
 assert.equal((await storeB.list()).some(entry=>entry.id===id),false);
 assert.equal(check(await b.from('personal_checklists').select('id').eq('id',id)).length,0);
 assert.equal(check(await b.from('personal_checklists').update({title:'forbidden'}).eq('id',id).select('id')).length,0);
 assert.equal(check(await b.from('personal_checklists').delete().eq('id',id).select('id')).length,0);
 assert.ok((await b.from('personal_checklists').insert({id:randomUUID(),user_id:userA,title:'forged owner',items:other.items})).error);
 assert.ok((await b.from('personal_checklists').update({user_id:userA}).eq('id',other.id)).error);
 const stale=row;row=await storeA.update(row,{position});
 await assert.rejects(storeA.update(stale,{title:'stale overwrite'}),/다른 화면에서 변경/);
 assert.equal((await storeA.list()).find(entry=>entry.id===id).title,title+' 수정');
 console.log('PASS live RLS rejects foreign reads/updates/deletes, forged ownership and ownership transfer; stale writes cannot overwrite newer data');
 await page.goto(base+`/checklist?personal=${id}`);await detail.waitFor();
 await detail.getByRole('button',{name:'체크리스트 삭제',exact:true}).click();await detail.getByRole('button',{name:'체크리스트 삭제 확인',exact:true}).click();
 await wait(()=>storeA.list(),entries=>!entries.some(entry=>entry.id===id));
 const deleted=check(await a.from('personal_checklists').select('deleted_at,pinned').eq('id',id).single());assert.ok(deleted.deleted_at);assert.equal(deleted.pinned,false);
 assert.deepEqual(errors,[]);
 console.log('PASS actual deletion is distinct from unpin; deleted record is absent from active lists');
})().catch(error=>{console.error('FAIL live personal verification',{message:error.message,code:error.code,status:error.status});process.exitCode=1;}).finally(async()=>{
 for(const entry of owned){
  try{
   let ids=entry.id?[entry.id]:check(await entry.client.from('personal_checklists').select('id').eq('user_id',entry.userId).eq('title',entry.title)).map(row=>row.id);
   if(ids.length){const removed=check(await entry.client.from('personal_checklists').delete().eq('user_id',entry.userId).in('id',ids).select('id'));assert.equal(removed.length,ids.length);console.log('PASS removed own live verification rows:',removed.length);}
  }catch(error){console.error('FAIL verification row cleanup',{code:error.code,message:error.message});process.exitCode=1;}
 }
 if(context)await context.close();if(browser)await browser.close();
 for(const c of clients)await c.auth.signOut({scope:'local'});
});
