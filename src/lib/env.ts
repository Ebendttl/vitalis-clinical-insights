import "server-only";
import { z } from "zod";
import { publicEnv } from "./env.public";

/**
 * Server-only environment, validated once at module load so a misconfigured
 * deploy fails loudly instead of at the first request that needs a key.
 */
const ServerEnv = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_SUMMARY_MODEL: z.string().default("claude-haiku-5-5"),
  AI_SUMMARY_HOURLY_LIMIT: z.coerce.number().int().positive().default(20),
  DEMO_SIMULATION_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export const env = { ...publicEnv, ...ServerEnv.parse(process.env) };
