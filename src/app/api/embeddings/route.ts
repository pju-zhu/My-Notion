import { NextRequest, NextResponse } from "next/server";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";

/** DashScope text-embedding-v3/v4 单次请求最多 10 条文本；LangChain 默认 batchSize 24 会触发 API 报错 */
const DASHSCOPE_TEXT_EMBEDDING_MAX_BATCH = 10;

// 处理POST请求
export async function POST(req: NextRequest) {
  const apiKey =
    process.env.LLM_API_KEY ?? process.env.ALIBABA_API_KEY ?? "";

  if (!apiKey) {
    console.error(
      "Embeddings API: set LLM_API_KEY or ALIBABA_API_KEY in environment",
    );
    return NextResponse.json(
      {
        error:
          "Embedding API is not configured (missing LLM_API_KEY or ALIBABA_API_KEY).",
      },
      { status: 503 },
    );
  }

  try {
    const { input, inputs } = await req.json();

    const configuredBatch = Number(process.env.EMBEDDING_BATCH_SIZE);
    const batchSize = Number.isFinite(configuredBatch)
      ? Math.min(
          DASHSCOPE_TEXT_EMBEDDING_MAX_BATCH,
          Math.max(1, Math.floor(configuredBatch)),
        )
      : DASHSCOPE_TEXT_EMBEDDING_MAX_BATCH;

    const modelName =
      (process.env.EMBEDDING_MODEL as
        | "text-embedding-v2"
        | "text-embedding-v3"
        | "text-embedding-v4"
        | undefined) ?? "text-embedding-v4";

    const embeddings = new AlibabaTongyiEmbeddings({
      modelName,
      apiKey,
      batchSize,
    });

    // 批量处理模式
    if (inputs && Array.isArray(inputs)) {
      const embeddingsList = await embeddings.embedDocuments(inputs);
      return NextResponse.json({ embeddings: embeddingsList });
    }

    // 单个处理模式
    if (!input) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const embedding = await embeddings.embedQuery(input);
    return NextResponse.json({ embedding });
  } catch (error) {
    console.error("Error in embeddings API:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
