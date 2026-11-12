import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { createNotificationDispatchHandler } from '../_shared/notificationDispatchHandler.ts';
import { dispatchRequestConfirmations } from '../_shared/notificationDispatcher.ts';
Deno.serve(createNotificationDispatchHandler({
  env: name => Deno.env.get(name),
  dispatch: async limit => {
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Dispatcher configuration unavailable');
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return await dispatchRequestConfirmations(admin, limit);
  },
}));
