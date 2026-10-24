import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const cookieName = "suizhi_visitor_session";
export const lifetime = 8 * 60 * 60;
export function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      ...headers,
    },
  });
}
export function passwordMatches(value) {
  return secretMatches(value, process.env.VISITOR_PASSWORD);
}
export function secretMatches(value, expected) {
  if (!expected || typeof value !== "string") return false;
  const digest = (text) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(value), digest(expected));
}
async function sessionStore(store) {
  if (store) return store;
  const { getStore } = await import("@netlify/blobs");
  return getStore({
    name: "portfolio-visitor-sessions",
    consistency: "strong",
  });
}
function tokenFrom(request) {
  const token = (request.headers.get("Cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)
    ? token
    : null;
}
const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function createSession(store, now = Date.now()) {
  if (!process.env.VISITOR_PASSWORD)
    throw new Error("Missing visitor password");
  const token = randomBytes(32).toString("base64url");
  // Only a digest is stored: leaked storage keys cannot be replayed as cookies.
  await (
    await sessionStore(store)
  ).setJSON(hash(token), {
    exp: Math.floor(now / 1000) + lifetime,
    passwordVersion: hash(process.env.VISITOR_PASSWORD),
  });
  return token;
}
export function sessionCookie(token, secure = true) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? lifetime : 0}${secure ? "; Secure" : ""}`;
}
export async function hasVisitorSession(request, store, now = Date.now()) {
  if (!process.env.VISITOR_PASSWORD) return false;
  const token = tokenFrom(request);
  if (!token) return false;
  const sessions = await sessionStore(store);
  const data = await sessions.get(hash(token), { type: "json" });
  if (!data) return false;
  const seconds = Math.floor(now / 1000);
  const valid =
    Number.isSafeInteger(data.exp) &&
    data.exp > seconds &&
    data.exp <= seconds + lifetime &&
    data.passwordVersion === hash(process.env.VISITOR_PASSWORD);
  if (!valid) await sessions.delete(hash(token));
  return valid;
}
export async function revokeSession(request, store) {
  const token = tokenFrom(request);
  if (token) await (await sessionStore(store)).delete(hash(token));
}
export async function requireVisitor(request, store) {
  try {
    return (await hasVisitorSession(request, store))
      ? null
      : json({ error: "请先登录；如果登录已过期，请刷新页面重新进入。" }, 401);
  } catch {
    // Storage failure must never grant access or expose backend error details.
    return json({ error: "登录状态暂时无法验证，请稍后重试。" }, 503);
  }
}
