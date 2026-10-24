import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  mkdir,
  writeFile,
  readFile,
  copyFile,
  mkdtemp,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";

const project = process.env.SECURITY_PROJECT || "E:/progs/Frontend_practice";
const base = new URL("../", import.meta.url);
const frontendRequire = createRequire(`${project}/frontend/package.json`);
const serverRequire = createRequire(`${project}/server/package.json`);
const mockURL = new URL("./mock-blobs.mjs", import.meta.url).href;
const dependencyURLs = new Map(
  ["express", "dotenv", "multer", "sharp", "express-rate-limit"].map((name) => [
    name,
    pathToFileURL(
      (name === "sharp" ? frontendRequire : serverRequire).resolve(name),
    ).href,
  ]),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@netlify/blobs")
      return { url: mockURL, shortCircuit: true };
    if (
      ["express", "dotenv", "multer", "sharp", "express-rate-limit"].includes(
        specifier,
      )
    ) {
      return { url: dependencyURLs.get(specifier), shortCircuit: true };
    }
    // Initial data imports are read from the real project, never environment files.
    if (specifier.startsWith("../../data/"))
      return {
        url: pathToFileURL(
          `${project}/frontend/data/${specifier.split("/").at(-1)}`,
        ).href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});

class Store {
  rows = new Map();
  revision = 0;
  async get(key) {
    return structuredClone(this.rows.get(key)?.data ?? null);
  }
  async getWithMetadata(key) {
    const row = this.rows.get(key);
    return row ? structuredClone(row) : null;
  }
  async setJSON(key, data, conditions = {}) {
    const old = this.rows.get(key);
    if (
      (conditions.onlyIfNew && old) ||
      (conditions.onlyIfMatch !== undefined &&
        conditions.onlyIfMatch !== old?.etag)
    )
      return { modified: false };
    this.rows.set(key, {
      data: structuredClone(data),
      etag: String(++this.revision),
    });
    return { modified: true };
  }
  async set(key, data) {
    return this.setJSON(key, data);
  }
  async delete(key) {
    this.rows.delete(key);
  }
  async *list() {
    const keys = [...this.rows.keys()];
    for (let i = 0; i < keys.length; i += 37)
      yield { blobs: keys.slice(i, i + 37).map((key) => ({ key })) };
  }
}
globalThis.securityTestStores = new Map();
const stores = globalThis.securityTestStores;
for (const name of [
  "portfolio-visitor-sessions",
  "portfolio-admin-limits",
  "portfolio-login-limits",
  "portfolio-content",
  "portfolio-images",
  "portfolio-messages",
  "portfolio-message-limits",
])
  stores.set(name, new Store());
process.env.VISITOR_PASSWORD = "synthetic-visitor-test-password";
process.env.PROFILE_EDIT_PASSWORD = "synthetic-admin-test-password";
process.env.SKIP_DOTENV = "1";
const auth = await import(
  new URL("frontend/netlify/lib/visitor-auth.mjs", base)
);
const { authorizeAdmin } = await import(
  new URL("frontend/netlify/lib/admin-auth.mjs", base)
);
const { reserveImageSlot } = await import(
  new URL("frontend/netlify/lib/image-quota.mjs", base)
);
const req = (cookie, extra = {}) =>
  new Request("https://example.test/api/profile", {
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...extra },
  });
const cookieFor = async () =>
  `${auth.cookieName}=${await auth.createSession()}`;

await test("会话：随机令牌、伪造拒绝、注销、过期和密码轮换", async () => {
  const a = await cookieFor(),
    b = await cookieFor();
  assert.notEqual(a, b);
  assert.equal(await auth.hasVisitorSession(req(a)), true);
  assert.equal(
    await auth.hasVisitorSession(req(`${auth.cookieName}=${"A".repeat(43)}`)),
    false,
  );
  assert.equal(
    await auth.hasVisitorSession(req(`${auth.cookieName}=legacy.signature`)),
    false,
  );
  await auth.revokeSession(req(a));
  assert.equal(await auth.hasVisitorSession(req(a)), false);
  assert.equal(await auth.hasVisitorSession(req(b)), true);
  process.env.VISITOR_PASSWORD += "-rotated";
  assert.equal(await auth.hasVisitorSession(req(b)), false);
  const clock = Date.now();
  const expired = await auth.createSession(undefined, clock - 9 * 3600000);
  assert.equal(
    await auth.hasVisitorSession(req(`${auth.cookieName}=${expired}`)),
    false,
  );
  const broken = {
    get() {
      throw new Error("synthetic storage failure");
    },
  };
  assert.equal(
    (await auth.requireVisitor(req(await cookieFor()), broken)).status,
    503,
  );
});

await test("管理鉴权：跨接口共享限流、窗口恢复、不同 IP 隔离", async () => {
  const store = new Store();
  const clock = Date.now();
  const wrong = req(null, { "X-Edit-Password": "wrong" });
  for (let i = 0; i < 20; i++)
    await assert.rejects(
      authorizeAdmin(wrong, { ip: "test-a" }, store, clock),
      { status: 401 },
    );
  await assert.rejects(
    authorizeAdmin(
      req(null, { "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD }),
      { ip: "test-a" },
      store,
      clock,
    ),
    { status: 429 },
  );
  await authorizeAdmin(
    req(null, { "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD }),
    { ip: "test-b" },
    store,
    clock,
  );
  await assert.rejects(
    authorizeAdmin(wrong, { ip: "test-a" }, store, clock + 600000),
    { status: 401 },
  );
  const distributed = new Store();
  for (let i = 0; i < 40; i++)
    await assert.rejects(
      authorizeAdmin(wrong, { ip: `distributed-${i}` }, distributed, clock),
      { status: 401 },
    );
  await assert.rejects(
    authorizeAdmin(wrong, { ip: "new-ip" }, distributed, clock),
    { status: 429 },
  );
  await assert.rejects(
    authorizeAdmin(
      req(null, { "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD }),
      { ip: "owner" },
      distributed,
      clock,
    ),
    { status: 429 },
  );
  await authorizeAdmin(
    req(null, { "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD }),
    { ip: "owner" },
    distributed,
    clock + 1000,
  );
});

await test("管理鉴权：并发不超额，存储失败时拒绝访问", async () => {
  const store = new Store();
  const request = req(null, {
    "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD,
  });
  const results = await Promise.allSettled(
    Array.from({ length: 50 }, () =>
      authorizeAdmin(request, { ip: "parallel" }, store),
    ),
  );
  assert.ok(results.filter((x) => x.status === "fulfilled").length <= 20);
  assert.ok(results.some((x) => x.status === "rejected"));
  await assert.rejects(
    authorizeAdmin(
      request,
      {},
      {
        getWithMetadata() {
          throw new Error("offline");
        },
      },
    ),
    { status: 503 },
  );
});

await test("累计图片配额：分页统计已有图片，移出清单不能重置，并发不超额", async () => {
  const content = new Store(),
    images = new Store();
  for (let i = 0; i < 199; i++) await images.setJSON(`${i}.webp`, {});
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => reserveImageSlot(content, images)),
  );
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  await content.setJSON("photos", []);
  await assert.rejects(reserveImageSlot(content, images), { status: 409 });
  assert.equal((await content.get("image-upload-quota")).count, 200);
});

const login = (
  await import(new URL("frontend/netlify/functions/auth.mjs", base))
).default;
const profile = (
  await import(new URL("frontend/netlify/functions/public-data.mjs", base))
).default;
const photos = (
  await import(new URL("frontend/netlify/functions/photos.mjs", base))
).default;
const messages = (
  await import(new URL("frontend/netlify/functions/messages.mjs", base))
).default;
const chat = (
  await import(new URL("frontend/netlify/functions/chat.mjs", base))
).default;
const netReq = (path, method = "GET", cookie, body, password) =>
  new Request(`https://example.test${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(password !== undefined ? { "X-Edit-Password": password } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

await test("Netlify：未登录无法访问全部业务接口；登录、退出、旧会话重放", async () => {
  for (const [handler, path] of [
    [profile, "/api/profile"],
    [photos, "/api/photos"],
    [messages, "/api/messages"],
    [chat, "/api/chat"],
  ]) {
    assert.equal(
      (await handler(netReq(path), { ip: "anonymous" })).status,
      401,
    );
  }
  const result = await login(
    netReq("/api/auth/login", "POST", null, {
      password: process.env.VISITOR_PASSWORD,
    }),
    { ip: "login-test" },
  );
  assert.equal(result.status, 200);
  const cookie = result.headers.get("Set-Cookie").split(";")[0];
  assert.match(
    result.headers.get("Set-Cookie"),
    /HttpOnly; SameSite=Lax;.*Secure/,
  );
  assert.equal(
    (await login(netReq("/api/auth/session", "GET", cookie))).status,
    200,
  );
  assert.equal(
    (await photos(netReq("/api/photos", "GET", cookie))).status,
    200,
  );
  assert.equal(
    (await login(netReq("/api/auth/logout", "POST", cookie))).status,
    200,
  );
  assert.equal(
    (await photos(netReq("/api/photos", "GET", cookie))).status,
    401,
  );
});

await test("Netlify：轮换资料/照片/留言接口仍共用同一管理尝试额度", async () => {
  const cookie = await cookieFor();
  const routes = [
    [profile, "/api/profile", "PUT"],
    [photos, "/api/photos", "PUT"],
    [photos, "/api/photos/upload", "POST"],
    [messages, "/api/messages/reply", "POST"],
    [messages, "/api/messages", "DELETE"],
  ];
  for (let i = 0; i < 20; i++) {
    const [handler, path, method] = routes[i % routes.length];
    assert.equal(
      (
        await handler(netReq(path, method, cookie, {}, "wrong"), {
          ip: "endpoint-hop",
        })
      ).status,
      401,
    );
  }
  for (const [handler, path, method] of routes)
    assert.equal(
      (
        await handler(
          netReq(path, method, cookie, {}, process.env.PROFILE_EDIT_PASSWORD),
          { ip: "endpoint-hop" },
        )
      ).status,
      429,
    );
});

await test("Netlify：留言发布/回复/删除及访客限流仍可用", async () => {
  const cookie = await cookieFor();
  const id = crypto.randomUUID();
  const result = await messages(
    netReq("/api/messages", "POST", cookie, {
      id,
      text: "<script>plain-text</script>",
    }),
    { ip: "message-visitor" },
  );
  assert.equal(result.status, 201);
  const reply = await messages(
    netReq(
      "/api/messages/reply",
      "POST",
      cookie,
      { messageId: id, id: crypto.randomUUID(), text: "test reply" },
      process.env.PROFILE_EDIT_PASSWORD,
    ),
    { ip: "owner-message" },
  );
  assert.equal(reply.status, 200);
  const removed = await messages(
    netReq(
      "/api/messages",
      "DELETE",
      cookie,
      { messageId: id },
      process.env.PROFILE_EDIT_PASSWORD,
    ),
    { ip: "owner-message" },
  );
  assert.equal(removed.status, 200);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await messages(
          netReq("/api/messages", "POST", cookie, {
            id: crypto.randomUUID(),
            text: "test",
          }),
          { ip: "message-visitor" },
        )
      ).status,
      201,
    );
  assert.equal(
    (
      await messages(
        netReq("/api/messages", "POST", cookie, {
          id: crypto.randomUUID(),
          text: "limited",
        }),
        { ip: "message-visitor" },
      )
    ).status,
    429,
  );
});

await test("Netlify：有效图片上传后可读，伪装 SVG/非图片文件被拒绝", async () => {
  const cookie = await cookieFor();
  const sharp = frontendRequire("sharp");
  const image = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  async function upload(bytes, type) {
    const form = new FormData();
    form.set("photo", new Blob([bytes], { type }), "test.png");
    form.set("title", "synthetic upload");
    return photos(
      new Request("https://example.test/api/photos/upload", {
        method: "POST",
        headers: {
          Cookie: cookie,
          "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD,
        },
        body: form,
      }),
      { ip: "image-owner" },
    );
  }
  assert.equal(
    (
      await upload(
        "<svg xmlns='http://www.w3.org/2000/svg' width='2' height='2'/>",
        "image/png",
      )
    ).status,
    400,
  );
  assert.equal((await upload("not an image", "image/png")).status, 400);
  const uploaded = await upload(image, "image/png");
  assert.equal(uploaded.status, 201);
  const data = await uploaded.json();
  const read = await photos(netReq(data.photo.src, "GET", cookie));
  assert.equal(read.status, 200);
  assert.equal(read.headers.get("Cache-Control"), "private, no-store");
});

await test("Express：图片鉴权、管理路径大小写/末尾斜杠、跨接口限流与注销", async () => {
  // Load only with synthetic env and a guard that prevents any dotenv access.
  const localRequire = createRequire(import.meta.url);
  const testFolder = fileURLToPath(new URL("./", import.meta.url));
  const scratch = await mkdtemp(path.join(testFolder, ".security-test-"));
  const scratchURL = pathToFileURL(scratch + path.sep);
  const localFiles = [
    "server/index.js",
    "server/visitor-auth.cjs",
    "server/security-store.cjs",
    "server/messages.cjs",
    "server/message-store.cjs",
    "frontend/netlify/lib/messages-service.mjs",
    "frontend/netlify/lib/visitor-auth.mjs",
    "frontend/netlify/lib/admin-auth.mjs",
  ];
  for (const file of localFiles) {
    const target = new URL(file, scratchURL);
    await mkdir(path.dirname(fileURLToPath(target)), { recursive: true });
    await copyFile(new URL(file, base), target);
  }
  const app = localRequire(
    fileURLToPath(new URL("server/index.js", scratchURL)),
  );
  const uploadDir = new URL("server/uploads/", scratchURL);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(new URL("synthetic-test.webp", uploadDir), "synthetic image");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(
      (await fetch(`${url}/uploads/synthetic-test.webp`)).status,
      401,
    );
    const loggedIn = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.VISITOR_PASSWORD }),
    });
    assert.equal(loggedIn.status, 200);
    const cookie = loggedIn.headers.get("Set-Cookie").split(";")[0];
    const image = await fetch(`${url}/uploads/synthetic-test.webp`, {
      headers: { Cookie: cookie },
    });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("Cache-Control"), "private, no-store");
    // The real Express entrypoint must expose the same message contract.
    const call = (route, method = "GET", body, password) =>
      fetch(url + route, {
        method,
        headers: {
          Cookie: cookie,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(password === undefined ? {} : { "X-Edit-Password": password }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    assert.equal((await fetch(`${url}/api/messages`)).status, 401);
    const empty = await call("/api/messages");
    assert.equal(empty.status, 200);
    assert.match(empty.headers.get("Content-Type"), /application\/json/);
    assert.deepEqual(await empty.json(), { messages: [], total: 0 });
    assert.equal(
      (
        await call("/api/messages", "POST", {
          id: crypto.randomUUID(),
          text: " ",
        })
      ).status,
      400,
    );
    const messageId = crypto.randomUUID();
    const posted = await call("/api/messages", "POST", {
      id: messageId,
      name: "test",
      text: "<b>text only</b>",
    });
    assert.equal(posted.status, 201);
    assert.equal((await posted.json()).message.text, "<b>text only</b>");
    const replyId = crypto.randomUUID();
    assert.equal(
      (
        await call(
          "/api/messages/reply",
          "POST",
          { messageId, id: replyId, text: "reply" },
          "wrong",
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/messages/reply",
          "POST",
          { messageId, id: replyId, text: "reply" },
          process.env.PROFILE_EDIT_PASSWORD,
        )
      ).status,
      200,
    );
    assert.equal((await call("/api/messages", "GET")).status, 200);
    assert.equal(
      (
        await call(
          "/api/messages",
          "DELETE",
          { messageId, replyId },
          process.env.PROFILE_EDIT_PASSWORD,
        )
      ).status,
      200,
    );
    const list = await (await call("/api/messages")).json();
    assert.equal(list.messages[0].replies.length, 0);
    const localStore = localRequire(
      fileURLToPath(new URL("server/message-store.cjs", scratchURL)),
    );
    const persisted = localStore(
      fileURLToPath(new URL("server/.local-messages/", scratchURL)),
      "portfolio-messages",
    );
    assert.equal((await persisted.get("messages"))[0].id, messageId);
    assert.equal(
      (
        await call(
          "/api/messages",
          "DELETE",
          { messageId },
          process.env.PROFILE_EDIT_PASSWORD,
        )
      ).status,
      200,
    );
    assert.equal((await (await call("/api/messages")).json()).total, 0);
    // Force a stale conditional write from a second adapter to test persistence.
    const stale = await persisted.getWithMetadata("messages");
    await persisted.setJSON("messages", [], { onlyIfMatch: stale.etag });
    assert.equal(
      (await persisted.setJSON("messages", [], { onlyIfMatch: stale.etag }))
        .modified,
      false,
    );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await call("/api/messages", "POST", {
            id: crypto.randomUUID(),
            text: "test",
          })
        ).status,
        201,
      );
    assert.equal(
      (
        await call("/api/messages", "POST", {
          id: crypto.randomUUID(),
          text: "limited",
        })
      ).status,
      429,
    );
    for (let i = 0; i < 16; i++) {
      const path = i % 2 ? "/API/PROFILE/" : "/api/photos/";
      const response = await fetch(url + path, {
        method: "PUT",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-Edit-Password": "wrong",
        },
        body: "{}",
      });
      assert.equal(response.status, 401);
    }
    const blocked = await fetch(`${url}/api/photos/upload/`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "X-Edit-Password": process.env.PROFILE_EDIT_PASSWORD,
      },
    });
    assert.equal(blocked.status, 429);
    assert.equal(
      (
        await fetch(`${url}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${url}/uploads/synthetic-test.webp`, {
          headers: { Cookie: cookie },
        })
      ).status,
      401,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert.equal(path.dirname(path.resolve(scratch)), path.resolve(testFolder));
    assert.ok(path.basename(scratch).startsWith(".security-test-"));
    await rm(scratch, { recursive: true });
  }
});
