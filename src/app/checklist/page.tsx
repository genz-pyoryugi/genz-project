'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { groupsFor, readChecks, Row, storageKey, topics, validateRows } from './model';
import './checklist.css';

export default function ChecklistPage() {
  const [topic, setTopic] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/checklists', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Connection failed'); return response.json(); })
      .then(value => { setRows(validateRows(value)); setStatus('ready'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const load = () => {
      try { setChecked(readChecks()); } catch { setStorageWarning(true); }
      setStorageReady(true);
    };
    const initial = setTimeout(load, 0);
    window.addEventListener('storage', load);
    return () => { clearTimeout(initial); window.removeEventListener('storage', load); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const groups = groupsFor(rows, topics[topic]);
  const items = groups.flatMap(group => group.items);
  const count = items.filter(item => checked[item.key]).length;
  const progress = items.length ? Math.round(count / items.length * 100) : 0;
  const complete = items.length > 0 && count === items.length;
  const toggle = (key: string) => {
    const next = { ...checked };
    if (next[key]) delete next[key]; else next[key] = true;
    setChecked(next);
    setCelebrate(false);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageWarning(false); } catch { setStorageWarning(true); }
  };
  const selectTopic = (index: number) => { setTopic(index); setCelebrate(false); scroll.current?.scrollTo({ top: 0 }); };
  const tabKeys = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = event.key === 'ArrowRight' ? (index + 1) % topics.length : event.key === 'ArrowLeft' ? (index + topics.length - 1) % topics.length : event.key === 'Home' ? 0 : event.key === 'End' ? topics.length - 1 : null;
    if (target !== null) { event.preventDefault(); selectTopic(target); document.getElementById(`checklist-tab-${target}`)?.focus(); }
  };
  return <main className="checklist-scene" lang="ko">
    <div className="office-wash" aria-hidden="true"/>
    <section className="checklist-sheet" aria-labelledby="checklist-title">
      <div className="wood-pin" aria-hidden="true"/>
      <Link className="checklist-close" href="/" aria-label="첫 화면으로 돌아가기">×</Link>
      <header className="checklist-heading"><div className="mascot-intro"><Image src="/checklist/assets/mascot.png" width={140} height={120} alt="" unoptimized/><p>하나씩 체크해 볼까요?</p></div><h1 id="checklist-title"><span>회사 생활 체크리스트</span></h1></header>
      <nav className="checklist-tabs" role="tablist" aria-label="회사 생활 주제">{topics.map((name, index) => <button key={name} id={`checklist-tab-${index}`} role="tab" aria-selected={topic === index} aria-controls="checklist-panel" tabIndex={topic === index ? 0 : -1} onClick={() => selectTopic(index)} onKeyDown={event => tabKeys(event, index)}><b>{String(index + 1).padStart(2, '0')}</b> {name}</button>)}</nav>
      <div className="checklist-progress"><div className="progress-track" role="progressbar" aria-label={`${topics[topic]} 진행률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div><p aria-live="polite"><strong>{count} / {items.length}</strong> 완료</p><div className="progress-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} className={progress >= (index + 1) * 20 ? 'earned' : ''}>★</span>)}</div></div>
      <div ref={scroll} className="checklist-scroll" id="checklist-panel" role="tabpanel" aria-labelledby={`checklist-tab-${topic}`} aria-busy={status === 'loading'} tabIndex={0}>
        {status === 'loading' && <div className="checklist-state" role="status"><span className="loading-box" aria-hidden="true"/><h2>체크리스트를 가져오고 있어요</h2><p>저장된 내용을 잠시만 기다려 주세요.</p></div>}
        {status === 'error' && <div className="checklist-state" role="alert"><span aria-hidden="true">☁</span><h2>데이터에 연결하지 못했어요</h2><p>연결 상태를 확인하고 다시 시도해 주세요.</p><button onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>다시 불러오기 ↻</button></div>}
        {status === 'ready' && !groups.length && <div className="checklist-state" role="status"><span aria-hidden="true">□</span><h2>아직 등록된 체크 항목이 없어요</h2><p>이 주제에 공개된 체크리스트가 준비되면 여기에 표시돼요.</p></div>}
        {status === 'ready' && groups.map((group, index) => <section className={`checklist-group group-${index % 3}`} key={group.id} aria-label={group.title || `체크리스트 ${index + 1}`}><header><span className="group-number">{index + 1}</span>{group.title && <h2>{group.title}</h2>}{index === 0 && <Image className="coworkers" src="/checklist/assets/coworkers.png" width={240} height={150} alt="" unoptimized/>}</header><ul>{group.items.map(item => <li key={item.key} className={checked[item.key] ? 'is-checked' : ''}><label><input type="checkbox" checked={!!checked[item.key]} disabled={!storageReady} onChange={() => toggle(item.key)}/><span className="check-square" aria-hidden="true">✓</span><span className="item-text">{item.text}</span></label></li>)}</ul></section>)}
      </div>
      <footer className="checklist-footer"><p><span aria-hidden="true">🎉</span> 작은 체크가 모이면 <em>자신감도 쑥!</em></p><button className={`finish-button ${celebrate ? 'celebrating' : ''}`} disabled={!complete || status !== 'ready' || !storageReady} onClick={() => { setCelebrate(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCelebrate(false), 4000); }}>{celebrate ? '잘했어요! ✦' : '체크 완료'}</button></footer>
      <div className="checklist-storage-note" role="status">{storageWarning ? '브라우저 저장이 제한되어 있어요. 현재 체크는 화면에 유지되지만 다시 열면 사라질 수 있어요.' : '체크 기록은 이 브라우저에만 저장돼요.'}{celebrate && ' 이 주제의 모든 항목을 완료했어요!'}</div>
    </section>
  </main>;
}
