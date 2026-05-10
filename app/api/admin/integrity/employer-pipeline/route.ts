import { NextResponse } from "next/server";
import { verifyPipelineIntegrity } from "@/lib/employer/jobPipeline";

/**
 * GET /api/admin/integrity/employer-pipeline
 * Returns the current integrity check results for the employer pipeline.
 */
export async function GET(): Promise<NextResponse> {
  const result = await verifyPipelineIntegrity();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
