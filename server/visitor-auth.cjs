// 本地 Express 的登录适配；线上由 Netlify auth.mjs 提供同样的接口。
const { rateLimit } = require("express-rate-limit");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

function validOrigin(req) {
  const origin = req.get("Origin");
  if (!origin) return true;
  if (origin === `${req.protocol}://${req.get("Host")}`) return true;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

module.exports = function installVisitorAuth(app) {
  const helpers = import(
    pathToFileURL(
      path.join(__dirname, "../frontend/netlify/lib/visitor-auth.mjs"),
    ).href
  );
  const sessions = require("./security-store.cjs")();
  const adminLimits = require("./security-store.cjs")();
  const adminHelpers = import(
    pathToFileURL(
      path.join(__dirname, "../frontend/netlify/lib/admin-auth.mjs"),
    ).href
  );
  const limiter = rateLimit({
    windowMs: 600000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "尝试次数过多，每 10 分钟最多 20 次，请稍后再试。" },
  });
  app.get("/api/auth/session", async (req, res, next) => {
    try {
      const auth = await helpers;
      if (!process.env.VISITOR_PASSWORD)
        return res
          .status(503)
          .json({ error: "请在本地 .env 设置 VISITOR_PASSWORD。" });
      res.set("Cache-Control", "no-store");
      res.json({
        authenticated: await auth.hasVisitorSession(
          new Request("http://localhost", {
            headers: { Cookie: req.headers.cookie || "" },
          }),
          sessions,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/auth/login", limiter, async (req, res, next) => {
    try {
      const auth = await helpers;
      if (!validOrigin(req))
        return res.status(403).json({ error: "请求来源不正确。" });
      if (!process.env.VISITOR_PASSWORD)
        return res
          .status(503)
          .json({ error: "请在本地 .env 设置 VISITOR_PASSWORD。" });
      const password = req.body?.password;
      if (
        typeof password !== "string" ||
        !password.trim() ||
        password.length > 256
      )
        return res.status(400).json({ error: "请填写有效的访问密码。" });
      if (!auth.passwordMatches(password))
        return res.status(401).json({ error: "访问密码不正确，请重新输入。" });
      res.set("Cache-Control", "no-store");
      res.set(
        "Set-Cookie",
        auth.sessionCookie(await auth.createSession(sessions), req.secure),
      );
      res.json({ authenticated: true });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      const auth = await helpers;
      if (!validOrigin(req))
        return res.status(403).json({ error: "请求来源不正确。" });
      await auth.revokeSession(
        new Request("http://localhost", {
          headers: { Cookie: req.headers.cookie || "" },
        }),
        sessions,
      );
      res.set("Set-Cookie", auth.sessionCookie("", req.secure));
      res.set("Cache-Control", "no-store");
      res.json({ message: "已退出登录。" });
    } catch (error) {
      next(error);
    }
  });
  app.use(["/api", "/uploads"], async (req, res, next) => {
    try {
      const auth = await helpers;
      const rejected = await auth.requireVisitor(
        new Request("http://localhost", {
          headers: { Cookie: req.headers.cookie || "" },
        }),
        sessions,
      );
      res.set("Cache-Control", "private, no-store");
      res.vary("Cookie");
      if (rejected)
        return res.status(rejected.status).json(await rejected.json());
      next();
    } catch {
      res.status(503).json({ error: "登录状态暂时无法验证，请稍后重试。" });
    }
  });
  app.use("/api", async (req, res, next) => {
    // Match Express's case-insensitive and optional trailing-slash routing.
    const route = req.originalUrl
      .split("?")[0]
      .replace(/\/+$/, "")
      .toLowerCase();
    const management =
      (req.method === "PUT" &&
        ["/api/profile", "/api/photos"].includes(route)) ||
      (req.method === "POST" &&
        ["/api/photos/upload", "/api/messages/reply"].includes(route)) ||
      (req.method === "DELETE" && route === "/api/messages");
    if (!management) return next();
    try {
      const { authorizeAdmin } = await adminHelpers;
      await authorizeAdmin(
        new Request("http://localhost", {
          headers: { "X-Edit-Password": req.get("X-Edit-Password") || "" },
        }),
        { ip: req.ip },
        adminLimits,
      );
      next();
    } catch (error) {
      res
        .status(error.status || 503)
        .json({ error: error.status ? error.message : "管理验证暂时不可用。" });
    }
  });
};
