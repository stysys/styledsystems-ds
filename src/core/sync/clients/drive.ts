/**
 * sync/clients/drive.ts — Google Drive sync client
 *
 * Uploads a SyncPackage to Google Drive using the REST API directly via fetch.
 * Using fetch (not the googleapis SDK) keeps this module compatible with
 * Figma plugin iframes, InDesign UXP plugins, and Node 18+ without any
 * additional dependencies.
 *
 * Auth: expects a short-lived OAuth 2.0 access token. The plugin is
 * responsible for the OAuth flow and token refresh.
 */

import type { SyncPackage } from "../package-builder.js";
import type { SyncJobResult } from "../../versions/types.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GoogleDriveSyncConfig {
  /** Short-lived OAuth 2.0 access token */
  token: string;
  /**
   * ID of an existing Drive folder to sync into.
   * If omitted a new folder named `folderName` is created on first sync.
   * After creation the caller should persist the returned `folderId` to
   * Firestore so subsequent syncs reuse it.
   */
  folderId?: string;
  /** Folder name used when creating a new folder (default: design system name) */
  folderName?: string;
  /**
   * When true, existing files with the same name are updated in-place rather
   * than creating duplicate entries. Requires an extra list call per file but
   * keeps the folder clean across syncs. Default: true.
   */
  updateExisting?: boolean;
}

export interface GoogleDriveSyncResult extends SyncJobResult {
  destination: "google-drive";
  folderId: string;
  folderUrl: string;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

const DRIVE_API = "https://www.googleapis.com/drive/v3";

// UXP-safe string encoder — TextEncoder not available in all UXP versions
function encodeString(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) { bytes.push(code); }
    else if (code < 0x800) { bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f)); }
    else { bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)); }
  }
  return new Uint8Array(bytes);
}
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

/**
 * Uploads a SyncPackage to Google Drive.
 * Asset placeholder files (content === null) are skipped.
 * Returns the folder ID so the caller can persist it to Firestore.
 */
export async function uploadToGoogleDrive(
  pkg: SyncPackage,
  config: GoogleDriveSyncConfig
): Promise<SyncJobResult> {
  const {
    token,
    folderId: existingFolderId,
    folderName = pkg.metadata.name,
    updateExisting = true,
  } = config;

  if (!token) return failure("Google Drive token is required");

  try {
    // 1. Resolve or create the target folder
    const folderId =
      existingFolderId ?? (await createFolder(token, folderName));

    // 2. Build an index of existing files in the folder (for upsert)
    const existingFiles: Record<string, string> = updateExisting
      ? await listFileIds(token, folderId)
      : {};

    // 3. Upload each file
    const uploadableFiles = pkg.files.filter((f) => f.content !== null);
    if (uploadableFiles.length === 0) {
      return failure(
        "No uploadable files in sync package (all were asset placeholders)"
      );
    }

    let totalBytes = 0;

    for (const file of uploadableFiles) {
      const filename = file.path.split("/").pop()!;
      const mimeType = inferMimeType(file.path);
      const content = file.content!;

      const byteLength =
        typeof content === "string"
          ? encodeString(content).byteLength
          : content.byteLength;
      totalBytes += byteLength;

      const existingId = existingFiles[filename];
      if (existingId) {
        await withRetry(() =>
          updateFile(token, existingId, content, mimeType)
        );
      } else {
        await withRetry(() =>
          createFile(token, filename, content, mimeType, folderId)
        );
      }
    }

    return {
      success: true,
      destination: "google-drive",
      folderId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      filesCount: uploadableFiles.length,
      bytesSynced: totalBytes,
    };
  } catch (err) {
    return failure(errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Drive REST API helpers
// ---------------------------------------------------------------------------

async function createFolder(token: string, name: string): Promise<string> {
  const res = await driveRequest(token, `${DRIVE_API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const data = await res.json();
  assertOk(res, data);
  return data.id as string;
}

/**
 * Returns a map of filename → fileId for all files directly inside the folder.
 */
async function listFileIds(
  token: string,
  folderId: string
): Promise<Record<string, string>> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed = false`
  );
  const res = await driveRequest(
    token,
    `${DRIVE_API}/files?q=${q}&fields=files(id,name)&pageSize=1000`,
    { method: "GET" }
  );
  const data = await res.json();
  assertOk(res, data);

  const map: Record<string, string> = {};
  for (const file of (data.files as Array<{ id: string; name: string }>) ??
    []) {
    map[file.name] = file.id;
  }
  return map;
}

async function createFile(
  token: string,
  name: string,
  content: string | Uint8Array,
  mimeType: string,
  parentId: string
): Promise<string> {
  const body = buildMultipartBody(
    { name, parents: [parentId] },
    content,
    mimeType
  );
  const res = await driveRequest(
    token,
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${BOUNDARY}` },
      body,
    }
  );
  const data = await res.json();
  assertOk(res, data);
  return data.id as string;
}

async function updateFile(
  token: string,
  fileId: string,
  content: string | Uint8Array,
  mimeType: string
): Promise<void> {
  const body = buildMultipartBody({}, content, mimeType);
  const res = await driveRequest(
    token,
    `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=multipart`,
    {
      method: "PATCH",
      headers: { "Content-Type": `multipart/related; boundary=${BOUNDARY}` },
      body,
    }
  );
  const data = await res.json();
  assertOk(res, data);
}

async function driveRequest(
  token: string,
  url: string,
  init: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string>),
    },
  });
}

function assertOk(res: Response, body: unknown): void {
  if (!res.ok) {
    const msg =
      (body as any)?.error?.message ?? `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
}

// ---------------------------------------------------------------------------
// Multipart body builder
// ---------------------------------------------------------------------------

const BOUNDARY = "stysys_sync_boundary";

function buildMultipartBody(
  metadata: object,
  content: string | Uint8Array,
  mimeType: string
): ArrayBuffer {
  const metaPart =
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${BOUNDARY}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const closing = `\r\n--${BOUNDARY}--`;

  const metaBytes = encodeString(metaPart);
  const contentBytes =
    typeof content === "string" ? encodeString(content) : content;
  const closeBytes = encodeString(closing);

  const combined = new Uint8Array(
    metaBytes.byteLength + contentBytes.byteLength + closeBytes.byteLength
  );
  combined.set(metaBytes, 0);
  combined.set(contentBytes, metaBytes.byteLength);
  combined.set(closeBytes, metaBytes.byteLength + contentBytes.byteLength);
  return combined.buffer as ArrayBuffer;
}

// ---------------------------------------------------------------------------
// MIME type inference
// ---------------------------------------------------------------------------

function inferMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    json: "application/json",
    js: "text/javascript",
    css: "text/css",
    md: "text/markdown",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    idml: "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Retry on rate-limit / server errors; bail immediately on auth errors
      const status: number | undefined = err?.status ?? err?.response?.status;
      if (status && !RETRYABLE_STATUSES.has(status)) throw err;

      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function failure(error: string): SyncJobResult {
  return {
    success: false,
    destination: "google-drive",
    filesCount: 0,
    bytesSynced: 0,
    error,
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as any).message);
  }
  return String(err);
}
