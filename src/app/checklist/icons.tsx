type IconName = 'compass' | 'clipboard' | 'question' | 'highfive' | 'badge' | 'home' | 'pencils' | 'history' | 'info' | 'pin' | 'trash';
export const topicIcons: IconName[] = ['compass','clipboard','question','highfive','badge','home','pencils'];
export function ChecklistIcon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name==='trash'&&<><path d="M12 15h40M24 15V7h16v8M18 15l3 41h22l3-41M28 26v20M36 26v20"/></>}
    {name==='pin'&&<><path d="m24 9 25 25M28 13 15 29l-6 1 25 25 1-7 15-13M21 43 7 57M18 6l6-4 31 31-5 6"/><path d="m28 13 21 21-14 14-20-19 13-16Z" fill="#addff2"/></>}
    {name==='compass'&&<><circle cx="29" cy="36" r="21" fill="#dff3fb"/><path d="m19 47 6-17 16-6-6 16-16 7Z" fill="#fffdf1"/><path d="m25 30 10 10-16 7 6-17Z" fill="#8ccbe6"/><path d="M29 5v5M46 9l-3 5M56 21l-6 2"/></>}
    {name==='clipboard'&&<><path d="M23 13H14q-4 0-4 5v36q0 4 5 4h34q5 0 5-5V18q0-5-5-5h-9" fill="#f4fbff"/><path d="M24 9h16v12H24z" fill="#b8e0f0"/><path d="M28 9V6h8v3M23 37l7 7 13-17"/></>}
    {name==='question'&&<><path d="M12 46C-2 30 10 10 32 9c18-1 29 9 27 23-1 14-16 23-34 19L12 59l3-12"/><path d="M25 25c0-11 18-11 16 0-1 6-9 5-9 12"/><circle cx="32" cy="44" r="1.8" fill="currentColor" stroke="none"/></>}
    {name==='highfive'&&<><g fill="#f3fbff" strokeWidth="2.5"><path d="m6 58 4-11c-4-5-6-13-3-15 2-1 4 2 6 5l-3-12c-1-4 3-6 5-2l4 10-3-16c-1-4 4-5 5-1l4 16-1-14c0-4 4-5 5-1l2 19c1 8-5 13-8 17l-1 5"/><path d="m58 58-4-11c4-5 6-13 3-15-2-1-4 2-6 5l3-12c1-4-3-6-5-2l-4 10 3-16c1-4-4-5-5-1l-4 16 1-14c0-4-4-5-5-1l-2 19c-1 8 5 13 8 17l1 5"/></g><path d="M32 2v6M19 4l3 6M45 4l-3 6" stroke="#f68a35"/></>}
    {name==='badge'&&<><rect x="12" y="15" width="40" height="44" rx="5"/><path d="M28 4h8v18h-8z" fill="#addff2"/><circle cx="32" cy="33" r="6"/><path d="M21 50c0-11 22-11 22 0H21Z"/></>}
    {name==='home'&&<><path d="m5 28 22-20 22 20-8-4v29H12V24l-7 4Z" fill="#dff3fb"/><path d="M12 25v28H5M42 18v-8h7v14"/><path d="M29 32h28l-3 21H27l2-21Z" fill="#9fd9f1"/><path d="m27 53-5 6h38l-6-6M19 53h-7"/></>}
    {name==='pencils'&&<><path d="m14 29-4-17 4-6 5 5 4 18M28 29V7l4-5 4 5v22M40 29l7-19q2-6 7-3l3 2-7 20M12 29h42l-5 29H17l-5-29Z"/><path d="m12 15 7-2M28 11h8M46 15l8 3"/></>}
    {name==='history'&&<><path d="M18 7h29q5 0 5 5v43q0 4-5 4H18q-5 0-5-4V12q0-5 5-5Z"/><path d="M23 20h19M23 30h19M23 40h19M23 50h10"/></>}
    {name==='info'&&<><circle cx="32" cy="32" r="25"/><path d="M32 29v17"/><circle cx="32" cy="19" r="2" fill="currentColor" stroke="none"/></>}
  </svg>;
}
