/* =========================================================
   ★ 종합 탐구: 태양 복사 에너지의 여행
   학습지의 개념도를 단계별로 완성해 가는 장면.
   대표 광선 몇 개만 정해진 경로로 움직이며, 현재 단계만 선명하게 강조한다.
   (단계 순서는 학습을 위한 관찰 순서이며, 에너지 비율은 표시하지 않는다)
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;

  const TOP = 64;                 // 대기 위쪽 경계
  const OZ = { y0: 84, y1: 126 };  // 오존층
  const GND = 560;
  const CLOUD = { x: 770, y: 282, rx: 150, ry: 44 };
  const DIR = (() => { const x = 0.58, y = 0.81, L = Math.hypot(x, y); return [x / L, y / L]; })();
  const K = DIR[0] / DIR[1];
  const SUN = { x: 86, y: 32 };
  const EYE = { x: 330, y: GND - 30 };
  const SPEED = 330;
  const STEP_TIME = 6.5;          // 자동 재생: 단계당 시간(초)

  const C = {
    sun: [255, 238, 190], blue: [90, 160, 255], green: [110, 235, 140], rest: [255, 225, 160],
    refl: [94, 234, 212], uv: [196, 160, 255], ir: [255, 90, 130], heat: [255, 140, 60], refr: [205, 180, 255], gray: [190, 200, 220],
  };
  const atY = (xb, y) => xb + (y - TOP) * K;               // 평행광선이 높이 y를 지날 때의 x
  const start = (xb) => [atY(xb, -12), -12];

  // 굴절 경로(평행 층상 대기, n·sinθ = 일정) — 그림을 위해 크게 과장
  function refrPath(xb) {
    const s0 = DIR[0];
    const dl = 0.32, Hs = 170;
    const n = (y) => 1 + dl * Math.exp(-(GND - y) / Hs);
    const pts = [...start(xb)];
    let x = pts[0], y = pts[1];
    while (y < GND - 30) {
      const sn = y < TOP ? s0 : s0 / n(y);
      const cs = Math.sqrt(1 - sn * sn);
      x += sn * 3; y += cs * 3;
      pts.push(x, y);
    }
    return pts;
  }

  /* ---------------- 대표 광선 정의 ---------------- */
  const PS = { x: atY(170, 250), y: 250 };          // 산란 지점
  const HIT = { x: 735, y: 252 };                    // 구름 윗면
  const XB_CLOUD = HIT.x - (HIT.y - TOP) * K;
  const UVP = { x: atY(90, 105), y: 105 };           // 오존 흡수 지점
  const IRP = { x: atY(430, 470), y: 470 };          // 수증기 흡수 지점
  const G = { x: atY(330, GND), y: GND };            // 지표 도달 지점
  const R7 = refrPath(40);
  const R7S = (() => { // 같은 광선이 직진했다면
    let i = 0;
    while (R7[i + 1] < TOP) i += 2;
    const x0 = R7[i], y0 = R7[i + 1];
    return [x0, y0, x0 + (GND - 30 - y0) * K, GND - 30];
  })();
  const seg = (a, b) => [a[0], a[1], b[0], b[1]];
  const rot = (deg, len) => [PS.x + Math.cos(deg * Math.PI / 180) * len, PS.y + Math.sin(deg * Math.PI / 180) * len];

  // 각 단계의 경로: pts, 색, 굵기, 끝 모양, 출발 지연(앞 경로가 그 지점에 닿는 시간)
  const tTo = (pts) => { let L = 0; for (let i = 2; i < pts.length; i += 2) L += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); return L / SPEED; };
  const P1 = seg(start(170), [PS.x, PS.y]);
  const P2 = seg(start(XB_CLOUD), [HIT.x, HIT.y]);
  const P5 = seg(start(330), [G.x, G.y]);

  const STEPS = [
    {
      title: '태양 복사 에너지의 입사', color: '#ffd166',
      text: '태양에서 온 복사 에너지가 대기의 위쪽 경계로 들어옵니다. 이 빛에는 자외선·가시광선·적외선이 섞여 있습니다.',
      look: '태양에서 나온 평행한 광선이 점선(대기의 위쪽 경계)을 지나 대기로 들어오는 모습',
      label: ['대기로 들어오는 햇빛', 250, TOP + 34],
      paths: [170, 330, XB_CLOUD].map((xb) => ({ pts: seg(start(xb), [atY(xb, TOP + 60), TOP + 60]), col: C.sun, w: 4, end: 'arrow', fx: { t: 'spark', at: [atY(xb, TOP), TOP] } })),
    },
    {
      title: '대기 중에서 산란', color: SR.ACCENT.scatter,
      text: '햇빛이 공기 분자를 만나 여러 방향으로 흩어집니다. 파장이 짧은 파란빛이 더 잘 산란되며, 관측자 쪽으로 산란된 파란빛 때문에 하늘이 파랗게 보입니다.',
      look: '한 점에서 파란빛이 여러 방향으로 흩어지고, 그중 하나가 관측자의 눈으로 들어가는 모습',
      label: ['공기 분자에 의한 산란', PS.x + 30, PS.y - 30],
      paths: [
        { pts: P1, col: C.sun, w: 4, end: null, fx: { t: 'ring', at: [PS.x, PS.y], col: C.blue } },
        { pts: seg([PS.x, PS.y], [EYE.x, EYE.y - 6]), col: C.blue, w: 3.5, end: 'arrow', delay: tTo(P1), tag: '관측자 눈으로' },
        { pts: seg([PS.x, PS.y], rot(-150, 90)), col: C.blue, w: 2.6, end: 'arrow', delay: tTo(P1) },
        { pts: seg([PS.x, PS.y], rot(-70, 85)), col: C.blue, w: 2.6, end: 'arrow', delay: tTo(P1) },
        { pts: seg([PS.x, PS.y], rot(150, 80)), col: C.blue, w: 2.6, end: 'arrow', delay: tTo(P1) },
        { pts: seg([PS.x, PS.y], rot(-20, 55)), col: C.green, w: 2, end: 'arrow', delay: tTo(P1) },
        { pts: seg([PS.x, PS.y], [atY(170, GND), GND]), col: C.rest, w: 3.2, end: 'arrow', delay: tTo(P1) },
      ],
    },
    {
      title: '구름에서 반사', color: SR.ACCENT.reflect,
      text: '구름에 도달한 빛의 상당 부분은 반사되어 우주로 되돌아갑니다. 두꺼운 구름일수록 반사율이 높고(70~90%), 일부는 구름을 통과합니다.',
      look: '구름 윗면에서 굵은 빛이 위로 되돌아가고, 가는 빛만 구름 아래로 빠져나가는 모습',
      label: ['구름의 반사', HIT.x + 70, HIT.y - 130],
      paths: [
        { pts: P2, col: C.sun, w: 4.5, end: null, fx: { t: 'ring', at: [HIT.x, HIT.y], col: C.refl } },
        { pts: seg([HIT.x, HIT.y], [HIT.x + DIR[0] * 190, HIT.y - DIR[1] * 190]), col: C.refl, w: 4.5, end: 'arrow', delay: tTo(P2) },
        { pts: seg([HIT.x, HIT.y], [HIT.x - 40, HIT.y - 175]), col: C.refl, w: 3, end: 'arrow', delay: tTo(P2) },
        { pts: seg([HIT.x + 40, CLOUD.y + 46], [HIT.x + 95, 470]), col: C.gray, w: 1.8, end: 'arrow', delay: tTo(P2) + 0.4 },
      ],
    },
    {
      title: '대기에서 흡수', color: SR.ACCENT.absorb,
      text: '오존은 주로 자외선을, 수증기는 적외선의 일부를 흡수합니다(구름도 일부를 흡수). 흡수된 에너지는 대기를 데웁니다. 가시광선은 대부분 흡수되지 않고 통과합니다.',
      look: '보라색 자외선은 오존층에서, 분홍색 적외선은 지표 가까운 수증기에서 사라지며 열(주황)로 바뀌는 모습',
      label: ['대기와 구름의 흡수', 470, 150],
      paths: [
        { pts: seg(start(90), [UVP.x, UVP.y]), col: C.uv, w: 3.5, dash: [4, 4], end: 'heat', tag: '오존: 자외선' },
        { pts: seg(start(430), [IRP.x, IRP.y]), col: C.ir, w: 3.5, dash: [9, 5], end: 'heat', tag: '수증기: 적외선 일부' },
        { pts: [CLOUD.x + 20, CLOUD.y + 8, CLOUD.x + 21, CLOUD.y + 9], col: C.heat, w: 1, end: 'heat', delay: 0.6, hidden: true },
      ],
    },
    {
      title: '지표에 도달', color: '#ffe9a8',
      text: '대기를 통과한 햇빛(과 산란되어 아래로 향한 빛의 일부)이 지표에 도달합니다.',
      look: '햇빛이 대기를 지나 지표에 닿는 지점',
      label: ['지표에 도달', G.x - 150, G.y - 40],
      paths: [{ pts: P5, col: C.sun, w: 4.5, end: 'spark' }],
    },
    {
      title: '지표에서 반사와 흡수', color: SR.ACCENT.absorb,
      text: '지표에 도달한 빛 중 일부는 반사되고, 나머지는 지표에 흡수되어 지표의 온도를 높입니다. 화살표의 굵기는 반사보다 흡수가 많다는 것을 나타냅니다(반사율은 지표 상태에 따라 다름).',
      look: '가는 민트색 화살표(반사)와 굵은 주황색 화살표(흡수) 비교',
      label: ['지표의 반사와 흡수', G.x + 60, G.y - 100],
      paths: [
        { pts: seg([G.x, G.y], [G.x + DIR[0] * 140, G.y - DIR[1] * 140]), col: C.refl, w: 2, end: 'arrow', tag: '반사' },
        { pts: seg([G.x, G.y + 2], [G.x + 10, G.y + 82]), col: C.heat, w: 8, end: 'heat', tag: '흡수' },
      ],
    },
    {
      title: '대기를 지나며 굴절', color: SR.ACCENT.refract,
      text: '굴절은 맨 마지막에 일어나는 현상이 아닙니다. 빛은 대기를 지나는 동안 내내 밀도 차이 때문에 조금씩 휘어집니다. 여기서는 대기를 통과하는 광선 하나를 다시 골라 그 휘어짐을 크게 과장해 관찰합니다.',
      look: '점선(직진했을 경우)보다 실제 경로가 지표 쪽으로 조금씩 휘는 모습 (실제로는 매우 작음)',
      label: ['굴절 (크게 과장)', 70, 330],
      paths: [{ pts: R7, col: C.refr, w: 3.5, end: 'arrow' }],
    },
    {
      title: '정리: 태양 복사 에너지의 여행', color: '#ffd166',
      text: '하나의 장면에 산란·반사·흡수·굴절이 모두 모였습니다. 실제로는 이 현상들이 정해진 순서로 일어나지 않고, 빛마다 다른 과정을 겪습니다.',
      look: '학습지의 개념도와 비교하며 각 화살표가 어떤 현상인지 말해 보기',
      paths: [],
    },
  ];
  const LAST = STEPS.length - 1;
  STEPS.forEach((st) => st.paths.forEach((p) => {
    p.delay = p.delay || 0;
    p.len = tTo(p.pts) * SPEED;
    p.dur = p.len / SPEED;
  }));
  STEPS.forEach((st) => { st.cycle = Math.max(1.5, ...st.paths.map((p) => p.delay + p.dur)) + 1.4; });

  const M = {
    id: 'journey',
    title: '태양 복사 에너지의 여행',
    panelTitle: '종합 탐구 — 단계별 관찰',
    accent: SR.ACCENT.journey,
    principleKeys: null,
    quizBottom: true, // 단계 목록이 길어 탐구 질문은 아래쪽에 둠

    principle() {
      const st = STEPS[this.k];
      this.principleKeys = [`${this.k + 1}단계 · ${st.title}`];
      return [st.text];
    },

    quiz: {
      q: '다음 중 태양 복사 에너지가 물질에 전달되어 그 물질의 온도를 직접 높이는 과정은?',
      hint: '4단계와 6단계에서 주황색 열이 생기는 곳을 다시 살펴보세요.',
      options: ['산란', '반사', '흡수', '굴절'],
      answer: 2,
      explain: '흡수된 복사 에너지만 물질의 내부 에너지를 증가시켜 온도를 높입니다. 산란과 반사는 빛의 진행 방향이 바뀌는 현상이고, 굴절은 빛의 경로가 휘는 현상이어서 에너지를 물질에 전달하지 않습니다. 그래서 굴절은 에너지 출입을 계산할 때 반사·흡수처럼 비율로 나누는 항목이 아닙니다.',
    },

    init(app) {
      this.app = app;
      this.k = 0;
      this.auto = false;
      this.fx = new SR.Effects();
      this.buildPanel();
      this.reset();
    },
    setLevel() { this.app.markDirty(); },

    reset() {
      this.fx.clear();
      this.t = 0;          // 현재 단계 안의 시간
      this.autoT = 0;
      this.fired = new Set();
      this.heat = 0;
    },

    go(k, fromAuto) {
      this.k = SR.clamp(k, 0, LAST);
      this.t = 0;
      this.autoT = 0;
      this.fired = new Set();
      this.fx.clear();
      if (!fromAuto && this.auto && this.k === LAST) this.setAuto(false);
      this.paintSteps();
      this.app.renderPrinciple();
      this.app.refreshLive();
      this.app.markDirty();
    },

    setAuto(on) {
      this.auto = on;
      this.autoT = 0;
      if (on && this.k === LAST) this.go(0, true);
      this.btnAuto.textContent = on ? '⏸ 자동 재생 멈춤' : '▶ 전체 과정 자동 재생';
      this.btnAuto.classList.toggle('btn-acc', on);
      if (on && !this.app.running) this.app.setRunning(true);
    },

    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      const s1 = ui.section('관찰 단계');
      const ol = SR.el('ol', 'steps');
      this.stepBtns = STEPS.map((st, i) => {
        const li = SR.el('li');
        const b = SR.el('button', '', `<span class="n">${i === LAST ? '✓' : i + 1}</span><span>${st.title}</span><i class="k" style="background:${st.color}"></i>`);
        b.type = 'button';
        b.addEventListener('click', () => this.go(i));
        li.appendChild(b);
        ol.appendChild(li);
        return b;
      });
      const nav = SR.el('div', 'step-nav');
      this.btnPrev = ui.button('◀ 이전', () => this.go(this.k - 1));
      this.btnNext = ui.button('다음 ▶', () => this.go(this.k + 1), 'btn-acc');
      nav.append(this.btnPrev, this.btnNext);
      this.btnAuto = ui.button('▶ 전체 과정 자동 재생', () => this.setAuto(!this.auto));
      this.btnAuto.style.width = '100%';
      this.btnAuto.style.marginTop = '8px';
      s1.append(ol, nav, this.btnAuto);
      const s2 = ui.section('알아 둘 점');
      s2.appendChild(SR.el('p', 'ctl-hint', '• 단계의 순서는 학습을 위한 <b>관찰 순서</b>입니다. 산란·반사·흡수·굴절이 실제로 이 순서대로 일어나는 것은 아니며, 빛마다 겪는 과정이 다릅니다.'));
      s2.appendChild(SR.el('p', 'ctl-hint', '• 굴절은 빛이 대기를 지나는 동안 계속 일어납니다. 7단계에서는 대기를 지나는 광선 하나를 골라 따로 관찰합니다.'));
      s2.appendChild(SR.el('p', 'ctl-hint', '• 이 모드는 현상의 종류와 위치를 보여 주며, 입사 에너지를 과정별 비율로 나눈 수치는 표시하지 않습니다.'));
      p.append(s1, s2);
      this.panel = p;
      this.paintSteps();
    },

    paintSteps() {
      this.stepBtns.forEach((b, i) => {
        b.classList.toggle('cur', i === this.k);
        b.classList.toggle('done', i < this.k);
      });
      this.btnPrev.disabled = this.k === 0;
      this.btnNext.disabled = this.k === LAST;
      this.btnNext.textContent = this.k === LAST ? '완성!' : '다음 ▶';
    },

    live() {
      const st = STEPS[this.k];
      return { now: `<b>관찰 포인트</b> — ${st.look}`, change: '' };
    },

    update(dt) {
      this.t += dt;
      const st = STEPS[this.k];
      const tc = this.t % st.cycle;
      if (tc < (this.prevTc || 0)) this.fired.clear(); // 한 바퀴가 끝나면 다시
      this.prevTc = tc;
      // 경로 끝에 닿을 때 효과
      st.paths.forEach((p, i) => {
        const key = i;
        const reach = p.delay + p.dur;
        if (tc >= reach && !this.fired.has(key)) {
          this.fired.add(key);
          const e = [p.pts[p.pts.length - 2], p.pts[p.pts.length - 1]];
          if (p.end === 'heat') this.fx.add({ type: 'heat', x: e[0], y: e[1], r1: 30, dur: 1.4 });
          else if (p.end === 'spark') this.fx.add({ type: 'spark', x: e[0], y: e[1], col: [255, 236, 160], r1: 14, dur: 0.8 });
          if (p.fx) this.fx.add({ type: p.fx.t, x: p.fx.at[0], y: p.fx.at[1], col: p.fx.col || [255, 220, 130], r0: 3, r1: 16, r: 14, dur: 0.7, lw: 2.2 });
        }
        // 대기 경계 통과 표시(1단계)
        if (p.fx && p.fx.t === 'spark') {
          const tb = p.delay + Math.hypot(p.fx.at[0] - p.pts[0], p.fx.at[1] - p.pts[1]) / SPEED;
          const k2 = 'b' + i;
          if (tc >= tb && !this.fired.has(k2)) { this.fired.add(k2); this.fx.add({ type: 'spark', x: p.fx.at[0], y: p.fx.at[1], col: [255, 220, 130], r1: 12, dur: 0.7 }); }
        }
      });
      this.heat = SR.clamp(this.heat + (this.k >= 5 ? dt * 0.25 : -dt * 0.2), 0, 1);
      if (this.auto) {
        this.autoT += dt;
        if (this.autoT >= STEP_TIME) {
          if (this.k < LAST) this.go(this.k + 1, true);
          if (this.k === LAST) this.setAuto(false);
        }
      }
      this.fx.update(dt);
    },

    /* ---------------- 그리기 ---------------- */
    drawBackground(c) {
      const g = c.createLinearGradient(0, 0, 0, GND);
      g.addColorStop(0, '#040915');
      g.addColorStop(TOP / GND, '#081430');
      g.addColorStop(0.55, '#123063');
      g.addColorStop(1, '#2a5a92');
      c.fillStyle = g;
      c.fillRect(0, 0, SR.W, GND);
      SR.drawStars(c, 41, 50, SR.W, TOP);
      // 오존층
      const og = c.createLinearGradient(0, OZ.y0, 0, OZ.y1);
      og.addColorStop(0, 'rgba(244,114,182,0)');
      og.addColorStop(0.5, 'rgba(244,114,182,0.14)');
      og.addColorStop(1, 'rgba(244,114,182,0)');
      c.fillStyle = og;
      c.fillRect(0, OZ.y0, SR.W, OZ.y1 - OZ.y0);
      // 대기 위쪽 경계
      c.setLineDash([6, 6]);
      c.lineWidth = 1.2;
      c.strokeStyle = 'rgba(170,200,255,0.45)';
      c.beginPath(); c.moveTo(0, TOP); c.lineTo(SR.W, TOP); c.stroke();
      c.setLineDash([]);
      // 지표
      const gg = c.createLinearGradient(0, GND, 0, SR.H);
      gg.addColorStop(0, '#3b6a3e');
      gg.addColorStop(1, '#152a18');
      c.fillStyle = gg;
      c.fillRect(0, GND, SR.W, SR.H - GND);
      const rnd = SR.rng(77);
      c.lineWidth = 1.2;
      for (let i = 0; i < 380; i++) {
        const x = rnd() * SR.W, y = GND + 4 + rnd() * (SR.H - GND - 8);
        c.strokeStyle = `rgba(${90 + rnd() * 50},${150 + rnd() * 60},${70 + rnd() * 30},0.4)`;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 5); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(0, GND, SR.W, 1.5);
      // 구름
      const r2 = SR.rng(9);
      for (let i = 0; i < 18; i++) {
        const u = r2() * 2 - 1;
        const x = CLOUD.x + u * CLOUD.rx * 0.9;
        const rr = 20 + r2() * 26;
        const y = CLOUD.y + 18 - Math.sqrt(Math.max(0, 1 - u * u)) * 38 + r2() * 16;
        const gr = c.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
        gr.addColorStop(0, 'rgba(255,255,255,0.97)');
        gr.addColorStop(1, 'rgba(185,198,220,0.95)');
        c.fillStyle = gr;
        c.beginPath(); c.arc(x, y, rr, 0, 6.2832); c.fill();
      }
      c.fillStyle = 'rgba(150,162,185,0.85)';
      c.beginPath(); c.ellipse(CLOUD.x, CLOUD.y + 30, CLOUD.rx * 0.92, 16, 0, 0, 6.2832); c.fill();
      // 이름표
      SR.label(c, '우주', 1180, 30, { size: 15, align: 'right', color: 'rgba(200,215,240,0.7)' });
      SR.label(c, '대기의 위쪽 경계', 1180, TOP - 8, { size: 13, align: 'right', color: 'rgba(200,215,240,0.65)' });
      SR.label(c, '오존층', 1180, OZ.y1 - 10, { size: 14, align: 'right', color: 'rgba(244,140,195,0.8)' });
      SR.label(c, '대기', 1180, 400, { size: 15, align: 'right', color: 'rgba(200,220,255,0.7)' });
      SR.label(c, '지표', 1180, GND + 28, { size: 15, align: 'right', color: 'rgba(210,240,210,0.85)' });
    },

    // 경로를 길이 L까지 그리기
    drawPath(ctx, p, L, alpha, glow) {
      const pts = p.pts;
      if (p.hidden || L <= 0) return null;
      ctx.strokeStyle = SR.css(p.col, alpha);
      ctx.lineWidth = p.w;
      ctx.lineCap = 'round';
      if (p.dash) ctx.setLineDash(p.dash);
      if (glow) { ctx.shadowColor = SR.css(p.col, 0.7); ctx.shadowBlur = 10; }
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      let acc = 0, hx = pts[0], hy = pts[1], ang = 0;
      for (let i = 2; i < pts.length; i += 2) {
        const sl = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
        ang = Math.atan2(pts[i + 1] - pts[i - 1], pts[i] - pts[i - 2]);
        if (acc + sl >= L) {
          const f = (L - acc) / sl;
          hx = pts[i - 2] + (pts[i] - pts[i - 2]) * f;
          hy = pts[i - 1] + (pts[i + 1] - pts[i - 1]) * f;
          ctx.lineTo(hx, hy);
          acc = L;
          break;
        }
        acc += sl;
        hx = pts[i]; hy = pts[i + 1];
        ctx.lineTo(hx, hy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      const done = L >= p.len - 0.5;
      if (done && p.end === 'arrow') SR.arrowHead(ctx, hx + Math.cos(ang) * 4, hy + Math.sin(ang) * 4, ang, 10 + p.w * 1.6, SR.css(p.col, alpha));
      return { x: hx, y: hy, done };
    },

    draw(ctx) {
      if (!this.bg || this.bg.ps !== this.app.ps) this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      const k = this.k;
      const summary = k === LAST;
      const cur = STEPS[k];

      // 지표 열
      if (this.heat > 0) {
        const hg = ctx.createLinearGradient(0, GND, 0, GND + 80);
        hg.addColorStop(0, `rgba(255,120,50,${0.3 * this.heat})`);
        hg.addColorStop(1, 'rgba(255,100,40,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, GND, SR.W, 80);
      }
      // 굴절 단계: 밀도 분포와 직진 비교선
      if (k === 6 || summary) {
        if (k === 6) {
          const dg = ctx.createLinearGradient(0, TOP, 0, GND);
          dg.addColorStop(0, 'rgba(183,148,255,0)');
          dg.addColorStop(1, 'rgba(183,148,255,0.25)');
          ctx.fillStyle = dg;
          ctx.fillRect(0, TOP, SR.W, GND - TOP);
          SR.label(ctx, '아래로 갈수록 공기 밀도가 큼', 1180, 520, { size: 15, align: 'right', color: '#e3d4ff', bg: 'rgba(8,10,30,0.6)' });
        }
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = `rgba(255,214,120,${summary ? 0.4 : 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(R7S[0], R7S[1]); ctx.lineTo(R7S[2], R7S[3]); ctx.stroke();
        ctx.setLineDash([]);
        if (k === 6) SR.label(ctx, '대기가 없다면(직진)', R7S[2] + 10, R7S[3] - 6, { size: 14, color: 'rgba(255,214,120,0.95)', bg: 'rgba(8,10,30,0.6)' });
      }

      SR.drawSun(ctx, SUN.x, SUN.y, 26);

      // 지난 단계: 흐리게 고정 / 정리 단계: 모두 선명하게
      for (let i = 0; i < k; i++) {
        STEPS[i].paths.forEach((p) => this.drawPath(ctx, p, p.len, summary ? 0.85 : 0.22, false));
      }
      // 현재 단계: 경로가 자라나며 진행
      if (!summary) {
        const tc = this.t % cur.cycle;
        cur.paths.forEach((p) => {
          const L = (tc - p.delay) * SPEED;
          const h = this.drawPath(ctx, p, Math.min(L, p.len), 1, true);
          if (h && !h.done) {
            ctx.globalCompositeOperation = 'lighter';
            SR.drawPhoton(ctx, { x: h.x, y: h.y, trail: [], col: p.col, a: 1, r: 4 });
            ctx.globalCompositeOperation = 'source-over';
          }
          if (h && h.done && p.tag) SR.label(ctx, p.tag, h.x + 10, h.y + (p.end === 'heat' ? 26 : -6), { size: 15, weight: 700, color: SR.css(p.col), bg: 'rgba(4,10,24,0.7)' });
        });
      } else {
        // 정리: 모든 경로 위로 빛이 천천히 흐름
        STEPS.forEach((st) => st.paths.forEach((p) => {
          if (p.hidden) return;
          const L = ((this.t * SPEED * 0.6) % (p.len + 200));
          if (L > p.len) return;
          let acc = 0;
          for (let i = 2; i < p.pts.length; i += 2) {
            const sl = Math.hypot(p.pts[i] - p.pts[i - 2], p.pts[i + 1] - p.pts[i - 1]);
            if (acc + sl >= L) {
              const f = (L - acc) / sl;
              ctx.globalCompositeOperation = 'lighter';
              SR.drawPhoton(ctx, { x: p.pts[i - 2] + (p.pts[i] - p.pts[i - 2]) * f, y: p.pts[i - 1] + (p.pts[i + 1] - p.pts[i - 1]) * f, trail: [], col: p.col, a: 0.9, r: 3 });
              ctx.globalCompositeOperation = 'source-over';
              break;
            }
            acc += sl;
          }
        }));
        // 학습지 개념도의 이름표
        [
          ['대기 중 산란', PS.x - 150, PS.y - 50, SR.ACCENT.scatter],
          ['구름의 반사', HIT.x + 70, HIT.y - 130, SR.ACCENT.reflect],
          ['대기와 구름의 흡수', 470, 150, SR.ACCENT.absorb],
          ['지표의 반사', G.x + 104, G.y - 52, SR.ACCENT.reflect],
          ['지표의 흡수', G.x - 150, G.y + 62, SR.ACCENT.absorb],
          ['굴절(과장)', 40, 330, SR.ACCENT.refract],
        ].forEach(([t, x, y, c]) => SR.label(ctx, t, x, y, { size: 17, weight: 800, color: c, bg: 'rgba(4,10,24,0.75)' }));
      }
      this.fx.draw(ctx);

      SR.drawObserver(ctx, EYE.x, GND, 1.1, 1);
      if (!summary && cur.label) SR.label(ctx, cur.label[0], cur.label[1], cur.label[2], { size: 19, weight: 800, color: cur.color, bg: 'rgba(4,10,24,0.78)' });

      // 현재 단계 머리표와 안내
      SR.label(ctx, summary ? '전체 개념도 완성' : `${k + 1} / ${LAST}  ${cur.title}`, 140, 40, { size: 20, weight: 800, color: cur.color, base: 'middle', bg: 'rgba(4,10,24,0.7)' });
      if (this.auto) {
        const f = SR.clamp(this.autoT / STEP_TIME, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(140, 58, 220, 4);
        ctx.fillStyle = cur.color;
        ctx.fillRect(140, 58, 220 * f, 4);
      }
      SR.label(ctx, '※ 단계는 관찰 순서입니다. 실제로는 정해진 순서 없이, 빛마다 다른 과정을 겪습니다.', SR.W / 2, SR.H - 12, { size: 14, align: 'center', color: 'rgba(230,236,248,0.9)', bg: 'rgba(4,10,24,0.6)' });
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
