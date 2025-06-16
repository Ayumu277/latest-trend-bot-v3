// Types that should be imported from other modules
interface FetchedArticle {
  title: string;
  url: string;
  content: string;
  // Add other properties as needed
}

interface AnalysisResult {
  summary: string;
  sampleCode: string;
  // Add other properties as needed
}

export interface McpLogEntry {
  step: "fetch" | "analyze" | "save";
  timestamp: number;
  agent: string;
  note: string;
}

export interface SharedContext {
  article?: FetchedArticle;
  analysis?: AnalysisResult;
  mcpLog: McpLogEntry[];
}

export function addLog(
  ctx: SharedContext,
  entry: Omit<McpLogEntry, "timestamp">
): SharedContext {
  const newEntry: McpLogEntry = {
    ...entry,
    timestamp: Date.now(),
  };

  return {
    ...ctx,
    mcpLog: [...ctx.mcpLog, newEntry],
  };
}