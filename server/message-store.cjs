// File-backed adapter for loopback development only; never publishes the data.
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const queues = new Map();

module.exports = function createMessageStore(directory, name) {
  if (!["portfolio-messages", "portfolio-message-limits"].includes(name))
    throw new Error("Unsupported local message store");
  const filename = path.join(directory, `${name}.json`);
  async function read() {
    try {
      const value = JSON.parse(await fs.readFile(filename, "utf8"));
      if (!value || value.version !== 1 || !Array.isArray(value.entries))
        throw new Error("Invalid local message data");
      const records = new Map(value.entries);
      if (name === "portfolio-message-limits") {
        const hour = Math.floor(Date.now() / 3600000);
        for (const [id, entry] of records)
          if (entry.data?.window !== hour) records.delete(id);
      }
      return records;
    } catch (error) {
      if (error.code === "ENOENT") return new Map();
      throw error; // A corrupt existing file must not be silently overwritten.
    }
  }
  async function setJSON(key, data, options = {}) {
    async function write() {
      const records = await read();
      if (name === "portfolio-message-limits") {
        const hour = Math.floor(Date.now() / 3600000);
        for (const [id, value] of records)
          if (value.data?.window !== hour) records.delete(id);
      }
      const old = records.get(key);
      if (
        (options.onlyIfNew && old) ||
        (options.onlyIfMatch !== undefined && options.onlyIfMatch !== old?.etag)
      )
        return { modified: false };
      if (!old && records.size >= 5000)
        throw new Error("Local store capacity exceeded");
      records.set(key, { data: structuredClone(data), etag: randomUUID() });
      await fs.mkdir(directory, { recursive: true });
      const temporary = `${filename}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(
          temporary,
          JSON.stringify({ version: 1, entries: [...records] }),
          { encoding: "utf8", flag: "wx" },
        );
        await fs.rename(temporary, filename);
      } finally {
        try {
          await fs.unlink(temporary);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      return { modified: true };
    }
    // Serialize the read/compare/rename transaction across adapter instances.
    const result = (queues.get(filename) || Promise.resolve()).then(write);
    const settled = result.catch(() => {});
    queues.set(filename, settled);
    void settled.then(() => {
      if (queues.get(filename) === settled) queues.delete(filename);
    });
    return result;
  }
  return {
    async get(key) {
      return structuredClone((await read()).get(key)?.data ?? null);
    },
    async getWithMetadata(key) {
      return structuredClone((await read()).get(key) ?? null);
    },
    setJSON,
  };
};
