"use node";

// convex/lib/mastraPipeline.ts
import { Agent } from "@mastra/core";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

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
あなたは技術記事をX（旧Twitter）でバズるような要約を作る専門のエージェントです。

指定された記事の内容を以下のルールに従って要約してください：

【制約条件】
- 冒頭で目を引くワードや驚きを入れる
- 中学生でもわかる言葉で
- 「誰が」「何をした」「なぜすごいか」が即わかる構成
- 驚き・学び・共感のどれかを必ず含める
- タメ口・カジュアルな文体、敬語NG
- URL・ハッシュタグは不要
- 改行なし、全角140文字以内に収める

出力フォーマット：
**要約：**
[ここにX（旧Twitter）向けの140字以内の要約]

**サンプルコード：**
[ここに関連するTypeScriptのサンプルコード、該当がない場合は"なし"]
  `,
  model: deepseek('deepseek-chat'),
});

/**
 * 記事を分析するためのパイプライン関数
 */
export async function analysisPipeline(articleContent: string): Promise<AnalysisResult> {
  try {
    const prompt = `
以下のニュース記事を、X（旧Twitter）でバズるように全角140字以内で要約してください。

【制約条件】
- 冒頭で目を引くワードや驚きを入れる
- 中学生でもわかる言葉で
- 「誰が」「何をした」「なぜすごいか」が即わかる構成
- 驚き・学び・共感のどれかを必ず含める
- タメ口・カジュアルな文体、敬語NG
- URL・ハッシュタグは不要
- 改行なし、全角140文字以内に収める

【元記事】
${articleContent}

出力フォーマット：
**要約：**
[ここにX（旧Twitter）向けの140字以内の要約]

**サンプルコード：**
[ここに関連するTypeScriptのサンプルコード、該当がない場合は"なし"]
    `;

    const response = await analysisAgent.generate(prompt);

    // 結果をパースして構造化
    const result = response.text;

    // 簡単なパターンマッチングで要約とコードを抽出
    const summaryMatch = result.match(/\*\*要約.*?\*\*\s*:?\s*([\s\S]*?)(?=\*\*サンプルコード|\*\*コード|$)/i);
    const codeMatch = result.match(/\*\*サンプルコード.*?\*\*\s*:?\s*([\s\S]*?)$/i);

    return {
      summary: summaryMatch ? summaryMatch[1].trim() : result.substring(0, 200),
      sampleCode: codeMatch ? codeMatch[1].trim() : "なし",
      llmProvider: "DeepSeek" // 実際に使用しているプロバイダー
    };

  } catch (error) {
    console.error("分析パイプラインエラー:", error);

    // エラー時のフォールバック
    return {
      summary: "記事の分析中にエラーが発生しました。",
      sampleCode: "なし",
      llmProvider: "DeepSeek"
    };
  }
}