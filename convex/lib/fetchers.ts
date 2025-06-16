"use node";

// convex/lib/fetchers.ts
import { XMLParser } from "fast-xml-parser";

// TechCrunchのRSSフィードのURL
const TECHCRUNCH_FEED_URL = "https://techcrunch.com/feed/";

// 取得した記事の型を定義しておくと、後々便利です
export type FetchedArticle = {
  source: "TechCrunch";
  title: string;
  sourceUrl: string;
  content?: string;
};

/**
 * TechCrunchのRSSフィードから最新記事のリストを取得します。
 * XML解析ライブラリを使い、より確実に情報を抜き出します。
 * @returns 取得した記事データの配列
 */
export async function fetchTechCrunchRSS(): Promise<FetchedArticle[]> {
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

    const articles: FetchedArticle[] = [];

    // パースされたオブジェクトから記事の配列を取得
    // RSSの標準的な構造 `rss.channel.item` を参照
    const items = parsedXml?.rss?.channel?.item || [];

    for (const item of items) {
      // 各プロパティが存在することを確認して、安全にアクセス
      if (item.title && item.link) {
        articles.push({
          source: "TechCrunch",
          title: item.title,
          sourceUrl: item.link,
          content: item.description || undefined,
        });
      }
    }

    console.log(`Fetched ${articles.length} articles from TechCrunch.`);
    // 最新5件に絞って返す
    return articles.slice(0, 5);

  } catch (error) {
    console.error("Error in fetchTechCrunchRSS:", error);
    // エラーが発生した場合は空の配列を返す
    return [];
  }
}