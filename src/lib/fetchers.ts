"use node";

// src/lib/fetchers.ts
import { XMLParser } from "fast-xml-parser";
import { SharedContext, addLog } from "./context";

// TechCrunchのRSSフィードのURL
const TECHCRUNCH_FEED_URL = "https://techcrunch.com/feed/";

// 取得した記事の型を定義しておくと、後々便利です
export type FetchedArticle = {
  title: string;
  url: string;
  content: string;
};

/**
 * TechCrunchのRSSフィードから最新記事（1件のみ）を取得し、SharedContextに保存します。
 * @param ctx - 共有コンテキスト
 * @returns 更新されたSharedContext
 */
export async function fetchTechCrunchRSS(ctx: SharedContext): Promise<SharedContext> {
  try {
    console.log("Fetching TechCrunch RSS feed...");
    const response = await fetch(TECHCRUNCH_FEED_URL);

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // ★デバッグ用ログ1: 取得したXMLの生データを表示（長すぎるので最初の500文字だけ）
    console.log("Raw XML Response (first 500 chars):", xmlText.slice(0, 500));

    const parser = new XMLParser();
    const parsedXml = parser.parse(xmlText);

    // ★デバッグ用ログ2: パース後のオブジェクト構造をすべて表示
    console.log("Parsed XML Object Structure:", JSON.stringify(parsedXml, null, 2));

    // パースされたオブジェクトから記事の配列を取得
    // RSSの標準的な構造 `rss.channel.item` を参照
    const items = parsedXml?.rss?.channel?.item || [];

    if (items.length === 0) {
      console.log("No articles found in RSS feed");
      return addLog(ctx, {
        step: "fetch",
        agent: "RSSFetcher",
        note: "No articles found in RSS feed"
      });
    }

    // **取得したのは最初の記事のみ（デモ用）**
    const item = items[0];

    // 各プロパティが存在することを確認して、安全にアクセス
    if (item.title && item.link) {
      const article: FetchedArticle = {
        title: item.title,
        url: item.link,
        content: item.description || "",
      };

      console.log(`Fetched article: ${article.title}`);

      // コンテキストに記事を追加し、ログも追加
      const updatedCtx = {
        ...ctx,
        article,
      };

      return addLog(updatedCtx, {
        step: "fetch",
        agent: "RSSFetcher",
        note: `Fetched ${item.title}`
      });
    } else {
      console.log("First article is missing required fields");
      return addLog(ctx, {
        step: "fetch",
        agent: "RSSFetcher",
        note: "First article is missing required fields"
      });
    }

  } catch (error) {
    console.error("Error in fetchTechCrunchRSS:", error);
    return addLog(ctx, {
      step: "fetch",
      agent: "RSSFetcher",
      note: `Error fetching RSS: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}