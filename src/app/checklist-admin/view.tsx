'use client';
import { useEffect, useState } from 'react';
import type { ChecklistDraft, Source } from '@/lib/checklist-core';
import styles from './view.module.css';
import MissionCard from './mission-card';
type Saved = { id: number; category: string; title: string; item1: string; item2: string; item3: string; item4: string; item5: string; source_url: string };
type Data = { categories: { id: number; name: string; description: string }[]; sources: Source[]; checklists: Saved[]; configured: { ai: boolean; save: boolean } };
type Generated = { draft: ChecklistDraft; source: Source; pageCount: number; range: { start: number; end: number } };
export default function ChecklistAdmin({ token }: { token: string }) {
  const [data,setData] = useState<Data | null>(null);
  const [category,setCategory] = useState('');
  const [id,setId] = useState('');
  const [start,setStart] = useState(1);
  const [end,setEnd] = useState(12);
  const [generated,setGenerated] = useState<Generated | null>(null);
  const [reviewed,setReviewed] = useState(false);
  const [busy,setBusy] = useState('');
  const [message,setMessage] = useState('');
  async function api(path: string, body?: unknown) {
    const response = await fetch(`/api/checklist-admin${path}`, {
      method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { 'x-checklist-token':token, ...(body ? { 'Content-Type':'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '요청에 실패했어요.');
    return result;
  }
  useEffect(()=>{
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/checklist-admin', { cache:'no-store', headers:{ 'x-checklist-token':token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) { setData(result); setCategory(result.categories[0]?.name || ''); }
      } catch (error) { if (active) setMessage(error instanceof Error ? error.message : '자료 조회 실패'); }
    };
    void load();
    return ()=>{ active=false; };
  },[token]);
  const pdfs = data?.sources.filter(s=>s.category===category && /\.pdf$/i.test(s.url)) || [];
  const source = pdfs.find(s=>String(s.id)===id) || pdfs[0];
  function reset() { setGenerated(null); setReviewed(false); setMessage(''); }
  function edit(draft: ChecklistDraft) { if (generated) setGenerated({ ...generated,draft }); setReviewed(false); }
  async function generate() {
    if (!source || busy) return;
    setBusy('generate'); reset();
    try { setGenerated(await api('/generate',{ sourceId:source.id,start,end })); setMessage('미션 5개가 도착했어요! 원문을 확인하고 문구를 다듬어 보세요.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '생성 실패'); }
    finally { setBusy(''); }
  }
  async function save() {
    if (!generated || !reviewed || busy) return;
    setBusy('save'); setMessage('');
    let saved = false;
    try {
      const result = await api('/save',{ sourceId:generated.source.id,...generated.range,draft:generated.draft,reviewed });
      saved = true;
      setData(await api(''));
      setMessage(result.updated ? '기존 자동 생성 체크리스트를 수정해 저장했어요.' : '체크리스트를 저장했어요. 아래 목록에서도 확인할 수 있어요.');
    } catch (error) { setMessage(saved ? '저장은 완료됐지만 목록을 갱신하지 못했어요. 새로고침해 주세요.' : error instanceof Error ? error.message : '저장 실패'); }
    finally { setBusy(''); }
  }
  return <main className={styles.page}>
    <nav className={styles.nav}><span className={styles.brand}><span className={styles.brandMark}>Z</span>젠지표류기</span><span className={styles.navLabel}>나의 회사생활 연습장</span></nav>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>작은 실천으로, 한 단계 더</p><h1>회사생활 생존 미션<span>오늘은 딱 5개만!</span></h1><p>두꺼운 매뉴얼을 가벼운 실천으로.<br/>읽고 끝내지 말고, 하나씩 체크해 봐요.</p><span className={styles.heroBadge}>PDF 한 편 → 오늘의 미션 5개</span></div>
      <svg className={styles.heroArt} viewBox="0 0 300 240" role="img" aria-label="작은 섬에 도착한 업무 가방과 깃발 일러스트">
        <circle cx="152" cy="111" r="91" fill="#e4ddff"/><circle cx="239" cy="48" r="10" fill="#ffe38c"/>
        <path d="M24 193 Q57 177 88 193 T152 193 T217 193 T278 193 M43 213 Q76 197 108 213 T173 213 T238 213" fill="none" stroke="#b9b5f1" strokeWidth="5" strokeLinecap="round"/>
        <ellipse cx="152" cy="173" rx="86" ry="25" fill="#d7b77a"/><ellipse cx="152" cy="164" rx="86" ry="24" fill="#ffdf94"/>
        <path d="M204 154V52" stroke="#6852a7" strokeWidth="5" strokeLinecap="round"/><path d="M206 53L258 66L206 84Z" fill="#ff876f"/>
        <rect x="89" y="101" width="91" height="61" rx="12" fill="#6954bd"/><path d="M117 101V90Q135 79 151 90V101" fill="none" stroke="#45347e" strokeWidth="7"/>
        <path d="M91 120Q135 138 178 120" fill="none" stroke="#a393df" strokeWidth="3"/><rect x="127" y="120" width="15" height="18" rx="4" fill="#ffe6a0"/>
        <path d="M69 154L64 123M65 137Q43 132 48 115Q66 117 65 137M65 140Q84 133 81 120Q65 121 65 140" fill="#7da48c" stroke="#5c8970" strokeWidth="3"/>
      </svg>
    </header>
    <p role="status" aria-live="polite" className={styles.message}>{message || (!data ? '등록한 자료를 불러오는 중이에요…' : '')}</p>
    {data && <>
      {(!data.configured.ai || !data.configured.save) && <aside className={styles.notice}>연결 설정이 더 필요해요. {!data.configured.ai && 'AI 생성용 OPENAI_API_KEY가 없어요. '}{!data.configured.save && '저장용 SUPABASE_SECRET_KEY가 없어요. '}프로젝트의 .env.local에 설정한 뒤 서버를 다시 시작해 주세요. 키는 채팅에 보내지 마세요.</aside>}
      <section className={styles.card}>
        <div className={styles.sectionHeading}><span className={styles.step}>01</span><div><h2>오늘의 미션 재료</h2><p>배우고 싶은 주제와 PDF를 골라주세요.</p></div></div>
        <div className={styles.fields}><label>목차<select value={category} disabled={!!busy} onChange={e=>{setCategory(e.target.value);setId('');reset();}}>{data.categories.map(c=><option key={c.id}>{c.name}</option>)}</select></label>
          <label>PDF 자료<select value={source?.id || ''} disabled={!!busy} onChange={e=>{setId(e.target.value);reset();}}>{pdfs.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label></div>
        {source ? <a href={source.url} target="_blank" rel="noreferrer">원본 PDF 열기 ↗</a> : <p>이 목차에 등록된 PDF가 없어요.</p>}
        <div className={styles.range}><label>시작 페이지<input type="number" min={1} value={start} disabled={!!busy} onChange={e=>{setStart(Number(e.target.value));reset();}} /></label><label>끝 페이지<input type="number" min={start} max={start+19} value={end} disabled={!!busy} onChange={e=>{setEnd(Number(e.target.value));reset();}} /></label></div>
        <p className={styles.hint}>표지·목차를 지나 본문부터! PDF 뷰어 기준으로 최대 20쪽을 선택해 주세요.</p>
        <p className={styles.privacy}>선택한 페이지는 OpenAI로 전송해 분석해요.</p>
        <button disabled={!!busy || !source || !data.configured.ai || !Number.isInteger(start) || !Number.isInteger(end) || start<1 || end<start || end-start>19} onClick={generate}>{busy==='generate' ? '오늘의 미션을 만드는 중…' : '오늘의 미션 5개 만들기 →'}</button>
      </section>
      {generated && <section className={styles.card}>
        <div className={styles.sectionHeading}><span className={styles.step}>02</span><div><h2>오늘의 생존 미션, 도착!</h2><p>학습자에게 보여줄 모습이에요. 체크도 해볼 수 있어요.</p></div></div>
        <MissionCard key={generated.draft.items.map(i=>i.text).join('|')} title={generated.draft.title} description={generated.draft.description} items={generated.draft.items.map(i=>i.text)} category={generated.source.category}/>
        <details className={styles.details}><summary>원문 근거 확인하기 <span>PDF {generated.range.start}~{generated.range.end}쪽</span></summary>
          <p className={styles.hint}>{generated.source.title} · 전체 {generated.pageCount}쪽</p>
          {generated.draft.items.map((item,i)=><div className={styles.evidence} key={i}><strong>미션 {i+1} · {item.page}쪽</strong><p>{item.evidence}</p><a href={`${generated.source.url}#page=${item.page}`} target="_blank" rel="noreferrer">해당 페이지 보기 ↗</a></div>)}
        </details>
        <details className={styles.details}><summary>내 말투로 문구 다듬기</summary>
        <label>제목<input value={generated.draft.title} disabled={!!busy} maxLength={120} onChange={e=>edit({...generated.draft,title:e.target.value})} /></label>
        <label>설명<textarea value={generated.draft.description} disabled={!!busy} maxLength={1200} onChange={e=>edit({...generated.draft,description:e.target.value})}/></label>
        {generated.draft.items.map((item,i)=><div className={styles.item} key={i}>
          <label>확인 항목 {i+1}<input value={item.text} disabled={!!busy} maxLength={250} onChange={e=>edit({...generated.draft,items:generated.draft.items.map((it,n)=>n===i?{...it,text:e.target.value}:it)})}/></label>
        </div>)}
        </details>
        <label className={styles.review}><input type="checkbox" checked={reviewed} disabled={!!busy} onChange={e=>setReviewed(e.target.checked)} />원문 근거와 미션 내용을 확인했어요.</label>
        <button disabled={!!busy || !reviewed || !data.configured.save} onClick={save}>{busy==='save'?'저장 중…':'확인한 미션 저장하기'}</button>
      </section>}
      <section className={styles.card}><div className={styles.sectionHeading}><span className={styles.step}>03</span><div><h2>차곡차곡, 미션 보관함</h2><p>{category}</p></div></div>
        {data.checklists.filter(c=>c.category===category).map(c=><article className={styles.saved} key={c.id}><MissionCard title={c.title} category={c.category} items={[c.item1,c.item2,c.item3,c.item4,c.item5].filter(Boolean)}/><a className={styles.sourceLink} href={c.source_url} target="_blank" rel="noreferrer">원본 자료 보기 ↗</a></article>)}
        {!data.checklists.some(c=>c.category===category) && <div className={styles.empty}><span>✦</span><p>아직은 빈 보관함이에요.</p><small>첫 미션을 만들어 채워볼까요?</small></div>}
      </section>
    </>}
    <footer className={styles.footer}>젠지표류기 · 회사라는 섬에, 조금씩 익숙해지는 중.</footer>
  </main>;
}
