import { NextResponse } from "next/server";

import { IMPORT_URL_JSON_CODE_BODY_TOO_LARGE } from "../importUrlCodes";

import { getMaxUrlImportBodyBytes } from "./limits";

const errorMessage: Record<string, string> = {
  INVALID_URL: "Invalid URL",
  URL_CREDENTIALS_NOT_ALLOWED: "URL must not include username or password",
  URL_HTTPS_ONLY:
    "Only https URLs are allowed (http allowed in dev with ALLOW_HTTP_URL_IMPORT=true)",
  URL_HOST_NOT_ALLOWED: "That host is not allowed",
};

function mapErrorCode(code: string): string {
  if (code.startsWith("FETCH_HTTP_")) {
    const status = code.replace("FETCH_HTTP_", "");
    return `Remote server returned ${status}`;
  }
  return errorMessage[code] ?? code;
}

/** 将导入流水线抛出的异常转为 Next Response（仅用于 route handler）。 */
export function urlImportExceptionToResponse(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out while fetching URL" },
        { status: 504 },
      );
    }
    const code = error.message;
    if (
      code === "INVALID_URL" ||
      code === "URL_CREDENTIALS_NOT_ALLOWED" ||
      code === "URL_HTTPS_ONLY" ||
      code === "URL_HOST_NOT_ALLOWED"
    ) {
      return NextResponse.json({ error: mapErrorCode(code) }, { status: 400 });
    }
    if (code === IMPORT_URL_JSON_CODE_BODY_TOO_LARGE) {
      return NextResponse.json(
        {
          code: IMPORT_URL_JSON_CODE_BODY_TOO_LARGE,
          maxBytes: getMaxUrlImportBodyBytes(),
        },
        { status: 413 },
      );
    }
    if (code === "FETCH_FINAL_URL_NOT_ALLOWED") {
      return NextResponse.json(
        {
          error:
            "The URL redirected to a location that is not allowed or could not be validated",
        },
        { status: 502 },
      );
    }
    if (code.startsWith("FETCH_HTTP_")) {
      return NextResponse.json({ error: mapErrorCode(code) }, { status: 502 });
    }
  }

  console.error("import/url:", error);
  return NextResponse.json(
    { error: "Failed to import from URL" },
    { status: 500 },
  );
}
