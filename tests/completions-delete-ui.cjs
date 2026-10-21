const {chromium}=require('../.tools/browser/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {mockSupabase}=require('./helpers/supabase.cjs');
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3002';
const records=['기록 A','기록 B','기록 C'].map((title,index)=>({id:`record-${index}`,category:'조직 이해·적응',completedAt:`2026-10-${15-index}T01:00:00Z`,groups:[{id:`group-${index}`,title,sourceUrl:null,items:Array.from({length:5},(_,i)=>({key:`${index}:${i}`,text:`완료 항목 ${i+1}`}))}]}));
async function open(page){await page.getByRole('button',{name:/완료 기록 보기/}).click();await page.locator('#cute-history-title').waitFor();await page.waitForFunction(()=>!document.querySelector('[role=status]')?.textContent.includes('가져오는 중'));}
async function count(page,n){await page.waitForFunction(n=>document.querySelectorAll('.cute-history-entry').length===n,n);}
async function remove(page,title){const card=page.locator('.cute-history-entry').filter({hasText:title}).locator('.folder-record-card');if(await card.getAttribute('aria-expanded')!=='true')await card.click();await page.getByRole('button',{name:`${title} 완료 기록 삭제`,exact:true}).click();}
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const viewport of [{width:580,height:720},{width:375,height:667}]){
   const context=await browser.newContext({viewport});const page=await context.newPage();
   const cloud=await mockSupabase(context,records);
   await page.goto(base+'/checklist?preview=1');await page.waitForSelector('.cute-note input:not(:disabled)');
   await page.evaluate(data=>{localStorage.setItem('genz-checklist-completions-v1',JSON.stringify(data));localStorage.setItem('deletion-test-other','keep');},records);
   await page.reload();await page.waitForSelector('.cute-note input:not(:disabled)');await open(page);
   await remove(page,'기록 A');
   await count(page,2);
   assert.equal(await page.locator('.cute-history-entry').count(),2);assert.equal(await page.getByRole('tab',{name:'완료한 기본 목록 2',exact:true}).count(),1);
   assert.equal(await page.locator('.cute-history-badge').innerText(),'2');
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();await count(page,3);assert.equal(await page.locator('.cute-history-entry').count(),3);
   assert.equal(await page.locator('.cute-history-entry h4').first().innerText(),'기록 A');
   await remove(page,'기록 B');
   await count(page,2);
   await remove(page,'기록 C');
   await count(page,1);
   assert.equal(await page.locator('.cute-history-entry').count(),1);
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();await count(page,3);assert.equal(await page.locator('.cute-history-entry').count(),3);
   await remove(page,'기록 A');
   await count(page,2);
   fs.mkdirSync('.tools/screenshots',{recursive:true});await page.screenshot({path:`.tools/screenshots/completion-delete-${viewport.width}.png`});
   await page.reload();await page.waitForSelector('.cute-note input:not(:disabled)');await open(page);
   await count(page,2);
   assert.equal(await page.locator('.cute-history-entry').count(),2,'Deletion survives refresh');
   assert.equal(await page.locator('.cute-history-entry .folder-card-heading strong').first().innerText(),'기록 B');
   assert.equal(await page.evaluate(()=>localStorage.getItem('deletion-test-other')),'keep');
   cloud.failWrite=true;
   await remove(page,'기록 B');
   await page.getByRole('dialog').getByRole('alert').waitFor();
   assert.equal(await page.locator('.cute-history-entry').count(),2,'Failed write does not falsely remove a record');
   assert.ok(await page.getByRole('dialog').getByRole('alert').isVisible());
   console.log(`PASS deletion ${viewport.width}x${viewport.height}: individual delete, badge, undo, multiple deletes, reload, write failure`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
