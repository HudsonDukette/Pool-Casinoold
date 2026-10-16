import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverlessHttp from "serverless-http";
// Import the Express app bundle (the standalone index bundle starts its own HTTP listener).
import app from "../artifacts/api-server/dist/app.mjs";

let handler: ReturnType<typeof serverlessHttp> | undefined;

function getHandler() {
  if (!handler) {
    handler = serverlessHttp(app);
  }
  return handler;
}

export default async function apiHandler(
  req: VercelRequest,
  res: VercelResponse,
) {
  return getHandler()(req as any, res as any);
}
