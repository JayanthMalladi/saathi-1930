import { useEffect, useRef } from "react";
import { BEATS } from "../data/callScript";
import { fmt, useCallEngine } from "../engine/CallEngine";

// The full timestamped transcript. Timestamps seek; tool calls sit inline; the current line gets the
// highlighter. When the list scrolls on its own (phones), it keeps the current line in view.
export default function Transcript() {
  const { idx, seek } = useCallEngine();
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ul = list.current;
    if (!ul || ul.scrollHeight <= ul.clientHeight) return;
    const li = ul.children[idx] as HTMLElement | undefined;
    if (!li) return;
    ul.scrollTop = Math.max(0, li.offsetTop - ul.offsetTop - ul.clientHeight / 2 + li.offsetHeight / 2);
  }, [idx]);

  return (
    <ol className="transcript" ref={list}>
      {BEATS.map((b, i) => (
        <li key={b.id} className={`ln ln--${b.speaker} ${i === idx ? "is-now" : i < idx ? "is-past" : "is-future"}`} aria-current={i === idx ? "true" : undefined}>
          <button className="ln-time" type="button" onClick={() => seek(b.t)} aria-label={`Jump to ${fmt(b.t)}`}>
            {fmt(b.t)}
          </button>
          <span className="ln-who">{b.speaker === "saathi" ? "Saathi" : "Rohit"}</span>
          <p className="ln-text">
            {b.hi ? (
              <span className="mark block">
                <span className="ln-hi" lang="hi">
                  {b.hi}
                </span>
                <span className="ln-rom">{b.text}</span>
              </span>
            ) : (
              <span className="mark">{b.text}</span>
            )}
          </p>
          {b.note && <span className="ln-note">{b.note}</span>}
          {b.tool && <span className="tool">{b.tool}()</span>}
        </li>
      ))}
    </ol>
  );
}
