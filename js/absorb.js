/* =========================================================
   ③ 흡수 — 대기 성분별 선택적 흡수와 온도 변화(단순화 모형)
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;

  // 대기 밖 태양 복사: 5778 K 흑체 + 자외선 영역 보정(실제 태양은 흑체보다 자외선이 적음)
  const UVF = [[200, 0.05], [250, 0.2], [300, 0.5], [350, 0.72], [400, 0.82], [450, 1], [2500, 1]];
  // 오존 연직 광학적 두께(약 300 DU 기준, 흡수 단면적 자료를 단순화)
  const O3 = [[200, 2.6], [210, 4], [220, 13], [230, 34], [240, 64], [250, 86], [255, 92], [260, 88], [270, 67], [280, 32], [290, 13], [300, 3.2], [305, 1.6], [310, 0.8], [315, 0.4], [320, 0.2], [330, 0.05], [340, 0.012], [350, 0.003], [400, 0.0005], [450, 0.003], [500, 0.012], [550, 0.026], [600, 0.04], [650, 0.021], [700, 0.008], [750, 0.005], [800, 0.002], [900, 0], [2500, 0]];
  // 수증기 흡수대(중심 nm, 폭 nm, 광학적 두께) — 가강수량 약 2 cm 기준 띠 평균값을 단순화
  const H2O = [[720, 12, 0.15], [820, 15, 0.25], [940, 30, 1.2], [1130, 35, 1.5], [1380, 55, 6], [1870, 70, 8], [2700, 150, 12]];
  const L0 = 200, L1 = 2500;
  const BAND = {
    all: { name: '전체', lo: L0, hi: L1 },
    uv: { name: '자외선', lo: L0, hi: 400 },
    vis: { name: '가시광선', lo: 400, hi: 700 },
    ir: { name: '적외선', lo: 700, hi: L1 },
  };
  const COL = { o3: [244, 114, 182], h2o: [103, 232, 249], gnd: [214, 161, 90], ref: [94, 234, 212] };

  function interp(tab, l) {
    for (let i = 0; i < tab.length - 1; i++) {
      if (l >= tab[i][0] && l <= tab[i + 1][0]) {
        const t = (l - tab[i][0]) / (tab[i + 1][0] - tab[i][0]);
        return tab[i][1] + (tab[i + 1][1] - tab[i][1]) * t;
      }
    }
    return 0;
  }
  const tauO3 = (l) => interp(O3, l);
  const tauH2O = (l) => H2O.reduce((s, [c, w, a]) => s + a * Math.exp(-(((l - c) / w) ** 2)), 0);
  const toa = (l) => SR.planck(l, 5778) * interp(UVF, l);

  // 1 nm 간격 표 (계산·표본 추출 공용)
  const GRID = [];
  for (let l = L0; l < L1; l++) GRID.push(l + 0.5);
  const TOA = GRID.map(toa);
  const TOA_SUM = TOA.reduce((a, b) => a + b, 0);
  const TOA_MAX = Math.max(...TOA);
  const T_O3 = GRID.map(tauO3);
  const T_H2O = GRID.map(tauH2O);

  // 장면 배치
  const OZ = { y0: 118, y1: 192 };
  const WV = { y0: 268, y1: 505 };
  const GND = 525;
  const SCENE_W = 690;
  const DIR = (() => { const x = 0.22, y = 1, L = Math.hypot(x, y); return [x / L, y / L]; })();
  const SPEED = 250;
  const GX = 735, GW = 440; // 그래프 영역
  const SP = { y0: 58, y1: 318 };
  const TG = { y0: 412, y1: 632 };
  const TAU_COOL = 20; // 온도 이완 시간(모형 시간, 초)
  const HEAT = 0.014; // 흡수 에너지 1당 온도 상승률(°C/s)

  const M = {
    id: 'absorb',
    title: '흡수',
    accent: SR.ACCENT.absorb,
    defaults: { band: 'all', o3: 100, h2o: 100, alb: 15 },

    principle: [
      '태양 복사 에너지가 물질에 흡수되면, 빛의 에너지가 물질 내부로 전달되어 분자 운동이 활발해진다(내부 에너지 증가).',
      '대기의 기체는 특정 파장만 골라 흡수한다: 오존은 주로 자외선, 수증기는 적외선의 일부 파장대. 나머지 빛은 대부분 통과해 지표에 도달한다.',
      '지표는 도달한 빛의 여러 파장을 흡수하므로, 흡수한 에너지가 많을수록 온도가 더 빠르게 올라간다.',
    ],

    quiz: {
      q: '태양 복사 에너지를 흡수하면 물질의 온도는 어떻게 달라질까?',
      hint: '오른쪽 온도 그래프에서 흡수한 에너지가 많은 곳과 적은 곳의 온도 변화를 비교해 보세요.',
      options: ['올라간다', '내려간다', '변하지 않는다'],
      answer: 0,
      explain: () => {
        const e = M.energy || {};
        return `흡수된 복사 에너지는 물질의 내부 에너지(분자 운동)를 증가시키므로 온도가 올라갑니다. ` +
          `이 모형에서 지표는 입사 100 중 약 ${(e.gAbs || 0).toFixed(1)}, 수증기는 ${(e.h2o || 0).toFixed(1)}, 오존은 ${(e.o3 || 0).toFixed(1)}을 흡수하여, 흡수량이 많은 지표의 온도가 가장 빠르게 오릅니다. ` +
          `반면 반사된 에너지는 진행 방향만 바뀌어 되돌아가므로 물체의 온도를 높이지 않습니다.`;
      },
    },

    init(app) {
      this.app = app;
      this.s = { ...this.defaults };
      this.fx = new SR.Effects();
      this.buildPanel();
      this.recompute();
      this.makeMolecules();
      this.reset();
    },

    reset() {
      this.ph = [];
      this.fx.clear();
      this.acc = 0;
      this.time = 0;
      this.T = { o3: 0, h2o: 0, gnd: 0 };
      this.pulse = { o3: 0, h2o: 0, gnd: 0 };
      this.hist = [{ t: 0, o3: 0, h2o: 0, gnd: 0 }];
      this.sampleAcc = 0;
      this.liveAcc = 0;
      this.anim = 0;
    },

    restoreDefaults() {
      Object.assign(this.s, this.defaults);
      this.ctl.band.set('all', true);
      this.ctl.o3.set(100, true);
      this.ctl.h2o.set(100, true);
      this.ctl.alb.set(15, true);
      this.change = '';
      this.onChange();
    },

    /* ---------------- 조절 패널 ---------------- */
    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      this.ctl = {};
      const s1 = ui.section('조건 바꾸기');
      this.ctl.band = ui.segmented({
        label: '비추는 빛 (파장 영역)',
        grid: true,
        value: this.s.band,
        options: [
          { value: 'all', label: '전체 햇빛', swatch: 'linear-gradient(90deg,#c4a0ff,#5aa8ff,#7dff8a,#ffd166,#ff6b5a,#a33a5a)' },
          { value: 'uv', label: '자외선만', swatch: '#c4a0ff' },
          { value: 'vis', label: '가시광선만', swatch: 'linear-gradient(90deg,#5aa8ff,#7dff8a,#ffd166,#ff6b5a)' },
          { value: 'ir', label: '적외선만', swatch: '#a33a5a' },
        ],
        onChange: (v, prev) => {
          const before = this.energy;
          this.s.band = v;
          this.recompute();
          this.change = `비추는 빛을 ‘${BAND[prev].name}’ → ‘${BAND[v].name}’${SR.j(BAND[v].name, '로').slice(BAND[v].name.length)} 바꾸었습니다. 입사 에너지가 ${before.inc.toFixed(1)} → ${SR.j(this.energy.inc.toFixed(1), '이')} 되고, ` +
            `흡수하는 곳도 달라집니다(오존 ${this.energy.o3.toFixed(1)}, 수증기 ${this.energy.h2o.toFixed(1)}, 지표 ${this.energy.gAbs.toFixed(1)}).`;
          this.ph = [];
          this.onChange(true);
        },
      });
      this.ctl.o3 = ui.slider({
        label: '오존의 양', min: 0, max: 200, step: 5, value: this.s.o3, unit: '%',
        ends: ['없음', '현재의 2배'],
        onInput: (v, base) => {
          const b = this.energy;
          this.s.o3 = v;
          this.recompute();
          if (base != null && base !== v) this.change = `오존을 ${base}% → ${v}%로 ${v > base ? '늘리자' : '줄이자'} 오존이 흡수하는 에너지가 ${b.o3.toFixed(1)} → ${SR.j(this.energy.o3.toFixed(1), '이')} 되었고, 지표에 도달하는 자외선은 ${v > base ? '줄었습니다' : '늘었습니다'}.`;
          this.onChange(true);
        },
      });
      this.ctl.h2o = ui.slider({
        label: '수증기의 양', min: 0, max: 200, step: 5, value: this.s.h2o, unit: '%',
        ends: ['건조', '습윤'],
        onInput: (v, base) => {
          const b = this.energy;
          this.s.h2o = v;
          this.recompute();
          if (base != null && base !== v) this.change = `수증기를 ${base}% → ${v}%로 ${v > base ? '늘리자' : '줄이자'} 수증기가 흡수하는 적외선 에너지가 ${b.h2o.toFixed(1)} → ${SR.j(this.energy.h2o.toFixed(1), '이')} 되었습니다. 흡수대 밖의 파장은 거의 그대로 통과합니다.`;
          this.onChange(true);
        },
      });
      this.ctl.alb = ui.slider({
        label: '지표 반사율', min: 5, max: 40, value: this.s.alb, unit: '%',
        ends: ['5%', '40%'],
        hint: '지표에 도달한 빛 중 반사되는 비율 — 반사된 빛은 지표를 데우지 않습니다.',
        onInput: (v, base) => {
          const b = this.energy;
          this.s.alb = v;
          this.recompute();
          if (base != null && base !== v) this.change = `지표 반사율을 ${base}% → ${v}%로 바꾸자 지표가 흡수하는 에너지가 ${b.gAbs.toFixed(1)} → ${SR.j(this.energy.gAbs.toFixed(1), '이')} 되었습니다. 그래서 지표 온도가 오르는 빠르기도 ${v > base ? '느려집니다' : '빨라집니다'}.`;
          this.onChange(true);
        },
      });
      s1.append(this.ctl.band.el, this.ctl.o3.el, this.ctl.h2o.el, this.ctl.alb.el);

      const s2 = ui.section('에너지 출입 (전체 태양 복사 = 100)', '스펙트럼을 적분해 계산한 값입니다.');
      const dl = SR.el('dl', 'ro-list');
      dl.innerHTML = [
        ['inc', '입사 에너지', '#ffd166'],
        ['o3', '오존이 흡수', SR.css(COL.o3)],
        ['h2o', '수증기가 흡수', SR.css(COL.h2o)],
        ['arr', '지표에 도달', '#e8eef9'],
        ['gRef', '└ 지표가 반사', SR.css(COL.ref)],
        ['gAbs', '└ 지표가 흡수', SR.css(COL.gnd)],
      ].map(([k, n, c]) => `<dt><i style="background:${c}"></i>${n}</dt><dd data-k="${k}"></dd>`).join('');
      this.ro = dl;
      s2.appendChild(dl);
      s2.appendChild(SR.el('p', 'ctl-hint', '※ 학습용 단순화 모형: 산란·구름·이산화 탄소 등 다른 기체의 흡수는 제외했고, 오존층·수증기층·지표의 열용량은 같다고 가정했습니다.'));
      const foot = SR.el('div', 'pnl-foot');
      foot.appendChild(ui.button('조건 기본값으로', () => this.restoreDefaults(), 'btn-ghost'));
      p.append(s1, s2, foot);
      this.panel = p;
    },

    onChange(keepPhotons) {
      if (!keepPhotons) this.ph = [];
      this.bgKey = null;
      this.app.markDirty();
      this.app.refreshLive();
    },

    /* ---------------- 계산 ---------------- */
    recompute() {
      const s = this.s;
      const b = BAND[s.band];
      const kO = s.o3 / 100, kH = s.h2o / 100, a = s.alb / 100;
      this.T1 = T_O3.map((t) => Math.exp(-t * kO));
      this.T2 = T_H2O.map((t) => Math.exp(-t * kH));
      let inc = 0, o3 = 0, h2o = 0, arr = 0;
      const cdf = [];
      for (let i = 0; i < GRID.length; i++) {
        const l = GRID[i];
        const S = l >= b.lo && l < b.hi ? TOA[i] : 0;
        inc += S;
        o3 += S * (1 - this.T1[i]);
        h2o += S * this.T1[i] * (1 - this.T2[i]);
        arr += S * this.T1[i] * this.T2[i];
        cdf.push(inc);
      }
      this.cdf = cdf;
      const f = 100 / TOA_SUM;
      this.energy = { inc: inc * f, o3: o3 * f, h2o: h2o * f, arr: arr * f, gRef: arr * f * a, gAbs: arr * f * (1 - a) };
      // 그래프용 곡선 (로그 파장 축)
      const N = 260;
      this.curve = [];
      for (let j = 0; j <= N; j++) {
        const l = L0 * Math.pow(L1 / L0, j / N);
        const i = SR.clamp(Math.round(l - L0 - 0.5), 0, GRID.length - 1);
        // 좁은 띠는 ±3 nm 평균으로 부드럽게
        let s0 = 0, s1 = 0, s2 = 0, n = 0;
        for (let k = Math.max(0, i - 3); k <= Math.min(GRID.length - 1, i + 3); k++) {
          s0 += TOA[k]; s1 += TOA[k] * this.T1[k]; s2 += TOA[k] * this.T1[k] * this.T2[k]; n++;
        }
        this.curve.push({ l, top: s0 / n / TOA_MAX, ao: s1 / n / TOA_MAX, sf: s2 / n / TOA_MAX });
      }
      this.updateReadouts();
    },

    updateReadouts() {
      if (!this.ro) return;
      for (const k in this.energy) {
        const el = this.ro.querySelector(`[data-k=${k}]`);
        if (el) el.textContent = this.energy[k].toFixed(1);
      }
    },

    sampleLambda() {
      const tot = this.cdf[this.cdf.length - 1];
      if (tot <= 0) return 550;
      const u = Math.random() * tot;
      let lo = 0, hi = this.cdf.length - 1;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (this.cdf[m] < u) lo = m + 1; else hi = m;
      }
      return GRID[lo];
    },

    /* ---------------- 설명 ---------------- */
    live() {
      const e = this.energy;
      const T = this.T;
      let t = '';
      if (this.s.band === 'all' || this.s.band === 'uv') t += `오존은 주로 <b>자외선</b>을 흡수해 입사 100 중 <b>${e.o3.toFixed(1)}</b>${SR.j(e.o3.toFixed(1), '을').slice(-1)} 흡수합니다. `;
      if (this.s.band === 'all' || this.s.band === 'ir') t += `수증기는 <b>적외선의 특정 파장대</b>만 골라 <b>${e.h2o.toFixed(1)}</b>${SR.j(e.h2o.toFixed(1), '을').slice(-1)} 흡수합니다. `;
      if (this.s.band === 'vis') t += `가시광선은 오존·수증기에 거의 흡수되지 않고(오존 ${e.o3.toFixed(1)}, 수증기 ${e.h2o.toFixed(1)}) 대부분 지표까지 도달합니다. `;
      t += `지표에는 ${SR.j(e.arr.toFixed(1), '이')} 도달해 그중 ${SR.j(e.gRef.toFixed(1), '은')} 반사되고 <b>${e.gAbs.toFixed(1)}</b>${SR.j(e.gAbs.toFixed(1), '이').slice(-1)} 흡수됩니다. `;
      t += `모형 시간 ${Math.round(this.time)}초 동안 온도 변화: 지표 <b>+${T.gnd.toFixed(1)}°C</b>, 수증기층 <b>+${T.h2o.toFixed(1)}°C</b>, 오존층 <b>+${T.o3.toFixed(1)}°C</b> — 흡수한 에너지가 많을수록 더 빨리 데워집니다.`;
      return { now: t, change: this.change };
    },

    /* ---------------- 애니메이션 ---------------- */
    makeMolecules() {
      const rnd = SR.rng(5);
      this.mol = { o3: [], h2o: [], gnd: [] };
      for (let i = 0; i < 26; i++) this.mol.o3.push({ x: 30 + rnd() * 560, y: OZ.y0 + 10 + rnd() * (OZ.y1 - OZ.y0 - 20), r: rnd() * 6.28, ph: rnd() * 6.28 });
      for (let i = 0; i < 44; i++) {
        const y = WV.y1 - 8 - (WV.y1 - WV.y0 - 16) * Math.pow(rnd(), 1.6);
        this.mol.h2o.push({ x: 24 + rnd() * 570, y, r: rnd() * 6.28, ph: rnd() * 6.28 });
      }
      for (let r = 0; r < 6; r++) for (let c = 0; c < 34; c++) this.mol.gnd.push({ x: 14 + c * 18 + (r % 2) * 9, y: GND + 26 + r * 22, ph: rnd() * 6.28 });
    },

    emit() {
      if (this.energy.inc <= 0) return;
      const l = this.sampleLambda();
      const i = SR.clamp(Math.round(l - L0 - 0.5), 0, GRID.length - 1);
      const x0 = SR.rand(-10, 470);
      let fate = 'gnd', fy = GND;
      if (Math.random() < 1 - this.T1[i]) { fate = 'o3'; fy = SR.rand(OZ.y0 + 8, OZ.y1 - 8); }
      else if (Math.random() < 1 - this.T2[i]) { fate = 'h2o'; const r = Math.random(); fy = WV.y1 - (WV.y1 - WV.y0) * r * r; }
      const col = SR.waveColor(l);
      this.ph.push({
        x: x0, y: -12, vx: DIR[0] * SPEED, vy: DIR[1] * SPEED, l, fate, fy, state: 0, trail: [], col, a: 1,
        w: l > 700 ? 1.8 : 2, r: l > 700 || l < 400 ? 2.4 : 2.6, dash: l > 700 ? [5, 4] : l < 400 ? [2, 3] : null,
      });
    },

    update(dt) {
      this.time += dt;
      this.anim += dt;
      this.acc += 30 * dt;
      while (this.acc >= 1) { this.acc -= 1; this.emit(); }
      // 온도: dT/dt = (흡수 에너지)·k − T/τ
      const e = this.energy;
      const P = { o3: e.o3, h2o: e.h2o, gnd: e.gAbs };
      for (const k in this.T) {
        this.T[k] += (HEAT * P[k] - this.T[k] / TAU_COOL) * dt;
        this.pulse[k] = Math.max(0, this.pulse[k] - dt * 1.5);
      }
      this.sampleAcc += dt;
      if (this.sampleAcc >= 0.25) {
        this.sampleAcc = 0;
        this.hist.push({ t: this.time, ...this.T });
        if (this.hist.length > 1200) this.hist.shift();
      }
      this.liveAcc += dt;
      if (this.liveAcc > 0.5) { this.liveAcc = 0; this.app.refreshLive(); }

      const keep = [];
      for (const p of this.ph) {
        SR.pushTrail(p, 8);
        if (p.state === 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y >= p.fy) {
            p.y = p.fy;
            if (p.fate === 'gnd') {
              if (Math.random() < this.s.alb / 100) {
                p.state = 2;
                p.vx = SR.rand(-0.5, 0.6) * SPEED;
                p.vy = -SPEED * 0.9;
                p.trail.length = 0;
                this.fx.add({ type: 'ring', x: p.x, y: p.y, col: COL.ref, r0: 2, r1: 12, dur: 0.45, lw: 1.8 });
              } else {
                p.state = 1;
                p.t = 0;
                this.pulse.gnd = Math.min(1, this.pulse.gnd + 0.08);
                this.fx.add({ type: 'heat', x: p.x, y: p.y + 10, r1: 22, dur: 0.9 });
              }
            } else {
              p.state = 1;
              p.t = 0;
              this.pulse[p.fate] = Math.min(1, this.pulse[p.fate] + 0.25);
              this.fx.add({ type: 'heat', x: p.x, y: p.y, r1: 20, dur: 0.9 });
            }
          }
        } else if (p.state === 1) {
          // 흡수: 물질 속으로 들어가며 빛 → 열
          p.t += dt;
          p.x += p.vx * dt * 0.15;
          p.y += p.vy * dt * 0.15;
          const k = p.t / 0.5;
          p.a = Math.max(0, 1 - k);
          p.col = [255, Math.round(SR.lerp(p.col[1], 140, 0.1)), Math.round(SR.lerp(p.col[2], 60, 0.1))];
          if (k >= 1) continue;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y < -20) continue;
        }
        if (p.x > SCENE_W + 20) continue;
        keep.push(p);
      }
      this.ph = keep;
      this.fx.update(dt);
    },

    /* ---------------- 그리기 ---------------- */
    lx(l) { return GX + (Math.log(l / L0) / Math.log(L1 / L0)) * GW; },

    drawBackground(c) {
      const g = c.createLinearGradient(0, 0, 0, SR.H);
      g.addColorStop(0, '#040915');
      g.addColorStop(0.3, '#0a1734');
      g.addColorStop(0.75, '#16335f');
      g.addColorStop(1, '#1d3f6e');
      c.fillStyle = g;
      c.fillRect(0, 0, SCENE_W, SR.H);
      SR.drawStars(c, 3, 50, SCENE_W, 100);
      // 오존층
      const og = c.createLinearGradient(0, OZ.y0, 0, OZ.y1);
      og.addColorStop(0, 'rgba(244,114,182,0)');
      og.addColorStop(0.5, 'rgba(244,114,182,0.2)');
      og.addColorStop(1, 'rgba(244,114,182,0)');
      c.fillStyle = og;
      c.fillRect(0, OZ.y0, SCENE_W, OZ.y1 - OZ.y0);
      // 수증기(아래로 갈수록 많음)
      const wg = c.createLinearGradient(0, WV.y0, 0, WV.y1);
      wg.addColorStop(0, 'rgba(103,232,249,0)');
      wg.addColorStop(1, `rgba(103,232,249,${0.08 + 0.1 * (this.s.h2o / 100)})`);
      c.fillStyle = wg;
      c.fillRect(0, WV.y0, SCENE_W, WV.y1 - WV.y0 + 20);
      // 지표
      const gg = c.createLinearGradient(0, GND, 0, SR.H);
      gg.addColorStop(0, '#5a4630');
      gg.addColorStop(0.15, '#3f3122');
      gg.addColorStop(1, '#1d160f');
      c.fillStyle = gg;
      c.fillRect(0, GND, SCENE_W, SR.H - GND);
      c.fillStyle = 'rgba(120,170,90,0.55)';
      c.fillRect(0, GND - 3, SCENE_W, 5);
      // 그래프 영역 바탕
      c.fillStyle = '#071025';
      c.fillRect(SCENE_W, 0, SR.W - SCENE_W, SR.H);
      c.fillStyle = 'rgba(150,180,230,0.15)';
      c.fillRect(SCENE_W, 0, 1.5, SR.H);
    },

    drawMolecules(ctx) {
      const t = this.anim;
      const amp = (k) => 0.6 + this.T[k] * 0.45 + this.pulse[k] * 3;
      const ao = amp('o3'), ah = amp('h2o'), ag = amp('gnd');
      const sO = this.s.o3 / 100, sH = this.s.h2o / 100;
      // 오존 O₃
      const nO = Math.round(this.mol.o3.length * Math.min(1, sO / 1.0) * (sO > 1 ? 1 : 1));
      const extraO = sO > 1;
      this.mol.o3.forEach((m, i) => {
        if (i >= nO && !extraO) return;
        const x = m.x + Math.sin(t * 9 + m.ph) * ao, y = m.y + Math.cos(t * 11 + m.ph) * ao;
        const a = extraO ? 0.85 : 0.75;
        ctx.fillStyle = `rgba(244,140,195,${a})`;
        for (let j = 0; j < 3; j++) {
          const an = m.r + j * 2.094 + Math.sin(t * 13 + m.ph) * 0.08 * ao;
          ctx.beginPath(); ctx.arc(x + Math.cos(an) * 3.4, y + Math.sin(an) * 3.4, 2.4, 0, 6.2832); ctx.fill();
        }
      });
      if (sO > 1) {
        // 추가 분자
        const extra = Math.round(this.mol.o3.length * (sO - 1));
        for (let i = 0; i < extra; i++) {
          const m = this.mol.o3[i];
          const x = m.x + 17 + Math.sin(t * 8 + m.ph * 2) * ao, y = m.y + 9 + Math.cos(t * 10 + m.ph) * ao;
          ctx.fillStyle = 'rgba(244,140,195,0.75)';
          for (let j = 0; j < 3; j++) { const an = m.r * 2 + j * 2.094; ctx.beginPath(); ctx.arc(x + Math.cos(an) * 3.4, y + Math.sin(an) * 3.4, 2.4, 0, 6.2832); ctx.fill(); }
        }
      }
      // 수증기 H₂O
      const nH = Math.round(this.mol.h2o.length * Math.min(1, sH));
      const drawH = (x, y, r) => {
        ctx.fillStyle = 'rgba(103,232,249,0.85)';
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(235,245,255,0.85)';
        ctx.beginPath(); ctx.arc(x + Math.cos(r) * 5, y + Math.sin(r) * 5, 2, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(x + Math.cos(r + 1.82) * 5, y + Math.sin(r + 1.82) * 5, 2, 0, 6.2832); ctx.fill();
      };
      this.mol.h2o.forEach((m, i) => {
        if (i >= nH) return;
        drawH(m.x + Math.sin(t * 8 + m.ph) * ah, m.y + Math.cos(t * 9.5 + m.ph) * ah, m.r + Math.sin(t * 12 + m.ph) * 0.1 * ah);
      });
      if (sH > 1) {
        const extra = Math.round(this.mol.h2o.length * (sH - 1));
        for (let i = 0; i < extra; i++) {
          const m = this.mol.h2o[i];
          drawH(m.x + 13 + Math.sin(t * 7 + m.ph * 2) * ah, m.y - 11 + Math.cos(t * 9 + m.ph) * ah, m.r * 1.7);
        }
      }
      // 지표 입자
      const warm = SR.clamp(this.T.gnd / 25, 0, 1);
      ctx.fillStyle = `rgba(${Math.round(150 + 105 * warm)},${Math.round(120 + 20 * warm)},${Math.round(90 - 40 * warm)},0.7)`;
      for (const m of this.mol.gnd) {
        const x = m.x + Math.sin(t * 10 + m.ph) * ag * 0.6, y = m.y + Math.cos(t * 12 + m.ph) * ag * 0.6;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.2832); ctx.fill();
      }
    },

    drawThermo(ctx, x, yc, key, label) {
      const T = this.T[key];
      const h = 76, top = yc - h / 2;
      const col = COL[key === 'gnd' ? 'gnd' : key];
      ctx.fillStyle = 'rgba(4,10,24,0.7)';
      SR.roundRect(ctx, x - 64, top - 26, 128, h + 46, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      SR.roundRect(ctx, x - 6, top, 12, h, 6); ctx.fill();
      ctx.beginPath(); ctx.arc(x, top + h + 6, 10, 0, 6.2832); ctx.fill();
      const f = SR.clamp(T / 25, 0, 1);
      ctx.fillStyle = '#ff6b3d';
      ctx.fillRect(x - 3.5, top + h - (h - 6) * f - 2, 7, (h - 6) * f + 6);
      ctx.beginPath(); ctx.arc(x, top + h + 6, 7.5, 0, 6.2832); ctx.fill();
      SR.label(ctx, label, x, top - 9, { size: 14, align: 'center', color: SR.css(col) });
      SR.label(ctx, `+${T.toFixed(1)}`, x + 14, top + h * 0.45, { size: 19, weight: 800, color: '#ffd2b8' });
      SR.label(ctx, '°C', x + 14, top + h * 0.45 + 18, { size: 13, color: '#ffd2b8' });
    },

    drawSpectrum(ctx) {
      const y0 = SP.y0, y1 = SP.y1, H = y1 - y0;
      const X = (l) => this.lx(l);
      const Y = (v) => y1 - v * H * 0.92;
      SR.label(ctx, '파장별 태양 복사 에너지 (단순화한 스펙트럼)', GX, 30, { size: 16, weight: 700 });
      // 파장 영역 띠
      const regions = [['uv', 200, 400, 'rgba(196,160,255,0.10)', '자외선'], ['vis', 400, 700, 'rgba(255,255,255,0.05)', '가시광선'], ['ir', 700, 2500, 'rgba(255,80,110,0.07)', '적외선']];
      regions.forEach(([k, a, b, c, n]) => {
        ctx.fillStyle = c;
        ctx.fillRect(X(a), y0, X(b) - X(a), H);
        SR.label(ctx, n, (X(a) + X(b)) / 2, y0 + 16, { size: 13, align: 'center', color: 'rgba(220,230,250,0.75)' });
      });
      // 가시광선 무지개 띠
      for (let l = 400; l < 700; l += 5) {
        ctx.fillStyle = SR.css(SR.waveColor(l), 0.9);
        ctx.fillRect(X(l), y1 + 2, X(l + 5) - X(l) + 0.5, 5);
      }
      const cv = this.curve;
      const fillBetween = (fa, fb, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        cv.forEach((p, i) => (i ? ctx.lineTo(X(p.l), Y(fa(p))) : ctx.moveTo(X(p.l), Y(fa(p)))));
        for (let i = cv.length - 1; i >= 0; i--) ctx.lineTo(X(cv[i].l), Y(fb(cv[i])));
        ctx.closePath();
        ctx.fill();
      };
      fillBetween((p) => p.sf, () => 0, 'rgba(214,161,90,0.35)');
      fillBetween((p) => p.top, (p) => p.ao, SR.css(COL.o3, 0.8));
      fillBetween((p) => p.ao, (p) => p.sf, SR.css(COL.h2o, 0.7));
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255,230,160,0.95)';
      ctx.beginPath();
      cv.forEach((p, i) => (i ? ctx.lineTo(X(p.l), Y(p.top)) : ctx.moveTo(X(p.l), Y(p.top))));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f2d39a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      cv.forEach((p, i) => (i ? ctx.lineTo(X(p.l), Y(p.sf)) : ctx.moveTo(X(p.l), Y(p.sf))));
      ctx.stroke();
      // 선택하지 않은 영역 흐리게
      const b = BAND[this.s.band];
      if (this.s.band !== 'all') {
        ctx.fillStyle = 'rgba(7,16,37,0.72)';
        if (b.lo > L0) ctx.fillRect(X(L0), y0, X(b.lo) - X(L0), H + 8);
        if (b.hi < L1) ctx.fillRect(X(b.hi), y0, X(L1) - X(b.hi), H + 8);
      }
      // 축
      ctx.strokeStyle = 'rgba(200,215,240,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(GX, y0); ctx.lineTo(GX, y1); ctx.lineTo(GX + GW, y1); ctx.stroke();
      [0.2, 0.3, 0.4, 0.5, 0.7, 1, 1.5, 2, 2.5].forEach((u) => {
        const x = X(u * 1000);
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y1 + 10); ctx.stroke();
        SR.label(ctx, String(u), x, y1 + 26, { size: 13, align: 'center', color: 'rgba(210,222,240,0.85)' });
      });
      SR.label(ctx, '파장(μm)', GX + GW, y1 + 44, { size: 13, align: 'right', color: 'rgba(210,222,240,0.85)' });
      SR.label(ctx, '세기', GX - 8, y0 + 6, { size: 12, align: 'right', color: 'rgba(210,222,240,0.7)' });
      // 범례
      const lg = [['- - 대기 밖', 'rgba(255,230,160,0.95)'], ['오존 흡수', SR.css(COL.o3)], ['수증기 흡수', SR.css(COL.h2o)], ['지표 도달', '#e7c58c']];
      const lx = GX + GW * 0.7;
      lg.forEach(([n, c], i) => {
        const yy = y0 + 40 + i * 20;
        if (i) { ctx.fillStyle = c; ctx.fillRect(lx, yy - 9, 12, 10); }
        SR.label(ctx, n, lx + (i ? 18 : 0), yy, { size: 13, color: c });
      });
    },

    drawTempGraph(ctx) {
      const y0 = TG.y0, y1 = TG.y1, H = y1 - y0;
      SR.label(ctx, '온도 변화 ΔT (단순화 모형)', GX, y0 - 18, { size: 16, weight: 700 });
      const hist = this.hist;
      const tNow = this.time;
      const win = 60;
      const t0 = Math.max(0, tNow - win);
      const maxT = Math.max(5, Math.ceil((Math.max(...hist.map((h) => Math.max(h.gnd, h.h2o, h.o3))) + 1) / 5) * 5);
      const X = (t) => GX + ((t - t0) / win) * GW;
      const Y = (v) => y1 - (v / maxT) * H;
      ctx.strokeStyle = 'rgba(200,215,240,0.12)';
      ctx.lineWidth = 1;
      for (let v = 0; v <= maxT; v += maxT / 5) {
        ctx.beginPath(); ctx.moveTo(GX, Y(v)); ctx.lineTo(GX + GW, Y(v)); ctx.stroke();
        SR.label(ctx, `+${Math.round(v)}`, GX - 6, Y(v) + 4, { size: 12, align: 'right', color: 'rgba(210,222,240,0.7)' });
      }
      ctx.strokeStyle = 'rgba(200,215,240,0.5)';
      ctx.beginPath(); ctx.moveTo(GX, y0); ctx.lineTo(GX, y1); ctx.lineTo(GX + GW, y1); ctx.stroke();
      for (let s = Math.ceil(t0 / 10) * 10; s <= t0 + win; s += 10) {
        SR.label(ctx, `${s}`, X(s), y1 + 18, { size: 12, align: 'center', color: 'rgba(210,222,240,0.7)' });
      }
      SR.label(ctx, '모형 시간(초)', GX + GW, y1 + 36, { size: 13, align: 'right', color: 'rgba(210,222,240,0.85)' });
      const lines = [['gnd', '지표'], ['h2o', '수증기층'], ['o3', '오존층']];
      lines.forEach(([k, n]) => {
        ctx.strokeStyle = SR.css(COL[k]);
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        let started = false;
        for (const h of hist) {
          if (h.t < t0) continue;
          const x = X(h.t), y = Y(h[k]);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.lineTo(X(tNow), Y(this.T[k]));
        ctx.stroke();
        SR.label(ctx, `${n} +${this.T[k].toFixed(1)}°C`, Math.min(X(tNow) + 6, GX + GW - 4), Y(this.T[k]) - 6, { size: 13, align: X(tNow) > GX + GW - 120 ? 'right' : 'left', color: SR.css(COL[k]) });
      });
    },

    draw(ctx) {
      const key = this.s.h2o + '|' + this.s.o3;
      if (this.bgKey !== key || !this.bg || this.bg.ps !== this.app.ps) {
        this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
        this.bgKey = key;
      }
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, SCENE_W, SR.H); ctx.clip();
      // 데워진 정도 표시
      const glow = (y0, y1, T, pulse) => {
        const a = SR.clamp(T / 25, 0, 1) * 0.35 + pulse * 0.12;
        if (a <= 0.01) return;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(255,120,50,0)');
        g.addColorStop(0.5, `rgba(255,120,50,${a})`);
        g.addColorStop(1, 'rgba(255,120,50,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y0, SCENE_W, y1 - y0);
      };
      glow(OZ.y0, OZ.y1, this.T.o3, this.pulse.o3);
      glow(WV.y0 + 80, WV.y1 + 10, this.T.h2o, this.pulse.h2o);
      glow(GND - 10, SR.H, this.T.gnd, this.pulse.gnd);
      this.drawMolecules(ctx);
      SR.drawSun(ctx, 54, 34, 24);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.ph) SR.drawPhoton(ctx, p);
      this.fx.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';
      SR.label(ctx, '오존층 (성층권)', 14, OZ.y0 - 6, { size: 16, color: SR.css(COL.o3) });
      SR.label(ctx, '수증기 (대류권, 지표 가까이에 많음)', 14, WV.y0 + 4, { size: 16, color: SR.css(COL.h2o) });
      SR.label(ctx, '지표', 14, GND + 22, { size: 16, color: '#f0d7ad' });
      // 범례: 빛 종류
      SR.label(ctx, '··· 자외선', 96, 30, { size: 14, color: '#c9a8ff' });
      SR.label(ctx, '── 가시광선', 190, 30, { size: 14, color: '#bfe6ff' });
      SR.label(ctx, '- - 적외선', 300, 30, { size: 14, color: '#ff7a98' });
      SR.label(ctx, '(자외선·적외선은 눈에 보이지 않지만 색으로 구분해 표시)', 96, 52, { size: 12, color: 'rgba(210,222,240,0.7)' });
      ctx.restore();
      this.drawThermo(ctx, 618, (OZ.y0 + OZ.y1) / 2 + 2, 'o3', '오존층');
      this.drawThermo(ctx, 618, 420, 'h2o', '수증기층');
      this.drawThermo(ctx, 618, 600, 'gnd', '지표');
      this.drawSpectrum(ctx);
      this.drawTempGraph(ctx);
      SR.label(ctx, '층의 높이·두께는 실제 비율이 아닙니다', SCENE_W - 8, SR.H - 8, { size: 12, align: 'right', color: 'rgba(230,220,200,0.7)' });
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
