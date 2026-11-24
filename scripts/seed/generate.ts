/**
 * Pure synthetic-data generation. Given a seeded Faker and a reference "now",
 * produces one patient's full record. No I/O here, so it is unit-testable and
 * deterministic: the same seed always yields the same 50 patients.
 */

import type { Faker } from "@faker-js/faker";
import { VITALS, type VitalType } from "../../src/features/vitals/lib/definitions";
import { ageFromDob, computeRisk, type RiskResult } from "../../src/features/vitals/lib/risk";
import {
  BLOOD_TYPES,
  COHORT_AGE,
  COHORT_BASELINE,
  COHORT_CONDITIONS,
  COHORT_LABS,
  COHORT_WEIGHTS,
  CONDITIONS,
  type Cohort,
  type ConditionKey,
  INSURERS,
  LAB_PANELS,
  PLANS,
} from "./catalog";

const DAY = 86_400_000;

export type SeedReading = {
  patient_id: string;
  type: VitalType;
  value: number;
  unit: string;
  recorded_at: string;
  source: "clinic" | "home_device";
};

export type SeedDiagnosis = {
  id: string;
  patient_id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "under_observation" | "resolved";
  onset_date: string;
  resolved_date: string | null;
};

export type SeedDiagnosisEvent = {
  diagnosis_id: string;
  patient_id: string;
  event_type: "diagnosed" | "status_changed" | "note";
  from_status: SeedDiagnosis["status"] | null;
  to_status: SeedDiagnosis["status"] | null;
  note: string | null;
  occurred_at: string;
};

export type LabResultRow = { analyte: string; value: number; unit: string; low: number; high: number; flag: "normal" | "abnormal" | "critical" };

export type SeedLab = {
  id: string;
  patient_id: string;
  type: string;
  status: "pending" | "final" | "amended";
  flag: "normal" | "abnormal" | "critical";
  collected_at: string;
  reported_at: string | null;
  file_path: string | null;
  results: LabResultRow[];
};

export type SeedPatient = {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: "female" | "male";
  phone: string;
  email: string;
  address_line: string;
  city: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  insurance_provider: string;
  insurance_member_id: string;
  insurance_plan: string;
  blood_type: string;
  risk_score: number;
  risk_level: RiskResult["level"];
  last_reading_at: string | null;
};

export type GeneratedRecord = {
  cohort: Cohort;
  patient: SeedPatient;
  readings: SeedReading[];
  diagnoses: SeedDiagnosis[];
  events: SeedDiagnosisEvent[];
  labs: SeedLab[];
};

type EpisodeKind = "fever" | "hypertensive" | "hypoxic" | "tachy";
type Episode = { kind: EpisodeKind; start: number; days: number };

const EPISODE_EFFECT: Record<EpisodeKind, Partial<Record<VitalType, number>>> = {
  fever: { temperature: 1.9, heart_rate: 22, respiratory_rate: 6, spo2: -2.5 },
  hypertensive: { bp_systolic: 46, bp_diastolic: 22, heart_rate: 8 },
  hypoxic: { spo2: -7, respiratory_rate: 8, heart_rate: 16, temperature: 0.4 },
  tachy: { heart_rate: 52, bp_systolic: -8, respiratory_rate: 3 },
};

const COHORT_EPISODES: Record<Cohort, EpisodeKind[]> = {
  healthy: ["fever"],
  athlete: ["fever"],
  hypertension: ["hypertensive", "fever"],
  type2_diabetes: ["fever", "hypertensive"],
  heart_failure: ["tachy", "hypoxic", "fever"],
  copd: ["hypoxic", "fever"],
  asthma: ["hypoxic", "fever"],
};

function gauss(f: Faker, sd: number): number {
  const u = Math.max(1e-9, f.number.float());
  const v = f.number.float();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd;
}

function weighted<T>(f: Faker, items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let roll = f.number.float({ min: 0, max: total });
  for (const [item, w] of items) {
    roll -= w;
    if (roll <= 0) return item;
  }
  return items[items.length - 1][0];
}

const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);

const NOISE: Record<VitalType, number> = {
  bp_systolic: 6,
  bp_diastolic: 4,
  heart_rate: 5,
  respiratory_rate: 1.2,
  temperature: 0.18,
  spo2: 0.8,
};

export type GenerateOptions = { now: Date; days: number; forceAcute?: boolean };

export function generatePatient(f: Faker, index: number, opts: GenerateOptions): GeneratedRecord {
  const now = opts.now.getTime();
  const start = now - opts.days * DAY;
  const cohort = weighted(f, COHORT_WEIGHTS);
  const sex = f.helpers.arrayElement(["female", "male"] as const);
  const [minAge, maxAge] = COHORT_AGE[cohort];
  const dob = f.date.birthdate({ mode: "age", min: minAge, max: maxAge, refDate: opts.now });
  const firstName = f.person.firstName(sex);
  const lastName = f.person.lastName();
  const id = f.string.uuid();
  const age = ageFromDob(isoDate(dob.getTime()), opts.now);

  // --- Diagnoses -----------------------------------------------------------
  const spec = COHORT_CONDITIONS[cohort];
  const chronicKeys: ConditionKey[] = [
    ...spec.primary,
    ...f.helpers.arrayElements(spec.possible, { min: 0, max: Math.min(2, spec.possible.length) }),
  ].filter((k, i, all) => all.indexOf(k) === i);

  const diagnoses: SeedDiagnosis[] = [];
  const events: SeedDiagnosisEvent[] = [];

  const addDiagnosis = (key: ConditionKey, onset: number, status: SeedDiagnosis["status"], resolvedAt?: number) => {
    const c = CONDITIONS[key];
    const dx: SeedDiagnosis = {
      id: f.string.uuid(),
      patient_id: id,
      code: c.code,
      name: c.name,
      description: c.description,
      status,
      onset_date: isoDate(onset),
      resolved_date: resolvedAt ? isoDate(resolvedAt) : null,
    };
    diagnoses.push(dx);
    const initial = c.chronic && f.datatype.boolean(0.4) ? "under_observation" : "active";
    events.push({
      diagnosis_id: dx.id,
      patient_id: id,
      event_type: "diagnosed",
      from_status: null,
      to_status: initial,
      note: `${c.name} recorded (${c.code}).`,
      occurred_at: new Date(onset).toISOString(),
    });
    if (initial !== status && status !== "resolved") {
      events.push({
        diagnosis_id: dx.id,
        patient_id: id,
        event_type: "status_changed",
        from_status: initial,
        to_status: status,
        note: status === "active" ? "Confirmed after repeat measurements." : "Stable; moved to observation.",
        occurred_at: new Date(onset + f.number.int({ min: 14, max: 60 }) * DAY).toISOString(),
      });
    }
    if (status === "resolved" && resolvedAt) {
      events.push({
        diagnosis_id: dx.id,
        patient_id: id,
        event_type: "status_changed",
        from_status: initial,
        to_status: "resolved",
        note: "Symptoms resolved; no further follow-up required.",
        occurred_at: new Date(resolvedAt).toISOString(),
      });
    }
    if (c.chronic && f.datatype.boolean(0.5)) {
      events.push({
        diagnosis_id: dx.id,
        patient_id: id,
        event_type: "note",
        from_status: null,
        to_status: null,
        note: f.helpers.arrayElement([
          "Medication reviewed; dose unchanged.",
          "Lifestyle counselling provided.",
          "Referred to specialist clinic.",
          "Home monitoring adherence good.",
          "Dose titrated following review.",
        ]),
        occurred_at: new Date(f.number.int({ min: Math.max(onset, start), max: now - 7 * DAY })).toISOString(),
      });
    }
  };

  for (const key of chronicKeys) {
    // Many chronic diagnoses pre-date the monitoring window.
    const onset = f.number.int({ min: start - 5 * 365 * DAY, max: now - 120 * DAY });
    const status = f.datatype.boolean(0.75) ? "active" : "under_observation";
    addDiagnosis(key, onset, status);
  }

  // --- Acute episodes (drive both vitals and resolved diagnoses) -------------
  const episodes: Episode[] = [];
  const episodeCount = f.number.int({ min: 1, max: cohort === "healthy" || cohort === "athlete" ? 2 : 4 });
  for (let i = 0; i < episodeCount; i++) {
    const kind = f.helpers.arrayElement(COHORT_EPISODES[cohort]);
    const days = f.number.int({ min: 2, max: 7 });
    const startDay = f.number.int({ min: 20, max: opts.days - 20 });
    episodes.push({ kind, start: start + startDay * DAY, days });
    if (kind === "fever") {
      const key = f.helpers.arrayElement<ConditionKey>(["uri", "pneumonia", "uti"]);
      const resolvedAt = Math.min(now - DAY, start + (startDay + days + f.number.int({ min: 3, max: 14 })) * DAY);
      addDiagnosis(key, start + startDay * DAY, "resolved", resolvedAt);
    }
  }
  if (opts.forceAcute) {
    // An ongoing episode so some patients are deteriorating *now* in the demo.
    const kind = f.helpers.arrayElement(COHORT_EPISODES[cohort]);
    episodes.push({ kind, start: now - 3 * DAY, days: 6 });
    if (kind === "fever") addDiagnosis("pneumonia", now - 3 * DAY, "under_observation");
  }

  // --- Vital readings ------------------------------------------------------
  const base = COHORT_BASELINE[cohort];
  const personal = {
    bp_systolic: base.sbp + gauss(f, 6),
    bp_diastolic: base.dbp + gauss(f, 4),
    heart_rate: base.hr + gauss(f, 5),
    respiratory_rate: base.rr + gauss(f, 1),
    temperature: base.temp + gauss(f, 0.12),
    spo2: Math.min(99, base.spo2 + gauss(f, 0.6)),
  } satisfies Record<VitalType, number>;

  // Hypertensive patients start treatment partway through; BP improves over ~2 months.
  const treatmentDay = chronicKeys.includes("hypertension") ? f.number.int({ min: 180, max: 480 }) : null;
  const adherence = f.number.float({ min: 0.55, max: 0.95 });
  const clinicEvery = f.number.int({ min: 28, max: 56 });

  const readings: SeedReading[] = [];
  for (let d = 0; d <= opts.days; d++) {
    const isLastDay = d === opts.days;
    const isClinic = d % clinicEvery === 0;
    if (!isLastDay && !isClinic && f.number.float() > adherence) continue;

    const hour = isClinic ? f.number.float({ min: 9, max: 16 }) : f.number.float({ min: 6.5, max: 9.5 });
    let t = start + d * DAY + hour * 3_600_000;
    if (isLastDay) t = Math.min(t, now - f.number.int({ min: 1, max: 5 }) * 3_600_000);
    const dayOfYear = new Date(t).getUTCDate() + new Date(t).getUTCMonth() * 30.4;
    // Northern-hemisphere winter raises BP slightly.
    const seasonal = Math.cos(((dayOfYear - 15) / 365) * 2 * Math.PI);

    const spike = f.number.float() < 0.006;
    for (const type of Object.keys(personal) as VitalType[]) {
      let value = personal[type] + gauss(f, NOISE[type]);
      if (type === "bp_systolic") value += seasonal * 4;
      if (type === "bp_diastolic") value += seasonal * 2;
      if (treatmentDay !== null && (type === "bp_systolic" || type === "bp_diastolic")) {
        const progress = Math.min(1, Math.max(0, (d - treatmentDay) / 60));
        value -= progress * (type === "bp_systolic" ? 16 : 8);
      }
      for (const ep of episodes) {
        const effect = EPISODE_EFFECT[ep.kind][type];
        if (!effect) continue;
        const p = (t - ep.start) / (ep.days * DAY);
        if (p >= 0 && p <= 1) value += effect * Math.sin(Math.PI * p) * (0.85 + f.number.float() * 0.3);
      }
      // Rare isolated outliers: a single abnormal reading without an episode.
      if (spike && (type === "heart_rate" || type === "bp_systolic")) value += f.number.int({ min: 25, max: 45 });

      const def = VITALS[type];
      const [lo, hi] = type === "spo2" ? [80, 100] : [def.domain[0], def.domain[1] + 20];
      value = Math.min(hi, Math.max(lo, value));
      readings.push({
        patient_id: id,
        type,
        value: Number(value.toFixed(def.decimals)),
        unit: def.unit,
        recorded_at: new Date(t).toISOString(),
        source: isClinic ? "clinic" : "home_device",
      });
    }
  }

  // --- Labs ----------------------------------------------------------------
  const labs: SeedLab[] = [];
  const labCfg = COHORT_LABS[cohort];
  const panels = chronicKeys.includes("hypothyroidism") ? [...labCfg.panels, "Thyroid panel"] : labCfg.panels;
  const labInterval = f.number.int({ min: 75, max: 110 });
  let panelIndex = 0;
  for (let d = f.number.int({ min: 5, max: 40 }); d < opts.days; d += labInterval + f.number.int({ min: -10, max: 10 })) {
    const type = panels[panelIndex++ % panels.length];
    const collected = start + d * DAY + 9 * 3_600_000;
    const isRecent = now - collected < 3 * DAY;
    const status: SeedLab["status"] = isRecent ? "pending" : f.datatype.boolean(0.08) ? "amended" : "final";
    const results: LabResultRow[] = LAB_PANELS[type].map((a) => {
      const mean = a.mean + (labCfg.shift[a.analyte] ?? 0);
      const value = Math.max(0, Number((mean + gauss(f, a.sd)).toFixed(a.decimals)));
      const span = a.high - a.low;
      const flag = value < a.low - span * 0.3 || value > a.high + span * 0.6 ? "critical" : value < a.low || value > a.high ? "abnormal" : "normal";
      return { analyte: a.analyte, value, unit: a.unit, low: a.low, high: a.high, flag };
    });
    const labId = f.string.uuid();
    labs.push({
      id: labId,
      patient_id: id,
      type,
      status,
      flag: results.some((r) => r.flag === "critical") ? "critical" : results.some((r) => r.flag === "abnormal") ? "abnormal" : "normal",
      collected_at: new Date(collected).toISOString(),
      reported_at: status === "pending" ? null : new Date(collected + f.number.int({ min: 1, max: 3 }) * DAY).toISOString(),
      file_path: status === "pending" ? null : `${id}/${labId}.pdf`,
      results: status === "pending" ? [] : results,
    });
  }

  // --- Risk ----------------------------------------------------------------
  const latest: Partial<Record<VitalType, number>> = {};
  for (const r of readings) latest[r.type] = r.value;
  const recentSystolic = readings.filter((r) => r.type === "bp_systolic" && Date.parse(r.recorded_at) > now - 30 * DAY);
  const risk = computeRisk({
    latest,
    ageYears: age,
    activeChronicConditions: diagnoses.filter((dx) => dx.status !== "resolved" && chronicKeys.some((k) => CONDITIONS[k].code === dx.code)).length,
    meanSystolic30d: recentSystolic.length ? recentSystolic.reduce((s, r) => s + r.value, 0) / recentSystolic.length : undefined,
  });

  const emergencySex = f.helpers.arrayElement(["female", "male"] as const);
  const patient: SeedPatient = {
    id,
    mrn: `VTL-${String(100_000 + index * 137 + f.number.int({ min: 0, max: 136 })).padStart(6, "0")}`,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: isoDate(dob.getTime()),
    sex,
    phone: f.phone.number({ style: "national" }),
    email: f.internet.email({ firstName, lastName, provider: "example.com" }).toLowerCase(),
    address_line: f.location.streetAddress(),
    city: f.location.city(),
    postal_code: f.location.zipCode(),
    emergency_contact_name: `${f.person.firstName(emergencySex)} ${f.datatype.boolean(0.7) ? lastName : f.person.lastName()}`,
    emergency_contact_relation: f.helpers.arrayElement(["Spouse", "Partner", "Daughter", "Son", "Sibling", "Parent", "Friend"]),
    emergency_contact_phone: f.phone.number({ style: "national" }),
    insurance_provider: f.helpers.arrayElement(INSURERS),
    insurance_member_id: f.string.alphanumeric({ length: 10, casing: "upper" }),
    insurance_plan: age >= 65 ? "Medicare Advantage" : f.helpers.arrayElement(PLANS),
    blood_type: weighted(f, BLOOD_TYPES),
    risk_score: risk.score,
    risk_level: risk.level,
    last_reading_at: readings.at(-1)?.recorded_at ?? null,
  };

  return { cohort, patient, readings, diagnoses, events, labs };
}
