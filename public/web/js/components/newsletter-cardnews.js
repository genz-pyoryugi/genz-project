function createNewsletterCardnews({content=NEWSLETTER_CONTENT,onComplete}={}) {
  const imageFiles=['newsletter-communication-final.png','newsletter-documents-review-v2.png','newsletter-conversation-final.png','newsletter-learning-final.png','newsletter-application-final.png'];
  const imageDescriptions=[
    '직장인이 전화와 문서로 업무 내용을 확인하고 동료들이 의견을 나누는 장면',
    '동료들이 인쇄 문서의 조건을 검토하고 태블릿으로 정보를 정리하는 장면',
    '세 동료가 서로 경청하고 의견을 표현하며 자료를 확인하는 회의 장면',
    '체크리스트로 현재 상태를 확인하고 필요한 학습 자료를 고르는 장면',
    '학습 내용을 점검하고 동료와 부족한 부분을 복습하며 다음 업무를 준비하는 장면',
  ];
  let index=0;
  const root=h('div',{class:'newsletter-cardnews newsletter-cardnews--lesson',tabindex:'0','aria-label':content.title});
  function render(focus=false) {
    const slide=content.slides[index];
    root.dataset.page=String(index+1);
    const sprite=Number.isInteger(slide.image?.spriteIndex);
    const picture=h('div',{class:'newsletter-art-window'+(sprite?' newsletter-art-window--sheet':'')},h('img',{
      src:slide.image?.src || '/web/assets/picture/'+imageFiles[index],
      alt:slide.image?.alt || imageDescriptions[index],decoding:'async',
      style:sprite ? '--sprite-column:'+(slide.image.spriteIndex%3)+';--sprite-row:'+Math.floor(slide.image.spriteIndex/3) : '',
    }));
    if(slide.image?.animatedClock)picture.append(createNewsletterClock());
    if(slide.image?.sequentialChecks)picture.append(createNewsletterChecks());
    if(slide.image?.discardFade){
      const grayscale=picture.querySelector('img').cloneNode();
      grayscale.alt='';
      picture.append(h('span',{class:'newsletter-discard-fade','aria-hidden':'true'},grayscale));
    }
    const panel=h('section',{class:'newsletter-row newsletter-row--example newsletter-concept'},
      h('img',{class:'newsletter-example-icon',src:'/web/assets/picture/newsletter-document.svg',alt:'','aria-hidden':'true',width:'40',height:'40'}),
      h('div',{class:'newsletter-row-copy'},h('h4',null,slide.panel.label),
        slide.panel.quote ? h('p',{class:'newsletter-example-quote'},slide.panel.quote) : null,
        h('p',null,slide.panel.text)));
    const rows=slide.blocks.map((block,i)=>h('section',{class:'newsletter-row'},
      h('span',{class:'newsletter-icon','aria-hidden':'true'},String(i+1)),
      h('div',{class:'newsletter-row-copy'},h('h4',null,block.label),h('p',null,block.text))));
    const heading=h('h3',{tabindex:'-1'},slide.message);
    const dots=h('div',{class:'newsletter-dots'},content.slides.map((_,i)=>h('button',{
      type:'button','aria-label':(i+1)+'번 카드','aria-current':String(i===index),
      onClick:()=>{index=i;render(true);},
    })));
    const move=delta=>{index=Math.max(0,Math.min(content.slides.length-1,index+delta));render(true);};
    root.replaceChildren(
      h('div',{class:'newsletter-layout'},
        h('figure',{class:'newsletter-art'},picture),
        h('div',{class:'newsletter-copy'},h('header',null,
          h('div',{class:'newsletter-heading-row'},h('p',{class:'newsletter-category'},slide.title),
            content.sourceUrl && index===content.slides.length-1 ? h('a',{
              class:'newsletter-source',href:content.sourceUrl,target:'_blank',rel:'noopener noreferrer',
            },'원문보기 ↗') : null),heading),panel,...rows,
          h('blockquote',{class:'newsletter-confirm-quote'},h('div',null,h('h4',null,slide.highlight.label),h('p',null,slide.highlight.text))))),
      h('aside',{class:'newsletter-tip'},createTipBell(),h('strong',null,'핵심 정리'),h('p',null,slide.takeaway)),
      h('nav',{class:'newsletter-navigation','aria-label':'뉴스레터 카드 이동'},
        h('button',{type:'button',disabled:index===0,onClick:()=>move(-1)},'이전'),
        h('div',{class:'newsletter-position'},dots),
        h('button',{type:'button',onClick:()=>{
          if(index===content.slides.length-1)onComplete?.();else move(1);
        }},'다음')));
    if(focus)heading.focus({preventScroll:true});
  }
  root.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();
    if(event.key==='ArrowRight' && index===content.slides.length-1){onComplete?.();return;}
    index=Math.max(0,Math.min(content.slides.length-1,index+(event.key==='ArrowLeft'?-1:1)));render(true);
  });
  root.showLast=()=>{index=content.slides.length-1;render(true);};
  render();return root;
}

function createNewsletterClock() {
  const clock=document.createElementNS('http://www.w3.org/2000/svg','svg');
  clock.setAttribute('viewBox','0 0 120 120');
  clock.setAttribute('class','newsletter-clock');
  clock.setAttribute('aria-hidden','true');
  const ticks=Array.from({length:12},(_,i)=>'<path d="M60 19v'+(i%3===0?'6':'4')+'" transform="rotate('+(i*30)+' 60 60)"/>').join('');
  clock.innerHTML='<circle cx="60" cy="60" r="55" fill="#086bce" stroke="#13233a" stroke-width="3"/>'+
    '<circle cx="60" cy="60" r="47" fill="#fffdf8" stroke="#175487" stroke-width="2"/>'+
    '<g stroke="#175487" stroke-width="3" stroke-linecap="round">'+ticks+'</g>'+
    '<path d="M60 60V32M60 60l18 17" stroke="#175487" stroke-width="4" stroke-linecap="round"/>'+
    '<g class="newsletter-clock__second"><path d="M60 69V23" stroke="#4795cf" stroke-width="2" stroke-linecap="round"/></g>'+
    '<circle cx="60" cy="60" r="4" fill="#13233a"/>';
  return clock;
}

function createNewsletterChecks() {
  const checks=document.createElementNS('http://www.w3.org/2000/svg','svg');
  checks.setAttribute('viewBox','0 0 1243 1266');
  checks.setAttribute('preserveAspectRatio','xMidYMid slice');
  checks.setAttribute('class','newsletter-checklist-motion');
  checks.setAttribute('aria-hidden','true');
  const strokes=['M143 603l21 22 27-42','M153 718l22 23 29-45','M163 836l21 20 29-44','M176 957l20 19 28-44'];
  strokes.forEach((d,i)=>{
    const tick=document.createElementNS('http://www.w3.org/2000/svg','path');
    tick.setAttribute('d',d);tick.setAttribute('pathLength','1');
    tick.setAttribute('class',i===0?'newsletter-check--initial':'newsletter-check--draw');
    tick.style.setProperty('--check-delay',(i*.65)+'s');
    checks.append(tick);
  });
  return checks;
}
