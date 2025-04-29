import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as dotenv from "dotenv";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import readline from "readline";

dotenv.config();
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw new Error("未设置 OPENAI_API_KEY");

const client = new Client({ name: "mcp-client", version: "1.0.0" });

async function runClient(serverPath: string) {
    // 连接到 MCP 服务器
    const transport = new StdioClientTransport({ command: "node", args: [serverPath] });
    await client.connect(transport);
    console.log("已连接到 MCP 服务器，工具列表：", (await client.listTools()).tools.map(t => t.name));

    // 简单的交互式对话循环
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("输入 'quit' 退出。");
    while (true) {
        const query: string = await new Promise(res => rl.question("输入查询：", res));
        if (query.toLowerCase() === "quit") break;
        const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: openaiApiKey
        });
        // MCP 会在模型回答中插入调用工具的指令（content.type 为 "tool_use"）
        const message: ChatCompletionMessageParam[] = [{ role: "user", content: query }];
        const result = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: message,
        });
        console.log("🚀 ~ file: index.ts:32 ~ result:", result, 'content', result.choices[0].message.content)

        // 处理模型输出：如果有工具调用，则执行并反馈
        // let finalAnswer = "";
        // for (const content of result.choices) {
        //     if (content.type === "text") {
        //         finalAnswer += content.text;
        //     } else if (content.type === "tool_use") {
        //         const toolName = content.name!;
        //         const args = content.input as Record<string, any> || {};
        //         console.log(`模型请求工具 ${toolName}，参数：`, args);

        //         // 调用 MCP 工具
        //         const toolResult = await client.callTool({ name: toolName, arguments: args });
        //         const toolText = toolResult.content as string;
        //         console.log(`工具返回：${toolText}`);

        //         // 将工具结果当作用户消息反馈给模型
        //         anthMessage.push({ role: "assistant", content: content.text }); // 模型提出调用工具
        //         anthMessage.push({ role: "user", content: toolText });         // 工具结果作为用户输入

        //         // 让模型根据新信息继续对话
        //         const next = await anthropic.messages.create({
        //             model: "claude-3-5-sonnet-20241022",
        //             max_tokens: 500,
        //             messages: anthMessage,
        //         });
        //         for (const n of next.content) {
        //             if (n.type === "text") finalAnswer += n.text;
        //         }
        //     }
        // }
        console.log("\n模型回答：", result.choices[0].message.content);
    }
    rl.close();
    await client.close();
}

// 命令行参数：传入服务器脚本路径
const serverScript = process.argv[2];
if (!serverScript) {
    console.log("用法: npm run start <服务器构建脚本路径>");
    process.exit(1);
}
runClient(serverScript).catch(console.error);
