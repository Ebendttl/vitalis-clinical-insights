import { Sparkline } from "@/features/vitals/components/sparkline";
import type { VitalType } from "@/features/vitals/lib/definitions";
import type { Point } from "@/features/vitals/lib/series";

/** Deterministic wave so the showcase renders identically on server and client. */
function wave(base: number, amp: number, phase: number, spikeAt?: number, spike = 0): Point[] {
  return Array.from({ length: 40 }, (_, i) => ({
    t: i,
    value: base + Math.sin(i / 3 + phase) * amp + Math.cos(i / 1.7 + phase) * amp * 0.4 + (i === spikeAt ? spike : 0),
  }));
}

const TILES: Array<{ label: string; value: string; unit: string; type: VitalType; points: Point[] }> = [
  { label: "Blood pressure", value: "128/82", unit: "mmHg", type: "bp_systolic", points: wave(124, 5, 0, 28, 30) },
  { label: "Heart rate", value: "72", unit: "bpm", type: "heart_rate", points: wave(72, 4, 1) },
  { label: "SpO₂", value: "97", unit: "%", type: "spo2", points: wave(97, 0.8, 2, 31, -5) },
];

/** Decorative product preview on the sign-in page. Hidden from assistive tech. */
export function SignInShowcase() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,var(--accent),transparent_60%),linear-gradient(180deg,var(--muted),var(--background))] lg:flex lg:items-center lg:justify-center"
    >
      <div className="w-full max-w-md space-y-4 p-10">
        <div className="card-surface flex items-center gap-4 p-5">
          <div className="grid size-12 place-items-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
            MR
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Maya Reyes</p>
            <p className="text-sm text-muted-foreground">58 · Female · VTL-104822</p>
          </div>
          <div className="rounded-full bg-elevated-subtle px-3 py-1 text-sm font-medium text-elevated">Moderate · 4</div>
        </div>
        <div className="grid gap-3">
          {TILES.map((tile) => (
            <div key={tile.label} className="card-surface flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="num text-2xl font-semibold">
                  {tile.value} <span className="text-sm font-normal text-muted-foreground">{tile.unit}</span>
                </p>
              </div>
              <Sparkline points={tile.points} type={tile.type} width={150} height={40} />
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">Every vital, every trend, at a glance.</p>
      </div>
    </aside>
  );
}
