/**
 * Metro sometimes tries to resolve certain @react-native/* deps from within
 * node_modules/react-native/node_modules/... even when npm hoists them to the root.
 * If the nested path doesn't exist, Metro can crash with ENOENT and return HTTP 500.
 *
 * This script ensures the nested path exists by linking/copying from the hoisted package.
 */

const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function linkOrCopy(src, dest) {
  if (exists(dest)) return;
  ensureDir(path.dirname(dest));
  try {
    fs.symlinkSync(src, dest, "dir");
  } catch {
    copyDir(src, dest);
  }
}

const root = path.join(__dirname, "..");
const tasks = [
  {
    label: "@react-native/normalize-colors under react-native",
    hoisted: path.join(root, "node_modules", "@react-native", "normalize-colors"),
    nested: path.join(root, "node_modules", "react-native", "node_modules", "@react-native", "normalize-colors"),
  },
  {
    label: "@expo/metro-runtime under expo-router",
    hoisted: path.join(root, "node_modules", "@expo", "metro-runtime"),
    nested: path.join(root, "node_modules", "expo-router", "node_modules", "@expo", "metro-runtime"),
  },
];

let ensured = 0;
for (const t of tasks) {
  if (!exists(t.hoisted)) {
    console.warn(`[fix-rn-nested-deps] Missing hoisted package for ${t.label}: ${t.hoisted}`);
    continue;
  }
  linkOrCopy(t.hoisted, t.nested);
  console.log(`[fix-rn-nested-deps] ensured (${t.label}): ${t.nested}`);
  ensured++;
}

if (ensured === 0) process.exit(0);


