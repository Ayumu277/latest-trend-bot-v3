"use node";

// convex/lib/fetchers.ts
import { XMLParser } from "fast-xml-parser";

// TechCrunchのRSSフィードのURL
const TECHCRUNCH_FEED_URL = "https://techcrunch.com/feed/";

// Reddit APIエンドポイント（複数のサブレディット）
const REDDIT_SUBREDDITS = [
  "https://www.reddit.com/r/technology/hot.json?limit=2",
  "https://www.reddit.com/r/programming/hot.json?limit=1",
  "https://www.reddit.com/r/artificial/hot.json?limit=1"
];

// 取得した記事の型を定義しておくと、後々便利です
export type FetchedArticle = {
  source: "TechCrunch" | "Reddit";
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
    // 最新2件に絞って返す
    return articles.slice(0, 2);

  } catch (error) {
    console.error("Error in fetchTechCrunchRSS:", error);
    // エラーが発生した場合は空の配列を返す
    return [];
  }
}

/**
 * RedditのJSONエンドポイントから最新記事のリストを取得します。
 * 複数のサブレディットから合計3件の記事を取得します。
 * @returns 取得した記事データの配列
 */
export async function fetchRedditPosts(): Promise<FetchedArticle[]> {
  try {
    console.log("Fetching Reddit posts...");
    const articles: FetchedArticle[] = [];

    for (const subredditUrl of REDDIT_SUBREDDITS) {
      try {
        const response = await fetch(subredditUrl, {
          headers: {
            'User-Agent': 'TrendBot/1.0 (by /u/trendbot)'
          }
        });

        if (!response.ok) {
          console.error(`HTTP error for ${subredditUrl}! status: ${response.status}`);
          continue;
        }

        const jsonData = await response.json();

        // Redditレスポンスの構造: data.children[].data
        const posts = jsonData?.data?.children || [];

        for (const post of posts) {
          const postData = post.data;

          // スティッキーポストや削除されたポストをスキップ
          if (postData.stickied || postData.removed || !postData.title) {
            continue;
          }

          articles.push({
            source: "Reddit",
            title: postData.title,
            sourceUrl: `https://www.reddit.com${postData.permalink}`,
            content: postData.selftext || postData.title,
          });
        }
      } catch (error) {
        console.error(`Error fetching from subreddit ${subredditUrl}:`, error);
        continue;
      }
    }

    console.log(`Fetched ${articles.length} articles from Reddit.`);
    // 最新3件に絞って返す
    return articles.slice(0, 3);

  } catch (error) {
    console.error("Error in fetchRedditPosts:", error);
    // エラーが発生した場合は空の配列を返す
    return [];
  }
}