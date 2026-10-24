module.exports = function createMemoryStore(maximum = 5000) {
  const records = new Map();
  let revision = 0;
  function clean() {
    const now = Date.now();
    for (const [key, record] of records)
      if (record.until <= now) records.delete(key);
  }
  return {
    async get(key) {
      clean();
      return structuredClone(records.get(key)?.data ?? null);
    },
    async getWithMetadata(key) {
      clean();
      const record = records.get(key);
      return record
        ? { data: structuredClone(record.data), etag: record.etag }
        : null;
    },
    async setJSON(key, data, options = {}) {
      clean();
      const old = records.get(key);
      if (
        (options.onlyIfNew && old) ||
        (options.onlyIfMatch !== undefined && options.onlyIfMatch !== old?.etag)
      )
        return { modified: false };
      if (!old && records.size >= maximum)
        throw new Error("Security store capacity exceeded");
      records.set(key, {
        data: structuredClone(data),
        etag: String(++revision),
        until: data.exp
          ? data.exp * 1000
          : (data.bucket + 1) * (data.windowMs || 600000),
      });
      return { modified: true };
    },
    async delete(key) {
      records.delete(key);
    },
  };
};
