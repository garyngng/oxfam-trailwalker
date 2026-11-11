import course from "@/data/course.json";

export const courseData = course;

export type Target = "18" | "20" | "22" | "24" | "26" | "28";
export const TARGETS: Target[] = ["18", "20", "22", "24", "26", "28"];

export type Pace = "run" | "fast" | "hike" | "grind" | "care" | "up";

export const PACE_LABEL: Record<Pace, string> = {
  run: "可跑",
  fast: "可快行",
  hike: "行",
  grind: "慢慢爬",
  care: "小心落",
  up: "上斜行",
};

export const PACE_COLOR: Record<Pace, string> = {
  run: "#2f7d4a",
  fast: "#3e8f55",
  hike: "#8a6a32",
  grind: "#b5522a",
  care: "#1f6f86",
  up: "#c46a32",
};

type Checkpoint = (typeof course.checkpoints)[number];
type Segment = (typeof course.segments)[number];

export type SegClock = { start: number; end: number; minutes: number };
export type CpClock = {
  id: string;
  name: string;
  arrive: number;
  minutes: number;
  gpsSectionKm: number;
  sheetSectionKm: number;
};

export function parseStart(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatClock(absMin: number) {
  let day = Math.floor(absMin / 1440);
  const m = absMin - day * 1440;
  let hh = Math.floor(m / 60);
  let mm = Math.round(m - hh * 60);
  if (mm === 60) {
    hh += 1;
    mm = 0;
  }
  if (hh >= 24) {
    day += Math.floor(hh / 24);
    hh = hh % 24;
  }
  const label = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return day > 0 ? `${label} (+${day})` : label;
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins - h * 60);
  if (h <= 0) return `${m} 分鐘`;
  if (m === 0) return `${h} 小時`;
  return `${h} 小時 ${m} 分`;
}

export type Light = "day" | "dusk" | "night";

export function lightOf(absMin: number): Light {
  const m = ((absMin % 1440) + 1440) % 1440;
  if (m >= 17 * 60 + 40 || m < 6 * 60 + 35) return "night";
  if (m >= 17 * 60 + 10) return "dusk";
  return "day";
}

export const LIGHT_LABEL: Record<Light, string> = {
  day: "日光",
  dusk: "黃昏",
  night: "入黑",
};

function sectionMinutes(cp: Checkpoint, target: Target, stretchFinish: boolean) {
  const sheet = cp.minutes[target];
  if (stretchFinish && cp.id === "finish") {
    return (sheet / cp.sheetSectionKm) * cp.gpsSectionKm;
  }
  return sheet;
}

export function buildPlan(target: Target, startHHMM: string, stretchFinish: boolean) {
  const start = parseStart(startHHMM);
  let cursor = start;
  const seg = new Map<string, SegClock>();
  const cps: CpClock[] = [];

  for (const cp of course.checkpoints) {
    const minutes = sectionMinutes(cp, target, stretchFinish);
    const group = course.segments.filter((s) => s.cp === cp.id);
    const weights = group.map((s) => s.distanceKm * s.effort);
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    group.forEach((s, i) => {
      const slice = (minutes * weights[i]) / sum;
      const from = cursor;
      cursor += slice;
      seg.set(s.id, { start: from, end: cursor, minutes: slice });
    });
    cps.push({
      id: cp.id,
      name: cp.name,
      arrive: cursor,
      minutes,
      gpsSectionKm: cp.gpsSectionKm,
      sheetSectionKm: cp.sheetSectionKm,
    });
  }

  return { start, seg, cps, finish: cursor, total: cursor - start };
}

export function kmAtClock(
  plan: ReturnType<typeof buildPlan>,
  clock: number,
): number | null {
  if (clock <= plan.start) return 0;
  if (clock >= plan.finish) return course.stats.distanceKm;
  for (const s of course.segments) {
    const t = plan.seg.get(s.id);
    if (!t) continue;
    if (clock >= t.start && clock <= t.end) {
      const p = t.end === t.start ? 1 : (clock - t.start) / (t.end - t.start);
      return s.fromKm + p * (s.toKm - s.fromKm);
    }
  }
  return null;
}

export function segmentById(id: string) {
  return course.segments.find((s) => s.id === id);
}

export function segmentsFor(cpId: string) {
  return course.segments.filter((s) => s.cp === cpId);
}

export type Filter = "all" | "run" | "climb" | "down" | "supply";

export function matches(seg: Segment, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "run") return seg.pace === "run" || seg.pace === "fast";
  if (filter === "climb") return seg.pace === "grind" || seg.pace === "up";
  if (filter === "down") return seg.pace === "care" || seg.loss > seg.gain + 40;
  return seg.facilities.length > 0;
}

export function kmAdvice(grade: number, pace: Pace, surface: string) {
  const soft = /沙|倒沙/.test(surface);
  if (soft) {
    if (grade > 8) return { word: "倒沙石上", run: false };
    if (grade < -8) return { word: "倒沙石落", run: false };
    return { word: "沙地，行", run: false };
  }
  if (/石級/.test(surface) && grade > 6) return { word: "石級上", run: false };
  if (/石級/.test(surface) && grade < -6) return { word: "石級落", run: false };
  if (grade > 12) return { word: "急上", run: false };
  if (grade > 6) return { word: "上斜", run: false };
  if (grade > 3) return { word: pace === "run" ? "緩上，可跑" : "緩上", run: pace === "run" };
  if (grade < -15) return { word: "急落", run: false };
  if (grade < -8) {
    return {
      word: pace === "run" || pace === "fast" ? "落斜，可快行" : "落斜",
      run: false,
    };
  }
  if (grade < -3) {
    return {
      word: pace === "run" ? "緩落，可跑" : "緩落",
      run: pace === "run",
    };
  }
  if (pace === "run") return { word: "平，可跑", run: true };
  if (pace === "fast") return { word: "平，可快行", run: true };
  return { word: "平路行", run: false };
}
