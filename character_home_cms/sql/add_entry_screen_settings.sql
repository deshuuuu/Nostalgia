-- 기존 Supabase DB에 첫 화면(ENTER) 설정 기본값을 추가합니다.
-- 기존 프로필/스토리/갤러리/오디오 설정은 유지됩니다.
update public.site_content
set settings_json = coalesce(settings_json, '{}'::jsonb) || jsonb_build_object(
  'entry_kicker', coalesce(settings_json->>'entry_kicker', 'A MEMORY, KEPT QUIETLY.'),
  'entry_image_url', coalesce(settings_json->>'entry_image_url', character_image_url, 'assets/placeholder-character.svg'),
  'entry_note', coalesce(settings_json->>'entry_note', '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)')
),
updated_at = now()
where id = 1;
