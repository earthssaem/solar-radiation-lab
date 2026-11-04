/* =========================================================
   ① 산란 — 태양 고도·먼지 양에 따른 파장별 산란과 하늘·태양의 색
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;
  const D = SR.D2R;

  // 단면 모식도의 기하 (대기 두께는 과장)
  const GY = 590;            // 관측자 발밑 지표 높이
  const R = 760;             // 지구 반지름(그림)
  const CX = 800, CY = GY + R;
  const HA = 230;            // 대기 두께(그림)
  const RA = R + HA;
  const E = { x: 800, y: GY - 28 }; // 관측자의 눈

  const BANDS = [
    { key: 'b', name: '파란빛', lam: 450, col: [80, 150, 255] },
    { key: 'g', name: '초록빛', lam: 550, col: [90, 240, 120] },
    { key: 'r', name: '빨간빛', lam: 650, col: [255, 85, 60] },
  ];
  const SPEED = 330; // px/s
  const VIEW = { x: 812, y: 14, w: 374, h: 196, pw: 88, ph: 46, fovH: 76 };
  const LAM = SR.LAM;

  const M = {
    id: 'scatter',
    title: '산란',
    accent: SR.ACCENT.scatter,
    defaults: { h: 40, aer: 15, sight: 'sky', sightEl: 50 },

    principle: [
      '햇빛(백색광)은 여러 파장의 빛이 섞여 있고, 공기 분자는 파장이 짧은 빛일수록 강하게 산란시킨다(약 파장⁴에 반비례).',
      '햇빛이 대기를 지나는 동안 파란빛이 사방으로 흩어지고, 그중 관측자 쪽으로 산란된 빛이 하늘 여러 방향에서 눈에 들어온다.',
      '그래서 낮에는 하늘이 파랗게 보이고, 태양이 낮아 대기를 지나는 거리가 길어지면 파란빛이 대부분 빠져나가 태양이 붉게 보인다.',
    ],

    principleBasic: [
      '햇빛(백색광)에는 여러 색의 빛이 섞여 있고, 공기 분자는 파장이 짧은 파란빛을 더 강하게 산란시킨다.',
      '산란된 파란빛이 하늘 여러 방향에서 관측자의 눈에 들어온다 → 하늘이 파랗게 보인다.',
      '태양이 낮으면 빛이 대기를 더 길게 지나 파란빛이 많이 빠져나가고, 남은 빛 때문에 태양이 붉게 보인다.',
    ],

    sightMode() { return this.lv === 'basic' ? 'sky' : this.s.sight; },

    setLevel(lv) {
      this.lv = lv;
      this.ph = [];
      this.fx.clear();
      this.recompute();
      this.app.markDirty();
    },

    quiz: {
      q: '태양의 고도를 낮추면 태양이 붉게 보이는 이유는 무엇일까?',
      hint: '태양 고도를 낮추며 ‘대기 통과 거리’와 태양빛에 남은 색을 비교해 보세요.',
      options: [
        '대기를 지나는 거리가 길어져 파란빛이 도중에 더 많이 산란되어 빠지기 때문',
        '저녁에는 태양이 붉은빛을 더 많이 내보내기 때문',
        '붉은빛이 파란빛보다 공기 분자에 더 강하게 산란되기 때문',
      ],
      answer: 0,
      explain: () => {
        const m = SR.airMass(5).toFixed(1);
        const tb = Math.round(Math.exp(-SR.tauRayleigh(450) * SR.airMass(5)) * 100);
        const tr = Math.round(Math.exp(-SR.tauRayleigh(650) * SR.airMass(5)) * 100);
        return `태양 고도가 5°이면 햇빛이 대기를 지나는 거리는 태양이 머리 위에 있을 때의 약 ${m}배입니다. ` +
          `공기 분자만 고려하면 이 경로에서 파란빛(450 nm)은 약 ${tb}%만, 빨간빛(650 nm)은 약 ${tr}%가 산란되지 않고 남습니다. ` +
          `태양 자체의 색이 바뀌는 것이 아니라, 파장이 짧은 빛이 도중에 더 많이 산란되어 빠져나가기 때문에 붉게 보입니다.`;
      },
    },

    init(app) {
      this.app = app;
      this.s = { ...this.defaults, show: { b: true, g: true, r: true } };
      this.lv = app.level;
      this.fx = new SR.Effects();
      this.view = SR.makeCanvas(VIEW.pw, VIEW.ph);
      this.buildPanel();
      this.recompute();
      this.reset();
    },

    reset() {
      this.ph = [];
      this.fx.clear();
      this.acc = 0;
      this.accObs = 0;
      this.accSky = 0.5;
      this.eyeHits = [0, 0, 0];
      this.eyeFlash = 0;
      this.t = 0;
    },

    restoreDefaults() {
      this.ctl.h.set(this.defaults.h, true);
      this.ctl.aer.set(this.defaults.aer, true);
      this.ctl.sightEl.set(this.defaults.sightEl, true);
      this.ctl.sight.set(this.defaults.sight, true);
      Object.assign(this.s, this.defaults);
      this.change = '';
      this.onChange();
    },

    /* ---------------- 조절 패널 ---------------- */
    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      const s1 = ui.section('조건 바꾸기');
      this.ctl = {};
      this.ctl.h = ui.slider({
        label: '태양 고도', min: 2, max: 90, value: this.s.h, unit: '°',
        ends: ['지평선 부근', '머리 위'],
        onInput: (v, base) => {
          this.s.h = v;
          this.change = this.describeChange('h', base, v);
          this.onChange();
        },
      });
      this.ctl.aer = ui.slider({
        label: '먼지·에어로졸 양', min: 0, max: 100, value: this.s.aer,
        fmt: (v) => (v < 10 ? '매우 맑음' : v < 35 ? '보통' : v < 70 ? '뿌연 편' : '매우 뿌염'),
        ends: ['맑은 날', '뿌연 날'],
        onInput: (v, base) => {
          this.s.aer = v;
          this.change = this.describeChange('aer', base, v);
          this.onChange();
        },
      });
      this.ctl.sight = ui.segmented({
        label: '관측자가 보는 방향',
        value: this.s.sight,
        options: [
          { value: 'sky', label: '하늘 보기' },
          { value: 'sun', label: '태양 보기' },
        ],
        onChange: (v) => {
          this.s.sight = v;
          this.ctl.sightEl.el.style.display = v === 'sky' ? '' : 'none';
          this.change = v === 'sky'
            ? '시선을 태양 반대쪽 하늘로 돌렸습니다. 이제 눈에는 공기 분자가 산란시킨 빛만 들어옵니다.'
            : '시선을 태양으로 돌렸습니다. 이제 눈에는 산란되지 않고 대기를 통과한 햇빛이 직접 들어옵니다.';
          this.ph = this.ph.filter((q) => q.state !== 2);
          this.eyeHits = [0, 0, 0];
          this.onChange();
        },
      });
      this.ctl.sightEl = ui.slider({
        label: '시선 고도 (태양 반대쪽)', min: 8, max: 90, value: this.s.sightEl, unit: '°',
        ends: ['지평선 쪽', '머리 위'],
        onInput: (v, base) => {
          this.s.sightEl = v;
          this.change = this.describeChange('sightEl', base, v);
          this.ph = this.ph.filter((q) => q.state !== 2);
          this.onChange();
        },
      });
      this.ctl.show = ui.chips({
        label: '표시할 빛',
        options: BANDS.map((b) => ({ value: b.key, label: `${b.name} ${b.lam}`, color: `rgb(${b.col})` })),
        hint: '백색광은 여러 파장의 빛이 섞인 것입니다. 여기서는 대표로 세 파장(nm)의 빛을 따로 보여 줍니다.',
        onChange: (st) => {
          this.s.show = st;
          this.app.markDirty();
        },
      });
      [this.ctl.aer, this.ctl.sight, this.ctl.sightEl, this.ctl.show].forEach((c) => c.el.classList.add('adv-only'));
      const bh = SR.el('p', 'ctl-hint basic-only', '태양 고도만 바꾸며 대기 통과 거리, 태양의 색, 하늘의 색을 관찰하세요.');
      s1.append(this.ctl.h.el, bh, this.ctl.aer.el, this.ctl.sight.el, this.ctl.sightEl.el, this.ctl.show.el);

      const s2 = ui.section('측정값', '<span class="adv-only">공기 분자 + 먼지에 의한 산란만 계산한 값 (실제 공기량·광학적 두께 사용)</span>');
      this.ro = {};
      const am = SR.el('div', 'ro-big');
      am.innerHTML = '<span class="ro-k">대기 통과 거리</span><span class="ro-v" data-k="am"></span><span class="ro-u">태양이 머리 위일 때의 배수</span>';
      this.ro.am = am.querySelector('[data-k=am]');
      const tb = SR.el('div', 'ro-bars');
      tb.innerHTML = '<div class="ro-k">태양에서 직접 도달하는 빛 (산란되지 않고 남은 비율)</div>' +
        BANDS.map((b) => `<div class="bar-row"><span class="bar-name">${b.name}</span><span class="bar"><i data-b="${b.key}" style="background:rgb(${b.col})"></i></span><span class="bar-num" data-n="${b.key}"></span></div>`).join('');
      this.ro.bars = tb;
      tb.classList.add('adv-only');
      const sw = SR.el('div', 'ro-swatches');
      sw.innerHTML = '<div><i data-sw="sun"></i><span>태양의 색</span></div><div><i data-sw="sky"></i><span data-sw-l="sky">시선 방향 하늘색</span></div>';
      this.ro.sw = sw;
      sw.classList.add('adv-only');
      s2.append(am, tb, sw);

      const s3 = SR.el('div', 'pnl-foot adv-only');
      s3.appendChild(ui.button('조건 기본값으로', () => this.restoreDefaults(), 'btn-ghost'));
      p.append(s1, s2, s3);
      this.panel = p;
    },

    onChange() {
      this.recompute();
      this.app.markDirty();
      this.app.refreshLive();
    },

    /* ---------------- 물리량 계산 ---------------- */
    recompute() {
      const s = this.s;
      const h = s.h;
      this.ms = SR.airMass(h);
      this.beta = 0.006 * s.aer;
      this.u = [-Math.cos(h * D), -Math.sin(h * D)]; // 관측자 → 태양
      this.d = [-this.u[0], -this.u[1]];               // 햇빛 진행 방향
      this.n = [-this.d[1], this.d[0]];
      this.tExit = SR.rayCircle(E.x, E.y, this.u[0], this.u[1], CX, CY, RA)[1];
      const sd = this.tExit + 78;
      this.S = { x: E.x + this.u[0] * sd, y: E.y + this.u[1] * sd };
      this.entry = { x: E.x + this.u[0] * this.tExit, y: E.y + this.u[1] * this.tExit };

      this.tauR = BANDS.map((b) => SR.tauRayleigh(b.lam));
      this.tauA = BANDS.map((b) => SR.tauAerosol(b.lam, this.beta));
      this.tau = BANDS.map((b, i) => this.tauR[i] + this.tauA[i]);
      this.fracAer = this.tau.map((t, i) => this.tauA[i] / t);
      this.trans = this.tau.map((t) => Math.exp(-t * this.ms));

      // 스펙트럼 단위 계산
      this.lt = LAM.map((l) => {
        const r = SR.tauRayleigh(l), a = SR.tauAerosol(l, this.beta);
        return [r, a, r + a];
      });
      const sunSpec = LAM.map((l, i) => SR.SUN_SPEC[i] * Math.exp(-this.lt[i][2] * this.ms));
      this.sunLin = SR.specToLin(sunSpec);
      this.sunLum = SR.lum(this.sunLin);
      this.sunCol = SR.linTo255(SR.normMax(this.sunLin));
      this.exposure = 52 / Math.sqrt(Math.max(0.12, this.sunLum));
      this.s3 = [Math.cos(h * D), 0, Math.sin(h * D)];

      // 시선
      if (this.sightMode() === 'sky') {
        const e = s.sightEl * D;
        this.v = [Math.cos(e), -Math.sin(e)];
        this.v3 = [-Math.cos(e), 0, Math.sin(e)];
      } else {
        this.v = this.u.slice();
        this.v3 = this.s3.slice();
      }
      this.tSight = SR.rayCircle(E.x, E.y, this.v[0], this.v[1], CX, CY, RA)[1];
      this.sightEnd = { x: E.x + this.v[0] * this.tSight, y: E.y + this.v[1] * this.tSight };
      // 기본 모드: 시선 위의 한 점 P를 지나는 대표 광선
      const tp = this.tSight * 0.58;
      this.P = { x: E.x + this.v[0] * tp, y: E.y + this.v[1] * tp };
      this.skyLin = this.skyRadiance(this.v3);
      const skyDir = this.sightMode() === 'sky' ? this.v3 : [-Math.cos(60 * D), 0, Math.sin(60 * D)];
      this.skyRef = SR.linTo255(SR.tonemap(this.skyRadiance(skyDir), this.exposure));
      this.skyCol = this.sightMode() === 'sky' ? SR.linTo255(SR.tonemap(this.skyLin, this.exposure)) : this.sunCol;
      this.zenCol = SR.linTo255(SR.tonemap(this.skyRadiance([-0.05, 0, 0.9987]), this.exposure));

      // 관측자 레이 경로의 색(경로를 따라 바뀌는 투과광의 색)
      this.pathCols = [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const sp = LAM.map((l, i) => SR.SUN_SPEC[i] * Math.exp(-this.lt[i][2] * this.ms * f));
        return SR.linTo255(SR.normMax(SR.specToLin(sp)));
      });

      this.renderView();
      this.bgKey = null;
      this.updateReadouts();
    },

    // 단일 산란 하늘 복사휘도(평행평면 대기, 균일 혼합)
    skyRadiance(v3) {
      const el = Math.asin(SR.clamp(v3[2], -1, 1)) / D;
      if (el < 0) return [0, 0, 0];
      const mv = SR.airMass(el), ms = this.ms;
      const mu = v3[0] * this.s3[0] + v3[1] * this.s3[1] + v3[2] * this.s3[2];
      const pr = SR.phaseRayleigh(mu), pa = SR.phaseHG(mu, 0.7);
      const spec = new Array(LAM.length);
      for (let i = 0; i < LAM.length; i++) {
        const [tr, ta, t] = this.lt[i];
        const src = (tr * pr + ta * pa) / t;
        const f = Math.abs(ms - mv) < 1e-4 ? mv * t * Math.exp(-t * mv) : (mv * (Math.exp(-t * mv) - Math.exp(-t * ms))) / (ms - mv);
        spec[i] = (SR.SUN_SPEC[i] * src * f) / 12.566;
      }
      return SR.specToLin(spec);
    },

    // 관측자의 시야(1인칭) 그리기 — 각 화소 방향의 하늘 밝기를 계산
    renderView() {
      const c = this.view.getContext('2d');
      const W = VIEW.pw, H = VIEW.ph;
      const img = c.createImageData(W, H);
      const yaw = this.sightMode() === 'sky' ? Math.PI : 0;
      const pitch = (this.sightMode() === 'sky' ? this.s.sightEl : this.s.h) * D;
      const f = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
      const r = [-Math.sin(yaw), Math.cos(yaw), 0];
      const up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const th = Math.tan((VIEW.fovH / 2) * D), tv = th * (VIEW.h / VIEW.w);
      this.cam = { f, r, up, th, tv };
      const sunI = SR.lum(this.sunLin) * Math.max(0, Math.sin(this.s.h * D));
      const gnd = [0.05, 0.07, 0.035].map((v) => v * (0.25 + 2.2 * sunI));
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const x = ((i + 0.5) / W) * 2 - 1, y = 1 - ((j + 0.5) / H) * 2;
          let d0 = f[0] + x * th * r[0] + y * tv * up[0];
          let d1 = f[1] + x * th * r[1] + y * tv * up[1];
          let d2 = f[2] + x * th * r[2] + y * tv * up[2];
          const L = Math.hypot(d0, d1, d2);
          d0 /= L; d1 /= L; d2 /= L;
          let col;
          if (d2 < 0) {
            // 지면 — 지평선 근처는 대기 때문에 희미해짐
            const hz = this.skyRadiance([d0, d1, 0.01]);
            const k = Math.exp(d2 * 18);
            col = SR.tonemap([SR.lerp(gnd[0], hz[0], k), SR.lerp(gnd[1], hz[1], k), SR.lerp(gnd[2], hz[2], k)], this.exposure);
          } else {
            col = SR.tonemap(this.skyRadiance([d0, d1, d2]), this.exposure);
          }
          const lm = SR.lum(col);
          col = col.map((v) => SR.clamp(lm + (v - lm) * 1.25, 0, 1));
          const o = (j * W + i) * 4;
          img.data[o] = SR.gamma(col[0]) * 255;
          img.data[o + 1] = SR.gamma(col[1]) * 255;
          img.data[o + 2] = SR.gamma(col[2]) * 255;
          img.data[o + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
    },

    updateReadouts() {
      if (!this.ro) return;
      this.ro.am.textContent = '×' + this.ms.toFixed(1);
      BANDS.forEach((b, i) => {
        const pct = Math.round(this.trans[i] * 100);
        this.ro.bars.querySelector(`[data-b=${b.key}]`).style.width = pct + '%';
        this.ro.bars.querySelector(`[data-n=${b.key}]`).textContent = pct + '%';
      });
      this.ro.sw.querySelector('[data-sw=sun]').style.background = SR.css(this.sunCol);
      this.ro.sw.querySelector('[data-sw=sky]').style.background = SR.css(this.sightMode() === 'sky' ? this.skyCol : this.skyRef);
      this.ro.sw.querySelector('[data-sw-l=sky]').textContent = this.sightMode() === 'sky' ? '시선 방향 하늘색' : '태양 반대쪽 하늘색';
    },

    /* ---------------- 설명 문장 ---------------- */
    sunWord() {
      const r = this.trans[0] / this.trans[2];
      if (r > 0.8) return '흰색에 가까운 색';
      if (r > 0.58) return '약간 노르스름한 색';
      if (r > 0.3) return '주황빛';
      return '붉은빛';
    },
    skyWord(c) {
      const [r, g, b] = c;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = (mx - mn) / (mx || 1);
      if (mx < 70) return '어두운 색';
      if (b >= r && sat > 0.22) return '파란색';
      if (b >= r) return '희뿌연 파란색';
      if (r > b && sat > 0.25) return '노르스름하거나 주황빛';
      return '희뿌연 색';
    },
    describeChange(key, a, b) {
      if (a == null || a === b) return '';
      const st = { ...this.s };
      const calc = (o) => {
        const m = SR.airMass(o.h), beta = 0.006 * o.aer;
        const t = (l) => Math.exp(-(SR.tauRayleigh(l) + SR.tauAerosol(l, beta)) * m);
        return { m, tb: t(450), tr: t(650) };
      };
      if (key === 'h') {
        const A = calc({ ...st, h: a }), B = calc({ ...st, h: b });
        const down = b < a;
        return `태양 고도를 ${a}°→${b}°로 ${down ? '낮추자' : '높이자'} 햇빛이 대기를 지나는 거리가 ×${A.m.toFixed(1)} → ×${SR.j(B.m.toFixed(1), '로')} ${down ? '길어졌습니다' : '짧아졌습니다'}. ` +
          `그 결과 태양에서 직접 오는 파란빛은 ${Math.round(A.tb * 100)}% → ${Math.round(B.tb * 100)}%, 빨간빛은 ${Math.round(A.tr * 100)}% → ${Math.round(B.tr * 100)}%로 바뀌었습니다` +
          (down ? ' — 파란빛이 훨씬 크게 줄어듭니다.' : '.');
      }
      if (key === 'aer') {
        const more = b > a;
        return more
          ? '먼지·에어로졸을 늘리자 모든 파장의 빛이 비슷한 정도로 더 산란되었습니다. 태양은 더 흐려지고, 하늘은 파란색이 옅어져 희뿌옇게 변합니다.'
          : '먼지·에어로졸을 줄이자 공기 분자에 의한 산란이 주로 남아 하늘이 더 선명한 파란색이 됩니다.';
      }
      if (key === 'sightEl') {
        const low = b < a;
        return low
          ? `시선을 ${a}°→${b}°로 지평선 쪽으로 내리자 시선 방향의 대기가 두꺼워져, 여러 색의 산란광이 함께 들어와 하늘이 더 밝고 희게 보입니다.`
          : `시선을 ${a}°→${b}°로 올리자 시선 방향의 대기가 얇아져 하늘이 더 짙은 파란색으로 보입니다.`;
      }
      return '';
    },
    liveBasic() {
      const h = this.s.h;
      const more = this.ms >= 3;
      const t = `<b>태양 고도 ${h}°</b> → 햇빛이 대기를 지나는 거리 <b>×${this.ms.toFixed(1)}</b> → ` +
        (more ? '파란빛이 도중에 많이 산란되어 빠져나가고 ' : '파란빛이 일부만 산란되어 빠져나가고 ') +
        `태양은 <b>${this.sunWord()}</b>, 하늘은 산란된 빛 때문에 <b>${this.skyWord(this.skyCol)}</b>으로 보입니다.`;
      return { now: t, change: '' };
    },
    live() {
      const h = this.s.h;
      const tb = Math.round(this.trans[0] * 100), tr = Math.round(this.trans[2] * 100);
      let t = `<b>태양 고도 ${h}°</b>: 햇빛이 대기를 지나는 거리가 태양이 머리 위에 있을 때의 <b>${this.ms.toFixed(1)}배</b>입니다. ` +
        `이 경로를 지나는 동안 파란빛은 <b>${tb}%</b>, 빨간빛은 <b>${tr}%</b>가 산란되지 않고 남아 태양은 <b>${this.sunWord()}</b>으로 보입니다. `;
      if (this.sightMode() === 'sky') {
        t += `관측자는 ${this.s.sightEl}° 높이의 하늘을 보고 있어, 그 방향의 공기가 관측자 쪽으로 산란시킨 빛(대부분 파장이 짧은 빛)이 눈에 들어와 하늘이 <b>${this.skyWord(this.skyCol)}</b>으로 보입니다.`;
      } else {
        t += `관측자는 태양을 직접 보고 있어, 산란되지 않고 남은 빛이 그대로 눈에 들어옵니다.`;
      }
      if (this.s.aer >= 50) t += ' 먼지·에어로졸이 많아 파장과 관계없이 산란이 늘어나 하늘이 희뿌옇습니다.';
      return { now: t, change: this.change };
    },

    /* ---------------- 애니메이션 ---------------- */
    emit(onObs) {
      const keys = BANDS.map((b, i) => (this.s.show[b.key] ? i : -1)).filter((i) => i >= 0);
      const bi = keys[(Math.random() * keys.length) | 0];
      const d = this.d, n = this.n;
      const k = onObs ? 0 : SR.rand(-360, 330);
      const Qx = E.x + n[0] * k, Qy = E.y + n[1] * k;
      const back = 1700;
      const P0x = Qx - d[0] * back, P0y = Qy - d[1] * back;
      const a = SR.rayCircle(P0x, P0y, d[0], d[1], CX, CY, RA);
      if (!a) return;
      const tStart = back + ((this.S.x - Qx) * d[0] + (this.S.y - Qy) * d[1]);
      let tIn = Math.max(a[0], tStart), tOut = a[1];
      let tEnd = 1e9;
      if (onObs) { tOut = back; tEnd = back; }
      else {
        const g = SR.rayCircle(P0x, P0y, d[0], d[1], CX, CY, R);
        if (g && g[0] > tIn) { tOut = g[0]; tEnd = g[0]; }
      }
      const L = Math.max(1, tOut - tIn);
      const tau = this.tau[bi] * this.ms * (L / this.tExit);
      let tSc = Infinity, aer = false;
      const pr = 1 - Math.exp(-tau);
      if (Math.random() < pr) {
        tSc = tIn + (-Math.log(1 - Math.random() * pr) / tau) * L;
        aer = Math.random() < this.fracAer[bi];
      }
      this.ph.push({
        P0x, P0y, dist: tStart, tStart, tSc, tEnd, aer, bi, onObs,
        x: P0x + d[0] * tStart, y: P0y + d[1] * tStart,
        vx: 0, vy: 0, state: 0, life: 0, trail: [], col: BANDS[bi].col, a: 0, amax: onObs ? 1 : 0.42, w: onObs ? 2.2 : 1.3, r: onObs ? 2.6 : 1.7,
      });
    },

    scatter(p) {
      const d = this.d;
      p.state = 1;
      p.a = 0.85;
      p.w = 1.8;
      p.r = 2.3;
      let dir = null;
      if (p.toEye) {
        const ex = E.x - p.x, ey = E.y - p.y, L = Math.hypot(ex, ey);
        dir = [ex / L, ey / L];
        p.state = 2; p.a = 1; p.w = 2.6; p.r = 3;
      } else if (this.sightMode() === 'sky' && !p.noEye) {
        const dd = SR.distToSeg(p.x, p.y, E.x, E.y, this.sightEnd.x, this.sightEnd.y);
        if (dd < 26) {
          const ex = E.x - p.x, ey = E.y - p.y, L = Math.hypot(ex, ey);
          const mu = (ex * d[0] + ey * d[1]) / L;
          const w = p.aer ? Math.max(0.04, SR.phaseHG(mu, 0.7) / SR.phaseHG(1, 0.7)) : SR.phaseRayleigh(mu) / 1.5;
          if (Math.random() < w) {
            dir = [ex / L, ey / L];
            p.state = 2;
            p.a = 1;
            p.w = 2.4;
            p.r = 2.7;
          }
        }
      }
      if (!dir) {
        let th;
        if (p.aer) {
          const g = 0.7, xi = Math.random();
          const mu = (1 / (2 * g)) * (1 + g * g - Math.pow((1 - g * g) / (1 - g + 2 * g * xi), 2));
          th = Math.acos(SR.clamp(mu, -1, 1)) * (Math.random() < 0.5 ? -1 : 1);
        } else {
          do { th = Math.random() * 2 * Math.PI; } while (Math.random() * 2 > 1 + Math.cos(th) ** 2);
        }
        const c = Math.cos(th), s = Math.sin(th);
        dir = [d[0] * c - d[1] * s, d[0] * s + d[1] * c];
      }
      p.vx = dir[0] * SPEED;
      p.vy = dir[1] * SPEED;
      p.life = 0;
      p.trail.length = 0;
      const col = p.aer ? [215, 195, 160] : p.col;
      this.fx.add({ type: 'ring', x: p.x, y: p.y, col, r0: 2, r1: p.aer ? 12 : 10, dur: 0.4, lw: 1.4, a: p.aer ? 0.6 : 0.9 });
    },

    // 기본 모드: 같은 출발점에서 함께 출발하는 세 색(백색광) 묶음
    emitPacket(kind) {
      const d = this.d, n = this.n;
      const back = 1700;
      let Q, tEndBase;
      if (kind === 'obs') Q = E;
      else Q = this.P;
      const P0 = { x: Q.x - d[0] * back, y: Q.y - d[1] * back };
      const tStart = back + ((this.S.x - Q.x) * d[0] + (this.S.y - Q.y) * d[1]);
      const a = SR.rayCircle(P0.x, P0.y, d[0], d[1], CX, CY, RA);
      if (!a) return;
      const tIn = Math.max(a[0], tStart);
      if (kind === 'obs') tEndBase = back;
      else {
        const g = SR.rayCircle(P0.x, P0.y, d[0], d[1], CX, CY, R);
        tEndBase = g && g[0] > tIn ? g[0] : 1e9;
      }
      const tauB = this.tau[0];
      BANDS.forEach((b, bi) => {
        const off = (bi - 1) * 2.4;
        const ph = {
          P0x: P0.x + n[0] * off, P0y: P0.y + n[1] * off, dist: tStart, tStart, tSc: Infinity, tEnd: tEndBase, aer: false, bi, onObs: kind === 'obs',
          x: 0, y: 0, vx: 0, vy: 0, state: 0, life: 0, trail: [], col: b.col, a: 0, amax: 1, w: 2.4, r: 2.8, basic: true,
        };
        if (kind === 'obs') {
          // 실제 투과율과 같은 확률로 도중에 산란되어 빠져나감
          const L = back - tIn, tau = this.tau[bi] * this.ms;
          const pr = 1 - Math.exp(-tau);
          if (Math.random() < pr) ph.tSc = tIn + (-Math.log(1 - Math.random() * pr) / tau) * L;
          ph.noEye = true;
        } else {
          // P에서 관측자 쪽으로 산란될 확률 ∝ 광학적 두께(파란빛 기준 0.9)
          if (Math.random() < 0.9 * (this.tau[bi] / tauB)) { ph.tSc = back; ph.toEye = true; }
        }
        this.ph.push(ph);
      });
    },

    update(dt) {
      this.t += dt;
      if (this.lv === 'basic') {
        this.accObs += 0.75 * dt;
        while (this.accObs >= 1) { this.accObs -= 1; this.emitPacket('obs'); }
        this.accSky += 0.75 * dt;
        while (this.accSky >= 1) { this.accSky -= 1; this.emitPacket('sky'); }
      } else {
        this.acc += 60 * dt;
        while (this.acc >= 1) { this.acc -= 1; this.emit(false); }
        this.accObs += 12 * dt;
        while (this.accObs >= 1) { this.accObs -= 1; this.emit(true); }
      }
      const d = this.d;
      const keep = [];
      for (const p of this.ph) {
        if (!this.s.show[BANDS[p.bi].key]) continue;
        SR.pushTrail(p, p.basic ? 16 : p.state === 2 ? 10 : 7);
        if (p.state === 0) {
          p.dist += SPEED * dt;
          p.a = p.amax * Math.min(1, (p.dist - p.tStart) / 60);
          if (p.dist >= p.tSc) {
            p.x = p.P0x + d[0] * p.tSc;
            p.y = p.P0y + d[1] * p.tSc;
            this.scatter(p);
          } else if (p.dist >= p.tEnd) {
            if (p.onObs) this.hitEye(p, this.sightMode() === 'sun');
            else if (p.basic) this.fx.add({ type: 'ring', x: p.x, y: p.y, col: p.col, r0: 2, r1: 6, dur: 0.3, lw: 1.2, a: 0.5 });
            continue;
          } else {
            p.x = p.P0x + d[0] * p.dist;
            p.y = p.P0y + d[1] * p.dist;
          }
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life += dt;
          if (p.state === 2) {
            if (Math.hypot(p.x - E.x, p.y - E.y) < 6) { this.hitEye(p, true); continue; }
          } else {
            p.a = Math.max(0, 0.85 - p.life * (p.basic ? 0.9 : 0.4));
            if (p.a <= 0) continue;
            const dx = p.x - CX, dy = p.y - CY;
            if (dx * dx + dy * dy < R * R) continue;
          }
        }
        if (p.x < -30 || p.x > SR.W + 30 || p.y < -30 || p.y > SR.H + 30) continue;
        keep.push(p);
      }
      this.ph = keep;
      for (let i = 0; i < 3; i++) this.eyeHits[i] *= Math.exp(-dt / 1.6);
      this.eyeFlash = Math.max(0, this.eyeFlash - dt * 3);
      this.fx.update(dt);
    },

    hitEye(p, seen) {
      if (this.lv === 'basic') {
        this.fx.add({ type: 'ring', x: E.x, y: E.y, col: p.col, r0: 3, r1: 10, dur: 0.4, lw: 2 });
        return;
      }
      if (!seen) return;
      this.eyeHits[p.bi] += 1;
      this.eyeFlash = 1;
      this.fx.add({ type: 'ring', x: E.x, y: E.y, col: p.col, r0: 3, r1: 9, dur: 0.35, lw: 2 });
    },

    /* ---------------- 그리기 ---------------- */
    drawBackground(c) {
      // 우주
      const sky = c.createLinearGradient(0, 0, 0, SR.H);
      sky.addColorStop(0, '#040915');
      sky.addColorStop(1, '#0a1530');
      c.fillStyle = sky;
      c.fillRect(0, 0, SR.W, SR.H);
      SR.drawStars(c, 7, 160, SR.W, SR.H);
      // 대기(산란광으로 빛나는 정도를 하늘색으로 표현)
      const z = this.zenCol;
      const bright = SR.clamp(this.sunLum * 1.2, 0.4, 1);
      const ag = c.createRadialGradient(CX, CY, R, CX, CY, RA);
      ag.addColorStop(0, SR.css(z, 0.62 * bright));
      ag.addColorStop(0.45, SR.css(z, 0.32 * bright));
      ag.addColorStop(1, SR.css(z, 0.03));
      c.fillStyle = ag;
      c.beginPath();
      c.arc(CX, CY, RA, 0, 6.2832);
      c.fill();
      c.strokeStyle = 'rgba(160,200,255,0.5)';
      c.setLineDash([5, 6]);
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);
      // 공기 분자(작은 점)와 먼지(큰 점) — 고도가 높을수록 드묾
      const rnd = SR.rng(11);
      for (let i = 0; i < 520; i++) {
        const zz = -110 * Math.log(1 - rnd() * (1 - Math.exp(-HA / 110)));
        const th = (rnd() * 120 - 75) * D;
        const x = CX + (R + zz) * Math.sin(th), y = CY - (R + zz) * Math.cos(th);
        if (x < 0 || x > SR.W || y < 0 || y > SR.H) continue;
        c.fillStyle = 'rgba(200,225,255,0.38)';
        c.fillRect(x, y, 1.4, 1.4);
      }
      const nA = this.lv === 'basic' ? 0 : Math.round(this.s.aer * 1.7);
      const rnd2 = SR.rng(23);
      for (let i = 0; i < nA; i++) {
        const zz = -48 * Math.log(1 - rnd2() * (1 - Math.exp(-HA / 48)));
        const th = (rnd2() * 120 - 75) * D;
        const x = CX + (R + zz) * Math.sin(th), y = CY - (R + zz) * Math.cos(th);
        if (x < 0 || x > SR.W || y < 0 || y > SR.H) continue;
        c.fillStyle = 'rgba(214,190,150,0.6)';
        c.beginPath();
        c.arc(x, y, 1.8 + rnd2() * 1.4, 0, 6.2832);
        c.fill();
      }
      // 지구(지표)
      const lit = this.d;
      const gg = c.createLinearGradient(CX - lit[0] * R, CY - lit[1] * R, CX + lit[0] * R * 0.3, CY + lit[1] * R * 0.3);
      gg.addColorStop(0, '#3a6b45');
      gg.addColorStop(0.5, '#1d3a2a');
      gg.addColorStop(1, '#0c1a14');
      c.fillStyle = gg;
      c.beginPath();
      c.arc(CX, CY, R, 0, 6.2832);
      c.fill();
      c.strokeStyle = 'rgba(170,230,180,0.35)';
      c.lineWidth = 1.5;
      c.stroke();
    },

    draw(ctx) {
      const key = this.s.h + '|' + this.s.aer + '|' + this.sightMode() + '|' + this.s.sightEl + '|' + this.lv;
      if (this.bgKey !== key || !this.bg || this.bg.ps !== this.app.ps) {
        this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
        this.bgKey = key;
      }
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      const d = this.d, n = this.n;

      const basic = this.lv === 'basic';
      // 평행하게 들어오는 햇빛(희미한 선)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,248,225,0.06)';
      ctx.beginPath();
      for (let k = -340; k <= 320; k += basic ? 1e9 : 34) {
        const sx = this.S.x + n[0] * k, sy = this.S.y + n[1] * k;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + d[0] * 1400, sy + d[1] * 1400);
      }
      ctx.stroke();

      // 관측자에게 오는 햇빛 — 경로를 따라 색이 변함
      const gr = ctx.createLinearGradient(this.entry.x, this.entry.y, E.x, E.y);
      this.pathCols.forEach((c, i) => gr.addColorStop(i / 4, SR.css(c, 0.95)));
      ctx.strokeStyle = 'rgba(255,250,235,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.S.x, this.S.y);
      ctx.lineTo(this.entry.x, this.entry.y);
      ctx.stroke();
      ctx.strokeStyle = gr;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.entry.x, this.entry.y);
      ctx.lineTo(E.x, E.y);
      ctx.stroke();

      // 대기 통과 거리 표시
      const off = 20;
      const ax = this.entry.x - n[0] * off, ay = this.entry.y - n[1] * off;
      const bx = E.x - n[0] * off, by = E.y - n[1] * off;
      ctx.strokeStyle = SR.ACCENT.scatter;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.moveTo(ax + n[0] * 6, ay + n[1] * 6); ctx.lineTo(ax - n[0] * 6, ay - n[1] * 6);
      ctx.moveTo(bx + n[0] * 6, by + n[1] * 6); ctx.lineTo(bx - n[0] * 6, by - n[1] * 6);
      ctx.stroke();
      const mx = (ax + bx) / 2 - n[0] * 16, my = (ay + by) / 2 - n[1] * 16;
      SR.label(ctx, `대기 통과 거리 ×${this.ms.toFixed(1)}`, mx, my, { size: 18, color: SR.ACCENT.scatter, align: 'center', base: 'middle', bg: 'rgba(5,12,28,0.7)' });
      // 기준: 연직(머리 위) 경로
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(200,220,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(E.x + 46, E.y); ctx.lineTo(E.x + 46, GY - HA);
      ctx.stroke();
      ctx.setLineDash([]);
      SR.label(ctx, '×1', E.x + 52, GY - HA + 18, { size: 16, color: 'rgba(200,220,255,0.8)' });

      // 지평선과 고도각
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(230,240,255,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(E.x - 170, E.y); ctx.lineTo(E.x + 170, E.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(E.x, E.y, 64, Math.PI, Math.PI + this.s.h * D);
      ctx.stroke();
      const la = Math.PI + (this.s.h * D) / 2;
      SR.label(ctx, `${this.s.h}°`, E.x + Math.cos(la) * 86, E.y + Math.sin(la) * 86 + 5, { size: 17, color: '#ffe08a', align: 'center' });
      SR.label(ctx, '지평선', E.x + 176, E.y + 6, { size: 15, color: 'rgba(230,240,255,0.7)' });

      // 태양 (대기 밖에서는 백색광)
      SR.drawSun(ctx, this.S.x, this.S.y, 22, [255, 248, 230]);
      SR.label(ctx, '태양 (백색광)', this.S.x, this.S.y - 36, { size: 17, align: 'center', color: '#fff3cf' });

      if (basic) this.drawBasicPaths(ctx);
      // 시선
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.sightMode() === 'sky' ? 'rgba(140,210,255,0.9)' : 'rgba(255,220,150,0.9)';
      ctx.beginPath();
      ctx.moveTo(E.x, E.y);
      ctx.lineTo(this.sightEnd.x, this.sightEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (this.sightMode() === 'sky' && !basic) {
        ctx.fillStyle = 'rgba(120,200,255,0.07)';
        ctx.beginPath();
        const vx = this.v[0], vy = this.v[1];
        ctx.moveTo(E.x - vy * 3, E.y + vx * 3);
        ctx.lineTo(this.sightEnd.x - vy * 26, this.sightEnd.y + vx * 26);
        ctx.lineTo(this.sightEnd.x + vy * 26, this.sightEnd.y - vx * 26);
        ctx.lineTo(E.x + vy * 3, E.y - vx * 3);
        ctx.fill();
        SR.label(ctx, '시선', this.sightEnd.x + 8, this.sightEnd.y - 4, { size: 16, color: 'rgba(160,215,255,0.95)' });
      }

      // 빛 알갱이
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.ph) {
        if (!this.s.show[BANDS[p.bi].key]) continue;
        SR.drawPhoton(ctx, p);
      }
      this.fx.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';

      // 관측자
      SR.drawObserver(ctx, E.x, GY, 1, 1);
      const hits = this.eyeHits, tot = hits[0] + hits[1] + hits[2];
      if (tot > 0.15 && !basic) {
        let r = 0, g = 0, b = 0;
        BANDS.forEach((bd, i) => { r += bd.col[0] * hits[i]; g += bd.col[1] * hits[i]; b += bd.col[2] * hits[i]; });
        const m = Math.max(r, g, b);
        const col = [r / m * 255, g / m * 255, b / m * 255].map(Math.round);
        const a = SR.clamp(tot / 3, 0.25, 0.9);
        const eg = ctx.createRadialGradient(E.x, E.y, 0, E.x, E.y, 26);
        eg.addColorStop(0, SR.css(col, a));
        eg.addColorStop(1, SR.css(col, 0));
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(E.x, E.y, 26, 0, 6.2832); ctx.fill();
        SR.label(ctx, '눈에 들어오는 빛', E.x + 22, E.y - 22, { size: 15, color: SR.css(col) });
      }
      SR.label(ctx, '관측자', E.x + 12, GY + 22, { size: 16 });

      // 영역 이름
      SR.label(ctx, '우주', 24, 36, { size: 17, color: 'rgba(200,215,240,0.7)' });
      SR.label(ctx, '대기', 1040, 470, { size: 17, color: 'rgba(190,220,255,0.9)' });
      SR.label(ctx, '(두께는 과장)', 1040, 492, { size: 14, color: 'rgba(180,210,250,0.7)' });
      SR.label(ctx, '지표', E.x - 160, GY + 62, { size: 17, color: 'rgba(190,235,200,0.85)' });
      // 입자 범례
      ctx.fillStyle = 'rgba(200,225,255,0.9)';
      ctx.fillRect(24, SR.H - 56, 3, 3);
      SR.label(ctx, '공기 분자: 짧은 파장일수록 강하게 산란', 36, SR.H - 48, { size: 16, color: 'rgba(210,225,245,0.9)' });
      if (!basic) {
        ctx.fillStyle = 'rgba(214,190,150,0.9)';
        ctx.beginPath(); ctx.arc(26, SR.H - 25, 3.2, 0, 6.2832); ctx.fill();
        SR.label(ctx, '먼지·에어로졸: 파장 차이가 작고 주로 앞쪽으로 산란', 36, SR.H - 19, { size: 16, color: 'rgba(225,210,185,0.9)' });
        this.drawView(ctx);
      } else {
        SR.label(ctx, '파랑·초록·빨강 알갱이가 함께 출발한 것 = 백색광', 24, SR.H - 19, { size: 16, color: 'rgba(235,240,250,0.9)' });
        this.drawCard(ctx);
      }
    },

    // 기본 모드: 하늘빛이 눈에 들어오는 대표 경로
    drawBasicPaths(ctx) {
      const d = this.d, P = this.P;
      const back = ((this.S.x - P.x) * d[0] + (this.S.y - P.y) * d[1]);
      const sx = P.x + d[0] * back, sy = P.y + d[1] * back;
      ctx.strokeStyle = 'rgba(255,250,235,0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(P.x, P.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,210,0.16)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + d[0] * 160, P.y + d[1] * 160); ctx.stroke();
      ctx.setLineDash([]);
      // 산란 지점 → 눈
      ctx.strokeStyle = 'rgba(110,175,255,0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 6]);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(E.x + (P.x - E.x) * 0.06, E.y + (P.y - E.y) * 0.06); ctx.stroke();
      ctx.setLineDash([]);
      const an = Math.atan2(E.y - P.y, E.x - P.x);
      SR.arrowHead(ctx, E.x + (P.x - E.x) * 0.05, E.y + (P.y - E.y) * 0.05, an, 12, 'rgba(110,175,255,0.95)');
      ctx.strokeStyle = SR.ACCENT.scatter;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(P.x, P.y, 9, 0, 6.2832); ctx.stroke();
      SR.label(ctx, '산란 지점', P.x + 14, P.y - 12, { size: 16, color: SR.ACCENT.scatter, bg: 'rgba(5,12,28,0.7)' });
      const mx = (P.x + E.x) / 2, my = (P.y + E.y) / 2;
      SR.label(ctx, '산란된 파란빛 → 눈', mx + 16, my + 4, { size: 16, color: '#9cc8ff', bg: 'rgba(5,12,28,0.7)' });
    },

    // 기본 모드: 관측 결과(태양의 색 / 하늘의 색)
    drawCard(ctx) {
      const x = 880, y = 14, w = 306, h = 178;
      ctx.fillStyle = 'rgba(5,12,28,0.8)';
      SR.roundRect(ctx, x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(150,190,255,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      SR.label(ctx, '관측자에게 보이는 색', x + 14, y + 26, { size: 16, weight: 700 });
      const c1 = { x: x + 62, y: y + 82 }, c2 = { x: x + 228, y: y + 82 };
      const glow = SR.clamp(this.sunLum * 1.5, 0.4, 1);
      SR.drawSun(ctx, c1.x, c1.y, 24, this.sunCol, glow);
      const sky = this.skyCol;
      ctx.fillStyle = SR.css(sky);
      ctx.beginPath(); ctx.arc(c2.x, c2.y, 26, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
      SR.label(ctx, '태양', c1.x, y + 132, { size: 15, align: 'center' });
      SR.label(ctx, '하늘(태양 반대쪽)', c2.x, y + 132, { size: 15, align: 'center' });
      // 태양빛에 남은 색 (막대, 수치 없음)
      const bx = x + 26, by = y + 166;
      SR.label(ctx, '태양빛에 남은 색', bx - 12, by + 1, { size: 12, color: 'rgba(210,222,240,0.8)' });
      BANDS.forEach((b, i) => {
        const hh = 22 * this.trans[i];
        ctx.fillStyle = SR.css(b.col, 0.95);
        ctx.fillRect(bx + 100 + i * 14, by - hh, 10, hh);
      });
    },

    drawView(ctx) {
      const { x, y, w, h } = VIEW;
      ctx.save();
      SR.roundRect(ctx, x, y, w, h, 10);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.view, x, y, w, h);
      // 시야 안의 태양
      const cam = this.cam, s = this.s3;
      const sf = s[0] * cam.f[0] + s[1] * cam.f[1] + s[2] * cam.f[2];
      if (sf > 0.05) {
        const px = (s[0] * cam.r[0] + s[1] * cam.r[1] + s[2] * cam.r[2]) / sf / cam.th;
        const py = (s[0] * cam.up[0] + s[1] * cam.up[1] + s[2] * cam.up[2]) / sf / cam.tv;
        const sx = x + (px + 1) / 2 * w, sy = y + (1 - py) / 2 * h;
        SR.drawSun(ctx, sx, sy, 13, this.sunCol, SR.clamp(this.sunLum * 1.6, 0.35, 1));
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(180,210,255,0.5)';
      ctx.lineWidth = 1.5;
      SR.roundRect(ctx, x, y, w, h, 10);
      ctx.stroke();
      const t = this.sightMode() === 'sky' ? `관측자의 시야 · 태양 반대쪽 하늘 (고도 ${this.s.sightEl}°)` : `관측자의 시야 · 태양 쪽 (고도 ${this.s.h}°)`;
      SR.label(ctx, t, x + 10, y + 20, { size: 15, color: '#eaf2ff', bg: 'rgba(5,12,28,0.6)' });
      // 시야 중심 표시
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      const cx = x + w / 2, cy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 3, cy);
      ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 3);
      ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
