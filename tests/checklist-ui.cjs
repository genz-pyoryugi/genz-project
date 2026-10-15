// Local browser verification: node tests/checklist-ui.cjs (Playwright in .tools/browser).
const { chromium } = require('../.tools/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {mockSupabase}=require('./helpers/supabase.cjs');
const base = process.env.CHECKLIST_TEST_URL || 'http://localhost:3002';
const shots = '.tools/screenshots';
fs.mkdirSync(shots,{recursive:true});

async function measure(frame) {
  return frame.evaluate(()=>{
    const root=document.scrollingElement;
    const tabs=[...document.querySelectorAll('[role=tab]')];
    const checks=[...document.querySelectorAll('.cute-note label')];
    const save=document.querySelector('.cute-finish').getBoundingClientRect();
    return {viewport:[innerWidth,innerHeight],page:[root.scrollWidth,root.scrollHeight],
      tabs:tabs.map(tab=>({y:tab.getBoundingClientRect().y,label:tab.getAttribute('aria-label'),title:tab.title,svg:!!tab.querySelector('svg')})),
      checks:checks.map(label=>{const r=label.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};}),
      saveBottom:save.bottom,bodyOverflow:getComputedStyle(document.body).overflowY};
  });
}
async function openPopup(page) {
  await page.goto(base+'/intro/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const el=document.getElementById('office');
    window.scrollTo(0,scrollY+el.getBoundingClientRect().top+(el.offsetHeight-innerHeight)*.9);
  });
  await page.waitForSelector('#officeStage.is-ready');
  await page.locator('.hotspot[data-object=notebook] .hotspot-dot').click();
  await page.waitForSelector('#officeContent.is-open');
  const handle=await page.locator('#officeContentFrame').elementHandle();
  const frame=await handle.contentFrame();
  await frame.waitForSelector('.cute-note input:not(:disabled)');
  await frame.evaluate(()=>document.fonts.ready);
  return frame;
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for(const size of [{width:1440,height:900},{width:1280,height:768},{width:1280,height:720},{width:390,height:844},{width:375,height:667}]){
      const context=await browser.newContext({viewport:size,reducedMotion:'reduce'});
      await mockSupabase(context);
      const page=await context.newPage();
      const frame=await openPopup(page);
      for(let index=0;index<7;index++){
        await frame.getByRole('tab').nth(index).click();
        const m=await measure(frame);
        assert.equal(m.checks.length,5);
        assert.equal(m.tabs.length,7);
        assert.ok(m.tabs.every(tab=>tab.label&&!tab.title&&tab.svg));
        assert.ok(Math.max(...m.tabs.map(tab=>tab.y))-Math.min(...m.tabs.map(tab=>tab.y))<5,'Icons must stay on one row');
        assert.ok(m.page[0]<=m.viewport[0]+1,'Horizontal overflow '+JSON.stringify(m));
        assert.ok(m.page[1]<=m.viewport[1]+1,'Vertical overflow '+JSON.stringify(m));
        assert.ok(m.checks.every(check=>check.height>=44&&check.top>=0&&check.bottom<=m.viewport[1]));
        assert.ok(m.saveBottom<=m.viewport[1],'Save button must be visible');
      }
      await frame.getByRole('tab').first().click();
      await frame.getByRole('button',{name:'근거 보기',exact:true}).click();
      await frame.getByRole('dialog',{name:'자료와 근거'}).waitFor({state:'visible'});
      assert.ok(await frame.getByRole('link',{name:/PDF.*쪽/}).count());
      await page.keyboard.press('Escape');
      await frame.getByRole('dialog',{name:'자료와 근거'}).waitFor({state:'hidden'});
      assert.ok(await page.locator('#officeContent.is-open').isVisible(),'Escape must not close outer popup');
      for(const input of await frame.getByRole('checkbox').all())await input.check();
      await frame.getByRole('button',{name:'완료 기록 저장 ✓',exact:true}).click();
      await frame.getByRole('button',{name:'오늘도 해냈다! ✓',exact:true}).waitFor();
      await frame.getByRole('button',{name:'완료 기록 보기, 1개',exact:true}).click();
      await frame.getByRole('dialog',{name:'나의 완료 기록 1개'}).waitFor();
      assert.equal(await frame.locator('.cute-history-entry li').count(),5);
      await frame.getByRole('button',{name:'기록 팝업 닫기'}).click();
      await frame.locator('.cute-checklist').screenshot({path:`${shots}/checklist-${size.width}x${size.height}.png`});
      await frame.goto(base+'/checklist');
      await frame.waitForSelector('.cute-note input:not(:disabled)');
      await frame.getByRole('button',{name:'완료 기록 보기, 1개',exact:true}).click();
      assert.equal(await frame.locator('.cute-history-entry li').count(),5,'History survives reload');
      console.log('PASS popup '+size.width+'x'+size.height+': 7 topics, no scrolling, save + history + evidence + Escape + reload');
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:320,height:480},reducedMotion:'reduce'});
    await mockSupabase(context);
    const page=await context.newPage();
    await page.goto(base+'/checklist?preview=1');
    await page.waitForSelector('.cute-note input:not(:disabled)');
    const small=await measure(page);
    assert.ok(small.page[0]<=320,'Small screen horizontal overflow');
    assert.notEqual(small.bodyOverflow,'hidden','Short screens must allow natural scrolling');
    await page.locator('.cute-history-button').scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'완료 기록 보기, 0개'}).click();
    await page.getByRole('dialog').filter({has:page.locator('#cute-history-title')}).waitFor();
    console.log('PASS 320x480: content remains reachable with natural vertical scrolling');
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
