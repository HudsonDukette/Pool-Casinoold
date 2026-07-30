import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverlessHttp from "serverless-http";
// Import the pre-built bundle from the api-server dist
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – built at deploy time by the build command
import app from "../artifacts/api-server/dist/index.mjs";

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
