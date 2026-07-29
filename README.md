# 인간-중심 AI디자인 연구센터 — 홈페이지

한양대학교 인간-중심 AI디자인 연구센터(HCAI)의 공식 홈페이지 소스입니다.
연구 프로젝트 · 활동 · 구성원 · 연구 성과를 **계속 쌓아 나가는 아카이브**로 설계되었습니다.

- 제작 방식: 빌드 도구 없는 순수 정적 사이트 (HTML + CSS + JS + JSON)
- 배포: GitHub Pages
- 콘텐츠 수정: `content/` 안의 JSON 파일만 고치면 됩니다. HTML을 만질 일이 거의 없습니다.

---

## 30초 요약 — 뭔가 고치고 싶을 때

| 하고 싶은 일 | 고쳐야 할 파일 |
|---|---|
| 연구원 추가 / 졸업 처리 | `content/people.json` |
| 새 연구과제 등록 | `content/projects.json` |
| 세미나 · 뉴스 · 수상 소식 등록 | `content/activities.json` |
| 논문 · 특허 성과 등록 | `content/publications.json` |
| 센터 소개 글, 연구 범위 수정 | `content/about.json` |
| 센터 이름 · 연락처 · 메뉴 · 첫 화면 문구 · 메인 노출 개수 | `content/site.json` |
| 색상 · 폰트 · 여백 등 디자인 | `assets/css/style.css` 맨 위 `:root` |
| 로고 애니메이션 파라미터 | `assets/js/hcai-logo.js` 상단 (조정 도구는 `tools/logo/`) |

자세한 방법은 [docs/01-콘텐츠-추가하기.md](docs/01-콘텐츠-추가하기.md)를 보세요.

---

## 페이지 구성

메인 페이지가 곧 아카이브입니다. 별도의 "연구" / "활동" 목록 페이지를 두지 않고,
하나의 연도별 인덱스를 필터로 나눠 봅니다.

| 페이지 | 파일 | 내용 |
|---|---|---|
| 홈 | `index.html` | 도트 로고 히어로 + **센터 소개 · 연구 범위** 2단 요약 |
| 연구·활동·뉴스 | `archive.html` | 연구 프로젝트 · 활동 · 성과를 **연도별로 모은 기록** (필터 · 검색 · 더 보기) |
| 센터 소개 | `about.html` | 설립 배경, 연구 범위, 연락처 |
| 구성원 | `people.html` | 연구소장 · 연구원 · 행정 · 협력 연구진 · 졸업생 |
| 상세 | `entry.html` | 개별 기록. `?type=project&id=…` / `?type=activity&id=…` |

`archive.html#research`, `archive.html#activities` 로 들어가면 해당 분류가 걸린 채 열립니다.

> ⚠️ **CSS·JS를 고쳤는데 화면이 안 바뀌면** 브라우저 캐시입니다.
> `Ctrl+Shift+R` 로 강력 새로고침하거나, HTML 안의 `?v=3` 숫자를 올리세요.
> 배포 시에도 이 숫자를 올려야 방문자가 옛 화면을 보지 않습니다.

---

## 폴더 구조

```
HCAI_homepage/
├── index.html  about.html  people.html  entry.html  404.html
│
├── content/                    ★ 콘텐츠는 전부 여기에 있습니다
│   ├── site.json               사이트 이름·연락처·메뉴·메인 노출 개수
│   ├── about.json              센터 소개 본문
│   ├── people.json             구성원
│   ├── projects.json           연구 프로젝트
│   ├── activities.json         활동 · 뉴스
│   └── publications.json       논문 · 특허 · 수상
│
├── assets/
│   ├── css/style.css           디자인 시스템 전체
│   ├── js/
│   │   ├── hcai.js             JSON을 읽어 화면을 그리는 코드
│   │   └── hcai-logo.js        도트 로고 렌더러 (v2 설정)
│   ├── logo/
│   │   ├── hcai-logo.svg       워드마크 벡터 (헤더·푸터용)
│   │   ├── hcai-logo-white.gif 애니메이션 로고 (슬라이드·외부 공유용)
│   │   └── hcai-logo-black.gif
│   └── img/
│       ├── people/             연구원 사진
│       ├── projects/<id>/      프로젝트 이미지
│       ├── activities/<날짜-id>/ 활동 사진 · 포스터
│       └── favicon.svg
│
├── tools/logo/                 로고 생성·조정 도구 (사이트에 로드되지 않음)
│   ├── hcai-dot-logo-v2.html   파라미터 슬라이더 + PNG/SVG/영상 내보내기
│   └── source/*.mp4            렌더 원본
│
├── docs/                       운영 가이드
├── preview.bat                 로컬 미리보기 실행
└── .nojekyll                   GitHub Pages 설정 (지우지 마세요)
```

---

## 로컬에서 확인하기

`preview.bat` 을 **더블클릭**하면 브라우저에 사이트가 열립니다. (Python 3 필요)

> ⚠️ `index.html` 을 직접 더블클릭하면 **빈 화면이 나옵니다.**
> 브라우저 보안 정책(`file://` 에서는 JSON을 읽지 못함) 때문이며, 고장이 아닙니다.
> 반드시 `preview.bat` 으로 여세요.

---

## 배포

`main` 브랜치에 push 하면 GitHub Pages가 자동으로 반영합니다 (보통 1~2분).
최초 설정은 [docs/02-깃과-배포.md](docs/02-깃과-배포.md), 도메인 연결은 [docs/03-도메인-연결.md](docs/03-도메인-연결.md)를 참고하세요.

---

## 문서

1. [콘텐츠 추가하기](docs/01-콘텐츠-추가하기.md) — 연구원·프로젝트·활동 등록법, 이미지 규격
2. [깃과 배포](docs/02-깃과-배포.md) — 저장소 만들기, 협업 규칙, 실수 복구
3. [도메인 연결](docs/03-도메인-연결.md) — 도메인 구입, DNS 설정, HTTPS
4. [디자인 시스템](docs/04-디자인-시스템.md) — 색·타이포·컴포넌트·로고 규칙
5. [연구원 정보 수집 양식](docs/05-연구원-정보-양식.md) — 구성원에게 정보를 받을 때 배포하는 양식
