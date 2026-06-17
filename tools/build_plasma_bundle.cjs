const path = require("node:path");

const esbuild = require("../node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild");

const root = path.resolve(__dirname, "..");

esbuild
  .build({
    entryPoints: [path.join(root, "src", "hero-plasma", "main.jsx")],
    outfile: path.join(root, "assets", "hero-plasma.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "info",
  })
  .catch(() => {
    process.exitCode = 1;
  });
