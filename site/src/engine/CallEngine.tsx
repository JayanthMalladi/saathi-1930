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
import { BEATS, formAfterBeat, type Beat, type FormState } from "../data/callScript";

type Engine = {
  idx: number; // active beat index, -1 = not started
  progress: number; // 0..1 through the active beat
  playing: boolean;
  form: FormState;
  beat: Beat | null;
  formAt: (i: number) => FormState;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  jumpTo: (i: number) => void;
  replay: () => void;
  hasPlayed: boolean;
};

const Ctx = createContext<Engine | null>(null);

function beatDuration(b: Beat): number {
  if (b.dur) return b.dur;
  return Math.max(3, Math.min(11, b.text.length / 2.6)); // ~2.6 chars/sec of speech
}

export function CallEngineProvider({ children }: { children: ReactNode }) {
  const [idx, setIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const acc = useRef(0);

  const form = useMemo(() => (idx >= 0 ? formAfterBeat(idx) : formAfterBeat(-1)), [idx]);

  // rAF loop
  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const step = (t: number) => {
      const dt = (t - last.current) / 1000;
      last.current = t;
      const b = BEATS[idx];
      if (!b) {
        setPlaying(false);
        return;
      }
      acc.current += dt;
      const d = beatDuration(b);
      if (acc.current >= d) {
        acc.current = 0;
        const next = idx + 1;
        if (next >= BEATS.length) {
          setIdx(idx);
          setProgress(1);
          setPlaying(false);
          return;
        }
        setIdx(next);
        setProgress(0);
      } else {
        setProgress(acc.current / d);
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, idx]);

  const play = useCallback(() => {
    setHasPlayed(true);
    if (idx === -1) {
      setIdx(0);
      acc.current = 0;
      setProgress(0);
    }
    if (idx === BEATS.length - 1 && progress >= 1) {
      // finished: replay from start
      setIdx(0);
      acc.current = 0;
      setProgress(0);
    }
    setPlaying(true);
  }, [idx, progress]);

  const pause = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  const jumpTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(BEATS.length - 1, i));
      setIdx(clamped);
      acc.current = 0;
      setProgress(0);
      setHasPlayed(true);
      setPlaying(true);
    },
    []
  );

  const replay = useCallback(() => {
    setIdx(0);
    acc.current = 0;
    setProgress(0);
    setHasPlayed(true);
    setPlaying(true);
  }, []);

  const value: Engine = {
    idx,
    progress,
    playing,
    form,
    beat: idx >= 0 ? BEATS[idx] : null,
    formAt: formAfterBeat,
    play,
    pause,
    toggle,
    jumpTo,
    replay,
    hasPlayed,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCallEngine() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCallEngine outside provider");
  return v;
}
