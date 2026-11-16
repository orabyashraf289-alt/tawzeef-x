/**
 * ترجمة رسائل خطأ المصادقة من الإنجليزية إلى العربية وتوضيح أسبابها
 */
const errorMap: Record<string, string> = {
  "Invalid login credentials": "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور",
  "Email not confirmed": "يرجى تأكيد بريدك الإلكتروني أولاً لتفعيل الحساب",
  "User already registered": "هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة",
  "Password should be at least 6 characters": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  "Signup requires a valid password": "يرجى إدخال كلمة مرور صحيحة",
  "Unable to validate email address: invalid format": "صيغة البريد الإلكتروني غير صحيحة",
  "Email rate limit exceeded": "تم تجاوز الحد المسموح لإرسال الرسائل. يرجى الانتظار والمحاولة لاحقاً",
  "For security purposes, you can only request this after": "لأسباب أمنية، يرجى الانتظار قليلاً قبل المحاولة مرة أخرى",
  "New password should be different from the old password": "كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة",
  "Auth session missing!": "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى",
  "Token has expired or is invalid": "انتهت صلاحية الرابط. يرجى طلب رابط جديد",
  "User not found": "لم يتم العثور على حساب بهذا البريد الإلكتروني",
  "Error sending confirmation email": "تعذر إرسال بريد التأكيد. يرجى التأكد من إعدادات SMTP في Supabase أو تعطيل خيار Confirm Email",
  "confirmation email": "تعذر إرسال بريد التأكيد. يرجى مراجعة إعدادات البريد (SMTP) أو تعطيل خيار تأكيد البريد في Supabase",
  "unexpected_failure": "حدث خطأ غير متوقع في خدمة المصادقة. يرجى المحاولة مرة أخرى",
  "Email link is invalid or has expired": "رابط البريد الإلكتروني غير صالح أو انتهت صلاحيته",
};

export function translateAuthError(message?: string): string {
  if (!message) return "حدث خطأ أثناء معالجة الطلب";

  // Direct match
  if (errorMap[message]) return errorMap[message];

  // Partial case-insensitive match
  const lowerMsg = message.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (lowerMsg.includes(key.toLowerCase())) return value;
  }

  // Fallback
  return message;
}
