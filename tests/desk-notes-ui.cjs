const {chromium}=require('../.tools/browser/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {mockSupabase}=require('./helpers/supabase.cjs');
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3002';
async function desk(page){
  await page.goto(base+'/intro/index.html?desk=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#officeStage.is-ready');
}
async function frame(page){const handle=await page.locator('#officeContentFrame').elementHandle();const f=await handle.contentFrame();await f.waitForSelector('.cute-note input:not(:disabled)');return f;}
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});const cloud=await mockSupabase(context);const page=await context.newPage();
   await desk(page);await page.locator('.hotspot[data-object=notebook] .hotspot-dot').click();
   let f=await frame(page);const title=await f.locator('.cute-note h2').innerText();
   await f.getByRole('checkbox').first().check();
   await f.getByRole('button',{name:'현재 체크리스트 책상에 붙이기'}).click();
   await page.locator('#officeContent').waitFor({state:'hidden'});
   const current=page.locator('.desk-note').filter({has:page.locator('.desk-note__kind',{hasText:'나의 체크리스트'})});
   assert.equal(await page.locator('.desk-note').count(),1);
   assert.equal(await current.locator('strong').innerText(),title);
   assert.equal(await current.locator('.desk-note__progress').innerText(),'1 / 5 체크');
   const bounds=await page.locator('.desk-notes').boundingBox();
   assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width,'Desk notes remain inside the visible viewport');
   await current.getByRole('checkbox').nth(1).check();
   assert.equal(await current.locator('.desk-note__progress').innerText(),'2 / 5 체크');
   await current.getByRole('button',{name:'크게 보기'}).click();f=await frame(page);
   assert.equal(await f.locator('.cute-note h2').innerText(),title,'Reopen exact pinned mission, not a random one');
   assert.equal(await f.locator('.cute-note input:checked').count(),2);
   await f.getByRole('button',{name:'현재 체크리스트 책상에 붙이기'}).click();
   await page.locator('#officeContent').waitFor({state:'hidden'});assert.equal(await page.locator('.desk-note').count(),1,'No duplicate pin');
   await current.getByRole('button',{name:'크게 보기'}).click();f=await frame(page);
   for(const input of await f.getByRole('checkbox').all())await input.check();
   await f.locator('.cute-finish').click();await f.getByRole('button',{name:'완료 기록 보기, 1개'}).click();
   await f.locator('.cute-history-entry .folder-record-card').first().click();
   await f.getByRole('button',{name:'이 기록 붙여두기'}).click();
   await page.locator('#officeContent').waitFor({state:'hidden'});
   assert.equal(await page.locator('.desk-note').count(),2);
   const completed=page.locator('.desk-note').filter({has:page.locator('.desk-note__kind',{hasText:'완료한 미션'})});
   assert.equal(await completed.locator('input:checked:disabled').count(),5);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#officeStage.is-ready');
   assert.equal(await page.locator('.desk-note').count(),2,'Both notes survive reload');
   await completed.locator('summary').click();await completed.getByRole('button',{name:'완료 기록 열기'}).click();
   f=await frame(page);await f.getByRole('dialog',{name:'나의 체크리스트'}).waitFor();
   assert.equal(await f.locator('.cute-history-entry li').count(),5);
   await f.getByRole('button',{name:'기록 팝업 닫기'}).click();await f.getByRole('button',{name:'체크리스트 닫기',exact:true}).click();
   await page.locator('#officeContent').waitFor({state:'hidden'});
   await completed.getByRole('button',{name:/붙이기 해제/}).click();
   assert.equal(await page.locator('.desk-note').count(),1);
   assert.equal([...cloud.rows.values()].filter(row=>!row.deleted_at).length,1,'Unpin preserves Supabase completion history');
   await current.locator('summary').click();
   fs.mkdirSync('.tools/screenshots',{recursive:true});
   await page.screenshot({path:`.tools/screenshots/desk-notes-${viewport.width}.png`});
   console.log(`PASS desk notes ${viewport.width}x${viewport.height}: pin, live checks, exact reopen, deduplicate, completed pin, reload, history reopen, safe unpin`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
