(() => {
  // Continue sending the quiz's durable outbox after standalone navigation.
  window.genzTracker?.retry();
  const simulation = Simulation.create();
  simulation.hidden = false;
  simulation.setAttribute('aria-label', 'AI 팀장 대화 연습');
  document.querySelector('main.chat').append(simulation);
  const exit = document.querySelector('.sim-exit');
  if (parent !== window) {
    exit.textContent = '사무실로 돌아가기';
    exit.addEventListener('click', event => {
      event.preventDefault();
      parent.postMessage({ type: 'genz-sos:close' }, location.origin);
    });
  }
})();
