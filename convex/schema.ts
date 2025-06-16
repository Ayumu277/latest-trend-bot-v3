import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 'articles' という名前のテーブルを定義します
  articles: defineTable({
    // どのサイトから取得したか (例: "Hacker News", "TechCrunch")
    source: v.string(),

    // 元記事のURL。重複チェックと特定のためにインデックスを張ります
    sourceUrl: v.string(),

    // 記事のタイトル
    title: v.string(),

    // 取得した記事の本文 or 概要。取得できない場合もあるためoptional(任意)です
    content: v.optional(v.string()),

    // Mastraパイプラインで生成された要約
    summary: v.optional(v.string()),

    // Mastraパイプラインで生成されたサンプルコードや技術解説
    sampleCode: v.optional(v.string()),

    // 要約・分析に使用したLLM (例: "DeepSeek")
    llmProvider: v.optional(v.string()),

    // Botがデータを取得した日時（Unixタイムスタンプ形式）
    fetchedAt: v.number(),

  }).index("by_sourceUrl", ["sourceUrl"]), // sourceUrlでの検索を高速化するためのインデックス
});