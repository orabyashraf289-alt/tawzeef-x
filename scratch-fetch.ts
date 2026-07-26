import { supabase } from './src/integrations/supabase/client';
supabase.from('candidates').select('id, name, email').then(res => {
  console.log(JSON.stringify(res, null, 2));
}).catch(console.error);
