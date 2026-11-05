ALTER TABLE public.interviews
 ADD COLUMN interviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN starts_at timestamptz,
 ADD COLUMN time_zone text,
 ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30 CHECK(duration_minutes BETWEEN 15 AND 120);
CREATE INDEX interviews_host_start ON public.interviews(interviewer_id,starts_at);

CREATE TABLE hiring_private.booking_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 interviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 starts_at timestamptz NOT NULL,
 time_zone text NOT NULL,
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 15 AND 120),
 interview_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL,
 withdrawn boolean NOT NULL DEFAULT false,
 history jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hiring_private.booking_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hiring_private.booking_slots FROM PUBLIC,anon,authenticated;
GRANT ALL ON hiring_private.booking_slots TO service_role;
CREATE INDEX booking_slots_company_start ON hiring_private.booking_slots(company_id,starts_at);
CREATE INDEX booking_slots_host_start ON hiring_private.booking_slots(interviewer_id,starts_at);
CREATE INDEX booking_slots_interview ON hiring_private.booking_slots(interview_id);

CREATE FUNCTION hiring_private.interview_conflict(_host uuid,_start timestamptz,_minutes integer,_zone text,_exclude uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.interviews i WHERE coalesce(i.interviewer_id,i.user_id)=_host AND i.id IS DISTINCT FROM _exclude
 AND i.status NOT IN ('ملغاة','ملغية','cancelled','canceled')
 AND coalesce(i.starts_at,(i.date+i.time) AT TIME ZONE coalesce(i.time_zone,_zone)) < _start+make_interval(mins=>_minutes)
 AND coalesce(i.starts_at,(i.date+i.time) AT TIME ZONE coalesce(i.time_zone,_zone))+make_interval(mins=>i.duration_minutes)>_start)
$$;
REVOKE ALL ON FUNCTION hiring_private.interview_conflict(uuid,timestamptz,integer,text,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION hiring_private.check_interview_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE host uuid:=coalesce(NEW.interviewer_id,NEW.user_id); zone text:=coalesce(NEW.time_zone,'Africa/Cairo');
BEGIN
 IF NEW.status IN ('ملغاة','ملغية','cancelled','canceled') THEN RETURN NEW; END IF;
 IF NEW.time_zone IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.time_zone) THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
 IF TG_OP='UPDATE' AND NEW.date IS NOT DISTINCT FROM OLD.date AND NEW.time IS NOT DISTINCT FROM OLD.time AND NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at AND NEW.interviewer_id IS NOT DISTINCT FROM OLD.interviewer_id AND NEW.time_zone IS NOT DISTINCT FROM OLD.time_zone AND NEW.duration_minutes=OLD.duration_minutes AND NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF NEW.starts_at IS NULL OR (TG_OP='UPDATE' AND (NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time OR NEW.time_zone IS DISTINCT FROM OLD.time_zone) AND NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at) THEN NEW.starts_at:=(NEW.date+NEW.time) AT TIME ZONE zone; END IF;
 IF NEW.interviewer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.company_members m JOIN auth.users u ON u.id=m.user_id WHERE m.company_id=NEW.company_id AND m.user_id=host AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN RAISE EXCEPTION 'Active interviewer required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(host::text,1));
 IF hiring_private.interview_conflict(host,NEW.starts_at,NEW.duration_minutes,zone,NEW.id) THEN RAISE EXCEPTION 'INTERVIEW_SLOT_CONFLICT' USING ERRCODE='23P01'; END IF;
 NEW.time_zone:=zone;
 NEW.date:=(NEW.starts_at AT TIME ZONE zone)::date;
 NEW.time:=(NEW.starts_at AT TIME ZONE zone)::time;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION hiring_private.check_interview_booking() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER interview_booking_conflict BEFORE INSERT OR UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION hiring_private.check_interview_booking();

CREATE FUNCTION hiring_private.sync_booking_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('ملغاة','ملغية','cancelled','canceled') THEN
  UPDATE hiring_private.booking_slots SET interview_id=NULL,history=history||jsonb_build_array(jsonb_build_object('action','interview_canceled','at',clock_timestamp())) WHERE interview_id=NEW.id;
 ELSIF NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.interviewer_id IS DISTINCT FROM OLD.interviewer_id OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes THEN
  UPDATE hiring_private.booking_slots SET interview_id=NULL,withdrawn=true,history=history||jsonb_build_array(jsonb_build_object('action','interview_rescheduled','at',clock_timestamp())) WHERE interview_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION hiring_private.sync_booking_slot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER interview_booking_sync AFTER UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION hiring_private.sync_booking_slot();

CREATE FUNCTION public.interview_slot_workflow(_company uuid,_action text,_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s hiring_private.booking_slots%ROWTYPE; begin_at timestamptz; zone text; minutes integer; rows_json jsonb;
BEGIN
 IF NOT hiring_private.allowed(_company,'interviews',CASE WHEN _action='list' THEN 'read' WHEN _action='create' THEN 'create' ELSE 'edit' END) THEN RAISE EXCEPTION 'Interview permission required' USING ERRCODE='42501'; END IF;
 IF _action='list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]') INTO rows_json FROM (
   SELECT bs.id,bs.starts_at,bs.time_zone,bs.duration_minutes,bs.interview_id,bs.interviewer_id,bs.withdrawn,coalesce(p.full_name,'') AS interviewer
   FROM hiring_private.booking_slots bs LEFT JOIN public.profiles p ON p.user_id=bs.interviewer_id
   WHERE bs.company_id=_company AND bs.starts_at>now()-interval '1 day' ORDER BY bs.starts_at LIMIT 500) x;
  RETURN jsonb_build_object('slots',rows_json);
 ELSIF _action='create' THEN
  zone:=_payload->>'time_zone';minutes:=(_payload->>'duration_minutes')::integer;
  IF zone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) OR minutes IS NULL OR minutes NOT BETWEEN 15 AND 120 THEN RAISE EXCEPTION 'Invalid availability'; END IF;
  begin_at:=((_payload->>'date')::date+(_payload->>'time')::time) AT TIME ZONE zone;
  IF begin_at IS NULL OR begin_at<clock_timestamp()+interval '30 minutes' OR begin_at>now()+interval '60 days' THEN RAISE EXCEPTION 'Choose a future slot within sixty days'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.company_members WHERE company_id=_company AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Direct company membership required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
  IF hiring_private.interview_conflict(auth.uid(),begin_at,minutes,zone) OR EXISTS(SELECT 1 FROM hiring_private.booking_slots WHERE interviewer_id=auth.uid() AND NOT withdrawn AND starts_at<begin_at+make_interval(mins=>minutes) AND starts_at+make_interval(mins=>duration_minutes)>begin_at) THEN RAISE EXCEPTION 'INTERVIEW_SLOT_CONFLICT' USING ERRCODE='23P01'; END IF;
  INSERT INTO hiring_private.booking_slots(company_id,interviewer_id,starts_at,time_zone,duration_minutes)
  VALUES(_company,auth.uid(),begin_at,zone,minutes) RETURNING * INTO s;
  RETURN jsonb_build_object('id',s.id);
 ELSIF _action='withdraw' THEN
  SELECT * INTO s FROM hiring_private.booking_slots WHERE id=(_payload->>'id')::uuid AND company_id=_company FOR UPDATE;
  IF NOT FOUND OR s.interviewer_id<>auth.uid() THEN RAISE EXCEPTION 'Only your own availability can be changed' USING ERRCODE='42501'; END IF;
  IF s.interview_id IS NOT NULL THEN RAISE EXCEPTION 'Cancel the booked interview first'; END IF;
  UPDATE hiring_private.booking_slots SET withdrawn=true WHERE id=s.id;
  RETURN jsonb_build_object('id',s.id);
 END IF;
 RAISE EXCEPTION 'Invalid action';
END $$;
REVOKE ALL ON FUNCTION public.interview_slot_workflow(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.interview_slot_workflow(uuid,text,jsonb) TO authenticated;

CREATE FUNCTION public.candidate_interview_booking(_tracking_code text,_action text DEFAULT 'list',_slot_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.candidates%ROWTYPE; s hiring_private.booking_slots%ROWTYPE; old_slot hiring_private.booking_slots%ROWTYPE; rows_json jsonb; own_json jsonb; interview uuid; host_name text;
BEGIN
 IF coalesce(upper(btrim(_tracking_code)),'') !~ '^TX-[0-9A-F]{32}$' THEN RAISE EXCEPTION 'Invalid booking access' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.candidates WHERE tracking_code=upper(btrim(_tracking_code));
 IF NOT FOUND OR c.company_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.companies WHERE id=c.company_id AND status='active') THEN RAISE EXCEPTION 'Invalid booking access' USING ERRCODE='42501'; END IF;
 IF _action='list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]') INTO rows_json FROM (
   SELECT bs.id,bs.starts_at,bs.time_zone,bs.duration_minutes FROM hiring_private.booking_slots bs
   JOIN public.company_members m ON m.company_id=bs.company_id AND m.user_id=bs.interviewer_id
   JOIN auth.users u ON u.id=m.user_id AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
   WHERE bs.company_id=c.company_id AND bs.starts_at>clock_timestamp()+interval '30 minutes' AND bs.interview_id IS NULL AND NOT bs.withdrawn
   AND NOT hiring_private.interview_conflict(bs.interviewer_id,bs.starts_at,bs.duration_minutes,bs.time_zone) ORDER BY bs.starts_at LIMIT 100) x;
  SELECT to_jsonb(x) INTO own_json FROM (
   SELECT bs.id,i.id AS interview_id,coalesce(i.starts_at,(i.date+i.time) AT TIME ZONE coalesce(i.time_zone,'Africa/Cairo')) AS starts_at,
    coalesce(i.time_zone,'Africa/Cairo') AS time_zone,i.duration_minutes
   FROM public.interviews i LEFT JOIN hiring_private.booking_slots bs ON bs.interview_id=i.id AND NOT bs.withdrawn
   WHERE i.candidate_id=c.id AND i.company_id=c.company_id AND i.status NOT IN ('ملغاة','ملغية','cancelled','canceled')
   AND coalesce(i.starts_at,(i.date+i.time) AT TIME ZONE coalesce(i.time_zone,'Africa/Cairo'))>now() ORDER BY starts_at LIMIT 1) x;
  RETURN jsonb_build_object('slots',rows_json,'booking',own_json);
 END IF;
 IF _action NOT IN ('book','cancel') THEN RAISE EXCEPTION 'Invalid action'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(c.id::text,2));
 SELECT * INTO s FROM hiring_private.booking_slots WHERE id=_slot_id AND company_id=c.company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 IF _action='cancel' THEN
  IF s.interview_id IS NULL OR s.starts_at<=clock_timestamp() OR NOT EXISTS(SELECT 1 FROM public.interviews WHERE id=s.interview_id AND candidate_id=c.id AND company_id=c.company_id) THEN RAISE EXCEPTION 'Booking unavailable' USING ERRCODE='42501'; END IF;
  UPDATE public.interviews SET status='ملغاة' WHERE id=s.interview_id;
  UPDATE hiring_private.booking_slots SET interview_id=NULL,history=history||jsonb_build_array(jsonb_build_object('action','cancel','candidate_id',c.id,'at',clock_timestamp())) WHERE id=s.id;
  RETURN jsonb_build_object('success',true);
 END IF;
 IF s.interview_id IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM public.interviews WHERE id=s.interview_id AND candidate_id=c.id AND status NOT IN ('ملغاة','ملغية','cancelled','canceled')) THEN RETURN jsonb_build_object('success',true,'interviewId',s.interview_id); END IF;
  RAISE EXCEPTION 'INTERVIEW_SLOT_CONFLICT' USING ERRCODE='23P01';
 END IF;
 IF s.withdrawn OR s.starts_at<=clock_timestamp()+interval '30 minutes' OR NOT EXISTS(SELECT 1 FROM public.company_members m JOIN auth.users u ON u.id=m.user_id WHERE m.user_id=s.interviewer_id AND m.company_id=s.company_id AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.interviews i WHERE i.candidate_id=c.id AND i.status NOT IN ('ملغاة','ملغية','cancelled','canceled') AND coalesce(i.starts_at,(i.date+i.time) AT TIME ZONE coalesce(i.time_zone,s.time_zone))>clock_timestamp()) THEN RAISE EXCEPTION 'Cancel your existing future interview before booking another'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s.interviewer_id::text,1));
 IF hiring_private.interview_conflict(s.interviewer_id,s.starts_at,s.duration_minutes,s.time_zone) THEN RAISE EXCEPTION 'INTERVIEW_SLOT_CONFLICT' USING ERRCODE='23P01'; END IF;
 SELECT full_name INTO host_name FROM public.profiles WHERE user_id=s.interviewer_id;
 INSERT INTO public.interviews(user_id,company_id,candidate_id,candidate_name,position,date,time,type,status,interviewer,interviewer_id,starts_at,time_zone,duration_minutes,notes)
 VALUES(s.interviewer_id,c.company_id,c.id,c.name,coalesce(c.role,'غير محدد'),(s.starts_at AT TIME ZONE s.time_zone)::date,(s.starts_at AT TIME ZONE s.time_zone)::time,'عن بُعد','مجدولة',host_name,s.interviewer_id,s.starts_at,s.time_zone,s.duration_minutes,'حجز ذاتي من موعد أتاحه مسؤول المقابلة') RETURNING id INTO interview;
 UPDATE hiring_private.booking_slots SET interview_id=interview,history=history||jsonb_build_array(jsonb_build_object('action','book','candidate_id',c.id,'at',clock_timestamp())) WHERE id=s.id;
 RETURN jsonb_build_object('success',true,'interviewId',interview);
END $$;
REVOKE ALL ON FUNCTION public.candidate_interview_booking(text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.candidate_interview_booking(text,text,uuid) TO anon,authenticated,service_role;
