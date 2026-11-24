/** TanStack Query keys shared by the vitals, patient header and live-demo features. */
export const vitalsMonthKey = (patientId: string, month: string) => ["vitals", patientId, month] as const;
export const recentVitalsKey = (patientId: string) => ["vitals-recent", patientId] as const;
export const liveKey = (patientId: string) => ["live", patientId] as const;
