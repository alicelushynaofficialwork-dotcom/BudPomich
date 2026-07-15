create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'budpomich-clean-expired-demo-sessions';

select cron.schedule(
  'budpomich-clean-expired-demo-sessions',
  '10 3 * * *',
  $$delete from public.demo_sessions
    where expires_at < now() - interval '7 days';$$
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'budpomich-clean-old-anonymous-users';

select cron.schedule(
  'budpomich-clean-old-anonymous-users',
  '30 3 * * *',
  $$delete from auth.users
    where is_anonymous is true
      and created_at < now() - interval '30 days';$$
);
