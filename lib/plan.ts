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

type Segment = (typeof course.segments)[number];

export type SegClock = { start: number; end: number; minutes: number };
export type Meal = "午餐" | "晚餐" | "午晚餐";

export type Stops = {
  restMin: number;
  lunchId: string;
  lunchMin: number;
  dinnerId: string;
  dinnerMin: number;
};

export const DEFAULT_STOPS: Stops = {
  restMin: 8,
  lunchId: "cp2",
  lunchMin: 25,
  dinnerId: "cp5",
  dinnerMin: 25,
};

export type StationKind = "cp" | "support" | "finish";

export type Station = {
  id: string;
  name: string;
  kind: StationKind;
  gpsKm: number;
  gpsSectionKm: number;
  sheetSectionKm: number;
  sheetMinutes: Record<Target, number>;
  blurb: string;
};

export type CpClock = {
  id: string;
  name: string;
  kind: StationKind;
  arrive: number;
  depart: number;
  rest: number;
  meal: Meal | null;
  minutes: number;
  sheetMinutes: number;
  gpsSectionKm: number;
  sheetSectionKm: number;
};

const SHEET_SPLIT: Record<string, { sheetSectionKm: number; minutes: Record<Target, number> }> = {
  cp5: { sheetSectionKm: 4.6, minutes: { "18": 60, "20": 63, "22": 76, "24": 88, "26": 95, "28": 95 } },
  cp6: { sheetSectionKm: 3.6, minutes: { "18": 37, "20": 39, "22": 34, "24": 29, "26": 32, "28": 43 } },
  cp7: { sheetSectionKm: 9.1, minutes: { "18": 95, "20": 102, "22": 116, "24": 130, "26": 146, "28": 164 } },
};

const SUPPORTS: Omit<Station, "gpsSectionKm">[] = [
  {
    id: "fei-ngo",
    name: "飛鵝山觀景台",
    kind: "support",
    gpsKm: 49.28,
    sheetSectionKm: 2.7,
    sheetMinutes: { "18": 36, "20": 37, "22": 44, "24": 52, "26": 55, "28": 55 },
    blurb: "支援點。基維爾之後、大老山一帶，車可以到。",
  },
  {
    id: "golden-toilet",
    name: "金山公廁",
    kind: "support",
    gpsKm: 57.61,
    sheetSectionKm: 2.4,
    sheetMinutes: { "18": 24, "20": 26, "22": 23, "24": 20, "26": 22, "28": 29 },
    blurb: "馬騮山公共洗手間。鷹巢山落大埔公路附近。",
  },
  {
    id: "shing-mun",
    name: "城門水塘",
    kind: "support",
    gpsKm: 62.54,
    sheetSectionKm: 2.9,
    sheetMinutes: { "18": 30, "20": 33, "22": 37, "24": 41, "26": 46, "28": 52 },
    blurb: "4號燒烤場。支援隊可以交熱飯，可以喺呢度食晚餐，食完先上針山。",
  },
];

export function stations(): Station[] {
  const official: Omit<Station, "gpsSectionKm">[] = course.checkpoints.map((cp) => {
    const split = SHEET_SPLIT[cp.id];
    return {
      id: cp.id,
      name: cp.name,
      kind: cp.id === "finish" ? "finish" : "cp",
      gpsKm: cp.gpsKm,
      sheetSectionKm: split?.sheetSectionKm ?? cp.sheetSectionKm,
      sheetMinutes: split?.minutes ?? cp.minutes,
      blurb: cp.blurb,
    };
  });
  const ordered = [...official, ...SUPPORTS].sort((a, b) => a.gpsKm - b.gpsKm);
  let prev = 0;
  return ordered.map((station) => {
    const gpsSectionKm = Math.round((station.gpsKm - prev) * 100) / 100;
    prev = station.gpsKm;
    return { ...station, gpsSectionKm };
  });
}

export function stopFor(station: { id: string; kind: StationKind }, stops: Stops) {
  if (station.kind === "finish") return { minutes: 0, meal: null as Meal | null };
  const lunch = station.id === stops.lunchId;
  const dinner = station.id === stops.dinnerId;
  if (lunch && dinner) {
    return { minutes: Math.max(stops.lunchMin, stops.dinnerMin), meal: "午晚餐" as Meal };
  }
  if (lunch) return { minutes: stops.lunchMin, meal: "午餐" as Meal };
  if (dinner) return { minutes: stops.dinnerMin, meal: "晚餐" as Meal };
  if (station.kind === "support") return { minutes: 0, meal: null as Meal | null };
  return { minutes: stops.restMin, meal: null as Meal | null };
}

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

/** Fastest pace worth asking for, in minutes per kilometre. Slower terrain keeps more time. */
const FASTEST_PACE: Record<string, number> = {
  cp1: 8.8,
  cp2: 9.2,
  cp3: 11.2,
  cp4: 10.2,
  "fei-ngo": 10.5,
  cp5: 9.2,
  "golden-toilet": 10,
  cp6: 11.5,
  "shing-mun": 8,
  cp7: 13,
  cp8: 10,
  cp9: 7.6,
  finish: 8.4,
};

const SEGMENT_FLOOR: Record<Pace, number> = {
  run: 6.5,
  fast: 7.2,
  hike: 9,
  care: 9,
  up: 9.5,
  grind: 14,
};

function segmentMinutes(group: Segment[], budget: number) {
  const locked = new Map<string, number>();
  const weight = (s: Segment) => s.distanceKm * s.effort;
  const floorOf = (s: Segment) => (s.id === "s04" ? 6 : SEGMENT_FLOOR[s.pace as Pace]) * s.distanceKm;

  for (let pass = 0; pass < group.length + 1; pass += 1) {
    const free = group.filter((s) => !locked.has(s.id));
    if (free.length === 0) break;
    const used = [...locked.values()].reduce((sum, mins) => sum + mins, 0);
    const left = budget - used;
    const total = free.reduce((sum, s) => sum + weight(s), 0) || 1;
    const tighten = free.flatMap((s) => {
      const share = (left * weight(s)) / total;
      const floor = floorOf(s);
      return share < floor - 0.05 ? [[s.id, floor] as const] : [];
    });
    if (tighten.length === 0 || left <= 0) {
      for (const s of free) locked.set(s.id, (left * weight(s)) / total);
      break;
    }
    const tightenSum = tighten.reduce((sum, [, mins]) => sum + mins, 0);
    const remaining = free.filter((s) => !tighten.some(([id]) => id === s.id));
    if (remaining.length === 0 && tightenSum > left + 0.5) {
      for (const s of free) locked.set(s.id, (left * weight(s)) / total);
      break;
    }
    for (const [id, mins] of tighten) locked.set(id, mins);
  }

  const sum = [...locked.values()].reduce((total, mins) => total + mins, 0);
  if (sum > budget + 0.2) {
    const scale = budget / sum;
    for (const [id, mins] of locked) locked.set(id, mins * scale);
  }
  return locked;
}

function rangeWeight(fromKm: number, toKm: number) {
  return course.segments.reduce((sum, segment) => {
    const overlap = Math.min(segment.toKm, toKm) - Math.max(segment.fromKm, fromKm);
    return overlap > 0 ? sum + overlap * segment.effort : sum;
  }, 0);
}

function restTotal(stops: Stops) {
  return stations().reduce((sum, station) => sum + stopFor(station, stops).minutes, 0);
}

/** Moving minutes per checkpoint. Rest is already removed from the target, and no section is asked to go faster than FASTEST_PACE unless the budget cannot hold. */
export function movingMinutes(target: Target, stops: Stops) {
  const budget = Math.max(60, Number(target) * 60 - restTotal(stops));
  const list = stations();
  const weights = new Map<string, number>();
  let prevKm = 0;
  for (const station of list) {
    weights.set(station.id, rangeWeight(prevKm, station.gpsKm));
    prevKm = station.gpsKm;
  }
  const locked = new Map<string, number>();

  for (let pass = 0; pass < list.length + 1; pass += 1) {
    const free = list.filter((station) => !locked.has(station.id));
    if (free.length === 0) break;
    const used = [...locked.values()].reduce((sum, mins) => sum + mins, 0);
    const left = budget - used;
    const weight = free.reduce((sum, station) => sum + (weights.get(station.id) ?? 0), 0) || 1;
    const tighten = free.flatMap((station) => {
      const share = (left * (weights.get(station.id) ?? 0)) / weight;
      const floor = FASTEST_PACE[station.id] * station.gpsSectionKm;
      return share < floor - 0.05 ? [[station.id, floor] as const] : [];
    });
    if (tighten.length === 0 || left <= 0) {
      for (const station of free) {
        locked.set(station.id, (left * (weights.get(station.id) ?? 0)) / weight);
      }
      break;
    }
    const tightenSum = tighten.reduce((sum, [, mins]) => sum + mins, 0);
    const remaining = free.filter((station) => !tighten.some(([id]) => id === station.id));
    if (remaining.length === 0 && tightenSum > left + 0.5) {
      for (const station of free) {
        locked.set(station.id, (left * (weights.get(station.id) ?? 0)) / weight);
      }
      break;
    }
    for (const [id, mins] of tighten) locked.set(id, mins);
  }

  const sum = [...locked.values()].reduce((total, mins) => total + mins, 0);
  if (sum > budget + 0.5) {
    const scale = budget / sum;
    for (const [id, mins] of locked) locked.set(id, mins * scale);
  }
  return locked;
}

export function buildPlan(target: Target, startHHMM: string, stops: Stops = DEFAULT_STOPS) {
  const start = parseStart(startHHMM);
  let cursor = start;
  const seg = new Map<string, SegClock>();
  const cps: CpClock[] = [];
  let moving = 0;
  let rest = 0;
  const allocated = movingMinutes(target, stops);
  let prevKm = 0;

  for (const station of stations()) {
    const minutes = allocated.get(station.id) ?? 0;
    const group = course.segments.filter((segment) => {
      const mid = (segment.fromKm + segment.toKm) / 2;
      return mid > prevKm && mid <= station.gpsKm + 0.001;
    });
    const slices = segmentMinutes(group, minutes);
    for (const segment of group) {
      const slice = slices.get(segment.id) ?? 0;
      const from = cursor;
      cursor += slice;
      seg.set(segment.id, { start: from, end: cursor, minutes: slice });
    }
    prevKm = station.gpsKm;
    moving += minutes;
    const stop = stopFor(station, stops);
    const arrive = cursor;
    cursor += stop.minutes;
    rest += stop.minutes;
    cps.push({
      id: station.id,
      name: station.name,
      kind: station.kind,
      arrive,
      depart: cursor,
      rest: stop.minutes,
      meal: stop.meal,
      minutes,
      sheetMinutes: station.sheetMinutes[target],
      gpsSectionKm: station.gpsSectionKm,
      sheetSectionKm: station.sheetSectionKm,
    });
  }

  return { start, seg, cps, finish: cursor, total: cursor - start, moving, rest };
}

export function kmAtClock(
  plan: ReturnType<typeof buildPlan>,
  clock: number,
): number | null {
  if (clock <= plan.start) return 0;
  if (clock >= plan.finish) return course.stats.distanceKm;
  let prevKm = 0;
  for (const s of course.segments) {
    const t = plan.seg.get(s.id);
    if (!t) continue;
    if (clock < t.start) return prevKm;
    if (clock <= t.end) {
      const p = t.end === t.start ? 1 : (clock - t.start) / (t.end - t.start);
      return s.fromKm + p * (s.toKm - s.fromKm);
    }
    prevKm = s.toKm;
  }
  return prevKm;
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
