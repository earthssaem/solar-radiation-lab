/* =========================================================
   앱 제어: 탭 전환, 캔버스 크기, 재생/일시정지/초기화, 하단 설명, 탐구 질문
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;

  SR.makeCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  /** 정적인 배경을 미리 그려 두는 층 (고해상도 대응) */
  SR.makeLayer = function (old, ps, draw, w = SR.W, h = SR.H) {
    const c = old && old.ps === ps ? old : SR.makeCanvas(Math.round(w * ps), Math.round(h * ps));
    c.ps = ps;
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
    x.setTransform(ps, 0, 0, ps, 0, 0);
    draw(x);
    return c;
  };

  const $ = (s) => document.querySelector(s);
  const canvas = $('#sim');
  const ctx = canvas.getContext('2d');
  const stage = $('#stage');
  const quizEl = document.getElementById('quiz'); // 패널을 비워도 잃지 않도록 참조를 붙잡아 둠

  const ORDER = ['scatter', 'reflect', 'absorb', 'refract', 'journey'];
  const LABELS = {
    scatter: ['1', '산란'],
    reflect: ['2', '반사'],
    absorb: ['3', '흡수'],
    refract: ['4', '굴절'],
    journey: ['★', '태양 복사 에너지의 여행'],
  };
  const modes = {};
  SR.modes.forEach((m) => (modes[m.id] = m));

  const app = (SR.app = {
    level: 'basic', // 처음에는 기본 모드
    running: true,
    speed: 1,
    ps: 1,
    dirty: true,
    mode: null,
    markDirty() { this.dirty = true; },
    refreshLive() {
      if (this._liveQueued) return;
      this._liveQueued = true;
      requestAnimationFrame(() => {
        this._liveQueued = false;
        renderLive();
      });
    },
    setMode,
  });

  /* ---------------- 탭 ---------------- */
  const tabs = $('#tabs');
  ORDER.forEach((id, i) => {
    if (!modes[id]) return;
    if (id === 'journey') tabs.appendChild(SR.el('span', 'tab-sep'));
    const b = SR.el('button', 'tab', `<span class="num">${LABELS[id][0]}</span>${LABELS[id][1]}`);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.id = id;
    b.style.setProperty('--c', modes[id].accent);
    b.addEventListener('click', () => setMode(id));
    tabs.appendChild(b);
  });

  function setMode(id) {
    const m = modes[id];
    if (!m) return;
    if (!m._inited) {
      m.init(app);
      m._inited = true;
      m._quiz = { sel: null, checked: false, qi: 0, list: Array.isArray(m.quiz) ? m.quiz.map(() => ({ sel: null, checked: false })) : null };
    }
    if (app.mode && app.mode.exit) app.mode.exit();
    app.mode = m;
    if (m.setLevel && m._level !== app.level) { m._level = app.level; m.setLevel(app.level); }
    document.documentElement.style.setProperty('--acc', m.accent);
    tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.id === id ? 'true' : 'false'));
    $('#panelTitle').textContent = m.panelTitle || `${m.title} — 조건 조절`;
    const body = $('#panelBody');
    body.innerHTML = '';
    body.appendChild(m.panel);
    placeQuiz();
    renderPrinciple();
    paintInfo();
    renderQuiz();
    renderLive();
    if (m.enter) m.enter();
    app.dirty = true;
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  $('#brand').addEventListener('click', () => {
    setMode('scatter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------------- 하단 설명 ---------------- */
  /* ---------------- 기본 모드 / 심화 탐구 ---------------- */
  function placeQuiz() {
    // 기본 모드: 탐구 질문을 조작 패널 아래에 두어 스크롤 없이 보이게
    const q = quizEl;
    const inPanel = app.level === 'basic' && !(app.mode && app.mode.quizBottom);
    if (inPanel) $('#panelBody').appendChild(q);
    else $('#explain').appendChild(q);
    $('#explain').classList.toggle('has-quiz', !inPanel);
  }
  function setLevel(lv) {
    if (lv === app.level) return;
    app.level = lv;
    document.body.classList.toggle('lv-basic', lv === 'basic');
    document.body.classList.toggle('lv-adv', lv === 'adv');
    document.querySelectorAll('#level button').forEach((b) => {
      const on = b.dataset.lv === lv;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const m = app.mode;
    if (m && m.setLevel) { m._level = lv; m.setLevel(lv); }
    placeQuiz();
    renderPrinciple();
    renderLive();
    app.dirty = true;
  }
  app.setLevel = setLevel;
  document.querySelectorAll('#level button').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.lv)));

  // 하단 설명: 평소에는 핵심 낱말(원인→과정→결과)과 한 줄 요약만, 긴 설명은 '자세히'에서
  const val = (m, k) => (typeof m[k] === 'function' ? m[k]() : m[k]);
  function renderPrinciple() {
    const m = app.mode;
    const short = val(m, 'principleShort');
    const full = app.level === 'basic' && m.principleBasic ? val(m, 'principleBasic') : val(m, 'principle');
    const keys = m.principleKeys || ['원인', '과정', '결과'];
    const key = (pr, i) => (pr.length === 1 ? (m.principleKeys ? m.principleKeys[0] : '설명') : keys[i]);
    const pr = short || full;
    const ol = $('#principle');
    ol.className = 'flow' + (pr.length === 1 ? ' single' : '');
    ol.innerHTML = pr.map((t, i) => `<li><span class="fk">${key(pr, i)}</span><span class="ft">${t}</span></li>`).join('');
    $('#principleFull').innerHTML = full.map((t, i) => `<li><span class="fk">${key(full, i)}</span> ${t}</li>`).join('');
  }
  app.renderPrinciple = renderPrinciple;
  // 보충 학습 팝업 버튼(모드가 info를 가질 때만)
  $('#exInfo').addEventListener('click', () => { const m = app.mode; if (m && m.info) m.info(); });
  function paintInfo() {
    const m = app.mode, b = $('#exInfo');
    b.hidden = !(m && m.info);
    if (m && m.infoLabel) b.textContent = m.infoLabel;
  }

  function renderLive() {
    const m = app.mode;
    if (!m || !m.live) return;
    const L = app.level === 'basic' && m.liveBasic ? m.liveBasic() : m.live();
    const s = m.liveShort ? m.liveShort() : '';
    const now = $('#liveNow');
    now.innerHTML = s;
    now.hidden = !s;
    $('#liveFull').innerHTML = L.now;
    const ch = $('#liveChange');
    if (L.change) {
      ch.hidden = false;
      ch.innerHTML = L.change;
    } else ch.hidden = true;
  }
  $('#exMore').addEventListener('click', (e) => {
    const d = $('#exDetail');
    d.hidden = !d.hidden;
    e.currentTarget.textContent = d.hidden ? '자세히 ▾' : '접기 ▴';
    e.currentTarget.setAttribute('aria-expanded', String(!d.hidden));
  });

  /* ---------------- 탐구 질문 ---------------- */
  function renderQuiz() {
    const m = app.mode;
    const box = quizEl;
    if (!m.quiz) { box.innerHTML = ''; return; }
    // 탐구 질문이 여러 개인 모드: 문제 번호로 넘겨 보기(문제마다 답 상태 따로 유지)
    const multi = Array.isArray(m.quiz);
    const q = multi ? m.quiz[m._quiz.qi] : m.quiz;
    const st = multi ? m._quiz.list[m._quiz.qi] : m._quiz;
    box.innerHTML = '';
    box.appendChild(SR.el('div', 'quiz-tag', '탐구 질문 · 먼저 조작해 보고 답을 고르세요'));
    if (multi) {
      const nav = SR.el('div', 'quiz-nav');
      m.quiz.forEach((_, i) => {
        const b = SR.el('button', 'quiz-num' + (i === m._quiz.qi ? ' on' : '') + (m._quiz.list[i].checked ? ' done' : ''), String(i + 1));
        b.type = 'button';
        b.setAttribute('aria-label', `문제 ${i + 1}`);
        b.addEventListener('click', () => { m._quiz.qi = i; renderQuiz(); });
        nav.appendChild(b);
      });
      box.appendChild(nav);
    }
    box.appendChild(SR.el('p', 'quiz-q', q.q));
    const opts = SR.el('div', 'quiz-opts' + (q.options.every((t) => t.length <= 10) ? ' short' : ''));
    const letters = ['가', '나', '다', '라'];
    q.options.forEach((t, i) => {
      const b = SR.el('button', 'quiz-opt', `<span class="mk">${letters[i]}</span><span>${t}</span>`);
      b.type = 'button';
      if (st.sel === i) b.classList.add('sel');
      if (st.checked) {
        if (i === q.answer) b.classList.add('right');
        else if (i === st.sel) b.classList.add('wrong');
      }
      b.addEventListener('click', () => {
        st.sel = i;
        st.needPick = false;
        st.checked = false;
        renderQuiz();
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
    const row = SR.el('div', 'quiz-row');
    row.appendChild(SR.ui.button('정답 확인', () => {
      // 답을 고르기 전에는 정답을 보여 주지 않음
      if (st.sel == null) { st.needPick = true; renderQuiz(); return; }
      st.needPick = false;
      st.checked = true;
      renderQuiz();
    }, 'btn-acc'));
    if (q.action) {
      row.appendChild(SR.ui.button(q.action.label, () => {
        q.action.run();
      }));
    }
    if (!st.checked && st.needPick) row.appendChild(SR.el('span', 'quiz-hint quiz-warn', '먼저 시뮬레이션을 관찰하고 답을 하나 골라 주세요.'));
    else if (!st.checked && q.hint) row.appendChild(SR.el('span', 'quiz-hint', q.hint));
    if (st.checked) row.appendChild(SR.ui.button('다시 풀기', () => {
      st.sel = null;
      st.checked = false;
      renderQuiz();
    }, 'btn-ghost'));
    box.appendChild(row);
    if (st.checked) {
      const ok = st.sel === q.answer;
      const head = ok ? '<b class="ok">정답입니다!</b> ' : '<b class="no">다시 생각해 봐요.</b> 정답은 ' + letters[q.answer] + '입니다. ';
      const ex = typeof q.explain === 'function' ? q.explain() : q.explain;
      box.appendChild(SR.el('div', 'quiz-fb', head + ex));
    }
  }

  /* ---------------- 재생 제어 ---------------- */
  const btnPlay = $('#btnPlay');
  function setRunning(r) {
    app.running = r;
    document.body.classList.toggle('paused', !r);
    $('#playLabel').textContent = r ? '일시정지' : '재생';
    btnPlay.setAttribute('aria-label', r ? '일시정지' : '재생');
    app.dirty = true;
  }
  app.setRunning = setRunning;
  btnPlay.addEventListener('click', () => setRunning(!app.running));
  $('#btnReset').addEventListener('click', () => {
    app.mode.reset();
    app.dirty = true;
    renderLive();
  });
  document.querySelectorAll('.pl-speed button').forEach((b) => {
    b.addEventListener('click', () => {
      app.speed = parseFloat(b.dataset.speed);
      document.querySelectorAll('.pl-speed button').forEach((x) => x.classList.toggle('on', x === b));
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    if (SR.rayleigh && SR.rayleigh.open) return; // 팝업이 열려 있으면 뒤쪽 조작 막기
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    setRunning(!app.running);
  });

  /* ---------------- 캔버스 크기 ---------------- */
  function fit() {
    const narrow = window.innerWidth <= 920;
    const r = stage.getBoundingClientRect();
    let w = r.width, h;
    if (narrow) {
      h = (w * SR.H) / SR.W;
      stage.style.height = h + 'px';
    } else {
      stage.style.height = '';
      h = Math.max(200, stage.getBoundingClientRect().height);
      const s = Math.min(w / SR.W, h / SR.H);
      w = SR.W * s;
      h = SR.H * s;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    app.ps = (w / SR.W) * dpr;
    app.cssScale = w / SR.W;
    app.dirty = true;
  }
  new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize', fit);

  // 캔버스 좌표 변환 (모드가 클릭 처리를 원할 때)
  canvas.addEventListener('click', (e) => {
    const m = app.mode;
    if (!m || !m.onClick) return;
    const r = canvas.getBoundingClientRect();
    m.onClick(((e.clientX - r.left) / r.width) * SR.W, ((e.clientY - r.top) / r.height) * SR.H);
  });

  /* ---------------- 주 반복 ---------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const m = app.mode;
    if (m) {
      if (app.running) {
        m.update(dt * app.speed);
        app.dirty = true;
      }
      if (app.dirty) {
        app.dirty = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(app.ps, 0, 0, app.ps, 0, 0);
        m.draw(ctx);
        if (!app.running) drawPausedBadge();
      }
    }
    requestAnimationFrame(frame);
  }
  function drawPausedBadge() {
    SR.label(ctx, '일시정지됨', SR.W / 2, 26, { size: 15, align: 'center', base: 'middle', color: '#06101f', bg: 'rgba(255,209,102,0.92)', shadow: false });
  }

  const start = (location.hash || '').slice(1);
  setMode(modes[start] ? start : 'scatter');
  fit();
  requestAnimationFrame(frame);
})();
