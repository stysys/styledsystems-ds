#!/usr/bin/env node
/**
 * Post-build script to add .js extensions to all imports in dist files
 * for proper ES module resolution
 */

const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  });
}

function fixImportExtensions(filePath) {
  if (!filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Fix from ... import patterns: from "path" -> from"path.js"
  // But skip if already has .js or is external (like @stysys/)
  content = content.replace(
    /from\s+["']([^"']+)["']/g,
    (match, importPath) => {
      // Skip already fixed imports, external packages, or data URLs
      if (importPath.includes('.js') || importPath.startsWith('@') || importPath.startsWith('data:')) {
        return match;
      }
      // Skip built-in Node modules
      if (importPath.startsWith('node:') || ['path', 'fs', 'util', 'stream', 'events'].includes(importPath)) {
        return match;
      }
      // Add .js extension to relative imports
      if (importPath.startsWith('.')) {
        return `from "${importPath}.js"`;
      }
      return match;
    }
  );
  
  // Fix .js.js double extensions
  content = content.replace(/\.js\.js"/g, '.js"');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
  }
}

console.log('Fixing import extensions in dist files...');
walkDir('./dist', fixImportExtensions);
console.log('✅ Done!');
