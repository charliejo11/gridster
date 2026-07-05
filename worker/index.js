import { CORS_HEADERS as CREATE_CORS_HEADERS, handleCreateSlVerificationCode } from "./routes/create-sl-verification-code.js";
import { handleGetPendingSlVerificationCode } from "./routes/get-pending-sl-verification-code.js";
import { handleMarkSlVerificationSent } from "./routes/mark-sl-verification-sent.js";
import { CORS_HEADERS as VERIFY_CORS_HEADERS, handleVerifySlVerificationCode } from "./routes/verify-sl-verification-code.js";

const ROUTES = {
  "POST /api/create-sl-verification-code": handleCreateSlVerificationCode,
  "GET /api/get-pending-sl-verification-code": handleGetPendingSlVerificationCode,
  "POST /api/mark-sl-verification-sent": handleMarkSlVerificationSent,
  "POST /api/verify-sl-verification-code": handleVerifySlVerificationCode,
};

const OPTIONS_HEADERS_BY_PATH = {
  "/api/create-sl-verification-code": CREATE_CORS_HEADERS,
  "/api/verify-sl-verification-code": VERIFY_CORS_HEADERS,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && OPTIONS_HEADERS_BY_PATH[url.pathname]) {
      return new Response(null, { status: 204, headers: OPTIONS_HEADERS_BY_PATH[url.pathname] });
    }

    const handler = ROUTES[`${request.method} ${url.pathname}`];

    if (handler) {
      return handler(request, env);
    }

    return new Response(JSON.stringify({ error: "Not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
