const {chromium}=require('../.tools/browser/node_modules/playwright');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const {mockSupabase}=require('./helpers/supabase.cjs');
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3002';
const legacyKey='genz-checklist-completions-v1';
const records=Array.from({length:53},(_,i)=>({id:`legacy-${i}`,category:'조직 이해·적응',completedAt:new Date(Date.UTC(2026,9,15,0,i)).toISOString(),groups:[{id:`g${i}`,title:`기존 기록 ${i}`,sourceUrl:null,items:[{key:`i${i}`,text:'확인한 항목'}]}]}));
const waitCount=(page,n)=>page.waitForFunction(n=>document.querySelectorAll('.cute-history-entry').length===n,n);
async function ready(page){await page.goto(base+'/checklist?preview=1');await page.waitForSelector('.cute-note input:not(:disabled)');for(const input of await page.getByRole('checkbox').all())await input.check();await page.locator('.cute-finish:not(:disabled)').waitFor();}
async function history(page){await page.locator('.cute-history-button').click();await page.getByRole('dialog',{name:/나의 체크리스트/}).waitFor();}
(async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:580,height:720}}),cloud=await mockSupabase(context),page=await context.newPage();
  await ready(page);cloud.failWrite=true;
  await page.locator('.cute-finish').click();await page.locator('.cute-paper .cute-save-error').waitFor();
  assert.equal(await page.getByRole('button',{name:'오늘도 해냈다! ✓',exact:true}).count(),0);
  assert.equal(await page.locator('.cute-history-badge').innerText(),'0');assert.equal(cloud.rows.size,0);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),null,'Cloud failure never falls back to fake local success');
  cloud.failWrite=false;cloud.delayWrite=300;
  await page.locator('.cute-finish').click();await page.getByRole('button',{name:'처리 중…',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'오늘도 해냈다! ✓',exact:true}).count(),0);
  await page.getByRole('button',{name:'오늘도 해냈다! ✓',exact:true}).waitFor();assert.equal(cloud.rows.size,1);
  await page.locator('.cute-finish').click();await page.getByRole('button',{name:'오늘도 해냈다! ✓',exact:true}).waitFor();assert.equal(cloud.rows.size,1);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),null,'New saves only use Supabase');
  cloud.delayWrite=0;
  await page.evaluate(({key,records})=>localStorage.setItem(key,JSON.stringify(records)),{key:legacyKey,records});
  const original=await page.evaluate(key=>localStorage.getItem(key),legacyKey);
  await page.reload();await page.waitForSelector('.cute-note input:not(:disabled)');await history(page);
  await waitCount(page,1);assert.equal(cloud.signups,1,'Reload reuses the existing anonymous user');
  cloud.failWriteAt=cloud.writes+2;
  await page.getByRole('button',{name:'기존 기록 서버로 이전'}).click();await page.getByRole('dialog').getByRole('alert').waitFor();
  assert.equal(cloud.rows.size,51,'First import batch committed before a later network failure');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),original);
  cloud.failWriteAt=0;
  await page.getByRole('button',{name:'기존 기록 서버로 이전'}).click();await waitCount(page,54);
  assert.equal(cloud.rows.size,54,'Retry imports only missing records');
  await page.locator('.cute-history-entry').filter({hasText:'기존 기록 0'}).locator('.folder-record-card').click();
  await page.getByRole('button',{name:'기존 기록 0 완료 기록 삭제',exact:true}).click();await waitCount(page,53);
  await page.getByRole('button',{name:'기존 기록 서버로 이전'}).click();await page.getByRole('button',{name:'기존 기록 서버로 이전'}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.cute-legacy-import button').disabled);
  assert.equal(await page.locator('.cute-history-entry').count(),53,'Re-import does not resurrect deleted records');
  assert.equal(cloud.rows.size,54);assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),original);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();await waitCount(page,54);
  await page.getByRole('button',{name:'기록 팝업 닫기'}).click();
  cloud.failRead=true;await history(page);await page.getByRole('dialog').getByRole('alert').waitFor();
  assert.equal(await page.getByRole('dialog').getByText('아직 완료한 미션이 없어요.',{exact:false}).count(),0,'Read error is never shown as empty successful history');
  cloud.failRead=false;await page.getByRole('dialog').getByRole('button',{name:'다시 연결'}).click();await waitCount(page,54);
  console.log('PASS cloud UI: delayed/failed saves, dedupe, persistent anonymous identity, partial import retry, intact local backup, tombstones, undo, read failure');
  // Simulate an external identity change while a write response is pending.
  await page.getByRole('button',{name:'기록 팝업 닫기'}).click();
  for(const input of await page.getByRole('checkbox').all())await input.check();
  cloud.delayWrite=800;await page.locator('.cute-finish').click();await page.getByRole('button',{name:'처리 중…'}).waitFor();
  cloud.userId=randomUUID();
  await page.evaluate(session=>{
   const key=Object.keys(localStorage).find(key=>/^sb-.*-auth-token$/.test(key));
   const previous=localStorage.getItem(key);const value=JSON.stringify(session);
   localStorage.setItem(key,value);window.dispatchEvent(new StorageEvent('storage',{key,oldValue:previous,newValue:value,storageArea:localStorage}));
   const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session});channel.close();
  },cloud.session());
  await page.waitForTimeout(1400);
  assert.equal(await page.locator('.cute-history-badge').innerText(),'0');
  assert.equal(await page.getByRole('button',{name:'오늘도 해냈다! ✓',exact:true}).count(),0,'Old in-flight save cannot announce success for a different user');
  await page.locator('.cute-paper .cute-cloud-retry').click();await page.locator('.cute-finish:not(:disabled)').waitFor();
  await history(page);await waitCount(page,0);
  console.log('PASS identity change: old records and old pending success are cleared');
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
