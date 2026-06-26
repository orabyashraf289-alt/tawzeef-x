
-- Question types enum
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'open_ended', 'code', 'true_false');

-- Difficulty levels enum  
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Question Bank table
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type public.question_type NOT NULL DEFAULT 'multiple_choice',
  difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
  category TEXT DEFAULT '',
  correct_answer TEXT,
  explanation TEXT,
  code_language TEXT,
  time_limit_seconds INTEGER,
  points INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Question Options (for multiple choice)
CREATE TABLE public.question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessments (tests)
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  passing_score INTEGER DEFAULT 70,
  is_randomized BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  token TEXT NOT NULL DEFAULT upper(substr(md5(random()::text || gen_random_uuid()::text), 1, 12)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment Questions (link questions to assessments)
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  points_override INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, question_id)
);

-- Assessment Responses (candidate answers)
CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: question_bank
CREATE POLICY "Users manage own questions" ON public.question_bank
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies: question_options
CREATE POLICY "Users manage own question options" ON public.question_options
  FOR ALL USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_id AND q.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_id AND q.user_id = auth.uid()));

CREATE POLICY "Anyone can view options for assessment" ON public.question_options
  FOR SELECT USING (true);

-- RLS Policies: assessments
CREATE POLICY "Users manage own assessments" ON public.assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active assessments by token" ON public.assessments
  FOR SELECT USING (is_active = true);

-- RLS Policies: assessment_questions
CREATE POLICY "Users manage own assessment questions" ON public.assessment_questions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE POLICY "Anyone can view assessment questions for active assessments" ON public.assessment_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.is_active = true));

-- RLS Policies: assessment_responses
CREATE POLICY "Users view responses for own assessments" ON public.assessment_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE POLICY "Anyone can submit assessment responses" ON public.assessment_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Candidates can update own in-progress responses" ON public.assessment_responses
  FOR UPDATE USING (status = 'in_progress');

-- Indexes
CREATE INDEX idx_question_bank_user ON public.question_bank(user_id);
CREATE INDEX idx_question_bank_job ON public.question_bank(job_id);
CREATE INDEX idx_question_bank_type ON public.question_bank(question_type);
CREATE INDEX idx_assessments_user ON public.assessments(user_id);
CREATE INDEX idx_assessments_token ON public.assessments(token);
CREATE INDEX idx_assessment_responses_assessment ON public.assessment_responses(assessment_id);

-- Triggers for updated_at
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
