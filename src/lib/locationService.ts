export interface GeoLocationInfo {
  country: string;
  countryCode: string;
  flag: string;
  city: string;
  region: string;
  displayLocation: string;
}

// Country code to Flag Emoji converter
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Arabic Country Names Map
const ARABIC_COUNTRIES: Record<string, string> = {
  SA: "المملكة العربية السعودية",
  EG: "مصر",
  AE: "الإمارات العربية المتحدة",
  KW: "الكويت",
  QA: "قطر",
  BH: "البحرين",
  OM: "عُمان",
  JO: "الأردن",
  LB: "لبنان",
  IQ: "العراق",
  US: "الولايات المتحدة الأمريكية",
  GB: "المملكة المتحدة",
  DE: "ألمانيا",
  FR: "فرنسا",
  CA: "كندا",
  TR: "تركيا",
  MA: "المغرب",
  TN: "تونس",
  DZ: "الجزائر",
  SD: "السودان",
  YE: "اليمن",
  LY: "ليبيا",
  PS: "فلسطين",
  SY: "سوريا",
};

/**
 * Resolves location details from IP address using free edge GeoIP
 */
export async function getGeoLocationFromIP(ip?: string): Promise<GeoLocationInfo> {
  const defaultFallback: GeoLocationInfo = {
    country: "المملكة العربية السعودية",
    countryCode: "SA",
    flag: "🇸🇦",
    city: "الرياض",
    region: "الرياض",
    displayLocation: "الرياض، المملكة العربية السعودية 🇸🇦",
  };

  try {
    const url = ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "localhost"
      ? `https://ipapi.co/${ip}/json/`
      : `https://ipapi.co/json/`;

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return defaultFallback;

    const data = await res.json();
    if (data && data.country_code) {
      const code = data.country_code;
      const flag = getCountryFlag(code);
      const countryAr = ARABIC_COUNTRIES[code] || data.country_name || "موقع مجهول";
      const city = data.city || "";
      const region = data.region || "";

      const locationParts = [city, countryAr].filter(Boolean);
      const displayLocation = `${locationParts.join("، ")} ${flag}`;

      return {
        country: countryAr,
        countryCode: code,
        flag,
        city,
        region,
        displayLocation,
      };
    }
  } catch (e) {
    console.warn("GeoIP lookup notice:", e);
  }

  return defaultFallback;
}
