import * as dotenv from "dotenv";
import { tavily } from '@tavily/core';
dotenv.config();
const tavilyApiKey = process.env.TAVILY_API_KEY;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("未设置 OPENAI_API_KEY");
// 示例工具函数（需要在你的代码中实现具体逻辑）
const tools = {
    get_current_content: {
        description: "获取当前页面摘要",
        parameters: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "网页地址"
                }
            },
            required: ["url"]
        },
        execute: async ({ url }: { url: string }) => {
            console.log("🚀 ~ file: index.ts:24 ~ url:", url)
            const client = tavily({ apiKey: tavilyApiKey });
            const response = await client.extract([url], {});
            console.log("🚀 ~ file: index.ts:26 ~ response:", response)
            return response;
        }
    },
};

// 主调用函数
async function deepSeekFunctionCalling(userInput: string) {
    try {
        // 1. 调用 DeepSeek API
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: userInput }],
                tools: Object.entries(tools).map(([name, tool]) => ({
                    type: "function",
                    function: {
                        name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }))
            })
        });

        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);

        const data = await response.json();
        const toolCall = data.choices[0].message.tool_calls?.[0];
        console.log("🚀 ~ file: index.ts:60 ~ toolCall:", toolCall)

        // 2. 处理 Function Calling 响应
        if (toolCall) {
            const functionName = toolCall.function.name;
            const parameters = JSON.parse(toolCall.function.arguments);

            if (!tools[functionName as keyof typeof tools]) {
                throw new Error(`未定义的函数: ${functionName}`);
            }

            // 3. 执行对应函数
            const result = await tools[functionName as keyof typeof tools].execute(parameters);
            return { success: true, result };
        }

        // 没有触发 Function Calling 时返回普通响应
        return {
            success: true,
            result: data.choices[0].message.content
        };

    } catch (error) {
        console.error("调用失败:", error);
        return {
            success: false,
            error: "未知错误"
        };
    }
}

// 使用示例
async function handleUserQuery() {
    const response = await deepSeekFunctionCalling("https://react.pixijs.io/components/application/");
    if (response.success) {
        console.log("结果:", response.result);
    } else {
        console.error("错误:", response.error);
    }
}

handleUserQuery();

