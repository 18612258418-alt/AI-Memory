import { useRef, useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

// Canvas 2D API cannot consume CSS custom properties — hex values are sourced
// directly from the _1130NewDesignSystem token definitions in styles.css.
const CC = {
  brand: "#4D5CFF",
  brandSubtle: "#E8EEFF",
  success: "#00B42A",
  successSubtle: "#E8FFEA",
  warning: "#FF8A0D",
  warningSubtle: "#FFF8E8",
  error: "#F2423C",
  errorSubtle: "#FFEDE8",
  skyblue: "#26B7FF",
  purple: "#B285FF",
  textPrimary: "#020418",
  textSecondary: "#41464F",
  placeholder: "#7B8291",
  border: "#EAEDF2",
  bg: "#F7F8FA",
};

// ─── Reusable slider control ────────────────────────────────────────────────
function SliderRow({
  label, value, min, max, step, unit = "", onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        {/* using raw <span>: no kit Label component */}
        <span className="body-small" style={{ color: "var(--color\\/text\\/color-text-secondary)" }}>
          {label}
        </span>
        <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-brand-default)" }}>
          {fmt ? fmt(value) : value}{unit}
        </span>
      </div>
      {/* using raw <input type="range">: no kit Slider component */}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--brand\\/--brand-color)", cursor: "pointer" }}
      />
    </div>
  );
}

function InfoBox({ text, tone = "brand" }: { text: string; tone?: "brand" | "success" | "warning" }) {
  const map: Record<string, [string, string]> = {
    brand:   ["var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",   "var(--color\\/border\\/color-border-brand)"],
    success: ["var(--color\\/bg\\/success\\/color-bg-success-subtlest)", "var(--color\\/border\\/color-border-success-subtler)"],
    warning: ["var(--color\\/bg\\/warning\\/color-bg-warning-subtlest)", "var(--color\\/border\\/color-border-warning-subtler)"],
  };
  const [bg, border] = map[tone];
  return (
    <div className="body-small" style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 14px", color: "var(--color\\/text\\/color-text-primary)" }}>
      {text}
    </div>
  );
}

// ─── Helper: set up hi-DPI canvas ───────────────────────────────────────────
function setupCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return { ctx, w: cssW, h: cssH };
}

// ─── RC Circuit ─────────────────────────────────────────────────────────────
function RCCircuitViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const t0Ref = useRef<number | null>(null);
  const [R, setR] = useState(5);   // kΩ
  const [C, setC] = useState(47);  // μF
  const [mode, setMode] = useState<"charge" | "discharge">("charge");
  const tau = R * 1000 * C * 1e-6;

  const draw = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 500, 280);
    const pad = { t: 28, r: 20, b: 48, l: 52 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;

    ctx.fillStyle = CC.bg;
    ctx.fillRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = CC.border; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + ph * i / 5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      ctx.fillStyle = CC.placeholder;
      ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(((5 - i) / 5 * 5).toFixed(1) + "V", pad.l - 6, y + 3);
    }
    for (let i = 0; i <= 5; i++) {
      const x = pad.l + pw * i / 5;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      ctx.fillStyle = CC.placeholder;
      ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "center";
      ctx.fillText((i * tau).toFixed(2) + "s", x, pad.t + ph + 16);
    }

    // 63.2% dashed line
    const y632 = pad.t + ph * (1 - 0.632);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = CC.warning; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, y632); ctx.lineTo(pad.l + pw, y632); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CC.warning; ctx.font = "bold 10px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("63.2%  (τ)", pad.l + 4, y632 - 4);

    // τ vertical
    const xTau = pad.l + pw / 5;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = CC.purple; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xTau, pad.t); ctx.lineTo(xTau, pad.t + ph); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CC.purple; ctx.textAlign = "center"; ctx.font = "bold 10px PingFang SC,sans-serif";
    ctx.fillText("τ=" + (tau * 1000).toFixed(1) + "ms", xTau, pad.t - 6);

    // curve
    const steps = 300;
    const endT = 5 * tau * Math.min(progress, 1);
    ctx.beginPath(); ctx.strokeStyle = CC.brand; ctx.lineWidth = 2.5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps * endT;
      const v = mode === "charge"
        ? 5 * (1 - Math.exp(-t / tau))
        : 5 * Math.exp(-t / tau);
      const x = pad.l + (t / (5 * tau)) * pw;
      const y = pad.t + ph - (v / 5) * ph;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // dot at τ
    if (progress > 0.18) {
      const vTau = mode === "charge" ? 5 * (1 - Math.exp(-1)) : 5 * Math.exp(-1);
      ctx.beginPath();
      ctx.arc(xTau, pad.t + ph - (vTau / 5) * ph, 5, 0, Math.PI * 2);
      ctx.fillStyle = CC.brand; ctx.fill();
    }

    // axes
    ctx.strokeStyle = CC.textSecondary; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph);
    ctx.moveTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    ctx.fillStyle = CC.textSecondary; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("时间 t", pad.l + pw / 2, h - 6);
    ctx.save(); ctx.translate(14, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("电压 V(t)", 0, 0); ctx.restore();
  }, [R, C, tau, mode]);

  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    t0Ref.current = null;
    const run = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const p = (ts - t0Ref.current) / 2200;
      draw(p);
      if (p < 1) rafRef.current = requestAnimationFrame(run);
      else draw(1);
    };
    rafRef.current = requestAnimationFrame(run);
  }, [draw]);

  useEffect(() => { restart(); return () => cancelAnimationFrame(rafRef.current); }, [restart]);

  return (
    <div className="flex flex-col gap-4">
      {/* using raw <canvas>: no kit Chart component */}
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex gap-2">
        {(["charge", "discharge"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="body-small"
            style={{
              padding: "5px 14px", borderRadius: 7, cursor: "pointer", border: "none",
              backgroundColor: mode === m ? "var(--brand\\/--brand-color)" : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
              color: mode === m ? "white" : "var(--color\\/text\\/color-text-secondary)",
            }}>
            {m === "charge" ? "⚡ 充电" : "📉 放电"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="电阻 R" value={R} min={1} max={20} step={0.5} unit=" kΩ" onChange={setR} />
        <SliderRow label="电容 C" value={C} min={10} max={200} step={5} unit=" μF" onChange={setC} />
        <InfoBox tone="brand" text={`τ = RC = ${R} kΩ × ${C} μF = ${(tau * 1000).toFixed(1)} ms   |   5τ = ${(tau * 5000).toFixed(0)} ms（充至99.3%）`} />
        <InfoBox tone="warning" text="⚠ 示波器探头输入阻抗（1 MΩ）与R并联，使等效电阻偏小，导致τ实测值偏低。" />
      </div>
    </div>
  );
}

// ─── Pendulum ───────────────────────────────────────────────────────────────
function PendulumViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const t0Ref = useRef<number | null>(null);
  const [L, setL] = useState(1.0);
  const [theta0, setTheta0] = useState(5); // degrees
  const g = 9.80;
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const omega = 2 * Math.PI / T;

  const draw = useCallback((elapsed: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 400, 360);
    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, w, h);

    const pivotX = w / 2, pivotY = 56;
    const scale = Math.min((h - 100) / 2.2, 120);
    const stringPx = L * scale;
    const theta = (theta0 * Math.PI / 180) * Math.cos(omega * elapsed / 1000);
    const bobX = pivotX + stringPx * Math.sin(theta);
    const bobY = pivotY + stringPx * Math.cos(theta);

    // Ceiling
    ctx.fillStyle = CC.border;
    ctx.fillRect(pivotX - 28, 30, 56, 26);
    ctx.fillStyle = CC.textSecondary;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(pivotX + i * 10 - 8, 30);
      ctx.lineTo(pivotX + i * 10, 42);
      ctx.strokeStyle = CC.placeholder; ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Equilibrium dashed
    ctx.setLineDash([5, 4]); ctx.strokeStyle = CC.border; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX, pivotY + stringPx + 24); ctx.stroke();
    ctx.setLineDash([]);

    // Angle arc
    if (Math.abs(theta) > 0.01) {
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 44, Math.PI / 2 - Math.abs(theta), Math.PI / 2, theta < 0);
      ctx.strokeStyle = CC.warning; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = CC.warning; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${theta0}°`, pivotX + 58 * Math.sin(theta / 2), pivotY + 54 * Math.cos(theta / 2));
    }

    // String
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY);
    ctx.strokeStyle = CC.textSecondary; ctx.lineWidth = 2; ctx.stroke();

    // Pivot dot
    ctx.beginPath(); ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = CC.textSecondary; ctx.fill();

    // Bob gradient
    const grad = ctx.createRadialGradient(bobX - 6, bobY - 6, 2, bobX, bobY, 20);
    grad.addColorStop(0, CC.skyblue); grad.addColorStop(1, CC.brand);
    ctx.beginPath(); ctx.arc(bobX, bobY, 20, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();

    // Length label
    const midX = pivotX + stringPx / 2 * Math.sin(theta) + 18;
    const midY = pivotY + stringPx / 2 * Math.cos(theta);
    ctx.fillStyle = CC.placeholder; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`L = ${L.toFixed(2)} m`, midX, midY);

    // Period info
    ctx.fillStyle = CC.brand; ctx.font = "bold 13px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`T = ${T.toFixed(3)} s`, 16, h - 36);
    const gCalc = 4 * Math.PI ** 2 * L / T ** 2;
    ctx.fillStyle = Math.abs(gCalc - g) < 0.05 ? CC.success : CC.warning;
    ctx.font = "12px PingFang SC,sans-serif";
    ctx.fillText(`g实测 = ${gCalc.toFixed(3)} m/s²  (标准 9.800)`, 16, h - 18);
  }, [L, theta0, T, omega]);

  useEffect(() => {
    const run = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      draw(ts - t0Ref.current);
      rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="摆长 L（悬点→球心）" value={L} min={0.2} max={2.0} step={0.05} unit=" m" onChange={(v) => { setL(v); t0Ref.current = null; }} fmt={(v) => v.toFixed(2)} />
        <SliderRow label="初始摆角 θ₀" value={theta0} min={1} max={20} step={0.5} unit="°" onChange={setTheta0} fmt={(v) => v.toFixed(1)} />
        {theta0 > 5 && <InfoBox tone="warning" text={`⚠ 摆角 ${theta0}° 超过5°，小角近似误差增大，g计算值将偏低。`} />}
        <InfoBox tone="brand" text={`T = 2π√(L/g) = ${T.toFixed(4)} s   |   注意：摆长须量到球心，非球顶`} />
      </div>
    </div>
  );
}

// ─── Refraction (SVG-based) ─────────────────────────────────────────────────
function RefractionViz() {
  const [theta1, setTheta1] = useState(30);
  const [n2, setN2] = useState(1.5);
  const n1 = 1.0;
  const sinT2 = (n1 * Math.sin((theta1 * Math.PI) / 180)) / n2;
  const tir = sinT2 > 1;
  const theta2 = tir ? null : (Math.asin(sinT2) * 180) / Math.PI;
  const W = 480, H = 300, cx = W / 2, cy = H / 2, R = 130;
  const a1 = (theta1 * Math.PI) / 180;
  const a2 = theta2 !== null ? (theta2 * Math.PI) / 180 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* using raw <svg>: no kit SVG/Diagram component */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", borderRadius: 8, backgroundColor: CC.bg, display: "block" }}>
        {/* Media backgrounds */}
        <rect x={0} y={0} width={W} height={cy} fill="#EFF6FF" />
        <rect x={0} y={cy} width={W} height={cy} fill="#DBEAFE" />
        <text x={12} y={22} fontSize={11} fill={CC.placeholder} fontFamily="PingFang SC,sans-serif">空气  n₁ = 1.00</text>
        <text x={12} y={cy + 20} fontSize={11} fill={CC.skyblue} fontFamily="PingFang SC,sans-serif">玻璃  n₂ = {n2.toFixed(2)}</text>
        {/* Interface */}
        <line x1={0} y1={cy} x2={W} y2={cy} stroke={CC.border} strokeWidth={1.5} />
        {/* Normal */}
        <line x1={cx} y1={16} x2={cx} y2={H - 16} stroke={CC.placeholder} strokeWidth={1} strokeDasharray="6 4" />
        {/* Incident ray */}
        <line
          x1={cx - R * Math.sin(a1)} y1={cy - R * Math.cos(a1)}
          x2={cx} y2={cy}
          stroke={CC.warning} strokeWidth={2.5}
          markerEnd="url(#arrowW)"
        />
        {/* Refracted ray */}
        {!tir && theta2 !== null && (
          <line x1={cx} y1={cy} x2={cx + R * Math.sin(a2)} y2={cy + R * Math.cos(a2)}
            stroke={CC.brand} strokeWidth={2.5} markerEnd="url(#arrowB)" />
        )}
        {/* Reflected ray (partial) */}
        <line x1={cx} y1={cy} x2={cx + R * Math.sin(a1)} y2={cy - R * Math.cos(a1)}
          stroke={CC.warning} strokeWidth={1.5} strokeOpacity={0.45} strokeDasharray="5 4" />
        {/* Angle arcs */}
        <path
          d={`M ${cx} ${cy - 52} A 52 52 0 0 0 ${cx - 52 * Math.sin(a1)} ${cy - 52 * Math.cos(a1)}`}
          fill="none" stroke={CC.warning} strokeWidth={1.5}
        />
        <text x={cx - 66 * Math.sin(a1 / 2) - 8} y={cy - 66 * Math.cos(a1 / 2) + 4}
          fontSize={12} fill={CC.warning} fontFamily="PingFang SC,sans-serif">θ₁={theta1}°</text>
        {!tir && theta2 !== null && (
          <>
            <path
              d={`M ${cx} ${cy + 52} A 52 52 0 0 1 ${cx + 52 * Math.sin(a2)} ${cy + 52 * Math.cos(a2)}`}
              fill="none" stroke={CC.brand} strokeWidth={1.5}
            />
            <text x={cx + 66 * Math.sin(a2 / 2) + 4} y={cy + 66 * Math.cos(a2 / 2) + 4}
              fontSize={12} fill={CC.brand} fontFamily="PingFang SC,sans-serif">θ₂={theta2.toFixed(1)}°</text>
          </>
        )}
        {tir && <text x={cx + 8} y={cy + 32} fontSize={13} fill={CC.error} fontFamily="PingFang SC,sans-serif" fontWeight="bold">⚠ 全内反射！</text>}
        {/* Arrow markers */}
        <defs>
          <marker id="arrowW" markerWidth={7} markerHeight={7} refX={5} refY={3.5} orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill={CC.warning} />
          </marker>
          <marker id="arrowB" markerWidth={7} markerHeight={7} refX={5} refY={3.5} orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill={CC.brand} />
          </marker>
        </defs>
      </svg>
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="入射角 θ₁" value={theta1} min={5} max={80} step={1} unit="°" onChange={setTheta1} />
        <SliderRow label="玻璃折射率 n₂" value={n2} min={1.3} max={2.0} step={0.05} onChange={setN2} fmt={(v) => v.toFixed(2)} />
        <InfoBox tone="brand"
          text={tir
            ? `全内反射：θ₁=${theta1}° 超过临界角 ${(Math.asin(n1 / n2) * 180 / Math.PI).toFixed(1)}°`
            : `n₁ sin θ₁ = n₂ sin θ₂  →  sin(${theta1}°) = ${n2.toFixed(2)} × sin(${theta2!.toFixed(1)}°)  ✓`}
        />
        <InfoBox tone="warning" text="⚠ 实验中用量角器直接量角误差较大。插针法多点取线更准确，同时需保持玻璃砖表面洁净。" />
      </div>
    </div>
  );
}

// ─── Special Relativity ─────────────────────────────────────────────────────
function RelativityViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [beta, setBeta] = useState(0.80);
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const classKE = 0.5 * beta * beta;          // ½m₀v² / m₀c²
  const relKE   = gamma - 1;                  // (γ−1)m₀c²
  const classP  = beta;                        // m₀v / m₀c
  const relP    = gamma * beta;               // γm₀v / m₀c
  const ratio   = relKE / Math.max(classKE, 0.0001);

  const drawGamma = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 500, 240);
    const pad = { t: 24, r: 20, b: 42, l: 48 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const maxG = 7;

    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = CC.border; ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = pad.t + ph * i / 6;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      ctx.fillStyle = CC.placeholder; ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "right";
      ctx.fillText(((6 - i) * maxG / 6).toFixed(0), pad.l - 5, y + 3);
    }
    for (let i = 0; i <= 10; i++) {
      const x = pad.l + pw * i / 10;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      ctx.fillStyle = CC.placeholder; ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "center";
      ctx.fillText((i / 10).toFixed(1) + "c", x, pad.t + ph + 16);
    }

    // γ(v) curve
    ctx.beginPath(); ctx.strokeStyle = CC.brand; ctx.lineWidth = 2;
    for (let i = 1; i <= 300; i++) {
      const b = (i / 300) * 0.995;
      const g = 1 / Math.sqrt(1 - b * b);
      if (g > maxG) break;
      const x = pad.l + b * pw;
      const y = pad.t + ph - (g / maxG) * ph;
      i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Classical KE line (½β²) — scaled by m₀c²
    ctx.beginPath(); ctx.strokeStyle = CC.warning; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    for (let i = 0; i <= 100; i++) {
      const b = i / 100 * 0.995;
      const ke = 0.5 * b * b;
      if (ke > maxG) break;
      const x = pad.l + b * pw;
      const y = pad.t + ph - (ke / maxG) * ph;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Current point
    if (gamma <= maxG) {
      const cx2 = pad.l + beta * pw;
      const cy2 = pad.t + ph - (gamma / maxG) * ph;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = CC.brand; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2, pad.t + ph);
      ctx.moveTo(cx2, cy2); ctx.lineTo(pad.l, cy2);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx2, cy2, 5, 0, Math.PI * 2);
      ctx.fillStyle = CC.brand; ctx.fill();
      ctx.fillStyle = CC.brand; ctx.font = "bold 12px PingFang SC,sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`γ = ${gamma.toFixed(3)}`, cx2 + 8, cy2 - 4);
    }

    // Axis labels
    ctx.fillStyle = CC.textSecondary; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("速度 v", pad.l + pw / 2, h - 6);
    ctx.save(); ctx.translate(13, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("洛伦兹因子 γ", 0, 0); ctx.restore();

    // Legend
    ctx.fillStyle = CC.brand; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("— γ(v) 相对论", pad.l + 8, pad.t + 16);
    ctx.fillStyle = CC.warning;
    ctx.fillText("-- ½β² 经典动能", pad.l + 8, pad.t + 30);
  }, [beta, gamma]);

  useEffect(() => { drawGamma(); }, [drawGamma]);

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="速度 v" value={beta} min={0.05} max={0.99} step={0.01} unit="" onChange={setBeta} fmt={(v) => `${(v * 100).toFixed(0)}% c`} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/warning\\/color-bg-warning-subtlest)", border: "1px solid var(--color\\/border\\/color-border-warning-subtler)" }}>
            <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-warning-default)" }}>经典力学（错）</span>
            <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-secondary)" }}>动能 = ½m₀v²</span>
            <span className="title-small" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>{classKE.toFixed(4)} m₀c²</span>
            <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-secondary)" }}>动量 = m₀v</span>
            <span className="title-small" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>{classP.toFixed(4)} m₀c</span>
          </div>
          <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/success\\/color-bg-success-subtlest)", border: "1px solid var(--color\\/border\\/color-border-success-subtler)" }}>
            <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-success-default)" }}>相对论（正确）</span>
            <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-secondary)" }}>动能 = (γ−1)m₀c²</span>
            <span className="title-small" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>{relKE.toFixed(4)} m₀c²</span>
            <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-secondary)" }}>动量 = γm₀v</span>
            <span className="title-small" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>{relP.toFixed(4)} m₀c</span>
          </div>
        </div>
        <InfoBox tone="brand" text={`γ = ${gamma.toFixed(4)}  |  动能偏差：经典值仅为相对论值的 ${(classKE / relKE * 100).toFixed(1)}%  |  总能量 E = ${gamma.toFixed(4)} m₀c²`} />
        {/* Energy bars */}
        <div className="flex flex-col gap-1.5">
          <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}>动能对比（相对论 = 100%）</span>
          <div className="flex items-center gap-2">
            <span className="body-mini-s" style={{ width: 44, color: "var(--color\\/text\\/color-text-warning-default)" }}>经典</span>
            <div style={{ flex: 1, height: 10, backgroundColor: "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100 / ratio, 100)}%`, height: "100%", backgroundColor: "var(--color\\/bg\\/warning\\/color-bg-warning-default)", borderRadius: 5, transition: "width 0.25s" }} />
            </div>
            <span className="body-mini-s" style={{ width: 44, textAlign: "right", color: "var(--color\\/text\\/color-text-warning-default)" }}>{(100 / ratio).toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="body-mini-s" style={{ width: 44, color: "var(--color\\/text\\/color-text-success-default)" }}>相对论</span>
            <div style={{ flex: 1, height: 10, backgroundColor: "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", backgroundColor: "var(--color\\/bg\\/success\\/color-bg-success-default)", borderRadius: 5 }} />
            </div>
            <span className="body-mini-s" style={{ width: 44, textAlign: "right", color: "var(--color\\/text\\/color-text-success-default)" }}>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Normal Distribution ─────────────────────────────────────────────────────
function NormalDistViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mu, setMu] = useState(2);
  const [sigma, setSigma] = useState(2);

  const pdf = (x: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) / (sigma * Math.sqrt(2 * Math.PI));
  const phi = (z: number) => 0.5 * (1 + erf(z / Math.sqrt(2)));
  const erf = (x: number) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const p = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
    return x >= 0 ? p : -p;
  };
  const prob = phi((4 - mu) / sigma) - phi((0 - mu) / sigma);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 500, 240);
    const pad = { t: 20, r: 20, b: 42, l: 44 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const xMin = mu - 4 * sigma, xMax = mu + 4 * sigma;
    const maxY = pdf(mu) * 1.2;

    const toX = (v: number) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const toY = (v: number) => pad.t + ph - (v / maxY) * ph;

    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = CC.border; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const x = toX(mu + i * sigma);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      ctx.fillStyle = CC.placeholder; ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${mu + i * sigma}`, x, pad.t + ph + 16);
    }

    // Shaded area 0 < x < 4
    const x0 = Math.max(toX(0), pad.l), x4 = Math.min(toX(4), pad.l + pw);
    ctx.beginPath();
    ctx.moveTo(x0, toY(0));
    for (let i = 0; i <= 200; i++) {
      const v = 0 + (4 - 0) * i / 200;
      ctx.lineTo(toX(v), toY(pdf(v)));
    }
    ctx.lineTo(x4, toY(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(77,92,255,0.18)"; ctx.fill();

    // Boundary lines
    ctx.setLineDash([5, 4]); ctx.strokeStyle = CC.brand; ctx.lineWidth = 1.5;
    [0, 4].forEach(v => {
      const x = toX(v);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
    });
    ctx.setLineDash([]);

    // PDF curve
    ctx.beginPath(); ctx.strokeStyle = CC.brand; ctx.lineWidth = 2.5;
    for (let i = 0; i <= 300; i++) {
      const v = xMin + (xMax - xMin) * i / 300;
      const x = toX(v), y = toY(pdf(v));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = CC.brand; ctx.font = "bold 11px PingFang SC,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`P(0<X<4) ≈ ${prob.toFixed(4)}`, toX((0 + 4) / 2), pad.t + ph / 2 - 6);
    ctx.fillStyle = CC.textSecondary; ctx.font = "11px PingFang SC,sans-serif";
    ctx.fillText("x", pad.l + pw, pad.t + ph + 16);
    ctx.fillStyle = CC.brand; ctx.textAlign = "left";
    ctx.fillText(`N(${mu}, ${sigma}²)`, pad.l + 8, pad.t + 14);
  }, [mu, sigma, prob, pdf]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="均值 μ" value={mu} min={-2} max={6} step={0.5} onChange={setMu} fmt={(v) => v.toFixed(1)} />
        <SliderRow label="标准差 σ" value={sigma} min={0.5} max={4} step={0.25} onChange={(v) => setSigma(v)} fmt={(v) => v.toFixed(2)} />
        <InfoBox tone="brand" text={`标准化：Z = (X − μ)/σ = (X − ${mu})/${sigma}  |  P(0<X<4) = Φ(${((4 - mu) / sigma).toFixed(2)}) − Φ(${((0 - mu) / sigma).toFixed(2)}) = ${prob.toFixed(4)}`} />
        <InfoBox tone="warning" text="⚠ 常见错误：未除以 σ 直接代入 Φ。标准化步骤是必须的！" />
      </div>
    </div>
  );
}

// ─── Integral Viz ────────────────────────────────────────────────────────────
function IntegralViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [b, setB] = useState(1.0);
  const exact = (x: number) => (x * x - 2 * x + 2) * Math.exp(x) - 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 500, 240);
    const pad = { t: 20, r: 20, b: 42, l: 48 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const xMin = -0.05, xMax = 1.15, yMin = -0.1, yMax = 3.0;
    const tx = (v: number) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const ty = (v: number) => pad.t + ph - ((v - yMin) / (yMax - yMin)) * ph;

    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = CC.border; ctx.lineWidth = 1;
    [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].forEach(y => {
      ctx.beginPath(); ctx.moveTo(pad.l, ty(y)); ctx.lineTo(pad.l + pw, ty(y)); ctx.stroke();
      ctx.fillStyle = CC.placeholder; ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "right";
      if (y >= 0) ctx.fillText(y.toFixed(1), pad.l - 5, ty(y) + 3);
    });
    [0, 0.25, 0.5, 0.75, 1.0].forEach(x => {
      ctx.beginPath(); ctx.moveTo(tx(x), pad.t); ctx.lineTo(tx(x), pad.t + ph); ctx.stroke();
      ctx.fillStyle = CC.placeholder; ctx.font = "10px PingFang SC,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(x.toFixed(2), tx(x), pad.t + ph + 16);
    });

    // Shaded area
    ctx.beginPath(); ctx.moveTo(tx(0), ty(0));
    for (let i = 0; i <= 200; i++) {
      const x = (i / 200) * b;
      ctx.lineTo(tx(x), ty(Math.max(0, x * x * Math.exp(x))));
    }
    ctx.lineTo(tx(b), ty(0)); ctx.closePath();
    ctx.fillStyle = "rgba(77,92,255,0.15)"; ctx.fill();

    // Upper bound
    ctx.setLineDash([5, 4]); ctx.strokeStyle = CC.warning; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx(b), pad.t); ctx.lineTo(tx(b), pad.t + ph); ctx.stroke();
    ctx.setLineDash([]);

    // Curve
    ctx.beginPath(); ctx.strokeStyle = CC.brand; ctx.lineWidth = 2.5;
    for (let i = 0; i <= 300; i++) {
      const x = xMin + (xMax - xMin) * i / 300;
      const y = x * x * Math.exp(x);
      if (y < yMin || y > yMax + 0.5) continue;
      const px = tx(x), py = ty(Math.min(y, yMax));
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = CC.textSecondary; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, ty(0)); ctx.lineTo(pad.l + pw, ty(0));
    ctx.moveTo(tx(0), pad.t); ctx.lineTo(tx(0), pad.t + ph);
    ctx.stroke();

    ctx.fillStyle = CC.brand; ctx.font = "bold 11px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("f(x) = x²eˣ", pad.l + 8, pad.t + 14);
    ctx.fillStyle = CC.brand; ctx.textAlign = "center";
    ctx.fillText(`∫₀^${b.toFixed(2)} = ${exact(b).toFixed(6)}`, tx(b / 2), ty(0.4));
  }, [b, exact]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="积分上限 b" value={b} min={0.1} max={1.0} step={0.05} onChange={setB} fmt={(v) => v.toFixed(2)} />
        <InfoBox tone="brand" text={`∫₀^${b.toFixed(2)} x²eˣ dx = (x²−2x+2)eˣ |₀^${b.toFixed(2)} = ${exact(b).toFixed(6)}`} />
        <InfoBox tone="success" text={`当 b=1：∫₀¹ x²eˣ dx = e − 2 ≈ ${(Math.E - 2).toFixed(6)}`} />
      </div>
    </div>
  );
}

// ─── Binary Tree ─────────────────────────────────────────────────────────────
function BinaryTreeViz() {
  const [step, setStep] = useState(4);
  const nodes = [
    { id: "A", x: 240, y: 40,  label: "A（根）",  highlight: step >= 1 },
    { id: "E", x: 120, y: 120, label: "E",         highlight: step >= 2 },
    { id: "C", x: 360, y: 120, label: "C",         highlight: step >= 2 },
    { id: "D", x: 60,  y: 200, label: "D",         highlight: step >= 3 },
    { id: "B", x: 180, y: 200, label: "B",         highlight: step >= 3 },
    { id: "F", x: 420, y: 200, label: "F",         highlight: step >= 4 },
  ];
  const edges = [
    { from: "A", to: "E", step: 2 }, { from: "A", to: "C", step: 2 },
    { from: "E", to: "D", step: 3 }, { from: "E", to: "B", step: 3 },
    { from: "C", to: "F", step: 4 },
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const stepLabels = [
    "初始状态", "Step 1: 后序末位 A 为根", "Step 2: 中序定位 A，左子树 DBE，右子树 CF",
    "Step 3: 左子树后序末位 E 为局部根，D 左孩子，B 右孩子", "Step 4: 右子树后序末位 C 为局部根，F 右孩子",
  ];
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 480 260" style={{ width: "100%", borderRadius: 8, backgroundColor: CC.bg, display: "block" }}>
        {edges.filter(e => e.step <= step).map(e => {
          const f = byId[e.from], t = byId[e.to];
          return <line key={e.from + e.to} x1={f.x} y1={f.y + 18} x2={t.x} y2={t.y - 18}
            stroke={CC.brand} strokeWidth={2} />;
        })}
        {nodes.filter(n => n.highlight).map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={18} fill={CC.brandSubtle} stroke={CC.brand} strokeWidth={2} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={12} fill={CC.brand}
              fontFamily="PingFang SC,sans-serif" fontWeight="bold">{n.id}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4].map(s => (
            <button key={s} onClick={() => setStep(s)}
              className="mark-small"
              style={{
                padding: "5px 12px", borderRadius: 7, cursor: "pointer", border: "none",
                backgroundColor: step === s ? "var(--brand\\/--brand-color)" : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                color: step === s ? "white" : "var(--color\\/text\\/color-text-secondary)",
              }}>
              Step {s}
            </button>
          ))}
        </div>
        <InfoBox tone="brand" text={stepLabels[step]} />
        <InfoBox tone="warning" text="⚠ 关键规则：后序遍历最后一个节点永远是当前子树的根节点。中序遍历中根节点左侧为左子树，右侧为右子树。" />
      </div>
    </div>
  );
}

// ─── Eigenvalue ──────────────────────────────────────────────────────────────
function EigenViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(0);
  const A = [[4, 1], [2, 3]];

  const mul = (v: [number, number]): [number, number] => [
    A[0][0] * v[0] + A[0][1] * v[1],
    A[1][0] * v[0] + A[1][1] * v[1],
  ];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 500, 280);
    const cx2 = w / 2, cy2 = h / 2, scale = 50;
    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = CC.border; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx2 + i * scale, 0); ctx.lineTo(cx2 + i * scale, h); ctx.stroke();
      ctx.moveTo(0, cy2 + i * scale); ctx.lineTo(w, cy2 + i * scale); ctx.stroke();
    }
    ctx.strokeStyle = CC.textSecondary; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy2); ctx.lineTo(w, cy2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx2, 0); ctx.lineTo(cx2, h); ctx.stroke();

    const rad = (angle * Math.PI) / 180;
    const v: [number, number] = [Math.cos(rad), Math.sin(rad)];
    const Av = mul(v);

    // Draw v (input vector)
    ctx.beginPath(); ctx.strokeStyle = CC.warning; ctx.lineWidth = 2;
    ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + v[0] * scale, cy2 - v[1] * scale); ctx.stroke();
    ctx.fillStyle = CC.warning; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("v", cx2 + v[0] * scale + 5, cy2 - v[1] * scale);

    // Draw Av (output vector)
    ctx.beginPath(); ctx.strokeStyle = CC.brand; ctx.lineWidth = 2.5;
    ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Av[0] * scale, cy2 - Av[1] * scale); ctx.stroke();
    ctx.fillStyle = CC.brand; ctx.textAlign = "left";
    ctx.fillText("Av", cx2 + Av[0] * scale + 5, cy2 - Av[1] * scale);

    // Eigenvectors
    const evecs: [[number, number], number, string][] = [
      [[-1, 2], 2, CC.success],
      [[1, 1], 5, "#B285FF"],
    ];
    evecs.forEach(([ev, lambda, color]) => {
      const norm = Math.sqrt(ev[0] ** 2 + ev[1] ** 2);
      const u: [number, number] = [ev[0] / norm, ev[1] / norm];
      ctx.setLineDash([5, 4]); ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx2 - u[0] * scale * 2, cy2 + u[1] * scale * 2);
      ctx.lineTo(cx2 + u[0] * scale * 2, cy2 - u[1] * scale * 2);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = "bold 11px PingFang SC,sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`λ=${lambda}`, cx2 + u[0] * scale * 2.1, cy2 - u[1] * scale * 2.1);
    });

    // Info
    const mag = Math.sqrt(Av[0] ** 2 + Av[1] ** 2);
    ctx.fillStyle = CC.textSecondary; ctx.font = "11px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`v = (${v[0].toFixed(2)}, ${v[1].toFixed(2)})`, 10, 20);
    ctx.fillText(`Av = (${Av[0].toFixed(2)}, ${Av[1].toFixed(2)})   |Av| = ${mag.toFixed(3)}`, 10, 36);
  }, [angle, mul]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <SliderRow label="输入向量方向 θ" value={angle} min={0} max={360} step={2} unit="°" onChange={setAngle} />
        <InfoBox tone="brand" text="当向量方向与特征向量（虚线）对齐时，Av 方向不变，只伸缩λ倍。特征方向：(-1,2)→λ=2，(1,1)→λ=5" />
        <InfoBox tone="warning" text="⚠ 特征向量方向 (-1,2) 对应 λ=2，而非 (1,-2)。方向搞反则不再是特征向量。" />
      </div>
    </div>
  );
}

// ─── 极值可视化 ───────────────────────────────────────────────────────────────
function ExtremaViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 500, 300);
    const pad = { t: 16, r: 16, b: 32, l: 36 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const xMin = -1.8, xMax = 2.5, yMin = -1.8, yMax = 2.5;
    const steps = 120;
    const tx = (v: number) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const ty = (v: number) => pad.t + ph - ((v - yMin) / (yMax - yMin)) * ph;

    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, w, h);

    // Heatmap of f(x,y) = x³+y³-3xy
    const imgData = ctx.createImageData(pw, ph);
    const fMin = -4, fMax = 4;
    for (let pi = 0; pi < ph; pi++) {
      for (let pj = 0; pj < pw; pj++) {
        const x = xMin + (pj / pw) * (xMax - xMin);
        const y = yMin + ((ph - pi) / ph) * (yMax - yMin);
        const f = x ** 3 + y ** 3 - 3 * x * y;
        const t = Math.max(0, Math.min(1, (f - fMin) / (fMax - fMin)));
        const idx = (pi * pw + pj) * 4;
        if (t < 0.5) {
          imgData.data[idx]     = Math.round(77 + (239 - 77) * (t * 2));
          imgData.data[idx + 1] = Math.round(92 + (239 - 92) * (t * 2));
          imgData.data[idx + 2] = Math.round(255 + (255 - 255) * (t * 2));
        } else {
          imgData.data[idx]     = Math.round(239 + (242 - 239) * ((t - 0.5) * 2));
          imgData.data[idx + 1] = Math.round(239 + (67 - 239) * ((t - 0.5) * 2));
          imgData.data[idx + 2] = Math.round(255 + (60 - 255) * ((t - 0.5) * 2));
        }
        imgData.data[idx + 3] = 200;
      }
    }
    ctx.putImageData(imgData, pad.l, pad.t);

    // Contour lines
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
    [-3, -2, -1, 0, 1, 2, 3].forEach(level => {
      ctx.beginPath();
      let moved = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        for (let j = 0; j <= steps; j++) {
          const y = yMin + (j / steps) * (yMax - yMin);
          const f = x ** 3 + y ** 3 - 3 * x * y;
          if (Math.abs(f - level) < 0.08) {
            if (!moved) { ctx.moveTo(tx(x), ty(y)); moved = true; }
            else ctx.lineTo(tx(x), ty(y));
          }
        }
      }
      ctx.stroke();
    });

    // Axes
    ctx.strokeStyle = CC.textSecondary; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx(xMin), ty(0)); ctx.lineTo(tx(xMax), ty(0));
    ctx.moveTo(tx(0), ty(yMin)); ctx.lineTo(tx(0), ty(yMax));
    ctx.stroke();

    // Critical points
    const cps: [number, number, string, string][] = [
      [0, 0, CC.warning, "鞍点 (0,0)"],
      [1, 1, CC.success, "极小值 (1,1)\nf=-1"],
    ];
    cps.forEach(([x, y, color, label]) => {
      ctx.beginPath(); ctx.arc(tx(x), ty(y), 8, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = color; ctx.font = "bold 11px PingFang SC,sans-serif"; ctx.textAlign = "left";
      label.split("\n").forEach((line, li) => ctx.fillText(line, tx(x) + 12, ty(y) + li * 14));
    });

    // Title
    ctx.fillStyle = CC.textPrimary; ctx.font = "bold 11px PingFang SC,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("f(x,y) = x³+y³−3xy", pad.l + 4, pad.t + 14);
  }, []);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)" }}>
        <InfoBox tone="brand" text="颜色越蓝→函数值越小；越红→越大。等高线显示等值面。" />
        <InfoBox tone="warning" text="⚠ (0,0) 是鞍点（AC−B²<0），非极值点。(1,1) 才是极小值点，f(1,1)=−1。别漏掉 (0,0) 这个驻点！" />
      </div>
    </div>
  );
}

// ─── Dispatch table ──────────────────────────────────────────────────────────
function renderViz(id: number) {
  switch (id) {
    case 1:  return <ExtremaViz />;
    case 2:  return <IntegralViz />;
    case 3:  return <EigenViz />;
    case 4:  return <NormalDistViz />;
    case 6:  return <BinaryTreeViz />;
    case 7:  return <RCCircuitViz />;
    case 8:  return <PendulumViz />;
    case 9:  return <RefractionViz />;
    case 10: return <RelativityViz />;
    default: return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span style={{ fontSize: 40 }}>🔬</span>
        <span className="body-medium" style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}>此题型暂无可视化模拟</span>
      </div>
    );
  }
}

export const VIZ_SUPPORTED_IDS = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10]);

// ─── Modal ───────────────────────────────────────────────────────────────────
export function ExperimentModal({
  questionId,
  topic,
  onClose,
}: {
  questionId: number;
  topic: string;
  onClose: () => void;
}) {
  return (
    /* using raw <div> overlay: no kit Modal/Dialog component */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "var(--color\\/mask\\/color-mask-default)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col w-full sm:w-auto"
        style={{
          width: "min(96vw, 580px)",
          maxHeight: "92vh",
          backgroundColor: "var(--color\\/bg\\/container\\/color-bg-container-default)",
          borderRadius: 16,
          border: "1px solid var(--color\\/border\\/color-border-default)",
          boxShadow: "0 20px 60px rgba(2,4,24,0.16)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color\\/border\\/color-border-default)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🔬</span>
            <span className="title-medium" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>
              实验可视化
            </span>
            <span
              className="mark-small"
              style={{
                color: "var(--color\\/text\\/color-text-brand-default)",
                backgroundColor: "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
                border: "1px solid var(--color\\/border\\/color-border-brand)",
                borderRadius: 5,
                padding: "1px 8px",
              }}
            >
              {topic}
            </span>
          </div>
          {/* using raw <button>: no kit IconButton */}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8,
              color: "var(--color\\/icon\\/color-icon-secondary)", display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 flex-1">
          {renderViz(questionId)}
        </div>
      </div>
    </div>
  );
}
