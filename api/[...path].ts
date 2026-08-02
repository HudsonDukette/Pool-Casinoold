import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverlessHttp from "serverless-http";
// The deploy build emits an Express-only bundle that does not call listen(),
// initialize Socket.IO, or start background schedulers in a serverless function.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – built at deploy time by the build command
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
