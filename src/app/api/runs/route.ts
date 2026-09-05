import { runEvaluation } from "@/lib/eval";
import { z } from "zod";

const QuerySchema = z.object({
  partition: z.enum(["tuning", "held_out", "all"]).default("held_out"),
  seed: z.coerce.number().int().min(0).max(2_147_483_647).default(1701),
  trials: z.coerce.number().int().min(1).max(25).default(5),
});

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid evaluation query", details: parsed.error.flatten() } }, { status: 422 });
  }
  const report = runEvaluation({ partition: parsed.data.partition, seed: parsed.data.seed, trialsPerCase: parsed.data.trials });
  return Response.json({ data: report }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" } });
}
