const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const deploy = path.join(root, "deploy");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "projects.js",
  ".nojekyll",
];

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

fs.rmSync(deploy, { recursive: true, force: true });
fs.mkdirSync(deploy, { recursive: true });

for (const file of files) {
  copyFile(path.join(root, file), path.join(deploy, file));
}

copyDir(path.join(root, "assets"), path.join(deploy, "assets"));

console.log("Static deploy files are ready in deploy/");
