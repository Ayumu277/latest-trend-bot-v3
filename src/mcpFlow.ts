import { internalAction } from "../convex/_generated/server";
import { internal } from "../convex/_generated/api";
import { SharedContext } from "./lib/context";
import { fetchTechCrunchRSS } from "./lib/fetchers";
import { analyzeArticle } from "./lib/mastraPipeline";
import { saveToNotion } from "./lib/notion";

/**
 * MCP (Multi-step Context Processing) フローを実行する内部アクション
 * RSS取得 → AI分析 → Notion保存の一連の処理を SharedContext で管理します
 * @returns MCPログの配列
 */
export const runMcpFlow = internalAction({
  args: {},
  handler: async (ctx, args) => {
    console.log("🚀 MCP Flow 開始");

    // 1. 初期コンテキストを作成
    let sharedCtx: SharedContext = { mcpLog: [] };

    try {
      // 2. 順次実行: RSS取得 → AI分析 → Notion保存
      console.log("📡 Step 1: RSS取得中...");
      sharedCtx = await fetchTechCrunchRSS(sharedCtx);

      console.log("🤖 Step 2: AI分析中...");
      sharedCtx = await analyzeArticle(sharedCtx);

      console.log("💾 Step 3: Notion保存中...");
      sharedCtx = await saveToNotion(sharedCtx);

      console.log("✅ MCP Flow 完了");

    } catch (error) {
      console.error("❌ MCP Flow エラー:", error);
      throw error;
    }

    // 3. MCPログを人間が読める形式でコンソールに出力
    console.log("\n📋 === MCP Process Log ===");
    sharedCtx.mcpLog.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString('ja-JP');
      console.log(`${index + 1}. [${timestamp}] ${entry.step} | ${entry.agent}`);
      console.log(`   📝 ${entry.note}`);
    });
    console.log("========================\n");

    // 4. MCPログを結果として返す
    return sharedCtx.mcpLog;
  },
});