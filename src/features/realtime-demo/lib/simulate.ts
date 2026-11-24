import { VITAL_TYPES, VITALS, type VitalType } from "@/features/vitals/lib/definitions";

export type SimulatedReading = { type: VitalType; value: number; unit: string };

/**
 * Next demo reading per vital: a mean-reverting random walk toward the middle of
 * the normal band, with an occasional spike so out-of-range flags can be seen live.
 * `random` is injectable for deterministic tests.
 */
export function nextReadings(
  latest: Partial<Record<VitalType, number>>,
  random: () => number = Math.random,
): SimulatedReading[] {
  const spikeType = random() < 0.15 ? VITAL_TYPES[Math.floor(random() * VITAL_TYPES.length)] : null;
  return VITAL_TYPES.map((type) => {
    const def = VITALS[type];
    const { low, high } = def.thresholds;
    const centre = (low + high) / 2;
    const prev = latest[type] ?? centre;
    const step = (high - low) * 0.06;
    let value = prev + (centre - prev) * 0.15 + (random() - 0.5) * 2 * step;
    if (type === spikeType) value += (type === "spo2" ? -1 : 1) * (high - low) * (0.6 + random() * 0.4);
    const [min, max] = type === "spo2" ? [80, 100] : [def.domain[0], def.domain[1]];
    value = Math.min(max, Math.max(min, value));
    return { type, value: Number(value.toFixed(def.decimals)), unit: def.unit };
  });
}
