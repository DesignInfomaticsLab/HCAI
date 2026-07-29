/* =========================================================================
   HCAI — Dot Logo (Neural Network)

   tools/logo/hcai-dot-logo-v2.html 의 v2 설정을 그대로 옮긴 렌더러입니다.
   파라미터를 바꾸고 싶으면 그 도구를 열어 슬라이더로 조정한 뒤,
   아래 CONFIG / ANIM / NEURAL / DOT_COLOR 값을 같은 값으로 맞추세요.

   원본과 달라진 점 (사이트에 얹기 위한 조정):
     1) 배경을 칠하지 않고 투명하게 둡니다 — 페이지 배경이 그대로 비칩니다.
     2) 도트와 연결선은 크기가 바뀔 때만 다시 계산하고 캐시합니다.
        (v2 설정에서는 간격이 18.2 하나로 고정되어 매 프레임 재계산이 불필요)
     3) 포인터를 따라다니는 활성화 소스를 하나 추가했습니다 (interactive 옵션).
     4) 화면 밖으로 나가면 애니메이션을 멈추고,
        prefers-reduced-motion 사용자에게는 정지 화면만 보여 줍니다.

   사용법:  HCAILogo.mount(canvasElement, { interactive: true })
   ========================================================================= */

(function () {
  "use strict";

  /* ===== v2 설정 =========================================================== */

  var CONFIG = {
    dotSize: 4.5,
    spacing: 18.2,
    sizeVariance: 7.5,
    opacityVar: 0.15,
    falloff: 0.2,
    falloffRadius: 1.15,
    falloffMin: 0.1,
    dotColor: "#ffffff",
    dotAlpha: 0.85,
    // 점 아래에 워드마크를 옅게 깔아 글자 형태를 보장합니다 (0 = 사용 안 함)
    solidBase: 0
  };

  var ANIM = {
    min: 18.2,
    max: 20.5,
    stepSize: 5.0,
    stepHoldMs: 100
  };

  var NEURAL = {
    linesEnabled: true,
    lineMaxDist: 10,
    lineOpacity: 1.0,
    lineWidth: 3.0,
    lineMaxCount: 4,

    featherEnabled: true,
    glowRadius: 1.5,
    glowIntensity: 0.01,

    pulseEnabled: true,
    pulseSpeed: 3.3,
    pulseIntensity: 0.85,
    pulseWavelength: 135,
    pulseSources: 5
  };

  var DOT_COLOR = { r: 255, g: 255, b: 255, a: 0.85, opVar: 0.35, opMin: 0.15 };

  /* 작은 크기용 프리셋 ------------------------------------------------------
     모든 파라미터는 캔버스 크기에 비례해 줄어듭니다. 헤더(104px)처럼 작은 자리에서는
     글자 획 하나가 4~5px 밖에 안 되므로, 점이 굵으면 획을 덩어리로 덮어 버려
     'HCAI' 가 아니라 얼룩으로 보입니다.

     점만 잘게 만드는 것으로는 해결되지 않습니다. 점은 로고 중심을 기준으로 한
     '동심원' 위에 놓이는데, 작은 캔버스에서 원 간격이 픽셀 격자에 가까워지면
     모아레가 생겨 획이 사선으로 끊어집니다. 잘게 할수록 오히려 심해집니다.

     그래서 세 가지를 함께 씁니다.
       1) solidBase — 점 아래에 워드마크를 옅게 깔아 글자 형태를 항상 보장
       2) 점은 그 위의 질감 역할 (간격·크기를 작은 화면에 맞게만 조정)
       3) 내부 해상도 4배 렌더링 (superSample). 정지 렌더라 1회 비용만 듭니다.
     ---------------------------------------------------------------------- */
  var COMPACT = {
    superSample: 4,
    config: {
      dotSize: 4.3, spacing: 11.5, sizeVariance: 1.4, opacityVar: 0.06,
      falloff: 0.05, falloffMin: 0.7, dotAlpha: 1,
      solidBase: 0.3
    },
    neural: { lineMaxDist: 6, lineWidth: 0.8, lineMaxCount: 3, glowIntensity: 0.012, glowRadius: 1.2, pulseWavelength: 110 }
  };

  function assign(base, extra) {
    var out = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (extra) for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    return out;
  }

  var BASE_SCALE = 3;   // 모든 파라미터의 기준 스케일
  var PAD_BASE = 40;    // BASE_SCALE 기준 여백(px) — 가장자리 입자가 잘리지 않게
  var VIEW_W = 233.53, VIEW_H = 77.36;
  var C_CENTER_X_RATIO = 99 / VIEW_W;
  var C_CENTER_Y_RATIO = 38.7 / VIEW_H;

  var PAD_UNITS = (2 * PAD_BASE) / BASE_SCALE;          // 뷰박스 단위로 환산한 좌우/상하 여백
  /** 캔버스 가로:세로 비율 (여백 포함) ≈ 2.5 — CSS에서 자리를 잡을 때 씁니다 */
  var ASPECT = (VIEW_W + PAD_UNITS) / (VIEW_H + PAD_UNITS);

  var LOGO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 233.53 77.36"><g>' +
    '<rect x="212.29" y="0" width="21.24" height="77.36" rx="2.83" ry="2.83"/>' +
    '<path d="M178.29,0h-21.46c-1.19,0-2.25.74-2.66,1.86l-26.23,71.69c-.68,1.85.69,3.81,2.66,3.81h17.39c1.27,0,2.38-.84,2.73-2.06l16.54-58.01,8.38,28.37.11.35h-12.98c-1.11,0-2.09.72-2.41,1.78l-3.26,10.51c-.57,1.82.8,3.67,2.71,3.67h19.5-.13,1.7l4.52,13.87c.29.9,1.14,1.52,2.09,1.52h18.57c1.99,0,3.36-2,2.64-3.86L180.93,1.81c-.42-1.09-1.47-1.81-2.64-1.81Z"/>' +
    '<path d="M133.16,51.18l-15.21-4.8c-1.5-.47-3.12.36-3.55,1.87-.97,3.39-2.32,6.07-4.03,8.04-2.17,2.48-5.37,3.72-9.6,3.72s-7.75-1.54-10.16-4.61c-1.38-1.76-2.36-4.38-2.95-7.85-.44-2.59-.66-5.65-.66-9.2,0-5.68.74-10.07,2.19-13.18.26-.55.53-1.08.84-1.55,2.67-4.21,6.51-6.32,11.53-6.32,2.21,0,4.22.48,6.01,1.43,1.79.95,3.3,2.31,4.54,4.08l2.63,3.73c.42.6,1.17.88,1.88.72l15.38-3.58c.98-.23,1.52-1.26,1.18-2.21-2.5-6.99-6.14-12.24-10.9-15.76-5.16-3.81-12.25-5.72-21.27-5.72-4.31,0-8.25.46-11.83,1.39-6,1.56-10.97,4.41-14.92,8.58-3.48,3.67-5.98,8.22-7.53,13.64l.08-.35c-.65,1.53-1.87,2.94-3.3,3.76-1.13.66-2.44,1.04-3.84,1.04H21.24V2.83C21.24,1.27,19.97,0,18.41,0H2.83C1.27,0,0,1.27,0,2.83v71.69c0,1.57,1.27,2.83,2.83,2.83h15.57c1.57,0,2.83-1.27,2.83-2.83v-25.22h38.43c1.4,0,2.71.38,3.84,1.04,1.42.83,2.9,2.51,3.55,4.04v-.02c.81,2.54,1.85,4.87,3.12,6.99,3.58,5.95,7.84,10.11,12.77,12.47,4.93,2.36,11.29,3.54,19.08,3.54,6.42,0,11.7-.97,15.85-2.91,4.15-1.94,7.63-4.81,10.43-8.62,2.58-3.51,4.52-7.8,5.83-12.89.19-.75-.25-1.53-.99-1.76Z"/>' +
    '<path d="M63.52,21.51V2.83c0-1.57-1.27-2.83-2.83-2.83h-15.57c-1.57,0-2.83,1.27-2.83,2.83v22.64h17.27c2.19,0,3.97-1.78,3.97-3.97Z"/>' +
    '<path d="M59.55,51.88h-17.27v22.64c0,1.57,1.27,2.83,2.83,2.83h15.57c1.57,0,2.83-1.27,2.83-2.83v-18.67c0-2.19-1.78-3.97-3.97-3.97Z"/>' +
    "</g></svg>";

  /* ===== 유틸 ============================================================== */

  function seededRandom(seed) {
    var s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** 간격 스텝 시퀀스. v2 설정에서는 [18.2] 하나로 떨어집니다. */
  function buildStepSequence() {
    var steps = [], s;
    for (s = ANIM.min; s <= ANIM.max + 0.01; s += ANIM.stepSize) {
      steps.push(Math.round(s * 10) / 10);
    }
    var seq = steps.slice();
    for (var i = steps.length - 2; i >= 1; i--) seq.push(steps[i]);
    return seq.length ? seq : [CONFIG.spacing];
  }

  /* ===== 인스턴스 ========================================================== */

  function Logo(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.interactive = opts.interactive !== false;
    // static: 한 번만 그리고 멈춥니다 (스크롤 내내 붙어 있는 헤더 로고용)
    this.isStatic = !!opts.static;
    if (this.isStatic) this.interactive = false;

    // compact: 작은 자리용 프리셋. config / neural 로 개별 항목만 덮어쓸 수도 있습니다.
    var preset = opts.compact ? COMPACT : { config: null, neural: null };
    this.cfg = assign(assign(CONFIG, preset.config), opts.config);
    this.nrl = assign(assign(NEURAL, preset.neural), opts.neural);
    // 화면 픽셀보다 몇 배 크게 그릴지. CSS가 축소해 주므로 그만큼 또렷해집니다.
    this.superSample = opts.superSample || preset.superSample || 1;
    // 캔버스가 배경 레이어라 pointer-events 를 받지 못할 때, 마우스를 추적할 다른 요소
    this.pointerTarget = opts.pointerTarget || canvas;
    this.maxDpr = opts.maxDpr || 2;

    this.mask = null;
    this.pad = 0; this.logoW = 0; this.logoH = 0;
    this.scale = BASE_SCALE;

    this.geomKey = "";
    this.dots = [];
    this.lines = [];
    this.pulses = [];

    this.sources = [];
    this.pointer = null;          // {x, y, strength}
    this.pulseTime = 0;

    // 간격을 덮어쓴 인스턴스(compact 등)는 그 값으로 고정합니다
    this.seq = (this.cfg.spacing === CONFIG.spacing) ? buildStepSequence() : [this.cfg.spacing];
    this.stepIndex = 0;
    this.stepElapsed = 0;

    this.running = false;
    this.visible = true;
    this.raf = null;
    this.last = null;

    this._boot();
  }

  Logo.prototype._boot = function () {
    var self = this;

    // SVG를 한 번 래스터화해 알파 마스크로 씁니다
    var blob = new Blob([LOGO_SVG], { type: "image/svg+xml" });
    var url = URL.createObjectURL(blob);
    var img = new Image();

    img.onload = function () {
      self.img = img;
      URL.revokeObjectURL(url);
      self.resize();

      if (self.isStatic || reducedMotion()) {
        self.renderStatic();
        var rt = null;
        window.addEventListener("resize", function () {
          clearTimeout(rt);
          rt = setTimeout(function () { self.resize(); self.renderStatic(); }, 160);
        });
        return;
      }

      // 화면에 보일 때만 돌립니다
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            self.visible = e.isIntersecting;
            if (self.visible) self.start(); else self.stop();
          });
        }, { threshold: 0.01 });
        io.observe(self.canvas);
      } else {
        self.start();
      }

      if (self.interactive) self._bindPointer();

      var t = null;
      window.addEventListener("resize", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          self.resize();
          if (!self.running) self.renderStatic();
        }, 160);
      });
    };

    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  };

  Logo.prototype._bindPointer = function () {
    var self = this, c = this.canvas, target = this.pointerTarget;

    // 좌표는 항상 캔버스 기준으로 환산합니다. 커서가 캔버스 밖에 있어도
    // 캔버스 좌표계 바깥의 소스가 되어 방향성 있는 파동을 만듭니다.
    target.addEventListener("pointermove", function (ev) {
      var r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      self.pointer = {
        x: (ev.clientX - r.left) * (c.width / r.width),
        y: (ev.clientY - r.top) * (c.height / r.height),
        strength: 1
      };
    });

    target.addEventListener("pointerleave", function () { self.pointer = null; });
  };

  /* --- 크기 / 지오메트리 -------------------------------------------------- */

  Logo.prototype.resize = function () {
    if (!this.img) return;

    var rect = this.canvas.getBoundingClientRect();
    var cssW = rect.width || this.canvas.clientWidth || 600;
    var dpr = Math.max(Math.min(window.devicePixelRatio || 1, this.maxDpr), this.superSample);

    // 여백 포함 전체 폭이 cssW*dpr 이 되도록 scale 을 역산
    var unitW = VIEW_W + PAD_UNITS;
    this.scale = Math.max(1, (cssW * dpr) / unitW);

    var pad = Math.round((PAD_BASE * this.scale) / BASE_SCALE);
    var lw = Math.round(VIEW_W * this.scale);
    var lh = Math.round(VIEW_H * this.scale);

    this.pad = pad; this.logoW = lw; this.logoH = lh;
    this.canvas.width = lw + 2 * pad;
    this.canvas.height = lh + 2 * pad;

    var tmp = document.createElement("canvas");
    tmp.width = this.canvas.width; tmp.height = this.canvas.height;
    var tctx = tmp.getContext("2d");
    tctx.drawImage(this.img, pad, pad, lw, lh);
    this.mask = tctx.getImageData(0, 0, tmp.width, tmp.height);

    // solidBase 용 — 워드마크를 점 색으로 칠한 판을 미리 만들어 둡니다
    if (this.cfg.solidBase > 0) {
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = this.cfg.dotColor;
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      this.solid = tmp;
    } else {
      this.solid = null;
    }

    this._regenerateSources();
    this.geomKey = "";           // 지오메트리 캐시 무효화
    this._ensureGeometry(this.seq[this.stepIndex]);
  };

  Logo.prototype._regenerateSources = function () {
    var rng = seededRandom(777);
    var w = this.canvas.width, h = this.canvas.height;
    this.sources = [];
    for (var i = 0; i < this.nrl.pulseSources; i++) {
      this.sources.push({
        x: rng() * w, y: rng() * h,
        phase: rng() * Math.PI * 2,
        speed: 0.8 + rng() * 1.2
      });
    }
  };

  Logo.prototype._sr = function () { return this.scale / BASE_SCALE; };

  Logo.prototype._alphaAt = function (x, y) {
    var m = this.mask;
    if (!m) return 0;
    var ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= m.width || iy >= m.height) return 0;
    return m.data[(iy * m.width + ix) * 4 + 3] / 255;
  };

  Logo.prototype._falloffAt = function (x, y, cx, cy) {
    if (this.cfg.falloff <= 0) return 1;
    var w = this.canvas.width, h = this.canvas.height;
    var maxDist = Math.sqrt(w * w + h * h) * 0.5 * this.cfg.falloffRadius;
    var dx = x - cx, dy = y - cy;
    var t = Math.min(Math.sqrt(dx * dx + dy * dy) / maxDist, 1);
    var factor = Math.pow(1 - t, this.cfg.falloff);
    return this.cfg.falloffMin + (1 - this.cfg.falloffMin) * factor;
  };

  /** 도트 + 연결선을 계산해 캐시합니다. 간격이 바뀔 때만 다시 돕니다. */
  Logo.prototype._ensureGeometry = function (spacing) {
    var key = spacing + "@" + this.canvas.width + "x" + this.canvas.height;
    if (key === this.geomKey) return;
    this.geomKey = key;

    var s = this._sr();
    var sp = spacing * s, ds = this.cfg.dotSize * s, sv = this.cfg.sizeVariance * s;
    var cx = this.pad + this.logoW * C_CENTER_X_RATIO;
    var cy = this.pad + this.logoH * C_CENTER_Y_RATIO;
    var w = this.canvas.width, h = this.canvas.height;
    var maxR = Math.sqrt(Math.pow(Math.max(cx, w - cx), 2) + Math.pow(Math.max(cy, h - cy), 2));
    var rng = seededRandom(33);
    var dots = [];

    // 로고 중심에서 바깥으로 퍼지는 동심원 위에 점을 뿌립니다
    for (var r = sp; r < maxR; r += sp) {
      var n = Math.max(12, Math.round((2 * Math.PI * r) / (ds * 2.5)));
      for (var i = 0; i < n; i++) {
        var ang = (i / n) * Math.PI * 2;
        var x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
        var a = this._alphaAt(x, y);
        if (a < 0.1) continue;
        var df = this._falloffAt(x, y, cx, cy);
        var size = (ds * 0.8 * a + (rng() - 0.5) * sv * 0.5) * df;
        if (size <= 0.15) continue;
        var base = Math.max(0.1, 1 - rng() * this.cfg.opacityVar) * a * df;
        var variation = DOT_COLOR.opVar > 0 ? rng() * DOT_COLOR.opVar : 0;
        dots.push({ x: x, y: y, size: size, opacity: Math.max(DOT_COLOR.opMin, base * (1 - variation)) });
      }
    }

    this.dots = dots;
    this.pulses = new Float32Array(dots.length);
    this.lines = this.nrl.linesEnabled ? this._buildLines(dots, this.nrl.lineMaxDist * s) : [];
  };

  Logo.prototype._buildLines = function (dots, maxDist) {
    var cell = maxDist + 1, grid = {}, i, key;

    for (i = 0; i < dots.length; i++) {
      key = Math.floor(dots[i].x / cell) + "," + Math.floor(dots[i].y / cell);
      (grid[key] || (grid[key] = [])).push(i);
    }

    var lines = [], maxD2 = maxDist * maxDist;
    for (i = 0; i < dots.length; i++) {
      var d = dots[i];
      var gx = Math.floor(d.x / cell), gy = Math.floor(d.y / cell);
      var near = [];
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          var c = grid[(gx + dx) + "," + (gy + dy)];
          if (!c) continue;
          for (var k = 0; k < c.length; k++) {
            var j = c[k];
            if (j <= i) continue;                       // 중복 선 방지
            var ax = dots[j].x - d.x, ay = dots[j].y - d.y;
            var d2 = ax * ax + ay * ay;
            if (d2 < maxD2) near.push({ j: j, dist: Math.sqrt(d2) });
          }
        }
      }
      near.sort(function (a, b) { return a.dist - b.dist; });
      var count = Math.min(near.length, this.nrl.lineMaxCount);
      for (var n = 0; n < count; n++) {
        lines.push({ a: i, b: near[n].j, f: 1 - near[n].dist / maxDist });
      }
    }
    return lines;
  };

  /* --- 펄스 --------------------------------------------------------------- */

  Logo.prototype._computePulses = function () {
    var dots = this.dots, out = this.pulses;
    if (!this.nrl.pulseEnabled) { for (var z = 0; z < out.length; z++) out[z] = 0; return; }

    var srcs = this.sources.slice();
    if (this.pointer && this.pointer.strength > 0.01) {
      // 포인터를 따라다니는 활성화 소스. 손을 떼면 strength 가 줄며 자연히 사라집니다.
      srcs.push({ x: this.pointer.x, y: this.pointer.y, phase: 0, speed: 1.6, gain: this.pointer.strength });
    }

    var wl = this.nrl.pulseWavelength * this._sr();
    var t = this.pulseTime, n = srcs.length, denom = this.sources.length || 1;

    for (var i = 0; i < dots.length; i++) {
      var val = 0;
      for (var s = 0; s < n; s++) {
        var src = srcs[s];
        var dx = dots[i].x - src.x, dy = dots[i].y - src.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var wave = Math.sin((dist / wl) * Math.PI * 2 - t * src.speed * this.nrl.pulseSpeed + src.phase);
        if (wave > 0) val += wave * this.nrl.pulseIntensity * (src.gain === undefined ? 1 : src.gain);
      }
      out[i] = Math.min(val / denom, 1);
    }
  };

  /* --- 그리기 -------------------------------------------------------------- */

  Logo.prototype._draw = function () {
    var ctx = this.ctx, dots = this.dots, p = this.pulses;
    var r = DOT_COLOR.r, g = DOT_COLOR.g, b = DOT_COLOR.b;
    var ga = this.cfg.dotAlpha;
    var i;

    // 배경은 칠하지 않습니다 — 페이지 배경이 그대로 보이도록
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 0. 워드마크 밑판 — 작은 크기에서 글자 형태가 무너지지 않도록 받쳐 줍니다
    if (this.solid) {
      ctx.globalAlpha = this.cfg.solidBase * ga;
      ctx.drawImage(this.solid, 0, 0);
      ctx.globalAlpha = 1;
    }

    // 1. 페더 글로우 (점 뒤)
    if (this.nrl.featherEnabled) {
      for (i = 0; i < dots.length; i++) {
        var d = dots[i];
        var glowR = d.size * this.nrl.glowRadius;
        var intensity = this.nrl.glowIntensity * (1 + p[i] * 1.5);
        var alpha = d.opacity * intensity * ga;
        if (alpha < 0.005) continue;
        var grad = ctx.createRadialGradient(d.x, d.y, d.size * 0.5, d.x, d.y, glowR);
        grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + (alpha * 0.8).toFixed(3) + ")");
        grad.addColorStop(0.4, "rgba(" + r + "," + g + "," + b + "," + (alpha * 0.3).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. 신경망 연결선 (점 뒤)
    ctx.lineWidth = this.nrl.lineWidth * this._sr();
    for (i = 0; i < this.lines.length; i++) {
      var ln = this.lines[i];
      var d1 = dots[ln.a], d2 = dots[ln.b];
      var boost = 1 + (p[ln.a] + p[ln.b]) * 0.5;
      var la = this.nrl.lineOpacity * ln.f * d1.opacity * d2.opacity * boost * ga;
      if (la < 0.005) continue;
      ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + la.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(d1.x, d1.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.stroke();
    }

    // 3. 점 (펄스에 따라 밝기·크기 증폭)
    ctx.fillStyle = this.cfg.dotColor;
    for (i = 0; i < dots.length; i++) {
      var dd = dots[i], pv = p[i];
      ctx.globalAlpha = Math.min(1, dd.opacity * (1 + pv * 0.8)) * ga;
      ctx.beginPath();
      ctx.arc(dd.x, dd.y, dd.size * (1 + pv * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Logo.prototype.renderStatic = function () {
    if (!this.mask) return;
    this._ensureGeometry(this.seq[this.stepIndex]);
    this._computePulses();
    this._draw();
  };

  /* --- 루프 ---------------------------------------------------------------- */

  Logo.prototype.start = function () {
    if (this.running || reducedMotion()) return;
    this.running = true;
    this.last = null;
    var self = this;
    this.raf = requestAnimationFrame(function loop(ts) {
      if (!self.running) return;
      if (self.last === null) self.last = ts;
      var dt = ts - self.last;
      self.last = ts;

      self.pulseTime += dt * 0.001;

      // 간격 스텝 (v2 설정에서는 단계가 하나라 사실상 고정)
      if (self.seq.length > 1) {
        self.stepElapsed += dt;
        if (self.stepElapsed >= ANIM.stepHoldMs) {
          self.stepElapsed = 0;
          self.stepIndex = (self.stepIndex + 1) % self.seq.length;
        }
      }
      self._ensureGeometry(self.seq[self.stepIndex]);

      // 포인터 활성화는 손을 떼면 서서히 사그라듭니다
      if (self.pointer) {
        self.pointer.strength -= dt * 0.0012;
        if (self.pointer.strength <= 0) self.pointer = null;
      }

      self._computePulses();
      self._draw();
      self.raf = requestAnimationFrame(loop);
    });
  };

  Logo.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  /* ===== 공개 API ========================================================== */

  window.HCAILogo = {
    ASPECT: ASPECT,
    SVG: LOGO_SVG,
    mount: function (canvas, opts) { return canvas ? new Logo(canvas, opts) : null; }
  };
})();
