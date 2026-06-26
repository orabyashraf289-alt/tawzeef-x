/**
 * ترجمة رسائل خطأ المصادقة من الإنجليزية إلى العربية
 */
const errorMap: Record<string, string> = {
  "Invalid login credentials": "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور",
  "Email not confirmed": "يرجى تأكيد بريدك الإلكتروني أولاً",
  "User already registered": "هذا البريد الإلكتروني مسجل مسبقاً",
  "Password should be at least 6 characters": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  "Signup requires a valid password": "يرجى إدخال كلمة مرور صحيحة",
  "Unable to validate email address: invalid format": "صيغة البريد الإلكتروني غير صحيحة",
  "Email rate limit exceeded": "تم تجاوز الحد المسموح. حاول مرة أخرى لاحقاً",
  "For security purposes, you can only request this after": "لأسباب أمنية، يرجى الانتظار قبل المحاولة مرة أخرى",
  "New password should be different from the old password": "كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة",
  "Auth session missing!": "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى",
  "Token has expired or is invalid": "انتهت صلاحية الرابط. يرجى طلب رابط جديد",
  "User not found": "لم يتم العثور على حساب بهذا البريد الإلكتروني",
};

export function translateAuthError(message: string): string {
  // Direct match
  if (errorMap[message]) return errorMap[message];

  // Partial match
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }

  // Fallback
  return message;
}
