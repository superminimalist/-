-- sample data for local dev: `supabase db reset` runs this after migrations

insert into public.majlis_series (id, title, occasion, hijri_year) values
  ('00000000-0000-0000-0000-000000000001', 'Ashra-e-Muharram 1448', 'muharram', 1448);

insert into public.majlis (series_id, title, speaker, starts_at, status)
select
  '00000000-0000-0000-0000-000000000001',
  'Majlis — Night ' || n,
  'Maulana (TBD)',
  now() + (n || ' days')::interval,
  'scheduled'
from generate_series(1, 10) as n;

insert into public.library_items (type, title, reciter, language, occasion, text_original, text_translation) values
  ('dua',     'Dua-e-Kumayl',   '',          'ar', 'thursday', '', ''),
  ('ziyarat', 'Ziyarat Ashura', '',          'ar', 'muharram', '', ''),
  ('nauha',   'Sample Nauha',   'Reciter A', 'ur', 'muharram', '', ''),
  ('marsiya', 'Sample Marsiya', 'Reciter B', 'ur', 'muharram', '', '');

-- promote yourself after first login:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
