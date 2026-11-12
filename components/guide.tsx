"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChoiceSet } from "@/components/choice-set";
import { CourseTabs } from "@/components/course-tabs";
import { DataTable } from "@/components/data-table";
import { ProfileChart } from "@/components/profile-chart";
import {
  buildPlan,
  courseData,
  DEFAULT_STOPS,
  formatClock,
  formatDuration,
  kmAdvice,
  kmAtClock,
  LIGHT_LABEL,
  lightOf,
  matches,
  PACE_COLOR,
  PACE_LABEL,
  segmentById,
  segmentsFor,
  stations,
  TARGETS,
  type Filter,
  type Pace,
  type Stops,
  type Target,
} from "@/lib/plan";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "run", label: "可跑／快行" },
  { id: "climb", label: "上山" },
  { id: "down", label: "落山" },
  { id: "supply", label: "有補給" },
];

export function Guide() {
  const [target, setTarget] = useState<Target>("18");
  const [start, setStart] = useState("08:00");
  const [stops, setStops] = useState<Stops>(DEFAULT_STOPS);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState<string | null>("s04");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const plan = useMemo(
    () => buildPlan(target, start, stops),
    [target, start, stops],
  );

  const sunsetKm = kmAtClock(plan, Math.floor(plan.start / 1440) * 1440 + 17 * 60 + 40);
  const nightKm = sunsetKm != null && lightOf(plan.start) === "night" ? 0 : sunsetKm;

  const active = activeId ? segmentById(activeId) : undefined;
  const activeClock = activeId ? plan.seg.get(activeId) : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && active) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, active]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;
    const outside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };
    let pressedOutside = false;
    const onDown = (event: PointerEvent) => {
      pressedOutside = outside(event);
    };
    const onUp = (event: PointerEvent) => {
      if (pressedOutside && outside(event)) dialog.close();
    };
    dialog.addEventListener("pointerdown", onDown);
    dialog.addEventListener("pointerup", onUp);
    return () => {
      dialog.removeEventListener("pointerdown", onDown);
      dialog.removeEventListener("pointerup", onUp);
    };
  }, []);

  function openSeg(id: string) {
    setActiveId(id);
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      <a className="skip-link" href="#planner">
        跳到行程
      </a>
      <header className="overflow-hidden rounded-[28px] bg-[#132e24] text-[#f6f1e6] shadow-[0_24px_60px_-36px_rgba(19,46,36,0.9)]">
        <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#e2c27a]">OXFAM TRAILWALKER 2026</p>
            <h1 className="font-serif mt-2 text-4xl leading-tight sm:text-5xl">全段分析</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#e7dece] sm:text-base">
              北潭涌去屯門哈羅，{courseData.stats.distanceKm} 公里，上落大約各{" "}
              {courseData.stats.gain.toLocaleString("zh-HK")} 米。下面按小段講幾時上、幾時落、邊度可以跑。
            </p>
            <p className="mt-4 text-sm leading-6 text-[#f3c56b]">{courseData.distanceNote}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 self-end text-sm">
            <Stat k="檢查站" v="9 個 + 終點" />
            <Stat k="小段" v={`${courseData.segments.length} 段`} />
            <Stat k="限時" v="48 小時" />
            <Stat k="比賽日" v="11月20–22日" />
          </dl>
        </div>
      </header>

      <main>
      <section className="mt-6 grid gap-4 rounded-3xl border border-[#d9d0c0] bg-[#f7f3ea]/90 p-4 sm:p-5">
        <h2 id="planner" tabIndex={-1} className="font-serif text-2xl">
          行程
        </h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <ChoiceSet
            legend="目標時間"
            name="target"
            value={target}
            onChange={setTarget}
            options={TARGETS.map((t) => ({ value: t, label: `${t} 小時` }))}
          />
          <ChoiceSet
            legend="起步，2026 四個時段"
            name="start"
            value={start}
            onChange={setStart}
            options={courseData.meta.starts.map((s) => ({ value: s, label: s }))}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-[#e6dccb] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#3c463f]">
            完成{" "}
            <span className="font-serif text-xl text-[#1e4636]">{formatClock(plan.finish)}</span>
            <span className="text-[#5c564c]">
              {" "}
              · 行路 {formatDuration(plan.moving)}，休息 {formatDuration(plan.rest)}
            </span>
          </p>
        </div>
        <p className="text-xs leading-5 text-[#5c564c]">
          {target} 小時已經包埋每站休息、午餐同晚餐，所以行路只得 {formatDuration(plan.moving)}。
          你張表嘅 {target} 小時係純行路，而家每段都要快一截。尾段用真實約 13 公里計，唔再用表上 6.9 公里。
          平路同長落斜要碎步，山先可以維持而家呢個速度。
        </p>
        <div className="grid gap-4 border-t border-[#e6dccb] pt-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#5c564c]">
              每站休息，上廁所、入水。坐太耐，腳會硬
            </p>
            <ChoiceSet
              legend="每站休息分鐘"
              name="rest"
              value={String(stops.restMin)}
              onChange={(mins) => setStops((s) => ({ ...s, restMin: Number(mins) }))}
              options={[5, 8, 10, 15].map((mins) => ({ value: String(mins), label: `${mins} 分鐘` }))}
            />
          </div>
          <MealPick
            label="午餐"
            hint="預設北潭坳。大約中午到，有路，支援隊交到熱飯。想爬完雞公山先食，改企嶺下。"
            stationId={stops.lunchId}
            minutes={stops.lunchMin}
            onStation={(lunchId) => setStops((s) => ({ ...s, lunchId }))}
            onMinutes={(lunchMin) => setStops((s) => ({ ...s, lunchMin }))}
          />
          <MealPick
            label="晚餐"
            hint="預設畢架山，大約日落食完就入黑。可以改城門水塘4號燒烤，支援隊交到熱飯，食完先上針山。"
            stationId={stops.dinnerId}
            minutes={stops.dinnerMin}
            choices={dinnerChoices()}
            onStation={(dinnerId) => setStops((s) => ({ ...s, dinnerId }))}
            onMinutes={(dinnerMin) => setStops((s) => ({ ...s, dinnerMin }))}
          />
          <p className="text-xs leading-5 text-[#5c564c]">
            食飯嗰站嘅分鐘已經包括上廁所。檢查站先有每站休息；飛鵝山、金山公廁同城門行過唔停，除非你揀咗喺城門食晚餐。時間由最後一個入站計。
          </p>
        </div>
      </section>

      <ol role="list" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {plan.cps.map((cp) => {
          const light = lightOf(cp.arrive);
          const pace = cp.minutes / cp.gpsSectionKm;
          const off = Math.abs(cp.sheetSectionKm - cp.gpsSectionKm) >= 1.5;
          return (
            <li
              key={cp.id}
              className={`rounded-2xl border px-3 py-2 ${cp.kind === "support" ? "border-[#e2c27a] bg-[#fbf6ea]" : "border-[#d9d0c0] bg-[#f7f3ea]"}`}
            >
              <p className="text-xs text-[#5c564c]">
                {cp.kind === "support" ? "支援" : cp.kind === "finish" ? "終點" : cp.id.toUpperCase()}
              </p>
              <p className="font-serif text-lg leading-tight">{cp.name}</p>
              <p className="text-sm tabular-nums">到 {formatClock(cp.arrive)}</p>
              {cp.rest > 0 && (
                <p className="text-xs text-[#8a3d22]">
                  {cp.meal ?? "休息"} {cp.rest} 分鐘，{formatClock(cp.depart)} 走
                </p>
              )}
              <p className="text-xs text-[#5c564c]">
                {LIGHT_LABEL[light]} · 行 {Math.round(cp.minutes)} 分（表上 {cp.sheetMinutes}）· {pace.toFixed(1)} 分/公里
                {pace < 8 ? " · 要碎步" : ""}
                {off ? " · 里數同表唔同" : ""}
              </p>
            </li>
          );
        })}
      </ol>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-[#d9d0c0] bg-[#f7f3ea] p-4 sm:p-5">
          <h2 className="font-serif text-2xl">邊度可以跑</h2>
          <ul role="list" className="mt-3 space-y-3">
            {courseData.runnable.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  className="w-full rounded-2xl bg-[#e7efe8] px-3 py-3 text-left hover:bg-[#dce8de]"
                  onClick={() => openSeg(item.segmentId)}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs tabular-nums text-[#1e4636]">{item.km} 公里</span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#3c463f]">{item.how}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-[#ead8c8] bg-[#fbf4ee] p-4 sm:p-5">
          <h2 className="font-serif text-2xl text-[#8a3d22]">唔好跑</h2>
          <ul role="list" className="mt-3 space-y-2 text-sm leading-6">
            {courseData.noRun.map((item) => (
              <li key={item} className="border-b border-[#ead8c8] pb-2 last:border-0">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-[#5c564c]">
            樓梯級數係朋友操練手記數嘅，唔係官方測量。沙灘同倒沙石跑完只會更慢。
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-serif text-2xl">邊個位</h2>
          <p className="text-xs text-[#5c564c]">撳個名去嗰段</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {courseData.landmarks.map((mark) => (
            <button
              key={mark.name}
              type="button"
              onClick={() => openSeg(mark.segmentId)}
              className="rounded-full border border-[#d9d0c0] bg-[#f7f3ea] px-3 py-1.5 text-left text-sm hover:border-[#1e4636]"
            >
              <span className="font-medium">{mark.name}</span>
              <span className="ml-2 tabular-nums text-[#5c564c]">{mark.km}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <ProfileChart
          activeId={activeId}
          nightKm={nightKm}
          onPick={openSeg}
        />
        <p className="mt-2 text-xs leading-5 text-[#5c564c]">{courseData.climbNote}</p>
      </div>

      <CourseTabs
        panels={{
          segments: (
            <>
          <ChoiceSet
            legend="篩選小段"
            name="segment-filter"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f.id, label: f.label }))}
          />
          <div className="space-y-6">
            {courseData.checkpoints.map((cp, index) => {
              const rows = segmentsFor(cp.id).filter((s) => matches(s, filter));
              if (rows.length === 0) return null;
              const clock = plan.cps.find((c) => c.id === cp.id);
              return (
                <section key={cp.id} className={index > 0 ? "defer" : undefined}>
                  <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-xl">
                      {cp.id === "finish" ? "終點" : cp.id.toUpperCase()} {cp.name}
                    </h3>
                    <p className="text-xs text-[#5c564c]">
                      GPX {cp.gpsSectionKm} 公里
                      {Math.abs(cp.gpsSectionKm - cp.sheetSectionKm) >= 1.5
                        ? ` · 表上寫 ${cp.sheetSectionKm}`
                        : ""}
                      {clock
                        ? ` · 行 ${Math.round(clock.minutes)} 分（表上 ${clock.sheetMinutes}）· 到 ${formatClock(clock.arrive)}${clock.rest > 0 ? `，${clock.meal ?? "休息"} ${clock.rest} 分鐘` : ""}`
                        : ""}
                    </p>
                  </header>
                  <ul role="list" className="space-y-2">
                    {rows.map((seg) => {
                      const t = plan.seg.get(seg.id);
                      const pace = seg.pace as Pace;
                      const when = t ? lightOf((t.start + t.end) / 2) : "day";
                      return (
                        <li key={seg.id}>
                          <button
                            type="button"
                            onClick={() => openSeg(seg.id)}
                            className="grid w-full grid-cols-[4.5rem_1fr] gap-3 rounded-2xl border border-[#d9d0c0] bg-[#f7f3ea] px-3 py-3 text-left hover:border-[#1e4636] sm:grid-cols-[6rem_1fr_auto]"
                          >
                            <span className="tabular-nums text-xs leading-5 text-[#5c564c]">
                              {seg.fromKm.toFixed(1)}
                              <br />
                              {seg.toKm.toFixed(1)} 公里
                            </span>
                            <span>
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{seg.name}</span>
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: PACE_COLOR[pace],
                                    color: PACE_COLOR[pace],
                                  }}
                                >
                                  {PACE_LABEL[pace]}
                                </Badge>
                                {when !== "day" && (
                                  <Badge variant="secondary">{LIGHT_LABEL[when]}</Badge>
                                )}
                              </span>
                              <span className="mt-1 block text-sm leading-6 text-[#3c463f]">
                                {seg.note}
                              </span>
                            </span>
                            <span className="col-start-2 text-xs text-[#5c564c] sm:col-start-auto sm:text-right">
                              {t ? `${formatClock(t.start)} – ${formatClock(t.end)}` : ""}
                              <br />+{seg.gain} / −{seg.loss} 米
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
          ),
          km: (
          <DataTable
            caption="每一公里路況"
            headers={["公里", "海拔", "升 / 降", "路況", "屬於"]}
            rows={courseData.kms.map((row) => {
              const seg = row.segmentId ? segmentById(row.segmentId) : undefined;
              const advice = seg
                ? kmAdvice(row.grade, seg.pace as Pace, seg.surface)
                : { word: "—", run: false };
              return {
                key: String(row.km),
                cells: [
                  `${row.km}–${row.toKm}`,
                  `${row.eleStart} → ${row.eleEnd}`,
                  `+${row.gain} / −${row.loss}`,
                  <span key="advice" style={{ color: advice.run ? PACE_COLOR.run : undefined }}>
                    {advice.word}
                  </span>,
                  seg ? (
                    <button
                      key="seg"
                      type="button"
                      className="underline decoration-[#d9d0c0] underline-offset-4 hover:decoration-[#1e4636]"
                      onClick={() => openSeg(seg.id)}
                    >
                      {seg.name}
                    </button>
                  ) : (
                    "—"
                  ),
                ],
              };
            })}
          />
          ),
          sheet: (
            <>
          <p className="mb-3 text-sm leading-6 text-[#3c463f]">
            呢張係你原來嘅表，未扣休息。上面嘅到站鐘先係追 {target} 小時、包埋食飯之後嘅時間。
          </p>
          <DataTable
            caption="原表時間，未扣休息"
            headers={["站", "表上 / GPX", ...TARGETS.map((t) => `${t}h`)]}
            rows={stations().map((cp) => {
              const off = Math.abs(cp.sheetSectionKm - cp.gpsSectionKm) >= 1.5;
              return {
                key: cp.id,
                className: cp.kind === "support" ? "is-support" : undefined,
                cells: [
                  <span key="name">
                    <span className="block font-medium">{cp.name}</span>
                    <span className="block text-xs text-[#5c564c]">{cp.blurb}</span>
                  </span>,
                  <span key="km" className={off ? "text-[#8a3d22]" : undefined}>
                    {cp.sheetSectionKm} / {cp.gpsSectionKm} 公里
                  </span>,
                  ...TARGETS.map((t) => {
                    const mins = cp.sheetMinutes[t];
                    const pace = mins / cp.gpsSectionKm;
                    return (
                      <span key={t}>
                        <span className="block">{mins} 分</span>
                        <span className="block text-xs text-[#5c564c]">{formatClock(sheetArrival(cp.id, t))}</span>
                        <span className={`block text-xs ${pace < 8 ? "text-[#8a3d22]" : "text-[#5c564c]"}`}>
                          {pace.toFixed(1)} 分/公里
                        </span>
                      </span>
                    );
                  }),
                ],
              };
            })}
          />
          <p className="mt-2 text-xs text-[#5c564c]">
            到達時間一欄假設 08:00 起步，同你張表一樣，未有計尾段拉長。
          </p>
        </>
          ),
          friend: (
            <div className="space-y-4">
          <p className="text-sm leading-6">
            朋友四段操練可以參考路感、樓梯同邊度有士多。鐘點係當日練習，有站低，唔好直接當比賽配速。
          </p>
          {courseData.friendBlocks.map((block, index) => (
            <section
              key={block.id}
              className={`${index > 0 ? "defer " : ""}rounded-3xl border border-[#d9d0c0] bg-[#f7f3ea] p-4`}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-xl">{block.title}</h3>
                <p className="text-sm text-[#5c564c]">操練大約 {block.hours}</p>
              </header>
              <p className="mt-1 text-sm leading-6 text-[#3c463f]">{block.note}</p>
              <ul role="list" className="mt-3 divide-y divide-[#e6dccb]">
                {block.items.map((item) => (
                  <li key={`${block.id}-${item.clock}-${item.title}`} className="flex flex-wrap gap-3 py-2 text-sm">
                    <span className="w-28 shrink-0 tabular-nums text-[#5c564c]">{item.clock}</span>
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => openSeg(item.segmentId)}
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="mt-0.5 block text-[#3c463f]">{item.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
          ),
          where: (
          <DataTable
            caption="地名對照"
            headers={["地方", "邊度", "公里"]}
            rows={courseData.landmarks.map((mark) => ({
              key: mark.name,
              cells: [
                <button
                  key="name"
                  type="button"
                  className="font-medium hover:underline"
                  onClick={() => openSeg(mark.segmentId)}
                >
                  {mark.name}
                </button>,
                mark.where,
                mark.km,
              ],
            }))}
          />
          ),
        }}
      />
      </main>

      <footer className="mt-10 space-y-2 text-xs leading-5 text-[#5c564c]">
        {courseData.meta.sources.map((s) => (
          <p key={s}>{s}</p>
        ))}
        <p>
          路線同年會變。關門時間、熱食、封路以樂施會當年手冊為準。呢份係行路參考，唔係官方分段。
        </p>
      </footer>

      <dialog
        ref={dialogRef}
        aria-labelledby="segment-title"
        closedby="any"
        onClose={() => setOpen(false)}
      >
        {active && activeClock && (
          <>
            <h2 id="segment-title" className="font-serif text-2xl">
              {active.name}
            </h2>
            <p>
              {active.fromKm.toFixed(1)}–{active.toKm.toFixed(1)} 公里 · {active.surface} ·{" "}
              {PACE_LABEL[active.pace as Pace]}
            </p>
            <div className="mt-3 space-y-3 text-sm leading-6">
              <p>{active.note}</p>
              <p className="tabular-nums text-[#3c463f]">
                {formatClock(activeClock.start)} 到 {formatClock(activeClock.end)} ·{" "}
                {Math.round(activeClock.minutes)} 分鐘 · {LIGHT_LABEL[lightOf((activeClock.start + activeClock.end) / 2)]}
                <br />
                爬 {active.gain} 米，落 {active.loss} 米，海拔 {active.eleStart} → {active.eleEnd}
              </p>
              {active.stairs && <p>樓梯：{active.stairs}</p>}
              {active.friend && <p className="rounded-xl bg-[#efe2cf] px-3 py-2">操練：{active.friend}</p>}
              {active.facilities.length > 0 && <p>附近：{active.facilities.join("、")}</p>}
              {active.marks.length > 0 && <p>標記：{active.marks.join("、")}</p>}
              {activeClock.minutes / active.distanceKm < 7 && (
                <p className="text-[#8a3d22]">
                  呢截要 {(activeClock.minutes / active.distanceKm).toFixed(1)} 分一公里，要碎步先追到。
                </p>
              )}
            </div>
            <form method="dialog" className="mt-4">
              <button type="submit" autoFocus className="choice-close">
                關閉
              </button>
            </form>
          </>
        )}
      </dialog>
    </div>
  );
}

function dinnerChoices() {
  return [
    ...courseData.checkpoints
      .filter((cp) => cp.id !== "finish")
      .map((cp) => ({ id: cp.id, name: cp.name })),
    { id: "shing-mun", name: "城門水塘" },
  ];
}

function MealPick({
  label,
  hint,
  stationId,
  minutes,
  onStation,
  onMinutes,
  choices,
}: {
  label: string;
  hint: string;
  stationId: string;
  minutes: number;
  onStation: (id: string) => void;
  onMinutes: (mins: number) => void;
  choices?: { id: string; name: string }[];
}) {
  const stations =
    choices ??
    courseData.checkpoints
      .filter((cp) => cp.id !== "finish")
      .map((cp) => ({ id: cp.id, name: cp.name }));
  return (
    <div>
      <ChoiceSet
        legend={label}
        name={`meal-${label}`}
        value={stationId}
        onChange={onStation}
        options={stations.map((cp) => ({ value: cp.id, label: cp.name }))}
      />
      <ChoiceSet
        legend={`${label}分鐘`}
        name={`meal-mins-${label}`}
        value={String(minutes)}
        onChange={(mins) => onMinutes(Number(mins))}
        options={[15, 20, 25, 30].map((mins) => ({ value: String(mins), label: `${mins} 分鐘` }))}
      />
      <p className="mt-1 text-xs leading-5 text-[#5c564c]">{hint}</p>
    </div>
  );
}

function sheetArrival(cpId: string, target: Target) {
  let cursor = 8 * 60;
  for (const station of stations()) {
    cursor += station.sheetMinutes[target];
    if (station.id === cpId) return cursor;
  }
  return cursor;
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-3">
      <dt className="text-xs text-[#d5cbb8]">{k}</dt>
      <dd className="font-serif text-lg">{v}</dd>
    </div>
  );
}
