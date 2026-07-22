begin;

insert into public.users (
  id,
  role,
  email
)
select
  'andrey-ponomarenko',
  'master',
  'andrey.ponomarenko@budpomich.local'
where not exists (
  select 1
  from public.users
  where id = 'andrey-ponomarenko'
);

insert into public.masters (
  user_id,
  city,
  profession,
  rating,
  avatar,
  description
)
select
  'andrey-ponomarenko',
  'Київ',
  'Гіпсокартонщик / плиточник',
  5,
  '/images/andrey-ponomarenko-avatar.jpg',
  'Гіпсокартонні конструкції, перегородки, стелі та укладання плитки у комерційних будівлях.'
where not exists (
  select 1
  from public.masters
  where user_id = 'andrey-ponomarenko'
);

commit;