import type {
  AuthResponse,
  Question,
  User,
  VisualizationResult,
  Language,
} from "@shared/types";

const API_BASE =
  window.codeviz?.apiBaseUrl ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:3847/api";

function getToken() {
  return localStorage.getItem("codeviz_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "Request failed");
  }
  return data as T;
}

export const api = {
  register(email: string, password: string) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  getQuestions() {
    return request<Question[]>("/questions");
  },
  getQuestion(id: string) {
    return request<Question>(`/questions/${id}`);
  },
  createQuestion(payload: {
    title: string;
    description: string;
    difficulty: Question["difficulty"];
    starterCode: Record<Language, string>;
    solutionCode: Record<Language, string>;
  }) {
    return request<Question>("/questions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateQuestion(
    id: string,
    payload: {
      title: string;
      description: string;
      difficulty: Question["difficulty"];
      starterCode: Record<Language, string>;
      solutionCode: Record<Language, string>;
    }
  ) {
    return request<Question>(`/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteQuestion(id: string) {
    return request<{ ok: boolean }>(`/questions/${id}`, { method: "DELETE" });
  },
  visualize(payload: { language: Language; code: string; questionId?: string }) {
    return request<VisualizationResult>("/visualize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  billingStatus() {
    return request<{
      user: User;
      monthlyPriceUsd: number;
      billingEnabled: boolean;
      stripeConfigured: boolean;
      hasAccess: boolean;
    }>("/billing/status");
  },
  createCheckout() {
    return request<{ url: string }>("/billing/checkout", { method: "POST" });
  },
  createBillingPortal() {
    return request<{ url: string }>("/billing/portal", { method: "POST" });
  },
  devActivate() {
    return request<{ ok: boolean }>("/billing/dev-activate", { method: "POST" });
  },
};

declare global {
  interface Window {
    codeviz?: {
      platform: string;
      apiBaseUrl: string;
    };
  }
}
