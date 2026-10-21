const {chromium}=require('../.tools/browser/node_modules/playwright');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const {mockSupabase}=require('./helpers/supabase.cjs');
const {mockPersonal}=require('./helpers/personal-supabase.cjs');
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3000';
const wait=async(fn)=>{for(let n=0;n<100;n++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out waiting for confirmed state');};
async function layout(page,editor,width,height){
 const result=await editor.evaluate(el=>{
  const scroll=el.querySelector('.personal-items-scroll'),footer=el.querySelector('.personal-form-footer'),button=footer.querySelector('[type=submit]');
  const rect=node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
  return {dialog:rect(el),list:rect(scroll),footer:rect(footer),save:rect(button),scrolls:scroll.scrollHeight>scroll.clientHeight,outerScroll:el.scrollHeight>el.clientHeight+1};
 });
 assert.ok(result.dialog.x>=0&&result.dialog.right<=width+1,'Clipboard stays within viewport width');
 assert.ok(result.save.y>=0&&result.save.bottom<=height,'Save remains visible');
 assert.ok(result.list.bottom<=result.footer.y+1,'List never overlaps footer');
 assert.equal(result.outerScroll,false,'Only list scrolls, not clipboard shell');
 assert.ok(await editor.getByRole('button',{name:'저장하기',exact:true}).isVisible());
 return result;
}
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const viewport of [{width:560,height:900},{width:375,height:667},{width:320,height:480}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),auth=await mockSupabase(context),db=await mockPersonal(context,auth);
   const id=randomUUID(),original={id,user_id:auth.userId,title:'사용자가 저장한 목록',items:Array.from({length:35},(_,n)=>({id:randomUUID(),text:`사용자 할 일 ${n+1}`,checked:n%3===0})),pinned:false,position:{x:.3,y:.2},revision:1,updated_at:new Date().toISOString(),deleted_at:null};
   db.rows.set(id,structuredClone(original));
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/checklist?preview=1');await page.locator('.cute-note input:not(:disabled)').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   const create=page.getByRole('button',{name:'만들기',exact:true});
   const alignment=await create.evaluate(el=>{
    const b=el.getBoundingClientRect(),i=el.querySelector('svg').getBoundingClientRect(),t=el.querySelector('.personal-create-label').getBoundingClientRect();
    return {icon:i.y+i.height/2,text:t.y+t.height/2,group:(i.x+t.right)/2,center:b.x+b.width/2};
   });
   assert.ok(Math.abs(alignment.icon-alignment.text)<=1,'Plus and label are optically centered');
   assert.ok(Math.abs(alignment.group-alignment.center)<1,'Icon and text group is centered in button');
   await create.click();
   const editor=page.getByRole('dialog',{name:'나만의 체크리스트',exact:true}),confirm=page.getByRole('dialog',{name:'변경 내용을 버릴까요?',exact:true});
   await editor.waitFor();assert.equal(await editor.getByLabel('목록 제목').inputValue(),'');assert.equal(await editor.getByRole('textbox',{name:'1번 항목',exact:true}).inputValue(),'','No fixed example data');
   assert.equal(await editor.getByLabel('목록 제목').evaluate(el=>document.activeElement===el),true,'Title receives initial focus');
   await editor.getByLabel('목록 제목').fill('저장하지 않을 새 목록');await editor.getByRole('textbox',{name:'1번 항목',exact:true}).fill('새 항목');
   await editor.getByRole('button',{name:'＋ 항목 추가',exact:true}).click();
   assert.equal(await editor.getByRole('textbox',{name:'2번 항목',exact:true}).evaluate(el=>document.activeElement===el),true,'Adding an item focuses its input');
   await editor.getByText('할 일 2개',{exact:true}).waitFor();
   await editor.getByRole('button',{name:'1번 항목 삭제',exact:true}).click();await editor.getByText('할 일 1개',{exact:true}).waitFor();
   await editor.getByRole('button',{name:'취소',exact:true}).click();await confirm.waitFor();
   await confirm.getByRole('button',{name:'계속 편집',exact:true}).click();await confirm.waitFor({state:'hidden'});assert.equal(await editor.getByLabel('목록 제목').inputValue(),'저장하지 않을 새 목록');
   await editor.getByRole('button',{name:'내 체크리스트 닫기',exact:true}).click();await confirm.waitFor();await page.keyboard.press('Escape');await confirm.waitFor({state:'hidden'});assert.ok(await editor.isVisible(),'Escape on confirmation keeps the editor');
   await page.keyboard.press('Escape');await confirm.waitFor();await confirm.getByRole('button',{name:'변경 버리기',exact:true}).click();await editor.waitFor({state:'hidden'});assert.equal(db.rows.size,1,'Cancelled creation does not write');
   await page.goto(base+`/checklist?preview=1&personal=${id}`);
   const detail=page.getByRole('dialog',{name:'내 체크리스트',exact:true});await detail.waitFor();await detail.getByRole('button',{name:'편집',exact:true}).click();
   await editor.getByText('할 일 35개',{exact:true}).waitFor();assert.equal(await editor.getByLabel('목록 제목').inputValue(),original.title);
   assert.equal(await editor.getByRole('textbox',{name:'35번 항목',exact:true}).inputValue(),'사용자 할 일 35','Actual stored user data populates form');
   const metrics=await layout(page,editor,viewport.width,viewport.height);assert.equal(metrics.scrolls,true,'Many items scroll inside list');
   const before=await editor.getByRole('button',{name:'저장하기',exact:true}).boundingBox();
   await editor.locator('.personal-items-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
   const after=await editor.getByRole('button',{name:'저장하기',exact:true}).boundingBox();assert.ok(Math.abs(before.y-after.y)<1,'Footer stays fixed while scrolling list');
   await editor.getByLabel('목록 제목').fill('취소할 편집');await editor.getByRole('button',{name:'＋ 항목 추가',exact:true}).click();
   await editor.getByRole('textbox',{name:'36번 항목',exact:true}).fill('취소할 항목');await editor.getByRole('button',{name:'35번 항목 삭제',exact:true}).click();
   await editor.getByRole('button',{name:'취소',exact:true}).click();await confirm.getByRole('button',{name:'변경 버리기',exact:true}).click();await detail.waitFor();assert.deepEqual(db.rows.get(id),original,'Cancel discards title, item edits, and item deletion');
   await detail.getByRole('button',{name:'편집',exact:true}).click();await editor.getByLabel('목록 제목').fill('다시 열어도 남는 제목');
   await editor.getByRole('textbox',{name:'1번 항목',exact:true}).fill('수정하여 저장한 항목');await editor.getByRole('checkbox',{name:'1번 항목 완료',exact:true}).uncheck();
   await editor.getByRole('button',{name:'2번 항목 삭제',exact:true}).click();await editor.getByRole('button',{name:'＋ 항목 추가',exact:true}).click();await editor.getByRole('textbox',{name:'35번 항목',exact:true}).fill('새로 추가해 저장한 항목');
   await layout(page,editor,viewport.width,viewport.height);
   fs.mkdirSync('.tools/screenshots',{recursive:true});await page.screenshot({path:`.tools/screenshots/personal-clipboard-many-${viewport.width}.png`});
   await editor.getByRole('button',{name:'저장하기',exact:true}).click();await detail.getByRole('heading',{name:'다시 열어도 남는 제목',exact:true}).waitFor();
   await wait(()=>db.rows.get(id).revision===2);assert.equal(db.rows.get(id).items.length,35);assert.equal(db.rows.get(id).items[0].checked,false);assert.deepEqual(db.rows.get(id).position,original.position,'Editing preserves desk position');
   await page.reload();await detail.waitFor();await detail.getByRole('button',{name:'편집',exact:true}).click();
   assert.equal(await editor.getByLabel('목록 제목').inputValue(),'다시 열어도 남는 제목');assert.equal(await editor.getByRole('textbox',{name:'1번 항목',exact:true}).inputValue(),'수정하여 저장한 항목');assert.equal(await editor.getByRole('textbox',{name:'35번 항목',exact:true}).inputValue(),'새로 추가해 저장한 항목');
   await editor.getByRole('button',{name:'내 체크리스트 닫기',exact:true}).click();await editor.waitFor({state:'hidden'});assert.equal(await confirm.isVisible(),false,'Unchanged saved content closes without confirmation');
   await page.goto(base+'/intro/index.html?desk=1');await page.waitForSelector('#officeStage.is-ready');await page.locator('.hotspot[data-object=notebook] .hotspot-dot').click();
   const frame=page.frameLocator('#officeContentFrame');await frame.locator('.cute-note input:not(:disabled)').first().waitFor();await frame.getByRole('button',{name:'만들기',exact:true}).click();
   const embedded=frame.getByRole('dialog',{name:'나만의 체크리스트',exact:true}),embeddedConfirm=frame.getByRole('dialog',{name:'변경 내용을 버릴까요?',exact:true});
   await embedded.getByLabel('목록 제목').fill('책상 팝업의 보관할 초안');
   const frameSize=await frame.locator('body').evaluate(()=>({width:innerWidth,height:innerHeight}));await layout(page,embedded,frameSize.width,frameSize.height);
   await page.locator('#officeContentBackdrop').click({position:{x:3,y:3}});await embeddedConfirm.waitFor();
   await embeddedConfirm.getByRole('button',{name:'계속 편집',exact:true}).click();assert.ok(await page.locator('#officeContent.is-open').isVisible());assert.equal(await embedded.getByLabel('목록 제목').inputValue(),'책상 팝업의 보관할 초안');
   await page.locator('#officeContentBackdrop').click({position:{x:3,y:3}});await embeddedConfirm.getByRole('button',{name:'변경 버리기',exact:true}).click();await page.locator('#officeContent').waitFor({state:'hidden'});assert.equal(db.rows.size,1,'Closing host popup does not save an unfinished creation');
   assert.deepEqual(errors,[]);
   console.log(`PASS clipboard ${viewport.width}x${viewport.height}: centered entry icon/text, real fields, focus, live count, cancel/close/Escape confirmation, isolated list scroll, fixed footer, save/reopen`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
