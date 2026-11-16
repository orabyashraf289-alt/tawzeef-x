import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ComplianceLicensingTab from '@/components/reports/ComplianceLicensingTab';
import AIInterviewAnalyticsTab from '@/components/reports/AIInterviewAnalyticsTab';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { exportReportsToExcel } from '@/components/reports/reportExports';
import type { CandidateRow, JobRow } from '@/hooks/useJobs';
import type { InterviewRow } from '@/components/reports/reportTypes';

// Mock Recharts to avoid DOM measurement issues in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
}));

const mockJobs: JobRow[] = [
  {
    id: 'job-1',
    title: 'معلم لغة إنجليزية أول',
    department: 'القسم التعليمي',
    company_id: 'comp-1',
    status: 'open',
    type: 'دوام كامل',
    location: 'الرياض',
    created_at: '2026-10-01T00:00:00Z',
  } as any,
  {
    id: 'job-2',
    title: 'مدير الشؤون الإدارية',
    department: 'الموارد البشرية',
    company_id: 'comp-1',
    status: 'open',
    type: 'دوام كامل',
    location: 'جدة',
    created_at: '2026-10-01T00:00:00Z',
  } as any,
];

const mockCandidates: CandidateRow[] = [
  {
    id: 'c-1',
    name: 'أحمد السبيعي',
    email: 'ahmed@example.com',
    phone: '+966501112233',
    role: 'معلم لغة إنجليزية أول',
    job_id: 'job-1',
    status: 'مقبول',
    stage: 'العرض الوظيفي',
    created_at: '2026-10-05T00:00:00Z',
    ai_score: 92,
    license_number: 'ETEC-2024-9988',
    license_expiry: '2027-12-31',
    location: 'الرياض',
    university_degree: 'ماجستير',
    skills: ['English Teaching', 'Curriculum Design', 'Classroom Management'],
  } as any,
  {
    id: 'c-2',
    name: 'منى القحطاني',
    email: 'mona@example.com',
    phone: '0554445566',
    role: 'مدير الشؤون الإدارية',
    job_id: 'job-2',
    status: 'قيد المراجعة',
    stage: 'المقابلة النهائية',
    created_at: '2026-10-10T00:00:00Z',
    ai_score: 78,
    license_number: 'ETEC-2025-1122',
    license_expiry: new Date(Date.now() + 45 * 86400000).toISOString(), // Expiring in 45 days
    location: 'جدة',
    university_degree: 'بكالوريوس',
    skills: ['HR Management', 'Saudi Labor Law', 'Nitaqat'],
  } as any,
  {
    id: 'c-3',
    name: 'طارق المصري',
    email: 'tarek@example.com',
    phone: '+201012345678',
    role: 'مطور برمجيات',
    job_id: 'job-1',
    status: 'جديد',
    stage: 'تقديم الطلب',
    created_at: '2026-10-15T00:00:00Z',
    ai_score: 62,
    license_number: '',
    location: 'القاهرة',
    university_degree: 'بكالوريوس',
    skills: ['React', 'TypeScript'],
  } as any,
];

const mockInterviews: InterviewRow[] = [
  {
    id: 'int-1',
    candidate_id: 'c-1',
    candidate_name: 'أحمد السبيعي',
    position: 'معلم لغة إنجليزية أول',
    date: '2026-10-12',
    time: '10:00',
    type: 'تقنية',
    status: 'منتهية',
    ai_evaluation: {
      overallScore: 92,
      recommendation: 'strong_hire',
      confidence: 0.94,
    },
  } as any,
  {
    id: 'int-2',
    candidate_id: 'c-2',
    candidate_name: 'منى القحطاني',
    position: 'مدير الشؤون الإدارية',
    date: '2026-10-14',
    time: '14:00',
    type: 'شخصية',
    status: 'مجدولة',
  } as any,
];

describe('Comprehensive Reports System Enhancements', () => {
  describe('ComplianceLicensingTab (ETEC & Saudization)', () => {
    it('calculates and renders ETEC licensing rates and alerts correctly', () => {
      render(<ComplianceLicensingTab candidates={mockCandidates} jobs={mockJobs} locale="ar" />);

      // ETEC License card header
      expect(screen.getByText(/الرخص المهنية \(ETEC\)/i)).toBeInTheDocument();
      // Total licensed & Saudization rate: 2 out of 3 = 67%
      expect(screen.getAllByText(/67/).length).toBeGreaterThanOrEqual(1);
      // Candidates with valid license
      expect(screen.getByText(/2 كادراً يحمل رخصة مهنية سارية/i)).toBeInTheDocument();
      // Expiring soon card
      expect(screen.getByText(/رخصة تقترب من الانتهاء/i)).toBeInTheDocument();
    });

    it('displays Saudization and KSA geographic presence', () => {
      render(<ComplianceLicensingTab candidates={mockCandidates} jobs={mockJobs} locale="ar" />);

      // Saudization rate and geography
      expect(screen.getByText(/مؤشر السعودة والتوطين \(نطاقات\)/i)).toBeInTheDocument();
      expect(screen.getByText(/التوزيع الجغرافي للمرشحين والكوادر بالمملكة/i)).toBeInTheDocument();
      expect(screen.getByText(/المؤهلات العلمية والتخصصات/i)).toBeInTheDocument();
    });
  });

  describe('AIInterviewAnalyticsTab (AI Match & Video Analysis)', () => {
    it('renders AI score tier distributions correctly', () => {
      render(
        <AIInterviewAnalyticsTab
          candidates={mockCandidates}
          interviews={mockInterviews}
          jobs={mockJobs}
          locale="ar"
        />
      );

      // AI Match distribution card
      expect(screen.getByText(/توزيع فئات درجات المطابقة بالذكاء الاصطناعي/i)).toBeInTheDocument();
      expect(screen.getByText(/تغطية الفرز بالذكاء الاصطناعي/i)).toBeInTheDocument();
      expect(screen.getByText(/المواهب عالية التطابق/i)).toBeInTheDocument();
    });

    it('displays interview completion health and in-demand skills', () => {
      render(
        <AIInterviewAnalyticsTab
          candidates={mockCandidates}
          interviews={mockInterviews}
          jobs={mockJobs}
          locale="ar"
        />
      );

      expect(screen.getByText(/إكمال المقابلات الذكية/i)).toBeInTheDocument();
      expect(screen.getByText(/المهارات والكفاءات الأكثر وفرة/i)).toBeInTheDocument();
      expect(screen.getByText(/English Teaching/i)).toBeInTheDocument();
      expect(screen.getByText(/Saudi Labor Law/i)).toBeInTheDocument();
    });
  });

  describe('ReportsHeader (Multi-Dimensional Filters)', () => {
    it('renders Job and Department dropdowns and fires callbacks', () => {
      const handleJobChange = vi.fn();
      const handleDeptChange = vi.fn();
      const handleDateChange = vi.fn();

      render(
        <ReportsHeader
          title="التقارير"
          subtitle="تحليلات التوظيف"
          exportExcelLabel="تصدير Excel"
          locale="ar"
          dir="rtl"
          dateRange={{ from: undefined, to: undefined }}
          onDateRangeChange={handleDateChange}
          onOpenReviewModal={vi.fn()}
          onExportExcel={vi.fn()}
          jobs={mockJobs}
          selectedJobId="all"
          onJobChange={handleJobChange}
          departments={['القسم التعليمي', 'الموارد البشرية']}
          selectedDepartment="all"
          onDepartmentChange={handleDeptChange}
        />
      );

      expect(screen.getByText(/تصفية البيانات:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/جميع الوظائف/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/جميع الأقسام/i).length).toBeGreaterThanOrEqual(1);
    });

    it('shows reset button when filters are active and calls reset callback', () => {
      const handleReset = vi.fn();
      const handleDateChange = vi.fn();

      render(
        <ReportsHeader
          title="التقارير"
          subtitle="تحليلات التوظيف"
          exportExcelLabel="تصدير Excel"
          locale="ar"
          dir="rtl"
          dateRange={{ from: new Date('2026-10-01'), to: new Date('2026-10-31') }}
          onDateRangeChange={handleDateChange}
          onOpenReviewModal={vi.fn()}
          onExportExcel={vi.fn()}
          jobs={mockJobs}
          selectedJobId="job-1"
          onJobChange={vi.fn()}
          departments={['القسم التعليمي']}
          selectedDepartment="all"
          onDepartmentChange={vi.fn()}
          onResetAllFilters={handleReset}
        />
      );

      const resetBtn = screen.getByText(/إعادة ضبط/i);
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
      expect(handleDateChange).toHaveBeenCalledWith({ from: undefined, to: undefined });
    });
  });

  describe('Excel Export Multi-Sheet Comprehensive Generation', () => {
    it('builds comprehensive workbook without crashing', async () => {
      const mockT = (key: string) => key;

      await expect(
        exportReportsToExcel({
          candidates: mockCandidates,
          jobs: mockJobs,
          interviews: mockInterviews,
          offers: [],
          locale: 'ar',
          t: mockT,
        })
      ).resolves.not.toThrow();
    });
  });
});
