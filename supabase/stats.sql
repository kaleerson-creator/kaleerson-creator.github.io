-- Visitor stats: page views logged by site.js. No direct table access.
-- visitor = random id from a first-party cookie (only if the visitor said OK), else null.
create table public.page_views (
  id         bigint generated always as identity primary key,
  day        date not null default (now() at time zone 'America/Los_Angeles')::date,
  path       text not null,
  visitor    text,
  ref_host   text,
  mobile     boolean not null default false,
  signed_in  boolean not null default false,
  created_at timestamptz not null default now()
);
create index page_views_day on public.page_views (day);
create index page_views_visitor on public.page_views (visitor, created_at);
alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;

create or replace function public.log_view(p text, v text default null, ref text default null, m boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p is null or left(p, 1) <> '/' or length(p) > 200 then return; end if;
  if v is not null and v !~ '^[A-Za-z0-9_-]{16,40}$' then v := null; end if;
  if ref is not null and (length(ref) > 120 or ref !~ '^[a-z0-9.-]+$') then ref := null; end if;
  -- ignore floods: at most 300 views per visitor per hour
  if v is not null and (select count(*) from public.page_views where visitor = v and created_at > now() - interval '1 hour') >= 300 then return; end if;
  insert into public.page_views (path, visitor, ref_host, mobile, signed_in)
    values (regexp_replace(p, '[?#].*$', ''), v, nullif(ref, ''), coalesce(m, false), auth.uid() is not null);
end $$;
revoke execute on function public.log_view(text, text, text, boolean) from public;
grant execute on function public.log_view(text, text, text, boolean) to anon, authenticated;

create or replace function public.admin_stats(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d0 date := (now() at time zone 'America/Los_Angeles')::date;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  days := least(greatest(days, 1), 365);
  return jsonb_build_object(
    'daily', (select coalesce(jsonb_agg(x order by x.day), '[]') from (
        select g.day::date as day, count(v.id) as views, count(distinct v.visitor) as visitors
        from generate_series(d0 - (days - 1), d0, interval '1 day') g(day)
        left join public.page_views v on v.day = g.day::date group by g.day) x),
    'pages', (select coalesce(jsonb_agg(x), '[]') from (
        select path, count(*) as views, count(distinct visitor) as visitors from public.page_views
        where day > d0 - days group by path order by count(*) desc limit 15) x),
    'refs', (select coalesce(jsonb_agg(x), '[]') from (
        select ref_host as host, count(*) as views from public.page_views
        where day > d0 - days and ref_host is not null group by ref_host order by count(*) desc limit 10) x),
    'totals', (select jsonb_build_object(
        'today_views', count(*) filter (where day = d0),
        'today_visitors', count(distinct visitor) filter (where day = d0),
        'week_views', count(*) filter (where day > d0 - 7),
        'week_visitors', count(distinct visitor) filter (where day > d0 - 7),
        'period_views', count(*), 'period_visitors', count(distinct visitor),
        'mobile_share', round(100.0 * count(*) filter (where mobile) / greatest(count(*), 1)),
        'signed_in_share', round(100.0 * count(*) filter (where signed_in) / greatest(count(*), 1)))
      from public.page_views where day > d0 - days)
  );
end $$;
revoke execute on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;
