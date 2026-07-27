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
| 센터 이름 · 연락처 · 메뉴 · 첫 화면 문구 | `content/site.json` |
| 색상 · 폰트 · 여백 등 디자인 | `assets/css/style.css` 맨 위 `:root` |

자세한 방법은 [docs/01-콘텐츠-추가하기.md](docs/01-콘텐츠-추가하기.md)를 보세요.

---

## 폴더 구조

```
HCAI_homepage/
├── index.html            홈
├── about.html            센터 소개
├── research.html         연구 프로젝트 목록
├── activities.html       활동 · 뉴스 목록
├── people.html           구성원
├── archive.html          전체 통합 아카이브 (검색 가능)
├── entry.html            상세 페이지 공통 템플릿
├── 404.html
│
├── content/              ★ 콘텐츠는 전부 여기에 있습니다
│   ├── site.json
│   ├── about.json
│   ├── people.json
│   ├── projects.json
│   ├── activities.json
│   └── publications.json
│
├── assets/
│   ├── css/style.css     디자인 시스템 전체
│   ├── js/hcai.js        JSON을 읽어 화면을 그리는 코드
│   └── img/              이미지 (people/, projects/, activities/ 로 나눠 담기)
│
├── docs/                 운영 가이드
├── preview.bat           로컬 미리보기 실행
└── .nojekyll             GitHub Pages 설정 (지우지 마세요)
```

---

## 로컬에서 확인하기

`preview.bat` 을 **더블클릭**하면 브라우저에 사이트가 열립니다. (Python 3 필요)

> ⚠️ `index.html` 을 직접 더블클릭하면 **빈 화면이 나옵니다.**
> 브라우저 보안 정책(`file://` 에서는 JSON을 읽지 못함) 때문이며, 고장이 아닙니다.
> 반드시 `preview.bat` 으로 여세요.

터미널에서 직접 실행하려면:

```powershell
python -m http.server 5173
# 브라우저에서 http://localhost:5173/
```

---

## 배포

`main` 브랜치에 push 하면 GitHub Pages가 자동으로 반영합니다 (보통 1~2분).
최초 설정은 [docs/02-깃과-배포.md](docs/02-깃과-배포.md), 도메인 연결은 [docs/03-도메인-연결.md](docs/03-도메인-연결.md)를 참고하세요.

---

## 문서

1. [콘텐츠 추가하기](docs/01-콘텐츠-추가하기.md) — 연구원·프로젝트·활동 등록법, 이미지 규격
2. [깃과 배포](docs/02-깃과-배포.md) — 저장소 만들기, 협업 규칙, 실수 복구
3. [도메인 연결](docs/03-도메인-연결.md) — 도메인 구입, DNS 설정, HTTPS
4. [디자인 시스템](docs/04-디자인-시스템.md) — 색·타이포·컴포넌트 규칙
