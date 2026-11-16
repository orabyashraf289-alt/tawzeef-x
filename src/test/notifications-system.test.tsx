import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationCenterPopover from '@/components/notifications/NotificationCenterPopover';
import NotificationPreferencesDialog from '@/components/notifications/NotificationPreferencesDialog';
import {
  getNotificationPriority,
  getNotificationDestination,
  isSoundNotificationEnabled,
  setSoundNotificationEnabled,
} from '@/lib/notificationDispatcher';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

// Mock contexts and hooks
const mockNotifications = [
  {
    id: 'n-1',
    user_id: 'user-1',
    type: 'interview_reminder',
    title: 'تذكير عاجل: مقابلة تقنية بعد 15 دقيقة',
    description: 'مقابلة مع المرشح أحمد السبيعي لوظيفة مهندس برمجيات',
    read: false,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'n-2',
    user_id: 'user-1',
    type: 'offer',
    title: 'تم قبول العرض الوظيفي',
    description: 'المرشحة سارة وافقت على العرض المالي بنجاح',
    read: false,
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'n-3',
    user_id: 'user-1',
    type: 'candidate',
    title: 'متقدم جديد للوظيفة',
    description: 'تم تقديم سيرة ذاتية جديدة',
    read: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

vi.mock('@/hooks/useJobs', () => ({
  useNotifications: () => ({
    data: mockNotifications,
    isLoading: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'recruiter@example.com' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

describe('Notifications System & Realtime Center', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Notification Dispatcher Helpers', () => {
    it('accurately identifies urgent and high priority notifications', () => {
      expect(getNotificationPriority('interview_reminder', 'تذكير')).toBe('urgent');
      expect(getNotificationPriority('system', 'تنبيه أمان عاجل')).toBe('urgent');
      expect(getNotificationPriority('interview', 'مقابلة جديدة')).toBe('high');
      expect(getNotificationPriority('offer', 'عرض وظيفي')).toBe('high');
      expect(getNotificationPriority('candidate', 'متقدم جديد')).toBe('normal');
    });

    it('returns proper destination routes and action labels', () => {
      expect(getNotificationDestination('interview').path).toBe('/interviews');
      expect(getNotificationDestination('candidate').path).toBe('/candidates');
      expect(getNotificationDestination('offer').path).toBe('/offers');
      expect(getNotificationDestination('task').path).toBe('/tasks');
    });

    it('persists sound preferences in localStorage', () => {
      expect(isSoundNotificationEnabled()).toBe(true);
      setSoundNotificationEnabled(false);
      expect(isSoundNotificationEnabled()).toBe(false);
      setSoundNotificationEnabled(true);
      expect(isSoundNotificationEnabled()).toBe(true);
    });
  });

  describe('NotificationCenterPopover Component', () => {
    it('renders bell trigger with unread count badge', () => {
      renderWithProviders(<NotificationCenterPopover />);

      // Unread count is 2 (n-1 and n-2)
      expect(screen.getByRole('button', { name: /مركز الإشعارات/i })).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('opens popover and displays notification list with priority tags', async () => {
      renderWithProviders(<NotificationCenterPopover />);

      const trigger = screen.getByRole('button', { name: /مركز الإشعارات/i });
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/تذكير عاجل: مقابلة تقنية بعد 15 دقيقة/i)).toBeInTheDocument();
        expect(screen.getByText(/تم قبول العرض الوظيفي/i)).toBeInTheDocument();
        // Priority tags
        expect(screen.getByText(/عاجل 🔥/i)).toBeInTheDocument();
        expect(screen.getByText(/هام ⭐/i)).toBeInTheDocument();
      });
    });

    it('filters between all and unread notifications inside popover', async () => {
      renderWithProviders(<NotificationCenterPopover />);

      fireEvent.click(screen.getByRole('button', { name: /مركز الإشعارات/i }));

      await waitFor(() => {
        expect(screen.getByText(/الكل \(3\)/i)).toBeInTheDocument();
        expect(screen.getByText(/غير مقروء \(2\)/i)).toBeInTheDocument();
      });

      // Click Unread tab
      fireEvent.click(screen.getByText(/غير مقروء \(2\)/i));
      expect(screen.queryByText(/متقدم جديد للوظيفة/i)).not.toBeInTheDocument();
    });
  });

  describe('NotificationPreferencesDialog Component', () => {
    it('renders channel and category customization options', () => {
      const handleOpenChange = vi.fn();
      render(<NotificationPreferencesDialog open={true} onOpenChange={handleOpenChange} />);

      expect(screen.getByText(/تفضيلات وإعدادات الإشعارات/i)).toBeInTheDocument();
      expect(screen.getByText(/التنبيه الصوتي المباشر \(Audio Chime\)/i)).toBeInTheDocument();
      expect(screen.getByText(/إشعارات المتصفح \(Web Push\)/i)).toBeInTheDocument();
      expect(screen.getByText(/تنبيهات واتساب الذكية/i)).toBeInTheDocument();
      expect(screen.getByText(/تذكيرات المقابلات/i)).toBeInTheDocument();
    });

    it('saves preferences and closes on confirmation', () => {
      const handleOpenChange = vi.fn();
      render(<NotificationPreferencesDialog open={true} onOpenChange={handleOpenChange} />);

      const saveBtn = screen.getByText(/حفظ التفضيلات/i);
      fireEvent.click(saveBtn);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(localStorage.getItem('tx_notification_preferences_v2')).toBeTruthy();
    });
  });
});
