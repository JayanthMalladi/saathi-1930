import { Pause, Play } from "lucide-react";
import { fmt, useCallEngine } from "../engine/CallEngine";

// Sticky mini player that follows you down the page; the track seeks.
export default function PlayerBar() {
  const { time, total, playing, recording, toggle, seek } = useCallEngine();
  return (
    <div className="pbar">
      <div className="wrap">
        <button className="mini" type="button" onClick={toggle} aria-label={playing ? "Pause the call" : "Play the call"} aria-pressed={playing}>
          {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <span className="tt">
          {fmt(time)} / {fmt(total)}
        </span>
        <button
          type="button"
          className="track"
          aria-label="Seek in the call"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * total);
          }}
        >
          <span>
            <i style={{ width: `${Math.min(100, (time / total) * 100)}%` }} />
          </span>
        </button>
        <span className="lbl">Saathi → Rohit · call record DW-0412 · {recording ? "reenactment" : "simulated"}</span>
      </div>
    </div>
  );
}
