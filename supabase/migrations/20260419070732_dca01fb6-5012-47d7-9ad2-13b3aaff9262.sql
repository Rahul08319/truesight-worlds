-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule hourly cleanup of chat messages older than 24 hours
SELECT cron.schedule(
  'delete-old-chat-messages',
  '0 * * * *',
  $$DELETE FROM public.chat_messages WHERE created_at < now() - interval '24 hours'$$
);