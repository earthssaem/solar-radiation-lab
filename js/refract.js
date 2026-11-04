/* =========================================================
   ④ 굴절 — 고도에 따른 대기 밀도 변화와 휘어지는 빛의 경로
   빛의 경로는 굴절률 분포 n(r)에서 광선 방정식 d(n·t)/ds = ∇n 을
   수치 적분해 계산한다(층 경계에서 꺾이지 않는 연속 곡선).
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;
  const D = SR.D2R;

  const GY = 600, R = 760, CX = 760, CY = GY + R, HA = 240, RA = R + HA;
  const E = { x: CX, y: GY - 28 };
  const HS = 75;               // 밀도 규모 높이(그림 px)
  const NORM = 1 - Math.exp(-HA / HS);
  const DMAX = 0.1;            // 슬라이더 최대일 때 지표 굴절률 − 1 (실제 대기 ≈ 0.00029)
  const N_REAL = 0.000293;
  const STEP = 2.5;
  const INSET = { x: 846, y: 14, w: 340, h: 176 };
  const GAUGE = { x: 1018, y: 452, w: 160, h: 170 };
  const SPEED = 300;

  // 실제 지구 대기의 굴절(분) — Sæmundsson 식, h: 실제 고도(°)
  function realRefrArcmin(h) {
    if (h < -1) return null;
    return 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * D);
  }

  const M = {
    id: 'refract',
    title: '굴절',
    accent: SR.ACCENT.refract,
    defaults: { h: 3, dens: 60, wave: true },

    principle: [
      '대기는 지표에 가까울수록 밀도가 크고, 밀도가 클수록 굴절률이 커서 빛이 조금 더 느리게 진행한다.',
      '햇빛이 밀도가 작은 상층에서 밀도가 큰 하층으로 비스듬히 들어오면, 파면의 아래쪽이 더 느려 진행 방향이 지표 쪽으로 조금씩 연속적으로 휘어진다.',
      '관측자는 빛이 들어온 방향의 연장선에 태양이 있다고 보므로, 태양이 실제보다 높게 보인다. 이 효과는 지평선 부근에서 가장 크다.',
    ],

    quiz: {
      q: '지평선 근처의 태양은 실제 위치보다 높게 보일까, 낮게 보일까?',
      hint: '태양 고도를 0° 가까이 낮추고 ‘실제 위치’와 ‘겉보기 위치’를 비교해 보세요.',
      options: ['실제보다 높게 보인다', '실제보다 낮게 보인다', '실제와 같은 위치에 보인다'],
      answer: 0,
      action: { label: '지평선 부근으로 설정', run: () => M.setH(0) },
      explain: () => {
        const r0 = realRefrArcmin(0);
        return `빛은 밀도가 큰 아래쪽으로 휘면서 관측자에게 도달하고, 관측자는 빛이 들어온 방향의 연장선 위에 태양이 있다고 인식하므로 태양이 실제보다 <b>높게</b> 보입니다. ` +
          `실제 대기에서 지평선에 걸친 태양은 약 ${r0.toFixed(0)}′(약 ${(r0 / 60).toFixed(1)}°) 높아 보이는데, 이는 태양의 겉보기 지름(약 32′)과 비슷합니다. 그래서 태양이 실제로는 지평선 아래로 막 내려갔을 때에도 잠시 보일 수 있습니다.`;
      },
    },

    init(app) {
      this.app = app;
      this.s = { ...this.defaults };
      this.fx = new SR.Effects();
      this.buildPanel();
      this.recompute();
      this.reset();
    },

    reset() {
      this.ph = [];
      this.acc = 0;
      this.fx.clear();
    },

    restoreDefaults() {
      Object.assign(this.s, this.defaults);
      this.ctl.h.set(this.s.h, true);
      this.ctl.dens.set(this.s.dens, true);
      this.change = '';
      this.onChange();
    },

    setH(h) {
      const prev = this.s.h;
      const pd = this.sol ? this.sol.dev : 0;
      this.s.h = h;
      this.ctl.h.set(h, true);
      this.recompute();
      if (prev !== h) this.change = this.describeH(prev, h, pd);
      this.onChange(true);
    },

    /* ---------------- 조절 패널 ---------------- */
    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      this.ctl = {};
      const s1 = ui.section('조건 바꾸기');
      this.ctl.dens = ui.slider({
        label: '대기 밀도 차이 (지표 부근 − 상층)', min: 0, max: 100, value: this.s.dens,
        fmt: (v) => (v === 0 ? '없음(균일)' : v < 35 ? '작음' : v < 70 ? '보통' : '큼'),
        ends: ['0 (균일한 대기)', '큼'],
        hint: '효과가 보이도록 굴절률 차이를 실제보다 크게 과장했습니다.',
        onInput: (v, base) => {
          const pd = this.sol ? this.sol.dev : 0;
          this.s.dens = v;
          this.recompute();
          if (base != null && base !== v) {
            this.change = v === 0
              ? '밀도 차이를 0으로 하자 대기의 굴절률이 어디서나 같아져 빛이 직진합니다. 실제 위치와 겉보기 위치가 같습니다.'
              : `밀도 차이를 ${v > base ? '키우자' : '줄이자'} 빛이 ${v > base ? '더 크게' : '덜'} 휘어, 겉보기 위치와 실제 위치의 차이가 ${pd.toFixed(1)}° → ${this.sol.dev.toFixed(1)}°가 되었습니다.`;
          }
          this.onChange(true);
        },
      });
      this.ctl.h = ui.slider({
        label: '태양의 실제 고도', min: 0, max: 80, value: this.s.h, unit: '°',
        ends: ['지평선', '높음'],
        onInput: (v, base) => {
          const pd = this.sol ? this.sol.dev : 0;
          this.s.h = v;
          this.recompute();
          if (base != null && base !== v) this.change = this.describeH(base, v, pd);
          this.onChange(true);
        },
      });
      const pre = SR.el('div', 'chips');
      [[0, '지평선 부근 0°'], [10, '낮은 태양 10°'], [60, '높은 태양 60°']].forEach(([h, l]) => {
        const b = SR.el('button', 'chip on', l);
        b.type = 'button';
        b.addEventListener('click', () => this.setH(h));
        pre.appendChild(b);
      });
      const pw = SR.el('div', 'ctl');
      pw.append(SR.el('div', 'ctl-label', '태양 고도 비교'), pre);
      this.ctl.wave = ui.chips({
        allowNone: true,
        options: [{ value: 'wave', label: '파면(빛의 앞면) 보기', color: SR.ACCENT.refract }],
        onChange: (st) => { this.s.wave = st.wave; this.app.markDirty(); },
      });
      s1.append(this.ctl.dens.el, this.ctl.h.el, pw, this.ctl.wave.el);

      const s2 = ui.section('측정값');
      const dl = SR.el('dl', 'ro-list');
      dl.innerHTML = `
        <dt><i style="background:#ffd166"></i>실제 고도</dt><dd data-k="h"></dd>
        <dt><i style="background:${SR.ACCENT.refract}"></i>겉보기 고도 (모형)</dt><dd data-k="e"></dd>
        <dt class="sum">위치 차이 (모형, 과장)</dt><dd class="sum" data-k="dev"></dd>
        <dt>실제 대기라면</dt><dd data-k="real"></dd>`;
      this.ro = dl;
      s2.appendChild(dl);
      s2.appendChild(SR.el('p', 'ctl-hint', '‘실제 대기라면’은 표준 대기 조건의 대기차 공식(Sæmundsson)으로 계산한 값입니다. 태양의 겉보기 지름은 약 32′(0.53°)입니다.'));
      const foot = SR.el('div', 'pnl-foot');
      foot.appendChild(ui.button('조건 기본값으로', () => this.restoreDefaults(), 'btn-ghost'));
      p.append(s1, s2, foot);
      this.panel = p;
    },

    onChange(keep) {
      if (!keep) this.ph = [];
      this.bgKey = null;
      this.app.markDirty();
      this.app.refreshLive();
    },

    describeH(a, b, pd) {
      const down = b < a;
      return `태양의 실제 고도를 ${a}° → ${b}°로 ${down ? '낮추자' : '높이자'} 빛이 대기를 ${down ? '더 비스듬히, 더 길게' : '더 짧게'} 지나 위치 차이가 ${pd.toFixed(1)}° → ${this.sol.dev.toFixed(1)}°로 ${this.sol.dev > pd ? '커졌습니다' : this.sol.dev < pd ? '작아졌습니다' : '거의 같습니다'}.` +
        (down ? ' 지평선에 가까울수록 굴절 효과가 두드러집니다.' : '');
    },

    /* ---------------- 광선 추적 ---------------- */
    delta() { return DMAX * (this.s.dens / 100); },
    nAt(x, y) {
      const r = Math.hypot(x - CX, y - CY);
      const z = r - R;
      if (z >= HA) return 1;
      return 1 + this.dl * (Math.exp(-Math.max(z, 0) / HS) - Math.exp(-HA / HS)) / NORM;
    },
    // 관측자에서 고도각 e(°)로 거꾸로 추적
    trace(e, keepPts) {
      let x = E.x, y = E.y;
      let tx = -Math.cos(e * D), ty = -Math.sin(e * D);
      const pts = keepPts ? [x, y] : null;
      const dl = this.dl;
      for (let i = 0; i < 4000; i++) {
        const rx = x - CX, ry = y - CY;
        const r = Math.hypot(rx, ry);
        const z = r - R;
        if (z >= HA) return { x, y, tx, ty, pts, hit: false };
        if (z < -0.5) return { x, y, tx, ty, pts, hit: true };
        if (dl > 0) {
          const ex = Math.exp(-Math.max(z, 0) / HS);
          const n = 1 + dl * (ex - Math.exp(-HA / HS)) / NORM;
          const dn = (-dl / HS) * ex / NORM; // dn/dr
          const gx = (dn * rx) / r, gy = (dn * ry) / r;
          const gt = gx * tx + gy * ty;
          tx += ((gx - gt * tx) / n) * STEP;
          ty += ((gy - gt * ty) / n) * STEP;
          const L = Math.hypot(tx, ty);
          tx /= L; ty /= L;
        }
        x += tx * STEP;
        y += ty * STEP;
        if (pts) pts.push(x, y);
      }
      return { x, y, tx, ty, pts, hit: false };
    },
    // 실제 고도 h의 태양(S)에서 온 빛이 관측자에 닿는 겉보기 고도 e를 찾기
    solve(h, S) {
      const f = (e) => {
        const r = this.trace(e, false);
        if (r.hit) return -1e6;
        return r.tx * (S.y - r.y) - r.ty * (S.x - r.x);
      };
      let lo = h - 0.2, hi = h + 30;
      let flo = f(lo), fhi = f(hi);
      if (this.dl === 0) return h;
      if (flo * fhi > 0) {
        // 부호 정리: 높은 쪽 부호를 기준으로 낮은 쪽 탐색
        lo = Math.max(-2, h - 3); flo = f(lo);
        if (flo * fhi > 0) return h;
      }
      for (let i = 0; i < 34; i++) {
        const m = (lo + hi) / 2, fm = f(m);
        if (fm * flo > 0) { lo = m; flo = fm; } else { hi = m; fhi = fm; }
      }
      return (lo + hi) / 2;
    },
    sunPos(h) {
      const u = [-Math.cos(h * D), -Math.sin(h * D)];
      const t = SR.rayCircle(E.x, E.y, u[0], u[1], CX, CY, RA)[1];
      const d = t + 92;
      return { x: E.x + u[0] * d, y: E.y + u[1] * d, d };
    },

    recompute() {
      this.dl = this.delta();
      const h = this.s.h;
      const S = this.sunPos(h);
      const e = this.solve(h, S);
      const tr = this.trace(e, true);
      // 경로: 태양 → 대기 입구 → … → 관측자
      const pts = [S.x, S.y];
      for (let i = tr.pts.length - 2; i >= 0; i -= 2) pts.push(tr.pts[i], tr.pts[i + 1]);
      const cum = [0];
      for (let i = 2; i < pts.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
      this.path = { pts, cum, len: cum[cum.length - 1], entry: { x: tr.x, y: tr.y } };
      this.S = S;
      this.A = { x: E.x - Math.cos(e * D) * S.d, y: E.y - Math.sin(e * D) * S.d };
      this.sol = { h, e, dev: e - h };
      // 고도별 위치 차이 그래프
      this.curve = [0, 1, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 30, 40, 50, 60, 70, 80].map((hh) => ({ h: hh, dev: this.solve(hh, this.sunPos(hh)) - hh }));
      this.updateReadouts();
    },

    updateReadouts() {
      if (!this.ro) return;
      const q = (k) => this.ro.querySelector(`[data-k=${k}]`);
      q('h').textContent = this.sol.h.toFixed(1) + '°';
      q('e').textContent = this.sol.e.toFixed(1) + '°';
      q('dev').textContent = '+' + this.sol.dev.toFixed(1) + '°';
      const r = realRefrArcmin(this.sol.h);
      q('real').textContent = r == null ? '-' : `+${r < 1 ? r.toFixed(1) : r.toFixed(0)}′ (${(r / 60).toFixed(2)}°)`;
    },

    live() {
      const { h, e, dev } = this.sol;
      const ex = this.dl / N_REAL;
      if (this.dl === 0) {
        return { now: `대기 밀도가 높이에 따라 변하지 않으면 굴절률이 어디서나 같아 빛이 <b>직진</b>합니다. 그래서 실제 고도 ${h}°의 태양이 그대로 ${h}°에 보입니다.`, change: this.change };
      }
      const r = realRefrArcmin(h);
      let t = `햇빛은 밀도가 작은 상층에서 밀도가 큰 하층으로 들어오며 <b>지표 쪽으로 조금씩 휘어</b> 관측자에게 도달합니다. ` +
        `관측자는 빛이 들어온 방향의 연장선에 태양이 있다고 보므로, 실제 고도 <b>${h}°</b>인 태양이 <b>${e.toFixed(1)}°</b>에 있는 것처럼 <b>${dev.toFixed(1)}° 더 높게</b> 보입니다. `;
      t += `(그림은 굴절률 차이를 실제의 약 ${Math.round(ex)}배로 과장했습니다. 실제 대기에서 이 고도의 차이는 약 ${r < 1 ? r.toFixed(1) : r.toFixed(0)}′입니다.)`;
      return { now: t, change: this.change };
    },

    /* ---------------- 애니메이션 ---------------- */
    posAt(s) {
      const { pts, cum } = this.path;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const seg = cum[hi] - cum[lo] || 1;
      const k = SR.clamp((s - cum[lo]) / seg, 0, 1);
      const x = SR.lerp(pts[lo * 2], pts[hi * 2], k), y = SR.lerp(pts[lo * 2 + 1], pts[hi * 2 + 1], k);
      return { x, y, tx: (pts[hi * 2] - pts[lo * 2]) / seg, ty: (pts[hi * 2 + 1] - pts[lo * 2 + 1]) / seg };
    },
    update(dt) {
      this.acc += 3.2 * dt;
      while (this.acc >= 1) {
        this.acc -= 1;
        this.ph.push({ s: 0, trail: [], col: [255, 240, 200], a: 1, w: 2.6, r: 3.2, x: this.S.x, y: this.S.y });
      }
      const keep = [];
      for (const p of this.ph) {
        p.s += SPEED * dt;
        if (p.s >= this.path.len) {
          this.fx.add({ type: 'ring', x: E.x, y: E.y, col: [200, 170, 255], r0: 3, r1: 12, dur: 0.4, lw: 2 });
          continue;
        }
        const q = this.posAt(p.s);
        p.x = q.x; p.y = q.y; p.tx = q.tx; p.ty = q.ty;
        SR.pushTrail(p, 14);
        keep.push(p);
      }
      this.ph = keep;
      this.fx.update(dt);
    },

    /* ---------------- 그리기 ---------------- */
    drawBackground(c) {
      const g = c.createLinearGradient(0, 0, 0, SR.H);
      g.addColorStop(0, '#040915');
      g.addColorStop(1, '#0b1730');
      c.fillStyle = g;
      c.fillRect(0, 0, SR.W, SR.H);
      SR.drawStars(c, 19, 170, SR.W, SR.H);
      // 대기: 밀도 차이에 따라 아래가 진한 그라데이션
      const k = this.s.dens / 100;
      const ag = c.createRadialGradient(CX, CY, R, CX, CY, RA);
      const base = 0.14;
      for (let i = 0; i <= 10; i++) {
        const z = (i / 10) * HA;
        const rho = (Math.exp(-z / HS) - Math.exp(-HA / HS)) / NORM; // 1 → 0
        const a = base * (1 - k) + (0.06 + 0.5 * rho) * k;
        ag.addColorStop(i / 10, `rgba(150,120,255,${a.toFixed(3)})`);
      }
      c.fillStyle = ag;
      c.beginPath(); c.arc(CX, CY, RA, 0, 6.2832); c.fill();
      // 같은 밀도 선
      if (k > 0) {
        c.setLineDash([3, 7]);
        c.lineWidth = 1;
        [0.8, 0.6, 0.4, 0.2].forEach((f) => {
          const z = -HS * Math.log(f * NORM + Math.exp(-HA / HS));
          c.strokeStyle = `rgba(200,180,255,${0.12 + 0.25 * k})`;
          c.beginPath(); c.arc(CX, CY, R + z, Math.PI, 2 * Math.PI); c.stroke();
        });
        c.setLineDash([]);
      }
      c.strokeStyle = 'rgba(190,170,255,0.45)';
      c.setLineDash([5, 6]);
      c.beginPath(); c.arc(CX, CY, RA, 0, 6.2832); c.stroke();
      c.setLineDash([]);
      // 지구
      const gg = c.createLinearGradient(0, GY, 0, SR.H);
      gg.addColorStop(0, '#2f5b3d');
      gg.addColorStop(1, '#0d1d15');
      c.fillStyle = gg;
      c.beginPath(); c.arc(CX, CY, R, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(170,230,180,0.35)';
      c.lineWidth = 1.5;
      c.stroke();
    },

    drawGauge(ctx) {
      const { x, y, w, h } = GAUGE;
      ctx.fillStyle = 'rgba(5,10,26,0.82)';
      SR.roundRect(ctx, x - 10, y - 30, w + 20, h + 54, 10);
      ctx.fill();
      SR.label(ctx, '높이에 따른 대기 밀도', x, y - 10, { size: 14, weight: 700, color: '#d9ccff' });
      const k = this.s.dens / 100;
      const X0 = x + 20, Y1 = y + h - 4;
      ctx.strokeStyle = 'rgba(210,220,245,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X0, y + 4); ctx.lineTo(X0, Y1); ctx.lineTo(x + w, Y1); ctx.stroke();
      ctx.strokeStyle = SR.ACCENT.refract;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const z = (i / 40) * HA;
        const rho = (Math.exp(-z / HS) - Math.exp(-HA / HS)) / NORM;
        const v = (1 - k) * 0.55 + k * (0.08 + 0.92 * rho);
        const px = X0 + v * (w - 26), py = Y1 - (i / 40) * (h - 10);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      SR.label(ctx, '높이', X0 - 4, y + 12, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
      SR.label(ctx, '밀도 →', x + w, Y1 + 18, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
      SR.label(ctx, '지표', X0 - 4, Y1, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
    },

    drawInset(ctx) {
      const { x, y, w, h } = INSET;
      ctx.fillStyle = 'rgba(5,10,26,0.82)';
      SR.roundRect(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(183,148,255,0.35)';
      ctx.stroke();
      SR.label(ctx, '태양 고도에 따른 위치 차이 (모형)', x + 12, y + 22, { size: 14, weight: 700, color: '#e3d8ff' });
      const gx = x + 40, gy = y + 36, gw = w - 56, gh = h - 70;
      const maxD = Math.max(1, ...this.curve.map((c) => c.dev));
      const X = (hh) => gx + (hh / 80) * gw, Y = (d) => gy + gh - (d / maxD) * gh;
      ctx.strokeStyle = 'rgba(210,220,245,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
      ctx.strokeStyle = SR.ACCENT.refract;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      this.curve.forEach((c, i) => (i ? ctx.lineTo(X(c.h), Y(c.dev)) : ctx.moveTo(X(c.h), Y(c.dev))));
      ctx.stroke();
      const cx = X(this.sol.h), cy = Y(this.sol.dev);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.2832); ctx.fill();
      [0, 20, 40, 60, 80].forEach((v) => SR.label(ctx, v + '°', X(v), gy + gh + 16, { size: 12, align: 'center', color: 'rgba(210,222,240,0.8)' }));
      SR.label(ctx, maxD.toFixed(1) + '°', gx - 4, gy + 8, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
      SR.label(ctx, '0', gx - 4, gy + gh + 4, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
      SR.label(ctx, '실제 고도', gx + gw, gy + gh + 30, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
    },

    draw(ctx) {
      const key = this.s.dens;
      if (this.bgKey !== key || !this.bg || this.bg.ps !== this.app.ps) {
        this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
        this.bgKey = key;
      }
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      const S = this.S, A = this.A, pts = this.path.pts;
      const { h, e, dev } = this.sol;

      // 대기가 없다면: 직선 경로
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,214,120,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(E.x, E.y); ctx.stroke();
      ctx.setLineDash([]);
      // 겉보기 방향(관측자가 보는 방향의 연장선)
      if (dev > 0.05) {
        ctx.setLineDash([2, 6]);
        ctx.strokeStyle = 'rgba(215,195,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(E.x, E.y); ctx.lineTo(A.x, A.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      // 실제 경로(곡선)
      ctx.strokeStyle = 'rgba(255,244,214,0.95)';
      ctx.lineWidth = 3.2;
      ctx.shadowColor = 'rgba(255,230,170,0.6)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.stroke();
      ctx.shadowBlur = 0;
      const last = this.posAt(this.path.len - 2);
      SR.arrowHead(ctx, E.x - last.tx * 6, E.y - last.ty * 6, Math.atan2(last.ty, last.tx), 13, '#fff4d6');

      // 파면 해설: 경로 중간의 한 지점
      if (this.s.wave && this.dl > 0) {
        const entryS = this.path.cum[1] || 0;
        const sMid = entryS + (this.path.len - entryS) * 0.42;
        const q = this.posAt(sMid);
        const nx = -q.ty, ny = q.tx; // 진행 방향의 왼쪽(위쪽)
        const up = ny < 0 ? 1 : -1;
        const ax = q.x + nx * up * 26, ay = q.y + ny * up * 26;
        const bx = q.x - nx * up * 26, by = q.y - ny * up * 26;
        ctx.strokeStyle = SR.ACCENT.refract;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        const arr = (x, y, L) => {
          ctx.strokeStyle = '#e9dcff';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + q.tx * L, y + q.ty * L); ctx.stroke();
          SR.arrowHead(ctx, x + q.tx * L, y + q.ty * L, Math.atan2(q.ty, q.tx), 8, '#e9dcff');
        };
        arr(ax, ay, 44);
        arr(bx, by, 26);
        SR.label(ctx, '파면 위쪽: 밀도 작음 → 빠름', ax - 6, ay - 16, { size: 14, color: '#e9dcff', bg: 'rgba(8,10,30,0.75)' });
        SR.label(ctx, '파면 아래쪽: 밀도 큼 → 느림', bx - 6, by + 30, { size: 14, color: '#e9dcff', bg: 'rgba(8,10,30,0.75)' });
      }

      // 지평선과 각도
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(230,240,255,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(E.x - 200, E.y); ctx.lineTo(E.x + 200, E.y); ctx.stroke();
      ctx.setLineDash([]);
      SR.label(ctx, '지평선', E.x + 150, E.y - 8, { size: 14, color: 'rgba(230,240,255,0.7)' });
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(E.x, E.y, 70, Math.PI, Math.PI + h * D + 0.0001); ctx.stroke();
      if (dev > 0.05) {
        ctx.strokeStyle = SR.ACCENT.refract;
        ctx.beginPath(); ctx.arc(E.x, E.y, 92, Math.PI, Math.PI + e * D); ctx.stroke();
      }

      // 실제 태양과 겉보기 태양
      if (dev > 0.05) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#e3d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(A.x, A.y, 22, 0, 6.2832); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(200,170,255,0.18)';
        ctx.fill();
        ctx.restore();
        SR.label(ctx, `겉보기 위치 ${e.toFixed(1)}°`, A.x, A.y - 32, { size: 16, align: 'center', color: '#e3d4ff', bg: 'rgba(8,10,30,0.65)' });
      }
      SR.drawSun(ctx, S.x, S.y, 22);
      const below = dev > 0.05 && A.y < S.y;
      SR.label(ctx, `실제 위치 ${h}°`, S.x, below ? S.y + 46 : S.y - 32, { size: 16, align: 'center', color: '#ffe08a', bg: 'rgba(8,10,30,0.65)' });

      // 빛 알갱이 + 파면
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.ph) {
        SR.drawPhoton(ctx, p);
        if (this.s.wave && p.tx != null) {
          ctx.strokeStyle = 'rgba(200,175,255,0.55)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(p.x - p.ty * 12, p.y + p.tx * 12);
          ctx.lineTo(p.x + p.ty * 12, p.y - p.tx * 12);
          ctx.stroke();
        }
      }
      this.fx.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';

      SR.drawObserver(ctx, E.x, GY, 1, -1);
      SR.label(ctx, '관측자', E.x + 12, GY + 22, { size: 16 });
      SR.label(ctx, `실제 ${h}° → 겉보기 ${e.toFixed(1)}°`, E.x + 20, E.y - 150, { size: 17, weight: 700, color: '#efe6ff', align: 'center', bg: 'rgba(8,10,30,0.65)' });
      SR.label(ctx, `차이 +${dev.toFixed(1)}°`, E.x + 20, E.y - 120, { size: 20, weight: 800, color: SR.ACCENT.refract, align: 'center', bg: 'rgba(8,10,30,0.65)' });

      // 범례
      const lx = 22, ly = SR.H - 74;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,244,214,0.95)';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 34, ly); ctx.stroke();
      SR.label(ctx, '실제 빛의 경로 (연속적으로 휘어짐)', lx + 44, ly + 5, { size: 15 });
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,214,120,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, ly + 24); ctx.lineTo(lx + 34, ly + 24); ctx.stroke();
      SR.label(ctx, '대기가 없다면: 직선 경로', lx + 44, ly + 29, { size: 15 });
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(215,195,255,0.95)';
      ctx.beginPath(); ctx.moveTo(lx, ly + 48); ctx.lineTo(lx + 34, ly + 48); ctx.stroke();
      ctx.setLineDash([]);
      SR.label(ctx, '관측자가 보는 방향 (빛이 들어온 방향의 연장선)', lx + 44, ly + 53, { size: 15 });

      this.drawInset(ctx);
      this.drawGauge(ctx);
      SR.label(ctx, '대기 (밀도 차이·두께 과장)', E.x + 64, GY - HA + 30, { size: 15, color: 'rgba(215,200,255,0.8)' });
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
