import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom Metrics
export const errorRate = new Rate("errors");
export const readLatency = new Trend("read_latency");
export const aiEdgeLatency = new Trend("ai_edge_latency");

// Configuration from environment variables
const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";
const SUPABASE_URL = __ENV.SUPABASE_URL || "https://your-staging-project.supabase.co";
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "your-staging-anon-key";
const TEST_EMAIL = __ENV.TEST_EMAIL || "loadtest-recruiter@tawzeefx.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "TestPassword123!";

// Scenario execution selection via CLI: -e SCENARIO=smoke / normal / peak / stress / soak
const selectedScenario = __ENV.SCENARIO || "smoke";

const scenarios = {
  smoke: {
    executor: "constant-vus",
    vus: 5,
    duration: "1m",
  },
  normal: {
    executor: "constant-vus",
    vus: 50,
    duration: "10m",
  },
  peak: {
    executor: "constant-vus",
    vus: 200,
    duration: "10m",
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 50,
    stages: [
      { duration: "3m", target: 200 },
      { duration: "4m", target: 500 },
      { duration: "5m", target: 800 },
      { duration: "3m", target: 1000 },
    ],
  },
  soak: {
    executor: "constant-vus",
    vus: 100,
    duration: "60m",
  },
};

export const options = {
  scenarios: {
    [selectedScenario]: scenarios[selectedScenario] || scenarios.smoke,
  },
  thresholds: {
    // Acceptance criteria from Test Protocol:
    // 1. Standard read p95 < 800ms
    "read_latency": ["p(95)<800"],
    // 2. AI-backed Edge Function p95 < 5000ms
    "ai_edge_latency": ["p(95)<5000"],
    // 3. Error rate < 1% at target load
    "errors": ["rate<0.01"],
    "http_req_failed": ["rate<0.01"],
  },
};

const defaultHeaders = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export default function () {
  let authToken = null;

  // 1. Authentication Stage
  group("01. Auth Login", function () {
    const authPayload = JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    const res = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      authPayload,
      { headers: defaultHeaders }
    );

    const isSuccess = check(res, {
      "login status is 200": (r) => r.status === 200,
    });

    errorRate.add(!isSuccess);

    if (isSuccess && res.json("access_token")) {
      authToken = res.json("access_token");
    }
  });

  const authHeaders = {
    ...defaultHeaders,
    "Authorization": authToken ? `Bearer ${authToken}` : defaultHeaders.Authorization,
  };

  // 2. Candidate & Job Data Read Operations
  group("02. Read Operations (Jobs, Candidates, Stages)", function () {
    const start = Date.now();
    const jobsRes = http.get(`${SUPABASE_URL}/rest/v1/jobs?select=*&limit=25`, { headers: authHeaders });
    const candidatesRes = http.get(`${SUPABASE_URL}/rest/v1/candidates?select=*&limit=50`, { headers: authHeaders });
    const stagesRes = http.get(`${SUPABASE_URL}/rest/v1/pipeline_stages?select=*`, { headers: authHeaders });
    const latency = Date.now() - start;

    readLatency.add(latency);

    const isSuccess = check(jobsRes, { "jobs status is 200": (r) => r.status === 200 }) &&
                      check(candidatesRes, { "candidates status is 200": (r) => r.status === 200 }) &&
                      check(stagesRes, { "stages status is 200": (r) => r.status === 200 });

    errorRate.add(!isSuccess);
  });

  // 3. Stage Kanban Move Mutation
  group("03. Pipeline Kanban Move Mutation", function () {
    const patchPayload = JSON.stringify({
      stage: "مراجعة السيرة",
      stage_entered_at: new Date().toISOString(),
    });

    const moveRes = http.patch(
      `${SUPABASE_URL}/rest/v1/candidates?id=eq.cand-001`,
      patchPayload,
      { headers: authHeaders }
    );

    const isSuccess = check(moveRes, {
      "candidate patch status is 200/204": (r) => r.status === 200 || r.status === 204,
    });

    errorRate.add(!isSuccess);
  });

  // 4. AI-Backed Edge Function Evaluation (evaluate-candidate)
  group("04. AI Evaluation Edge Function", function () {
    const evalPayload = JSON.stringify({
      candidate_id: "cand-001",
      candidate_name: "خالد بن محمد",
      resume_text: "Senior React Developer with 5 years experience in TypeScript, Tailwind, Redux, PostgreSQL",
      skills: ["React", "TypeScript", "Tailwind", "Next.js"],
      experience_years: 5,
    });

    const start = Date.now();
    const evalRes = http.post(
      `${SUPABASE_URL}/functions/v1/evaluate-candidate`,
      evalPayload,
      { headers: authHeaders }
    );
    const latency = Date.now() - start;

    aiEdgeLatency.add(latency);

    const isSuccess = check(evalRes, {
      "AI edge function status is 200": (r) => r.status === 200,
    });

    errorRate.add(!isSuccess);
  });

  // Pacing / Think Time
  sleep(1);
}
