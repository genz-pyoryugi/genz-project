require('./load-ts.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {default:SaveDiagnostics,failureReason}=require('../src/app/quiz/SaveDiagnostics.tsx');
test('save diagnostics distinguish current and historical failures and show the actual reason',()=>{
  const issue={attemptId:'old',type:'quiz_started',at:'2026-10-20T00:00:00Z',reason:'P0001 Attempt was abandoned'};
  const html=renderToStaticMarkup(React.createElement(SaveDiagnostics,{save:{state:'saved',message:'',issues:[],historicalIssues:[issue]}}));
  assert.match(html,/현재 응시 0건 \/ 이전 기록 1건/);assert.match(html,/이미 중단한 응시/);assert.match(html,/P0001 Attempt was abandoned/);
  assert.doesNotMatch(html,/SQL 적용 여부/);
  assert.equal(renderToStaticMarkup(React.createElement(SaveDiagnostics,{save:{state:'saved',message:''}})),'');
  assert.match(failureReason('P0001 Progress position mismatch'),/문제 위치/);
});
