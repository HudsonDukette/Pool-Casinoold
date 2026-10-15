// The Vite build resolves these aliases to the real frontend source files.
 // Vercel's separate TypeScript entrypoint check can run without the package tsconfig,
 // so treat unresolved @/ modules as ambient here; Vite still bundles real modules.
declare module "@/*";
