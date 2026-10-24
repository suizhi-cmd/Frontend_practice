const maximum = 200;
const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};
export async function reserveImageSlot(store, images) {
  // A retained-image quota is independent of the carousel length. Existing
  // images are counted before initializing; no user images are auto-deleted.
  for (let attempt = 0; attempt < 10; attempt++) {
    const old = await store.getWithMetadata("image-upload-quota", {
      type: "json",
    });
    let count = old?.data?.count;
    if (!old) {
      count = 0;
      for await (const page of images.list({ paginate: true })) {
        count += page.blobs.length;
        if (count >= maximum) break;
      }
    }
    if (!Number.isSafeInteger(count) || count < 0)
      fail("图片配额状态异常，请联系站主。", 503);
    if (count >= maximum)
      fail("累计图片上传已达 200 张，请站主核对存储后整理配额。", 409);
    const result = await store.setJSON(
      "image-upload-quota",
      { count: count + 1 },
      old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
    );
    if (result.modified) return;
  }
  fail("上传操作较多，请稍后重试。", 409);
}
