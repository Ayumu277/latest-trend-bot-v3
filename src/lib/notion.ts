"use node";

import { Client } from "@notionhq/client";
import { SharedContext, addLog } from "./context";

// Notionクライアントを初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// このBotが分析した記事のデータ型を定義
interface ArticleData {
  title: string;
  sourceUrl: string;
  summary: string;
  sampleCode: string;
  source: string;
}

/**
 * Notion接続テスト関数
 */
export async function testNotionConnection() {
  const databaseId = process.env.NOTION_DATABASE_ID;

  console.log("=== Notion接続テスト開始 ===");
  console.log("API Key (最初の10文字):", process.env.NOTION_API_KEY?.substring(0, 10) + "...");
  console.log("Database ID:", databaseId);

  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not set in environment variables.");
  }

  try {
    // データベース情報を取得してみる
    console.log("データベース情報を取得中...");
    const database = await notion.databases.retrieve({ database_id: databaseId });
    console.log("データベース取得成功:", JSON.stringify(database, null, 2));
    return { success: true, database: "Database found" };
  } catch (error: any) {
    console.error("Notion接続エラーの詳細:", {
      message: error?.message,
      code: error?.code,
      status: error?.status,
    });
    throw error;
  }
}

/**
 * Notionデータベースに新しいページ（行）を作成します
 * @param articleData - 保存する記事のデータ
 */
export async function createNotionPage(articleData: ArticleData) {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not set in environment variables.");
  }

  try {
    console.log(`Writing to Notion: ${articleData.title}`);
    console.log(`Using Database ID: ${databaseId}`);

    // Notion APIのpages.createメソッドを呼び出す
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        // "記事タイトル" という名前のTitleプロパティに書き込む
        "記事タイトル": {
          title: [
            {
              text: {
                content: articleData.title,
              },
            },
          ],
        },
        // "sourceUrl" - rich_text形式に変更（現在のNotionデータベース設定に合わせる）
        "sourceUrl": {
          rich_text: [
            {
              text: {
                content: articleData.sourceUrl,
              },
            },
          ],
        },
        // "summary" という名前のTextプロパティに書き込む
        "summary": {
          rich_text: [
            {
              text: {
                content: articleData.summary,
              },
            },
          ],
        },
        // "sampleCode" - 一時的にコメントアウト（プロパティ型がEmailのため）
        // "sampleCode": {
        //   rich_text: [
        //     {
        //       // コードブロックとして見やすくするために、バッククォートで囲む
        //       text: {
        //         content: "```typescript\n" + articleData.sampleCode + "\n```",
        //       },
        //     },
        //   ],
        // },
        // "source" という名前のSelectプロパティに書き込む
        "source": {
          select: {
            name: articleData.source,
          },
        },
      },
    });
    console.log("Successfully wrote to Notion:", response.id);
    return response;

  } catch (error) {
    console.error("Error writing to Notion:", error);
    console.error("Database ID used:", databaseId);
    throw error;
  }
}

/**
 * SharedContextを使用してNotionにデータを保存します
 * @param ctx - 共有コンテキスト（ctx.articleとctx.analysisが必須）
 * @returns 更新されたSharedContext
 */
export async function saveToNotion(ctx: SharedContext): Promise<SharedContext> {
  if (!ctx.article || !ctx.analysis) {
    throw new Error("Missing data");
  }

  await createNotionPage({
    title: ctx.article.title,
    sourceUrl: ctx.article.url, // Note: using 'url' instead of 'sourceUrl' to match context interface
    source: "TechCrunch", // Default source since article interface doesn't include source
    summary: ctx.analysis.summary,
    sampleCode: ctx.analysis.sampleCode,
  });

  return addLog(ctx, {
    step: "save",
    agent: "NotionAPI",
    note: `Saved ${ctx.article.title}`,
  });
}