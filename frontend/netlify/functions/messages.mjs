import { requireVisitor } from "../lib/visitor-auth.mjs";
import { getStore } from "@netlify/blobs";
import { authorizeAdmin } from "../lib/admin-auth.mjs";
import { handleMessages } from "../lib/messages-service.mjs";

export const config = { path: ["/api/messages", "/api/messages/reply"] };
export default async function handler(request, context) {
  const rejected = await requireVisitor(request);
  if (rejected) return rejected;
  const response = await handleMessages(request, context, {
    getStore,
    authorizeAdmin,
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
