/**
 * Seeds a Supabase project with synthetic data.
 *
 *   npm run db:seed                  # 50 patients, 24 months
 *   npm run db:seed -- --patients=500 --skip-pdfs
 *
 * Uses the service-role key (server-side only) and is idempotent: it wipes
 * patient data first. Never point this at a project holding real data.
 */

import { Faker, en } from "@faker-js/faker";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LabReportDocument } from "../../src/features/labs/pdf/lab-report-document";
import { type GeneratedRecord, generatePatient } from "./generate";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);

const PATIENTS = Number(args.get("patients") ?? 50);
const DAYS = Number(args.get("days") ?? 730);
const SEED = Number(args.get("seed") ?? 20261124);
const SKIP_PDFS = args.get("skip-pdfs") === "true";
const BATCH = 5000;

export const DEMO_USERS = [
  { email: "demo@vitalis.test", fullName: "Dr. Amara Okafor", specialty: "Internal Medicine", allPatients: true },
  { email: "colleague@vitalis.test", fullName: "Dr. Leo Brandt", specialty: "Cardiology", allPatients: false },
];

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local.`);
  return value;
}

async function insertBatched(db: SupabaseClient, table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from(table).insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function wipe(db: SupabaseClient) {
  // Cascades remove readings, diagnoses, events, labs and assignments.
  const { error } = await db.from("patients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`wipe patients: ${error.message}`);
  await db.from("audit_log").delete().gte("id", 0);

  const { data: objects } = await db.storage.from("lab-reports").list("", { limit: 10_000 });
  for (const folder of objects ?? []) {
    const { data: files } = await db.storage.from("lab-reports").list(folder.name, { limit: 1000 });
    if (files?.length) await db.storage.from("lab-reports").remove(files.map((f) => `${folder.name}/${f.name}`));
  }

  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of users?.users ?? []) {
    if (DEMO_USERS.some((d) => d.email === u.email) || u.is_anonymous) await db.auth.admin.deleteUser(u.id);
  }
}

async function uploadPdfs(db: SupabaseClient, records: GeneratedRecord[]) {
  let done = 0;
  const jobs = records.flatMap((rec) => rec.labs.filter((l) => l.file_path).map((lab) => ({ rec, lab })));
  const CONCURRENCY = 8;
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    await Promise.all(
      jobs.slice(i, i + CONCURRENCY).map(async ({ rec, lab }) => {
        // Called as a function (not createElement) so renderToBuffer receives the <Document> element itself.
        const pdf = await renderToBuffer(
          LabReportDocument({
            reportId: lab.id,
            type: lab.type,
            status: lab.status,
            collectedAt: lab.collected_at,
            reportedAt: lab.reported_at,
            patient: {
              fullName: `${rec.patient.first_name} ${rec.patient.last_name}`,
              mrn: rec.patient.mrn,
              dateOfBirth: rec.patient.date_of_birth,
              sex: rec.patient.sex,
            },
            results: lab.results,
          }),
        );
        const { error } = await db.storage
          .from("lab-reports")
          .upload(lab.file_path as string, pdf, { contentType: "application/pdf", upsert: true });
        if (error) throw new Error(`upload ${lab.file_path}: ${error.message}`);
        done++;
      }),
    );
    process.stdout.write(`\r  PDFs ${done}/${jobs.length}`);
  }
  process.stdout.write("\n");
}

async function main() {
  const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${PATIENTS} patients × ${DAYS} days (seed ${SEED})`);
  await wipe(db);

  const faker = new Faker({ locale: [en] });
  faker.seed(SEED);
  const now = new Date();
  // Roughly one in eight patients is mid-episode right now, so the demo has live concerns.
  const records = Array.from({ length: PATIENTS }, (_, i) =>
    generatePatient(faker, i, { now, days: DAYS, forceAcute: i % 8 === 3 }),
  );

  await insertBatched(db, "patients", records.map((r) => r.patient));
  await insertBatched(db, "diagnoses", records.flatMap((r) => r.diagnoses));
  await insertBatched(db, "diagnosis_events", records.flatMap((r) => r.events));
  await insertBatched(db, "lab_reports", records.flatMap((r) => r.labs));
  const readings = records.flatMap((r) => r.readings);
  console.log(`  ${readings.length.toLocaleString()} vital readings`);
  await insertBatched(db, "vital_readings", readings);

  if (!SKIP_PDFS) await uploadPdfs(db, records);

  // Demo clinicians. The on_auth_user_created trigger assigns a starter panel;
  // the primary demo account then gets every patient.
  for (const user of DEMO_USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error || !data.user) throw new Error(`create ${user.email}: ${error?.message}`);
    await db.from("clinicians").update({ specialty: user.specialty }).eq("id", data.user.id);
    if (user.allPatients) {
      await db
        .from("clinician_patients")
        .upsert(records.map((r) => ({ clinician_id: data.user.id, patient_id: r.patient.id })), { ignoreDuplicates: true });
    }
  }

  const byLevel = Object.groupBy(records, (r) => r.patient.risk_level);
  console.log(
    `  risk: ${Object.entries(byLevel)
      .map(([k, v]) => `${k} ${v?.length}`)
      .join(", ")}`,
  );
  console.log("Done. Sign in as demo@vitalis.test (magic link arrives in local Mailpit: http://127.0.0.1:54324).");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
