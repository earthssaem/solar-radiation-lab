/* =========================================================
   보충 학습 팝업 — 왜 파란빛이 더 잘 산란될까? (레일리 산란)
   산란 시뮬레이션과 독립적으로 동작하며, 열려 있는 동안 자체 애니메이션만 돌린다.
   단순화 모형: 입사광의 전기장 → 결합된 전자 구름이 같은 진동수로 진동 → 진동하는 전하가 전자기파를 방출.
   (공기 분자의 고유 진동수는 자외선 영역에 있어, 가시광선에서는 진동 폭이 거의 같고
    방출 세기는 진동의 가속도 제곱 ∝ 진동수⁴ ∝ 1/파장⁴ 이 된다.)
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;
  const CW = 860, CHt = 330;
  const BLUE = [80, 150, 255], RED = [255, 90, 70], GREEN = [90, 230, 120], LIGHT = [255, 240, 200];
  const RATIO = Math.pow(650 / 450, 4); // ≈ 4.35

  const STEPS = [
    {
      title: '① 빛이 공기 분자를 만나면?',
      body: `<ol class="rl-list">
        <li><b>빛의 전기장</b>이 공기 분자에 도달한다.</li>
        <li>전기장이 위아래로 바뀌는 데 따라, 원자핵에 묶여 있는 <b>전자 구름이 진동</b>한다.</li>
        <li><b>진동하는 전하가 전자기파를 방출</b> → 빛이 여러 방향으로 퍼져 나간다(산란).</li>
      </ol>
      <p class="rl-note">전자가 튀어나오거나 빛과 부딪혀 튕기는 것이 아니라, 묶인 전하가 전기장에 반응해 흔들리는 것입니다. 실제 분자의 반응을 이해하기 위한 단순화한 그림이며 크기·진동 폭은 과장했습니다.</p>`,
    },
    {
      title: '② 왜 파란빛이 더 강하게 산란될까?',
      body: `<div class="rl-two">
        <div><b style="color:#6aa8ff">파란빛 450 nm</b><br>짧은 파장 · 높은 진동수<br>전자 구름이 <b>빠르게</b> 진동<br>산란되는 빛이 <b>강함</b></div>
        <div><b style="color:#ff6a55">빨간빛 650 nm</b><br>긴 파장 · 낮은 진동수<br>전자 구름이 <b>느리게</b> 진동<br>산란되는 빛이 <b>약함</b></div>
      </div>
      <p class="rl-note">같은 세기의 빛이 들어오면 전자 구름이 흔들리는 폭은 거의 같습니다. 하지만 <b>더 빠르게 왔다 갔다 할수록(진동수가 클수록) 진동하는 전하가 전자기파를 더 강하게 방출</b>합니다. 빛의 에너지가 커서가 아니라, 전하가 빠르게 진동하기 때문입니다.</p>`,
    },
    {
      title: '③ 얼마나 차이가 날까?',
      body: `<p class="rl-formula">산란 강도 ∝ 1 / 파장⁴ &nbsp;&nbsp;→&nbsp;&nbsp; (650 ÷ 450)⁴ ≈ <b>${RATIO.toFixed(2)}</b></p>
      <p class="rl-note">입사광의 세기와 다른 조건이 같을 때의 비교입니다. 공기 분자에서 파란빛(450 nm)은 빨간빛(650 nm)보다 약 <b>${RATIO.toFixed(1)}배</b> 강하게 산란됩니다.</p>`,
    },
    {
      title: '④ 모든 산란이 그럴까?',
      body: `<ul class="rl-list">
        <li><b>공기 분자</b>처럼 빛의 파장보다 매우 작은 입자 → 레일리 산란이 우세, 짧은 파장이 더 강하게 산란 → <b>파란 하늘</b></li>
        <li><b>구름 물방울</b>처럼 큰 입자 → 여러 가시광선 파장이 비교적 비슷하게 산란 → 구름이 대체로 <b>흰색</b></li>
      </ul>
      <p class="rl-note">1/파장⁴ 관계는 빛의 파장보다 매우 작은 입자에만 해당합니다. 산란되어도 빛의 색(파장)은 바뀌지 않습니다 — 빨간빛이 파란빛으로 변하는 것이 아니라, 색마다 산란되는 양이 다른 것입니다.</p>`,
    },
  ];

  const R = {
    open: false, step: 0, t: 0, playing: true, last: 0, built: false,

    build() {
      if (this.built) return;
      this.built = true;
      const ov = SR.el('div', 'rl-overlay');
      ov.hidden = true;
      ov.innerHTML = `
        <div class="rl-modal" role="dialog" aria-modal="true" aria-labelledby="rlTitle">
          <div class="rl-head">
            <h2 id="rlTitle">왜 파란빛이 더 잘 산란될까?</h2>
            <button type="button" class="rl-close" aria-label="닫기">✕</button>
          </div>
          <nav class="rl-tabs" role="tablist"></nav>
          <canvas class="rl-canvas" aria-label="레일리 산란 원리 애니메이션"></canvas>
          <div class="rl-body"></div>
          <div class="rl-foot">
            <button type="button" class="btn rl-play">⏸ 일시정지</button>
            <span class="rl-spacer"></span>
            <button type="button" class="btn rl-prev">◀ 이전</button>
            <button type="button" class="btn btn-acc rl-next">다음 ▶</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      this.ov = ov;
      this.modal = ov.querySelector('.rl-modal');
      this.canvas = ov.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.bodyEl = ov.querySelector('.rl-body');
      this.titleEl = ov.querySelector('#rlTitle');
      const tabs = ov.querySelector('.rl-tabs');
      this.tabBtns = STEPS.map((s, i) => {
        const b = SR.el('button', 'rl-tab', String(i + 1));
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', s.title);
        b.addEventListener('click', () => this.go(i));
        tabs.appendChild(b);
        return b;
      });
      ov.querySelector('.rl-close').addEventListener('click', () => this.close());
      ov.addEventListener('click', (e) => { if (e.target === ov) this.close(); });
      this.btnPlay = ov.querySelector('.rl-play');
      this.btnPlay.addEventListener('click', () => this.setPlaying(!this.playing));
      this.btnPrev = ov.querySelector('.rl-prev');
      this.btnNext = ov.querySelector('.rl-next');
      this.btnPrev.addEventListener('click', () => this.go(this.step - 1));
      this.btnNext.addEventListener('click', () => (this.step === STEPS.length - 1 ? this.close() : this.go(this.step + 1)));
      ov.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        if (e.key === 'Tab') { // 팝업 안에서만 초점 이동
          const f = [...this.modal.querySelectorAll('button')].filter((b) => !b.disabled);
          const i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
        e.stopPropagation(); // 뒤쪽 시뮬레이션의 단축키(스페이스바) 막기
      });
      new ResizeObserver(() => this.fit()).observe(this.canvas);
    },

    fit() {
      const w = this.canvas.clientWidth || CW;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round((w * CHt / CW) * dpr);
      this.ps = (w / CW) * dpr;
    },

    openPopup() {
      this.build();
      this.prevFocus = document.activeElement;
      this.ov.hidden = false;
      this.open = true;
      document.body.classList.add('rl-open');
      this.fit();
      this.go(this.step);
      this.last = performance.now();
      requestAnimationFrame((n) => this.frame(n));
      this.ov.querySelector('.rl-close').focus();
    },
    close() {
      this.open = false;
      this.ov.hidden = true;
      document.body.classList.remove('rl-open');
      if (this.prevFocus && this.prevFocus.focus) this.prevFocus.focus();
    },
    setPlaying(p) {
      this.playing = p;
      this.btnPlay.textContent = p ? '⏸ 일시정지' : '▶ 재생';
    },
    go(i) {
      this.step = SR.clamp(i, 0, STEPS.length - 1);
      this.t = 0;
      const s = STEPS[this.step];
      this.titleEl.textContent = s.title;
      this.bodyEl.innerHTML = s.body;
      this.tabBtns.forEach((b, k) => { b.classList.toggle('on', k === this.step); b.setAttribute('aria-selected', k === this.step ? 'true' : 'false'); });
      this.btnPrev.disabled = this.step === 0;
      this.btnNext.textContent = this.step === STEPS.length - 1 ? '닫기' : '다음 ▶';
      if (!this.playing) this.draw();
    },
    frame(now) {
      if (!this.open) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.playing) this.t += dt;
      this.draw();
      requestAnimationFrame((n) => this.frame(n));
    },

    /* ---------------- 그리기 도우미 ---------------- */
    // 오른쪽으로 진행하는 빛: 전기장(세로 화살표)과 파형
    wave(c, x0, x1, yc, lam, amp, t, speed, col, alpha = 1) {
      const k = (2 * Math.PI) / lam, w = k * speed;
      c.strokeStyle = SR.css(col, 0.9 * alpha);
      c.lineWidth = 2.4;
      c.beginPath();
      for (let x = x0; x <= x1; x += 2) {
        const y = yc - amp * Math.sin(k * (x - x0) - w * t);
        if (x === x0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      c.lineWidth = 1.5;
      for (let x = x0 + 8; x <= x1; x += lam / 6) {
        const e = amp * Math.sin(k * (x - x0) - w * t);
        if (Math.abs(e) < 4) continue;
        c.strokeStyle = SR.css(col, 0.4 * alpha);
        c.beginPath(); c.moveTo(x, yc); c.lineTo(x, yc - e); c.stroke();
        SR.arrowHead(c, x, yc - e, e > 0 ? -Math.PI / 2 : Math.PI / 2, 5, SR.css(col, 0.6 * alpha));
      }
      return Math.sin(k * (x1 - x0) - w * t); // 분자 위치의 전기장(−1~1)
    },
    // 원자핵(+)과 전자 구름(−). 전자 구름은 전기장과 반대 방향으로 밀림
    molecule(c, x, y, E, s = 1, label = true) {
      // 전기장이 위(+)를 향하면 음전하인 전자 구름은 아래로 밀림(화면 좌표 +)
      const cy = y + E * 14 * s;
      const g = c.createRadialGradient(x, cy, 2, x, cy, 30 * s);
      g.addColorStop(0, 'rgba(140,200,255,0.75)');
      g.addColorStop(1, 'rgba(140,200,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(x, cy, 30 * s, 26 * s, 0, 0, 6.2832); c.fill();
      c.fillStyle = '#ffb347';
      c.beginPath(); c.arc(x, y, 5.5 * s, 0, 6.2832); c.fill();
      c.fillStyle = '#06101f';
      c.font = `800 ${9 * s}px ${SR.FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('+', x, y + 0.5);
      if (label) {
        SR.label(c, '원자핵(+)', x + 44 * s, y + 22, { size: 12, color: '#ffcf8a', base: 'middle', bg: 'rgba(7,16,37,0.8)' });
        SR.label(c, '전자 구름(−)', x + 44 * s, y - 26, { size: 12, color: '#a9d4ff', base: 'middle', bg: 'rgba(7,16,37,0.8)' });
      }
    },
    // 진동하는 전하가 내보내는 전자기파: 퍼져 나가는 원(세로 진동 → 옆쪽으로 강하게)
    rings(c, x, y, lam, speed, t, col, strength, maxR) {
      const period = lam / speed;
      const n = Math.ceil(maxR / lam) + 1;
      for (let i = 0; i < n; i++) {
        const r2 = (t - i * period) * speed;
        const rr = r2 >= 0 ? (r2 % (n * lam)) : -1;
        if (rr < 8 || rr > maxR) continue;
        const fade = 1 - rr / maxR;
        for (let a = 0; a < 24; a++) {
          const th0 = (a / 24) * 6.2832, th1 = ((a + 1) / 24) * 6.2832;
          const s2 = Math.pow(Math.cos((th0 + th1) / 2), 2); // 진동 축(세로)과 수직인 방향일수록 강함
          c.strokeStyle = SR.css(col, Math.min(1, strength * fade * (0.15 + 0.85 * s2)));
          c.lineWidth = 2.2;
          c.beginPath(); c.arc(x, y, rr, th0, th1); c.stroke();
        }
      }
    },

    draw() {
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(this.ps, 0, 0, this.ps, 0, 0);
      c.fillStyle = '#071025';
      c.fillRect(0, 0, CW, CHt);
      [this.step1, this.step2, this.step3, this.step4][this.step].call(this, c, this.t);
    },

    step1(c, t) {
      const mx = 470, my = 165;
      this.rings(c, mx, my, 110, 80, t, BLUE, 0.9, 300);
      c.fillStyle = 'rgba(7,16,37,0.75)'; c.fillRect(20, my - 60, mx - 70, 120);
      const E = this.wave(c, 30, mx - 40, my, 110, 46, t, 80, LIGHT);
      SR.label(c, '① 빛의 전기장', 40, 40, { size: 15, weight: 800, color: '#fff0c8' });
      SR.label(c, '진행 방향 →', 40, 62, { size: 12, color: 'rgba(255,240,200,0.7)' });
      this.molecule(c, mx, my, E, 1.4);
      // 전자 구름 진동 표시
      c.strokeStyle = 'rgba(169,212,255,0.6)'; c.lineWidth = 1.5;
      c.setLineDash([3, 3]); c.beginPath(); c.moveTo(mx - 48, my - 24); c.lineTo(mx - 48, my + 24); c.stroke(); c.setLineDash([]);
      SR.arrowHead(c, mx - 48, my - 26, -Math.PI / 2, 7, 'rgba(169,212,255,0.8)');
      SR.arrowHead(c, mx - 48, my + 26, Math.PI / 2, 7, 'rgba(169,212,255,0.8)');
      SR.label(c, '② 전자 구름이 위아래로 진동', mx - 60, my + 64, { size: 15, weight: 800, color: '#a9d4ff', align: 'center' });
      SR.label(c, '③ 진동하는 전하가 전자기파 방출', CW - 20, 40, { size: 15, weight: 800, color: '#7fb6ff', align: 'right', bg: 'rgba(7,16,37,0.8)' });
      SR.label(c, '→ 여러 방향으로 산란 (옆으로 강하게, 위아래로 약하게)', CW - 20, 62, { size: 12, color: 'rgba(170,200,255,0.85)', align: 'right', bg: 'rgba(7,16,37,0.8)' });
      SR.label(c, '단순화한 모형 · 크기와 진동 폭은 과장', CW - 12, CHt - 10, { size: 11, align: 'right', color: 'rgba(210,222,240,0.6)' });
    },

    step2(c, t) {
      const half = CW / 2, speed = 70;
      const panel = (x0, lam, col, name, strength) => {
        const mx = x0 + 250, my = 175;
        c.save();
        c.beginPath(); c.rect(x0, 0, half, CHt); c.clip();
        const E = this.wave(c, x0 + 20, mx - 34, my, lam, 40, t, speed, col);
        this.rings(c, mx, my, lam, speed, t, col, strength, 170);
        this.molecule(c, mx, my, E, 1.1, false);
        c.restore();
        const f = speed / lam;
        SR.label(c, name, x0 + 20, 34, { size: 16, weight: 800, color: SR.css(col) });
        SR.label(c, `같은 시간 동안 진동한 횟수: ${Math.floor(t * f)}번`, x0 + 20, 58, { size: 13, color: 'rgba(230,236,248,0.9)' });
        SR.label(c, strength > 0.6 ? '산란파: 강함' : '산란파: 약함', mx, CHt - 18, { size: 14, weight: 800, align: 'center', color: SR.css(col) });
      };
      panel(0, 450 / 6.25, BLUE, '파란빛 450 nm · 높은 진동수', 1);
      panel(half, 650 / 6.25, RED, '빨간빛 650 nm · 낮은 진동수', 1 / RATIO + 0.08);
      c.fillStyle = 'rgba(150,180,230,0.25)';
      c.fillRect(half - 0.5, 14, 1, CHt - 28);
      SR.label(c, '두 빛은 같은 속력·같은 세기로 들어옴 (파장의 비율은 실제와 같음)', CW / 2, CHt - 44, { size: 12, align: 'center', color: 'rgba(210,222,240,0.7)' });
    },

    step3(c, t) {
      const grow = SR.smooth(SR.clamp(t / 1.4, 0, 1));
      const bx = 230, by = 285, bw = 120, maxH = 190;
      const bars = [[450, '파란빛 450 nm', BLUE], [650, '빨간빛 650 nm', RED]];
      const ref = Math.pow(1 / 450, 4);
      SR.label(c, '같은 세기로 입사할 때의 산란 강도 (빨간빛 = 1)', 40, 34, { size: 15, weight: 800 });
      c.strokeStyle = 'rgba(210,220,245,0.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(bx - 30, by); c.lineTo(bx + 420, by); c.stroke();
      bars.forEach(([l, n, col], i) => {
        const v = Math.pow(1 / l, 4) / ref; // 파란빛 = 1 기준
        const h = maxH * v * grow;
        const x = bx + i * 240;
        c.fillStyle = SR.css(col, 0.9);
        c.fillRect(x, by - h, bw, h);
        const rel = l === 450 ? RATIO : 1;
        SR.label(c, (rel * grow).toFixed(2), x + bw / 2, by - h - 10, { size: 20, weight: 800, align: 'center', color: SR.css(col) });
        SR.label(c, n, x + bw / 2, by + 22, { size: 14, align: 'center', color: '#e6edf8' });
      });
      if (grow > 0.98) {
        SR.label(c, `약 ${RATIO.toFixed(1)}배`, bx + 180, by - maxH / 2, { size: 22, weight: 800, align: 'center', color: '#ffffff', bg: 'rgba(4,10,24,0.7)' });
      }
      SR.label(c, '※ 입사광의 세기·입자 등 다른 조건이 같은 경우', CW - 12, CHt - 10, { size: 12, align: 'right', color: 'rgba(210,222,240,0.7)' });
    },

    step4(c, t) {
      const half = CW / 2;
      const rays = (x, y, len, lens, phase) => {
        for (let i = 0; i < 9; i++) {
          const th = (i / 9) * 6.2832 + 0.2;
          [[BLUE, lens[0]], [GREEN, lens[1]], [RED, lens[2]]].forEach(([col, L], j) => {
            const a = th + (j - 1) * 0.09;
            const k = ((t * 0.9 + phase + i * 0.13) % 1);
            const r0 = 22 + k * len * L, r1 = r0 + 16 * L;
            c.strokeStyle = SR.css(col, 0.9 * (1 - k));
            c.lineWidth = 2;
            c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke();
          });
        }
      };
      const incoming = (x0, x1, y) => {
        [[BLUE, -6], [GREEN, 0], [RED, 6]].forEach(([col, dy]) => {
          c.strokeStyle = SR.css(col, 0.8); c.lineWidth = 2;
          c.beginPath(); c.moveTo(x0, y + dy); c.lineTo(x1, y + dy); c.stroke();
        });
        SR.label(c, '햇빛(백색광)', x0, y - 16, { size: 12, color: 'rgba(255,240,200,0.85)' });
      };
      // 공기 분자
      const ax = 250, ay = 180;
      incoming(30, ax - 26, ay);
      rays(ax, ay, 110, [1, 0.62, 0.36], 0);
      c.fillStyle = '#a9d4ff'; c.beginPath(); c.arc(ax, ay, 4, 0, 6.2832); c.fill();
      SR.label(c, '공기 분자 (빛의 파장보다 매우 작음)', 30, 34, { size: 15, weight: 800, color: '#a9d4ff' });
      SR.label(c, '파란빛이 가장 많이 산란 → 파란 하늘', 30, 58, { size: 13, color: '#cfe0ff' });
      // 물방울
      const bx = half + 250, by = 180;
      incoming(half + 30, bx - 46, by);
      rays(bx, by, 110, [0.85, 0.85, 0.85], 0.3);
      const g = c.createRadialGradient(bx - 10, by - 10, 4, bx, by, 34);
      g.addColorStop(0, 'rgba(230,245,255,0.95)'); g.addColorStop(1, 'rgba(150,190,230,0.75)');
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, 32, 0, 6.2832); c.fill();
      SR.label(c, '구름 물방울 (빛의 파장보다 큼)', half + 30, 34, { size: 15, weight: 800, color: '#e6edf8' });
      SR.label(c, '여러 색이 비슷하게 산란 → 흰 구름', half + 30, 58, { size: 13, color: '#e6edf8' });
      c.fillStyle = 'rgba(150,180,230,0.25)';
      c.fillRect(half - 0.5, 14, 1, CHt - 28);
      SR.label(c, '그림의 입자 크기는 실제 비율이 아님', CW - 12, CHt - 10, { size: 11, align: 'right', color: 'rgba(210,222,240,0.6)' });
    },
  };

  SR.rayleigh = R;
})();
