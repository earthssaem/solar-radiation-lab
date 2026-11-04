/* =========================================================
   태양 복사 에너지 실험실 — 공통 모듈
   (수학 도우미, 색 과학, 대기 광학 공식, 그리기 도우미, UI 부품)
   ========================================================= */
(function () {
  'use strict';
  const SR = (window.SR = window.SR || {});

  // 캔버스 논리 좌표계 (화면 크기에 맞춰 확대·축소됨)
  SR.W = 1200;
  SR.H = 680;

  // 현상별 고정 색상 체계
  SR.ACCENT = {
    scatter: '#4cb8ff', // 산란 — 하늘색
    reflect: '#5eead4', // 반사 — 민트
    absorb: '#ff8a3d', // 흡수 — 열(주황)
    refract: '#b794ff', // 굴절 — 보라
    journey: '#ffd166', // 종합 — 햇빛
  };

  const D2R = Math.PI / 180;
  SR.D2R = D2R;
  SR.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  SR.lerp = (a, b, t) => a + (b - a) * t;
  SR.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  SR.smooth = (t) => t * t * (3 - 2 * t);

  // 재현 가능한 난수 (배경 입자 배치용)
  SR.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // 반직선(p + t·d, d는 단위벡터)과 원의 교점 [t1, t2]
  SR.rayCircle = function (px, py, dx, dy, cx, cy, r) {
    const ox = px - cx, oy = py - cy;
    const b = ox * dx + oy * dy;
    const c = ox * ox + oy * oy - r * r;
    const disc = b * b - c;
    if (disc < 0) return null;
    const s = Math.sqrt(disc);
    return [-b - s, -b + s];
  };

  // 점과 선분 사이 거리
  SR.distToSeg = function (px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const L2 = vx * vx + vy * vy || 1;
    const t = SR.clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1);
    const qx = ax + t * vx - px, qy = ay + t * vy - py;
    return Math.sqrt(qx * qx + qy * qy);
  };

  /* ---------------------------------------------------------
     색 과학: 스펙트럼 → 사람 눈에 보이는 색(sRGB)
     CIE 1931 등색 함수의 해석적 근사(Wyman·Sloan·Shirley, 2013)
     --------------------------------------------------------- */
  const LAM = [];
  for (let l = 380; l <= 730; l += 10) LAM.push(l);
  SR.LAM = LAM;
  function g(x, mu, s1, s2) {
    const t = (x - mu) / (x < mu ? s1 : s2);
    return Math.exp(-0.5 * t * t);
  }
  const CMF = LAM.map((l) => [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
  ]);

  // 플랑크 복사 (상대값) — 태양 표면 온도 약 5778 K
  SR.planck = function (lnm, T) {
    const l = lnm * 1e-9;
    return 1 / (Math.pow(l, 5) * (Math.exp(1.4388e-2 / (l * T)) - 1));
  };
  const sunRaw = LAM.map((l) => SR.planck(l, 5778));
  const sunMax = Math.max(...sunRaw);
  SR.SUN_SPEC = sunRaw.map((v) => v / sunMax);

  function specToXYZ(spec) {
    let X = 0, Y = 0, Z = 0;
    for (let i = 0; i < LAM.length; i++) {
      X += spec[i] * CMF[i][0];
      Y += spec[i] * CMF[i][1];
      Z += spec[i] * CMF[i][2];
    }
    return [X, Y, Z];
  }
  function xyzToLin(X, Y, Z) {
    return [
      3.2406 * X - 1.5372 * Y - 0.4986 * Z,
      -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
      0.0557 * X - 0.204 * Y + 1.057 * Z,
    ];
  }
  // 대기 밖 햇빛(백색광)이 흰색(1,1,1)으로 보이도록 백색 균형
  const sunLin = xyzToLin(...specToXYZ(SR.SUN_SPEC));
  const WB = [1 / sunLin[0], 1 / sunLin[1], 1 / sunLin[2]];

  /** 스펙트럼 → 선형 RGB (대기 밖 햇빛 = 1,1,1) */
  SR.specToLin = function (spec) {
    const [X, Y, Z] = specToXYZ(spec);
    const c = xyzToLin(X, Y, Z);
    return [Math.max(0, c[0] * WB[0]), Math.max(0, c[1] * WB[1]), Math.max(0, c[2] * WB[2])];
  };
  SR.lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  SR.gamma = (c) => {
    c = SR.clamp(c, 0, 1);
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  /** 선형 RGB → 0~255 sRGB 배열 */
  SR.linTo255 = (c) => c.map((v) => Math.round(SR.gamma(v) * 255));
  SR.css = (c255, a = 1) => `rgba(${c255[0]},${c255[1]},${c255[2]},${a})`;
  /** 밝기를 떼고 색만 남김(최댓값 = 1) */
  SR.normMax = (c) => {
    const m = Math.max(c[0], c[1], c[2], 1e-9);
    return [c[0] / m, c[1] / m, c[2] / m];
  };
  /** 휘도 기준 톤매핑(색상 유지) */
  SR.tonemap = function (c, exposure) {
    const L = SR.lum(c) * exposure;
    if (L <= 0) return [0, 0, 0];
    const Lm = L / (1 + L * 0.55);
    const s = (Lm / L) * exposure;
    let r = c[0] * s, gg = c[1] * s, b = c[2] * s;
    const m = Math.max(r, gg, b);
    if (m > 1) { r /= m; gg /= m; b /= m; }
    return [r, gg, b];
  };

  /* ---------------------------------------------------------
     대기 광학
     --------------------------------------------------------- */
  // 공기 분자에 의한 레일리 산란 광학적 두께(연직, 해수면) — Hansen & Travis(1974) 근사식
  SR.tauRayleigh = function (lnm) {
    const l = lnm / 1000;
    const l2 = l * l, l4 = l2 * l2;
    return (0.008569 / l4) * (1 + 0.0113 / l2 + 0.00013 / l4);
  };
  // 먼지·에어로졸 산란(미 산란 영역) — 옹스트룀 식, 파장 의존성이 약함(α≈1.3)
  SR.tauAerosol = (lnm, beta) => beta * Math.pow(lnm / 550, -1.3);
  // 공기량(대기 통과 거리 배수) — Kasten & Young(1989) 식, h는 도(°)
  SR.airMass = function (hdeg) {
    const h = Math.max(hdeg, -0.5);
    return 1 / (Math.sin(h * D2R) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
  };
  // 위상 함수 (산란각 θ의 코사인)
  SR.phaseRayleigh = (mu) => 0.75 * (1 + mu * mu);
  SR.phaseHG = (mu, g0) => (1 - g0 * g0) / Math.pow(1 + g0 * g0 - 2 * g0 * mu, 1.5);

  // 가시광선 파장 → 표시용 색 (Bruton 근사)
  SR.waveColor = function (lnm) {
    if (lnm < 380) return [196, 160, 255]; // 자외선: 연보라(실제로는 보이지 않음)
    if (lnm > 750) return [255, 80, 110]; // 적외선: 붉은 분홍(실제로는 보이지 않음)
    let r = 0, gg = 0, b = 0;
    if (lnm < 440) { r = -(lnm - 440) / 60; b = 1; }
    else if (lnm < 490) { gg = (lnm - 440) / 50; b = 1; }
    else if (lnm < 510) { gg = 1; b = -(lnm - 510) / 20; }
    else if (lnm < 580) { r = (lnm - 510) / 70; gg = 1; }
    else if (lnm < 645) { r = 1; gg = -(lnm - 645) / 65; }
    else r = 1;
    let f = 1;
    if (lnm < 420) f = 0.4 + (0.6 * (lnm - 380)) / 40;
    else if (lnm > 700) f = 0.4 + (0.6 * (750 - lnm)) / 50;
    return [r, gg, b].map((v) => Math.round(255 * Math.pow(v * f, 0.8)));
  };

  /* ---------------------------------------------------------
     빛 알갱이(광자 묶음) 그리기
     --------------------------------------------------------- */
  SR.pushTrail = function (p, maxLen) {
    p.trail.push(p.x, p.y);
    if (p.trail.length > maxLen * 2) p.trail.splice(0, 2);
  };
  /** p: {x,y,trail[], col:[r,g,b], a, w, r, dash} */
  SR.drawPhoton = function (ctx, p) {
    const t = p.trail;
    const a = p.a == null ? 1 : p.a;
    if (a <= 0.01) return;
    const col = p.col;
    if (t.length >= 4) {
      ctx.lineWidth = p.w || 2;
      if (p.dash) ctx.setLineDash(p.dash);
      // 꼬리: 두 겹으로 그려 끝으로 갈수록 흐려지게
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.28 * a})`;
      ctx.beginPath();
      ctx.moveTo(t[0], t[1]);
      for (let i = 2; i < t.length; i += 2) ctx.lineTo(t[i], t[i + 1]);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      const half = Math.max(0, (t.length >> 2) << 1);
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.75 * a})`;
      ctx.beginPath();
      ctx.moveTo(t[half], t[half + 1]);
      for (let i = half + 2; i < t.length; i += 2) ctx.lineTo(t[i], t[i + 1]);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (p.dash) ctx.setLineDash([]);
    }
    const r = p.r || 2.4;
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.25 * a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.4, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = `rgba(${Math.min(255, col[0] + 90)},${Math.min(255, col[1] + 90)},${Math.min(255, col[2] + 90)},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 6.2832);
    ctx.fill();
  };

  /* ---------------------------------------------------------
     순간 효과 (산란 섬광, 반사 표시, 흡수 열 파동 등)
     --------------------------------------------------------- */
  SR.Effects = class {
    constructor() { this.list = []; }
    clear() { this.list.length = 0; }
    add(e) {
      e.t = 0;
      e.dur = e.dur || 0.5;
      this.list.push(e);
      if (this.list.length > 260) this.list.shift();
    }
    update(dt) {
      for (const e of this.list) e.t += dt;
      this.list = this.list.filter((e) => e.t < e.dur);
    }
    draw(ctx, alphaMul = 1) {
      for (const e of this.list) {
        const k = e.t / e.dur;
        const c = e.col;
        const a = (e.a == null ? 1 : e.a) * alphaMul;
        if (e.type === 'ring') {
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(1 - k) * 0.85 * a})`;
          ctx.lineWidth = e.lw || 1.6;
          ctx.beginPath();
          ctx.arc(e.x, e.y, (e.r0 || 2) + (e.r1 || 12) * SR.smooth(k), 0, 6.2832);
          ctx.stroke();
        } else if (e.type === 'heat') {
          // 흡수된 자리에서 퍼지는 열(주황 빛무리)
          const rr = (e.r1 || 18) * (0.35 + 0.65 * k);
          const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr);
          gr.addColorStop(0, `rgba(255,170,80,${(1 - k) * 0.75 * a})`);
          gr.addColorStop(0.5, `rgba(255,110,40,${(1 - k) * 0.35 * a})`);
          gr.addColorStop(1, 'rgba(255,90,30,0)');
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(e.x, e.y, rr, 0, 6.2832);
          ctx.fill();
        } else if (e.type === 'spark') {
          const rr = (e.r1 || 6) * (1 - k * 0.4);
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(1 - k) * a})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const an = i * Math.PI / 2 + Math.PI / 4;
            ctx.moveTo(e.x + Math.cos(an) * rr * 0.3, e.y + Math.sin(an) * rr * 0.3);
            ctx.lineTo(e.x + Math.cos(an) * rr, e.y + Math.sin(an) * rr);
          }
          ctx.stroke();
        }
      }
    }
  };

  /* ---------------------------------------------------------
     공통 그리기 도우미
     --------------------------------------------------------- */
  SR.drawSun = function (ctx, x, y, r, col255, glow = 1) {
    const c = col255 || [255, 246, 214];
    const gr = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.4);
    gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.55 * glow})`);
    gr.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${0.16 * glow})`);
    gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, 6.2832);
    ctx.fill();
    const core = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.55, `rgb(${Math.min(255, c[0] + 20)},${Math.min(255, c[1] + 20)},${Math.min(255, c[2] + 20)})`);
    core.addColorStop(1, `rgb(${c[0]},${c[1]},${c[2]})`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  };

  SR.drawStars = function (ctx, seed, n, w, h, maxY) {
    const rnd = SR.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * (maxY || h);
      const a = 0.15 + rnd() * 0.5;
      ctx.fillStyle = `rgba(220,230,255,${a})`;
      ctx.fillRect(x, y, rnd() < 0.15 ? 1.6 : 1, rnd() < 0.15 ? 1.6 : 1);
    }
  };

  // 관측자(단순한 실루엣) — 발이 (x, y)
  SR.drawObserver = function (ctx, x, y, s = 1, facing = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * facing, s);
    ctx.fillStyle = '#e6edf8';
    ctx.strokeStyle = '#e6edf8';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(0, -12); ctx.lineTo(4, 0); // 다리
    ctx.moveTo(0, -12); ctx.lineTo(0, -24); // 몸
    ctx.moveTo(0, -21); ctx.lineTo(-5, -14); // 팔
    ctx.moveTo(0, -21); ctx.lineTo(5, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -29, 4.6, 0, 6.2832); // 머리
    ctx.fill();
    ctx.restore();
  };

  SR.label = function (ctx, text, x, y, opt = {}) {
    ctx.font = `${opt.weight || 600} ${opt.size || 16}px ${SR.FONT}`;
    ctx.textAlign = opt.align || 'left';
    ctx.textBaseline = opt.base || 'alphabetic';
    if (opt.bg) {
      const w = ctx.measureText(text).width;
      const pad = 6, hgt = (opt.size || 16) + 8;
      let bx = x - pad;
      if (ctx.textAlign === 'center') bx = x - w / 2 - pad;
      else if (ctx.textAlign === 'right') bx = x - w - pad;
      let by = y - (opt.size || 16) - 1;
      if (ctx.textBaseline === 'middle') by = y - hgt / 2;
      ctx.fillStyle = opt.bg;
      SR.roundRect(ctx, bx, by, w + pad * 2, hgt, 6);
      ctx.fill();
    }
    if (opt.shadow !== false) {
      ctx.fillStyle = 'rgba(3,8,20,0.75)';
      ctx.fillText(text, x + 1, y + 1);
    }
    ctx.fillStyle = opt.color || '#e8eef9';
    ctx.fillText(text, x, y);
  };

  SR.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  SR.arrowHead = function (ctx, x, y, ang, size, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.42) * size, y - Math.sin(ang - 0.42) * size);
    ctx.lineTo(x - Math.cos(ang + 0.42) * size, y - Math.sin(ang + 0.42) * size);
    ctx.closePath();
    ctx.fill();
  };

  /** 받침에 맞는 조사 붙이기: SR.j(15, '은') → '15는', SR.j('눈', '와') → '눈과' */
  SR.j = function (v, t) {
    const s = String(v);
    const ch = s[s.length - 1];
    let bat, rieul;
    if (/[0-9]/.test(ch)) {
      const d = +ch;
      bat = d === 0 || [1, 3, 6, 7, 8].includes(d);
      rieul = [1, 7, 8].includes(d);
    } else {
      const c = ch.charCodeAt(0) - 0xac00;
      const jong = c >= 0 && c < 11172 ? c % 28 : 0;
      bat = jong > 0;
      rieul = jong === 8;
    }
    const pairs = { 은: ['은', '는'], 는: ['은', '는'], 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'] };
    if (t === '로' || t === '으로') return s + (bat && !rieul ? '으로' : '로');
    const pr = pairs[t];
    return s + (bat ? pr[0] : pr[1]);
  };

  SR.FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

  /* ---------------------------------------------------------
     조절 패널 UI 부품
     --------------------------------------------------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  SR.el = el;

  SR.ui = {
    section(title, note) {
      const s = el('section', 'pnl-sec');
      if (title) s.appendChild(el('h3', 'pnl-title', title));
      if (note) s.appendChild(el('p', 'pnl-note', note));
      return s;
    },
    /**
     * 슬라이더. onInput(value, base): base는 이번 조작을 시작하기 전 값
     */
    slider(o) {
      const wrap = el('div', 'ctl');
      const head = el('div', 'ctl-head');
      const lab = el('label', 'ctl-label', o.label);
      const out = el('output', 'ctl-val');
      head.append(lab, out);
      const inp = el('input');
      inp.type = 'range';
      inp.min = o.min; inp.max = o.max; inp.step = o.step || 1;
      inp.value = o.value;
      const id = 'sl-' + Math.random().toString(36).slice(2, 8);
      inp.id = id; lab.htmlFor = id;
      wrap.append(head, inp);
      if (o.ends) {
        const sc = el('div', 'ctl-ends');
        sc.append(el('span', '', o.ends[0]), el('span', '', o.ends[1]));
        wrap.appendChild(sc);
      }
      if (o.hint) wrap.appendChild(el('p', 'ctl-hint', o.hint));
      const fmt = o.fmt || ((v) => v + (o.unit || ''));
      let base = null;
      const paint = () => {
        const v = parseFloat(inp.value);
        out.textContent = fmt(v);
        const p = ((v - inp.min) / (inp.max - inp.min || 1)) * 100;
        inp.style.setProperty('--p', p + '%');
      };
      inp.addEventListener('input', () => {
        const v = parseFloat(inp.value);
        if (base == null) base = api.last;
        paint();
        o.onInput && o.onInput(v, base);
        api.last = v;
      });
      inp.addEventListener('change', () => { base = null; });
      const api = {
        el: wrap, input: inp, last: parseFloat(o.value),
        set(v, silent) {
          inp.value = v;
          api.last = parseFloat(inp.value);
          paint();
          if (!silent) o.onInput && o.onInput(api.last, api.last);
        },
        setRange(min, max, v) {
          inp.min = min; inp.max = max;
          api.set(v, true);
        },
        get: () => parseFloat(inp.value),
        setLabel: (t) => (lab.innerHTML = t),
      };
      paint();
      return api;
    },
    segmented(o) {
      const wrap = el('div', 'ctl');
      if (o.label) wrap.appendChild(el('div', 'ctl-label', o.label));
      const seg = el('div', 'seg' + (o.grid ? ' seg-grid' : ''));
      seg.setAttribute('role', 'radiogroup');
      const btns = [];
      let cur = o.value;
      o.options.forEach((op) => {
        const b = el('button', 'seg-btn');
        b.type = 'button';
        b.innerHTML = (op.swatch ? `<i class="sw" style="background:${op.swatch}"></i>` : '') + `<span>${op.label}</span>`;
        b.dataset.v = op.value;
        b.setAttribute('role', 'radio');
        b.addEventListener('click', () => {
          if (cur === op.value && !o.allowSame) return;
          api.set(op.value);
        });
        btns.push(b);
        seg.appendChild(b);
      });
      wrap.appendChild(seg);
      const paint = () => btns.forEach((b) => {
        const on = b.dataset.v === String(cur);
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      const api = {
        el: wrap,
        set(v, silent) {
          const prev = cur;
          cur = v;
          paint();
          if (!silent) o.onChange && o.onChange(v, prev);
        },
        get: () => cur,
      };
      paint();
      return api;
    },
    chips(o) {
      // 여러 개를 켜고 끌 수 있는 버튼 묶음
      const wrap = el('div', 'ctl');
      if (o.label) wrap.appendChild(el('div', 'ctl-label', o.label));
      const row = el('div', 'chips');
      const state = {};
      o.options.forEach((op) => {
        state[op.value] = op.on !== false;
        const b = el('button', 'chip', `<i class="dot" style="background:${op.color}"></i>${op.label}`);
        b.type = 'button';
        b.setAttribute('aria-pressed', state[op.value]);
        b.classList.toggle('on', state[op.value]);
        b.addEventListener('click', () => {
          state[op.value] = !state[op.value];
          if (!o.allowNone && !Object.values(state).some(Boolean)) state[op.value] = true; // 최소 하나
          b.classList.toggle('on', state[op.value]);
          b.setAttribute('aria-pressed', state[op.value]);
          o.onChange && o.onChange({ ...state });
        });
        row.appendChild(b);
      });
      wrap.appendChild(row);
      if (o.hint) wrap.appendChild(el('p', 'ctl-hint', o.hint));
      return { el: wrap, state };
    },
    button(label, onClick, cls) {
      const b = el('button', 'btn ' + (cls || ''), label);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    },
  };
})();
