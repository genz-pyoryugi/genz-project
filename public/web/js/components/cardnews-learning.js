// Self-assessment, not a quiz. Each content has its own before/after record.
const CARDNEWS_LEARNING_MEMORY = new Map();
const CARDNEWS_LEARNING_BEFORE = ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'];
const CARDNEWS_LEARNING_AFTER = ['아직 설명하기 어렵다', '조금 설명할 수 있다', '어느 정도 설명할 수 있다', '대체로 설명할 수 있다', '명확하게 설명할 수 있다'];

function createLearningFlow(content, makeSlides) {
  const config = content.learning || {
    version:1, goal:'카드뉴스의 핵심 행동 요령 이해',
    preQuestion:'나는 이 카드뉴스의 핵심 행동 요령을 알고 있다.',
    postQuestion:'나는 이 카드뉴스의 핵심 행동 요령을 설명할 수 있다.',
  };
  const root = h('div', {class:'cardnews-learning', 'data-stage':'before'});
  root.addEventListener('focusin', event => {
    // Reveal a focused control without restarting its animation after blur.
    const control = event.target.closest('.learning-option, .learning-primary');
    control?.getAnimations().forEach(animation => animation.finish());
  });
  const key = 'genz:cardnews-learning:v1:' + content.id;
  let record;
  let lessonView;
  const save = () => {
    CARDNEWS_LEARNING_MEMORY.set(content.id, record);
    try { localStorage.setItem(key,JSON.stringify(record)); return true; }
    catch { return false; }
  };
  // Also send the score to the shared learning tracker (Supabase lt_events, type 'cardnews_self_check').
  // cardnews.html runs inside the office iframe, so the tracker lives on the parent page.
  const report = (phase, score) => {
    try {
      const tracker = window.genzTracker || (window.parent !== window && window.parent.genzTracker);
      if (tracker && tracker.record) tracker.record('cardnews_self_check', {contentId:content.id, phase, score, learningVersion:config.version||1});
    } catch { /* tracking must never block the lesson */ }
  };
  const notice = h('p', {class:'learning-storage', role:'status'});
  const storageNote = saved => { notice.textContent = saved ? '' : '브라우저에 저장할 수 없어 현재 화면에서만 응답을 보관해요.'; };
  const stage = (name, child, focus=true) => {
    root.dataset.stage=name;
    if(name === 'before' || name === 'after') {
      if(name === 'before') lessonView = buildLesson();
      lessonView.inert = true;
      lessonView.setAttribute('aria-hidden','true');
      const overlay=h('div',{class:'learning-pre-overlay'},child);
      const previous=name==='after' ? h('button',{
        class:'cardnews__nav learning-post-prev',type:'button','aria-label':'이전 카드',
        onClick:()=>{
          lesson();
          if(content.type==='newsletterTest'){lessonView.showLast();return;}
          const dots=lessonView.querySelectorAll('.cardnews__dot');
          dots[Math.max(0,dots.length-2)].click();
          lessonView.querySelector('.cardnews__viewport').focus();
        },
      },'‹') : null;
      root.replaceChildren(h('div',{class:'learning-pre-frame'},lessonView,overlay,previous),notice);
    } else {
      root.replaceChildren(child,notice);
    }
    if(focus) (child.querySelector('.cardnews__viewport') || child.querySelector('h3'))?.focus();
  };
  function createProgress() {
    const percent=(record?.preResponse?50:0)+(record?.postResponse?50:0);
    return h('div',{class:'learning-progress-group'},
      h('div',{class:'learning-progress',role:'progressbar','aria-label':'학습 전·후 상태 확인 완료율',
        'aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(percent)},
        h('span',{style:'width:'+percent+'%'})),
      h('span',{class:'learning-progress-value'},percent+'%'));
  }
  function assessment(phase, initial=false) {
    const before = phase === 'before';
    const heading = h('h3',{class:'learning-heading',tabindex:'-1'},before
      ? '시작하기 전에, 지금 나의 상태를 확인해볼까요?'
      : '카드뉴스를 읽은 후, 지금 나의 상태는 어떤가요?');
    let value=null;
    const options=h('fieldset',{class:'learning-options'},h('legend',null,before?config.preQuestion:config.postQuestion));
    const choices=h('div',{class:'learning-rating-scale','aria-label':before?'1~5 선택 시 카드뉴스 시작':'1~5 선택 시 학습 완료'});
    options.append(choices);
    const labels=before?CARDNEWS_LEARNING_BEFORE:CARDNEWS_LEARNING_AFTER;
    labels.forEach((label,index)=>choices.append(h('button',{
      type:'button',class:'learning-rating-button',value:String(index+1),
      'aria-label':(index+1)+'점: '+label,
      onClick:()=>{value=index+1;form.requestSubmit();},
    },String(index+1))));
    options.append(h('div',{class:'learning-rating-labels','aria-hidden':'true'},
      h('span',null,labels[0]),h('span',null,'→'),h('span',null,labels[4])));
    const step=h('p',{class:'learning-step'},before?'Q1. 학습 전 상태 확인':'Q2. 학습 후 상태 확인');
    const form=h('form',{class:'learning-panel learning-panel--before'+(before?'':' learning-panel--after')},
      h('img',{class:'learning-mascot',src:'/web/assets/picture/learning-chick-no-hat.png',alt:'','aria-hidden':'true'}),
      h('div',{class:'learning-question-card'},createProgress(),step,heading,options));
    heading.id='learning-'+phase+'-heading-'+content.id;
    form.setAttribute('role','dialog');
    form.setAttribute('aria-labelledby',heading.id);
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!Number.isInteger(value)||value<1||value>5)return;
      const now=new Date().toISOString();
      if(before){
        record={contentId:content.id,learningVersion:config.version||1,goal:config.goal,
          preQuestion:config.preQuestion,postQuestion:config.postQuestion,
          preResponse:value,postResponse:null,startedAt:now,completedAt:null};
        storageNote(save());report('before',value);lesson();
      } else {
        record={...record,postResponse:value,completedAt:now};storageNote(save());report('after',value);
        stage('complete',h('section',{class:'learning-panel learning-complete'},
          createProgress(),
          content.type==='newsletterTest' ? h('img',{class:'newsletter-complete-art',src:'/web/assets/picture/learning-complete-check.svg',alt:'','aria-hidden':'true',width:'160',height:'136'}) : null,
          h('p',{class:'learning-step'},'학습 완료'),
          h('h3',{class:'learning-heading',tabindex:'-1'},...(content.type==='newsletterTest'
            ? ['학습을 완료했어요.',h('br'), '배운 내용을 실제 업무에서 활용해보세요.']
            : ['학습을 완료했어요. 배운 내용을 실제 업무에서 활용해보세요.'])),
          h('button',{class:'learning-primary learning-quiz',type:'button',onClick:()=>{
            const request=new CustomEvent('cardnews:quiz-request',{bubbles:true,cancelable:true,detail:{contentId:content.id}});
            root.dispatchEvent(request);
          }},'퀴즈 풀러 가기')));
      }
    });
    stage(phase,form,!initial);
  }
  function buildLesson() {
    if(content.type==='newsletterTest')return createNewsletterCardnews({content,onComplete:()=>assessment('after')});
    const slides=makeSlides();
    if(content.type==='communicationGuide') {
      slides[slides.length-1][0].querySelector('.communication-body').append(
        h('a',{class:'learning-recap-source communication-more',href:'https://ncs.go.kr/th03/TH0302List.do?dirSeq=121',target:'_blank',rel:'noopener noreferrer'},'더 알아보기'));
      const postCheck=[];
      postCheck.rookie=true;
      slides.push(postCheck);
      return h('section',{class:'learning-lesson','aria-label':content.title},createDeck(slides,{onChange:(index,total)=>{
        if(index===total-1 && root.dataset.stage==='lesson') assessment('after');
      }}));
    }
    // Keep the three learning cards and recap; the fifth slot opens the post-check.
    const recap=config.recap;
    if(recap?.length){
      const summary=[h('div',{class:'learning-recap'},
        h('p',{class:'learning-step'},'핵심 행동 돌아보기'),
        h('h3',{tabindex:'-1'},'업무에서 이렇게 실천해요'),
        h('ul',null,recap.map(item=>h('li',null,h('strong',null,item.title),h('p',null,item.body)))),
        h('a',{class:'learning-recap-source',href:content.source_url || ARTICLES[content.articleId]?.url,target:'_blank',rel:'noopener noreferrer'},'원문보기'))];
      summary.rookie=true;slides.splice(Math.max(0,slides.length-1),0,summary);
    }
    const postCheck=[];
    postCheck.rookie=true;
    slides[slides.length-1]=postCheck;
    const deck=createDeck(slides,{onChange:(index,total)=>{
      if(index===total-1 && root.dataset.stage==='lesson') assessment('after');
    }});
    return h('section',{class:'learning-lesson','aria-label':'카드뉴스'},deck);
  }
  function lesson() {
    const view=lessonView || buildLesson();
    view.inert=false;
    view.removeAttribute('aria-hidden');
    stage('lesson',view);
  }
  assessment('before',true);
  return root;
}
