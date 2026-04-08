/**
 * sync/utils/hash.ts — Content hashing for differential sync
 *
 * Uses the Web Crypto API (available in browsers, Figma plugins, UXP, and
 * modern Node ≥ 20) so this module has zero dependencies.
 */

// ---------------------------------------------------------------------------
// Sync hash (async, SHA-256 via Web Crypto)
// ---------------------------------------------------------------------------

/**
 * Returns a hex SHA-256 hash of the given string or Buffer content.
 * Uses Web Crypto — works in browsers, Figma plugins, UXP, and Node ≥ 20.
 */
function encodeString(str: string): ArrayBuffer {
  // TextEncoder is not available in all UXP versions — fall back to manual UTF-8
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).buffer as ArrayBuffer;
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) { bytes.push(code); }
    else if (code < 0x800) { bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f)); }
    else { bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)); }
  }
  return new Uint8Array(bytes).buffer;
}

export async function hashContent(content: string | Uint8Array): Promise<string> {
  // Web Crypto not available in all UXP versions — fall back to djb2 checksum
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return djb2Hash(content);
  }
  try {
    const bytes: ArrayBuffer =
      typeof content === "string"
        ? encodeString(content)
        : (content.buffer as ArrayBuffer).slice(content.byteOffset, content.byteOffset + content.byteLength);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return djb2Hash(content);
  }
}

function djb2Hash(content: string | Uint8Array): string {
  let hash = 5381;
  if (typeof content === "string") {
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32-bit
    }
  } else {
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash) ^ content[i];
      hash = hash >>> 0;
    }
  }
  return hash.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Differential sync
// ---------------------------------------------------------------------------

export interface SyncFile {
  path: string;
  content: string | Uint8Array | null;
  hash?: string;
}

/**
 * Returns only the files whose content hash differs from the last synced state.
 * Files with null content (asset placeholders) are always included if present.
 */
export function getChangedFiles(
  currentFiles: SyncFile[],
  lastSyncedFiles: Record<string, string> = {}
): SyncFile[] {
  return currentFiles.filter((file) => {
    if (file.content === null) return true; // asset placeholder — always include
    const lastHash = lastSyncedFiles[file.path];
    return !lastHash || lastHash !== file.hash;
  });
}

/**
 * Builds a lastSyncedFiles map from an array of synced files.
 * Suitable for writing back to Firestore after a successful sync.
 */
export function buildSyncedFilesMap(
  files: SyncFile[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const file of files) {
    if (file.hash) map[file.path] = file.hash;
  }
  return map;
}
