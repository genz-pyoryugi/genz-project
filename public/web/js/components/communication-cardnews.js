// All educational copy is DOM text; supplied text-heavy images are not backgrounds.
function communicationSlides(content) {
  const artLabels=[
    '회의 중 서로 다른 이해를 확인하는 세 동료',
    '문서·쓰기·경청·표현·외국어를 상징하는 다섯 퍼즐',
    '서로의 의도를 다르게 받아들인 두 동료',
    '명확한 표현, 피드백, 경청을 상징하는 도형',
    '협력하는 네 동료와 함께 성장하는 화살표',
  ];
  return content.slides.map((slide,index)=>{
    const blocks=slide.blocks.map((block,i)=>h('section',{
      class:'communication-block communication-block--'+(block.kind||'plain'),
    },h('h4',null,(block.kind==='skill'?(i+1)+'. ':'')+block.label),h('p',null,block.text)));
    const image=h('img',{
      src:'/web/assets/picture/communication-illustrations.png',alt:artLabels[index],decoding:'async',
      style:'left:'+(-(index%3)*100)+'%;top:'+(-Math.floor(index/3)*100)+'%',
    });
    const artWindow=h('div',{class:'communication-art-window'},image);
    image.addEventListener('load',()=>{
      artWindow.style.setProperty('--art-cell-ratio',String((image.naturalWidth/3)/(image.naturalHeight/2)));
    });
    const illustration=h('figure',{class:'communication-art','aria-label':'첨부 인포그래픽 삽화를 참고한 재구성'},artWindow);
    const tip=h('aside',{class:'communication-tip','aria-label':'실천 팁'},createTipBell(),
      h('p',{class:'communication-takeaway'},slide.takeaway));
    const body=h('div',{class:'communication-body'},
      index===content.slides.length-1 ? null : illustration,...blocks,
      index===content.slides.length-1 ? null : tip);
    const card=[h('div',{class:'communication-card','data-lesson-card':String(index+1)},
      h('header',{class:'communication-header'+(index===content.slides.length-1?' communication-header--summary':'')},
        h('h3',null,slide.title),h('p',{class:'communication-message'},slide.message)),body)];
    card.rookie=true;
    return card;
  });
}
