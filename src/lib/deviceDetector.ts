export interface DeviceDetails {
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceName: string;
  osName: string;
  browserName: string;
  fullString: string;
}

/**
 * Intelligent client-side device & browser detector for Audit Logging
 */
export function detectUserDevice(): DeviceDetails {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      deviceType: "Desktop",
      deviceName: "كمبيوتر شخصي (Desktop PC)",
      osName: "Windows",
      browserName: "Web Browser",
      fullString: "كمبيوتر شخصي (Windows • Web Browser)",
    };
  }

  const ua = navigator.userAgent;
  let osName = "نظام غامض";
  let deviceName = "كمبيوتر شخصي";
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  let browserName = "متصفح الويب";

  // Device & OS Detection
  if (/iPad/i.test(ua)) {
    deviceType = "Tablet";
    deviceName = "جهاز تابلت (Apple iPad)";
    osName = "iPadOS";
  } else if (/iPhone/i.test(ua)) {
    deviceType = "Mobile";
    deviceName = "هاتف آيفون (Apple iPhone)";
    osName = "iOS";
  } else if (/Android/i.test(ua)) {
    const isTablet = !/mobile/i.test(ua);
    deviceType = isTablet ? "Tablet" : "Mobile";
    deviceName = isTablet ? "تابلت أندرويد (Android Tablet)" : "هاتف أندرويد (Android Phone)";
    osName = "Android";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = "Desktop";
    deviceName = "جهاز ماك (MacBook / iMac)";
    osName = "macOS";
  } else if (/Windows/i.test(ua)) {
    deviceType = "Desktop";
    deviceName = "كمبيوتر شخصي (Windows PC)";
    osName = "Windows";
  } else if (/Linux/i.test(ua)) {
    deviceType = "Desktop";
    deviceName = "كمبيوتر لينكس (Linux PC)";
    osName = "Linux";
  }

  // Browser Detection
  if (ua.includes("Firefox/")) {
    browserName = "Firefox";
  } else if (ua.includes("Edg/")) {
    browserName = "Microsoft Edge";
  } else if (ua.includes("Chrome/")) {
    browserName = "Google Chrome";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browserName = "Apple Safari";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    browserName = "Opera";
  }

  const fullString = `${deviceName} (${osName} • ${browserName})`;

  return {
    deviceType,
    deviceName,
    osName,
    browserName,
    fullString,
  };
}
