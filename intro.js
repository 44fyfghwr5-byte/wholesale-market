/* 700 OPTOM — cinematic opening (buyer site). Runs once on each app launch. */
(function () {
  if (window.__optomIntro) return;
  window.__optomIntro = true;

  var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var TOTAL = reduced ? 1400 : 4500;
  var TAU = Math.PI * 2, TILT = 0.32;

  document.documentElement.style.background = "#000";

  var ov = document.createElement("div");
  ov.id = "optomIntro";
  ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000;opacity:1";
  var cv = document.createElement("canvas");
  cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;display:block";
  ov.appendChild(cv);
  document.body.appendChild(ov);
  var ctx = cv.getContext("2d");

  var W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  resize();
  window.addEventListener("resize", resize);

  if (document.fonts && document.fonts.load) {
    document.fonts.load("900 100px Unbounded").catch(function () {});
  }

  // ---------- helpers ----------
  function clamp(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function eInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eOut(t) { return 1 - Math.pow(1 - t, 3); }
  function eBack(t) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function a01(a) { return Math.min(1, Math.max(0, a)); }

  // soft red glow sprite (pre-rendered once for performance)
  var GLOW = (function () {
    var s = document.createElement("canvas"); s.width = s.height = 128;
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,90,90,1)");
    gr.addColorStop(0.22, "rgba(239,68,68,0.6)");
    gr.addColorStop(1, "rgba(127,29,29,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return s;
  })();
  function glow(x, y, r, a) {
    a = a01(a);
    if (a <= 0.005) return;
    ctx.globalAlpha = a;
    ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  // ---------- globe land (procedural continents, Fibonacci sphere) ----------
  var LX = [], LY = [], LZ = [];
  (function () {
    var N = 1500, ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
      var lat = Math.asin(y), lon = (((th % TAU) + TAU) % TAU) - Math.PI;
      var v = Math.sin(lon * 2.3 + 0.7) * Math.cos(lat * 2.1 - 0.3)
            + 0.55 * Math.sin(lon * 5.1 - 1.2 + lat * 1.7)
            + 0.35 * Math.cos(lat * 6.3 + lon * 0.9);
      if (v > 0.42) { LX.push(r * Math.cos(th)); LY.push(y); LZ.push(r * Math.sin(th)); }
    }
  })();

  function drawGlobe(cx, cy, R, rot, a) {
    if (a <= 0.01) return;
    var ct = Math.cos(TILT), st = Math.sin(TILT), cr = Math.cos(rot), sr = Math.sin(rot);
    ctx.save();
    ctx.globalAlpha = a;

    // outer red halo (drawn first, sphere covers the centre)
    var og = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.35);
    og.addColorStop(0, "rgba(239,68,68,0.35)");
    og.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, TAU); ctx.fill();

    // dark metallic sphere
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#3c3c3c"); g.addColorStop(0.5, "#151515"); g.addColorStop(1, "#040404");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

    // glowing red land
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < LX.length; i++) {
      var x = LX[i], y = LY[i], z = LZ[i];
      var x1 = x * cr + z * sr, z1 = -x * sr + z * cr;
      var y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      if (z2 <= 0) continue;
      var px = cx + x1 * R, py = cy - y2 * R;
      var sz = R * (0.018 + 0.02 * z2);
      ctx.globalAlpha = a * (0.2 + 0.8 * z2);
      ctx.drawImage(GLOW, px - sz, py - sz, sz * 2, sz * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = a;

    // rim light
    ctx.strokeStyle = "rgba(239,68,68,0.55)";
    ctx.lineWidth = Math.max(1.5, R * 0.02);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

    // specular reflection
    var sp = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, 0, cx - R * 0.42, cy - R * 0.5, R * 0.5);
    sp.addColorStop(0, "rgba(255,255,255,0.22)"); sp.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sp;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- orbital red energy rings ----------
  var RINGS = [
    { r: 1.42, tx: 1.05, tz: 0.25, sp: 0.85, d: 1 },
    { r: 1.56, tx: -0.55, tz: 1.1, sp: -0.6, d: -1 },
    { r: 1.70, tx: 0.2, tz: -0.8, sp: 0.45, d: 1 }
  ];
  var SEG = 120;
  function drawRings(cx, cy, R, a, secs, part) {
    if (a <= 0.01) return;
    var ct = Math.cos(TILT), st = Math.sin(TILT);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var ri = 0; ri < RINGS.length; ri++) {
      var rg = RINGS[ri];
      var spin = secs * rg.sp * rg.d * 0.9;
      var head = (secs * rg.d * 1.7 + ri * 2.1) % TAU; if (head < 0) head += TAU;
      var cX = Math.cos(rg.tx), sX = Math.sin(rg.tx);
      var cZ = Math.cos(rg.tz), sZ = Math.sin(rg.tz);
      var cY = Math.cos(spin), sY = Math.sin(spin);
      var P = [];
      for (var i = 0; i <= SEG; i++) {
        var th = i / SEG * TAU;
        var x = Math.cos(th) * rg.r, y = 0, z = Math.sin(th) * rg.r;
        var y1 = y * cX - z * sX; z = y * sX + z * cX; y = y1;
        var x1 = x * cZ - y * sZ; y = x * sZ + y * cZ; x = x1;
        var x2 = x * cY + z * sY; z = -x * sY + z * cY; x = x2;
        var y2 = y * ct - z * st, z2 = y * st + z * ct;
        P.push([cx + x * R, cy - y2 * R, z2, th]);
      }
      var inPart = function (zz) { return part === "back" ? zz < 0 : zz >= 0; };

      // base ring
      ctx.beginPath(); var on = false;
      for (var j = 0; j < SEG; j++) {
        var p = P[j], q = P[j + 1];
        if (inPart(p[2]) && inPart(q[2])) {
          if (!on) { ctx.moveTo(p[0], p[1]); on = true; }
          ctx.lineTo(q[0], q[1]);
        } else on = false;
      }
      ctx.strokeStyle = "rgba(239,68,68," + (a01((part === "back" ? 0.14 : 0.32) * a)) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // moving light trail with reflection
      for (var k = 0; k < SEG; k++) {
        var P0 = P[k], P1 = P[k + 1];
        if (!(inPart(P0[2]) && inPart(P1[2]))) continue;
        var dd = (head - P0[3]) % TAU; if (dd < 0) dd += TAU;
        if (dd > 1.1) continue;
        var f = 1 - dd / 1.1;
        ctx.strokeStyle = "rgba(255,70,70," + a01(0.95 * a * f) + ")";
        ctx.lineWidth = 1 + 3 * f;
        ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- metallic 3D-style lettering ----------
  function drawWord(word, x, y, size, alpha, spacing, glowAmt) {
    if (size < 1 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a01(alpha);
    ctx.font = "900 " + Math.round(size) + "px Unbounded, Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var chars = Array.from(word), widths = [], total = 0, i;
    for (i = 0; i < chars.length; i++) { widths[i] = ctx.measureText(chars[i]).width; total += widths[i]; }
    total += spacing * (chars.length - 1);
    var g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.46, "#c4c4c4");
    g.addColorStop(0.54, "#4b4b4b");
    g.addColorStop(1, "#161616");
    var px = x - total / 2;
    for (i = 0; i < chars.length; i++) {
      ctx.shadowColor = "rgba(239,68,68," + a01(0.85 * glowAmt) + ")";
      ctx.shadowBlur = size * 0.4 * glowAmt;
      ctx.fillStyle = g;
      ctx.fillText(chars[i], px, y);
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.strokeStyle = "rgba(255,90,90," + a01(0.55 * glowAmt) + ")";
      ctx.strokeText(chars[i], px, y);
      px += widths[i] + spacing;
    }
    ctx.restore();
  }

  // ---------- floating particles ----------
  var PART = [];
  for (var pi = 0; pi < 46; pi++) {
    PART.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, v: Math.random() * 0.03 + 0.01, a: Math.random() * 0.6 + 0.2 });
  }

  // ---------- timeline ----------
  var t0 = null, raf = 0, done = false;

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    ov.style.pointerEvents = "none";
    ov.style.transition = "opacity .45s ease";
    ov.style.opacity = "0";
    setTimeout(function () {
      window.removeEventListener("resize", resize);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }, 500);
  }

  function frame(now) {
    if (done) return;
    if (t0 === null) t0 = now;
    var t = now - t0;
    var tt = reduced ? Math.min(t, 4200) : t;
    var secs = tt / 1000;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    var R = Math.min(W * 0.27, H * 0.19);
    var fs = Math.min(W * 0.3, H * 0.2);
    var cyd = cy - fs * 0.18;
    var sp = fs * 0.66;

    // 1. red light appears in the darkness
    ctx.globalCompositeOperation = "lighter";
    glow(cx, cy, W * 0.55, seg(tt, 80, 1000) * (0.5 - 0.25 * seg(tt, 3700, 4200)));

    // 2. subtle particles
    var pa = seg(tt, 500, 1200) * (1 - seg(tt, 4000, 4500));
    for (var i = 0; i < PART.length; i++) {
      var q = PART[i];
      var py = (((q.y - secs * q.v) % 1) + 1) % 1;
      glow(q.x * W, py * H, q.r * 6, pa * q.a * 0.6);
    }
    ctx.globalCompositeOperation = "source-over";

    // 3. globe and orbital rings
    var fade = seg(tt, 3700, 4150);
    var ga = seg(tt, 350, 1100) * (1 - fade);
    var gs = 0.78 + 0.22 * eOut(seg(tt, 350, 1200)) - 0.06 * fade;
    var GR = R * gs;
    var ra = seg(tt, 700, 1200) * (1 - fade);
    var rot = eInOut(seg(tt, 400, 2600)) * TAU * 1.25;
    drawRings(cx, cy, GR, ra, secs, "back");
    drawGlobe(cx, cy, GR, rot, ga);
    drawRings(cx, cy, GR, ra, secs, "front");

    // 4. red energy burst (globe opens)
    var bp = seg(tt, 2200, 2800);
    if (bp > 0 && bp < 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(239,68,68," + a01((1 - bp) * 0.85) + ")";
      ctx.lineWidth = 2 + (1 - bp) * 12;
      ctx.beginPath(); ctx.arc(cx, cy, GR * (1 + bp * 3.2), 0, TAU); ctx.stroke();
      glow(cx, cy, GR * (0.8 + bp * 2.2), (1 - bp) * 0.75);
      ctx.restore();
    }

    // 5. number 7 drops from the top and lands
    if (tt >= 2300) {
      var d7 = seg(tt, 2300, 2950);
      var y7 = -fs * 0.6 + (cyd + fs * 0.6) * eBack(d7);
      drawWord("7", cx - sp, y7, fs, seg(tt, 2300, 2420), 0, 1);
    }

    // 6. two zeros emerge from the globe and take their places
    if (tt >= 2950) {
      var zl1 = seg(tt, 2950, 3400);
      drawWord("0", cx, cy + (cyd - cy) * eOut(zl1), fs * (0.2 + 0.8 * eBack(zl1)), seg(tt, 2950, 3080), 0, 1);
    }
    if (tt >= 3050) {
      var zl2 = seg(tt, 3050, 3500);
      drawWord("0", cx + sp * eOut(zl2), cy + (cyd - cy) * eOut(zl2), fs * (0.2 + 0.8 * eBack(zl2)), seg(tt, 3050, 3200), 0, 1);
    }

    // 7. OPTOM moves forward from the globe into place, then glows
    if (tt >= 3350) {
      var ol = seg(tt, 3350, 3900);
      var lp = seg(tt, 3900, 4250);
      var gl = 1 + 0.9 * Math.sin(lp * Math.PI);
      var os = fs * 0.26 * (0.3 + 0.7 * eOut(ol));
      drawWord("OPTOM", cx, cy + (cyd + fs * 0.62 - cy) * eOut(ol), os, seg(tt, 3350, 3520), os * 0.5, gl);
    }

    if (t >= TOTAL) finish();
    else raf = requestAnimationFrame(frame);
  }

  // tap anywhere to skip
  ov.addEventListener("pointerdown", function () { finish(); });
  raf = requestAnimationFrame(frame);
})();
