import { useState, useMemo } from "react";
import { motion } from "framer-motion";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

export type DonutProps = {
  value?: number;
  color?: string;
  size?: number;
  thickness?: number;
  label?: string;
  sub?: string;
  segments?: DonutSegment[];
  thresholds?: number[];
  activeLabel?: string | null;
  onActiveChange?: (label: string | null) => void;
  padAngle?: number;
  className?: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

function describeArcSegment(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`;
}

/**
 * Modern, high-performance SVG Donut Chart.
 * Uses exact geometric arc paths (not fragile strokeDasharray hacks),
 * ensuring 100% completion across all devices, zero render lag,
 * and fluid touch/hover interactivity on desktop and mobile.
 */
export function Donut({
  value,
  color = "#22D3EE",
  size = 132,
  thickness = 14,
  label,
  sub,
  segments,
  thresholds,
  activeLabel,
  onActiveChange,
  padAngle = 0.024,
  className = "",
}: DonutProps) {
  const [internalHover, setInternalHover] = useState<string | null>(null);
  const effectiveActive = activeLabel !== undefined ? activeLabel : internalHover;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2;
  const rInner = Math.max(0, rOuter - thickness);
  const rMid = (rOuter + rInner) / 2;
  const circumference = 2 * Math.PI * rMid;

  // Process multi-segment paths with exact math
  const computedSegments = useMemo(() => {
    if (!segments || segments.length === 0) return [];
    const valid = segments.filter((s) => s.value > 0);
    const total = valid.reduce((a, s) => a + s.value, 0);
    if (total <= 0) return [];

    const numSegs = valid.length;
    const effectivePad = numSegs > 1 ? padAngle : 0;
    let currentAngle = 0;

    return valid.map((s) => {
      const frac = s.value / total;
      const angleSpan = frac * 2 * Math.PI;
      const start = currentAngle + effectivePad / 2;
      const end = currentAngle + angleSpan - effectivePad / 2;
      const midAngle = currentAngle + angleSpan / 2;
      currentAngle += angleSpan;

      let d: string;
      if (numSegs === 1) {
        const mid = Math.PI;
        d =
          describeArcSegment(cx, cy, rOuter, rInner, 0, mid) +
          " " +
          describeArcSegment(cx, cy, rOuter, rInner, mid, 2 * Math.PI - 0.0001);
      } else {
        d = describeArcSegment(cx, cy, rOuter, rInner, start, Math.max(start + 0.001, end));
      }

      // Outward pop offset on hover/active
      const popDist = Math.min(6, size * 0.025);
      const dx = Math.sin(midAngle) * popDist;
      const dy = -Math.cos(midAngle) * popDist;

      return {
        ...s,
        d,
        frac,
        pct: Math.round(frac * 100),
        midAngle,
        dx,
        dy,
      };
    });
  }, [segments, size, thickness, padAngle, cx, cy, rOuter, rInner]);

  const activeSegmentData = useMemo(() => {
    if (!effectiveActive || !computedSegments.length) return null;
    return computedSegments.find((s) => s.label === effectiveActive) ?? null;
  }, [effectiveActive, computedSegments]);

  const handleSelect = (segLabel: string) => {
    const next = effectiveActive === segLabel ? null : segLabel;
    if (onActiveChange) {
      onActiveChange(next);
    } else {
      setInternalHover(next);
    }
  };

  const hasSegments = computedSegments.length > 0;
  const isMini = size < 64;

  return (
    <div
      className={`relative inline-grid place-items-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? (value !== undefined ? `${value}%` : "Donut chart")}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={rMid}
          fill="none"
          strokeWidth={thickness}
          className="stroke-surface2/70"
        />

        {hasSegments ? (
          /* Multi-Segment Arc Paths */
          <g>
            {computedSegments.map((s) => {
              const isActive = effectiveActive === s.label;
              return (
                <path
                  key={s.label}
                  d={s.d}
                  fill={s.color}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    transform: isActive ? `translate(${s.dx.toFixed(2)}px, ${s.dy.toFixed(2)}px)` : "none",
                    filter: isActive
                      ? `drop-shadow(0 0 8px ${s.color}99) brightness(1.15)`
                      : "none",
                    opacity: effectiveActive && !isActive ? 0.45 : 1,
                  }}
                  onMouseEnter={() => {
                    if (onActiveChange) onActiveChange(s.label);
                    else setInternalHover(s.label);
                  }}
                  onMouseLeave={() => {
                    if (onActiveChange) onActiveChange(null);
                    else setInternalHover(null);
                  }}
                  onClick={() => handleSelect(s.label)}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleSelect(s.label);
                  }}
                />
              );
            })}
          </g>
        ) : (
          /* Single-value progress meter */
          <>
            <motion.circle
              cx={cx}
              cy={cy}
              r={rMid}
              fill="none"
              stroke={color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset:
                  circumference - (Math.max(0, Math.min(100, value ?? 0)) / 100) * circumference,
              }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
              }}
            />
          </>
        )}

        {/* Threshold ticks for policy lines (e.g. 70%, 85%) */}
        {thresholds?.map((t) => {
          const a = (t / 100) * 2 * Math.PI;
          const pInner = polarToCartesian(cx, cy, rInner - 1, a);
          const pOuter = polarToCartesian(cx, cy, rOuter + 1, a);
          return (
            <line
              key={t}
              x1={pInner.x}
              y1={pInner.y}
              x2={pOuter.x}
              y2={pOuter.y}
              className="stroke-ink/60"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Threshold numeric badges */}
      {thresholds?.map((t) => {
        const a = (t / 100) * 2 * Math.PI;
        const pos = polarToCartesian(cx, cy, rOuter + 10, a);
        return (
          <span
            key={t}
            className="pointer-events-none absolute font-mono text-[9px] font-semibold leading-none text-faint"
            style={{
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            {t}
          </span>
        );
      })}

      {/* Dynamic Center Content (hidden on mini donuts) */}
      {!isMini && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
          {activeSegmentData ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
              <span
                className="font-display font-black leading-none"
                style={{
                  fontSize: size >= 160 ? "1.875rem" : size >= 100 ? "1.25rem" : "1rem",
                  color: activeSegmentData.color,
                }}
              >
                {activeSegmentData.value}%
              </span>
              <span
                className="mt-1 max-w-[85%] truncate font-sans font-semibold leading-tight text-ink/90"
                style={{
                  fontSize: size >= 160 ? "12px" : "10px",
                }}
              >
                {activeSegmentData.label}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in duration-200">
              {label && (
                <span
                  className="font-display font-extrabold leading-none text-ink"
                  style={{
                    fontSize: size >= 160 ? "1.875rem" : size >= 100 ? "1.25rem" : "1rem",
                    color: value !== undefined ? color : undefined,
                  }}
                >
                  {label}
                </span>
              )}
              {sub && (
                <span
                  className="mt-1 font-sans font-bold uppercase tracking-wider text-dim"
                  style={{
                    fontSize: size >= 160 ? "11px" : "9px",
                  }}
                >
                  {sub}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
