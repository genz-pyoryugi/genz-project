import type { ReactNode, RefObject } from 'react';
import './folder-dialog.css';

export function FolderIcon({ name }: { name: 'clip'|'document'|'book'|'arrow' }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name==='clip'&&<path d="m12 19 9-13c4-5 10 0 6 5L15 27C9 34 0 27 5 20L17 4c3-4 8 0 5 4L10 24c-1 2-4 0-3-2l10-14"/>}
    {name==='document'&&<><path d="M8 3h12l7 8v16q0 3-3 3H8q-3 0-3-3V6q0-3 3-3Z"/><path d="M20 3v8h7M11 17h10M11 23h10"/></>}
    {name==='book'&&<><path d="M16 7C11 3 6 3 2 5v23c5-2 9-2 14 0 5-2 9-2 14 0V5c-4-2-9-2-14 2ZM16 7v21"/></>}
    {name==='arrow'&&<path d="M8 24 25 7M11 7h14v14"/>}
  </svg>;
}

export function FolderDialog({ dialogRef, id, title, tab, icon, closeLabel, onClose, onBackdrop, children, className='' }: {
  dialogRef: RefObject<HTMLDialogElement|null>; id: string; title: string; tab: string; icon: 'clip'|'document'; closeLabel: string;
  onClose: () => void; onBackdrop: (event: React.MouseEvent<HTMLDialogElement>) => void; children: ReactNode; className?: string;
}) {
  return <dialog ref={dialogRef} className={`cute-dialog folder-dialog ${className}`} aria-labelledby={id} onClose={onClose} onClick={onBackdrop} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}>
    <div className="folder-tab"><svg className="folder-tab-shape" viewBox="0 0 250 58" preserveAspectRatio="none" aria-hidden="true"><path d="M1 57V26Q1 13 16 13h8L37 5Q40 2 49 2h133q11 0 17 11l18 30q8 14 32 14" fill="#c4e7fc" stroke="#153552" strokeWidth="2.5"/></svg><span><FolderIcon name={icon}/>{tab}</span></div>
    <header className="folder-heading"><h2 id={id}>{title}</h2><button type="button" className="folder-close" onClick={()=>dialogRef.current?.close()} aria-label={closeLabel} autoFocus><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg></button></header>
    {children}
  </dialog>;
}

export function HistoryCard({ title, done, total, pinned, placementKnown=true, onClick, className='', expanded }: {
  title: string; done: number; total: number; pinned: boolean; placementKnown?: boolean; onClick: () => void; className?: string; expanded?: boolean;
}) {
  return <button type="button" className={`folder-record-card ${className}`} onClick={onClick} aria-expanded={expanded}>
    <FolderIcon name="document"/>
    <span className="folder-card-content"><span className="folder-card-heading"><strong>{title}</strong><span className={`folder-placement${pinned?' is-pinned':''}`}>{!placementKnown?'배치 확인 필요':pinned?'책상에 붙임':'보관 중'}</span></span>
      <span className="folder-card-count">{done} / {total} 완료</span>
      <span className="folder-card-progress" role="progressbar" aria-label={`${title} 완료율`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={total?Math.round(done/total*100):0}><span style={{width:`${total?done/total*100:0}%`}}/></span>
    </span><span className="folder-card-chevron" aria-hidden="true">›</span>
    <span className="folder-card-hint">목록을 눌러 내용을 확인하세요</span>
  </button>;
}
