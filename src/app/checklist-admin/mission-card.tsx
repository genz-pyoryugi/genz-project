'use client';
import { useState } from 'react';
import styles from './view.module.css';
export default function MissionCard({ title, description, items, category }: { title: string; description?: string; items: string[]; category: string }) {
  const [checked, setChecked] = useState<number[]>([]);
  const count = checked.length;
  const complete = count === items.length && items.length > 0;
  return <div className={`${styles.missionCard} ${complete ? styles.allDone : ''}`}>
    <div className={styles.missionTop}><span className={styles.tag}>{category}</span><span className={styles.level}>TODAY’S MISSION</span></div>
    <h3>{title}</h3>{description && <p className={styles.missionDescription}>{description}</p>}
    <div className={styles.progressHeading}><span>{complete ? '오늘의 미션, 클리어!' : count ? '좋아요, 하나씩 해봐요.' : '작은 행동부터 시작해요.'}</span><strong>{count} / {items.length}</strong></div>
    <div className={styles.progressTrack} role="progressbar" aria-label="실천 미션 완료" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={count}><div style={{width:`${items.length ? count/items.length*100 : 0}%`}} /></div>
    <ul className={styles.missions}>{items.map((item,index)=><li key={index} className={checked.includes(index) ? styles.done : ''}>
      <label><input type="checkbox" checked={checked.includes(index)} onChange={e=>setChecked(prev=>e.target.checked?[...prev,index]:prev.filter(n=>n!==index))}/><span className={styles.missionNumber}>{String(index+1).padStart(2,'0')}</span><span>{item}</span></label>
    </li>)}</ul>
    <p className={styles.cardFoot}>{complete ? '한 걸음 더 익숙해진 회사생활. 잘했어요!' : '완벽하지 않아도 괜찮아요. 오늘 하나씩 체크해요.'}</p>
  </div>;
}
