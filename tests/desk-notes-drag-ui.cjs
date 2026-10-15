const {chromium}=require('../.tools/browser/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {mockSupabase}=require('./helpers/supabase.cjs');
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3002';
const notes=[1,2].map(id=>({id:`drag-test:${id}`,kind:'checklist',category:'조직 이해·적응',rowId:String(id),title:`책상 메모 ${id}`,sourceUrl:null,
  items:Array.from({length:5},(_,i)=>({key:`${id}:item${i+1}:미션 ${i+1}`,text:`미션 ${i+1}`}))}));
async function ready(page){await page.goto(base+'/intro/index.html?desk=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#officeStage.is-ready');}
async function scrollDesk(page){await page.evaluate(()=>{const office=document.getElementById('office');window.scrollTo(0,scrollY+office.getBoundingClientRect().top+(office.offsetHeight-innerHeight)*.9);});await page.waitForSelector('#officeStage.is-ready');}
async function drag(page,handle,x,y,touch){
 const bounds=await handle.boundingBox();const start={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 if(touch){
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(x-start.x)*i/8,y:start.y+(y-start.y)*i/8}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
 }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(x,y,{steps:12});await page.mouse.up();}
}
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const spec of [{width:1440,height:900,touch:false},{width:390,height:844,touch:true}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.touch,isMobile:spec.touch,reducedMotion:'reduce'});
   await mockSupabase(context);
   await context.addInitScript(data=>{if(!localStorage.getItem('genz-office-desk-notes-v1'))localStorage.setItem('genz-office-desk-notes-v1',JSON.stringify(data));},notes);
   const page=await context.newPage();await ready(page);
   const cards=page.locator('.desk-note');const first=cards.nth(0),second=cards.nth(1);
   const firstBefore=await first.boundingBox();
   await drag(page,first.locator('summary'),spec.touch?180:500,spec.touch?240:300,spec.touch);
   assert.ok(await first.evaluate(card=>card.classList.contains('desk-note--floating')),'Actual pointer movement detaches the note');
   assert.equal(await second.evaluate(card=>card.classList.contains('desk-note--floating')),false,'Other notes remain independent');
   assert.equal(await first.getAttribute('open'),null,'Drag does not accidentally expand or collapse');
   let position=await first.boundingBox();
   assert.ok(position.x>=7&&position.y>=7&&position.x+position.width<=spec.width+1,'Moved note is within viewport');
   assert.ok(Math.abs(position.y-firstBefore.y)>20,'Note moves to the requested area');
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#officeStage.is-ready');
   let restored=await first.boundingBox();assert.ok(Math.abs(position.x-restored.x)<2&&Math.abs(position.y-restored.y)<2,'Position survives reload');
   await first.locator('summary').click();assert.equal(await first.getByRole('checkbox').count(),5);
   await first.getByRole('checkbox').nth(0).check();
   assert.equal(await first.locator('.desk-note__progress').innerText(),'1 / 5 체크','Checking after dragging still saves');
   assert.ok(await first.evaluate(card=>card.classList.contains('desk-note--floating')),'Rerender retains moved position');
   const handle=first.locator('summary');await handle.focus();
   const beforeKey=await first.boundingBox();await page.keyboard.press('ArrowDown');const afterKey=await first.boundingBox();assert.ok(afterKey.y>beforeKey.y,'Keyboard move works');
   await page.setViewportSize({width:320,height:480});await scrollDesk(page);const resized=await first.boundingBox();
   assert.ok(resized.x>=7&&resized.y>=7&&resized.x+resized.width<=321&&resized.y+resized.height<=481,'Resize keeps entire note reachable');
   await page.setViewportSize({width:spec.width,height:spec.height});await scrollDesk(page);
   await drag(page,second.locator('summary'),spec.touch?250:850,spec.touch?200:420,spec.touch);
   assert.equal(await page.locator('.desk-note--floating').count(),2,'Two notes can be moved independently');
   fs.mkdirSync('.tools/screenshots',{recursive:true});await page.screenshot({path:`.tools/screenshots/desk-notes-drag-${spec.width}.png`});
   console.log(`PASS drag ${spec.width}x${spec.height}: ${spec.touch?'touch':'mouse'}, independent notes, reload, check, keyboard, resize`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
