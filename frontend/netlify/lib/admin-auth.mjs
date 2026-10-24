import { createHash } from "node:crypto";
import { secretMatches } from "./visitor-auth.mjs";

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};
async function reserve(store, key, limit, now, windowMs = 600000) {
  const bucket = Math.floor(now / windowMs);
  for (let attempt = 0; attempt < 10; attempt++) {
    const old = await store.getWithMetadata(key, { type: "json" });
    const count = old?.data?.bucket === bucket ? old.data.count : 0;
    if (count >= limit)
      fail(
        windowMs === 600000
          ? "管理验证太频繁，请 10 分钟后重试。"
          : "管理验证繁忙，请稍后重试。",
        429,
      );
    const result = await store.setJSON(
      key,
      { bucket, count: count + 1, windowMs },
      old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
    );
    if (result.modified) return;
  }
  fail("管理验证繁忙，请稍后重试。", 429);
}
export async function authorizeAdmin(
  request,
  context,
  store,
  now = Date.now(),
) {
  const secret = process.env.PROFILE_EDIT_PASSWORD;
  if (!secret) fail("管理服务尚未配置完成。", 503);
  try {
    if (!store) {
      const { getStore } = await import("@netlify/blobs");
      store = getStore({
        name: "portfolio-admin-limits",
        consistency: "strong",
      });
    }
    const identity = createHash("sha256")
      .update(context?.ip || "unknown")
      .digest("hex");
    // All management routes share these counters, preventing endpoint hopping.
    await reserve(store, `ip-${identity}`, 20, now);
    // Count BEFORE comparison. A short global window limits distributed
    // guessing without imposing a ten-minute global lockout on the owner.
    await reserve(store, "attempts-global", 40, now, 1000);
    if (!secretMatches(request.headers.get("X-Edit-Password"), secret)) {
      fail("管理密码错误。", 401);
    }
  } catch (error) {
    if (error.status) throw error;
    fail("管理验证暂时不可用，请稍后重试。", 503);
  }
}
