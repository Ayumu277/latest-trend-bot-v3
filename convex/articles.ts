"use node";

import { action } from "./_generated/server";

// 必要なモジュールをインポート
import { fetchTechCrunchRSS, fetchRedditPosts } from "./lib/fetchers";
import { analysisPipeline } from "./lib/mastraPipeline";
import { createNotionPage, testNotionConnection } from "./lib/notion"; // testNotionConnectionを追加

// Notion接続テスト用のアクション
export const testNotion = action({
  args: {},
  handler: async (ctx) => {
    console.log("Notion接続テストを開始します...");
    try {
      const result = await testNotionConnection();
      console.log("接続テスト結果:", result);
      return result;
    } catch (error) {
      console.error("接続テスト失敗:", error);
      throw error;
    }
  },
});

export const fetchAndAnalyze = action({
  args: {},
  handler: async (ctx) => {
    console.log("手動実行アクションが開始されました！");

    // TechCrunchとRedditから記事を並行して取得
    console.log("TechCrunchとRedditから記事を取得中...");
    const [techCrunchArticles, redditArticles] = await Promise.all([
      fetchTechCrunchRSS(),
      fetchRedditPosts()
    ]);

    // 全記事をまとめる
    const allArticles = [...techCrunchArticles, ...redditArticles];
    console.log(`合計${allArticles.length}件の記事を取得しました。(TechCrunch: ${techCrunchArticles.length}件, Reddit: ${redditArticles.length}件)`);

    for (const article of allArticles) {
      console.log(`Analyzing: ${article.title} (from ${article.source})`);
      try {
        const analysisResult = await analysisPipeline(
          article.content || article.title
        );

        // ★★★ 保存先をNotionに変更 ★★★
        await createNotionPage({
          title: article.title,
          sourceUrl: article.sourceUrl,
          source: article.source,
          summary: analysisResult.summary,
          sampleCode: analysisResult.sampleCode,
        });

      } catch (error) {
        console.error(`===== ERROR during processing article =====`);
        console.error(`Failed Article Title: ${article.title}`);
        console.error(`Failed Article Source: ${article.source}`);
        console.error(`Full Error Object:`, error);
        console.error(`=========================================`);
      }
    }

    console.log("アクションが完了しました。");
    return `全処理が正常に完了しました。TechCrunch ${techCrunchArticles.length}件、Reddit ${redditArticles.length}件の記事を処理しました。Notionを確認してください。`;
  },
});

// Convex DB用のヘルパーは不要になったので削除します