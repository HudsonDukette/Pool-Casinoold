import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import app from "../artifacts/api-server/src/app";

// Cache the handler across warm invocations
const handler = serverless(app, {
  request(req: any, event: any) {
    // Preserve the original path so Express sees /api/...
    req.url = event.url || req.url;
  },
});

export default async function apiHandler(req: VercelRequest, res: VercelResponse) {
  return handler(req as any, res as any);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
