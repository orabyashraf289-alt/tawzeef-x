import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExecutiveKpiHub from '@/components/reports/ExecutiveKpiHub';
import type { CandidateRow, JobRow } from '@/hooks/useJobs';

const mockJobs: JobRow[] = [
  {
    id: 'job-1',
    title: 'مهندس برمجيات أول',
    department: 'الهندسة والتقنية',
    company_id: 'comp-1',
    created_at: '2026-10-01T00:00:00Z',
    status: 'open',
  } as any,
  {
    id: 'job-2',
    title: 'مدير تسويق رقمي',
    department: 'التسويق والمبيعات',
    company_id: 'comp-1',
    created_at: '2026-10-01T00:00:00Z',
    status: 'open',
  } as any,
];

const mockCandidates: CandidateRow[] = [
  {
    id: 'c-1',
    name: 'سارة الأحمد',
    job_id: 'job-1',
    company_id: 'comp-1',
    stage: 'العرض الوظيفي',
    status: 'مقبول',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z', // 14 days Time-to-Hire
    ai_score: 92,
  } as any,
  {
    id: 'c-2',
    name: 'فيصل العتيبي',
    job_id: 'job-1',
    company_id: 'comp-1',
    stage: 'المقابلة التقنية',
    status: 'قيد المراجعة',
    created_at: '2026-10-05T00:00:00Z',
    ai_score: 84,
  } as any,
  {
    id: 'c-3',
    name: 'نوف القحطاني',
    job_id: 'job-2',
    company_id: 'comp-1',
    stage: 'تقديم الطلب',
    status: 'مرفوض',
    created_at: '2026-10-07T00:00:00Z',
    ai_score: 55,
  } as any,
];

describe('Executive HR Analytics & Time-to-Hire KPI Hub', () => {
  it('renders executive KPI summary metrics correctly', () => {
    render(
      <ExecutiveKpiHub
        candidates={mockCandidates}
        jobs={mockJobs}
        locale="ar"
      />
    );

    // KPI 1: Time-to-Hire
    expect(screen.getByText(/متوسط زمن شغل الوظيفة/i)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument(); // 14 days

    // KPI 2: Overall Conversion Rate
    expect(screen.getByText(/معدل التحول إلى تعيين/i)).toBeInTheDocument();
    expect(screen.getAllByText(/33%/i).length).toBeGreaterThanOrEqual(1);

    // KPI 3: Offer Acceptance
    expect(screen.getByText(/معدل قبول العروض/i)).toBeInTheDocument();

    // KPI 4: AI Cost Savings
    expect(screen.getByText(/وفر التكاليف بالذكاء الاصطناعي/i)).toBeInTheDocument();
  });

  it('renders multi-step conversion funnel and drop-off rates', () => {
    render(
      <ExecutiveKpiHub
        candidates={mockCandidates}
        jobs={mockJobs}
        locale="ar"
      />
    );

    expect(screen.getByText(/مسار التحول التنفيذي ومعدلات التسرب بين المراحل/i)).toBeInTheDocument();
    expect(screen.getByText(/1. استلام الطلبات/i)).toBeInTheDocument();
    expect(screen.getByText(/2. الفرز والمطابقة/i)).toBeInTheDocument();
    expect(screen.getByText(/3. المقابلات الذكية/i)).toBeInTheDocument();
    expect(screen.getByText(/4. العروض الصادرة/i)).toBeInTheDocument();
    expect(screen.getByText(/5. التعيين النهائي/i)).toBeInTheDocument();
  });

  it('displays departmental SLA performance and time-to-hire status badges', () => {
    render(
      <ExecutiveKpiHub
        candidates={mockCandidates}
        jobs={mockJobs}
        locale="ar"
      />
    );

    expect(screen.getByText(/الهندسة والتقنية/i)).toBeInTheDocument();
    expect(screen.getAllByText(/سرعة مثالية/i).length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty state gracefully without throwing', () => {
    render(
      <ExecutiveKpiHub
        candidates={[]}
        jobs={[]}
        locale="ar"
      />
    );

    expect(screen.getByText(/متوسط زمن شغل الوظيفة/i)).toBeInTheDocument();
    expect(screen.getByText(/1. استلام الطلبات/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0%/i).length).toBeGreaterThanOrEqual(1);
  });
});
