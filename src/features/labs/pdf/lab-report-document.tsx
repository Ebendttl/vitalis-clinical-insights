import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Lab report PDF. Rendered server-side only (seed script and export routes), so
 * @react-pdf/renderer never ships to the browser.
 */

export type LabReportPdfProps = {
  reportId: string;
  type: string;
  status: string;
  collectedAt: string;
  reportedAt: string | null;
  patient: { fullName: string; mrn: string; dateOfBirth: string; sex: string };
  results: Array<{ analyte: string; value: number; unit: string; low: number; high: number; flag: string }>;
};

const INK = "#1f2230";
const MUTED = "#626777";
const RULE = "#e3e5ec";
const IRIS = "#4b3fd6";
const FLAG: Record<string, string> = { normal: "#1d7a55", abnormal: "#8a5a12", critical: "#b42318" };

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: `2 solid ${IRIS}`, paddingBottom: 12 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: IRIS },
  muted: { color: MUTED },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  cell: { width: "50%", marginBottom: 6 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 },
  row: { flexDirection: "row", borderBottom: `1 solid ${RULE}`, paddingVertical: 6 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: MUTED, textTransform: "uppercase" },
  c1: { width: "36%" },
  c2: { width: "18%", textAlign: "right" },
  c3: { width: "28%", textAlign: "right" },
  c4: { width: "18%", textAlign: "right" },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: MUTED, textAlign: "center" },
});

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso));

export function LabReportDocument(props: LabReportPdfProps) {
  return (
    <Document title={`${props.type} — ${props.patient.fullName}`} author="Vitalis (synthetic data)">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Vitalis Laboratory</Text>
            <Text style={s.muted}>Synthetic demonstration report</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>Report {props.reportId.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.muted}>Status: {props.status}</Text>
          </View>
        </View>

        <Text style={s.title}>{props.type}</Text>
        <View style={s.grid}>
          {[
            ["Patient", props.patient.fullName],
            ["MRN", props.patient.mrn],
            ["Date of birth", props.patient.dateOfBirth],
            ["Sex", props.patient.sex],
            ["Collected", fmt(props.collectedAt)],
            ["Reported", props.reportedAt ? fmt(props.reportedAt) : "Pending"],
          ].map(([label, value]) => (
            <View key={label} style={s.cell}>
              <Text style={s.label}>{label}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.row}>
          <Text style={[s.th, s.c1]}>Analyte</Text>
          <Text style={[s.th, s.c2]}>Result</Text>
          <Text style={[s.th, s.c3]}>Reference</Text>
          <Text style={[s.th, s.c4]}>Flag</Text>
        </View>
        {props.results.map((r) => (
          <View key={r.analyte} style={s.row}>
            <Text style={s.c1}>{r.analyte}</Text>
            <Text style={[s.c2, { fontFamily: "Helvetica-Bold" }]}>
              {r.value} {r.unit}
            </Text>
            <Text style={[s.c3, s.muted]}>
              {r.low}–{r.high} {r.unit}
            </Text>
            <Text style={[s.c4, { color: FLAG[r.flag] ?? INK }]}>{r.flag === "normal" ? "—" : r.flag.toUpperCase()}</Text>
          </View>
        ))}

        <Text style={s.footer} fixed>
          Synthetic data generated for a portfolio demonstration. Not a medical record. Not medical advice.
        </Text>
      </Page>
    </Document>
  );
}
