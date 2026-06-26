import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
let sql: any = null;
let isMock = true;

// Mock database store for fallback
const mockStore = {
  jobs: [
    {
      id: "j1",
      title: "React Frontend Developer",
      department: "Engineering",
      location: "Cairo, Egypt",
      type: "Full-time",
      status: "نشطة",
      salary_min: 15000,
      salary_max: 22000,
      description: "Looking for an expert React developer with TypeScript experience.",
      requirements: ["React 18", "TypeScript", "Tailwind CSS"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "j2",
      title: "UI/UX Designer",
      department: "Design",
      location: "Riyadh, KSA (Remote)",
      type: "Contract",
      status: "نشطة",
      salary_min: 10000,
      salary_max: 15000,
      description: "Create elegant and modern Recruiter dashboards.",
      requirements: ["Figma", "Design Systems", "Prototyping"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  candidates: [
    {
      id: "c1",
      name: "Ahmed Ali",
      email: "ahmed@example.com",
      phone: "+201000000000",
      role: "React Frontend Developer",
      status: "مقبول",
      stage: "تقديم الطلب",
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: "c2",
      name: "Sara Hassan",
      email: "sara@example.com",
      phone: "+966500000000",
      role: "UI/UX Designer",
      status: "قيد المراجعة",
      stage: "مراجعة السيرة",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  ],
  offers: [
    {
      id: "o1",
      candidate_id: "c1",
      status: "accepted",
      created_at: new Date().toISOString(),
    }
  ]
};

if (databaseUrl) {
  try {
    console.log("🔌 Connecting to PostgreSQL database...");
    sql = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    isMock = false;
    console.log("✅ PostgreSQL connection pool initialized successfully.");
  } catch (err: any) {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    console.log("⚠️ Falling back to built-in mock database store.");
  }
} else {
  console.log("ℹ️ No DATABASE_URL provided. Operating in fast Mock Database mode.");
}

export async function query(tableName: "jobs" | "candidates" | "offers") {
  if (isMock) {
    return mockStore[tableName];
  }
  try {
    return await sql`SELECT * FROM ${sql(tableName)}`;
  } catch (err: any) {
    console.error(`❌ Query failed on ${tableName}:`, err.message);
    console.log("⚠️ Falling back to mock data for this request.");
    return mockStore[tableName];
  }
}

export { isMock };
