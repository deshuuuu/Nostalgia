-- 기존 Supabase 프로젝트에 새 회색 + 바랜 연노랑 테마 기본값을 적용할 때 사용합니다.
-- 프로필/스토리/갤러리 내용은 건드리지 않습니다.

update public.site_content
set settings_json = coalesce(settings_json, '{}'::jsonb) || jsonb_build_object(
  'accent_color', '#d9d0a4',
  'background_color', '#55564f'
),
updated_at = now()
where id = 1;
