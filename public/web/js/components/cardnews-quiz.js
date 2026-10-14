const CARDNEWS_QUIZ_MEMORY = new Map();

function createCardnewsQuiz(content,{onReview}) {
  const quiz=content.quiz,questions=quiz.questions;
  const root=h('section',{class:'cardnews-quiz','aria-label':content.title+' 학습 후 퀴즈'});
  let index=0,answers=questions.map(()=>null),result=null;
  const focus=()=>root.querySelector('h3')?.focus();
  function question() {
    const item=questions[index];
    const next=h('button',{type:'submit',class:'learning-primary',disabled:answers[index]===null},index===questions.length-1?'결과 확인':'다음 문항');
    const options=h('fieldset',{class:'quiz-options'},h('legend',null,item.prompt));
    item.options.forEach((option,optionIndex)=>{
      const input=h('input',{type:'radio',name:content.id+'-quiz-'+item.id,value:String(optionIndex),required:true});
      input.checked=answers[index]===optionIndex;
      input.addEventListener('change',()=>{answers[index]=optionIndex;next.disabled=false});
      options.append(h('label',{class:'quiz-option'},input,h('span',null,option.text)));
    });
    const previous=h('button',{type:'button',class:'quiz-secondary',disabled:index===0,onClick:()=>{index--;question()}},'이전 문항');
    const form=h('form',{class:'quiz-panel'},
      h('p',{class:'learning-step'},'상황형 퀴즈 · '+(index+1)+' / '+questions.length),
      h('h3',{tabindex:'-1'},'배운 원칙을 적용해 보세요'),
      h('p',{class:'quiz-help'},'학습용 예시 · 가장 적절한 대응 하나를 선택하세요.'),
      options,h('div',{class:'quiz-actions'},previous,next));
    form.addEventListener('submit',event=>{
      event.preventDefault();if(answers[index]===null)return;
      if(index<questions.length-1){index++;question();return;}
      finish();
    });
    root.replaceChildren(form);focus();
  }
  function finish() {
    const correct=questions.map((item,i)=>answers[i]===item.answerIndex);
    result={contentId:content.id,quizVersion:quiz.version,answers:questions.map((item,i)=>({questionId:item.id,selectedIndex:answers[i],correct:correct[i]})),correctCount:correct.filter(Boolean).length,total:questions.length,score:Math.round(correct.filter(Boolean).length/questions.length*100),completedAt:new Date().toISOString()};
    CARDNEWS_QUIZ_MEMORY.set(content.id,result);
    try{localStorage.setItem('genz:cardnews-quiz:v1:'+content.id,JSON.stringify(result));result.saved=true;}
    catch{result.saved=false;}
    results();
  }
  function results() {
    const wrong=result.answers.filter(answer=>!answer.correct);
    const title=h('h3',{tabindex:'-1'},result.correctCount+' / '+result.total+'문항 정답 · '+result.score+'점');
    const review=questions.map((item,i)=>{
      const correct=answers[i]===item.answerIndex;
      const explanations=h('ol',{class:'quiz-explanations'},item.options.map((option,j)=>h('li',{
        class:j===item.answerIndex?'quiz-explanation--correct':'',
      },h('strong',null,(j===item.answerIndex?'정답':'오답')+(j===answers[i]?' · 내가 선택한 답':'')),
        h('p',null,option.text),h('p',null,option.explanation))));
      const details=h('details',{class:'quiz-review','data-correct':String(correct)},
        h('summary',null,(i+1)+'. '+(correct?'정답':'다시 확인할 문항')),
        h('p',{class:'quiz-review-question'},item.prompt),explanations,
        h('button',{class:'quiz-secondary quiz-review-card',type:'button','data-review-card':String(item.cardIndex),onClick:()=>onReview(item.cardIndex)},(item.cardIndex+1)+'번째 카드 다시 보기'));
      details.open=!correct;return details;
    });
    root.replaceChildren(h('div',{class:'quiz-panel quiz-result'},
      h('p',{class:'learning-step'},'퀴즈 결과'),title,
      h('p',{class:'quiz-help'},wrong.length?'틀린 '+wrong.length+'문항을 해설과 관련 카드로 다시 확인해 보세요.':'모두 맞혔어요. 필요하면 해설과 관련 카드를 다시 확인하세요.'),
      h('p',{class:'quiz-help'},'자기진단 응답과 별도로 채점한 퀴즈 결과예요.'),
      !result.saved&&h('p',{role:'status',class:'quiz-help'},'브라우저 저장이 차단되어 현재 페이지에서만 결과를 보관해요.'),
      ...review,
      h('button',{type:'button',class:'learning-primary quiz-retry',onClick:()=>{index=0;answers=questions.map(()=>null);question()}},'퀴즈 다시 풀기'),
      h('button',{type:'button',class:'quiz-secondary quiz-review-all',onClick:()=>onReview(0)},'처음부터 다시 학습하기')));
    focus();
  }
  question();return root;
}
