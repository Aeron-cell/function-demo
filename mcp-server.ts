import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tavily } from "@tavily/core";
import { z } from "zod";

// 创建 MCP 服务器实例
const server = new McpServer({
    name: "web-summary-server",
    version: "1.0.0",
    capabilities: {
        resources: {},  // 可添加资源，如果需要
        tools: {},      // 程序会自动注册下文的工具
    },
});
const tavilyApiKey = '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'
// 注册网页摘要工具
server.tool(
    "web_summary",
    "获取网页摘要",
    {
        url: z.string().url().describe("要摘要的网页 URL 地址"),
    },
    async ({ url }) => {
        try {
            const res = await fetch(url);
            const text = await res.text();
            // 简单摘要：这里只取前300字符示例
            console.log("🚀 ~ file: index.ts:24 ~ url:", url)
            const client = tavily({ apiKey: tavilyApiKey });
            const response = await client.extract([url], {});
            console.log("🚀 ~ file: index.ts:26 ~ response:", response)
            return {
                content: [
                    { type: "text", text: `网页摘要：${response.results[0].rawContent}` },
                ],
            };
        } catch (e) {
            return {
                content: [
                    { type: "text", text: `网页加载失败：${e}` },
                ],
            };
        }
    }
);

// 启动 MCP 服务器：通过标准输入输出监听客户端请求
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCP 服务器已启动，等待客户端调用...");
}

main().catch((err) => {
    console.error("服务器启动失败:", err);
    process.exit(1);
});
