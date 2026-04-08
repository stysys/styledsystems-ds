/**
 * sync/clients/github.ts — GitHub sync client
 *
 * Uploads a SyncPackage to a GitHub repository using the Git Trees API.
 * Uses native fetch only — no @octokit/rest — so it works in UXP, Figma
 * plugins, and browsers without any Node.js dependencies.
 */

import type { SyncPackage } from "../package-builder.js";
import type { SyncJobResult } from "../../versions/types.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GitHubSyncConfig {
  /** Personal access token or OAuth access token */
  token: string;
  /** Repository in "owner/repo" format, e.g. "acme-corp/design-tokens" */
  repo: string;
  /** Target branch (default: "main") */
  branch?: string;
  /** Directory prefix inside the repo, e.g. "design-system/" */
  path?: string;
  /** Commit message override */
  commitMessage?: string;
}

export interface GitHubSyncResult extends SyncJobResult {
  destination: "github";
  commitSha: string;
  commitUrl: string;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function uploadToGitHub(
  pkg: SyncPackage,
  config: GitHubSyncConfig
): Promise<SyncJobResult> {
  const { token, repo, branch = "main", path = "", commitMessage } = config;

  if (!token) return failure("GitHub token is required");
  if (!repo) return failure("GitHub repo is required (format: owner/repo)");

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return failure(`Invalid repo format: '${repo}'. Expected 'owner/repo'`);
  }

  const api = new GitHubApi(token, owner, repoName);

  try {
    // 1. Resolve HEAD commit + tree
    const { commitSha: headSha, treeSha } = await withRetry(() =>
      api.getHead(branch)
    );

    // 2. Filter out asset placeholders
    const uploadableFiles = pkg.files.filter((f) => f.content !== null);
    if (uploadableFiles.length === 0) {
      return failure("No uploadable files in sync package");
    }

    // 3. Create blobs for all files in parallel
    const treeEntries = await Promise.all(
      uploadableFiles.map((file) =>
        withRetry(() =>
          api.createBlob(file.content!, path + file.path)
        )
      )
    );

    // 4. Create tree
    const newTreeSha = await withRetry(() =>
      api.createTree(treeSha, treeEntries)
    );

    // 5. Create commit
    const message =
      commitMessage ??
      `Sync design system "${pkg.metadata.name}" v${pkg.metadata.version}\n\nSynced at: ${pkg.metadata.syncedAt}`;

    const newCommitSha = await withRetry(() =>
      api.createCommit(message, newTreeSha, headSha)
    );

    // 6. Update branch ref
    await withRetry(() => api.updateRef(branch, newCommitSha));

    const bytesSynced = uploadableFiles.reduce((sum, f) => {
      if (!f.content) return sum;
      return sum + (typeof f.content === "string"
        ? f.content.length
        : f.content.byteLength);
    }, 0);

    return {
      success: true,
      destination: "github",
      commitSha: newCommitSha,
      commitUrl: `https://github.com/${owner}/${repoName}/commit/${newCommitSha}`,
      filesCount: uploadableFiles.length,
      bytesSynced,
    };
  } catch (err) {
    return failure(errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// GitHub API client (fetch-based)
// ---------------------------------------------------------------------------

class GitHubApi {
  private base = "https://api.github.com";

  constructor(
    private token: string,
    private owner: string,
    private repo: string
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      const err: any = new Error(`GitHub API ${method} ${path} → ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }

    return res.json() as Promise<T>;
  }

  async getHead(branch: string): Promise<{ commitSha: string; treeSha: string }> {
    const ref = await this.request<any>(
      "GET",
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`
    );
    const commitSha = ref.object.sha;

    const commit = await this.request<any>(
      "GET",
      `/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`
    );

    return { commitSha, treeSha: commit.tree.sha };
  }

  async createBlob(
    content: string | Uint8Array,
    filePath: string
  ): Promise<{ path: string; mode: "100644"; type: "blob"; sha: string }> {
    const isBinary = typeof content !== "string";
    const encoded = isBinary ? uint8ToBase64(content) : content;

    const data = await this.request<any>(
      "POST",
      `/repos/${this.owner}/${this.repo}/git/blobs`,
      { content: encoded, encoding: isBinary ? "base64" : "utf-8" }
    );

    return { path: filePath, mode: "100644", type: "blob", sha: data.sha };
  }

  async createTree(
    baseTree: string,
    entries: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }>
  ): Promise<string> {
    const data = await this.request<any>(
      "POST",
      `/repos/${this.owner}/${this.repo}/git/trees`,
      { base_tree: baseTree, tree: entries }
    );
    return data.sha;
  }

  async createCommit(
    message: string,
    treeSha: string,
    parentSha: string
  ): Promise<string> {
    const data = await this.request<any>(
      "POST",
      `/repos/${this.owner}/${this.repo}/git/commits`,
      { message, tree: treeSha, parents: [parentSha] }
    );
    return data.sha;
  }

  async updateRef(branch: string, sha: string): Promise<void> {
    await this.request(
      "PATCH",
      `/repos/${this.owner}/${this.repo}/git/refs/heads/${branch}`,
      { sha, force: false }
    );
  }
}

// ---------------------------------------------------------------------------
// Base64 encode for binary content — no Buffer, works in UXP + browsers
// ---------------------------------------------------------------------------

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status: number | undefined = err?.status;
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
  return { success: false, destination: "github", filesCount: 0, bytesSynced: 0, error };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as any).message);
  }
  return String(err);
}
