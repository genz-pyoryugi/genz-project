const {chromium}=require('../.tools/browser/node_modules/playwright');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {mockSupabase}=require('./helpers/supabase.cjs');
const {mockPersonal}=require('./helpers/personal-supabase.cjs');
const base=process.env.CHECKLIST_TEST_URL||'http://localhost:3000';
const completed=[{id:'saved-a',category:'조직 이해·적응',completedAt:'2026-10-20T01:00:00Z',groups:[{id:'group-a',title:'완료한 팀 미션',sourceUrl:'https://example.test/saved.pdf',sourcePages:[7],items:Array.from({length:5},(_,n)=>({key:`a-${n}`,text:`완료 항목 ${n+1}`}))}]},{id:'saved-b',category:'질문·소통',completedAt:'2026-10-20T02:00:00Z',groups:[{id:'group-b',title:'완료한 소통 미션',sourceUrl:null,items:[{key:'b-1',text:'먼저 질문하기'},{key:'b-2',text:'답변 적기'}]}]}];
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const viewport of [{width:560,height:820},{width:375,height:667},{width:320,height:480}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),cloud=await mockSupabase(context,completed),personal=await mockPersonal(context,cloud);
   const entries=Array.from({length:8},(_,n)=>({id:randomUUID(),user_id:cloud.userId,title:n===0?'직접 만든 출근 준비':`나의 보관 목록 ${n+1}`,items:[{id:randomUUID(),text:'계획 확인',checked:true},{id:randomUUID(),text:'일정 적기',checked:false},{id:randomUUID(),text:'물 챙기기',checked:false}],pinned:n===0,position:n===0?{x:.2,y:.3}:null,revision:1,updated_at:new Date().toISOString(),deleted_at:null}));
   entries.forEach(entry=>personal.rows.set(entry.id,structuredClone(entry)));
   const source='https://example.test/guide.pdf?edition=2';
   await context.route('**/api/checklists',route=>route.fulfill({json:[{id:'live-source',category:'조직 이해·적응',title:'현재 주제의 실제 미션',item1:'하나',item2:'둘',item3:'셋',item4:'넷',item5:'다섯',source_url:source,source_title:'연결된 조직 안내서',source_pages:[8,27],source_evidence:'연결된 설명 데이터가 팝업에도 그대로 표시됩니다.'}]}));
   await context.route('**/api/checklist-topics',route=>route.fulfill({json:['조직 이해·적응']}));
   await context.route('https://example.test/**',route=>route.fulfill({contentType:'text/html',body:'<p>Linked document test destination</p>'}));
   await context.addInitScript(note=>localStorage.setItem('genz-office-desk-notes-v1',JSON.stringify([note])),{id:'completed:saved-a',kind:'completed',recordId:'saved-a',category:completed[0].category,title:completed[0].groups[0].title,rowId:'group-a',items:completed[0].groups[0].items,sourceUrl:completed[0].groups[0].sourceUrl});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/checklist');await page.locator('.cute-note input:not(:disabled)').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   const evidenceTrigger=page.getByRole('button',{name:'근거 보기',exact:true}),historyTrigger=page.locator('.cute-history-button');
   await evidenceTrigger.click();const evidence=page.getByRole('dialog',{name:'자료와 근거',exact:true});await evidence.waitFor();
   assert.ok((await evidence.locator('.folder-topic').innerText()).includes('조직 이해·적응'));assert.ok((await evidence.locator('.folder-topic').innerText()).includes('현재 주제의 실제 미션'));
   await evidence.getByRole('heading',{name:'연결된 조직 안내서',exact:true}).waitFor();assert.ok((await evidence.innerText()).includes('연결된 설명 데이터'));
   assert.equal(await evidence.getByRole('link',{name:'8쪽',exact:true}).getAttribute('href'),source+'#page=8');assert.equal(await evidence.getByRole('link',{name:'27쪽',exact:true}).getAttribute('href'),source+'#page=27');assert.equal(await evidence.getByRole('link',{name:'전체 PDF 열기',exact:true}).getAttribute('href'),source);
   const sizes=await evidence.locator('.folder-source-links a').evaluateAll(links=>links.map(link=>{const b=link.getBoundingClientRect();return {y:b.y,height:b.height};}));assert.ok(sizes.every(box=>Math.abs(box.y-sizes[0].y)<1&&Math.abs(box.height-sizes[0].height)<1),'Document links share a row and height');
   assert.equal(await evidence.locator('.folder-page-link svg').count(),4,'Page icons use folded documents and arrows');
   for(const label of ['27쪽','전체 PDF 열기']){const popupPromise=page.waitForEvent('popup');await evidence.getByRole('link',{name:label,exact:true}).click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),label==='27쪽'?source+'#page=27':source);await popup.close();}
   fs.mkdirSync('.tools/screenshots',{recursive:true});await page.screenshot({path:`.tools/screenshots/folder-evidence-${viewport.width}.png`});
   await evidence.getByRole('button',{name:'근거 팝업 닫기',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.classList.contains('cute-evidence-button'));
   await evidenceTrigger.click();await page.keyboard.press('Escape');await evidence.waitFor({state:'hidden'});assert.equal(await evidenceTrigger.evaluate(el=>el===document.activeElement),true);
   await historyTrigger.click();const history=page.getByRole('dialog',{name:'나의 체크리스트',exact:true});await history.waitFor();
   const personalTab=history.getByRole('tab',{name:'직접 만든 목록 8',exact:true}),completedTab=history.getByRole('tab',{name:'완료한 기본 목록 2',exact:true});await personalTab.waitFor();assert.equal(await personalTab.getAttribute('aria-selected'),'true');
   const customCard=history.getByRole('button').filter({has:page.getByText('직접 만든 출근 준비',{exact:true})});assert.equal(await customCard.getByRole('progressbar').getAttribute('aria-valuenow'),'33');assert.ok((await customCard.innerText()).includes('1 / 3 완료'));assert.ok((await customCard.innerText()).includes('책상에 붙임'));
   assert.ok((await history.locator('.folder-storage-notice').innerText()).includes('저장한 목록과 완료 기록'));
   assert.ok(!(await history.innerText()).includes('Supabase'));
   await completedTab.click();assert.equal(await history.locator('#history-panel-personal').isVisible(),false);assert.equal(await history.locator('#history-panel-completed').isVisible(),true);
   const doneA=history.locator('[data-record-id="saved-a"]'),doneB=history.locator('[data-record-id="saved-b"]');assert.equal(await doneA.getByRole('progressbar').getAttribute('aria-valuenow'),'100');assert.ok((await doneA.innerText()).includes('5 / 5 완료'));assert.ok((await doneA.innerText()).includes('책상에 붙임'));assert.ok((await doneB.innerText()).includes('보관 중'));
   await doneA.locator('.folder-record-card').click();assert.equal(await doneA.locator('li').count(),5);assert.ok(await doneA.getByRole('button',{name:'이 기록 붙여두기',exact:true}).isVisible());
   await doneA.getByRole('button',{name:'완료한 팀 미션 완료 기록 삭제',exact:true}).click();await history.getByRole('tab',{name:'완료한 기본 목록 1',exact:true}).waitFor();await history.getByRole('button',{name:'실행 취소',exact:true}).click();await completedTab.waitFor();
   await personalTab.focus();await page.keyboard.press('ArrowRight');assert.equal(await completedTab.getAttribute('aria-selected'),'true');await page.keyboard.press('Home');assert.equal(await personalTab.getAttribute('aria-selected'),'true');
   assert.ok(await history.locator('.folder-history-scroll').evaluate(el=>el.scrollHeight>el.clientHeight),'History uses internal scrolling');
   await page.screenshot({path:`.tools/screenshots/folder-history-${viewport.width}.png`});
   await history.getByRole('button',{name:'기록 팝업 닫기',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.classList.contains('cute-history-button'));
   await historyTrigger.click();await customCard.click();const detail=page.getByRole('dialog',{name:'내 체크리스트',exact:true});await detail.waitFor();await detail.getByRole('button',{name:'편집',exact:true}).click();const editor=page.getByRole('dialog',{name:'나만의 체크리스트',exact:true});await editor.getByLabel('목록 제목').fill('저장 후 다시 여는 목록');await editor.getByRole('button',{name:'저장하기',exact:true}).click();await detail.getByRole('heading',{name:'저장 후 다시 여는 목록',exact:true}).waitFor();await detail.getByRole('checkbox').nth(1).check();await page.waitForFunction(()=>document.querySelector('.personal-detail-scroll')?.textContent.includes('2 / 3 체크'));await detail.getByRole('button',{name:'내 체크리스트 닫기',exact:true}).click();
   await page.reload();await page.locator('.cute-note input:not(:disabled)').first().waitFor();await historyTrigger.click();const updated=history.getByRole('button').filter({has:page.getByText('저장 후 다시 여는 목록',{exact:true})});await updated.waitFor();assert.equal(await updated.getByRole('progressbar').getAttribute('aria-valuenow'),'67');assert.ok((await updated.innerText()).includes('책상에 붙임'));await page.keyboard.press('Escape');await history.waitFor({state:'hidden'});assert.equal(await historyTrigger.evaluate(el=>el===document.activeElement),true);
   personal.rows.clear();cloud.rows.clear();await page.reload();await page.locator('.cute-note input:not(:disabled)').first().waitFor();await historyTrigger.click();await history.getByRole('tab',{name:'직접 만든 목록 0',exact:true}).waitFor();assert.ok(await history.getByText('직접 만든 목록이 없어요. ‘만들기’로 첫 목록을 추가해 보세요.',{exact:true}).isVisible());await history.getByRole('tab',{name:'완료한 기본 목록 0',exact:true}).click();assert.ok(await history.getByText('아직 완료한 기본 목록이 없어요.',{exact:true}).isVisible());
   assert.deepEqual(errors,[]);console.log(`PASS folders ${viewport.width}x${viewport.height}: dynamic PDF links/popups, same-row controls, focus/ESC, tabs/counts/progress, actual desk flags, saved snapshot actions, undo, edit/check/reload, empty states, internal scroll`);await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
