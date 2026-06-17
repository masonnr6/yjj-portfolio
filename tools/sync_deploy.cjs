const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const deploy = path.join(root, "deploy");

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

fs.mkdirSync(deploy, { recursive: true });
copyFile(path.join(root, "app.js"), path.join(deploy, "app.js"));
copyFile(path.join(root, "projects.js"), path.join(deploy, "projects.js"));
copyDir(path.join(root, "assets"), path.join(deploy, "assets"));
copyFile(path.join(root, ".nojekyll"), path.join(deploy, ".nojekyll"));
