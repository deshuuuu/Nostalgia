# Character Home CMS

한 명의 자작 캐릭터를 위한 개인 홈페이지 + 관리자 CMS 템플릿입니다.

## 들어있는 기능

- ENTER 클릭 후 캐릭터 BGM 재생
- HOME / PROFILE / STORY / GALLERY 내부 페이지 전환 (BGM/위젯 유지)
- 대표 캐릭터 클릭 → PROFILE 이동
- 좌측 음악 위젯: 드래그, 최소화, 위치 기억, 별도 음원/커버/제목/볼륨
- 우측 키캡 클리커: 드래그, 최소화, Z/X/C/V 화면 클릭 + 실제 키보드 입력
- 사이트 전용 클릭음
- 커스텀 커서
- 클릭 시 커서 축소 애니메이션
- 커서 잔상: sparkle / dot / glow / star / custom image
- 클릭 파티클
- `/admin/` 별도 관리자 페이지
- 비밀번호 로그인 (Supabase Auth)
- 관리자만 프로필/스토리/갤러리/미디어 수정 가능 (RLS)
- 관리자에서 BGM, 클릭음, 음악 위젯 음원/커버, 커서/잔상 이미지, 키캡 Z/X/C/V 음원 업로드
- 키캡 HTML/CSS 직접 편집 + 미리보기
- 갤러리 이미지 업로드/삭제/순서 변경
- 포인트 컬러/배경색/ENTER 문구 변경

## 1. 로컬에서 디자인 미리보기

Supabase를 아직 연결하지 않아도 공개 사이트는 기본 샘플 데이터로 열립니다.

Windows에서는 `start-local.bat`을 더블클릭하세요.
그 다음 브라우저에서 `http://localhost:8000/`을 엽니다.

> 관리자 페이지는 실제 인증이 필요하므로 Supabase 연결 전에는 로그인 기능이 비활성화됩니다.

## 2. Supabase 프로젝트 만들기

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `sql/setup.sql` 전체를 실행합니다.
3. Authentication > Users에서 관리자용 이메일/비밀번호 계정을 하나 만듭니다.
4. `sql/setup.sql` 맨 아래 주석에 있는 `insert into public.site_admins ...` 구문을 복사합니다.
5. `YOUR_ADMIN_EMAIL@example.com`을 방금 만든 관리자 이메일로 바꾸고 실행합니다.

## 3. config.js 연결

`js/config.js` 파일을 열어 아래 3가지를 바꿉니다.

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://프로젝트주소.supabase.co',
  supabaseAnonKey: '브라우저용 publishable 또는 anon key',
  adminEmail: '관리자이메일@example.com',
  siteId: 1,
  storageBucket: 'site-media'
};
```

**절대로 `service_role` 키를 넣지 마세요.** 브라우저에 노출되면 안 되는 관리자용 키입니다.

## 4. 관리자 접속

사이트가 `https://example.com/`이라면 관리자 주소는:

`https://example.com/admin/`

관리자 화면에서는 이메일을 따로 입력하지 않고 `config.js`에 설정된 관리자 이메일 + 입력한 비밀번호로 로그인합니다.
실제 수정 권한은 비밀번호를 JavaScript에서 비교하는 방식이 아니라 Supabase Auth 세션 + `site_admins` + RLS로 확인합니다.

## 5. 키캡 HTML 수정법

관리자 > KEYCAP CLICKER에서 HTML/CSS를 수정할 수 있습니다.

소리를 연결할 버튼에는 다음처럼 `data-key`를 붙이세요.

```html
<button type="button" data-key="Z">Z</button>
<button type="button" data-key="X">X</button>
```

지원 키는 기본적으로 `Z`, `X`, `C`, `V`입니다.

공개 사이트 안전을 위해 저장된 HTML을 표시할 때 다음은 자동 제거됩니다.

- `<script>`
- `<iframe>`, `<object>`, `<embed>`, `<form>` 등
- `onclick`, `onload` 같은 `on*` 이벤트 속성
- `javascript:` URL
- CSS `@import`

따라서 키캡의 모양은 HTML/CSS로 자유롭게 만들되 동작은 `data-key`로 연결하는 방식입니다.

## 6. 음악 동작

- `사이트 BGM`: ENTER를 누른 뒤 자동 재생되는 캐릭터 테마곡
- `음악 위젯 음원`: 좌측 플레이어에서 사용자가 직접 재생하는 별도 곡
- 기본 설정에서는 음악 위젯 곡을 재생할 때 BGM이 잠시 멈추고, 위젯 곡을 멈추면 BGM이 다시 이어집니다.
- 이 동작은 관리자에서 끌 수 있습니다.

## 7. GitHub Pages 배포

정적 파일 전체를 GitHub 저장소에 올린 뒤 GitHub Pages를 켜면 공개 사이트를 배포할 수 있습니다.
Supabase는 별도 백엔드로 동작하므로 HTML/CSS/JS 사이트는 GitHub Pages에 그대로 둘 수 있습니다.

`.nojekyll` 파일이 포함되어 있습니다.

## 주요 파일

```text
character_home_cms/
├─ index.html
├─ admin/
│  └─ index.html
├─ css/
│  ├─ site.css
│  └─ admin.css
├─ js/
│  ├─ config.js
│  ├─ defaults.js
│  ├─ supabase-client.js
│  ├─ site.js
│  └─ admin.js
├─ assets/
├─ sql/
│  └─ setup.sql
├─ start-local.bat
└─ README.md
```

## 다음 커스터마이징 포인트

현재 디자인은 캐릭터 자료를 아직 받지 않은 상태라 중성적인 다크/보라 OS 스타일 템플릿입니다. 캐릭터 이미지, 원하는 컬러, 폰트 분위기, BGM/클릭음/커서 파일을 넣은 뒤 관리자에서 대부분 교체할 수 있습니다.


## 기본 비주얼 테마

현재 기본 디자인은 회색 금속/석판 계열 바탕에 채도 낮은 연노랑·아이보리 포인트를 사용합니다. 둥근 앱 UI 대신 얇은 이중 테두리, 마름모 장식, 세리프 제목을 사용해 판타지 게임 메뉴에 가까운 인상을 냅니다.

이전 버전의 Supabase DB를 이미 만든 경우 `sql/apply_warm_gray_theme.sql`을 한 번 실행하면 포인트 컬러와 배경 컬러만 새 기본값으로 바꿀 수 있습니다. 프로필, 스토리, 갤러리 내용은 변경하지 않습니다.

### 첫 화면(ENTER) 관리

관리자 페이지의 **SITE SETTINGS**에서 다음 항목을 수정할 수 있습니다.

- 첫 화면 문구
- 첫 화면 전용 이미지
- 안내 문구
- ENTER 버튼 문구

첫 화면의 **이름**과 **한마디**는 CHARACTER 메뉴의 `캐릭터 이름`, `한 줄 문구` 값을 사용합니다. 기본 안내 문구는 `브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)`입니다.
