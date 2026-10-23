import { requireVisitor } from "../lib/visitor-auth.mjs";
import { getStore } from "@netlify/blobs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import initialPhotos from "../../data/photos.json" with { type: "json" };

const MB = 1024 * 1024;
const imagePattern = /^[0-9a-f-]{36}\.webp$/;

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function authorize(request) {
  const expected = process.env.PROFILE_EDIT_PASSWORD;
  if (!expected) fail("线上尚未设置编辑密码。", 503);
  const actual = Buffer.from(request.headers.get("X-Edit-Password") || "");
  const correct = Buffer.from(expected);
  if (actual.length !== correct.length || !timingSafeEqual(actual, correct)) {
    fail("编辑密码错误。", 401);
  }
}

async function readList(store) {
  const entry = await store.getWithMetadata("photos", { type: "json" });
  return { photos: entry?.data ?? initialPhotos, etag: entry?.etag };
}

async function writeList(store, photos, etag) {
  const result = await store.setJSON(
    "photos",
    photos,
    etag ? { onlyIfMatch: etag } : { onlyIfNew: true },
  );
  if (!result.modified)
    fail("照片清单刚被其他操作修改，请刷新管理页面后重试。", 409);
}

function cleanList(value, previous) {
  if (!Array.isArray(value) || value.length > 50) fail("照片清单最多 50 张。");
  const allowed = new Set(previous.map((photo) => photo.src));
  const seen = new Set();
  return value.map((photo) => {
    if (!photo || typeof photo.src !== "string" || !allowed.has(photo.src)) {
      fail("清单包含未知图片，请刷新管理页面后重试。");
    }
    if (seen.has(photo.src)) fail("清单中不能包含重复图片。");
    seen.add(photo.src);
    if (
      typeof photo.title !== "string" ||
      !photo.title.trim() ||
      photo.title.length > 100
    ) {
      fail("每张照片的说明需要填写 1～100 字。");
    }
    return { src: photo.src, title: photo.title.trim() };
  });
}

async function upload(request, store, images) {
  if (
    !(request.headers.get("Content-Type") || "").includes("multipart/form-data")
  ) {
    fail("请通过照片管理页面选择图片上传。", 415);
  }
  const raw = await request.arrayBuffer();
  if (raw.byteLength > 4 * MB + 64 * 1024)
    fail("上传内容过大，照片不能超过 4 MB。", 413);
  let form;
  try {
    form = await new Response(raw, {
      headers: { "Content-Type": request.headers.get("Content-Type") },
    }).formData();
  } catch {
    fail("上传格式不正确，请重新选择照片。");
  }
  if (
    form.getAll("photo").length !== 1 ||
    form.getAll("title").length !== 1 ||
    [...form.keys()].some((key) => !["photo", "title"].includes(key))
  ) {
    fail("每次只能上传一张照片和一条说明。");
  }
  const file = form.get("photo");
  const title = form.get("title");
  if (!(file instanceof Blob) || !file.size) fail("请先选择照片。");
  if (file.size > 4 * MB) fail("照片不能超过 4 MB。", 413);
  if (typeof title !== "string" || !title.trim() || title.length > 100) {
    fail("请填写 1～100 字的照片说明。");
  }
  let output;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
    });
    const info = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(info.format) ||
      (info.pages || 1) > 1
    ) {
      fail("仅支持静态 JPG、PNG、WebP 照片。");
    }
    output = await image
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (error) {
    if (error.status) throw error;
    fail("无法读取图片或超过 2500 万像素，请缩小后重试。");
  }
  if (output.byteLength > 4 * MB)
    fail("处理后的图片仍然过大，请缩小后重试。", 413);
  const { photos, etag } = await readList(store);
  if (photos.length >= 50) fail("轮播最多保留 50 张照片。");
  const id = `${randomUUID()}.webp`;
  const photo = { src: `/api/photo?id=${id}`, title: title.trim() };
  // 保存成功后不会删除图片；移出轮播只修改清单。
  await images.set(id, new Uint8Array(output).buffer);
  try {
    await writeList(store, [...photos, photo], etag);
  } catch (error) {
    // 仅清理已确定未提交的冲突操作，网络错误不贸然删图。
    if (error.status === 409) {
      try {
        await images.delete(id);
      } catch {
        console.error("清理冲突图片失败");
      }
    }
    throw error;
  }
  return json({ message: "上传成功，照片已加入轮播。", photo }, 201);
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const methods = {
    "/api/photos": ["GET", "PUT"],
    "/api/photos/upload": ["POST"],
    "/api/photo": ["GET"],
  };
  if (!methods[path]) return json({ error: "接口不存在。" }, 404);
  if (!methods[path].includes(request.method)) {
    return json({ error: "不支持这个请求方式。" }, 405, {
      Allow: methods[path].join(", "),
    });
  }
  try {
    if (request.method !== "GET") authorize(request);
    const store = getStore({
      name: "portfolio-content",
      consistency: "strong",
    });
    const images = getStore({
      name: "portfolio-images",
      consistency: "strong",
    });
    if (path === "/api/photo") {
      const id = url.searchParams.get("id") || "";
      if (!imagePattern.test(id)) fail("图片不存在。", 404);
      const image = await images.get(id, { type: "arrayBuffer" });
      if (!image) fail("图片不存在。", 404);
      return new Response(image, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path === "/api/photos/upload")
      return await upload(request, store, images);
    if (request.method === "GET") return json((await readList(store)).photos);
    if (
      !(request.headers.get("Content-Type") || "")
        .toLowerCase()
        .includes("application/json")
    ) {
      fail("请使用 JSON 格式保存清单。", 415);
    }
    const text = await request.text();
    if (Buffer.byteLength(text) > 128 * 1024) fail("照片清单过大。", 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      fail("照片清单格式不正确。");
    }
    const { photos, etag } = await readList(store);
    await writeList(store, cleanList(body, photos), etag);
    return json({ message: "照片清单已保存到云端。" });
  } catch (error) {
    if (!error.status) console.error("照片云存储操作失败：", error.message);
    return json(
      {
        error: error.status
          ? error.message
          : "照片读取或保存失败，请稍后重试。",
      },
      error.status || 500,
    );
  }
}

export const config = {
  path: ["/api/photos", "/api/photos/upload", "/api/photo"],
};

export default async function handler(request, context) {
  const rejected = requireVisitor(request);
  if (rejected) return rejected;
  const response = await handleRequest(request, context);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
