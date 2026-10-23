import { requireVisitor } from "../lib/visitor-auth.mjs";
import { getStore } from "@netlify/blobs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function text(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${label}需要填写 1～${max} 字。`);
  return value.trim();
}
async function update(store, key, change) {
  for (let i = 0; i < 5; i++) {
    const old = await store.getWithMetadata(key, { type: "json" });
    const result = change(old?.data);
    const write = await store.setJSON(
      key,
      result,
      old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
    );
    if (write.modified) return result;
  }
  fail("当前操作较多，请稍后刷新查看结果。", 409);
}
async function rateLimit(store, identity, admin = false) {
  const now = Date.now();
  const window = Math.floor(now / (admin ? 600000 : 3600000));
  const minute = Math.floor(now / 60000);
  await update(
    store,
    `${admin ? "admin" : "visitor"}-${identity}`,
    (previous) => {
      const total = previous?.window === window ? previous.total : 0;
      const recent = previous?.minute === minute ? previous.recent : 0;
      if (total >= (admin ? 20 : 10) || (!admin && recent >= 3)) {
        fail(
          admin
            ? "管理操作太频繁，请稍后再试。"
            : "留言太频繁，请稍后再试；每分钟最多 3 条，每小时最多 10 条。",
          429,
        );
      }
      return { window, minute, total: total + 1, recent: recent + 1 };
    },
  );
}
function authorize(request, secret) {
  const actual = Buffer.from(request.headers.get("X-Edit-Password") || "");
  const correct = Buffer.from(secret);
  if (actual.length !== correct.length || !timingSafeEqual(actual, correct))
    fail("管理密码错误。", 401);
}

async function handleRequest(request, context) {
  const url = new URL(request.url);
  const path = url.pathname;
  const methods = {
    "/api/messages": ["GET", "POST", "DELETE"],
    "/api/messages/reply": ["POST"],
  };
  if (!methods[path]) return json({ error: "接口不存在。" }, 404);
  if (!methods[path].includes(request.method))
    return json({ error: "不支持这个请求方式。" }, 405);
  try {
    const store = getStore({
      name: "portfolio-messages",
      consistency: "strong",
    });
    if (request.method === "GET") {
      const rawOffset = url.searchParams.get("offset") ?? "0";
      if (!/^\d{1,6}$/.test(rawOffset)) fail("分页位置不正确。");
      const offset = Number(rawOffset);
      const messages = (await store.get("messages", { type: "json" })) ?? [];
      return json({
        messages: messages.slice(offset, offset + 20),
        total: messages.length,
      });
    }
    const secret = process.env.PROFILE_EDIT_PASSWORD;
    if (!secret) fail("留言服务尚未配置完成。", 503);
    const identity = createHmac("sha256", secret)
      .update(context?.ip || "unknown")
      .digest("hex");
    const limits = getStore({
      name: "portfolio-message-limits",
      consistency: "strong",
    });
    const admin = request.method === "DELETE" || path === "/api/messages/reply";
    if (admin) {
      await rateLimit(limits, identity, true);
      authorize(request, secret);
    }
    if (
      !(request.headers.get("Content-Type") || "")
        .toLowerCase()
        .includes("application/json")
    )
      fail("请求格式不正确。", 415);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16 * 1024) fail("内容过大。", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      fail("请求格式不正确。");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      fail("请求格式不正确。");
    if (!admin) {
      const messageText = text(body.text, 1000, "留言");
      const name =
        body.name === undefined || body.name === ""
          ? "访客"
          : text(body.name, 30, "昵称");
      if (typeof body.id !== "string" || !uuid.test(body.id))
        fail("留言编号不正确，请刷新重试。");
      await rateLimit(limits, identity);
      const message = {
        id: body.id,
        name,
        text: messageText,
        time: new Date().toISOString(),
        replies: [],
      };
      const list = await update(store, "messages", (previous = []) => {
        if (previous.some((item) => item.id === message.id)) return previous;
        if (previous.length >= 500) fail("留言板已满，请等待站主整理。", 409);
        return [message, ...previous];
      });
      return json(
        { message: list.find((item) => item.id === message.id) },
        201,
      );
    }
    if (typeof body.messageId !== "string" || !uuid.test(body.messageId))
      fail("留言编号不正确。");
    if (path === "/api/messages/reply") {
      if (typeof body.id !== "string" || !uuid.test(body.id))
        fail("回复编号不正确，请刷新重试。");
      const reply = {
        id: body.id,
        text: text(body.text, 1000, "回复"),
        time: new Date().toISOString(),
      };
      const list = await update(store, "messages", (previous = []) => {
        const message = previous.find((item) => item.id === body.messageId);
        if (!message) fail("这条留言已经不存在。", 404);
        if (message.replies.some((item) => item.id === reply.id))
          return previous;
        if (message.replies.length >= 10)
          fail("每条留言最多保留 10 条站主回复。");
        return previous.map((item) =>
          item.id === message.id
            ? { ...item, replies: [...item.replies, reply] }
            : item,
        );
      });
      return json({ message: list.find((item) => item.id === body.messageId) });
    }
    if (
      body.replyId !== undefined &&
      (typeof body.replyId !== "string" || !uuid.test(body.replyId))
    )
      fail("回复编号不正确。");
    await update(store, "messages", (previous = []) => {
      if (body.replyId)
        return previous.map((item) =>
          item.id === body.messageId
            ? {
                ...item,
                replies: item.replies.filter(
                  (reply) => reply.id !== body.replyId,
                ),
              }
            : item,
        );
      return previous.filter((item) => item.id !== body.messageId);
    });
    return json({ message: "已删除。" });
  } catch (error) {
    if (!error.status) console.error("留言服务异常：", error.name);
    return json(
      {
        error: error.status
          ? error.message
          : "留言服务暂时不可用，请稍后再试。",
      },
      error.status || 500,
    );
  }
}

export const config = { path: ["/api/messages", "/api/messages/reply"] };

export default async function handler(request, context) {
  const rejected = requireVisitor(request);
  if (rejected) return rejected;
  const response = await handleRequest(request, context);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
