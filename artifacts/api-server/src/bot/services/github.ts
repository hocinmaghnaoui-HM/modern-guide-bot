import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const GITHUB_API = "https://api.github.com";

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

export async function backupToGitHub(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  commitMessage: string
): Promise<string> {
  const headers = getHeaders();
  const encodedContent = Buffer.from(content).toString("base64");
  const apiPath = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;

  // Check if file exists to get SHA
  let sha: string | undefined;
  try {
    const existing = await axios.get(apiPath, { headers });
    sha = existing.data.sha;
  } catch {}

  const payload: any = {
    message: commitMessage,
    content: encodedContent,
    branch: "main",
  };
  if (sha) payload.sha = sha;

  const response = await axios.put(apiPath, payload, { headers });
  return response.data.content?.html_url || `https://github.com/${owner}/${repo}`;
}

export async function getOrCreateRepo(repoName: string): Promise<{ owner: string; repo: string }> {
  const headers = getHeaders();

  // Get authenticated user
  const userResponse = await axios.get(`${GITHUB_API}/user`, { headers });
  const owner = userResponse.data.login;

  // Check if repo exists
  try {
    await axios.get(`${GITHUB_API}/repos/${owner}/${repoName}`, { headers });
  } catch {
    // Create repo
    await axios.post(
      `${GITHUB_API}/user/repos`,
      {
        name: repoName,
        description: "Telegram Bot Backup",
        private: true,
        auto_init: true,
      },
      { headers }
    );
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { owner, repo: repoName };
}
