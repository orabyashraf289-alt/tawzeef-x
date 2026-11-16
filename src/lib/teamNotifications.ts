/**
 * Team Collaboration & Notifications Engine for Slack, Microsoft Teams, and Webhooks
 * Provides formatted Block Kit (Slack), MessageCard / Adaptive Cards (Teams),
 * and standard JSON payloads for automated recruitment events.
 */

export type TeamPlatformType = "slack" | "teams" | "generic";

export type TeamNotificationEvent =
  | "candidate.applied"
  | "candidate.status_changed"
  | "candidate.top_match"
  | "interview.scheduled"
  | "interview.completed"
  | "offer.sent"
  | "offer.accepted"
  | "job.created"
  | "test.ping";

export interface TeamNotificationPayload {
  event: TeamNotificationEvent;
  title: string;
  summary: string;
  details?: Record<string, string | number | boolean | null | undefined>;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

export const TEAM_NOTIFICATION_EVENTS: { value: TeamNotificationEvent; label: string; desc: string; icon: string }[] = [
  {
    value: "candidate.applied",
    label: "تقديم مرشح جديد",
    desc: "إشعار عند تقديم مرشح جديد على أي وظيفة منشورة",
    icon: "👤",
  },
  {
    value: "candidate.top_match",
    label: "مرشح فائق التطابق (ذكاء اصطناعي > 85%)",
    desc: "تنبيه فوري عند عثور محرك الفرز على مرشح بتوافق استثنائي",
    icon: "⭐",
  },
  {
    value: "candidate.status_changed",
    label: "تغيير مرحلة مرشح",
    desc: "إشعار عند نقل مرشح من مرحلة إلى أخرى في مسار التوظيف",
    icon: "🔄",
  },
  {
    value: "interview.scheduled",
    label: "جدولة أو حجز مقابلة",
    desc: "تنبيه بموعد المقابلة الجديد، اسم المرشح، واللجنة",
    icon: "📅",
  },
  {
    value: "interview.completed",
    label: "اكتمال تقييم المقابلة",
    desc: "إشعار فور رصد نتائج وتقييمات المقابلة الشخصية",
    icon: "✅",
  },
  {
    value: "offer.sent",
    label: "إصدار وتوجيه عرض عمل",
    desc: "إشعار عند إرسال عرض وظيفي رسمي للمرشح",
    icon: "💼",
  },
  {
    value: "offer.accepted",
    label: "قبول وتوقيع عرض العمل 🎉",
    desc: "تنبيه احتفالي فوري عند توقيع المرشح على العرض الوظيفي",
    icon: "🎉",
  },
  {
    value: "job.created",
    label: "نشر وظيفة شاغرة جديدة",
    desc: "إعلام فريق العمل ببدء استقبال الطلبات على وظيفة جديدة",
    icon: "📢",
  },
  {
    value: "test.ping",
    label: "فحص وتجربة الاتصال",
    desc: "إرسال رسالة تجريبية للتأكد من سلامة الربط بالقناة",
    icon: "⚡",
  },
];

/**
 * Automatically detects target platform based on Webhook URL patterns
 */
export function detectPlatformFromUrl(url: string): TeamPlatformType {
  const normalized = url.toLowerCase().trim();
  if (normalized.includes("hooks.slack.com")) {
    return "slack";
  }
  if (
    normalized.includes("webhook.office.com") ||
    normalized.includes("outlook.office.com") ||
    normalized.includes("office.com") ||
    normalized.includes("logic.azure.com") ||
    normalized.includes("teams.microsoft.com") ||
    normalized.includes("powerautomate.com") ||
    normalized.includes("office365.com")
  ) {
    return "teams";
  }
  return "generic";
}

/**
 * Builds rich Slack Block Kit payload
 */
export function buildSlackPayload(data: TeamNotificationPayload): Record<string, unknown> {
  const fields = Object.entries(data.details || {})
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, val]) => ({
      type: "mrkdwn",
      text: `*${key}:*\n${val}`,
    }));

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🚀 ${data.title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${data.summary}`,
      },
    },
  ];

  if (fields.length > 0) {
    // Slack allows up to 10 fields per section block
    for (let i = 0; i < fields.length; i += 8) {
      blocks.push({
        type: "section",
        fields: fields.slice(i, i + 8),
      });
    }
  }

  if (data.actionUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: data.actionText || "معاينة في توظيف إكس ↗",
            emoji: true,
          },
          url: data.actionUrl,
          style: "primary",
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `🤖 تم الإرسال تلقائياً عبر منصة *توظيف إكس (TawzeefX)* • ${new Date().toLocaleTimeString("ar-SA")}`,
      },
    ],
  });

  return {
    text: `${data.title}: ${data.summary}`,
    blocks,
  };
}

/**
 * Builds Microsoft Teams Connector MessageCard / Adaptive Card payload
 */
export function buildTeamsPayload(data: TeamNotificationPayload): Record<string, unknown> {
  const facts = Object.entries(data.details || {})
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([name, value]) => ({
      name,
      value: String(value),
    }));

  const themeColor = data.event === "offer.accepted"
    ? "22c55e"
    : data.event === "candidate.top_match"
    ? "f59e0b"
    : "6366f1";

  const payload: Record<string, unknown> = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: data.title,
    themeColor,
    title: `⚡ ${data.title}`,
    text: data.summary,
    sections: [
      {
        activityTitle: "منصة توظيف إكس الذكية",
        activitySubtitle: new Date().toLocaleString("ar-SA"),
        activityImage: "https://tawzeefx.com/favicon.png",
        facts,
        markdown: true,
      },
    ],
  };

  if (data.actionUrl) {
    payload.potentialAction = [
      {
        "@type": "OpenURI",
        name: data.actionText || "فتح التفاصيل في المنصة",
        targets: [
          {
            os: "default",
            uri: data.actionUrl,
          },
        ],
      },
    ];
  }

  return payload;
}

/**
 * Builds standard JSON payload for generic webhooks (Zapier, n8n, Make)
 */
export function buildGenericPayload(data: TeamNotificationPayload): Record<string, unknown> {
  return {
    event: data.event,
    title: data.title,
    summary: data.summary,
    timestamp: new Date().toISOString(),
    details: data.details || {},
    action_url: data.actionUrl || null,
    metadata: data.metadata || {},
  };
}

/**
 * Formats a notification payload based on target platform
 */
export function formatPayloadForUrl(
  url: string,
  data: TeamNotificationPayload
): { platform: TeamPlatformType; body: string } {
  const platform = detectPlatformFromUrl(url);
  let payloadObject: Record<string, unknown>;

  if (platform === "slack") {
    payloadObject = buildSlackPayload(data);
  } else if (platform === "teams") {
    payloadObject = buildTeamsPayload(data);
  } else {
    payloadObject = buildGenericPayload(data);
  }

  return {
    platform,
    body: JSON.stringify(payloadObject),
  };
}

/**
 * Dispatches a notification directly to a webhook with error tracking
 */
export async function dispatchTeamNotification(
  url: string,
  data: TeamNotificationPayload
): Promise<{ success: boolean; status: number; message: string; platform: TeamPlatformType }> {
  const { platform, body } = formatPayloadForUrl(url, data);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    const text = await res.text().catch(() => "");
    if (res.ok) {
      return {
        success: true,
        status: res.status,
        message: text || "OK",
        platform,
      };
    }

    return {
      success: false,
      status: res.status,
      message: text || `HTTP ${res.status}`,
      platform,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 0,
      message: err.message || "Failed to deliver webhook",
      platform,
    };
  }
}
