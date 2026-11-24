import { parseAsBoolean, parseAsIsoDate, parseAsStringLiteral } from "nuqs";
import { RANGE_PRESETS } from "./ranges";

export const VITALS_RANGES = [...RANGE_PRESETS, "custom"] as const;
export type VitalsRange = (typeof VITALS_RANGES)[number];

export const vitalsParsers = {
  range: parseAsStringLiteral(VITALS_RANGES).withDefault("6m"),
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  compare: parseAsBoolean.withDefault(false),
};
