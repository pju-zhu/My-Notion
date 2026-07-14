import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  runUrlImport,
  urlImportExceptionToResponse,
} from "@/src/lib/import/url";

/** 公众号导入含多图转存时可能较慢（Vercel Pro 等可调高上限）。 */
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsedBody = bodySchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const outcome = await runUrlImport(parsedBody.data.url);
    if (!outcome.ok) {
      return NextResponse.json(outcome.json, { status: outcome.status });
    }

    return NextResponse.json(outcome.payload);
  } catch (e) {
    return urlImportExceptionToResponse(e);
  }
}
