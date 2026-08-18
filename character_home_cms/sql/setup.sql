-- Character Home CMS · Supabase setup
-- Supabase SQL Editor에서 전체 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id bigint primary key,
  character_name text not null default 'CHARACTER',
  tagline text not null default '',
  character_image_url text not null default '',
  profile_json jsonb not null default '{"bio":"","fields":[]}'::jsonb,
  story_json jsonb not null default '[]'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  keycap_html text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  file_path text not null,
  caption text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.site_content (
  id, character_name, tagline, profile_json, story_json, settings_json, keycap_html
)
values (
  1,
  'CHARACTER',
  'A tiny place made for one character.',
  '{"bio":"관리자 페이지에서 캐릭터 소개를 입력할 수 있습니다.","fields":[{"label":"NAME","value":"CHARACTER"},{"label":"AGE","value":"-"},{"label":"HEIGHT","value":"-"}]}'::jsonb,
  '[{"title":"01. THE BEGINNING","body":"관리자 페이지에서 스토리 챕터를 추가하고 수정할 수 있습니다."}]'::jsonb,
  '{"site_title":"Character Home","enter_label":"ENTER","entry_kicker":"A MEMORY, KEPT QUIETLY.","entry_image_url":"assets/placeholder-character.svg","entry_note":"브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)","accent_color":"#d9d0a4","background_color":"#55564f","bgm_url":"","bgm_title":"CHARACTER THEME","bgm_volume":0.45,"click_sound_url":"","click_volume":0.55,"widget_track_url":"","widget_cover_url":"","widget_track_title":"THEME TRACK","widget_track_artist":"UNKNOWN","widget_volume":0.7,"pause_bgm_on_widget_play":true,"cursor_url":"","cursor_size":34,"cursor_pressed_scale":0.82,"trail_enabled":true,"trail_style":"sparkle","trail_spacing":12,"trail_size":13,"trail_fade_ms":520,"trail_image_url":"","click_particles":true,"keycap_sounds":{"Z":"","X":"","C":"","V":""}}'::jsonb,
  '<style>.keycap-default{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-family:Georgia,"Times New Roman",serif}.keycap-default button{min-height:55px;border:1px solid rgba(225,219,190,.35);border-radius:3px;color:#e7e0c5;background:linear-gradient(180deg,rgba(230,223,193,.14),rgba(255,255,255,.025)),#4a4c47;box-shadow:inset 0 -5px 0 rgba(27,28,26,.28),inset 0 1px 0 rgba(255,255,255,.06),0 2px 0 rgba(25,26,24,.20);font-weight:700;font-size:16px;transition:transform .08s ease,box-shadow .08s ease,border-color .12s ease}.keycap-default button:hover{border-color:rgba(230,223,193,.55)}.keycap-default button:active,.keycap-default button.pressed{transform:translateY(3px);box-shadow:inset 0 -2px 0 rgba(27,28,26,.28),inset 0 1px 0 rgba(255,255,255,.04)}</style><div class="keycap-default"><button type="button" data-key="Z">Z</button><button type="button" data-key="X">X</button><button type="button" data-key="C">C</button><button type="button" data-key="V">V</button></div>'
)
on conflict (id) do nothing;

-- Storage bucket: 공개 페이지에서는 파일을 볼 수 있고, 업로드/삭제는 RLS로 관리자만 가능.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  104857600,
  array[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
    'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/mp4','audio/aac','audio/flac'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 관리자 여부 확인 함수. public.site_admins를 직접 노출하지 않고 정책에서 사용합니다.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

alter table public.site_admins enable row level security;
alter table public.site_content enable row level security;
alter table public.gallery_items enable row level security;

-- 기존 정책을 재실행 가능하게 정리
drop policy if exists "site_content_public_read" on public.site_content;
drop policy if exists "site_content_admin_update" on public.site_content;
drop policy if exists "gallery_public_read" on public.gallery_items;
drop policy if exists "gallery_admin_insert" on public.gallery_items;
drop policy if exists "gallery_admin_update" on public.gallery_items;
drop policy if exists "gallery_admin_delete" on public.gallery_items;
drop policy if exists "storage_public_read_site_media" on storage.objects;
drop policy if exists "storage_admin_insert_site_media" on storage.objects;
drop policy if exists "storage_admin_update_site_media" on storage.objects;
drop policy if exists "storage_admin_delete_site_media" on storage.objects;

create policy "site_content_public_read"
on public.site_content for select
using (true);

create policy "site_content_admin_update"
on public.site_content for update
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

create policy "gallery_public_read"
on public.gallery_items for select
using (true);

create policy "gallery_admin_insert"
on public.gallery_items for insert
to authenticated
with check (public.is_site_admin());

create policy "gallery_admin_update"
on public.gallery_items for update
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

create policy "gallery_admin_delete"
on public.gallery_items for delete
to authenticated
using (public.is_site_admin());

-- Public bucket의 브라우저 조회 및 관리자 변경 권한
create policy "storage_public_read_site_media"
on storage.objects for select
using (bucket_id = 'site-media');

create policy "storage_admin_insert_site_media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media' and public.is_site_admin());

create policy "storage_admin_update_site_media"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media' and public.is_site_admin())
with check (bucket_id = 'site-media' and public.is_site_admin());

create policy "storage_admin_delete_site_media"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media' and public.is_site_admin());

-- 중요: Supabase Authentication > Users에서 관리자 사용자를 먼저 만든 다음,
-- 아래 YOUR_ADMIN_EMAIL을 실제 이메일로 바꾸고 이 INSERT만 다시 실행하세요.
--
-- insert into public.site_admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do nothing;
