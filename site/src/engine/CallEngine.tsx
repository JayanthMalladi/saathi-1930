import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BEATS, CALL_TOTAL, PREVIEW_T, beatAt, formAfterBeat, type Beat, type FormState } from "../data/callScript";

// Set in vite.config.ts: "call.mp3" when site/public/call.mp3 exists at dev/build start, else "".
// Checking at build time means a missing file never costs a 404 in the console.
declare const __CALL_AUDIO__: string;

type Engine = {
  /** seconds from the start of the call */
  time: number;
  /** length of the call: the recording's duration when one is loaded, else CALL_TOTAL */
  total: number;
  idx: number; // beat playing at `time`
  beat: Beat;
  playing: boolean;
  /** true once the visitor has pressed play or jumped somewhere (the page opens on a paused preview) */
  hasPlayed: boolean;
  /** true when the real recording is the clock, false on the simulated clock */
  recording: boolean;
  form: FormState;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (s: number) => void;
  skip: (d: number) => void;
  jumpTo: (i: number) => void;
  replay: () => void;
};

const Ctx = createContext<Engine | null>(null);

export function CallEngineProvider({ children }: { children: ReactNode }) {
  const [time, setTime] = useState(PREVIEW_T);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [total, setTotal] = useState(CALL_TOTAL);
  const [recording, setRecording] = useState(!!__CALL_AUDIO__);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timeRef = useRef(PREVIEW_T);
  const totalRef = useRef(CALL_TOTAL);

  const setClock = useCallback((s: number) => {
    timeRef.current = s;
    setTime(s);
  }, []);

  // the real recording, if the build found one; on any load error fall back to the simulated clock
  useEffect(() => {
    if (!__CALL_AUDIO__) return;
    const a = new Audio(__CALL_AUDIO__);
    a.preload = "metadata";
    const onMeta = () => {
      if (isFinite(a.duration) && a.duration > 0) {
        totalRef.current = a.duration;
        setTotal(a.duration);
        if (timeRef.current > a.duration) setClock(a.duration);
      }
    };
    const onEnded = () => setPlaying(false);
    const onError = () => {
      audio.current = null;
      setRecording(false);
    };
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    audio.current = a;
    return () => {
      a.pause();
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      audio.current = null;
    };
  }, [setClock]);

  // one clock: the recording's currentTime, or a simulated one advanced by rAF
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let shown = timeRef.current;
    const step = (now: number) => {
      const a = audio.current;
      const t = a ? a.currentTime : timeRef.current + (now - last) / 1000;
      last = now;
      if (t >= totalRef.current) {
        setClock(totalRef.current);
        setPlaying(false);
        return;
      }
      timeRef.current = t;
      // ~20 renders a second is plenty for a seconds timer and line-level highlights
      if (t - shown >= 0.05 || t < shown) {
        shown = t;
        setTime(t);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, setClock]);

  const seek = useCallback(
    (s: number) => {
      const t = Math.max(0, Math.min(totalRef.current, s));
      setClock(t);
      setHasPlayed(true);
      if (audio.current) audio.current.currentTime = t;
    },
    [setClock]
  );

  const play = useCallback(() => {
    // the first press plays the call from the start, not from the preview point; so does a press at the end
    let t = timeRef.current;
    if (!hasPlayed || t >= totalRef.current - 0.25) t = 0;
    setClock(t);
    setHasPlayed(true);
    const a = audio.current;
    if (a) {
      a.currentTime = t;
      a.play().catch(() => setPlaying(false));
    }
    setPlaying(true);
  }, [hasPlayed, setClock]);

  const pause = useCallback(() => {
    audio.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  const skip = useCallback((d: number) => seek(timeRef.current + d), [seek]);

  const jumpTo = useCallback((i: number) => seek(BEATS[Math.max(0, Math.min(BEATS.length - 1, i))].t), [seek]);

  const replay = useCallback(() => {
    setClock(0);
    setHasPlayed(true);
    const a = audio.current;
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => setPlaying(false));
    }
    setPlaying(true);
  }, [setClock]);

  const idx = beatAt(time);
  const form = useMemo(() => formAfterBeat(idx), [idx]);

  const value: Engine = {
    time,
    total,
    idx,
    beat: BEATS[idx],
    playing,
    hasPlayed,
    recording,
    form,
    play,
    pause,
    toggle,
    seek,
    skip,
    jumpTo,
    replay,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCallEngine() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCallEngine outside provider");
  return v;
}

/** mm:ss */
export function fmt(s: number): string {
  const n = Math.max(0, Math.floor(s));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
