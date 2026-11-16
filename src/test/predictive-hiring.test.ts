import { describe, it, expect } from "vitest";
import {
  resolveBenchmarkKey,
  predictTimeToFill,
  predictOfferAcceptance,
  getSaudiLaborMarketTrends,
  evaluateCompanyVsBenchmark,
  forecastQuarterlyHiring,
  SAUDI_MARKET_BENCHMARKS,
} from "@/lib/predictiveHiringEngine";

describe("Predictive Hiring Engine & Saudi Labor Market Benchmarks", () => {
  it("resolves department names to benchmark categories accurately", () => {
    expect(resolveBenchmarkKey("هندسة البرمجيات والتقنية")).toBe("engineering");
    expect(resolveBenchmarkKey("Software Engineering")).toBe("engineering");
    expect(resolveBenchmarkKey("الذكاء الاصطناعي")).toBe("ai_data");
    expect(resolveBenchmarkKey("Data Science & AI")).toBe("ai_data");
    expect(resolveBenchmarkKey("إدارة المنتجات")).toBe("product");
    expect(resolveBenchmarkKey("الموارد البشرية")).toBe("hr");
    expect(resolveBenchmarkKey("المبيعات والتسويق")).toBe("sales_marketing");
    expect(resolveBenchmarkKey("المالية والمحاسبة")).toBe("finance");
    expect(resolveBenchmarkKey("خدمة العملاء")).toBe("customer_support");
    expect(resolveBenchmarkKey(null)).toBe("engineering");
  });

  it("predicts time-to-fill with seniority and salary competitiveness impact", () => {
    // Senior role with below-market salary should take longer
    const slowPrediction = predictTimeToFill({
      department: "هندسة البرمجيات والتقنية",
      experience_level: "senior",
      salary_min: 10000,
      salary_max: 13000, // Market median is 17,500
      candidates_count: 2,
    });

    expect(slowPrediction.predictedDays).toBeGreaterThan(SAUDI_MARKET_BENCHMARKS.engineering.avgTimeToFillDays);
    expect(slowPrediction.riskLevel).toBe("high");
    expect(slowPrediction.salaryCompetitiveness).toBe("below_market");
    expect(slowPrediction.recommendations.length).toBeGreaterThan(0);

    // Junior role with premium salary and large candidate pool should be fast
    const fastPrediction = predictTimeToFill({
      department: "هندسة البرمجيات والتقنية",
      experience_level: "junior",
      salary_min: 20000,
      salary_max: 24000,
      candidates_count: 35,
    });

    expect(fastPrediction.predictedDays).toBeLessThan(SAUDI_MARKET_BENCHMARKS.engineering.avgTimeToFillDays);
    expect(fastPrediction.salaryCompetitiveness).toBe("premium");
  });

  it("calculates offer acceptance likelihood with actionable risk detection", () => {
    // Well matched offer with quick interview loop
    const strongOffer = predictOfferAcceptance({
      expectedSalarySar: 18000,
      offeredSalarySar: 20000,
      aiScore: 92,
      daysInInterviewPipeline: 10,
      noticePeriodDays: 30,
    });

    expect(strongOffer.acceptanceProbability).toBeGreaterThanOrEqual(80);
    expect(strongOffer.status).toBe("high_probability");
    expect(strongOffer.positiveFactors.length).toBeGreaterThan(0);

    // Below expectation offer with prolonged waiting period
    const weakOffer = predictOfferAcceptance({
      expectedSalarySar: 25000,
      offeredSalarySar: 19000,
      aiScore: 80,
      daysInInterviewPipeline: 35,
      noticePeriodDays: 90,
    });

    expect(weakOffer.acceptanceProbability).toBeLessThan(65);
    expect(weakOffer.riskFactors.length).toBeGreaterThan(0);
    expect(weakOffer.recommendedCounterOfferSar).toBe(25000);
  });

  it("provides comprehensive Saudi labor market trend insights for 2026", () => {
    const trends = getSaudiLaborMarketTrends();
    expect(trends.length).toBeGreaterThanOrEqual(4);

    const genAi = trends.find((t) => t.id === "gen-ai-eng");
    expect(genAi).toBeDefined();
    expect(genAi?.growthYoY).toBeGreaterThan(40);
    expect(genAi?.saudizationPriority).toBe(true);
    expect(genAi?.topSkills).toContain("LLM Fine-tuning");
  });

  it("evaluates enterprise performance against national industry benchmarks", () => {
    const comparison = evaluateCompanyVsBenchmark({
      avgTimeToFillDays: 22, // Faster than market 32
      avgCostPerHireSar: 3500, // Cheaper than market 4600
      offerAcceptanceRate: 88, // Better than market 77%
      avgMonthlySalarySar: 16500, // Higher than market 14500
    });

    expect(comparison.length).toBe(4);
    const timeMetric = comparison.find((m) => m.metricName === "time_to_fill");
    expect(timeMetric?.status).toBe("superior");

    const costMetric = comparison.find((m) => m.metricName === "cost_per_hire");
    expect(costMetric?.status).toBe("superior");

    const acceptMetric = comparison.find((m) => m.metricName === "offer_acceptance_rate");
    expect(acceptMetric?.status).toBe("superior");
  });

  it("forecasts quarterly demand and headcount budget", () => {
    const forecasts = forecastQuarterlyHiring(6, 50);
    expect(forecasts).toHaveLength(4);
    expect(forecasts[0].quarter).toBe("Q1 2027");
    expect(forecasts[0].projectedNewHires).toBeGreaterThan(0);
    expect(forecasts[0].projectedBudgetSar).toBeGreaterThan(0);
  });
});
