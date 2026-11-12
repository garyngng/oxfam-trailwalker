"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const TABS = [
  { id: "segments", label: "小段" },
  { id: "km", label: "每一公里" },
  { id: "sheet", label: "時間表" },
  { id: "friend", label: "朋友手記" },
  { id: "where", label: "地名對照" },
] as const;

export type CourseTabId = (typeof TABS)[number]["id"];

export function CourseTabs({ panels }: { panels: Record<CourseTabId, ReactNode> }) {
  const [selected, setSelected] = useState<CourseTabId>("segments");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!Object.hasOwn(HTMLElement.prototype, "focusGroup")) {
      import("@microsoft/focusgroup-polyfill").then(({ polyfill }) => {
        if (!cancelled) polyfill(document.body);
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onBeforeMatch = (event: Event) => {
      const panel = event.target;
      if (!(panel instanceof HTMLElement)) return;
      const id = panel.dataset.panel;
      if (id && TABS.some((tab) => tab.id === id)) setSelected(id as CourseTabId);
    };
    root.addEventListener("beforematch", onBeforeMatch);
    return () => root.removeEventListener("beforematch", onBeforeMatch);
  }, []);

  function select(id: CourseTabId) {
    setSelected(id);
    document.getElementById(`tab-${id}`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      container: "nearest",
    } as ScrollIntoViewOptions);
  }

  return (
    <div className="course-tabs" ref={rootRef}>
      <div
        className="course-tabs__list"
        {...({ focusgroup: "tablist nomemory" } as object)}
        aria-label="路線資料"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={selected === tab.id}
            {...(selected === tab.id ? ({ focusgroupstart: "" } as object) : {})}
            onClick={() => select(tab.id)}
            onFocus={() => {
              if (selected !== tab.id) select(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => {
        const active = selected === tab.id;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            data-panel={tab.id}
            tabIndex={active ? 0 : undefined}
            {...(active ? {} : ({ hidden: "until-found" } as object))}
          >
            <div className="panel-body">{panels[tab.id]}</div>
          </div>
        );
      })}
    </div>
  );
}
