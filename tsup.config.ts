import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  }, // Mark all heavy / native deps as external; they'll be resolved from node_modules at runtime
  external: ["@antv/infographic"],
  noExternal: ["picocolors"],
});
