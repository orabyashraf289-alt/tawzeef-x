import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  RECRUITMENT_TEMPLATES,
  interpolateText,
  normalizePhoneNumber,
  generateWhatsAppLink,
} from '@/lib/messagingTemplates';
import InteractiveMessageSimulator from '@/components/messaging/InteractiveMessageSimulator';
import CandidateQuickMessageDialog from '@/components/messaging/CandidateQuickMessageDialog';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Recruitment Messaging & WhatsApp Engine', () => {
  it('correctly interpolates dynamic template variables with single and double braces', () => {
    const template = 'أهلاً بك {{candidate_name}}، تم نقلك لوظيفة {job_title} في {{company_name}}.';
    const vars = {
      candidate_name: 'نورة الدوسري',
      job_title: 'أخصائي موارد بشرية',
      company_name: 'شركة توظيف إكس',
    };

    const result = interpolateText(template, vars);
    expect(result).toBe('أهلاً بك نورة الدوسري، تم نقلك لوظيفة أخصائي موارد بشرية في شركة توظيف إكس.');
  });

  it('normalizes local and international Saudi phone numbers for WhatsApp', () => {
    const p1 = normalizePhoneNumber('0501234567');
    expect(p1.valid).toBe(true);
    expect(p1.normalized).toBe('+966501234567');

    const p2 = normalizePhoneNumber('966551234567');
    expect(p2.valid).toBe(true);
    expect(p2.normalized).toBe('+966551234567');

    const p3 = normalizePhoneNumber('+966509876543');
    expect(p3.valid).toBe(true);
    expect(p3.normalized).toBe('+966509876543');

    const p4 = normalizePhoneNumber('123');
    expect(p4.valid).toBe(false);
  });

  it('generates a valid WhatsApp direct click-to-chat URL with encoded text', () => {
    const url = generateWhatsAppLink('0501234567', 'مرحباً بك في المقابلة');
    expect(url).toContain('https://wa.me/966501234567?text=');
    expect(url).toContain(encodeURIComponent('مرحباً بك في المقابلة'));
  });

  it('verifies recruitment template catalog structure and requirements', () => {
    expect(RECRUITMENT_TEMPLATES.length).toBeGreaterThanOrEqual(5);

    const inviteTpl = RECRUITMENT_TEMPLATES.find((t) => t.id === 'interview_invite');
    expect(inviteTpl).toBeDefined();
    expect(inviteTpl?.whatsapp.templateName).toBe('tx_interview_invitation_v1');
    expect(inviteTpl?.email.subject).toContain('{{job_title}}');
    expect(inviteTpl?.whatsapp.text).toContain('{{interview_link}}');

    const offerTpl = RECRUITMENT_TEMPLATES.find((t) => t.id === 'job_offer');
    expect(offerTpl).toBeDefined();
    expect(offerTpl?.whatsapp.text).toContain('عرض عمل');
  });

  it('renders InteractiveMessageSimulator in WhatsApp mode with verified account styling', () => {
    render(
      <InteractiveMessageSimulator
        channel="whatsapp"
        content={{
          whatsappText: 'مرحباً سارة، هذا اختبار لمشهد الواتساب',
          recipientName: 'سارة',
          companyName: 'توظيف إكس',
        }}
      />
    );

    expect(screen.getAllByText(/توظيف إكس/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/حساب معتمد/i)).toBeInTheDocument();
    expect(screen.getByText(/مرحباً سارة، هذا اختبار لمشهد الواتساب/i)).toBeInTheDocument();
  });

  it('renders CandidateQuickMessageDialog with candidate details and action tabs', () => {
    render(
      <CandidateQuickMessageDialog
        open={true}
        onOpenChange={() => {}}
        candidate={{
          id: 'cand-7788',
          name: 'عبدالله القحطاني',
          email: 'abdullah@example.com',
          phone: '+966501112233',
          job_title: 'مطور واجهات أول',
          company_name: 'شركة مسار التقنية',
        }}
      />
    );

    expect(screen.getAllByText(/عبدالله القحطاني/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/واتساب المعتمد/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/البريد الإلكتروني/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/جدولة إرسال آلي/i)).toBeInTheDocument();
  });
});
