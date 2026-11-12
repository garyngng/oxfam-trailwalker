"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  courseData,
  PACE_COLOR,
  type Pace,
} from "@/lib/plan";

const W = 1000;
const H = 248;
const PAD_L = 38;
const PAD_R = 14;
const PAD_T = 36;
const PAD_B = 32;

function xOf(km: number) {
  return PAD_L + (km / courseData.stats.distanceKm) * (W - PAD_L - PAD_R);
}
function yOf(ele: number) {
  const maxE = 980;
  return PAD_T + (1 - ele / maxE) * (H - PAD_T - PAD_B);
}

export function ProfileChart({
  activeId,
  nightKm,
  onPick,
}: {
  activeId: string | null;
  nightKm: number | null;
  onPick: (id: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const points = courseData.profile;

  const paths = useMemo(() => {
    return courseData.segments.map((seg) => {
      const slice = points.filter((p) => p[0] >= seg.fromKm - 0.05 && p[0] <= seg.toKm + 0.05);
      const d = slice
        .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`)
        .join(" ");
      return { id: seg.id, d, pace: seg.pace as Pace, from: seg.fromKm, to: seg.toKm };
    });
  }, [points]);

  const area = useMemo(() => {
    if (points.length < 2) return "";
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`)
      .join(" ");
    const base = yOf(0);
    return `${line} L${xOf(points[points.length - 1][0]).toFixed(1)},${base} L${xOf(points[0][0]).toFixed(1)},${base} Z`;
  }, [points]);

  function kmFromEvent(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const km = ((px - PAD_L) / (W - PAD_L - PAD_R)) * courseData.stats.distanceKm;
    return Math.min(courseData.stats.distanceKm, Math.max(0, km));
  }

  function segmentAt(km: number) {
    return (
      courseData.segments.find((s) => km >= s.fromKm && km <= s.toKm + 0.001) ??
      courseData.segments[courseData.segments.length - 1]
    );
  }

  const hoverSeg = hover == null ? null : segmentAt(hover);
  const hoverEle =
    hover == null
      ? null
      : points.reduce((best, p) =>
          Math.abs(p[0] - hover) < Math.abs(best[0] - hover) ? p : best,
        );

  const labels: { id: string; name: string; km: number; y: number }[] = [];
  let lastX = -999;
  let level = 0;
  for (const cp of courseData.checkpoints) {
    const x = xOf(cp.gpsKm);
    if (x - lastX < 42) level = level === 0 ? 1 : 0;
    else level = 0;
    lastX = x;
    labels.push({ id: cp.id, name: cp.name, km: cp.gpsKm, y: 12 + level * 12 });
  }

  return (
    <div
      className="chart-region rounded-2xl bg-[#132e24] p-3 text-[#f6f1e6] shadow-[0_18px_50px_-28px_rgba(19,46,36,0.8)]"
      tabIndex={0}
      role="region"
      aria-labelledby="profile-heading"
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h2 id="profile-heading" className="font-serif text-lg">
            高度
          </h2>
          <p className="text-xs text-[#d5cbb8]">
            撳線可以睇嗰截。顏色係路況，唔係海拔。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[#d5cbb8]">
          {(
            [
              ["可跑", PACE_COLOR.run],
              ["上山", PACE_COLOR.grind],
              ["落山", PACE_COLOR.care],
              ["行", PACE_COLOR.hike],
            ] as const
          ).map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto min-w-[720px] w-full touch-pan-x"
        role="img"
        aria-labelledby="profile-heading"
        onMouseMove={(e) => setHover(kmFromEvent(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const km = kmFromEvent(e);
          setHover(km);
          onPick(segmentAt(km).id);
        }}
      >
        {[0, 200, 400, 600, 800].map((ele) => (
          <g key={ele}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yOf(ele)}
              y2={yOf(ele)}
              stroke="rgba(246,241,230,0.12)"
            />
            <text x={4} y={yOf(ele) + 4} fill="#d5cbb8" fontSize="11">
              {ele}
            </text>
          </g>
        ))}
        {nightKm != null && nightKm < courseData.stats.distanceKm && (
          <rect
            x={xOf(nightKm)}
            y={PAD_T}
            width={Math.max(0, xOf(courseData.stats.distanceKm) - xOf(nightKm))}
            height={H - PAD_T - PAD_B}
            fill="rgba(36,48,86,0.45)"
          />
        )}
        <path d={area} fill="rgba(232,214,176,0.16)" />
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            stroke={PACE_COLOR[p.pace]}
            strokeWidth={activeId === p.id ? 4.5 : 2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={activeId && activeId !== p.id ? 0.45 : 1}
          />
        ))}
        {courseData.checkpoints.map((cp) => (
          <circle key={cp.id} cx={xOf(cp.gpsKm)} cy={yOf(cp.ele)} r="3.5" fill="#f6f1e6" />
        ))}
        {labels.map((cp) => (
          <text
            key={cp.id}
            x={xOf(cp.km)}
            y={cp.y}
            textAnchor="middle"
            fill="#f6f1e6"
            fontSize="11"
          >
            {cp.name}
          </text>
        ))}
        {[0, 20, 40, 60, 80, 100].map((km) => (
          <text
            key={km}
            x={xOf(km)}
            y={H - 16}
            textAnchor="middle"
            fill="#b7ad9b"
            fontSize="10"
          >
            {km}
          </text>
        ))}
        {hover != null && hoverEle && (
          <g>
            <line
              x1={xOf(hover)}
              x2={xOf(hover)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="#f6f1e6"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <circle cx={xOf(hover)} cy={yOf(hoverEle[1])} r="4" fill="#f3c56b" />
          </g>
        )}
      </svg>
      <p className="min-h-5 px-1 text-xs text-[#f3c56b]">
        {hover != null && hoverSeg && hoverEle
          ? `${hover.toFixed(1)} 公里 · ${hoverSeg.name} · 約 ${hoverEle[1]} 米`
          : nightKm != null
            ? "藍影係你而家呢個起步同目標會入黑之後嘅路。"
            : "全日都仲有光。"}
      </p>
    </div>
  );
}
