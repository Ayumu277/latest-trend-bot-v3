"use node";

// src/lib/mastraPipeline.ts
import { Agent } from "@mastra/core";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { SharedContext, addLog } from "./context";

// DeepSeek APIクライアントを初期化
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

// 分析結果の型定義
export type AnalysisResult = {
  summary: string;
  sampleCode: string;
  llmProvider: string;
};

/**
 * 記事を分析してサマリーとサンプルコードを生成するエージェント
 */
const analysisAgent = new Agent({
  name: "記事分析エージェント",
  instructions: `
あなたは技術記事を分析する専門のエージェントです。

指定された記事の内容を日本語で正確に分析し、以下のフォーマットで出力してください：

1. 記事内容を日本のエンジニアにも分かりやすいように3行で要約
2. 記事内容に関連する面白いTypeScriptのサンプルコードを生成（該当がない場合は"なし"）

技術的に正確で、示唆に富む分析を心がけてください。
  `,
  model: deepseek('deepseek-chat'),
});

/**
 * SharedContextを使用して記事を分析し、結果をcontextに保存します
 * @param ctx - 共有コンテキスト（ctx.articleが必須）
 * @returns 更新されたSharedContext
 */
export async function analyzeArticle(ctx: SharedContext): Promise<SharedContext> {
  // ctx.articleが存在することを確認
  if (!ctx.article) {
    console.error("analyzeArticle: ctx.article is required but not provided");
    return addLog(ctx, {
      step: "analyze",
      agent: "DeepSeek",
      note: "Error: No article provided for analysis"
    });
  }

  try {
    const prompt = `
以下の技術記事を分析して、要約とサンプルコードを生成してください：

記事タイトル: ${ctx.article.title}
記事URL: ${ctx.article.url}
記事内容：
${ctx.article.content}

出力フォーマット：
**要約（3行）：**
[ここに3行の要約]

**サンプルコード：**
[ここにTypeScriptコード、または"なし"]
    `;

    const response = await analysisAgent.generate(prompt);

    // 結果をパースして構造化
    const result = response.text;

    // 簡単なパターンマッチングで要約とコードを抽出
    const summaryMatch = result.match(/\*\*要約.*?\*\*\s*:?\s*([\s\S]*?)(?=\*\*サンプルコード|\*\*コード|$)/i);
    const codeMatch = result.match(/\*\*サンプルコード.*?\*\*\s*:?\s*([\s\S]*?)$/i);

    const analysis: AnalysisResult = {
      summary: summaryMatch ? summaryMatch[1].trim() : result.substring(0, 200),
      sampleCode: codeMatch ? codeMatch[1].trim() : "なし",
      llmProvider: "DeepSeek" // 実際に使用しているプロバイダー
    };

    console.log(`Analysis completed for: ${ctx.article.title}`);

    // コンテキストに分析結果を追加
    const updatedCtx = {
      ...ctx,
      analysis,
    };

    return addLog(updatedCtx, {
      step: "analyze",
      agent: "DeepSeek",
      note: `Analyzed ${ctx.article.title}`
    });

  } catch (error) {
    console.error("分析パイプラインエラー:", error);

    // エラー時のフォールバック
    const fallbackAnalysis: AnalysisResult = {
      summary: "記事の分析中にエラーが発生しました。",
      sampleCode: "なし",
      llmProvider: "DeepSeek"
    };

    const updatedCtx = {
      ...ctx,
      analysis: fallbackAnalysis,
    };

    return addLog(updatedCtx, {
      step: "analyze",
      agent: "DeepSeek",
      note: `Error analyzing ${ctx.article.title}: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}