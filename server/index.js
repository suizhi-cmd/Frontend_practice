const express = require("express");
const dotenv = require("dotenv");
const path = require("node:path");

// 从本文件所在目录读取密钥配置
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT || 3000);

// 让后端可以接收 JSON 格式的消息
app.use(express.json({ limit: "16kb" }));

// 检查后端是否正常运行，不返回密钥
app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "后端运行正常" });
});

// 只公开前端目录，server 中的密钥文件不会作为网页提供
app.use(express.static(
    path.join(__dirname, "../personal_homepage"),
    { dotfiles: "deny" }
));

// 仅允许通过本机地址访问
app.listen(port, "127.0.0.1", () => {
    console.log(`打开个人主页：http://127.0.0.1:${port}/home.html`);
    console.log(`检查后端：http://127.0.0.1:${port}/api/health`);
});
// 接收网页的问题，再由后端调用 DeepSeek
app.post("/api/chat", async (req, res) => {
    const message = req.body?.message;

    // 检查输入，避免发送空消息或过长的内容
    if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 2000
    ) {
        return res.status(400).json({
            error: "请输入 1～2000 字的问题。"
        });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "后端尚未配置 API Key，请检查本地 .env。"
        });
    }

    try {
        const response = await fetch(
            "https://api.deepseek.com/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-flash",
                    messages: [
                        {
                            role: "system",
                            content:
                                "你是个人主页的介绍助手，请用友好的中文简短回答。" +
                                "已知主页主人是一名正在学习前端开发的大学生，" +
                                "喜欢编程和探索新技术，希望通过项目提升开发能力。" +
                                "关于主人的其他信息，如果没有提供，请明确说暂不了解，不要编造。"
                        },
                        {
                            role: "user",
                            content: message.trim()
                        }
                    ],
                    thinking: { type: "disabled" },
                    max_tokens: 500,
                    stream: false
                }),
                signal: AbortSignal.timeout(60000)
            }
        );

        // 只返回必要的错误提示，不把上游原始内容或密钥发给网页
        if (!response.ok) {
            console.error("DeepSeek 请求失败，状态码：", response.status);

            const tips = {
                401: "API Key 验证失败，请在本地检查密钥。",
                402: "DeepSeek 账户余额不足，请检查 API 平台余额。",
                429: "请求过于频繁，请稍后再试。"
            };

            return res.status(502).json({
                error: tips[response.status] || "DeepSeek 服务暂时不可用，请稍后再试。"
            });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;

        if (typeof reply !== "string" || !reply.trim()) {
            return res.status(502).json({
                error: "暂未收到有效回复，请重试。"
            });
        }

        res.json({ reply });
    } catch (error) {
        const timedOut = error.name === "TimeoutError";

        res.status(502).json({
            error: timedOut
                ? "等待回复超时，请稍后重试。"
                : "连接 DeepSeek 失败，请检查网络后重试。"
        });
    }
});