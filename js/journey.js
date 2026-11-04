/* =========================================================
   ★ 종합 탐구: 태양 복사 에너지의 여행
   하나의 장면에서 단계별로 현상을 강조한다.
   (단계 순서는 관찰 순서일 뿐이며, 에너지 비율은 표시하지 않는다)
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;

  const TOP = 64;            // 대기 위쪽 경계
  const OZ = { y0: 84, y1: 126 };
  const GND = 560;
  const CLOUD = { x: 770, y: 282, rx: 150, ry: 44 };
  const DIR = (() => { const x = 0.58, y = 0.81, L = Math.hypot(x, y); return [x / L, y / L]; })();
  const SPEED = 260;
  const SUN = { x: 86, y: 32 };
  const HL = '#ffd166';

  const STEPS = [
    {
      key: 'in', title: '태양 복사 에너지의 입사', short: '입사', color: '#ffd166', rate: 14,
      text: '태양 복사 에너지가 대기의 위쪽 경계에 도달합니다. 이 빛에는 자외선·가시광선·적외선이 섞여 있으며, 이제부터 대기와 구름, 지표를 만나며 여러 현상이 일어납니다.',
      look: '대기 위쪽 경계(점선)로 들어오는 평행한 햇빛을 관찰하세요.',
    },
    {
      key: 'scat', title: '대기 중에서 산란', short: '산란', color: SR.ACCENT.scatter, rate: 26,
      text: '대기를 지나는 빛의 일부는 공기 분자에 의해 여러 방향으로 흩어집니다. 파장이 짧은 파란빛이 더 잘 산란되어 하늘 여러 방향에서 눈에 들어오므로 낮 하늘이 파랗게 보입니다.',
      look: '파란 알갱이가 빨간 알갱이보다 훨씬 자주 방향을 바꾸는지 비교해 보세요.',
    },
    {
      key: 'cloud', title: '구름에서 반사', short: '구름 반사', color: SR.ACCENT.reflect, rate: 16,
      text: '구름에 도달한 빛의 상당 부분은 반사되어 우주로 되돌아갑니다. 두꺼운 구름은 반사율이 70~90%로 높아서, 구름이 많은 날에는 지표에 도달하는 에너지가 줄어듭니다.',
      look: '구름 윗면에서 위로 되돌아가는 빛과 구름을 통과하는 빛을 비교해 보세요.',
    },
    {
      key: 'abs', title: '대기에서 흡수', short: '대기 흡수', color: SR.ACCENT.absorb, rate: 16,
      text: '오존은 주로 자외선을, 수증기는 적외선의 일부 파장대를 흡수합니다. 흡수된 에너지는 대기를 데우며, 가시광선은 대부분 흡수되지 않고 통과합니다.',
      look: '보라색 점선(자외선)은 오존층에서, 분홍 점선(적외선)은 아래쪽 수증기에서 흡수됩니다.',
    },
    {
      key: 'reach', title: '지표에 도달', short: '지표 도달', color: '#ffe9a8', rate: 16,
      text: '산란·반사·흡수되지 않고 대기를 통과한 햇빛과, 산란된 뒤 아래로 향한 빛의 일부가 지표에 도달합니다.',
      look: '지표에 닿는 지점의 반짝임을 관찰하세요.',
    },
    {
      key: 'gnd', title: '지표에서 반사와 흡수', short: '지표 반사·흡수', color: SR.ACCENT.absorb, rate: 18,
      text: '지표에 도달한 빛 중 일부는 반사되고(반사율은 지표의 상태에 따라 다름), 나머지는 지표에 흡수되어 지표의 온도를 높입니다.',
      look: '민트색으로 튀어 오르는 빛(반사)과 주황색 열로 바뀌는 빛(흡수)을 구분해 보세요.',
    },
    {
      key: 'refr', title: '대기를 지나며 굴절', short: '굴절', color: SR.ACCENT.refract, rate: 2.2,
      text: '대기는 아래로 갈수록 밀도가 커서, 빛은 대기를 지나면서 진행 방향이 조금씩 연속적으로 휘어집니다. 굴절은 에너지를 흡수하거나 되돌려 보내는 과정이 아니라 빛의 경로를 바꾸는 현상입니다.',
      look: '점선(직진했을 경우)과 실제 경로를 비교하세요. 그림은 크게 과장했으며, 실제 효과는 매우 작고 지평선 부근에서 가장 큽니다.',
    },
  ];

  // 굴절 경로(평행 층상 대기, n·sinθ = 일정) — 그림을 위해 크게 과장
  function refrPath(x0) {
    const s0 = DIR[0]; // sinθ (θ: 연직과 이루는 각)
    const dl = 0.32, Hs = 170;
    const n = (y) => 1 + dl * Math.exp(-(GND - y) / Hs);
    const pts = [];
    let x = x0 - (TOP + 12) * (DIR[0] / DIR[1]), y = -12;
    pts.push(x, y);
    const step = 3;
    while (y < GND) {
      const sn = y < TOP ? s0 : s0 / n(y);
      const cs = Math.sqrt(1 - sn * sn);
      x += sn * step;
      y += cs * step;
      pts.push(x, y);
    }
    return pts;
  }

  const M = {
    id: 'journey',
    title: '태양 복사 에너지의 여행',
    panelTitle: '종합 탐구 — 단계별 관찰',
    accent: SR.ACCENT.journey,
    principleKeys: null,

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
      this.fx = new SR.Effects();
      this.rpath = refrPath(420);
      this.buildPanel();
      this.reset();
    },

    reset() {
      this.ph = [];
      this.fx.clear();
      this.acc = STEPS.map(() => 0);
      this.heat = 0;
      this.t = 0;
    },

    go(k) {
      this.k = SR.clamp(k, 0, STEPS.length - 1);
      this.change = '';
      this.paintSteps();
      this.app.renderPrinciple();
      this.app.refreshLive();
      this.app.markDirty();
    },

    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      const s1 = ui.section('관찰 단계');
      const ol = SR.el('ol', 'steps');
      this.stepBtns = STEPS.map((st, i) => {
        const li = SR.el('li');
        const b = SR.el('button', '', `<span class="n">${i + 1}</span><span>${st.title}</span><i class="k" style="background:${st.color}"></i>`);
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
      s1.append(ol, nav);
      const s2 = ui.section('알아 둘 점');
      s2.appendChild(SR.el('p', 'ctl-hint', '• 단계의 순서는 학습을 위한 <b>관찰 순서</b>입니다. 모든 빛이 산란·반사·흡수·굴절을 이 순서대로 모두 겪는 것은 아닙니다.'));
      s2.appendChild(SR.el('p', 'ctl-hint', '• 이 모드는 현상의 종류와 위치를 보여 주며, 입사 에너지를 과정별 비율로 나눈 수치는 표시하지 않습니다. 굴절은 반사·흡수처럼 에너지를 나누는 과정이 아닙니다.'));
      s2.appendChild(SR.el('p', 'ctl-hint', '• 이미 지난 단계의 현상은 흐리게 남겨 두고, 현재 단계를 가장 밝게 표시합니다.'));
      const foot = SR.el('div', 'pnl-foot');
      foot.appendChild(ui.button('처음부터', () => { this.reset(); this.go(0); }, 'btn-ghost'));
      p.append(s1, s2, foot);
      this.panel = p;
      this.paintSteps();
    },

    paintSteps() {
      this.stepBtns.forEach((b, i) => {
        b.classList.toggle('cur', i === this.k);
        b.classList.toggle('done', i < this.k);
      });
      this.btnPrev.disabled = this.k === 0;
      this.btnNext.disabled = this.k === STEPS.length - 1;
      this.btnNext.textContent = this.k === STEPS.length - 1 ? '마지막 단계' : '다음 ▶';
    },

    live() {
      const st = STEPS[this.k];
      return { now: `<b>관찰 포인트</b> — ${st.look}`, change: '' };
    },

    /* ---------------- 빛 알갱이 ---------------- */
    startAt(xb, col, extra) {
      const x = xb - (TOP + 12) * (DIR[0] / DIR[1]);
      return Object.assign({ x, y: -12, vx: DIR[0] * SPEED, vy: DIR[1] * SPEED, trail: [], col, a: 1, w: 2, r: 2.5, phase: 0 }, extra);
    },
    emit(i) {
      const st = STEPS[i].key;
      const em = i === this.k ? 1 : 0.32;
      let p;
      if (st === 'in') {
        p = this.startAt(SR.rand(120, 1080), [255, 244, 210], { type: 'in' });
      } else if (st === 'scat') {
        const b = Math.random();
        const band = b < 0.34 ? 0 : b < 0.67 ? 1 : 2;
        const col = [[80, 150, 255], [90, 240, 120], [255, 85, 60]][band];
        const prob = [0.75, 0.33, 0.14][band];
        const sy = Math.random() < prob ? SR.rand(140, GND - 30) : 1e9;
        p = this.startAt(SR.rand(100, 470), col, { type: 'scat', sy, w: 1.8 });
      } else if (st === 'cloud') {
        const xc = SR.rand(CLOUD.x - CLOUD.rx * 0.85, CLOUD.x + CLOUD.rx * 0.85);
        const xb = xc - (CLOUD.y - 30 - TOP) * (DIR[0] / DIR[1]);
        p = this.startAt(xb, [255, 244, 210], { type: 'cloud', refl: Math.random() < 0.8 });
      } else if (st === 'abs') {
        const uv = Math.random() < 0.5;
        const fy = uv ? SR.rand(OZ.y0 + 4, OZ.y1 - 4) : Math.random() < 0.6 ? SR.rand(400, GND - 10) : 1e9;
        p = this.startAt(SR.rand(100, 460), uv ? [196, 160, 255] : [255, 80, 120], { type: 'abs', fy, dash: uv ? [2, 3] : [5, 4], w: 1.8 });
      } else if (st === 'reach') {
        p = this.startAt(SR.rand(100, 460), [255, 244, 210], { type: 'reach' });
      } else if (st === 'gnd') {
        p = this.startAt(SR.rand(100, 460), [255, 244, 210], { type: 'gnd', refl: Math.random() < 0.2 });
      } else if (st === 'refr') {
        p = { type: 'refr', idx: 0, x: this.rpath[0], y: this.rpath[1], trail: [], col: [235, 215, 255], a: 1, w: 2.6, r: 3 };
      }
      p.step = i;
      p.em = em;
      this.ph.push(p);
    },

    update(dt) {
      this.t += dt;
      for (let i = 0; i <= this.k; i++) {
        this.acc[i] += STEPS[i].rate * (i === this.k ? 1 : 0.3) * dt;
        while (this.acc[i] >= 1) { this.acc[i] -= 1; this.emit(i); }
      }
      this.heat = SR.clamp(this.heat + (this.k >= 5 ? dt * 0.08 : -dt * 0.05), 0, 1);
      const keep = [];
      for (const p of this.ph) {
        if (p.step > this.k) continue;
        p.em = p.step === this.k ? 1 : 0.32;
        SR.pushTrail(p, 8);
        if (p.type === 'refr') {
          p.idx += (SPEED * dt) / 3;
          const i = Math.floor(p.idx) * 2;
          if (i >= this.rpath.length - 2) {
            this.fx.add({ type: 'spark', x: p.x, y: p.y, col: [220, 200, 255], r1: 9, dur: 0.5, a: p.em });
            continue;
          }
          p.x = this.rpath[i]; p.y = this.rpath[i + 1];
          keep.push(p);
          continue;
        }
        const py = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'in') {
          if (py < TOP && p.y >= TOP && p.step === this.k) this.fx.add({ type: 'spark', x: p.x, y: TOP, col: [255, 220, 130], r1: 8, dur: 0.45 });
          if (p.y > TOP + 190) p.a = Math.max(0, p.a - dt * 2.2);
          if (p.a <= 0) continue;
        } else if (p.type === 'scat') {
          if (p.phase === 0 && p.y >= p.sy) {
            p.phase = 1;
            const th = Math.random() * 6.283;
            p.vx = Math.cos(th) * SPEED;
            p.vy = Math.sin(th) * SPEED;
            p.trail.length = 0;
            this.fx.add({ type: 'ring', x: p.x, y: p.y, col: p.col, r0: 2, r1: 11, dur: 0.45, a: p.em });
          }
          if (p.phase === 1) { p.life = (p.life || 0) + dt; p.a = Math.max(0, 1 - p.life * 0.6); if (p.a <= 0) continue; }
          if (p.y >= GND && p.phase === 0) { continue; }
          if (p.y >= GND) continue;
        } else if (p.type === 'cloud') {
          if (p.phase === 0) {
            const nx = (p.x - CLOUD.x) / CLOUD.rx, ny = (p.y - (CLOUD.y + 6)) / CLOUD.ry;
            if (nx * nx + ny * ny < 1) {
              p.phase = 1;
              p.trail.length = 0;
              if (p.refl) {
                const th = Math.asin(2 * Math.random() - 1) * 0.8;
                p.vx = Math.sin(th) * SPEED;
                p.vy = -Math.cos(th) * SPEED;
                p.col = [150, 255, 230];
                this.fx.add({ type: 'ring', x: p.x, y: p.y, col: [94, 234, 212], r0: 2, r1: 12, dur: 0.45, a: p.em });
              } else {
                p.vx *= 0.7; p.vy *= 0.7;
                p.col = [200, 210, 230];
                p.a = 0.5;
              }
            }
          }
          if (p.y < -20 || p.y >= GND) continue;
        } else if (p.type === 'abs') {
          if (p.y >= p.fy) {
            this.fx.add({ type: 'heat', x: p.x, y: p.y, r1: 20, dur: 0.9, a: p.em });
            continue;
          }
          if (p.y >= GND) continue;
        } else if (p.type === 'reach') {
          if (p.y >= GND) {
            this.fx.add({ type: 'spark', x: p.x, y: GND, col: [255, 236, 160], r1: 10, dur: 0.5, a: p.em });
            continue;
          }
        } else if (p.type === 'gnd') {
          if (p.phase === 0 && p.y >= GND) {
            p.y = GND;
            p.phase = 1;
            p.trail.length = 0;
            if (p.refl) {
              const th = Math.asin(2 * Math.random() - 1) * 0.8;
              p.vx = Math.sin(th) * SPEED;
              p.vy = -Math.cos(th) * SPEED;
              p.col = [150, 255, 230];
              this.fx.add({ type: 'ring', x: p.x, y: GND, col: [94, 234, 212], r0: 2, r1: 12, dur: 0.45, a: p.em });
            } else {
              p.vx *= 0.15; p.vy = SPEED * 0.12;
              p.life = 0;
              this.fx.add({ type: 'heat', x: p.x, y: GND + 10, r1: 24, dur: 1, a: p.em });
            }
          }
          if (p.phase === 1 && !p.refl) {
            p.life += dt;
            p.a = Math.max(0, 1 - p.life * 2.2);
            p.col = [255, 150, 70];
            if (p.a <= 0) continue;
          }
          if (p.y < -20) continue;
        }
        if (p.x < -30 || p.x > SR.W + 30) continue;
        keep.push(p);
      }
      this.ph = keep;
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
      SR.drawStars(c, 41, 60, SR.W, TOP);
      // 공기 분자 (아래로 갈수록 많음)
      const rnd = SR.rng(77);
      for (let i = 0; i < 420; i++) {
        const y = GND - 8 - (GND - TOP - 10) * Math.pow(rnd(), 1.8);
        c.fillStyle = 'rgba(205,225,255,0.3)';
        c.fillRect(rnd() * SR.W, y, 1.4, 1.4);
      }
      // 지표: 풀밭 + 모래 + 흙
      const gg = c.createLinearGradient(0, GND, 0, SR.H);
      gg.addColorStop(0, '#3b6a3e');
      gg.addColorStop(1, '#152a18');
      c.fillStyle = gg;
      c.fillRect(0, GND, SR.W, SR.H - GND);
      const sg = c.createLinearGradient(0, GND, 0, SR.H);
      sg.addColorStop(0, '#d8bd85');
      sg.addColorStop(1, '#7c6236');
      c.fillStyle = sg;
      c.beginPath();
      c.moveTo(900, GND); c.bezierCurveTo(960, GND + 30, 1020, GND + 40, 1200, GND + 34); c.lineTo(1200, GND); c.fill();
      c.lineWidth = 1.2;
      for (let i = 0; i < 520; i++) {
        const x = rnd() * 880, y = GND + 4 + rnd() * (SR.H - GND - 8);
        c.strokeStyle = `rgba(${90 + rnd() * 50},${150 + rnd() * 60},${70 + rnd() * 30},0.55)`;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 6); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(0, GND, SR.W, 1.5);
    },

    drawCloud(ctx, glow) {
      const rnd = SR.rng(9);
      if (glow) {
        ctx.strokeStyle = SR.css([94, 234, 212], 0.7);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.ellipse(CLOUD.x, CLOUD.y + 4, CLOUD.rx + 16, CLOUD.ry + 30, 0, 0, 6.2832); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (let i = 0; i < 18; i++) {
        const u = rnd() * 2 - 1;
        const x = CLOUD.x + u * CLOUD.rx * 0.9;
        const rr = 20 + rnd() * 26;
        const y = CLOUD.y + 18 - Math.sqrt(Math.max(0, 1 - u * u)) * 38 + rnd() * 16;
        const gr = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
        gr.addColorStop(0, 'rgba(255,255,255,0.97)');
        gr.addColorStop(1, 'rgba(185,198,220,0.95)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = 'rgba(150,162,185,0.85)';
      ctx.beginPath(); ctx.ellipse(CLOUD.x, CLOUD.y + 30, CLOUD.rx * 0.92, 16, 0, 0, 6.2832); ctx.fill();
    },

    draw(ctx) {
      if (!this.bg || this.bg.ps !== this.app.ps) this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      const k = this.k;
      const cur = STEPS[k].key;
      const on = (key) => STEPS.findIndex((s) => s.key === key) <= k;
      const em = (key) => (cur === key ? 1 : 0.4);

      // 굴절 단계: 밀도 분포 강조
      if (cur === 'refr') {
        const dg = ctx.createLinearGradient(0, TOP, 0, GND);
        dg.addColorStop(0, 'rgba(183,148,255,0)');
        dg.addColorStop(1, 'rgba(183,148,255,0.32)');
        ctx.fillStyle = dg;
        ctx.fillRect(0, TOP, SR.W, GND - TOP);
      }
      // 오존층
      const oa = on('abs') ? (cur === 'abs' ? 0.32 : 0.14) : 0.1;
      const og = ctx.createLinearGradient(0, OZ.y0, 0, OZ.y1);
      og.addColorStop(0, 'rgba(244,114,182,0)');
      og.addColorStop(0.5, `rgba(244,114,182,${oa})`);
      og.addColorStop(1, 'rgba(244,114,182,0)');
      ctx.fillStyle = og;
      ctx.fillRect(0, OZ.y0, SR.W, OZ.y1 - OZ.y0);
      if (cur === 'abs') {
        const wg = ctx.createLinearGradient(0, 380, 0, GND);
        wg.addColorStop(0, 'rgba(103,232,249,0)');
        wg.addColorStop(1, 'rgba(103,232,249,0.22)');
        ctx.fillStyle = wg;
        ctx.fillRect(0, 380, SR.W, GND - 380);
      }
      // 대기 위쪽 경계
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = cur === 'in' ? 2.4 : 1.2;
      ctx.strokeStyle = cur === 'in' ? 'rgba(255,209,102,0.9)' : 'rgba(170,200,255,0.4)';
      ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(SR.W, TOP); ctx.stroke();
      ctx.setLineDash([]);
      // 지표 열
      if (this.heat > 0) {
        const hg = ctx.createLinearGradient(0, GND, 0, GND + 70);
        hg.addColorStop(0, `rgba(255,120,50,${0.35 * this.heat})`);
        hg.addColorStop(1, 'rgba(255,100,40,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, GND, 900, 70);
      }
      if (cur === 'reach' || cur === 'gnd') {
        ctx.strokeStyle = 'rgba(255,233,168,0.8)';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(0, GND); ctx.lineTo(SR.W, GND); ctx.stroke();
      }

      // 평행한 햇빛(희미하게)
      ctx.strokeStyle = 'rgba(255,240,200,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let xb = 60; xb < 1200; xb += 60) {
        const x0 = xb - (TOP + 12) * (DIR[0] / DIR[1]);
        ctx.moveTo(x0, -12);
        ctx.lineTo(x0 + DIR[0] * 900, -12 + DIR[1] * 900);
      }
      ctx.stroke();

      SR.drawSun(ctx, SUN.x, SUN.y, 26);

      // 굴절 경로 비교
      if (on('refr')) {
        const a = cur === 'refr' ? 1 : 0.35;
        const p = this.rpath;
        let ix = 0;
        while (ix < p.length && p[ix + 1] < TOP) ix += 2;
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = `rgba(255,214,120,${0.85 * a})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p[ix], p[ix + 1]); ctx.lineTo(p[ix] + DIR[0] * 620, p[ix + 1] + DIR[1] * 620); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(215,195,255,${0.95 * a})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]);
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
        ctx.stroke();
      }

      // 빛
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.ph) {
        const a0 = p.a;
        p.a = a0 * p.em;
        SR.drawPhoton(ctx, p);
        p.a = a0;
      }
      ctx.globalCompositeOperation = 'source-over';
      this.drawCloud(ctx, cur === 'cloud');
      ctx.globalCompositeOperation = 'lighter';
      this.fx.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';

      SR.drawObserver(ctx, 1110, GND, 1.1, -1);

      // 이름표
      const tag = (key, text, x, y, opt = {}) => {
        if (!on(key)) return;
        const st = STEPS.find((s) => s.key === key);
        const isCur = cur === key;
        SR.label(ctx, text, x, y, { size: isCur ? 18 : 15, weight: isCur ? 800 : 600, color: isCur ? st.color : 'rgba(210,222,240,0.55)', bg: isCur ? 'rgba(4,10,24,0.75)' : null, ...opt });
      };
      SR.label(ctx, '우주', 1180, 30, { size: 15, align: 'right', color: 'rgba(200,215,240,0.7)' });
      SR.label(ctx, '대기의 위쪽 경계', 1180, TOP - 8, { size: 13, align: 'right', color: 'rgba(200,215,240,0.6)' });
      SR.label(ctx, '오존층', 1180, OZ.y1 - 12, { size: 14, align: 'right', color: 'rgba(244,140,195,0.75)' });
      SR.label(ctx, '구름', CLOUD.x + CLOUD.rx + 8, CLOUD.y + 40, { size: 14, color: 'rgba(225,235,250,0.7)' });
      SR.label(ctx, '지표', 18, GND + 26, { size: 15, color: 'rgba(210,240,210,0.85)' });
      tag('in', '① 대기로 입사', 300, TOP + 30);
      tag('scat', '② 공기 분자에 의한 산란 (파란빛이 더 많이)', 150, 250);
      tag('cloud', '③ 구름에서 반사 → 우주로', CLOUD.x - 110, CLOUD.y - 112);
      tag('abs', '④ 오존: 자외선 흡수', 470, OZ.y1 + 22);
      tag('abs', '④ 수증기: 적외선 일부 흡수', 470, 420);
      tag('reach', '⑤ 지표에 도달', 380, GND - 14);
      tag('gnd', '⑥ 지표: 일부 반사, 나머지 흡수 → 지표가 데워짐', 120, GND + 62);
      tag('refr', '⑦ 굴절: 경로가 연속적으로 휨 (과장)', 640, 470);
      SR.label(ctx, '※ 단계는 관찰 순서입니다. 모든 빛이 이 순서를 모두 겪지는 않습니다.', SR.W / 2, SR.H - 12, { size: 14, align: 'center', color: 'rgba(230,236,248,0.9)', bg: 'rgba(4,10,24,0.6)' });

      // 현재 단계 머리표
      const st = STEPS[k];
      SR.label(ctx, `${k + 1} / ${STEPS.length}  ${st.title}`, 140, 40, { size: 20, weight: 800, color: st.color, base: 'middle', bg: 'rgba(4,10,24,0.7)' });
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
