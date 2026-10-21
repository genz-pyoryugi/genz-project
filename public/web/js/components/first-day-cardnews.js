// Uses the same dimensions, card class, controls, source hitbox and tip renderer as TOP 3.
const firstDayArtworkPromises = {};
function firstDayArtwork() {
  const source = '/web/assets/picture/first-day-guide-scenes.png';
  return firstDayArtworkPromises[source] ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { delete firstDayArtworkPromises[source]; reject(Error('삽화를 불러오지 못했습니다.')); };
    image.src = source;
  });
}

function firstDaySlides(content, article) {
  return Array.from({ length: 4 }, (_, index) => {
    const data = content.slides[index];
    const canvas = h('canvas', {
      width: 1080, height: 1350, class: 'rookie-card__image', role: 'img',
      'aria-label': data ? [data.label, data.title, ...data.lines, data.action, ...data.tip].join('. ') : '첫 출근 적응 가이드. 원문에서 자세한 사례를 확인하세요.',
    });
    const slide = [canvas];
    if (index < 3) slide.push(createTipBell());
    slide.rookie = true;
    if (index === 3) slide.push(h('a', {
      href: content.source_url || article.url, target: '_blank', rel: 'noopener noreferrer',
      class: 'rookie-card__source', 'aria-label': '원문보기: ' + article.title,
    }));
    const status = h('span', { class: 'rookie-card__status', role: 'status' }, '이미지를 준비하고 있어요…');
    slide.push(status);
    Promise.all([index < 3 ? firstDayArtwork() : null, document.fonts.load('700 48px Pretendard'), document.fonts.load('500 36px Pretendard')])
      .then(([art]) => { drawFirstDayCard(canvas, art, data, index); status.remove(); })
      .catch(() => { status.textContent = '이미지를 불러오지 못했습니다. 새로고침해 주세요.'; });
    return slide;
  });
}

function drawFirstDayCard(canvas, art, data, index) {
  const c = canvas.getContext('2d');
  c.fillStyle = '#fdf9f2'; c.fillRect(0, 0, 1080, 1350);
  const text = (value, x, y, size = 42, weight = 700, color = '#202b33', maxWidth = 952) => {
    c.font = weight + ' ' + size + 'px Pretendard';
    if (c.measureText(value).width > maxWidth) {
      size = Math.floor(size * maxWidth / c.measureText(value).width);
      c.font = weight + ' ' + size + 'px Pretendard';
    }
    c.fillStyle = color; c.fillText(value, x, y);
  };
  const pill = (x, y, width, height, color) => {
    c.beginPath(); c.roundRect(x, y, width, height, height / 2); c.fillStyle = color; c.fill();
  };
  text('신입사원 첫 출근', 64, 90, 39);
  text('적응 가이드', 64, 157, 62, 800, '#086bce');
  if (index < 3) {
    const panelWidth = art.width / 3;
    const scale = Math.min(900 / panelWidth, 470 / art.height);
    const w = panelWidth * scale, height = art.height * scale;
    c.drawImage(art, panelWidth * index, 0, panelWidth, art.height,
      (1080 - w) / 2, 192 + (470 - height) / 2, w, height);
    c.strokeStyle = '#23333e'; c.lineWidth = 3; c.beginPath(); c.moveTo(64, 672); c.lineTo(1016, 672); c.stroke();
    text(data.label, 64, 750, 60, 800, '#086bce');
    text(data.title, 64, 828, 48, 800);
    data.lines.forEach((line, i) => text(line, 64, 902 + i * 55, 38, 500));
    // The article contains no ranking/percentage. Use an action strip in that position.
    pill(64, 993, 952, 62, '#e7f1fa');
    text(data.action, 88, 1035, 36, 700, '#175487', 904);
    drawRookieTip(c, data.tip);
  } else {
    text('첫 출근의 기본,', 64, 420, 68, 800);
    text('작은 배려부터 시작해요.', 64, 509, 65, 800);
    text('질문과 존중, 기본 매너의 자세한 사례는', 64, 650, 40, 500);
    text('기사 원문에서 확인하세요.', 64, 710, 40, 500);
    pill(64, 900, 952, 135, '#086bce');
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    text('원문보기', 540, 967.5, 48, 800, '#ffffff'); c.restore();
  }
}
