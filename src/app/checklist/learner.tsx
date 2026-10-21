'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { groupsFor, readChecks, rowsForVisit, sameCategory, type Row, storageKey, topics as defaults, validateRows } from './model';
import { previewRows } from './preview-data';
import { completionId, createCompletion, type CompletedMission } from './completions';
import { useCompletionHistory } from './use-completion-history';
import { ChecklistIcon, topicIcons } from './icons';
import { deskNoteRow, readDeskNotes, saveDeskNote, type DeskNote } from './desk-notes';
import './cute.css';
import { usePersonalChecklists } from './use-personal-checklists';
import { PersonalEditor, PersonalHistory, type PersonalRequest } from './personal-editor';
import { FolderDialog, FolderIcon, HistoryCard } from './folder-dialog';
import type { PersonalChecklist } from './personal-store';
import { ChecklistTutorial } from './tutorial';

const completionDate = new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
export default function ChecklistPage() {
  const router = useRouter();
  const personal = usePersonalChecklists();
  const [personalRequest, setPersonalRequest] = useState<PersonalRequest | null>(null);
  const [historyTab, setHistoryTab] = useState<'personal'|'completed'>('personal');
  const [expandedCompleted, setExpandedCompleted] = useState<string|null>(null);
  const [deskNotes, setDeskNotes] = useState<DeskNote[]>([]);
  const [deskPlacementKnown, setDeskPlacementKnown] = useState(false);
  const personalOpened = useRef(false);
  function openPersonal(id: string | null) {
    historyDialog.current?.close();
    setPersonalRequest({ id, nonce: Date.now() });
  }
  function pinPersonal(entry: PersonalChecklist) {
    const id = `personal:${entry.id}`;
    if (window.parent !== window) window.parent.postMessage({ type: 'genz-checklist:personal-pinned', id }, window.location.origin);
    else router.push(`/intro/index.html?desk=1&pin=${encodeURIComponent(id)}`);
  }
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get('personal');
    if (id && personal.connection === 'ready' && !personalOpened.current) {
      personalOpened.current = true;
      setPersonalRequest({ id, nonce: Date.now() });
    }
  }, [personal.connection]);
  const [topics,setTopics] = useState(defaults);
  const [topic,setTopic] = useState(0);
  const [rows,setRows] = useState<Row[]>([]);
  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [attempt,setAttempt] = useState(0);
  const [checked,setChecked] = useState<Record<string,boolean>>({});
  const [storageReady,setStorageReady] = useState(false);
  const [storageWarning,setStorageWarning] = useState(false);
  const [celebrate,setCelebrate] = useState(false);
  const cloud = useCompletionHistory();
  const { history, deletedRecords } = cloud;
  const [actionError,setHistoryError] = useState('');
  const [celebrationOwner,setCelebrationOwner] = useState<string|null>(null);
  const [celebrationRecord,setCelebrationRecord] = useState('');
  const historyError = cloud.error || actionError;
  const undoButton = useRef<HTMLButtonElement>(null);
  const evidenceDialog = useRef<HTMLDialogElement>(null);
  const historyDialog = useRef<HTMLDialogElement>(null);
  const evidenceButton = useRef<HTMLButtonElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const recordOpened = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
      const params=new URL(window.location.href).searchParams;
      let pinned: DeskNote | undefined;
      try{pinned=readDeskNotes().find(note=>note.kind==='checklist'&&note.id===params.get('pinned'));}catch{ /* Regular loading remains available if note storage is blocked. */ }
      if(new URL(window.location.href).searchParams.get('preview')==='1') {
        await Promise.resolve();
        if(!controller.signal.aborted){setRows(rowsForVisit(previewRows));setStatus('ready');}
        return;
      }
      try {
        const [list,categories] = await Promise.all([
          fetch('/api/checklists',{cache:'no-store',signal:controller.signal}),
          fetch('/api/checklist-topics',{cache:'no-store',signal:controller.signal}),
        ]);
        if(!list.ok)throw new Error('load');
        const data = validateRows(await list.json());
        const names = categories.ok?await categories.json():defaults;
        if(!controller.signal.aborted){
          const selected=rowsForVisit(data);
          const loadedTopics=Array.isArray(names)&&names.length&&names.every(name=>typeof name==='string')?names:defaults;
          if(pinned){
            setRows([...selected.filter(row=>!sameCategory(row.category,pinned!.category)),deskNoteRow(pinned)]);
            const index=loadedTopics.findIndex(name=>sameCategory(pinned!.category,name));
            if(index<0){setTopics([...loadedTopics,pinned.category]);setTopic(loadedTopics.length);}else{setTopics(loadedTopics);setTopic(index);}
          }else{setRows(selected);setTopics(loadedTopics);}
          setStatus('ready');
        }
      }catch{if(!controller.signal.aborted){if(pinned){setRows([deskNoteRow(pinned)]);setTopics([pinned.category]);setTopic(0);setStatus('ready');}else setStatus('error');}}
    }
    void load();return()=>controller.abort();
  },[attempt]);
  useEffect(()=>{
    const load = ()=>{
      try{setChecked(readChecks());}catch{setStorageWarning(true);}
      try{setDeskNotes(readDeskNotes());setDeskPlacementKnown(true);}catch{setDeskPlacementKnown(false);}
      setStorageReady(true);
    };
    const initial = setTimeout(load,0);window.addEventListener('storage',load);window.addEventListener('focus',load);
    return()=>{clearTimeout(initial);window.removeEventListener('storage',load);window.removeEventListener('focus',load);if(timer.current)clearTimeout(timer.current);};
  },[]);
  useEffect(()=>{
    const record=new URL(window.location.href).searchParams.get('record');
    if(storageReady&&cloud.connection==='ready'&&record&&!recordOpened.current){
      recordOpened.current=true;
      setHistoryTab('completed');setExpandedCompleted(record);
      historyDialog.current?.showModal();
      requestAnimationFrame(()=>{
        const entry=[...(historyDialog.current?.querySelectorAll<HTMLElement>('[data-record-id]')||[])].find(element=>element.dataset.recordId===record);
        entry?.scrollIntoView({block:'nearest'});
      });
    }
  },[storageReady,cloud.connection,history]);

  const groups = groupsFor(rows,topics[topic]);
  const items = groups.flatMap(group=>group.items);
  const count = items.filter(item=>checked[item.key]).length;
  const progress = items.length?Math.round(count/items.length*100):0;
  const complete = items.length>0&&count===items.length;
  const currentId = completionId(topics[topic],groups);
  const recorded = history.some(entry=>entry.id===currentId);
  async function finish(){
    if(!complete||status!=='ready'||!storageReady||cloud.busy||cloud.connection!=='ready')return;
    setCelebrate(false);setHistoryError('');
    let entry: CompletedMission;
    try{entry=createCompletion(topics[topic],groups,checked);}
    catch{setHistoryError('모든 항목을 체크한 뒤 저장해 주세요.');return;}
    if(!await cloud.save(entry))return;
    setCelebrationOwner(cloud.userId);setCelebrationRecord(entry.id);
    setCelebrate(true);
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>setCelebrate(false),4000);
  }
  function toggle(key:string){
    const next={...checked};if(next[key])delete next[key];else next[key]=true;
    setChecked(next);setCelebrate(false);
    try{localStorage.setItem(storageKey,JSON.stringify(next));setStorageWarning(false);}catch{setStorageWarning(true);}
  }
  async function deleteRecord(id:string){
    setHistoryError('');setCelebrate(false);
    if(await cloud.remove(id))setTimeout(()=>undoButton.current?.focus({preventScroll:true}),0);
  }
  async function undoDeletion(){
    setHistoryError('');await cloud.undo();
  }
  function pinToDesk(entry?:CompletedMission){
    const group=entry?.groups[0]||groups[0];
    if(!group)return;
    const note:DeskNote={
      id:entry?`completed:${entry.id}`:`checklist:${group.id}`,kind:entry?'completed':'checklist',
      category:entry?.category||topics[topic],title:group.title||'나의 체크리스트',rowId:String(group.id),
      items:(entry?entry.groups.flatMap(saved=>saved.items):group.items).map(item=>({...item})),
      sourceUrl:group.sourceUrl,sourceTitle:group.sourceTitle,sourcePages:group.sourcePages,
      ...(entry?{recordId:entry.id}:{sourceEvidence:groups[0].sourceEvidence}),
    };
    try{
      saveDeskNote(note);setDeskNotes(readDeskNotes());setDeskPlacementKnown(true);setHistoryError('');
      if(window.parent!==window)window.parent.postMessage({type:'genz-checklist:pinned',id:note.id},window.location.origin);
      else router.push(`/intro/index.html?desk=1&pin=${encodeURIComponent(note.id)}`);
    }catch{setHistoryError('책상에 메모를 붙이지 못했어요. 브라우저 저장 공간을 확인해 주세요.');}
  }
  function select(index:number){setTopic(index);setCelebrate(false);}
  function tabKeys(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
    const next=event.key==='ArrowRight'?(index+1)%topics.length:event.key==='ArrowLeft'?(index+topics.length-1)%topics.length:event.key==='Home'?0:event.key==='End'?topics.length-1:null;
    if(next!==null){event.preventDefault();select(next);document.getElementById(`checklist-tab-${next}`)?.focus();}
  }
  function close(){
    if(window.parent!==window)window.parent.postMessage({type:'genz-checklist:close'},window.location.origin);
    else router.push('/intro/index.html#office');
  }
  function restoreDialogFocus(button: React.RefObject<HTMLButtonElement|null>){
    requestAnimationFrame(()=>{if(!document.querySelector('dialog[open]'))button.current?.focus({preventScroll:true});});
  }
  function historyTabKeys(event:React.KeyboardEvent<HTMLButtonElement>){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const current=event.currentTarget.id==='history-tab-personal'?'personal':'completed';
    const next=event.key==='Home'?'personal':event.key==='End'?'completed':current==='personal'?'completed':'personal';
    setHistoryTab(next);document.getElementById(`history-tab-${next}`)?.focus();
  }
  function backdropClick(event:React.MouseEvent<HTMLDialogElement>){
    if(event.target===event.currentTarget){
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.currentTarget.close();
    }
  }

  return <main className="cute-checklist" lang="ko">
    <section className="cute-paper" aria-label="회사생활 실천 체크리스트">
      <button className="cute-close" onClick={close} aria-label="체크리스트 닫기" title="체크리스트 닫기">×</button><ChecklistTutorial/>
      <header className="cute-heading"><h1>GEN Z CHECK-LIST</h1><p>하나씩 체크하고, 오늘도 무사히!</p></header>
      <nav className="cute-tabs" role="tablist" aria-label="회사생활 주제">{topics.map((name,index)=>{
        const knownIndex=defaults.findIndex(category=>sameCategory(category,name));
        return <button key={name} id={`checklist-tab-${index}`} role="tab" aria-label={name} aria-selected={topic===index} aria-controls="checklist-panel" tabIndex={topic===index?0:-1} onClick={()=>select(index)} onKeyDown={event=>tabKeys(event,index)}>
          <ChecklistIcon name={topicIcons[(knownIndex<0?index:knownIndex)%topicIcons.length]}/>
        </button>;
      })}</nav>
      <div className="cute-status"><strong>{topics[topic]}</strong><span className="cute-counter" aria-live="polite">{count}<span> / {items.length}</span> 체크!</span></div>
      <div className="cute-progress" role="progressbar" aria-label="현재 주제 실천 완료율" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div>
      <div className="cute-sheet-body">
      <div id="checklist-panel" className="cute-content" role="tabpanel" aria-labelledby={`checklist-tab-${topic}`} aria-busy={status==='loading'}>
        {status==='loading'&&<div className="cute-state" role="status"><h2>체크할 일을 챙겨 오는 중!</h2><p>잠깐만 기다려 주세요.</p></div>}
        {status==='error'&&<div className="cute-state" role="alert"><h2>잠깐, 연결이 끊겼어요</h2><button onClick={()=>{setStatus('loading');setAttempt(n=>n+1);}}>다시 가져오기 ↻</button></div>}
        {status==='ready'&&!groups.length&&<div className="cute-state"><h2>오늘의 미션을 준비 중이에요</h2><p>등록된 체크리스트가 아직 없어요.</p><a href="/checklist?preview=1">PDF 미션 먼저 둘러보기 →</a></div>}
        {status==='ready'&&groups.map(group=><section className="cute-note" key={group.id} aria-label={group.title||'실천 미션'}>
          <h2><span>{group.title||'오늘의 작은 미션'}</span></h2>
          <ul>{group.items.map(item=><li className={checked[item.key]?'cute-checked':''} key={item.key}>
            <label><input type="checkbox" checked={!!checked[item.key]} disabled={!storageReady} onChange={()=>toggle(item.key)}/><span className="cute-box" aria-hidden="true">✓</span><span className="cute-item-text">{item.text}</span></label>
          </li>)}</ul>
        </section>)}
      </div>
      <div className="cute-evidence-row"><button ref={evidenceButton} className="cute-evidence-button" disabled={status!=='ready'||!groups.length} onClick={()=>evidenceDialog.current?.showModal()} aria-haspopup="dialog"><ChecklistIcon name="info"/>근거 보기</button></div>
      <footer className="cute-footer">
        <button className={`cute-finish${recorded?' is-finished':''}`} disabled={!complete||status!=='ready'||!storageReady||cloud.busy||cloud.connection!=='ready'} onClick={finish}>{cloud.busy?'처리 중…':celebrate&&celebrationOwner===cloud.userId&&celebrationRecord===currentId?'오늘도 해냈다! ✓':recorded?'저장 완료 ✓':'완료 기록 저장 ✓'}</button>
        <button ref={historyButton} className="cute-history-button" onClick={()=>{setHistoryTab(personal.entries.length||!history.length?'personal':'completed');historyDialog.current?.showModal();void cloud.refresh();void personal.refresh();}} aria-label={`완료 기록 보기, ${history.length}개${personal.entries.length?`, 내 체크리스트 ${personal.entries.length}개`:''}`} title="내 기록 보기" aria-haspopup="dialog"><ChecklistIcon name="history"/><span className="cute-history-badge" aria-hidden="true">{history.length+personal.entries.length}</span></button>
        <button className="cute-desk-pin" disabled={status!=='ready'||!groups.length||!storageReady} onClick={()=>pinToDesk()} aria-label="현재 체크리스트 책상에 붙이기"><ChecklistIcon name="pin"/><span>책상에 붙이기</span></button>
        <button className="cute-personal-button" onClick={() => openPersonal(null)} aria-label="만들기" aria-haspopup="dialog"><span className="personal-create-content"><svg className="personal-create-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg><span className="personal-create-label">만들기</span></span></button>
      </footer>
      <div className="cute-sr-only" role="status">{celebrate&&celebrationOwner===cloud.userId&&celebrationRecord===currentId?'완료한 미션을 서버에 저장했어요.':recorded?'이미 저장된 완료 기록이 있어요.':''}</div>
      {historyError&&<p className="cute-save-error" role="alert">{historyError}{cloud.connection==='error'&&<button className="cute-cloud-retry" onClick={()=>void cloud.refresh()}>다시 연결</button>}</p>}
      {storageWarning&&<p className="cute-save-error" role="alert">브라우저에 체크 기록을 저장하지 못했어요.</p>}
      </div>
    </section>

    {personalRequest&&<PersonalEditor key={`${personalRequest.nonce}:${personal.identityVersion}`} store={personal} request={personalRequest} onClose={() => setPersonalRequest(null)} onPin={pinPersonal}/>}
    <FolderDialog dialogRef={evidenceDialog} id="cute-evidence-title" title="자료와 근거" tab="참고 자료" icon="clip" closeLabel="근거 팝업 닫기" onClose={()=>restoreDialogFocus(evidenceButton)} onBackdrop={backdropClick} className="folder-evidence">
      <div className="folder-scroll">
      {groups.map(group=><section className="folder-evidence-detail" key={group.id}>
        <p className="folder-topic"><span aria-hidden="true"/>{topics[topic]} · {group.title}</p>
        <div className="folder-source"><FolderIcon name="book"/><div><h3>{group.sourceTitle||'참고 자료'}</h3><p>{group.sourceEvidence||'이 체크리스트에 연결된 원문 자료를 확인해 보세요.'}</p></div></div>
        {group.sourceUrl?<><h4 className="folder-pages-heading">관련 페이지</h4><div className="folder-source-links">
          {group.sourcePages?.map(page=><a className="folder-page-link" key={page} href={`${group.sourceUrl!.split('#')[0]}#page=${page}`} target="_blank" rel="noreferrer"><FolderIcon name="document"/><span>{page}쪽</span><FolderIcon name="arrow"/></a>)}
          <a className="folder-full-pdf" href={group.sourceUrl.split('#')[0]} target="_blank" rel="noreferrer">전체 PDF 열기<FolderIcon name="arrow"/></a>
        </div></>:<p className="folder-empty">연결된 참고 자료가 없어요.</p>}
      </section>)}
      </div>
    </FolderDialog>
    <FolderDialog dialogRef={historyDialog} id="cute-history-title" title="나의 체크리스트" tab="내 기록" icon="document" closeLabel="기록 팝업 닫기" onClose={()=>restoreDialogFocus(historyButton)} onBackdrop={backdropClick} className="folder-history">
      <p className="folder-storage-notice">저장한 목록과 완료 기록을 여기에서 다시 볼 수 있어요. 이 브라우저의 익명 로그인 정보가 지워지거나 기기를 바꾸면 기존 기록을 다시 열 수 없어요.</p>
      <div className="folder-history-tabs" role="tablist" aria-label="저장한 목록 종류">
        <button id="history-tab-personal" role="tab" aria-selected={historyTab==='personal'} aria-controls="history-panel-personal" tabIndex={historyTab==='personal'?0:-1} onClick={()=>setHistoryTab('personal')} onKeyDown={historyTabKeys}>직접 만든 목록 <span>{personal.entries.length}</span></button>
        <button id="history-tab-completed" role="tab" aria-selected={historyTab==='completed'} aria-controls="history-panel-completed" tabIndex={historyTab==='completed'?0:-1} onClick={()=>setHistoryTab('completed')} onKeyDown={historyTabKeys}>완료한 기본 목록 <span>{history.length}</span></button>
      </div>
      <div className="folder-scroll folder-history-scroll">
      <div id="history-panel-personal" role="tabpanel" aria-labelledby="history-tab-personal" hidden={historyTab!=='personal'}><PersonalHistory store={personal} open={openPersonal}/></div>
      <div id="history-panel-completed" role="tabpanel" aria-labelledby="history-tab-completed" hidden={historyTab!=='completed'}>
      {cloud.connection==='loading'&&<p role="status">서버에서 완료 기록을 가져오는 중이에요.</p>}
      {cloud.legacyCount>0&&<section className="cute-legacy-import" aria-label="기존 브라우저 기록 이전"><p>이 브라우저에 남아 있는 기존 기록 {cloud.legacyCount}개를 현재 사용자에게 이전할 수 있어요. 원본은 그대로 유지해요.</p><button disabled={cloud.busy||cloud.connection!=='ready'} onClick={()=>void cloud.migrate()}>기존 기록 서버로 이전</button></section>}
      {cloud.legacyError&&<p className="cute-save-error" role="alert">{cloud.legacyError}</p>}
      {cloud.migrationMessage&&<p className="cute-history-notice" role="status">{cloud.migrationMessage}</p>}
      {deletedRecords.length>0&&<div className="cute-history-notice" role="status"><span>완료 기록 {deletedRecords.length}개를 삭제했어요.</span><button ref={undoButton} disabled={cloud.busy||cloud.connection!=='ready'} onClick={undoDeletion}>실행 취소</button></div>}
      {!history.length&&cloud.connection==='ready'&&<p className="folder-empty">아직 완료한 기본 목록이 없어요.</p>}
      {historyError&&<p className="cute-save-error" role="alert">{historyError}{cloud.connection==='error'&&<button className="cute-cloud-retry" onClick={()=>void cloud.refresh()}>다시 연결</button>}</p>}
      {history.map(entry=>{const total=entry.groups.reduce((sum,group)=>sum+group.items.length,0);return <article className="cute-history-entry folder-completed-entry" data-record-id={entry.id} key={entry.id}>
        <HistoryCard title={entry.groups.map(group=>group.title||entry.category).join(' · ')} done={total} total={total} pinned={deskNotes.some(note=>note.kind==='completed'&&(note.recordId===entry.id||note.id===`completed:${entry.id}`))} placementKnown={deskPlacementKnown} expanded={expandedCompleted===entry.id} onClick={()=>setExpandedCompleted(expandedCompleted===entry.id?null:entry.id)}/>
        {expandedCompleted===entry.id&&<div className="folder-completed-detail"><header><h3>{entry.category}</h3><time dateTime={entry.completedAt}>{completionDate.format(new Date(entry.completedAt))}</time></header>
        {entry.groups.map(group=><section key={group.id}><h4>{group.title}</h4><ul>{group.items.map(item=><li key={item.key}><span aria-hidden="true">✓</span>{item.text}</li>)}</ul>
          {group.sourceUrl&&<a href={group.sourcePages?.length?`${group.sourceUrl}#page=${group.sourcePages[0]}`:group.sourceUrl} target="_blank" rel="noreferrer">{group.sourceTitle||'참고 자료'} ↗</a>}
        </section>)}
        <div className="cute-record-actions"><button className="cute-pin-record" onClick={()=>pinToDesk(entry)}><ChecklistIcon name="pin"/>이 기록 붙여두기</button><button className="cute-delete-record" disabled={cloud.busy||cloud.connection!=='ready'} onClick={()=>deleteRecord(entry.id)} aria-label={`${entry.groups[0]?.title||entry.category} 완료 기록 삭제`}><ChecklistIcon name="trash"/>삭제</button></div>
        </div>}
      </article>;})}
      </div>
      </div>
      <p className="folder-desk-notice"><ChecklistIcon name="pin"/><span>직접 만든 목록의 책상 배치는 자동으로 저장돼요. 기본 목록의 책상 배치는 이 브라우저에 저장돼요.</span></p>
    </FolderDialog>
  </main>;
}
