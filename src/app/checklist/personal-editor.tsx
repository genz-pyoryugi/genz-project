'use client';
import { useEffect, useRef, useState } from 'react';
import type { usePersonalChecklists } from './use-personal-checklists';
import { validatePersonal, type PersonalChecklist, type PersonalItem } from './personal-store';
import { ChecklistIcon } from './icons';
import { HistoryCard } from './folder-dialog';
type Store = ReturnType<typeof usePersonalChecklists>;
export type PersonalRequest = { id: string | null; nonce: number };
export function PersonalHistory({ store, open }: { store: Store; open: (id: string) => void }) {
  return <section className="personal-history" aria-label="내 체크리스트 목록">
    {store.connection === 'loading' && <p role="status">내 목록을 불러오는 중이에요.</p>}
    {store.error && <p role="alert">{store.error} <button onClick={() => void store.refresh()}>다시 불러오기</button></p>}
    {store.connection === 'ready' && !store.entries.length && <p className="folder-empty">직접 만든 목록이 없어요. ‘만들기’로 첫 목록을 추가해 보세요.</p>}
    {store.entries.map(entry => <HistoryCard className="personal-history-entry" key={entry.id} title={entry.title} done={entry.items.filter(item=>item.checked).length} total={entry.items.length} pinned={entry.pinned} onClick={()=>open(entry.id)}/>)}
  </section>;
}
export function PersonalEditor({ store, request, onClose, onPin }: { store: Store; request: PersonalRequest; onClose: () => void; onPin: (entry: PersonalChecklist) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const discardDialog = useRef<HTMLDialogElement>(null);
  const exitAction = useRef<'close'|'cancel'|'host'>('close');
  const focusItem = useRef<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(request.id);
  const [editing, setEditing] = useState(request.id === null);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<PersonalItem[]>(() => [{ id: crypto.randomUUID(), text: '', checked: false }]);
  const [base, setBase] = useState<PersonalChecklist | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pendingCheck, setPendingCheck] = useState<{id:string;checked:boolean}|null>(null);
  const entry = store.entries.find(record => record.id === activeId);
  const dirty = editing && (base ? title !== base.title || JSON.stringify(items) !== JSON.stringify(base.items)
    : title !== '' || items.length !== 1 || !!items[0]?.text || !!items[0]?.checked);
  useEffect(() => {
    dialog.current?.showModal();
    if (window.parent !== window) window.parent.postMessage({type:'genz-checklist:editor-open',open:true},location.origin);
    return () => { if (window.parent !== window) window.parent.postMessage({type:'genz-checklist:editor-open',open:false},location.origin); };
  }, []);
  useEffect(() => {
    if (editing) titleInput.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (!focusItem.current) return;
    if (focusItem.current === 'add') addButton.current?.focus();
    else dialog.current?.querySelector<HTMLInputElement>(`[data-item-id="${focusItem.current}"]`)?.focus();
    focusItem.current = null;
  }, [items]);
  function close() { dialog.current?.close(); onClose(); }
  function finishExit(action: 'close'|'cancel'|'host') {
    if (action === 'cancel' && activeId) { setEditing(false); setBase(null); setError(''); setMessage(''); }
    else {
      close();
      if (action === 'host' && window.parent !== window) window.parent.postMessage({type:'genz-checklist:close-confirmed'},location.origin);
    }
  }
  function requestExit(action: 'close'|'cancel'|'host') {
    if (store.busy) return;
    if (dirty) { exitAction.current = action; discardDialog.current?.showModal(); }
    else finishExit(action);
  }
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin === location.origin && event.source === window.parent && event.data?.type === 'genz-checklist:request-close') requestExit('host');
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  });
  function addItem() {
    const id = crypto.randomUUID(); focusItem.current = id;
    setItems([...items, {id, text:'', checked:false}]);
  }
  function removeItem(id: string, index: number) {
    focusItem.current = items[index + 1]?.id || items[index - 1]?.id || 'add';
    setItems(items.filter(row => row.id !== id));
  }
  function edit() {
    if (!entry) return;
    setTitle(entry.title); setItems(entry.items.map(item => ({ ...item }))); setBase(entry); setEditing(true); setMessage(''); setError('');
  }
  async function save() {
    setError(''); setMessage('');
    try { validatePersonal(title, items); } catch (cause) { setError((cause as Error).message); return; }
    const clean = items.map(item => ({ ...item, text: item.text.trim() }));
    const saved = base ? await store.update(base, { title: title.trim(), items: clean }) : await store.create(title, clean);
    if (saved) { setActiveId(saved.id); setEditing(false); setBase(null); setMessage('저장했어요.'); }
  }
  async function toggle(id: string) {
    if (!entry) return;
    setMessage('');
    const checked = !entry.items.find(item => item.id === id)?.checked;
    setPendingCheck({id,checked});
    if (await store.update(entry, { items: entry.items.map(item => item.id === id ? { ...item, checked } : item) })) setMessage('체크 상태를 저장했어요.');
    setPendingCheck(null);
  }
  async function pin() {
    if (!entry) return;
    setMessage('');
    const saved = entry.pinned ? entry : await store.update(entry, { pinned: true });
    if (saved) { close(); onPin(saved); }
  }
  const feedback = <div className="personal-feedback">
    {store.connection === 'loading' && <p role="status">저장소에 연결하고 있어요.</p>}
    {(error || store.error) && <p className="cute-save-error" role="alert">{error || store.error} <button type="button" onClick={() => void store.refresh()} disabled={store.busy}>다시 불러오기</button></p>}
    {message && <p role="status">{message}</p>}
  </div>;
  return <dialog className={`cute-dialog personal-editor${editing?' personal-editor--editing':''}`} ref={dialog} aria-labelledby="personal-title" onClose={onClose} onCancel={event => { event.preventDefault(); requestExit('close'); }} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
    <svg className="personal-clip" viewBox="0 0 150 100" aria-hidden="true" focusable="false"><rect x="8" y="62" width="134" height="32" rx="9" fill="#153552"/><path d="M21 80V56q0-8 8-8h18V29a28 28 0 0 1 56 0v19h18q8 0 8 8v24Z" fill="#a8dcf7" stroke="#153552" strokeWidth="3.5"/><path d="M27 74V57q0-3 4-3h21V30a23 23 0 0 1 46 0v24h23" fill="none" stroke="#e6f7ff" strokeWidth="2.5"/><circle cx="75" cy="29" r="10" fill="#627d91" stroke="#153552" strokeWidth="3.5"/></svg>
    <div className="personal-paper">
    <header className="personal-heading"><h2 id="personal-title">{editing ? '나만의 체크리스트' : '내 체크리스트'}</h2><button type="button" className="personal-close" disabled={store.busy} onClick={() => requestExit('close')} aria-label="내 체크리스트 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg></button></header>
    {editing ? <form className="personal-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label className="personal-title-label">목록 제목<input ref={titleInput} value={title} maxLength={120} onChange={event => setTitle(event.target.value)} placeholder="목록의 제목을 입력해 주세요" required disabled={store.busy}/></label>
      <h3 className="personal-item-count" aria-live="polite">할 일 {items.length}개</h3>
      <div className="personal-items-scroll" aria-label="편집할 항목 목록">
      <ol className="personal-edit-items">{items.map((item, index) => <li key={item.id}>
        <input type="checkbox" aria-label={`${index + 1}번 항목 완료`} checked={item.checked} onChange={() => setItems(items.map(row => row.id === item.id ? { ...row, checked: !row.checked } : row))} disabled={store.busy}/>
        <input data-item-id={item.id} aria-label={`${index + 1}번 항목`} value={item.text} maxLength={500} required placeholder="할 일을 입력해 주세요" onChange={event => setItems(items.map(row => row.id === item.id ? { ...row, text: event.target.value } : row))} disabled={store.busy}/>
        <button className="personal-item-delete" type="button" aria-label={`${index + 1}번 항목 삭제`} onClick={() => removeItem(item.id, index)} disabled={store.busy}><ChecklistIcon name="trash"/></button>
      </li>)}</ol>
      <button ref={addButton} type="button" className="personal-add-item" disabled={store.busy || items.length >= 100} onClick={addItem}>＋ 항목 추가</button>
      </div>
      <footer className="personal-form-footer">
        {feedback}
        <p className="personal-hint">저장한 목록은 내 기록에서 볼 수 있어요.</p>
        <div className="personal-form-actions"><button type="button" className="personal-cancel" disabled={store.busy} onClick={() => requestExit('cancel')}>취소</button><button type="submit" className="personal-primary" disabled={store.busy || store.connection !== 'ready'}>{store.busy ? '저장 중…' : '저장하기'}</button></div>
      </footer>
    </form> : <div className="personal-detail-scroll">{entry ? <>
      <h3 className="personal-detail-title">{entry.title}</h3><p>{entry.items.filter(item => item.checked).length} / {entry.items.length} 체크</p>
      <ul className="personal-detail-items">{entry.items.map(item => <li key={item.id}><label><input type="checkbox" checked={pendingCheck?.id===item.id?pendingCheck.checked:item.checked} onChange={() => void toggle(item.id)} disabled={store.busy || store.connection !== 'ready'}/><span className={item.checked ? 'personal-done' : ''}>{item.text}</span></label></li>)}</ul>
      <div className="personal-actions"><button disabled={store.busy} onClick={edit}>편집</button><button className="personal-primary" disabled={store.busy || store.connection !== 'ready'} onClick={() => void pin()}>{entry.pinned ? '책상에서 보기' : '책상에 붙이기'}</button>
        {entry.pinned && <button disabled={store.busy} onClick={async () => { setMessage(''); if (await store.update(entry, { pinned: false })) setMessage('책상에서 뗐어요. 목록은 내 기록에 보관돼요.'); }}>책상에서 떼기</button>}
      </div>
      {deleting ? <div className="personal-delete-confirm"><p>체크리스트를 삭제할까요? 책상에서도 함께 사라져요.</p><button disabled={store.busy} onClick={async () => { if (await store.update(entry, { deleted_at: new Date().toISOString(), pinned: false })) close(); }}>체크리스트 삭제 확인</button><button disabled={store.busy} onClick={() => setDeleting(false)}>취소</button></div> : <button className="personal-delete" disabled={store.busy} onClick={() => setDeleting(true)}>체크리스트 삭제</button>}
    </> : <p>목록을 찾을 수 없어요. 내 기록에서 다시 확인해 주세요.</p>}{feedback}</div>}
    </div>
    <dialog className="personal-discard-dialog" ref={discardDialog} aria-labelledby="personal-discard-title" onCancel={event => event.stopPropagation()} onClose={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
      <h2 id="personal-discard-title">변경 내용을 버릴까요?</h2><p>저장하지 않은 내용은 사라져요.</p>
      <div className="personal-form-actions"><button type="button" onClick={() => discardDialog.current?.close()}>계속 편집</button><button type="button" className="personal-primary" onClick={() => { discardDialog.current?.close(); finishExit(exitAction.current); }}>변경 버리기</button></div>
    </dialog>
  </dialog>;
}
