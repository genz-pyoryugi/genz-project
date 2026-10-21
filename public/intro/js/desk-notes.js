/* Persistent, same-origin checklist notes on the office desk. */
(() => {
  const stage=document.getElementById('officeStage');
  if(!stage)return;
  const notesKey='genz-office-desk-notes-v1',checksKey='genz-checklist-page-v1',positionsKey='genz-office-desk-note-positions-v1';
  function readPositions(){
    try{
      const saved=JSON.parse(localStorage.getItem(positionsKey)||'{}');
      if(!saved||Array.isArray(saved)||typeof saved!=='object')return {};
      return Object.fromEntries(Object.entries(saved).filter(([,point])=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1));
    }catch{return {};}
  }
  let positions=readPositions(),dragging=false,refreshPending=false;
  let personalNotes=[],personalBusy=false,personalError='',pendingPin=null;
  const bridge=document.createElement('iframe');
  bridge.hidden=true;bridge.title='개인 체크리스트 저장 연결';bridge.src='/checklist/desk-sync';stage.append(bridge);
  function personalAction(note,action,extra={}){
    bridge.contentWindow?.postMessage({type:'genz-personal:action',id:note.personalId,action,...extra},location.origin);
  }
  function readAllNotes(){return [...readNotes(),...personalNotes];}
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==bridge.contentWindow||event.data?.type!=='genz-personal:state')return;
    personalBusy=event.data.busy||event.data.connection!=='ready';personalError=event.data.error||'';
    personalNotes=(event.data.entries||[]).filter(entry=>entry.pinned&&!entry.deleted_at).map(entry=>({
      id:`personal:${entry.id}`,personalId:entry.id,kind:'personal',title:entry.title,category:'내 체크리스트',
      items:entry.items.map(item=>({key:item.id,text:item.text,checked:item.checked})),position:entry.position,
    }));
    if(!event.data.busy){
      for(const id of Object.keys(positions))if(id.startsWith('personal:'))delete positions[id];
      for(const note of personalNotes)if(note.position)positions[note.id]=note.position;
    }
    render();
    if(pendingPin&&personalNotes.some(note=>note.id===pendingPin.id)){
      const pin=pendingPin;pendingPin=null;pin.ready();
    }
    attachEntryPin();
  });
  function readNotes(){
    const notes=JSON.parse(localStorage.getItem(notesKey)||'[]');
    if(!Array.isArray(notes)||!notes.every(note=>note&&typeof note.id==='string'&&
      ['checklist','completed'].includes(note.kind)&&typeof note.title==='string'&&typeof note.category==='string'&&
      Array.isArray(note.items)&&note.items.length&&note.items.every(item=>item&&typeof item.key==='string'&&typeof item.text==='string')&&
      (note.recordId===undefined||typeof note.recordId==='string')))throw Error('Invalid notes');
    return notes;
  }
  function readChecks(){
    const checks=JSON.parse(localStorage.getItem(checksKey)||'{}');
    if(!checks||Array.isArray(checks)||typeof checks!=='object')throw Error('Invalid checks');
    return checks;
  }
  function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
  const shelf=element('aside','desk-notes');shelf.hidden=true;shelf.setAttribute('aria-label','책상에 붙인 메모');
  const header=element('div','desk-notes__header');
  const toggle=element('button','desk-notes__toggle','책상 메모');toggle.type='button';toggle.setAttribute('aria-expanded','true');
  const count=element('span','desk-notes__count','0');toggle.append(count);
  const list=element('div','desk-notes__list');list.id='deskNotesList';toggle.setAttribute('aria-controls',list.id);
  const status=element('p','desk-notes__status');status.setAttribute('role','status');
  header.append(toggle);shelf.append(header,list,status);stage.append(shelf);
  toggle.addEventListener('click',()=>{list.hidden=!list.hidden;toggle.setAttribute('aria-expanded',String(!list.hidden));});

  function moveCard(card,x,y){
    card.classList.add('desk-note--floating');
    const bounds=card.getBoundingClientRect();
    card.style.left=`${Math.max(8,Math.min(x,innerWidth-bounds.width-8))}px`;
    card.style.top=`${Math.max(8,Math.min(y,innerHeight-bounds.height-8))}px`;
  }
  function restorePosition(card){
    const point=positions[card.dataset.noteId];
    if(point)moveCard(card,point.x*innerWidth,point.y*innerHeight);
  }
  function savePosition(card){
    const bounds=card.getBoundingClientRect();
    const point={x:bounds.left/innerWidth,y:bounds.top/innerHeight};
    positions={...positions,[card.dataset.noteId]:point};
    const personal=personalNotes.find(note=>note.id===card.dataset.noteId);
    if(personal){personalAction(personal,'position',{position:point});return;}
    try{const saved={...readPositions(),[card.dataset.noteId]:point};positions={...positions,...saved};localStorage.setItem(positionsKey,JSON.stringify(saved));status.textContent=personalError;}
    catch{status.textContent='메모는 옮겼지만 위치를 저장하지 못했어요.';}
  }
  function makeDraggable(card,summary){
    let pointer=null,suppressClick=false;
    summary.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      const bounds=card.getBoundingClientRect();
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY,left:bounds.left,top:bounds.top,moved:false};
      summary.setPointerCapture(event.pointerId);
    });
    summary.addEventListener('pointermove',event=>{
      if(!pointer||pointer.id!==event.pointerId)return;
      const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
      if(!pointer.moved&&Math.hypot(dx,dy)<5)return;
      pointer.moved=true;dragging=true;card.classList.add('desk-note--dragging');event.preventDefault();
      moveCard(card,pointer.left+dx,pointer.top+dy);
    });
    function endDrag(event){
      if(!pointer||pointer.id!==event.pointerId)return;
      const moved=pointer.moved;pointer=null;dragging=false;
      card.classList.remove('desk-note--dragging');
      if(summary.hasPointerCapture(event.pointerId))summary.releasePointerCapture(event.pointerId);
      if(moved){savePosition(card);suppressClick=true;setTimeout(()=>{suppressClick=false;if(refreshPending){refreshPending=false;render();}},0);}
    }
    summary.addEventListener('pointerup',endDrag);summary.addEventListener('pointercancel',endDrag);
    summary.addEventListener('lostpointercapture',endDrag);
    summary.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
    summary.addEventListener('keydown',event=>{
      const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];
      if(!delta)return;
      event.preventDefault();event.stopPropagation();
      const bounds=card.getBoundingClientRect();moveCard(card,bounds.left+delta[0],bounds.top+delta[1]);savePosition(card);
    });
    card.addEventListener('toggle',()=>{if(card.classList.contains('desk-note--floating')){const bounds=card.getBoundingClientRect();moveCard(card,bounds.left,bounds.top);}});
  }

  function render(){
    if(dragging){refreshPending=true;return;}
    const open=new Set([...list.querySelectorAll('details[open]')].map(card=>card.dataset.noteId));
    let notes,checks;
    try{notes=readAllNotes();checks=readChecks();status.textContent=personalError;}
    catch{shelf.hidden=false;status.textContent='메모를 불러오지 못했어요. 브라우저 저장 설정을 확인해 주세요.';return;}
    count.textContent=String(notes.length);shelf.hidden=notes.length===0&&!personalError;list.replaceChildren();
    for(const note of notes){
      const card=element('details','desk-note desk-note--mini');card.dataset.noteId=note.id;card.open=open.has(note.id);
      const summary=element('summary','desk-note__summary');
      summary.setAttribute('aria-description','제목을 마우스나 손가락으로 끌어 이동하세요. 키보드 방향키로도 옮길 수 있어요.');
      const kind=element('span','desk-note__kind',note.kind==='completed'?'완료한 미션':'나의 체크리스트');
      const brand=element('span','desk-note__brand','GEN Z CHECK-LIST');
      const title=element('strong','',note.title);
      if(note.kind==='personal')kind.textContent='내 체크리스트';
      const completed=note.kind==='completed'?note.items.length:note.items.filter(item=>note.kind==='personal'?item.checked:checks[item.key]===true).length;
      const progress=element('span','desk-note__progress',`${completed} / ${note.items.length} 체크`);
      progress.style.setProperty('--desk-progress',`${Math.round(completed/note.items.length*100)}%`);
      summary.append(brand,kind,title,progress);card.append(summary);
      const category=element('p','desk-note__category',note.category);card.append(category);
      const items=element('ul','desk-note__items');
      for(const item of note.items){
        const li=element('li'),label=element('label'),input=element('input');input.type='checkbox';
        input.checked=note.kind==='completed'||(note.kind==='personal'?item.checked:checks[item.key]===true);input.disabled=note.kind==='completed'||(note.kind==='personal'&&personalBusy);
        input.addEventListener('change',()=>{
          if(note.kind==='personal'){personalAction(note,'toggle',{itemId:item.key,checked:input.checked});return;}
          try{
            const next=readChecks();if(input.checked)next[item.key]=true;else delete next[item.key];
            localStorage.setItem(checksKey,JSON.stringify(next));render();
          }catch{input.checked=!input.checked;status.textContent='체크 기록을 저장하지 못했어요.';}
        });
        label.append(input,element('span','',item.text));li.append(label);items.append(li);
      }
      card.append(items);
      const actions=element('div','desk-note__actions');
      const openButton=element('button','desk-note__open',note.kind==='completed'?'완료 기록 열기':'크게 보기');openButton.type='button';
      openButton.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('genz-desk:open',{detail:{id:note.id}})));
      const remove=element('button','desk-note__remove','붙이기 해제');remove.type='button';remove.setAttribute('aria-label',`${note.title} 붙이기 해제`);
      remove.addEventListener('click',()=>{
        if(note.kind==='personal'){personalAction(note,'unpin');return;}
        try{localStorage.setItem(notesKey,JSON.stringify(readNotes().filter(saved=>saved.id!==note.id)));render();toggle.focus();}
        catch{status.textContent='메모를 떼지 못했어요. 다시 시도해 주세요.';}
      });
      if(note.kind==='personal'){
        openButton.textContent='열기 · 편집';remove.textContent='책상에서 떼기';remove.setAttribute('aria-label',`${note.title} 책상에서 떼기`);remove.disabled=personalBusy;
      }
      actions.append(openButton,remove);card.append(actions);list.append(card);makeDraggable(card,summary);restorePosition(card);
    }
  }
  window.genzDeskNotes={
    refresh:render,
    get:id=>{try{return readAllNotes().find(note=>note.id===id);}catch{return undefined;}},
    pinPersonal:(id,ready)=>{
      pendingPin={id,ready};bridge.contentWindow?.postMessage({type:'genz-personal:refresh'},location.origin);
    },
    dock:id=>{
      render();list.hidden=false;toggle.setAttribute('aria-expanded','true');
      const card=[...list.children].find(el=>el.dataset.noteId===id);
      if(!card)return null;
      card.open=true;card.classList.add('desk-note--floating');
      if(positions[id]){restorePosition(card);return card.getBoundingClientRect();}
      const picture=document.querySelector('.office-img').getBoundingClientRect();
      const slot=[...list.children].indexOf(card)%4;
      const bounds=card.getBoundingClientRect();
      moveCard(card,picture.left+picture.width*.76-bounds.width/2-slot*18,picture.top+picture.height*.17+slot*22);
      savePosition(card);
      return card.getBoundingClientRect();
    },
    focus:id=>{render();list.hidden=false;toggle.setAttribute('aria-expanded','true');const card=[...list.children].find(el=>el.dataset.noteId===id);if(card){card.open=true;card.querySelector('summary').focus({preventScroll:true});list.scrollTop=card.offsetTop-list.offsetTop;}},
  };
  window.addEventListener('storage',event=>{if(!event.key||event.key===positionsKey){positions={...readPositions(),...Object.fromEntries(personalNotes.filter(note=>note.position).map(note=>[note.id,note.position]))};}if(!event.key||[notesKey,checksKey,positionsKey].includes(event.key))render();});
  window.addEventListener('resize',()=>{for(const card of list.children)restorePosition(card);});
  render();
  // A standalone checklist's pin button brings the user back to the visible desk.
  const entryUrl=new URL(location.href);
  if(entryUrl.searchParams.get('desk')==='1')requestAnimationFrame(()=>{
    const office=document.getElementById('office');window.scrollTo(0,scrollY+office.getBoundingClientRect().top+(office.offsetHeight-innerHeight)*.9);
  });
  const entryPin=entryUrl.searchParams.get('pin');
  let entryAttached=false;
  function attachEntryPin(){
    if(!entryPin||entryAttached||!window.genzDeskNotes?.get(entryPin))return;
    entryAttached=true;
    const attach=()=>{
      if(!stage.classList.contains('is-ready'))return;
      observer.disconnect();window.genzDeskNotes.dock(entryPin);window.genzDeskNotes.focus(entryPin);
      entryUrl.searchParams.delete('pin');history.replaceState(null,'',entryUrl);
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const card=[...list.children].find(el=>el.dataset.noteId===entryPin);
      const bounds=card.getBoundingClientRect();
      const scale=Math.min(580/bounds.width,720/bounds.height,(innerWidth-24)/bounds.width,(innerHeight-24)/bounds.height);
      card.animate([
        {transform:`translate(${(innerWidth-bounds.width*scale)/2-bounds.left}px,${(innerHeight-bounds.height*scale)/2-bounds.top}px) scale(${scale})`,transformOrigin:'top left'},
        {transform:'translate(0,0) scale(1)',transformOrigin:'top left'},
      ],{duration:560,easing:'cubic-bezier(.3,.05,.2,1)'});
    };
    const observer=new MutationObserver(attach);observer.observe(stage,{attributes:true,attributeFilter:['class']});attach();
  }
  attachEntryPin();
})();
