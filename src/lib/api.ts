/**
 * Centralized API client for communicating with the custom Bun + Hono backend server.
 */

const API_BASE_URL = "http://localhost:3000/api";

export interface ApiJob {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  requirements?: string[];
  created_at: string;
}

export interface ApiCandidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  status: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("Backend response error");
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Bun + Hono local backend is offline.");
    return null;
  }
}

export async function fetchJobsFromBackend(): Promise<ApiJob[]> {
  const res = await fetch(`${API_BASE_URL}/jobs`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const body = await res.json();
  return body.data || [];
}

export async function fetchCandidatesFromBackend(): Promise<ApiCandidate[]> {
  const res = await fetch(`${API_BASE_URL}/candidates`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  const body = await res.json();
  return body.data || [];
}
