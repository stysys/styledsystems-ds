#!/usr/bin/env node
/**
 * Post-build script to add .js extensions to all imports in dist files
 * for proper ES module resolution
 */

const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  });
}

function resolveImportPath(importPath, fromDir) {
  // Skip already fixed imports, external packages, or data URLs
  if (
    importPath.includes(".js") ||
    importPath.startsWith("@") ||
    importPath.startsWith("data:")
  ) {
    return null;
  }
  // Skip built-in Node modules
  if (
    importPath.startsWith("node:") ||
    ["path", "fs", "util", "stream", "events"].includes(importPath)
  ) {
    return null;
  }
  // Only process relative imports
  if (!importPath.startsWith(".")) {
    return null;
  }

  // Resolve the import path relative to the current file's directory
  const resolvedPath = path.resolve(fromDir, importPath);

  // Check if it resolves to a directory with an index.js
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    const indexPath = path.join(resolvedPath, "index.js");
    if (fs.existsSync(indexPath)) {
      return importPath + "/index.js";
    }
  }

  // Check if it resolves to a .js file directly
  if (fs.existsSync(resolvedPath + ".js")) {
    return importPath + ".js";
  }

  // Check if it resolves to a .ts file (will be .js after compilation)
  if (fs.existsSync(resolvedPath + ".ts")) {
    return importPath + ".js";
  }

  // Default: add .js (could be an external module or error will appear later)
  return importPath + ".js";
}

function fixImportExtensions(filePath) {
  if (!filePath.endsWith(".js")) return;

  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;
  const fromDir = path.dirname(filePath);

  // Fix from ... import patterns
  content = content.replace(/from\s+["']([^"']+)["']/g, (match, importPath) => {
    const resolved = resolveImportPath(importPath, fromDir);
    if (resolved) {
      return `from "${resolved}"`;
    }
    return match;
  });

  // Fix double extensions that might have been created
  content = content.replace(/\.js\.js"/g, '.js"');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✓ Fixed: ${filePath}`);
  }
}

console.log("Fixing import extensions in dist files...");
walkDir("./dist", fixImportExtensions);
console.log("✅ Done!");
