/// <reference types="vite/client" />
/// <reference lib="dom" />

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { setBaseUrl } from "./lib/api-client-react/src/index.js";
import App from "./App.js";
import "./index.css";

setBaseUrl((import.meta.env.VITE_API_URL as string | undefined) ?? null);

const root = document.getElementById("root");
if (!root) {
  throw new Error('PoolCasino root element "#root" was not found.');
}
createRoot(root).render(createElement(App));
