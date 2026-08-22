export interface JobCustomSpecs {
  school_name?: string;
  school_type?: string;
  curriculum?: string;
  grade_level?: string;
  weekly_classes?: string;
  work_start_date?: string;
  working_hours?: string;
  benefits_package?: string;
  class_size?: string;
  application_deadline?: string;
  is_educational?: boolean;
}

export const DEFAULT_SCHOOL_TYPES = [
  "عالمية (International)",
  "أهلية",
  "دولية (الدبلومة الأمريكية)",
  "بريطانية (British School)",
  "حكومية / تحفيظ",
  "مدارس الموهوبين",
  "الأندلس الصغيرة / رياض أطفال (KG)",
  "مؤسسة تدريب وتعليم مهني",
];

export const DEFAULT_CURRICULA = [
  "أمريكي (American Curriculum - NGSS)",
  "بريطاني (Cambridge / Edexcel)",
  "المنهج الوزاري السعودي المطور",
  "البكالوريا الدولية (IB - International Baccalaureate)",
  "المسار الدولي ثنائي اللغة",
  "المسار الفرنسي (French Curriculum)",
  "منهج STEM والذكاء الاصطناعي",
];

export const DEFAULT_GRADE_LEVELS = [
  "رياض الأطفال (KG1 - KG3)",
  "المرحلة الابتدائية (الصفوف 1 - 3 - الصفوف الأولية)",
  "المرحلة الابتدائية (الصفوف 4 - 6 - الصفوف العليا)",
  "المرحلة المتوسطة (الصفوف 7 - 9)",
  "المرحلة الثانوية (الصفوف 10 - 12)",
  "المرحلة المتوسطة والثانوية (الصفوف 7 - 12)",
  "جميع المراحل التعليمية (K-12)",
];

export const DEFAULT_TEACHING_LOADS = [
  "12 - 16 حصة أسبوعياً (نصاب مخفض)",
  "18 - 20 حصة أسبوعياً (نصاب قياسي)",
  "22 - 24 حصة أسبوعياً (نصاب كامل)",
  "إشراف أكاديمي وتوجيه تربوي",
];

export const DEFAULT_WORKING_HOURS = [
  "7:00 صباحاً - 2:00 ظهراً (الأحد - الخميس)",
  "7:30 صباحاً - 2:30 ظهراً (الأحد - الخميس)",
  "8:00 صباحاً - 3:00 عصراً (الأحد - الخميس)",
  "دوام مرن حسب الجداول والحصص",
];

export const DEFAULT_BENEFITS_OPTIONS = [
  "تأمين طبي فئة A (شامل)",
  "بدل سكن 25%",
  "بدل نقل ومواصلات",
  "توفير التأشيرة ورسوم الاستقدام",
  "تذاكر طيران سنوية للمعلم والأسرة",
  "خصم 50% على رسوم تعليم الأبناء",
  "مكافأة أداء وتميز سنوية",
  "برامج تطوير مهني ودورات تدريبية معتمدة",
];

const SPECS_TAG_REGEX = /<!--TX_JOB_SPECS:([\s\S]*?)-->/;

/**
 * Encodes custom job specifications into the job description string
 */
export function encodeJobDescription(description: string, specs?: JobCustomSpecs | null): string {
  const baseDescription = description ? description.replace(SPECS_TAG_REGEX, "").trim() : "";
  if (!specs || Object.keys(specs).length === 0) {
    return baseDescription;
  }
  const jsonStr = JSON.stringify(specs);
  return `${baseDescription}\n\n<!--TX_JOB_SPECS:${jsonStr}-->`;
}

/**
 * Parses custom job specifications from a job object
 */
export function parseJobCustomSpecs(job: any): { cleanDescription: string; specs: JobCustomSpecs; hasSpecs: boolean } {
  if (!job) {
    return { cleanDescription: "", specs: {}, hasSpecs: false };
  }

  const rawDescription = job.description || "";
  const match = rawDescription.match(SPECS_TAG_REGEX);

  let cleanDescription = rawDescription.replace(SPECS_TAG_REGEX, "").trim();
  let specs: JobCustomSpecs = {};
  let hasSpecs = false;

  if (match && match[1]) {
    try {
      specs = JSON.parse(match[1]);
      hasSpecs = true;
    } catch (e) {
      console.warn("Could not parse TX_JOB_SPECS JSON:", e);
    }
  }

  // Also read direct database attributes if present
  if (job.school_type && !specs.school_type) specs.school_type = job.school_type;
  if (job.curriculum && !specs.curriculum) specs.curriculum = job.curriculum;
  if (job.grade_level && !specs.grade_level) specs.grade_level = job.grade_level;
  if (job.weekly_classes && !specs.weekly_classes) specs.weekly_classes = job.weekly_classes;
  if (job.benefits_package && !specs.benefits_package) specs.benefits_package = job.benefits_package;
  if (job.work_start_date && !specs.work_start_date) specs.work_start_date = job.work_start_date;
  if (job.working_hours && !specs.working_hours) specs.working_hours = job.working_hours;
  if (job.class_size && !specs.class_size) specs.class_size = job.class_size;
  if (job.application_deadline && !specs.application_deadline) specs.application_deadline = job.application_deadline;

  return {
    cleanDescription,
    specs,
    hasSpecs: hasSpecs || Object.keys(specs).length > 0,
  };
}
