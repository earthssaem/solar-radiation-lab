/* =========================================================
   ③ 흡수 — 지구 대기의 선택적 흡수
   ① 태양 복사 에너지의 흡수  ② 지구 복사 에너지의 흡수(대기의 창·온실 효과)
   ③ 태양 복사와 지구 복사의 스펙트럼 비교
   광선은 정해진 파장(λ)을 가지고, 대기에서 흡수될 확률 = 그 파장에서 대기 기체의 흡수 정도.
   스펙트럼 그래프에는 지금 움직이는 광선의 파장이 함께 표시되어 그래프와 시뮬레이션이 일치한다.
   ========================================================= */
(function () {
  'use strict';
  const SR = window.SR;

  /* ---------------- 대기 기체의 흡수 특성(대표 흡수대 모양을 단순화한 정성적 모형) ---------------- */
  const Gs = (l, c, w, a) => a * Math.exp(-(((l - c) / w) ** 2));
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const GAS = {
    o3: {
      name: '오존·산소', short: 'O₃·O₂', col: [244, 114, 182],
      bands: '자외선(약 0.3 μm 이하), 9.6 μm 부근(오존)',
      A: (l) => cl((l < 0.3 ? 1 : l < 0.34 ? 1 - (l - 0.3) / 0.04 : 0) + Gs(l, 0.6, 0.08, 0.05) + Gs(l, 4.75, 0.1, 0.3) + Gs(l, 9.6, 0.25, 0.65) + Gs(l, 14.2, 0.3, 0.12)),
    },
    h2o: {
      name: '수증기', short: 'H₂O', col: [103, 232, 249],
      bands: '0.9~2.7 μm의 여러 띠, 6.3 μm 부근, 약 18 μm 이상',
      A: (l) => cl(Gs(l, 0.72, 0.012, 0.1) + Gs(l, 0.82, 0.015, 0.15) + Gs(l, 0.94, 0.03, 0.45) + Gs(l, 1.13, 0.035, 0.55) + Gs(l, 1.38, 0.06, 0.9) + Gs(l, 1.87, 0.08, 0.95) + Gs(l, 2.7, 0.18, 1) + Gs(l, 6.3, 0.9, 1) + 1 / (1 + Math.exp(-(l - 18) / 1.6)) + (l > 7 && l < 20 ? 0.07 : 0)),
    },
    co2: {
      name: '이산화 탄소', short: 'CO₂', col: [226, 232, 240],
      bands: '2.7 μm, 4.3 μm, 15 μm 부근',
      A: (l) => cl(Gs(l, 2.0, 0.04, 0.35) + Gs(l, 2.7, 0.08, 0.7) + Gs(l, 4.3, 0.2, 1) + Gs(l, 15, 1.3, 1) + Gs(l, 10.4, 0.15, 0.08) + Gs(l, 9.4, 0.15, 0.06)),
    },
    ch4: {
      name: '메테인', short: 'CH₄', col: [134, 239, 172],
      bands: '3.3 μm, 7.7 μm 부근',
      A: (l) => cl(Gs(l, 3.3, 0.12, 0.6) + Gs(l, 7.7, 0.35, 0.85)),
    },
    n2o: {
      name: '산화 이질소', short: 'N₂O', col: [253, 224, 71],
      bands: '4.5 μm, 7.8 μm, 17 μm 부근',
      A: (l) => cl(Gs(l, 3.9, 0.05, 0.2) + Gs(l, 4.5, 0.12, 0.9) + Gs(l, 7.8, 0.2, 0.6) + Gs(l, 17, 0.6, 0.35)),
    },
  };
  const GAS_ORDER = ['o3', 'h2o', 'co2', 'ch4', 'n2o'];
  const Atot = (l) => 1 - GAS_ORDER.reduce((p, k) => p * (1 - GAS[k].A(l)), 1);

  // 흑체 복사(파장 μm) — 빈의 변위 법칙 λmax = 2898 μm·K / T
  const T_SUN = 5800, T_EARTH = 288;
  const B = (l, T) => SR.planck(l * 1000, T);
  const peak = (T) => 2898 / T;
  const B_SUN_MAX = B(peak(T_SUN), T_SUN), B_EARTH_MAX = B(peak(T_EARTH), T_EARTH);
  const spec = (l, kind) => (kind === 'sun' ? B(l, T_SUN) / B_SUN_MAX : B(l, T_EARTH) / B_EARTH_MAX);
  // 실제 세기: 표면의 분광 복사 방출도 M(λ,T) = 2πhc²/λ⁵ / (e^(hc/λkT) − 1), 단위 W/(m²·μm)
  const Mex = (l, T) => { const lm = l * 1e-6; return (3.7418e-16 / (Math.pow(lm, 5) * (Math.exp(1.4388e-2 / (lm * T)) - 1))) * 1e-6; };
  const M_SUN_PEAK = Mex(peak(T_SUN), T_SUN);      // ≈ 8.4×10⁷
  const M_EARTH_PEAK = Mex(peak(T_EARTH), T_EARTH); // ≈ 26
  const SUN_DIL = (6.957e8 / 1.496e11) ** 2;        // 태양 표면 → 지구 대기 위(거리 제곱에 반비례)
  const REAL = { sun: M_SUN_PEAK * SUN_DIL, earth: M_EARTH_PEAK }; // 장면 그래프의 최댓값(W/(m²·μm))
  const sup = (n) => String(n).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(c)]).join('');

  /* ---------------- 장면 ---------------- */
  const SW = 720;                   // 시뮬레이션 장면 폭
  const CH = { x: 760, w: 420 };    // 그래프 영역
  const OZ = { y0: 96, y1: 152 };   // 성층권 오존층
  const GND = 520;
  const GAS_Y = { o3: [OZ.y0 + 6, OZ.y1 - 6], h2o: [330, 505], co2: [175, 505], ch4: [175, 505], n2o: [175, 505] };
  const RANGE = { sun: [0.1, 4], earth: [3, 50], compare: [0.1, 100] };

  const SEL = {
    sun: [
      { v: 'all', label: '전체', sw: 'linear-gradient(90deg,#c4a0ff,#5aa8ff,#7dff8a,#ffd166,#ff6b5a,#ff6b8a)' },
      { v: 'o3', label: '오존·산소', sw: '#f472b6' },
      { v: 'h2o', label: '수증기', sw: '#67e8f9' },
      { v: 'co2', label: '이산화 탄소', sw: '#e2e8f0' },
      { v: 'vis', label: '가시광선', sw: 'linear-gradient(90deg,#5aa8ff,#7dff8a,#ffd166,#ff6b5a)' },
    ],
    earth: [
      { v: 'all', label: '전체', sw: '#ff9a5a' },
      { v: 'h2o', label: '수증기', sw: '#67e8f9' },
      { v: 'co2', label: '이산화 탄소', sw: '#e2e8f0' },
      { v: 'ch4', label: '메테인', sw: '#86efac' },
      { v: 'n2o', label: '산화 이질소', sw: '#fde047' },
      { v: 'win', label: '대기의 창', sw: '#4ade80' },
    ],
  };
  // 빛 다발: 실제 복사처럼 여러 파장이 함께 진행(짧은 파장 → 긴 파장 순서로 나란히)
  const BUNDLE = {
    sun: [0.25, 0.3, 0.35, 0.42, 0.48, 0.55, 0.62, 0.68, 0.85, 0.94, 1.13, 1.38, 1.6, 1.87, 2.2, 2.7],
    earth: [5, 6.3, 7, 7.7, 8.6, 9.6, 10.5, 11.5, 12.5, 14, 15, 16.5, 18, 22],
  };
  const SPACING = 7;

  function colOf(l) {
    if (l < 0.4) return [196, 160, 255];
    if (l <= 0.7) return SR.waveColor(l * 1000);
    if (l < 4) return [255, 107, 138];
    return [255, 150, 90];
  }
  function dashOf(l) { return l < 0.4 ? [2, 3] : l <= 0.7 ? null : l < 4 ? [6, 4] : [10, 5]; }
  const fmtL = (l) => (l < 1 ? l.toFixed(2) : l < 10 ? l.toFixed(1) : l.toFixed(1).replace('.0', '')) + ' μm';

  const M = {
    id: 'absorb',
    title: '흡수',
    accent: SR.ACCENT.absorb,

    principle() {
      return {
        sun: [
          '태양은 표면 온도가 약 5800 K로 높아, 최대 에너지 파장이 약 0.5 μm(가시광선)인 단파 복사를 주로 방출한다.',
          '대기의 기체는 특정 파장만 골라 흡수한다: 오존·산소는 파장이 짧은 자외선, 수증기·이산화 탄소는 적외선의 특정 파장대.',
          '가시광선은 대기에 거의 흡수되지 않아 대부분 지표까지 도달하고, 지표가 이를 흡수한다.',
        ],
        earth: [
          '지구는 표면 온도가 약 288 K로 낮아, 최대 에너지 파장이 약 10 μm인 적외선(장파 복사)을 방출한다.',
          '수증기·이산화 탄소·메테인·산화 이질소 같은 온실 기체가 특정 적외선을 흡수했다가 여러 방향으로 재방출하고, 그 일부가 지표로 향한다.',
          '그래서 지표가 더 따뜻하게 유지된다(온실 효과). 흡수가 약한 8~13 μm의 대기의 창으로는 상당 부분이 우주로 빠져나간다.',
        ],
        compare: [
          '물체는 표면 온도에 따라 방출하는 복사 에너지의 파장 분포가 다르다.',
          '온도가 높을수록 최대 에너지 파장이 짧아진다(빈의 변위 법칙: λmax ≈ 2898 μm·K ÷ T).',
          '태양(약 5800 K)은 약 0.5 μm의 단파 복사를, 지구(약 288 K)는 약 10 μm의 장파 복사를 주로 방출한다.',
        ],
      }[this.s.scene];
    },
    principleBasic() {
      return {
        sun: ['태양 복사는 위에서 아래로 들어오는 단파 복사(최대 약 0.5 μm)이다.', '오존·산소는 자외선, 수증기·이산화 탄소는 적외선의 일부 파장만 흡수한다.', '가시광선은 대부분 흡수되지 않고 지표까지 도달한다.'],
        earth: ['지구 복사는 지표에서 위로 방출되는 장파 복사(적외선, 최대 약 10 μm)이다.', '온실 기체가 특정 적외선을 흡수했다가 여러 방향으로 다시 내보내고, 일부는 지표로 돌아온다 → 온실 효과.', '8~13 μm(대기의 창)는 흡수가 약해 상당 부분이 우주로 빠져나간다.'],
        compare: ['표면 온도가 다르면 방출하는 복사의 파장이 다르다.', '온도가 높을수록 최대 에너지 파장이 짧다.', '태양 ≈ 0.5 μm(단파 복사), 지구 ≈ 10 μm(장파 복사).'],
      }[this.s.scene];
    },

    principleShort() {
      return {
        sun: ['태양: 단파 복사(최대 ≈0.5 μm)', '기체마다 특정 파장만 흡수', '가시광선은 대부분 지표까지'],
        earth: ['지구: 장파 복사(최대 ≈10 μm)', '온실 기체가 흡수 → 여러 방향 재방출', '일부가 지표로 → 온실 효과'],
        compare: ['표면 온도가 다름', '최대 에너지 파장이 다름', '태양 ≈0.5 μm · 지구 ≈10 μm'],
      }[this.s.scene];
    },
    liveShort() {
      const sc = this.s.scene;
      if (sc === 'compare') return '온도가 높은 태양은 <b>짧은 파장</b>, 온도가 낮은 지구는 <b>긴 파장</b>을 주로 방출';
      const v = this.sel();
      const t = {
        sun: { all: '자외선 일부 → <b>오존층</b> · 적외선 일부 → <b>수증기·CO₂</b> · 가시광선 → <b>지표</b>', o3: '오존·산소: <b>파장이 짧은 자외선</b>을 위쪽에서 흡수', h2o: '수증기: <b>적외선의 좁은 띠</b>만 흡수, 띠 사이는 통과', co2: '이산화 탄소: <b>2.7 μm 부근</b> 등 일부 적외선만 흡수', vis: '가시광선: 거의 흡수되지 않고 <b>지표까지</b>' },
        earth: { all: '온실 기체가 흡수 → <b>여러 방향 재방출</b> · 대기의 창 → <b>우주로</b>', h2o: '수증기: <b>6.3 μm 부근, 18 μm 이상</b> 흡수', co2: '이산화 탄소: <b>15 μm 부근</b>을 강하게 흡수', ch4: '메테인: <b>7.7 μm 부근</b> 흡수', n2o: '산화 이질소: <b>7.8·17 μm 부근</b> 흡수', win: '대기의 창(8~13 μm): 대부분 <b>우주로</b> (9.6 μm는 오존이 일부 흡수)' },
      }[sc][v];
      return t + (sc === 'earth' && this.back > 0.3 ? ' · 지금 재방출 복사가 <b>지표로 돌아옴</b>' : '');
    },

    quiz: [
      {
        q: '태양 복사 에너지와 지구 복사 에너지 중 최대 에너지 파장이 더 긴 것은?',
        hint: '‘스펙트럼 비교’에서 두 곡선의 꼭대기 위치를 비교해 보세요.',
        options: ['태양 복사 에너지', '지구 복사 에너지', '둘이 같다'],
        answer: 1,
        explain: `표면 온도가 낮을수록 최대 에너지 파장이 길어집니다(빈의 변위 법칙). 태양(약 ${T_SUN} K)은 약 ${peak(T_SUN).toFixed(1)} μm, 지구(약 ${T_EARTH} K)는 약 ${peak(T_EARTH).toFixed(0)} μm에서 가장 강하게 방출하므로 지구 복사의 최대 에너지 파장이 약 20배 더 깁니다.`,
      },
      {
        q: '태양 복사 에너지의 가시광선은 대기에서 대부분 흡수될까, 지표까지 도달할까?',
        hint: '태양 복사 장면에서 ‘가시광선’을 고르고 광선이 어디까지 가는지 보세요.',
        options: ['대기에서 대부분 흡수된다', '대부분 지표까지 도달한다'],
        answer: 1,
        explain: '가시광선 파장(약 0.4~0.7 μm)에서는 대기 기체의 흡수가 매우 약해, 가시광선은 대부분 대기를 통과해 지표까지 도달하고 지표에 흡수됩니다. 오존·산소는 자외선을, 수증기·이산화 탄소는 적외선의 특정 파장을 흡수합니다.',
      },
      {
        q: '지구 복사 에너지의 적외선이 대기의 온실 기체에 흡수되면 어떤 현상이 나타날까?',
        hint: '지구 복사 장면에서 흡수된 뒤 다시 나오는 빛이 어느 방향으로 가는지 보세요.',
        options: ['온실 기체가 에너지를 흡수했다가 여러 방향으로 재방출하고, 그 일부가 지표로 돌아와 지표가 더 따뜻하게 유지된다', '적외선이 모두 우주로 빠져나가 지표가 빠르게 식는다', '흡수된 에너지는 사라져 지표 온도에 아무 영향이 없다'],
        answer: 0,
        explain: '온실 기체는 흡수한 적외선 에너지를 모든 방향으로 다시 방출합니다. 그중 지표로 향한 복사가 지표를 다시 데우므로 지표는 대기가 없을 때보다 따뜻하게 유지됩니다. 이것이 온실 효과입니다(재방출이 지표 방향으로만 일어나는 것은 아닙니다).',
      },
      {
        q: '대기의 창을 통해 지구 복사 에너지가 우주로 빠져나갈 수 있는 이유는?',
        hint: '지구 복사 장면에서 ‘대기의 창’을 고르고 그래프의 8~13 μm 구간을 보세요.',
        options: ['8~13 μm 파장에서는 온실 기체의 흡수가 상대적으로 약하기 때문', '대기의 창 영역에는 대기가 없기 때문', '이 파장의 복사는 지구가 아니라 태양에서 오기 때문'],
        answer: 0,
        explain: '8~13 μm 구간은 수증기·이산화 탄소 같은 온실 기체가 거의 흡수하지 않는 파장이라, 지구 복사의 상당 부분이 대기를 통과해 우주로 빠져나갑니다. 다만 9.6 μm 부근은 오존이 흡수하는 등 완전히 투명한 구간은 아닙니다.',
      },
    ],

    init(app) {
      this.app = app;
      this.lv = app.level;
      this.s = { scene: 'sun', sel: { sun: 'all', earth: 'all' }, cmp: 'split' };
      this.fx = new SR.Effects();
      this.makeMolecules();
      this.buildPanel();
      this.reset();
    },
    setLevel(lv) {
      this.lv = lv;
      this.bgKey = null;
      this.app.markDirty();
    },
    reset() {
      this.ph = [];
      this.fx.clear();
      this.acc = 0.85;
      this.back = 0; // 지표로 돌아온 재방출 복사(정성적 표시용)
      this.t = 0;
      this.lastMark = null;
    },
    sel() { return this.s.scene === 'compare' ? null : this.s.sel[this.s.scene]; },

    /* ---------------- 조절 패널 ---------------- */
    buildPanel() {
      const ui = SR.ui;
      const p = SR.el('div', 'pnl');
      const s0 = ui.section('장면');
      this.ctlScene = ui.segmented({
        value: this.s.scene,
        options: [{ value: 'sun', label: '태양 복사' }, { value: 'earth', label: '지구 복사' }, { value: 'compare', label: '스펙트럼 비교' }],
        onChange: (v) => {
          this.s.scene = v;
          this.reset();
          this.change = { sun: '태양 복사: 태양에서 온 단파 복사가 대기 위쪽에서 아래로 들어옵니다.', earth: '지구 복사: 지표가 방출한 장파 복사(적외선)가 지표에서 위쪽으로 나갑니다.', compare: '태양 복사와 지구 복사의 파장 분포를 나란히 비교합니다.' }[v];
          this.paintSel();
          this.onChange();
        },
      });
      s0.appendChild(this.ctlScene.el);
      // 스펙트럼 비교: 실제 세기를 두 그래프(각자 눈금)로 또는 하나의 로그 눈금으로
      this.ctlCmp = ui.segmented({
        label: '그래프 눈금 (실제 세기)',
        value: this.s.cmp,
        options: [{ value: 'split', label: '각각의 눈금 (학습지처럼)' }, { value: 'log', label: '하나의 로그 눈금' }],
        onChange: (v) => {
          this.s.cmp = v;
          this.change = v === 'split' ? '태양과 지구를 각자의 세로 눈금으로 그렸습니다. 세로축 숫자의 크기를 비교해 보세요.' : '두 복사를 같은 로그 눈금(한 칸마다 10배)에 그려 실제 크기 차이를 한눈에 봅니다.';
          this.onChange();
        },
      });
      s0.appendChild(this.ctlCmp.el);
      this.secSel = ui.section('기체 선택', '고른 기체가 흡수하는 파장이 그래프와 장면에서 함께 강조됩니다.');
      this.selWrap = SR.el('div');
      this.secSel.appendChild(this.selWrap);
      this.selInfo = SR.el('p', 'ctl-hint');
      this.secSel.appendChild(this.selInfo);

      const s2 = ui.section('기체별 주요 흡수 파장', '대표적인 흡수대를 단순화한 정성적 표현이며, 흡수율(%) 수치는 표시하지 않습니다.');
      const tb = SR.el('table', 'ro-table');
      const dot = (c) => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:6px"></i>`;
      tb.innerHTML = '<thead><tr><th>기체</th><th style="text-align:left">주로 흡수하는 파장</th></tr></thead><tbody>' +
        GAS_ORDER.map((k) => `<tr data-g="${k}"><td>${dot(SR.css(GAS[k].col))}${GAS[k].name}</td><td style="text-align:left;font-size:13px">${GAS[k].bands}</td></tr>`).join('') +
        `<tr data-g="win"><td>${dot('#4ade80')}대기의 창</td><td style="text-align:left;font-size:13px">8~13 μm: 흡수가 약함(9.6 μm 오존 흡수 등 예외)</td></tr></tbody>`;
      this.table = tb;
      s2.appendChild(tb);
      s2.classList.add('adv-only');
      p.append(s0, this.secSel, s2);
      this.panel = p;
      this.paintSel();
    },
    paintSel() {
      const sc = this.s.scene;
      this.selWrap.innerHTML = '';
      this.secSel.style.display = sc === 'compare' ? 'none' : '';
      if (this.ctlCmp) this.ctlCmp.el.style.display = sc === 'compare' ? '' : 'none';
      if (sc === 'compare') return;
      this.ctlSel = SR.ui.segmented({
        grid: true,
        value: this.s.sel[sc],
        options: SEL[sc].map((o) => ({ value: o.v, label: o.label, swatch: o.sw })),
        onChange: (v) => {
          this.s.sel[sc] = v;
          this.change = this.selText(v, sc);
          this.paintSel();
          this.onChange();
        },
      });
      this.selWrap.appendChild(this.ctlSel.el);
      const v = this.s.sel[sc];
      this.selInfo.innerHTML = GAS[v] ? `<b>${GAS[v].name}</b>: ${GAS[v].bands}` : v === 'win' ? '<b>대기의 창</b>: 8~13 μm, 온실 기체의 흡수가 약한 구간(완전히 투명하지는 않음)' : v === 'vis' ? '<b>가시광선</b>: 0.4~0.7 μm, 대기에 거의 흡수되지 않음' : '모든 기체의 흡수를 함께 봅니다.';
      if (this.table) this.table.querySelectorAll('tr[data-g]').forEach((tr) => tr.classList.toggle('hl', tr.dataset.g === v));
    },
    selText(v, sc) {
      if (sc === 'sun') return {
        all: '전체: 자외선 일부는 위쪽 오존층에서, 적외선 일부는 수증기·이산화 탄소에 흡수되고, 가시광선은 대부분 지표까지 갑니다.',
        o3: '오존·산소를 골랐습니다: 그래프의 자외선 쪽(약 0.3 μm 이하)이 강조되고, 그 파장의 광선이 대기 위쪽에서 흡수됩니다. 파장이 조금 더 긴 자외선은 일부 지표까지 옵니다.',
        h2o: '수증기를 골랐습니다: 적외선의 여러 좁은 띠(1.4·1.9·2.7 μm 등)에서만 흡수되고, 띠 사이의 적외선은 통과합니다.',
        co2: '이산화 탄소를 골랐습니다: 태양 복사에서는 2.7 μm 부근 등 일부 적외선만 흡수합니다.',
        vis: '가시광선을 골랐습니다: 대기 기체의 흡수가 거의 없어 대부분 지표까지 도달합니다.',
      }[v];
      return {
        all: '전체: 온실 기체가 흡수하는 파장은 흡수·재방출되고, 대기의 창(8~13 μm) 파장은 상당 부분 우주로 빠져나갑니다.',
        h2o: '수증기를 골랐습니다: 6.3 μm 부근과 약 18 μm보다 긴 적외선을 강하게 흡수합니다.',
        co2: '이산화 탄소를 골랐습니다: 지구 복사가 강한 15 μm 부근을 강하게 흡수합니다.',
        ch4: '메테인을 골랐습니다: 7.7 μm 부근을 흡수합니다.',
        n2o: '산화 이질소를 골랐습니다: 7.8 μm, 17 μm 부근 등을 흡수합니다.',
        win: '대기의 창을 골랐습니다: 8~13 μm의 적외선은 대부분 우주로 빠져나가지만, 9.6 μm 부근은 오존이 일부 흡수합니다.',
      }[v];
    },
    onChange() {
      this.bgKey = null;
      this.app.renderPrinciple();
      this.app.markDirty();
      this.app.refreshLive();
    },

    liveBasic() {
      const sc = this.s.scene;
      let now;
      if (sc === 'compare') now = `태양(약 ${T_SUN} K)의 최대 에너지 파장은 약 <b>${peak(T_SUN).toFixed(1)} μm</b>, 지구(약 ${T_EARTH} K)는 약 <b>${peak(T_EARTH).toFixed(0)} μm</b> → 온도가 높은 태양은 단파 복사, 온도가 낮은 지구는 장파 복사를 주로 방출합니다.`;
      else now = this.selText(this.sel(), sc) + (sc === 'earth' && this.back > 0.3 ? ' 지금 대기에서 다시 내보낸 복사 일부가 <b>지표로 돌아오고</b> 있습니다(온실 효과).' : '');
      return { now, change: '' };
    },
    live() {
      const L = this.liveBasic();
      return { now: L.now + (this.lastMark ? ` 방금 관찰한 광선: <b>${fmtL(this.lastMark.l)}</b> → ${this.lastMark.text}.` : ''), change: this.change };
    },

    /* ---------------- 분자 배치 ---------------- */
    makeMolecules() {
      const rnd = SR.rng(31);
      const N = { o3: 16, h2o: 24, co2: 12, ch4: 8, n2o: 8 };
      this.mol = {};
      for (const k of GAS_ORDER) {
        this.mol[k] = [];
        for (let i = 0; i < N[k]; i++) {
          const [y0, y1] = GAS_Y[k];
          const u = rnd();
          const y = k === 'h2o' ? y1 - (y1 - y0) * Math.pow(u, 1.5) : y0 + (y1 - y0) * u;
          this.mol[k].push({ x: 24 + rnd() * (SW - 60), y, ph: rnd() * 6.28, r: rnd() * 6.28, glow: 0 });
        }
      }
    },
    gasesIn(sc) { return sc === 'sun' ? ['o3', 'h2o', 'co2'] : ['h2o', 'co2', 'ch4', 'n2o', 'o3']; },

    /* ---------------- 빛 다발 ---------------- */
    // 선택한 기체·영역에 해당하는 파장인가(강조 표시용; 흡수 여부와는 무관)
    isOn(l) {
      const v = this.sel();
      if (!v || v === 'all') return true;
      if (v === 'vis') return l >= 0.4 && l <= 0.7;
      if (v === 'win') return l >= 8 && l <= 13;
      return GAS[v].A(l) > 0.2;
    },
    // 흡수 여부와 흡수한 기체: 흡수 확률 = 그 파장에서 대기 전체의 흡수 정도
    fate(l, sc) {
      const gases = this.gasesIn(sc);
      const As = gases.map((k) => GAS[k].A(l));
      const tot = 1 - As.reduce((p, a) => p * (1 - a), 1);
      if (Math.random() >= tot) return null;
      let u = Math.random() * As.reduce((s, a) => s + a, 0);
      for (let i = 0; i < gases.length; i++) { u -= As[i]; if (u <= 0) return gases[i]; }
      return gases[gases.length - 1];
    },
    emit() {
      const sc = this.s.scene;
      if (sc === 'compare') return;
      const ls = BUNDLE[sc];
      this.slot = ((this.slot || 0) + 0.41) % 1;
      const speed = 200;
      let cx, cy, dir;
      if (sc === 'sun') {
        const L = Math.hypot(0.24, 1);
        dir = [0.24 / L, 1 / L];
        cx = 110 + this.slot * (SW - 380); cy = -14;
      } else {
        const a = (Math.random() - 0.5) * 0.3;
        dir = [Math.sin(a), -Math.cos(a)];
        cx = 110 + this.slot * (SW - 260); cy = GND - 2;
      }
      const nrm = [-dir[1], dir[0]];
      const bundle = { id: (this.bid = (this.bid || 0) + 1), re: 0 };
      ls.forEach((l, i) => {
        const off = (i - (ls.length - 1) / 2) * SPACING;
        const gas = this.fate(l, sc);
        const p = { x: cx + nrm[0] * off, y: cy + nrm[1] * off, vx: dir[0] * speed, vy: dir[1] * speed };
        p.fy = gas ? SR.rand(...GAS_Y[gas]) : sc === 'sun' ? GND : -20;
        Object.assign(p, { l, gas, sc, bundle, col: colOf(l), dash: dashOf(l), trail: [], a: 1, w: 1.1, r: 1.05, state: 0, life: 0, idx: i });
        this.ph.push(p);
      });
    },
    reemit(p) {
      // 흡수한 기체가 적외선을 여러 방향으로 다시 방출(지표 방향만이 아님)
      // 모든 흡수 줄기가 재방출하지만, 화면이 복잡하지 않도록 다발마다 일부만 그림
      if (p.bundle.re >= 2 && Math.random() > 0.15) return;
      p.bundle.re++;
      const th0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 2; i++) {
        const th = th0 + i * Math.PI + (Math.random() - 0.5) * 0.8;
        this.ph.push({ x: p.x, y: p.y, vx: Math.cos(th) * 190, vy: Math.sin(th) * 190, l: p.l, re: true, col: [255, 150, 80], dash: [4, 4], trail: [p.x, p.y], a: 0.8, w: 1.2, r: 1.4, state: 0, life: 0 });
      }
      this.fx.add({ type: 'ring', x: p.x, y: p.y, col: [255, 170, 110], r0: 3, r1: 16, dur: 0.6, lw: 2 });
    },
    glowMol(gas, x, y) {
      let best = null, bd = 1e9;
      for (const m of this.mol[gas]) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } }
      if (best) best.glow = 1;
    },

    update(dt) {
      this.t += dt;
      if (this.s.scene !== 'compare') {
        this.acc += (this.lv === 'basic' ? 0.42 : 0.6) * dt;
        while (this.acc >= 1) { this.acc -= 1; this.emit(); }
      }
      for (const k of GAS_ORDER) for (const m of this.mol[k]) m.glow = Math.max(0, m.glow - dt * 0.9);
      this.back = Math.max(0, this.back - dt * 0.25);
      const keep = [];
      for (const p of this.ph) {
        SR.pushTrail(p, p.re ? 40 : 26);
        if (p.state === 0) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.re) {
            if (p.y >= GND) { this.back = Math.min(1.5, this.back + 0.35); this.fx.add({ type: 'heat', x: p.x, y: GND + 8, r1: 26, dur: 1.1 }); continue; }
            if (p.y < -20 || p.x < -20 || p.x > SW + 20) continue;
          } else if (p.sc === 'sun' ? p.y >= p.fy : p.y <= p.fy) {
            if (p.gas) {
              p.state = 1; p.life = 0;
              this.glowMol(p.gas, p.x, p.y);
              this.fx.add({ type: 'heat', x: p.x, y: p.y, r1: 22, dur: 0.9 });
              this.fx.add({ type: 'ring', x: p.x, y: p.y, col: GAS[p.gas].col, r0: 3, r1: 14, dur: 0.6, lw: 2 });
              this.lastMark = { l: p.l, text: `${GAS[p.gas].name}에 흡수` };
            } else if (p.sc === 'sun') {
              this.fx.add({ type: 'heat', x: p.x, y: GND + 10, r1: 24, dur: 1 });
              this.lastMark = { l: p.l, text: '대기를 통과해 지표에 흡수' };
              p.state = 2; p.life = 0;
            } else {
              const win = p.l >= 8 && p.l <= 13;
              this.lastMark = { l: p.l, text: win ? '대기의 창을 지나 우주로' : '대기를 통과해 우주로' };
              if (win) this.fx.add({ type: 'spark', x: p.x, y: 12, col: [74, 222, 128], r1: 14, dur: 0.8 });
              continue;
            }
          }
          if (p.x < -30 || p.x > SW + 30) continue;
        } else if (p.state === 1) {
          // 흡수: 빛의 에너지가 기체에 전달되어 사라짐 → (지구 복사) 잠시 뒤 재방출
          p.life += dt;
          p.a = Math.max(0, 1 - p.life * 2.2);
          if (p.life > 0.45) { if (p.sc === 'earth') this.reemit(p); continue; }
        } else {
          p.life += dt;
          p.a = Math.max(0, 1 - p.life * 2.5);
          if (p.a <= 0) continue;
        }
        keep.push(p);
      }
      this.ph = keep;
      this.fx.update(dt);
      this._lt = (this._lt || 0) + dt;
      if (this._lt > 0.5) { this._lt = 0; this.app.refreshLive(); }
    },

    /* ---------------- 그리기: 장면 ---------------- */
    drawScene(c) {
      const sc = this.s.scene;
      const g = c.createLinearGradient(0, 0, 0, GND);
      g.addColorStop(0, '#040915');
      g.addColorStop(0.18, '#0a1734');
      g.addColorStop(1, '#1d3f6e');
      c.fillStyle = g;
      c.fillRect(0, 0, SW, GND);
      SR.drawStars(c, 3, 40, SW, 70);
      const og = c.createLinearGradient(0, OZ.y0, 0, OZ.y1);
      og.addColorStop(0, 'rgba(244,114,182,0)');
      og.addColorStop(0.5, 'rgba(244,114,182,0.16)');
      og.addColorStop(1, 'rgba(244,114,182,0)');
      c.fillStyle = og;
      c.fillRect(0, OZ.y0, SW, OZ.y1 - OZ.y0);
      const wg = c.createLinearGradient(0, 330, 0, GND);
      wg.addColorStop(0, 'rgba(103,232,249,0)');
      wg.addColorStop(1, 'rgba(103,232,249,0.12)');
      c.fillStyle = wg;
      c.fillRect(0, 330, SW, GND - 330);
      c.setLineDash([6, 6]);
      c.strokeStyle = 'rgba(170,200,255,0.4)';
      c.beginPath(); c.moveTo(0, 70); c.lineTo(SW, 70); c.stroke();
      c.setLineDash([]);
      const gg = c.createLinearGradient(0, GND, 0, SR.H);
      if (sc === 'earth') { gg.addColorStop(0, '#6a4024'); gg.addColorStop(1, '#2a160c'); }
      else { gg.addColorStop(0, '#4d5a2c'); gg.addColorStop(1, '#1d200f'); }
      c.fillStyle = gg;
      c.fillRect(0, GND, SW, SR.H - GND);
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(0, GND, SW, 1.5);
      SR.label(c, '우주', SW - 12, 28, { size: 15, align: 'right', color: 'rgba(200,215,240,0.75)' });
      SR.label(c, '대기의 위쪽', SW - 12, 64, { size: 12, align: 'right', color: 'rgba(200,215,240,0.6)' });
      SR.label(c, '오존층', SW - 12, OZ.y0 + 16, { size: 13, align: 'right', color: 'rgba(244,140,195,0.85)' });
      SR.label(c, '지표', 14, GND + 26, { size: 15, color: 'rgba(240,220,190,0.9)' });
      SR.label(c, '층의 높이·두께는 실제 비율이 아닙니다', SW - 10, SR.H - 10, { size: 12, align: 'right', color: 'rgba(230,220,200,0.6)' });
    },

    drawMolecules(ctx) {
      const sc = this.s.scene, v = this.sel();
      const t = this.t;
      for (const k of this.gasesIn(sc)) {
        const on = v === 'all' || v === k;
        const base = on ? 0.9 : 0.22;
        const col = GAS[k].col;
        for (const m of this.mol[k]) {
          const amp = 0.6 + m.glow * 4;
          const x = m.x + Math.sin(t * 9 + m.ph) * amp, y = m.y + Math.cos(t * 11 + m.ph) * amp;
          if (m.glow > 0.05) {
            const gr = ctx.createRadialGradient(x, y, 0, x, y, 18);
            gr.addColorStop(0, `rgba(255,150,70,${0.6 * m.glow})`);
            gr.addColorStop(1, 'rgba(255,150,70,0)');
            ctx.fillStyle = gr;
            ctx.beginPath(); ctx.arc(x, y, 18, 0, 6.2832); ctx.fill();
          }
          ctx.fillStyle = SR.css(col, base);
          if (k === 'o3') {
            for (let j = 0; j < 3; j++) { const a = m.r + j * 2.094; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.3, 0, 6.2832); ctx.fill(); }
          } else if (k === 'h2o') {
            ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.2832); ctx.fill();
            ctx.fillStyle = `rgba(235,245,255,${base})`;
            ctx.beginPath(); ctx.arc(x + Math.cos(m.r) * 5, y + Math.sin(m.r) * 5, 1.9, 0, 6.2832); ctx.fill();
            ctx.beginPath(); ctx.arc(x + Math.cos(m.r + 1.82) * 5, y + Math.sin(m.r + 1.82) * 5, 1.9, 0, 6.2832); ctx.fill();
          } else if (k === 'ch4') {
            ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.2832); ctx.fill();
            for (let j = 0; j < 4; j++) { const a = m.r + j * 1.571; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 1.6, 0, 6.2832); ctx.fill(); }
          } else {
            // CO₂, N₂O: 일직선 분자
            const dx = Math.cos(m.r) * 5, dy = Math.sin(m.r) * 5;
            ctx.beginPath(); ctx.arc(x - dx, y - dy, 2.4, 0, 6.2832); ctx.arc(x + dx, y + dy, 2.4, 0, 6.2832); ctx.fill();
            ctx.fillStyle = k === 'co2' ? `rgba(60,70,90,${base})` : SR.css(col, base);
            ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.2832); ctx.fill();
          }
        }
      }
      // 분자 범례
      let lx = 14;
      for (const k of this.gasesIn(sc)) {
        const on = v === 'all' || v === k;
        SR.label(ctx, '● ' + GAS[k].short, lx, GND + 56, { size: 14, weight: 700, color: SR.css(GAS[k].col, on ? 1 : 0.4) });
        lx += 84;
      }
    },

    drawPhotons(ctx) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, SW, SR.H); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.ph) {
        if (p.re) { SR.drawPhoton(ctx, p); continue; }
        const on = this.isOn(p.l);
        const a0 = p.a, w0 = p.w;
        p.a = a0 * (on ? 1 : 0.28);
        p.w = on ? 1.3 : 0.8;
        SR.drawPhoton(ctx, p);
        p.a = a0; p.w = w0;
      }
      this.fx.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';
      // 다발 머리에 이름표: 전체 → 파장 영역, 기체 선택 → 강조된 줄기의 파장
      const v = this.sel();
      const seen = {};
      for (const p of this.ph) {
        if (p.re || p.state !== 0) continue;
        const b = p.bundle.id;
        if (v === 'all') {
          const grp = p.l < 0.4 ? '자외선' : p.l <= 0.7 ? '가시광선' : '적외선';
          const k = b + grp;
          if (seen[k] || p.sc === 'earth') continue;
          seen[k] = 1;
          if (p.sc === 'sun' && p.y > 260) continue;
          SR.label(ctx, grp, p.x + 6, p.y - 10, { size: 12, weight: 700, color: SR.css(p.col), bg: 'rgba(4,10,24,0.6)', align: 'right' });
        } else if (this.isOn(p.l)) {
          // 다발마다 이름표 하나: 강조된 줄기들의 파장을 한 줄로
          (seen[b] = seen[b] || { ls: [], x: -1e9, y: p.y, col: p.col }).ls.push(p.l);
          if (p.x > seen[b].x) Object.assign(seen[b], { x: p.x, y: p.y, col: p.col });
        }
      }
      if (v !== 'all') {
        for (const b in seen) {
          const g = seen[b];
          const ls = [...new Set(g.ls)].sort((a, c) => a - c);
          const txt = ls.map((l) => fmtL(l).replace(' μm', '')).join(' · ') + ' μm';
          SR.label(ctx, txt, g.x + 14, g.y, { size: 13, weight: 700, color: SR.css(g.col), bg: 'rgba(4,10,24,0.72)', base: 'middle' });
        }
      }
      ctx.restore();
    },

    /* ---------------- 그리기: 그래프 ---------------- */
    axis(range, x, w) {
      const [a, b] = range;
      return (l) => x + (Math.log(l / a) / Math.log(b / a)) * w;
    },
    drawSpectrumChart(c, box, kind, range, opt = {}) {
      const { x, y, w, h } = box;
      const X = this.axis(range, x, w);
      const Y = (v) => y + h - v * h * 0.86;
      const v = this.sel();
      const N = 260;
      const ls = [];
      for (let i = 0; i <= N; i++) ls.push(range[0] * Math.pow(range[1] / range[0], i / N));
      if (range[0] < 0.4) { c.fillStyle = 'rgba(196,160,255,0.08)'; c.fillRect(X(range[0]), y, X(0.4) - X(range[0]), h); }
      if (opt.window || (v === 'win' && kind === 'earth')) {
        c.fillStyle = 'rgba(74,222,128,0.14)'; c.fillRect(X(8), y, X(13) - X(8), h);
        SR.label(c, '대기의 창', (X(8) + X(13)) / 2, y + 14, { size: 13, weight: 700, align: 'center', color: '#86efac' });
      }
      if (v === 'vis' && kind === 'sun') { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.setLineDash([4, 3]); c.strokeRect(X(0.4), y, X(0.7) - X(0.4), h); c.setLineDash([]); }
      const curves = kind === 'both' ? ['sun', 'earth'] : [kind];
      for (const kd of curves) {
        for (let i = 0; i < N; i++) {
          const l = ls[i], s = spec(l, kd);
          if (s < 0.002) continue;
          const vis = l >= 0.4 && l <= 0.7;
          const col = kd === 'sun' ? (vis ? SR.waveColor(l * 1000) : l < 0.4 ? [160, 120, 230] : [230, 110, 120]) : [255, 140, 80];
          c.fillStyle = SR.css(col, kd === 'sun' && vis ? 0.75 : 0.32);
          c.fillRect(X(l), Y(s), X(ls[i + 1]) - X(l) + 0.6, Y(0) - Y(s));
        }
        // 흡수되는 부분(선택한 기체 또는 전체 대기)
        if (!opt.noAbs && v && v !== 'vis') {
          const one = GAS[v];
          const Af = one ? one.A : Atot;
          const ac = one ? one.col : [120, 170, 255];
          c.fillStyle = SR.css(ac, 0.75);
          c.beginPath();
          ls.forEach((l, i) => { const s = spec(l, kd); if (i) c.lineTo(X(l), Y(s)); else c.moveTo(X(l), Y(s)); });
          for (let i = N; i >= 0; i--) { const l = ls[i]; c.lineTo(X(l), Y(spec(l, kd) * (1 - Af(l)))); }
          c.closePath();
          c.fill();
        }
        c.strokeStyle = kd === 'sun' ? '#ffd166' : '#ff9a5a';
        c.lineWidth = 2.2;
        c.beginPath();
        ls.forEach((l, i) => { if (i) c.lineTo(X(l), Y(spec(l, kd))); else c.moveTo(X(l), Y(spec(l, kd))); });
        c.stroke();
        if (opt.peaks) {
          const T = kd === 'sun' ? T_SUN : T_EARTH, lp = peak(T);
          c.setLineDash([3, 4]);
          c.strokeStyle = 'rgba(255,255,255,0.6)';
          c.beginPath(); c.moveTo(X(lp), Y(1)); c.lineTo(X(lp), Y(0)); c.stroke();
          c.setLineDash([]);
          SR.label(c, `최대 ≈ ${lp.toFixed(lp < 1 ? 2 : 1)} μm`, X(lp), Y(1) - 8, { size: 14, weight: 800, align: 'center', color: kd === 'sun' ? '#ffd166' : '#ff9a5a', bg: 'rgba(4,10,24,0.7)' });
        }
      }
      // 축
      c.strokeStyle = 'rgba(210,220,245,0.5)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.stroke();
      const ticks = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 2, 3, 5, 10, 20, 30, 50, 100].filter((t) => t >= range[0] && t <= range[1]);
      ticks.forEach((t) => {
        c.beginPath(); c.moveTo(X(t), y + h); c.lineTo(X(t), y + h + 5); c.stroke();
        SR.label(c, String(t), X(t), y + h + 19, { size: 12, align: 'center', color: 'rgba(210,222,240,0.85)' });
      });
      SR.label(c, '파장(μm)', x + w, y + h + 36, { size: 12, align: 'right', color: 'rgba(210,222,240,0.85)' });
      if (opt.real) {
        // 세로축: 실제 단위(W/(m²·μm))
        const { max, step } = opt.real;
        for (let v2 = 0; v2 <= max * 1.12; v2 += step) {
          const yy = Y(v2 / max);
          c.strokeStyle = 'rgba(210,220,245,0.12)';
          c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
          SR.label(c, v2 >= 1000 ? v2.toLocaleString('ko-KR') : String(v2), x - 5, yy + 4, { size: 11, align: 'right', color: 'rgba(210,222,240,0.75)' });
        }
        SR.label(c, 'W/(m²·μm)', x - 2, y - 4, { size: 11, color: 'rgba(210,222,240,0.75)' });
      } else SR.label(c, '세기', x - 4, y + 10, { size: 11, align: 'right', color: 'rgba(210,222,240,0.7)' });
      [['자외선', 0.1, 0.4], ['가시광선', 0.4, 0.7], ['적외선', 0.7, range[1]]].forEach(([n, a, b]) => {
        const a2 = Math.max(a, range[0]), b2 = Math.min(b, range[1]);
        if (b2 <= a2 || X(b2) - X(a2) < 34) return;
        SR.label(c, n, (X(a2) + X(b2)) / 2, y + h - 6, { size: 12, align: 'center', color: 'rgba(230,236,248,0.75)' });
      });
    },

    // 기체별 흡수 정도 띠(정성적)
    drawStrips(c, box, range, gases) {
      const { x, y, w, h } = box;
      const X = this.axis(range, x, w);
      const v = this.sel();
      const rowH = h / gases.length;
      SR.label(c, '대기 성분별 흡수 정도 (정성적, 위로 갈수록 강하게 흡수)', x, y - 8, { size: 13, weight: 700, color: 'rgba(230,236,248,0.9)' });
      gases.forEach((k, i) => {
        const yy = y + i * rowH, hh = rowH - 6;
        const isTot = k === 'tot';
        const A = isTot ? Atot : GAS[k].A;
        const col = isTot ? [147, 197, 253] : GAS[k].col;
        const on = !v || v === 'all' || v === k || ((v === 'win' || v === 'vis') && isTot);
        c.fillStyle = 'rgba(255,255,255,0.04)';
        c.fillRect(x, yy, w, hh);
        c.fillStyle = SR.css(col, on ? 0.75 : 0.25);
        c.beginPath();
        c.moveTo(x, yy + hh);
        for (let j = 0; j <= 200; j++) { const l = range[0] * Math.pow(range[1] / range[0], j / 200); c.lineTo(X(l), yy + hh - A(l) * hh); }
        c.lineTo(x + w, yy + hh);
        c.closePath();
        c.fill();
        SR.label(c, isTot ? '전체 대기' : GAS[k].name, x - 6, yy + hh / 2 + 4, { size: 12, align: 'right', color: SR.css(col, on ? 1 : 0.5) });
        if (v === k) { c.strokeStyle = SR.css(col, 0.9); c.lineWidth = 1.5; c.strokeRect(x, yy, w, hh); }
      });
      if (v === 'win' || this.s.scene === 'compare') {
        const a = Math.max(8, range[0]);
        if (a < 13) { c.fillStyle = 'rgba(74,222,128,0.12)'; c.fillRect(X(a), y, X(13) - X(a), h - 6); }
      }
    },

    drawBackground(c) {
      const sc = this.s.scene;
      c.fillStyle = '#071025';
      c.fillRect(0, 0, SR.W, SR.H);
      if (sc === 'compare') { this.chartBox = null; this.drawCompareStatic(c); return; }
      this.drawScene(c);
      c.fillStyle = 'rgba(150,180,230,0.15)';
      c.fillRect(SW, 0, 1.5, SR.H);
      const range = RANGE[sc];
      SR.label(c, sc === 'sun' ? '태양 복사 스펙트럼과 흡수되는 부분' : '지구 복사 스펙트럼과 흡수되는 부분', CH.x - 10, 26, { size: 15, weight: 700 });
      const chartH = this.lv === 'basic' ? 250 : 210;
      this.chartBox = { x: CH.x + 28, y: 46, w: CH.w - 40, h: chartH };
      this.drawSpectrumChart(c, this.chartBox, sc, range, { peaks: true, real: sc === 'sun' ? { max: REAL.sun, step: 500 } : { max: REAL.earth, step: 5 } });
      const v = this.sel();
      const ac = v === 'all' ? '흡수되는 부분(전체 대기)' : v === 'win' ? '흡수되는 부분(전체 대기) · 초록 = 대기의 창' : v === 'vis' ? '점선 상자 = 가시광선(흡수 거의 없음)' : `${GAS[v].name}가 흡수하는 부분`;
      SR.label(c, `■ ${ac}`, CH.x + 28, this.chartBox.y + chartH + 54, { size: 13, color: GAS[v] ? SR.css(GAS[v].col) : '#93c5fd' });
      if (this.lv === 'basic') {
        const ks = GAS[v] ? [v] : ['tot'];
        this.drawStrips(c, { x: CH.x + 92, y: 382, w: CH.w - 104, h: 46 }, range, ks);
        SR.label(c, sc === 'sun' ? '태양 복사 ↓ 위에서 아래로 들어옴' : '지구 복사 ↑ 지표에서 위로 나감', CH.x + 28, 478, { size: 16, weight: 800, color: sc === 'sun' ? '#ffd166' : '#ff9a5a' });
        SR.label(c, sc === 'sun' ? `표면 온도 약 ${T_SUN} K · 최대 약 ${peak(T_SUN).toFixed(1)} μm · 단파 복사` : `표면 온도 약 ${T_EARTH} K · 최대 약 ${peak(T_EARTH).toFixed(0)} μm · 장파 복사`, CH.x + 28, 504, { size: 14, color: 'rgba(230,236,248,0.85)' });
        SR.label(c, sc === 'sun' ? '세기: 지구 대기 위에 도달하는 태양 복사(5800 K 흑체로 계산)' : '세기: 288 K 지표가 방출하는 복사(흑체로 계산)', CH.x + 28, 530, { size: 12, color: 'rgba(210,222,240,0.7)' });
      } else {
        const ks = sc === 'sun' ? ['o3', 'h2o', 'co2', 'tot'] : ['h2o', 'co2', 'ch4', 'n2o', 'o3', 'tot'];
        this.drawStrips(c, { x: CH.x + 72, y: 362, w: CH.w - 84, h: sc === 'sun' ? 190 : 270 }, range, ks);
        SR.label(c, sc === 'sun' ? '세기: 지구 대기 위에 도달하는 태양 복사(5800 K 흑체로 계산)' : '세기: 288 K 지표가 방출하는 복사(흑체로 계산)', CH.x - 6, SR.H - 10, { size: 12, color: 'rgba(210,222,240,0.7)' });
      }
    },

    // 실제 세기 그래프 하나(선형 파장·선형 세기)
    drawRealPanel(c, box, T, xr, ymax, ystep, yfmt, col) {
      const { x, y, w, h } = box;
      const X = (l) => x + ((l - xr[0]) / (xr[1] - xr[0])) * w;
      const Y = (v) => y + h - (v / ymax) * h;
      for (let v = 0; v <= ymax + 1e-9; v += ystep) {
        c.strokeStyle = 'rgba(210,220,245,0.12)';
        c.beginPath(); c.moveTo(x, Y(v)); c.lineTo(x + w, Y(v)); c.stroke();
        SR.label(c, yfmt(v), x - 6, Y(v) + 4, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
      }
      const N = 300;
      for (let i = 0; i < N; i++) {
        const l = xr[0] + ((xr[1] - xr[0]) * i) / N, l2 = xr[0] + ((xr[1] - xr[0]) * (i + 1)) / N;
        const v = Mex(l, T);
        const vis = T > 1000 && l >= 0.4 && l <= 0.7;
        const fc = T > 1000 ? (vis ? SR.waveColor(l * 1000) : l < 0.4 ? [160, 120, 230] : [230, 110, 120]) : [255, 140, 80];
        c.fillStyle = SR.css(fc, vis ? 0.8 : 0.35);
        c.fillRect(X(l), Y(v), X(l2) - X(l) + 0.6, Y(0) - Y(v));
      }
      c.strokeStyle = col; c.lineWidth = 2.4;
      c.beginPath();
      for (let i = 0; i <= N; i++) { const l = xr[0] + ((xr[1] - xr[0]) * i) / N; const yy = Y(Mex(l, T)); if (i) c.lineTo(X(l), yy); else c.moveTo(X(l), yy); }
      c.stroke();
      c.strokeStyle = 'rgba(210,220,245,0.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.stroke();
      const xt = T > 1000 ? [0.1, 0.5, 1, 1.5, 2, 2.5] : [5, 10, 15, 20, 25, 30];
      xt.forEach((t) => { c.beginPath(); c.moveTo(X(t), y + h); c.lineTo(X(t), y + h + 5); c.stroke(); SR.label(c, String(t), X(t), y + h + 19, { size: 12, align: 'center', color: 'rgba(210,222,240,0.85)' }); });
      SR.label(c, '파장(μm)', x + w, y + h + 36, { size: 12, align: 'right', color: 'rgba(210,222,240,0.85)' });
      const lp = peak(T), mp = Mex(lp, T);
      c.setLineDash([3, 4]); c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.beginPath(); c.moveTo(X(lp), Y(mp)); c.lineTo(X(lp), Y(0)); c.stroke(); c.setLineDash([]);
      SR.label(c, `최대 ≈ ${lp.toFixed(lp < 1 ? 2 : 1)} μm`, X(lp) + 8, Y(mp) + 4, { size: 14, weight: 800, color: col, bg: 'rgba(4,10,24,0.7)' });
      return { X, Y };
    },

    drawCompareStatic(c) {
      SR.label(c, '태양 복사 에너지와 지구 복사 에너지의 파장 분포 (실제 세기)', 30, 34, { size: 18, weight: 800 });
      const peakRatio = M_SUN_PEAK / M_EARTH_PEAK;
      const totRatio = (T_SUN / T_EARTH) ** 4;
      const manK = (v) => { const e = Math.floor(Math.log10(v)); return [v / 10 ** e, e]; };
      if (this.s.cmp !== 'log') {
        // 학습지처럼 두 그래프를 각자의 세로 눈금으로(단위는 같고 숫자 크기가 크게 다름)
        SR.label(c, '태양 복사 (표면 약 5800 K)', 70, 70, { size: 15, weight: 700, color: '#ffd166' });
        SR.label(c, 'W/(m²·μm)', 30, 92, { size: 11, color: 'rgba(210,222,240,0.75)' });
        this.drawRealPanel(c, { x: 92, y: 100, w: 400, h: 260 }, T_SUN, [0.1, 2.5], 10e7, 2e7, (v) => (v ? `${v / 1e7}×10⁷` : '0'), '#ffd166');
        SR.label(c, '지구 복사 (표면 약 288 K)', 560, 70, { size: 15, weight: 700, color: '#ff9a5a' });
        SR.label(c, 'W/(m²·μm)', 528, 92, { size: 11, color: 'rgba(210,222,240,0.75)' });
        this.drawRealPanel(c, { x: 560, y: 100, w: 220, h: 260 }, T_EARTH, [3, 30], 30, 6, (v) => String(v), '#ff9a5a');
        SR.label(c, `※ 두 그래프는 세로축 숫자가 다릅니다: 지구 복사의 최댓값(약 ${Math.round(M_EARTH_PEAK)})은 태양 복사 최댓값(약 ${manK(M_SUN_PEAK)[0].toFixed(1)}×10${sup(manK(M_SUN_PEAK)[1])})의 약 ${Math.round(peakRatio / 1e4)}만분의 1`, 30, 425, { size: 13, color: 'rgba(225,232,245,0.9)' });
        SR.label(c, `   단위 면적당 방출하는 전체 에너지(그래프 아래 넓이, σT⁴)는 태양이 지구의 약 ${Math.round(totRatio / 1e4)}만 배`, 30, 446, { size: 13, color: 'rgba(225,232,245,0.75)' });
      } else {
        // 하나의 로그 눈금: 실제 크기 차이를 한 그래프에
        const box = { x: 100, y: 80, w: 680, h: 300 };
        const xr = [0.1, 100], yr = [-2, 9];
        const X = (l) => box.x + (Math.log10(l / xr[0]) / Math.log10(xr[1] / xr[0])) * box.w;
        const Y = (v) => box.y + box.h - ((Math.log10(Math.max(v, 1e-3)) - yr[0]) / (yr[1] - yr[0])) * box.h;
        for (let e = yr[0]; e <= yr[1]; e++) {
          c.strokeStyle = 'rgba(210,220,245,0.1)';
          c.beginPath(); c.moveTo(box.x, Y(10 ** e)); c.lineTo(box.x + box.w, Y(10 ** e)); c.stroke();
          if ((e - yr[0]) % 2 === 0 || e === yr[1]) SR.label(c, `10${sup(e)}`, box.x - 6, Y(10 ** e) + 4, { size: 12, align: 'right', color: 'rgba(210,222,240,0.8)' });
        }
        SR.label(c, 'W/(m²·μm) — 한 칸마다 10배', box.x - 70, box.y - 10, { size: 12, color: 'rgba(210,222,240,0.8)' });
        c.fillStyle = 'rgba(74,222,128,0.1)'; c.fillRect(X(8), box.y, X(13) - X(8), box.h);
        SR.label(c, '대기의 창', (X(8) + X(13)) / 2, box.y + 16, { size: 12, weight: 700, align: 'center', color: '#86efac' });
        [[T_SUN, '#ffd166'], [T_EARTH, '#ff9a5a']].forEach(([T, col]) => {
          c.strokeStyle = col; c.lineWidth = 2.6;
          c.beginPath();
          let started = false;
          for (let i = 0; i <= 400; i++) {
            const l = xr[0] * (xr[1] / xr[0]) ** (i / 400), v = Mex(l, T);
            if (v < 10 ** yr[0]) { started = false; continue; }
            if (started) c.lineTo(X(l), Y(v)); else { c.moveTo(X(l), Y(v)); started = true; }
          }
          c.stroke();
          const lp = peak(T), mp = Mex(lp, T);
          c.fillStyle = col; c.beginPath(); c.arc(X(lp), Y(mp), 5, 0, 6.2832); c.fill();
          const [mm, ee] = manK(mp);
          SR.label(c, `최대 ≈ ${lp.toFixed(lp < 1 ? 2 : 1)} μm · ${ee >= 3 ? mm.toFixed(1) + '×10' + sup(ee) : Math.round(mp)}`, X(lp), Y(mp) - 12, { size: 14, weight: 800, align: 'center', color: col, bg: 'rgba(4,10,24,0.7)' });
        });
        c.strokeStyle = 'rgba(210,220,245,0.5)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(box.x, box.y); c.lineTo(box.x, box.y + box.h); c.lineTo(box.x + box.w, box.y + box.h); c.stroke();
        [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].forEach((t) => SR.label(c, String(t), X(t), box.y + box.h + 19, { size: 12, align: 'center', color: 'rgba(210,222,240,0.85)' }));
        SR.label(c, '파장(μm)', box.x + box.w, box.y + box.h + 36, { size: 12, align: 'right', color: 'rgba(210,222,240,0.85)' });
        SR.label(c, '태양 복사(약 5800 K)', X(0.25), Y(1e3), { size: 15, weight: 700, color: '#ffd166' });
        SR.label(c, '지구 복사(약 288 K)', X(20), Y(1e-1), { size: 15, weight: 700, color: '#ff9a5a' });
        SR.label(c, `※ 같은 눈금으로 그리면 지구 복사의 최댓값은 태양의 약 ${Math.round(peakRatio / 1e4)}만분의 1이라, 보통(선형) 눈금에서는 보이지 않을 만큼 작습니다.`, 30, 438, { size: 13, color: 'rgba(225,232,245,0.9)' });
      }
      const tx = 820, ty = 70, cw = [120, 120, 120], rh = 44;
      const rows = [['', '태양 복사', '지구 복사'], ['표면 온도', `약 ${T_SUN} K`, `약 ${T_EARTH} K`], ['최대 에너지 파장', `약 ${peak(T_SUN).toFixed(1)} μm`, `약 ${peak(T_EARTH).toFixed(0)} μm`], ['', '(가시광선)', '(적외선)'], ['종류', '단파 복사', '장파 복사']];
      c.fillStyle = 'rgba(13,26,53,0.9)';
      SR.roundRect(c, tx - 10, ty - 10, cw[0] + cw[1] + cw[2] + 20, rh * rows.length + 10, 12); c.fill();
      rows.forEach((r, i) => {
        r.forEach((t, j) => {
          const x = tx + cw.slice(0, j).reduce((a, b) => a + b, 0) + (j ? cw[j] / 2 : 0);
          SR.label(c, t, x, ty + i * rh + 24, { size: i === 0 || j === 0 ? 14 : 16, weight: i === 0 || j === 0 ? 700 : 800, align: j ? 'center' : 'left', color: i === 0 ? 'rgba(230,236,248,0.8)' : j === 1 ? '#ffd166' : j === 2 ? '#ff9a5a' : 'rgba(230,236,248,0.9)' });
        });
      });
      SR.label(c, '빈의 변위 법칙: λmax ≈ 2898 μm·K ÷ T', tx, ty + rh * rows.length + 34, { size: 15, weight: 700, color: '#e6edf8' });
      SR.label(c, `태양: 2898 ÷ ${T_SUN} ≈ ${peak(T_SUN).toFixed(2)} μm`, tx, ty + rh * rows.length + 60, { size: 14, color: '#ffd166' });
      SR.label(c, `지구: 2898 ÷ ${T_EARTH} ≈ ${peak(T_EARTH).toFixed(1)} μm`, tx, ty + rh * rows.length + 84, { size: 14, color: '#ff9a5a' });
      if (this.lv !== 'basic') this.drawStrips(c, { x: 160, y: 495, w: 610, h: 160 }, RANGE.compare, ['o3', 'h2o', 'co2', 'tot']);
    },

    // 스펙트럼 비교(기본 모드): 파장이 짧은 복사와 긴 복사를 물결로 표현한 개념도
    drawCompareWaves(ctx) {
      if (this.lv !== 'basic') return;
      const t = this.t;
      const wave = (x0, y0, len, lam, amp, col, label) => {
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= len; i += 2) { const y = y0 + Math.sin(((i - t * 120) / lam) * 6.283) * amp; if (i) ctx.lineTo(x0 + i, y); else ctx.moveTo(x0, y); }
        ctx.stroke();
        SR.arrowHead(ctx, x0 + len + 12, y0, 0, 12, col);
        SR.label(ctx, label, x0, y0 - 22, { size: 15, weight: 700, color: col });
      };
      SR.drawSun(ctx, 70, 530, 22);
      wave(110, 530, 320, 14, 10, '#ffd166', '태양: 파장이 짧은 단파 복사');
      ctx.fillStyle = '#3b6a3e'; ctx.beginPath(); ctx.arc(70, 628, 22, 0, 6.2832); ctx.fill();
      wave(110, 628, 320, 64, 10, '#ff9a5a', '지구: 파장이 긴 장파 복사');
      SR.label(ctx, '(물결의 파장 길이는 개념을 보여 주기 위한 그림)', 470, 666, { size: 12, color: 'rgba(210,222,240,0.6)' });
    },

    draw(ctx) {
      const key = this.s.scene + '|' + this.sel() + '|' + this.lv;
      if (this.bgKey !== key || !this.bg || this.bg.ps !== this.app.ps) {
        this.bg = SR.makeLayer(this.bg, this.app.ps, (c) => this.drawBackground(c));
        this.bgKey = key;
      }
      ctx.drawImage(this.bg, 0, 0, SR.W, SR.H);
      const sc = this.s.scene;
      if (sc === 'compare') { this.drawCompareWaves(ctx); return; }
      if (sc === 'earth') {
        // 지표 온기: 재방출 복사가 돌아올수록 진해짐(수치 없이 정성적으로)
        const a = 0.12 + Math.min(1, this.back) * 0.3;
        const hg = ctx.createLinearGradient(0, GND, 0, GND + 90);
        hg.addColorStop(0, `rgba(255,120,50,${a})`);
        hg.addColorStop(1, 'rgba(255,100,40,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, GND, SW, 90);
        SR.label(ctx, '지표가 적외선(장파 복사)을 방출 ↑ · 한 다발에 여러 파장이 함께', 14, GND + 86, { size: 14, color: '#ffc49a' });
        if (this.back > 0.3) SR.label(ctx, '대기가 다시 내보낸 복사 일부가 지표로 → 온실 효과', SW - 14, GND - 14, { size: 15, weight: 700, align: 'right', color: '#ffb27a', bg: 'rgba(4,10,24,0.7)' });
        if (this.sel() === 'win') SR.label(ctx, '대기의 창(8~13 μm) → 우주로', SW / 2, 30, { size: 16, weight: 800, align: 'center', color: '#86efac', bg: 'rgba(4,10,24,0.7)' });
      } else {
        SR.drawSun(ctx, 40, 30, 24);
        SR.label(ctx, '태양 복사(단파) ↓', 78, 36, { size: 15, weight: 700, color: '#ffd166' });
        SR.label(ctx, '빛 한 다발 = 여러 파장이 함께 진행', 78, 58, { size: 12, color: 'rgba(255,240,205,0.8)' });
      }
      this.drawMolecules(ctx);
      this.drawPhotons(ctx);
      // 그래프 위에 장면 속 광선의 파장 표시 → 흡수되면 기체 색으로
      const b = this.chartBox;
      if (b) {
        const X = this.axis(RANGE[sc], b.x, b.w);
        for (const p of this.ph) {
          // 지금 대기에 흡수되고 있는 줄기의 파장만 그래프에 표시
          if (p.re || p.state !== 1 || !p.gas || p.l < RANGE[sc][0] || p.l > RANGE[sc][1]) continue;
          const x = X(p.l);
          const col = GAS[p.gas].col;
          ctx.strokeStyle = SR.css(col, 0.9);
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke();
          ctx.setLineDash([]);
          SR.arrowHead(ctx, x, b.y + b.h + 2, -Math.PI / 2, 9, SR.css(col));
          if (p.state === 1) { ctx.strokeStyle = SR.css(col); ctx.beginPath(); ctx.arc(x, b.y + b.h - 10, 7, 0, 6.2832); ctx.stroke(); }
        }
        SR.label(ctx, '┆ 지금 대기에 흡수되는 파장', b.x + b.w, b.y + 10, { size: 12, align: 'right', color: 'rgba(230,236,248,0.7)' });
      }
    },
  };

  SR.modes = SR.modes || [];
  SR.modes.push(M);
})();
