const API_URL = "/api/backend";

export interface Finding {
  file: string;
  line: number;
  severity: string;
  confidence: number;
  title: string;
  description: string;
  suggestion: string;
  category: string;
  verification: string | null;
}

export interface Review {
  id: number;
  installation_id: number;
  repo_full_name: string;
  pr_number: number;
  commit_sha: string;
  status: string;
  verdict?: "merge_ready" | "changes_requested" | "blocked" | "in_progress" | "not_reviewed" | string;
  progress?: {
    completed_agents: number;
    total_agents: number;
    current_step: string;
    step_label?: string;
  };
  pr_state: string | null;
  pr_title: string | null;
  pr_url: string | null;
  author: string | null;
  head_branch: string | null;
  base_branch: string | null;
  github_pr_id: number | null;
  repo_id: number | null;
  pr_created_at: string | null;
  pr_updated_at: string | null;
  findings: Finding[];
  summary: string;
  diagram: string;
  merge_score: number | null;
  merge_score_reason: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  enabled_agent_count: number;
  review_mode: string;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  limit: number;
  offset: number;
}

export interface Installation {
  installation_id: number;
  repo_full_name: string;
  model_id: string | null;
  config: Record<string, unknown>;
}

export interface RepoSettings {
  profile: "lenient" | "standard" | "strict" | "custom" | string;
  rulebook: string;
  enabled_agents: string[];
  min_severity: "info" | "warning" | "critical" | string;
  min_confidence: number;
  max_findings: number;
  ignore_paths: string[];
  critical_paths: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RepoSettingsResponse {
  installation_id: number;
  repo_full_name: string;
  settings: RepoSettings;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(`Network error (proxy → ${url}): ${e}`);
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} (proxy → ${url})`);
  }
  return res.json();
}

export const api = {
  health: () => apiFetch<{ status: string; version: string }>("/health"),

  listReviews: (params?: { repo?: string; status?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.repo) search.set("repo", params.repo);
    if (params?.status) search.set("status", params.status);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset) search.set("offset", String(params.offset));
    const qs = search.toString();
    return apiFetch<ReviewListResponse>(`/api/reviews${qs ? `?${qs}` : ""}`);
  },

  getReview: (id: number) => apiFetch<Review>(`/api/reviews/${id}`),

  getReviewByKey: (repo: string, pr: number, sha: string) =>
    apiFetch<Review>(`/api/reviews/by-key/${encodeURIComponent(repo)}/${pr}/${sha}`),

  retryReview: (id: number) =>
    apiFetch<{ status: string; message: string; review: Review }>(
      `/api/reviews/${id}/retry`,
      { method: "POST" }
    ),

  listInstallations: () =>
    apiFetch<{ installations: Installation[] }>("/api/installations"),

  listRepos: (installationId: number) =>
    apiFetch<{ repos: Installation[] }>(`/api/installations/${installationId}/repos`),

  syncInstallation: (installationId: number) =>
    apiFetch<{ status: string; installation_id: number }>(
      `/api/installations/${installationId}/sync`,
      { method: "POST" }
    ),

  getSettings: (installationId: number) =>
    apiFetch<{ installation_id: number; settings: Record<string, unknown> | null }>(
      `/api/installations/${installationId}/settings`
    ),

  updateSettings: (installationId: number, body: Record<string, unknown>) =>
    apiFetch<{ status: string }>(`/api/installations/${installationId}/settings`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getInsights: (installationId: number) =>
    apiFetch<{ insights: Record<string, unknown>[] }>(
      `/api/analytics/${installationId}/insights`
    ),

  getDispositions: (installationId: number, repo?: string) => {
    const search = new URLSearchParams();
    if (repo) search.set("repo", repo);
    const qs = search.toString();
    return apiFetch<{ dispositions: Record<string, unknown>[] }>(
      `/api/analytics/${installationId}/dispositions${qs ? `?${qs}` : ""}`
    );
  },

  getRepoSettings: (installationId: number, repoFullName: string) =>
    apiFetch<RepoSettingsResponse>(
      `/api/installations/${installationId}/repos/${encodeURIComponent(repoFullName)}/settings`
    ),

  updateRepoSettings: (
    installationId: number,
    repoFullName: string,
    body: Partial<RepoSettings>
  ) =>
    apiFetch<{ status: string; repo_full_name: string }>(
      `/api/installations/${installationId}/repos/${encodeURIComponent(repoFullName)}/settings`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    ),

  getPublicConfig: () =>
    apiFetch<PublicConfig>("/api/config/public"),

  updateGlobalModel: (modelId: string) =>
    apiFetch<{ status: string; model: string; provider: string }>(
      "/api/settings/model",
      {
        method: "POST",
        body: JSON.stringify({ model_id: modelId }),
      }
    ),
};

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tag?: string;
  recommended?: boolean;
  tier?: string;
  context_window?: string;
  latency?: string;
  avg_latency?: string;
  cost_per_review?: string;
  description?: string;
}

export interface PublicConfig {
  github_app_slug: string;
  github_app_id?: number;
  webhook_url: string;
  webhook_secret_configured?: boolean;
  hmac_enforced?: boolean;
  selected_model?: string;
  primary_model?: string;
  available_models: ModelOption[];
}

