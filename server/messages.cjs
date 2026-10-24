const path = require("node:path");
const { pathToFileURL } = require("node:url");
const createMessageStore = require("./message-store.cjs");

module.exports = function installMessages(app) {
  const service = import(
    pathToFileURL(
      path.join(__dirname, "../frontend/netlify/lib/messages-service.mjs"),
    ).href
  );
  const stores = new Map();
  function getStore({ name }) {
    if (!stores.has(name))
      stores.set(
        name,
        createMessageStore(path.join(__dirname, ".local-messages"), name),
      );
    return stores.get(name);
  }
  // Mounted after visitor and shared administrator middleware in index.js.
  app.all(["/api/messages", "/api/messages/reply"], async (req, res) => {
    try {
      const parsed = new URL(req.originalUrl, "http://localhost");
      parsed.pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase();
      const headers = { "Content-Type": req.get("Content-Type") || "" };
      const options = { method: req.method, headers };
      if (!["GET", "HEAD"].includes(req.method) && req.body !== undefined)
        options.body = JSON.stringify(req.body);
      const { handleMessages } = await service;
      const response = await handleMessages(
        new Request(parsed, options),
        { ip: req.ip },
        {
          getStore,
          // Local shared middleware has already authorized this exact action.
          authorizeAdmin: async () => {},
        },
      );
      for (const [key, value] of response.headers) res.set(key, value);
      res.status(response.status).send(await response.text());
    } catch {
      res.status(503).json({ error: "本地留言服务暂时不可用，请稍后重试。" });
    }
  });
};
