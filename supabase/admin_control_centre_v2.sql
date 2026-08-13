-- WriteLite admin control centre v2
-- Applied to Supabase project efftrxqdsrmyuaubjumh.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists moderation_state text not null default 'visible',
  add column if not exists moderation_note text not null default '',
  add column if not exists suspension_until timestamptz,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

alter table public.stories
  add column if not exists moderation_state text not null default 'clear',
  add column if not exists moderation_note text not null default '',
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

alter table public.comments
  add column if not exists moderation_state text not null default 'visible',
  add column if not exists moderation_note text not null default '',
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_account_status_check') then
    alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active','restricted','suspended'));
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_moderation_state_check') then
    alter table public.profiles add constraint profiles_moderation_state_check check (moderation_state in ('visible','hidden'));
  end if;
  if not exists (select 1 from pg_constraint where conname='stories_moderation_state_check') then
    alter table public.stories add constraint stories_moderation_state_check check (moderation_state in ('clear','held','removed'));
  end if;
  if not exists (select 1 from pg_constraint where conname='comments_moderation_state_check') then
    alter table public.comments add constraint comments_moderation_state_check check (moderation_state in ('visible','hidden','removed'));
  end if;
end $$;

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  target_type text not null,
  target_id uuid,
  action text not null,
  note text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;

create or replace function public.admin_require_v2()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.profiles p where p.id=uid and p.is_admin=true) then
    raise exception 'Admin access required.' using errcode='42501';
  end if;
  return uid;
end;
$$;
revoke all on function public.admin_require_v2() from public;

create or replace function public.is_admin_v2(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists(select 1 from public.profiles p where p.id=p_uid and p.is_admin=true); $$;
revoke all on function public.is_admin_v2(uuid) from public;

create or replace function public.protect_profile_moderation_v2()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() is not null and not public.is_admin_v2(auth.uid()) then
    if new.is_admin is distinct from old.is_admin
       or new.account_status is distinct from old.account_status
       or new.moderation_state is distinct from old.moderation_state
       or new.moderation_note is distinct from old.moderation_note
       or new.suspension_until is distinct from old.suspension_until
       or new.moderated_at is distinct from old.moderated_at
       or new.moderated_by is distinct from old.moderated_by then
      raise exception 'Moderation fields cannot be changed from the client.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_admin_flag on public.profiles;
drop trigger if exists protect_profile_moderation_v2 on public.profiles;
create trigger protect_profile_moderation_v2 before update on public.profiles for each row execute function public.protect_profile_moderation_v2();

create or replace function public.protect_story_moderation_v2()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() is not null and not public.is_admin_v2(auth.uid()) then
    if tg_op='INSERT' then
      new.moderation_state := 'clear'; new.moderation_note := ''; new.moderated_at := null; new.moderated_by := null;
    elsif new.moderation_state is distinct from old.moderation_state
       or new.moderation_note is distinct from old.moderation_note
       or new.moderated_at is distinct from old.moderated_at
       or new.moderated_by is distinct from old.moderated_by then
      raise exception 'Story moderation fields cannot be changed from the client.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_story_moderation_v2 on public.stories;
create trigger protect_story_moderation_v2 before insert or update on public.stories for each row execute function public.protect_story_moderation_v2();

create or replace function public.protect_comment_moderation_v2()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() is not null and not public.is_admin_v2(auth.uid()) then
    if tg_op='INSERT' then
      new.moderation_state := 'visible'; new.moderation_note := ''; new.moderated_at := null; new.moderated_by := null;
    elsif new.moderation_state is distinct from old.moderation_state
       or new.moderation_note is distinct from old.moderation_note
       or new.moderated_at is distinct from old.moderated_at
       or new.moderated_by is distinct from old.moderated_by then
      raise exception 'Comment moderation fields cannot be changed from the client.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_comment_moderation_v2 on public.comments;
create trigger protect_comment_moderation_v2 before insert or update on public.comments for each row execute function public.protect_comment_moderation_v2();

create or replace function public.enforce_content_account_state_v2()
returns trigger language plpgsql set search_path=public as $$
declare st text; until_at timestamptz;
begin
  if auth.uid() is null or public.is_admin_v2(auth.uid()) then return new; end if;
  select account_status,suspension_until into st,until_at from public.profiles where id=auth.uid();
  if st='restricted' then raise exception 'This account is restricted from publishing or commenting.' using errcode='42501'; end if;
  if st='suspended' and (until_at is null or until_at>now()) then raise exception 'This account is suspended.' using errcode='42501'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_story_account_state_v2 on public.stories;
create trigger enforce_story_account_state_v2 before insert or update on public.stories for each row execute function public.enforce_content_account_state_v2();
drop trigger if exists enforce_comment_account_state_v2 on public.comments;
create trigger enforce_comment_account_state_v2 before insert or update on public.comments for each row execute function public.enforce_content_account_state_v2();

create or replace function public.enforce_social_account_state_v2()
returns trigger language plpgsql set search_path=public as $$
declare st text; until_at timestamptz;
begin
  if auth.uid() is null or public.is_admin_v2(auth.uid()) then return new; end if;
  select account_status,suspension_until into st,until_at from public.profiles where id=auth.uid();
  if st='suspended' and (until_at is null or until_at>now()) then raise exception 'This account is suspended.' using errcode='42501'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_like_account_state_v2 on public.story_likes;
create trigger enforce_like_account_state_v2 before insert on public.story_likes for each row execute function public.enforce_social_account_state_v2();
drop trigger if exists enforce_follow_account_state_v2 on public.follows;
create trigger enforce_follow_account_state_v2 before insert on public.follows for each row execute function public.enforce_social_account_state_v2();

drop policy if exists "stories public published read" on public.stories;
drop policy if exists "stories authenticated read" on public.stories;
drop policy if exists "stories public published read v2" on public.stories;
drop policy if exists "stories authenticated read v2" on public.stories;
create policy "stories public published read v2" on public.stories for select to anon using (status='published' and visibility='public' and moderation_state='clear');
create policy "stories authenticated read v2" on public.stories for select to authenticated using (owner_id=auth.uid() or (status='published' and visibility='public' and moderation_state='clear') or public.is_admin_v2(auth.uid()));

drop policy if exists "comments public published read" on public.comments;
drop policy if exists "comments public moderated read v2" on public.comments;
create policy "comments public moderated read v2" on public.comments for select to anon,authenticated using ((moderation_state='visible' and exists(select 1 from public.stories s where s.id=comments.story_id and s.status='published' and s.visibility='public' and s.moderation_state='clear')) or user_id=auth.uid() or public.is_admin_v2(auth.uid()));

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles moderated read v2" on public.profiles;
create policy "profiles moderated read v2" on public.profiles for select to anon,authenticated using (moderation_state='visible' or id=auth.uid() or public.is_admin_v2(auth.uid()));

create or replace function public.admin_dashboard_v2()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_require_v2();
  return jsonb_build_object(
    'reports_open',(select count(*) from public.reports where status='open'),
    'reports_total',(select count(*) from public.reports),
    'users_total',(select count(*) from public.profiles),
    'users_restricted',(select count(*) from public.profiles where account_status='restricted'),
    'users_suspended',(select count(*) from public.profiles where account_status='suspended' and (suspension_until is null or suspension_until>now())),
    'stories_published',(select count(*) from public.stories where status='published'),
    'stories_held',(select count(*) from public.stories where moderation_state in ('held','removed')),
    'comments_total',(select count(*) from public.comments),
    'comments_hidden',(select count(*) from public.comments where moderation_state<>'visible'),
    'actions_7d',(select count(*) from public.moderation_actions where created_at>=now()-interval '7 days')
  );
end;
$$;
revoke all on function public.admin_dashboard_v2() from public; grant execute on function public.admin_dashboard_v2() to authenticated;

create or replace function public.admin_list_reports_v2(p_status text default null,p_query text default null,p_limit int default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_require_v2();
  return coalesce((select jsonb_agg(x order by (x->>'created_at')::timestamptz desc) from (
    select jsonb_build_object('id',r.id,'target_type',r.target_type,'target_id',r.target_id,'reason',r.reason,'details',r.details,'status',r.status,'created_at',r.created_at,'updated_at',r.updated_at,
      'reporter',jsonb_build_object('id',rp.id,'username',rp.username,'display_name',rp.display_name),
      'target',case r.target_type
        when 'story' then (select jsonb_build_object('label',s.title,'slug',s.slug,'owner_id',s.owner_id,'status',s.status,'moderation_state',s.moderation_state) from public.stories s where s.id=r.target_id)
        when 'comment' then (select jsonb_build_object('label',left(c.body,180),'story_id',c.story_id,'story_title',s.title,'story_slug',s.slug,'user_id',c.user_id,'moderation_state',c.moderation_state) from public.comments c left join public.stories s on s.id=c.story_id where c.id=r.target_id)
        when 'profile' then (select jsonb_build_object('label',coalesce(p.display_name,p.username),'username',p.username,'account_status',p.account_status,'moderation_state',p.moderation_state) from public.profiles p where p.id=r.target_id)
        else null end) x
    from public.reports r left join public.profiles rp on rp.id=r.reporter_id
    where (p_status is null or p_status='' or r.status=p_status)
      and (p_query is null or p_query='' or r.reason ilike '%'||p_query||'%' or r.details ilike '%'||p_query||'%' or rp.username ilike '%'||p_query||'%' or rp.display_name ilike '%'||p_query||'%')
    order by r.created_at desc limit greatest(1,least(coalesce(p_limit,100),250))
  ) q),'[]'::jsonb);
end;
$$;
revoke all on function public.admin_list_reports_v2(text,text,int) from public; grant execute on function public.admin_list_reports_v2(text,text,int) to authenticated;

create or replace function public.admin_list_stories_v2(p_query text default null,p_state text default null,p_limit int default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_require_v2();
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc) from (
    select s.id,s.title,s.slug,s.status,s.visibility,s.is_featured,s.moderation_state,s.moderation_note,s.moderated_at,s.created_at,s.updated_at,s.owner_id,p.username,p.display_name
    from public.stories s left join public.profiles p on p.id=s.owner_id
    where (p_state is null or p_state='' or s.moderation_state=p_state)
      and (p_query is null or p_query='' or s.title ilike '%'||p_query||'%' or s.author_name ilike '%'||p_query||'%' or p.username ilike '%'||p_query||'%' or p.display_name ilike '%'||p_query||'%')
    order by s.updated_at desc limit greatest(1,least(coalesce(p_limit,100),250))
  ) t),'[]'::jsonb);
end;
$$;
revoke all on function public.admin_list_stories_v2(text,text,int) from public; grant execute on function public.admin_list_stories_v2(text,text,int) to authenticated;

create or replace function public.admin_list_comments_v2(p_query text default null,p_state text default null,p_limit int default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_require_v2();
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (
    select c.id,c.body,c.story_id,c.user_id,c.created_at,c.updated_at,c.moderation_state,c.moderation_note,c.moderated_at,s.title as story_title,s.slug as story_slug,p.username,p.display_name
    from public.comments c left join public.stories s on s.id=c.story_id left join public.profiles p on p.id=c.user_id
    where (p_state is null or p_state='' or c.moderation_state=p_state)
      and (p_query is null or p_query='' or c.body ilike '%'||p_query||'%' or s.title ilike '%'||p_query||'%' or p.username ilike '%'||p_query||'%' or p.display_name ilike '%'||p_query||'%')
    order by c.created_at desc limit greatest(1,least(coalesce(p_limit,100),250))
  ) t),'[]'::jsonb);
end;
$$;
revoke all on function public.admin_list_comments_v2(text,text,int) from public; grant execute on function public.admin_list_comments_v2(text,text,int) to authenticated;

create or replace function public.admin_list_users_v2(p_query text default null,p_status text default null,p_limit int default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_require_v2();
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (
    select p.id,p.username,p.display_name,p.created_at,p.updated_at,p.is_admin,p.account_status,p.moderation_state,p.moderation_note,p.suspension_until,p.moderated_at,
      (select count(*) from public.stories s where s.owner_id=p.id) as story_count,
      (select count(*) from public.comments c where c.user_id=p.id) as comment_count,
      (select count(*) from public.reports r where r.reporter_id=p.id) as reports_sent
    from public.profiles p
    where (p_status is null or p_status='' or p.account_status=p_status)
      and (p_query is null or p_query='' or p.username ilike '%'||p_query||'%' or p.display_name ilike '%'||p_query||'%')
    order by p.created_at desc limit greatest(1,least(coalesce(p_limit,100),250))
  ) t),'[]'::jsonb);
end;
$$;
revoke all on function public.admin_list_users_v2(text,text,int) from public; grant execute on function public.admin_list_users_v2(text,text,int) to authenticated;

create or replace function public.admin_list_actions_v2(p_limit int default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_require_v2();
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (
    select a.id,a.admin_id,a.target_type,a.target_id,a.action,a.note,a.snapshot,a.created_at,p.username as admin_username,p.display_name as admin_name
    from public.moderation_actions a left join public.profiles p on p.id=a.admin_id
    order by a.created_at desc limit greatest(1,least(coalesce(p_limit,100),250))
  ) t),'[]'::jsonb);
end;
$$;
revoke all on function public.admin_list_actions_v2(int) from public; grant execute on function public.admin_list_actions_v2(int) to authenticated;

create or replace function public.admin_set_report_status_v2(p_report_id uuid,p_status text,p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid; oldrow public.reports%rowtype;
begin
  uid:=public.admin_require_v2(); if p_status not in ('open','reviewed','dismissed','actioned') then raise exception 'Invalid report status.'; end if;
  select * into oldrow from public.reports where id=p_report_id; if not found then raise exception 'Report not found.'; end if;
  update public.reports set status=p_status,updated_at=now() where id=p_report_id;
  insert into public.moderation_actions(admin_id,target_type,target_id,action,note,snapshot) values(uid,'report',p_report_id,'report_'||p_status,coalesce(p_note,''),to_jsonb(oldrow));
end;
$$;
revoke all on function public.admin_set_report_status_v2(uuid,text,text) from public; grant execute on function public.admin_set_report_status_v2(uuid,text,text) to authenticated;

create or replace function public.admin_story_action_v2(p_story_id uuid,p_action text,p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid; oldrow public.stories%rowtype;
begin
  uid:=public.admin_require_v2(); select * into oldrow from public.stories where id=p_story_id; if not found then raise exception 'Story not found.'; end if;
  if p_action='hold' then update public.stories set moderation_state='held',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_story_id;
  elsif p_action='remove' then update public.stories set moderation_state='removed',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_story_id;
  elsif p_action='restore' then update public.stories set moderation_state='clear',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_story_id;
  elsif p_action='unpublish' then update public.stories set status='draft',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_story_id;
  elsif p_action='publish' then update public.stories set status='published',published_at=coalesce(published_at,now()),moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_story_id;
  elsif p_action='feature' then update public.stories set is_featured=true,moderated_at=now(),moderated_by=uid where id=p_story_id;
  elsif p_action='unfeature' then update public.stories set is_featured=false,moderated_at=now(),moderated_by=uid where id=p_story_id;
  else raise exception 'Invalid story action.'; end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action,note,snapshot) values(uid,'story',p_story_id,p_action,coalesce(p_note,''),to_jsonb(oldrow));
end;
$$;
revoke all on function public.admin_story_action_v2(uuid,text,text) from public; grant execute on function public.admin_story_action_v2(uuid,text,text) to authenticated;

create or replace function public.admin_comment_action_v2(p_comment_id uuid,p_action text,p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid; oldrow public.comments%rowtype;
begin
  uid:=public.admin_require_v2(); select * into oldrow from public.comments where id=p_comment_id; if not found then raise exception 'Comment not found.'; end if;
  if p_action='hide' then update public.comments set moderation_state='hidden',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_comment_id;
  elsif p_action='remove' then update public.comments set moderation_state='removed',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_comment_id;
  elsif p_action='restore' then update public.comments set moderation_state='visible',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_comment_id;
  else raise exception 'Invalid comment action.'; end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action,note,snapshot) values(uid,'comment',p_comment_id,p_action,coalesce(p_note,''),to_jsonb(oldrow));
end;
$$;
revoke all on function public.admin_comment_action_v2(uuid,text,text) from public; grant execute on function public.admin_comment_action_v2(uuid,text,text) to authenticated;

create or replace function public.admin_user_action_v2(p_user_id uuid,p_action text,p_note text default '',p_until timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid; oldrow public.profiles%rowtype;
begin
  uid:=public.admin_require_v2(); select * into oldrow from public.profiles where id=p_user_id; if not found then raise exception 'User not found.'; end if;
  if oldrow.is_admin and p_action in ('restrict','suspend','hide_profile') then raise exception 'Admin accounts are protected from this action.'; end if;
  if p_action='restrict' then update public.profiles set account_status='restricted',suspension_until=null,moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_user_id;
  elsif p_action='suspend' then update public.profiles set account_status='suspended',suspension_until=p_until,moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_user_id;
  elsif p_action='activate' then update public.profiles set account_status='active',suspension_until=null,moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_user_id;
  elsif p_action='hide_profile' then update public.profiles set moderation_state='hidden',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_user_id;
  elsif p_action='show_profile' then update public.profiles set moderation_state='visible',moderation_note=coalesce(p_note,''),moderated_at=now(),moderated_by=uid where id=p_user_id;
  else raise exception 'Invalid user action.'; end if;
  insert into public.moderation_actions(admin_id,target_type,target_id,action,note,snapshot) values(uid,'profile',p_user_id,p_action,coalesce(p_note,''),to_jsonb(oldrow));
end;
$$;
revoke all on function public.admin_user_action_v2(uuid,text,text,timestamptz) from public; grant execute on function public.admin_user_action_v2(uuid,text,text,timestamptz) to authenticated;
