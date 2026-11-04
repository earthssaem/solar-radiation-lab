/* =========================================================
   ② 반사 — 지표·구름의 종류에 따른 반사율과 반사·흡수 에너지
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;

  // 반사율 범위: 첨부 학습지 값 그대로
  const SURF = {
    thick: { name: '두꺼운 구름', min: 70, max: 90, def: 80, cloud: true, sw: 'linear-gradient(160deg,#ffffff,#b9c4d6)' },
    thin: { name: '얇은 구름', min: 25, max: 30, def: 27, cloud: true, sw: 'linear-gradient(160deg,#cfe0f5,#5f86b8)' },
    snow: { name: '눈', min: 50, max: 90, def: 80, sw: 'linear-gradient(160deg,#ffffff,#cfe1f2)' },
    wet: { name: '젖은 흙', min: 15, max: 25, def: 20, sw: 'linear-gradient(160deg,#6b5040,#2f2119)' },
    grass: { name: '풀', min: 5, max: 25, def: 15, sw: 'linear-gradient(160deg,#5fa04e,#23502a)' },
    sand: { name: '모래사장', min: 20, max: 40, def: 30, sw: 'linear-gradient(160deg,#ead2a0,#b8955c)' },
  };
  const ORDER = ['thick', 'thin', 'snow', 'wet', 'grass', 'sand'];
  const SPEED = 300;
  const C_IN = [255, 236, 170];
  const C_REF = [150, 255, 230];

  function surfY(type) { return SURF[type].cloud ? (type === 'thick' ? 300 : 330) : 515; }

  const M = {
    id: 'reflect',
    title: '반사',
    accent: SR.ACCENT.reflect,
    defaults: { compare: true, a: 'snow', b: 'grass' },

    principle: [
      '물체에 도달한 태양 복사 에너지 중 일부는 되돌아 나가고(반사), 나머지는 물체에 흡수된다(구름은 일부가 통과하기도 한다).',
      '반사율(반사되는 에너지 ÷ 입사 에너지)은 구름의 두께나 지표의 상태(눈, 흙, 식물 등)에 따라 다르다.',
      '반사율이 높은 표면일수록 같은 양의 햇빛을 받아도 흡수하는 에너지가 적어 덜 데워진다.',
    ],

    quiz: {
      q: '같은 양의 태양 복사 에너지가 들어올 때, 눈과 풀 중 어느 쪽이 더 많은 에너지를 반사할까?',
      hint: '‘두 대상 비교’에서 눈과 풀을 선택하고 반사율을 바꿔 보세요.',
      options: ['눈', '풀', '둘 다 같다'],
      answer: 0,
      action: { label: '눈 vs 풀 비교하기', run: () => M.preset('snow', 'grass') },
      explain: () => {
        const sa = M.s.a === 'snow' ? M.s.ra : M.s.b === 'snow' ? M.s.rb : 80;
        const ga = M.s.a === 'grass' ? M.s.ra : M.s.b === 'grass' ? M.s.rb : 15;
        return `학습지의 반사율은 눈 50~90%, 풀 5~25%로 범위가 겹치지 않습니다. 따라서 같은 에너지 100이 들어오면 눈은 50~90, 풀은 5~25만 반사하므로 항상 눈이 더 많이 반사합니다. ` +
          `(지금 설정: 눈 ${sa}% → 반사 ${sa}, 흡수 ${100 - sa} / 풀 ${ga}% → 반사 ${ga}, 흡수 ${100 - ga}) 반대로 흡수하는 에너지는 풀이 더 많아 풀밭이 눈밭보다 더 잘 데워집니다.`;
      },
    },

    init(app) {
      this.app = app;
      this.s = { ...this.defaults, ra: SURF.snow.def, rb: SURF.grass.def };
      this.fx = new SR.Effects();
      this.buildPanel();
      this.reset();
    },

    reset() {
      this.ph = [];
      this.fx.clear();
      this.panes = [this.newPane(), this.newPane()];
      this.t = 0;
    },
    newPane() {
      return { acc: 0, err: 0, n: 0, r: 0, a: 0, heat: 0, hold: 0 };
    },
    resetCounts(i) {
      const p = this.panes[i];
      if (!p) return;
      Object.assign(p, { n: 0, r: 0, a: 0, err: 0, hold: 0 });
      this.ph = this.ph.filter((q) => q.pane !== i);
    },

    restoreDefaults() {
      this.s.compare = true;
      this.ctl.compare.set(true, true);
      this.preset('snow', 'grass');
    },

    preset(a, b) {
      if (!this.s.compare) this.ctl.compare.set(true);
      this.setType('a', a, true);
      this.setType('b', b, true);
      this.change = `${SR.j(SURF[a].name, '과')} ${SR.j(SURF[b].name, '을')} 나란히 놓고, 같은 양의 햇빛(입사 에너지 100)을 비춥니다.`;
      this.onChange();
    },

    /* ---------------- 조절 패널 ---------------- */
    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      this.ctl = {};
      const s0 = ui.section('보기 방식');
      this.ctl.compare = ui.segmented({
        value: true,
        options: [{ value: false, label: '한 대상' }, { value: true, label: '두 대상 비교' }],
        onChange: (v) => {
          this.s.compare = v === true || v === 'true';
          this.secB.style.display = this.s.compare ? '' : 'none';
          this.reset();
          this.change = this.s.compare ? '화면을 좌우로 나누어 두 대상을 비교합니다.' : `${SURF[this.s.a].name} 하나만 자세히 봅니다.`;
          this.onChange();
        },
      });
      s0.appendChild(this.ctl.compare.el);
      const pre = SR.el('div', 'chips');
      [['snow', 'grass', '눈 vs 풀'], ['thick', 'thin', '두꺼운 vs 얇은 구름'], ['sand', 'wet', '모래 vs 젖은 흙']].forEach(([a, b, l]) => {
        const bt = SR.el('button', 'chip on', l);
        bt.type = 'button';
        bt.addEventListener('click', () => this.preset(a, b));
        pre.appendChild(bt);
      });
      const pw = SR.el('div', 'ctl');
      pw.append(SR.el('div', 'ctl-label', '빠른 비교'), pre);
      s0.appendChild(pw);

      const mk = (which, title) => {
        const sec = ui.section(title);
        const seg = ui.segmented({
          grid: true,
          value: this.s[which],
          options: ORDER.map((k) => ({ value: k, label: SURF[k].name, swatch: SURF[k].sw })),
          onChange: (v) => this.setType(which, v),
        });
        const key = which === 'a' ? 'ra' : 'rb';
        const sl = ui.slider({
          label: '반사율', min: SURF[this.s[which]].min, max: SURF[this.s[which]].max, value: this.s[key], unit: '%',
          ends: [`${SURF[this.s[which]].min}%`, `${SURF[this.s[which]].max}%`],
          hint: '학습지에 제시된 범위 안에서만 조절됩니다.',
          onInput: (v, base) => {
            this.s[key] = v;
            this.resetCounts(which === 'a' ? 0 : 1);
            if (base != null && base !== v) {
              const nm = SURF[this.s[which]].name;
              const lost = SURF[this.s[which]].cloud ? '반사되지 않는 에너지(투과·흡수)' : '흡수 에너지';
              this.change = `${nm}의 반사율을 ${base}% → ${v}%로 ${v > base ? '높이자' : '낮추자'} 반사 에너지는 ${base} → ${v}, ${lost}는 ${100 - base} → ${SR.j(100 - v, '로')} 바뀌었습니다.`;
            }
            this.onChange();
          },
        });
        sec.append(seg.el, sl.el);
        this.ctl[which] = seg;
        this.ctl[key] = sl;
        return sec;
      };
      this.secA = mk('a', '대상 A (왼쪽)');
      this.secB = mk('b', '대상 B (오른쪽)');

      const s3 = ui.section('학습지 반사율 표');
      const tb = SR.el('table', 'ro-table');
      tb.innerHTML = '<thead><tr><th>대상</th><th>반사율(%)</th></tr></thead><tbody>' +
        ORDER.map((k) => `<tr data-k="${k}"><td>${SURF[k].name}<span class="tag" data-tag="${k}"></span></td><td>${SURF[k].min}~${SURF[k].max}</td></tr>`).join('') + '</tbody>';
      this.table = tb;
      s3.appendChild(tb);
      const foot = SR.el('div', 'pnl-foot');
      foot.appendChild(ui.button('조건 기본값으로', () => this.restoreDefaults(), 'btn-ghost'));
      p.append(s0, this.secA, this.secB, s3, foot);
      this.panel = p;
      this.updateTable();
    },

    setType(which, v, silent) {
      const prev = this.s[which];
      this.s[which] = v;
      this.ctl[which].set(v, true);
      const key = which === 'a' ? 'ra' : 'rb';
      const sf = SURF[v];
      const sl = this.ctl[key];
      this.s[key] = sf.def;
      sl.setRange(sf.min, sf.max, sf.def);
      sl.el.querySelector('.ctl-ends').innerHTML = `<span>${sf.min}%</span><span>${sf.max}%</span>`;
      this.resetCounts(which === 'a' ? 0 : 1);
      this.bgKey = null;
      if (!silent) {
        this.change = prev !== v ? `${which === 'a' ? '왼쪽' : '오른쪽'} 대상을 ${SURF[prev].name} → ${SR.j(sf.name, '로')} 바꾸었습니다. 반사율 범위는 ${sf.min}~${sf.max}%이며, 대표값 ${sf.def}%로 설정했습니다.` : '';
        this.onChange();
      }
    },

    updateTable() {
      if (!this.table) return;
      this.table.querySelectorAll('tr[data-k]').forEach((tr) => {
        const k = tr.dataset.k;
        const isA = this.s.a === k, isB = this.s.compare && this.s.b === k;
        tr.classList.toggle('hl', isA || isB);
        tr.querySelector('.tag').textContent = isA && isB ? 'A·B' : isA ? 'A' : isB ? 'B' : '';
        tr.querySelector('.tag').style.display = isA || isB ? '' : 'none';
      });
    },

    onChange() {
      this.bgKey = null;
      this.updateTable();
      this.app.markDirty();
      this.app.refreshLive();
    },

    /* ---------------- 설명 ---------------- */
    live() {
      const one = (k, r) => {
        const c = SURF[k].cloud;
        return `<b>${SURF[k].name}(반사율 ${r}%)</b>: 입사 에너지 100 중 <b>${r}</b>${SR.j(r, '은').slice(String(r).length)} 반사되어 위로 되돌아가고, <b>${100 - r}</b>${SR.j(100 - r, '은').slice(String(100 - r).length)} ${c ? '구름을 통과하거나 구름에 흡수됩니다' : '지표에 흡수되어 지표를 데웁니다'}.`;
      };
      let t = one(this.s.a, this.s.ra);
      if (this.s.compare) {
        t += ' ' + one(this.s.b, this.s.rb);
        const A = this.s.ra, B = this.s.rb;
        if (A !== B) {
          const hi = A > B ? this.s.a : this.s.b, lo = A > B ? this.s.b : this.s.a;
          t += ` → 같은 햇빛을 받아도 <b>${SR.j(SURF[hi].name, '이')}</b> ${Math.abs(A - B)}만큼 더 반사하고, <b>${SR.j(SURF[lo].name, '은')}</b> 그만큼 더 많은 에너지를 ${SURF[lo].cloud ? '반사하지 못합니다' : '흡수합니다'}.`;
        } else t += ' → 두 대상의 반사율이 같아 반사·흡수 에너지도 같습니다.';
      }
      return { now: t, change: this.change };
    },

    /* ---------------- 장면 배치 ---------------- */
    paneRect(i) {
      if (!this.s.compare) return { x: 0, w: SR.W };
      return { x: i * 600, w: 600 };
    },
    paneInfo(i) {
      const R = this.paneRect(i);
      const type = i === 0 ? this.s.a : this.s.b;
      const r = i === 0 ? this.s.ra : this.s.rb;
      const big = !this.s.compare;
      const sun = { x: R.x + (big ? 110 : 76), y: big ? 92 : 84 };
      const tgt = { x: R.x + R.w * (big ? 0.46 : 0.5), y: surfY(type) };
      const spread = big ? 170 : 110;
      return { R, type, r, sun, tgt, spread, big, cloud: !!SURF[type].cloud };
    },

    /* ---------------- 애니메이션 ---------------- */
    emit(i) {
      const P = this.paneInfo(i);
      const tx = P.tgt.x + SR.rand(-P.spread, P.spread);
      const ty = P.cloud ? this.cloudTop(P, tx) : P.tgt.y;
      const sx = P.sun.x + SR.rand(-10, 10), sy = P.sun.y + SR.rand(-10, 10);
      const L = Math.hypot(tx - sx, ty - sy);
      this.ph.push({
        pane: i, x: sx, y: sy, vx: ((tx - sx) / L) * SPEED, vy: ((ty - sy) / L) * SPEED,
        tx, ty, state: 0, life: 0, trail: [], col: C_IN, a: 0.95, w: 2, r: 2.6,
      });
    },
    cloudTop(P, x) {
      // 구름 윗면의 높이 (그림과 일치하도록)
      const dx = (x - P.tgt.x) / (P.big ? 260 : 170);
      if (P.type === 'thick') return P.tgt.y - 60 * Math.sqrt(Math.max(0, 1 - dx * dx)) + 10;
      return P.tgt.y - 8;
    },

    land(q) {
      const pane = this.panes[q.pane];
      const P = this.paneInfo(q.pane);
      if (pane.n >= 100) Object.assign(pane, { n: 0, r: 0, a: 0, err: 0 });
      pane.n += 1;
      // 오차 확산: 100개마다 반사율과 정확히 같은 개수가 반사됨
      pane.err += P.r;
      const refl = pane.err >= 100;
      if (refl) pane.err -= 100;
      if (refl) {
        pane.r += 1;
        const th = Math.asin(2 * Math.random() - 1) * 0.85;
        q.vx = Math.sin(th) * SPEED;
        q.vy = -Math.cos(th) * SPEED;
        q.state = 1;
        q.col = C_REF;
        q.trail.length = 0;
        this.fx.add({ type: 'ring', x: q.x, y: q.y, col: C_REF, r0: 2, r1: 12, dur: 0.45, lw: 1.8 });
      } else {
        pane.a += 1;
        q.trail.length = 0;
        if (P.cloud) {
          q.state = 3; // 구름 통과(일부 흡수)
          const th = SR.rand(-0.5, 0.5);
          q.vx = Math.sin(th) * SPEED * 0.8;
          q.vy = Math.cos(th) * SPEED * 0.8;
          q.col = [200, 210, 230];
          q.a = 0.55;
          q.depth = P.type === 'thick' ? 120 : 50;
          q.y0 = q.y;
        } else {
          q.state = 2; // 흡수: 표면 속으로 들어가며 열로 바뀜
          q.vx *= 0.25;
          q.vy = SPEED * 0.18;
          q.y0 = q.y;
          pane.heat = Math.min(1.5, pane.heat + 0.12);
          this.fx.add({ type: 'heat', x: q.x, y: q.y + 12, r1: 22, dur: 0.9, col: [255, 140, 60] });
        }
      }
      if (pane.n >= 100) pane.hold = 1.2;
    },

    update(dt) {
      this.t += dt;
      const np = this.s.compare ? 2 : 1;
      for (let i = 0; i < np; i++) {
        const pn = this.panes[i];
        pn.acc += 24 * dt;
        while (pn.acc >= 1) { pn.acc -= 1; this.emit(i); }
        pn.heat = Math.max(0, pn.heat - dt * 0.6);
        pn.hold = Math.max(0, pn.hold - dt);
      }
      const keep = [];
      for (const q of this.ph) {
        if (q.pane >= np) continue;
        SR.pushTrail(q, 8);
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.life += dt;
        if (q.state === 0) {
          if (q.y >= q.ty) { q.y = q.ty; q.x = q.tx; this.land(q); }
        } else if (q.state === 1) {
          if (q.y < -20) continue;
        } else if (q.state === 2) {
          const k = (q.y - q.y0) / 34;
          q.a = Math.max(0, 1 - k);
          q.col = [255, Math.round(236 - 120 * k), Math.round(170 - 140 * k)].map((v) => SR.clamp(v, 0, 255));
          if (k >= 1) continue;
        } else if (q.state === 3) {
          const k = (q.y - q.y0) / (q.depth + 220);
          q.a = Math.max(0, 0.55 - k * 0.55);
          if (q.a <= 0.02 || q.y > SR.H) continue;
        }
        const R = this.paneRect(q.pane);
        if (q.x < R.x - 10 || q.x > R.x + R.w + 10) continue;
        keep.push(q);
      }
      this.ph = keep;
      this.fx.update(dt);
    },

    /* ---------------- 그리기 ---------------- */
    drawSurface(c, P) {
      const { R, type, r, big } = P;
      const sf = SURF[type];
      const k = (r - sf.min) / (sf.max - sf.min || 1); // 범위 안 위치 → 밝기
      const rnd = SR.rng(type.length * 97 + 3);
      if (sf.cloud) {
        // 구름 아래 지표(어둡게)
        const gy = 600;
        c.fillStyle = '#16301f';
        c.fillRect(R.x, gy, R.w, SR.H - gy);
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(R.x, gy, R.w, 2);
        const cx = P.tgt.x, cy = P.tgt.y;
        const half = big ? 260 : 170;
        if (type === 'thick') {
          const shade = SR.lerp(0.78, 1, k);
          for (let i = 0; i < 26; i++) {
            const u = rnd() * 2 - 1;
            const x = cx + u * half * 0.92;
            const top = cy - 60 * Math.sqrt(Math.max(0, 1 - u * u)) + 10;
            const rr = 26 + rnd() * 30;
            const y = top + rr * 0.85 + rnd() * 30;
            const gr = c.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
            const v = Math.round(255 * shade);
            gr.addColorStop(0, `rgb(${v},${v},${Math.min(255, v + 4)})`);
            gr.addColorStop(1, `rgb(${Math.round(v * 0.72)},${Math.round(v * 0.76)},${Math.round(v * 0.86)})`);
            c.fillStyle = gr;
            c.beginPath(); c.arc(x, y, rr, 0, 6.2832); c.fill();
          }
          const bg = c.createLinearGradient(0, cy + 10, 0, cy + 80);
          bg.addColorStop(0, 'rgba(150,160,180,0)');
          bg.addColorStop(1, 'rgba(110,120,140,0.6)');
          c.fillStyle = bg;
          c.beginPath(); c.ellipse(cx, cy + 50, half * 0.95, 34, 0, 0, 6.2832); c.fill();
        } else {
          const a = SR.lerp(0.22, 0.32, k);
          for (let i = 0; i < 16; i++) {
            const x = cx + (rnd() * 2 - 1) * half * 0.85;
            const y = cy + (rnd() * 2 - 1) * 12;
            c.fillStyle = `rgba(225,235,250,${a})`;
            c.beginPath(); c.ellipse(x, y, 60 + rnd() * 70, 5 + rnd() * 7, (rnd() - 0.5) * 0.08, 0, 6.2832); c.fill();
          }
        }
        return;
      }
      const top = P.tgt.y;
      const g = c.createLinearGradient(0, top, 0, SR.H);
      if (type === 'snow') {
        const v = SR.lerp(0.72, 1, k);
        const col = (r0, g0, b0) => `rgb(${Math.round(r0 * v)},${Math.round(g0 * v)},${Math.round(b0 * v)})`;
        g.addColorStop(0, col(250, 252, 255));
        g.addColorStop(1, col(185, 205, 228));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(R.x, SR.H);
        for (let x = R.x; x <= R.x + R.w; x += 20) c.lineTo(x, top + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.051) * 3);
        c.lineTo(R.x + R.w, SR.H);
        c.fill();
        for (let i = 0; i < 70; i++) {
          c.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.6})`;
          c.fillRect(R.x + rnd() * R.w, top + 6 + rnd() * (SR.H - top), 1.6, 1.6);
        }
        c.fillStyle = 'rgba(120,150,190,0.18)';
        for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(R.x + rnd() * R.w, top + 40 + rnd() * 100, 60 + rnd() * 50, 6, 0, 0, 6.2832); c.fill(); }
      } else if (type === 'grass') {
        const v = SR.lerp(0.75, 1.12, k);
        g.addColorStop(0, `rgb(${Math.round(60 * v)},${Math.round(118 * v)},${Math.round(56 * v)})`);
        g.addColorStop(1, '#18321b');
        c.fillStyle = g;
        c.fillRect(R.x, top, R.w, SR.H - top);
        c.lineWidth = 1.3;
        for (let i = 0; i < (big ? 900 : 480); i++) {
          const x = R.x + rnd() * R.w, y = top + rnd() * (SR.H - top) * 0.9 + 4;
          const h = 6 + rnd() * 9;
          const lv = 0.6 + rnd() * 0.6;
          c.strokeStyle = `rgba(${Math.round(80 * lv * v)},${Math.round(160 * lv * v)},${Math.round(70 * lv * v)},0.8)`;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 5, y - h); c.stroke();
        }
      } else if (type === 'wet') {
        const v = SR.lerp(0.8, 1.15, k);
        g.addColorStop(0, `rgb(${Math.round(92 * v)},${Math.round(68 * v)},${Math.round(52 * v)})`);
        g.addColorStop(1, '#1f1510');
        c.fillStyle = g;
        c.fillRect(R.x, top, R.w, SR.H - top);
        for (let i = 0; i < 120; i++) {
          c.fillStyle = `rgba(${40 + rnd() * 40},${28 + rnd() * 25},${20 + rnd() * 20},0.8)`;
          c.beginPath(); c.ellipse(R.x + rnd() * R.w, top + 6 + rnd() * (SR.H - top), 2 + rnd() * 5, 1.5 + rnd() * 2.5, 0, 0, 6.2832); c.fill();
        }
        c.fillStyle = 'rgba(200,220,255,0.12)';
        for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(R.x + rnd() * R.w, top + 12 + rnd() * 90, 30 + rnd() * 40, 3, 0, 0, 6.2832); c.fill(); }
      } else if (type === 'sand') {
        const v = SR.lerp(0.85, 1.08, k);
        g.addColorStop(0, `rgb(${Math.min(255, Math.round(232 * v))},${Math.round(206 * v)},${Math.round(150 * v)})`);
        g.addColorStop(1, '#8a6b3c');
        c.fillStyle = g;
        c.fillRect(R.x, top, R.w, SR.H - top);
        for (let i = 0; i < 900; i++) {
          c.fillStyle = rnd() < 0.5 ? 'rgba(120,90,50,0.35)' : 'rgba(255,245,220,0.45)';
          c.fillRect(R.x + rnd() * R.w, top + rnd() * (SR.H - top), 1.3, 1.3);
        }
        c.strokeStyle = 'rgba(140,105,60,0.35)';
        c.lineWidth = 1.2;
        for (let j = 0; j < 7; j++) {
          const yy = top + 18 + j * 22;
          c.beginPath();
          for (let x = R.x; x <= R.x + R.w; x += 10) c.lineTo(x, yy + Math.sin(x * 0.04 + j) * 3);
          c.stroke();
        }
      }
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(R.x, top, R.w, 1.5);
    },

    drawBackground(c) {
      const np = this.s.compare ? 2 : 1;
      for (let i = 0; i < np; i++) {
        const P = this.paneInfo(i);
        const R = P.R;
        const sky = c.createLinearGradient(0, 0, 0, SR.H);
        sky.addColorStop(0, '#0a1838');
        sky.addColorStop(0.75, '#1c3d6c');
        sky.addColorStop(1, '#2a5486');
        c.fillStyle = sky;
        c.fillRect(R.x, 0, R.w, SR.H);
        this.drawSurface(c, P);
      }
      if (np === 2) {
        c.fillStyle = 'rgba(4,9,21,0.9)';
        c.fillRect(598, 0, 4, SR.H);
      }
    },

    // 에너지 흐름 화살표(폭 ∝ 에너지)
    drawFlow(ctx, P) {
      const k = P.big ? 0.9 : 0.62;
      const S = P.sun, T = P.tgt;
      const ty = P.cloud ? this.cloudTop(P, T.x) : T.y;
      const ang = Math.atan2(ty - S.y, T.x - S.x);
      const band = (x1, y1, x2, y2, w, col, a) => {
        if (w <= 0.5) return;
        const an = Math.atan2(y2 - y1, x2 - x1);
        const hl = Math.min(26, 10 + w * 0.3);
        const ex = x2 - Math.cos(an) * hl, ey = y2 - Math.sin(an) * hl;
        ctx.strokeStyle = SR.css(col, a);
        ctx.lineWidth = w;
        ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
        const nx = -Math.sin(an), ny = Math.cos(an);
        ctx.fillStyle = SR.css(col, a);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(ex + nx * (w / 2 + 8), ey + ny * (w / 2 + 8));
        ctx.lineTo(ex - nx * (w / 2 + 8), ey - ny * (w / 2 + 8));
        ctx.closePath();
        ctx.fill();
      };
      const sx = S.x + Math.cos(ang) * 40, sy = S.y + Math.sin(ang) * 40;
      band(sx, sy, T.x - Math.cos(ang) * 6, ty - Math.sin(ang) * 6, 100 * k, C_IN, 0.16);
      // 반사: 입사의 거울 방향 쪽으로
      const rx = T.x + Math.cos(ang) * (P.big ? 250 : 170), ry = ty - Math.sin(ang) * (P.big ? 250 : 170);
      band(T.x + Math.cos(ang) * 8, ty - 8, rx, ry, P.r * k, C_REF, 0.2);
      if (P.cloud) {
        band(T.x, ty + 20, T.x + 20, 590, (100 - P.r) * k, [200, 210, 230], 0.13);
      } else {
        band(T.x, T.y + 4, T.x + 14, Math.min(SR.H - 6, T.y + 110), (100 - P.r) * k, [255, 130, 60], 0.22);
      }
    },

    drawBars(ctx, P, pane) {
      const big = P.big;
      const bw = big ? 54 : 40, gap = big ? 22 : 14, hmax = big ? 170 : 130;
      const x0 = P.R.x + P.R.w - (bw * 3 + gap * 2) - (big ? 50 : 26);
      const y0 = big ? 230 : 196;
      const vals = [100, P.r, 100 - P.r];
      const cols = [C_IN, C_REF, P.cloud ? [190, 200, 220] : [255, 138, 61]];
      const names = ['입사', '반사', P.cloud ? '투과·흡수' : '흡수'];
      ctx.fillStyle = 'rgba(4,10,24,0.55)';
      SR.roundRect(ctx, x0 - 14, y0 - hmax - 44, bw * 3 + gap * 2 + 28, hmax + 84, 12);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (bw + gap);
        const h = (vals[i] / 100) * hmax;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(x, y0 - hmax, bw, hmax);
        ctx.fillStyle = SR.css(cols[i], 0.92);
        ctx.fillRect(x, y0 - h, bw, h);
        SR.label(ctx, String(vals[i]), x + bw / 2, y0 - h - 8, { size: big ? 22 : 19, align: 'center', weight: 800, color: SR.css(cols[i]) });
        SR.label(ctx, names[i], x + bw / 2, y0 + 22, { size: P.cloud && i === 2 ? (big ? 15 : 13) : big ? 17 : 15, align: 'center', color: '#dfe8f7' });
      }
      // 애니메이션 누적 개수 (100개 묶음)
      const t = `빛 묶음 ${pane.n}/100 · 반사 ${pane.r} · ${P.cloud ? '투과·흡수' : '흡수'} ${pane.a}`;
      SR.label(ctx, t, x0 + (bw * 3 + gap * 2) / 2, y0 + 48 + (big ? 2 : 0), { size: big ? 15 : 13, align: 'center', color: pane.hold > 0 ? '#ffffff' : 'rgba(210,222,240,0.85)' });
    },

    draw(ctx) {
      const key = [this.s.compare, this.s.a, this.s.b, this.s.ra, this.s.rb].join('|');
      if (this.bgKey !== key || !this.bg || this.bg.ps !== this.app.ps) {
        this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
        this.bgKey = key;
      }
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      const np = this.s.compare ? 2 : 1;
      for (let i = 0; i < np; i++) {
        const P = this.paneInfo(i);
        const pane = this.panes[i];
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.R.x, 0, P.R.w, SR.H);
        ctx.clip();
        // 흡수로 데워진 표면
        if (!P.cloud) {
          const warm = ((100 - P.r) / 100) * 0.16 + pane.heat * 0.06;
          const hg = ctx.createLinearGradient(0, P.tgt.y, 0, P.tgt.y + 70);
          hg.addColorStop(0, `rgba(255,120,50,${warm})`);
          hg.addColorStop(1, 'rgba(255,90,30,0)');
          ctx.fillStyle = hg;
          ctx.fillRect(P.R.x, P.tgt.y, P.R.w, 70);
        }
        this.drawFlow(ctx, P);
        SR.drawSun(ctx, P.sun.x, P.sun.y, P.big ? 30 : 24);
        ctx.globalCompositeOperation = 'lighter';
        for (const q of this.ph) if (q.pane === i) SR.drawPhoton(ctx, q);
        this.fx.draw(ctx);
        ctx.globalCompositeOperation = 'source-over';
        this.drawBars(ctx, P, pane);
        // 이름표
        const nm = (this.s.compare ? (i === 0 ? 'A  ' : 'B  ') : '') + SURF[P.type].name;
        const ly = P.cloud ? 560 : P.tgt.y + 48;
        SR.label(ctx, nm, P.R.x + 22, ly, { size: P.big ? 26 : 22, weight: 800, color: '#ffffff', bg: 'rgba(4,10,24,0.55)' });
        SR.label(ctx, `반사율 ${P.r}%`, P.R.x + 22, ly + 30, { size: P.big ? 18 : 16, color: SR.ACCENT.reflect, bg: 'rgba(4,10,24,0.55)' });
        ctx.restore();
      }
      SR.label(ctx, '※ 선택한 대상 하나만 고려한 단순화 모형: 입사 에너지 100 = 반사 + 흡수(구름은 투과 포함)', SR.W / 2, SR.H - 12, { size: 14, align: 'center', color: 'rgba(225,235,250,0.85)', bg: 'rgba(4,10,24,0.6)' });
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
