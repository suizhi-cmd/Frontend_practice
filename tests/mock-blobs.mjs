export function getStore(options) {
  return globalThis.securityTestStores.get(
    typeof options === "string" ? options : options.name,
  );
}
