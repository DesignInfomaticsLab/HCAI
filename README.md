# 인간-중심 AI디자인 연구센터 홈페이지

한양대학교 인간-중심 AI디자인 연구센터(HCAI) 공식 홈페이지입니다.
연구 프로젝트 · 활동 · 구성원 · 연구 성과를 계속 쌓아 나가는 **아카이브**로 만들었습니다.

- 빌드 도구 없는 정적 사이트입니다. Node.js 설치나 `npm install` 이 필요 없습니다.
- **콘텐츠는 `content/` 안의 JSON 파일만 고치면 됩니다.** HTML 을 만질 일은 거의 없습니다.
- `main` 브랜치에 push 하면 GitHub Pages 가 1~2분 안에 자동 반영합니다.

---

## 처음 오셨다면

1. 이 저장소를 내려받습니다 — `git clone <저장소 주소>`
2. **`preview.bat` 을 더블클릭**합니다. 브라우저에 사이트가 뜹니다. (Python 3 필요)
3. `content/` 의 JSON 을 고치고 브라우저를 새로고침하면 바로 반영됩니다.

> ⚠️ `index.html` 을 직접 더블클릭하면 **빈 화면**이 나옵니다.
> 브라우저가 `file://` 에서는 JSON 을 읽지 못하게 막기 때문이며, 고장이 아닙니다.
> 반드시 `preview.bat` 으로 여세요.

---

## 무엇을 고치고 싶으신가요

| 하고 싶은 일 | 고칠 파일 |
|---|---|
| 연구원 추가 · 졸업 처리 | `content/people.json` |
| 새 연구과제 등록 | `content/projects.json` |
| 세미나 · 뉴스 · 수상 소식 등록 | `content/activities.json` |
| 논문 · 특허 · 디자인권 등록 | `content/publications.json` |
| 센터 소개 글, 연구 범위 | `content/about.json` |
| 센터 이름 · 연락처 · 메뉴 · 첫 화면 문구 | `content/site.json` |
| 색·글자 크기·여백 | `assets/css/style.css` 맨 위 `:root` |
| 로고 움직임 | `assets/js/hcai-logo.js` 맨 위 `CONFIG` |

작성 규칙과 예시는 **[docs/01-content-guide.md](docs/01-content-guide.md)** 에 있습니다.
JSON 은 쉼표 하나만 틀려도 화면이 비니, 처음이라면 이 문서를 먼저 읽어 주세요.

---

## 페이지 구성

| 페이지 | 파일 | 내용 |
|---|---|---|
| 홈 | `index.html` | 로고 + 센터 소개 · 연구 범위 요약 |
| 센터 소개 | `about.html` | 설립 배경, 연구 범위, 연락처 |
| 연구·활동·뉴스 | `archive.html` | 연구과제와 활동을 연도별로 모은 기록 |
| 연구 성과 | `publications.html` | 논문 / 특허 탭 (디자인권은 특허에 포함) |
| 구성원 | `people.html` | 연구소장 · 연구원 · 행정 · 협력 연구진 · Alumni |
| 상세 | `entry.html` | 개별 기록. 목록에서 눌러 들어갑니다 |

`archive.html#research`, `publications.html#patent` 처럼 주소 뒤에 붙이면
해당 분류가 선택된 채로 열립니다. 메일이나 문서에 링크할 때 쓰세요.

---

## 폴더 구조

```
content/                  ★ 콘텐츠. 평소 고치는 건 여기뿐입니다
  site.json               센터 이름 · 연락처 · 메뉴 · 첫 화면 문구
  about.json              센터 소개 본문 · 연구 범위
  people.json             구성원
  projects.json           연구 프로젝트
  activities.json         활동 · 뉴스
  publications.json       논문 · 특허 · 디자인권

assets/
  css/style.css           디자인 전체
  js/hcai.js              JSON 을 읽어 화면을 그리는 코드
  js/hcai-logo.js         도트 로고 렌더러
  img/people/             연구원 사진        (파일명 = people.json 의 id)
  img/projects/<id>/      프로젝트 이미지
  img/activities/<id>/    활동 사진 · 포스터
  img/favicon-*.png       파비콘
  img/og.png              링크 공유용 미리보기 이미지
  logo/                   로고 원본 (SVG · 애니메이션 GIF) — 슬라이드·인쇄용

tools/                    제작용 도구. 사이트는 이 폴더를 읽지 않습니다
  logo/                   도트 로고 파라미터 조정기 + 영상 원본
  favicon/                파비콘 재생성 스크립트

docs/                     운영 문서
preview.bat               로컬 미리보기
.nojekyll                 GitHub Pages 설정 — 지우지 마세요
```

---

## 콘텐츠를 올리는 두 가지 방법

### 컴퓨터에서 (이미지까지 올릴 때)

```powershell
git pull                     # ① 남이 바꾼 내용 먼저 받기 — 꼭 먼저
                             # ② 파일 수정 + preview.bat 으로 확인
git add .
git commit -m "2026년 8월 세미나 추가"
git push                     # ③ 1~2분 뒤 사이트 반영
```

### GitHub 웹사이트에서 (설치 없이)

1. 저장소에서 `content/activities.json` 클릭
2. 오른쪽 위 **연필 아이콘** → 내용 수정
3. 아래 **Commit changes** → 무엇을 바꿨는지 한 줄 적고 저장

이미지도 웹에서 올릴 수 있습니다. 폴더로 들어가 **Add file → Upload files**.

---

## 자주 겪는 문제

| 증상 | 원인과 해결 |
|---|---|
| 화면이 하얗게 비었다 | JSON 문법 오류입니다. `F12` → Console 의 빨간 줄을 보세요. 대개 쉼표·따옴표 |
| 고쳤는데 화면이 그대로 | 브라우저 캐시입니다. `Ctrl+Shift+R` 로 강력 새로고침 |
| CSS·JS 를 고쳤는데 사람마다 다르게 보인다 | 아래 **캐시 버전** 항목을 보세요 |
| push 하니 충돌(conflict) | `git pull` 로 받아서 겹친 부분을 정리한 뒤 다시 커밋 |
| 실수로 잘못 올렸다 | GitHub → Commits → 해당 커밋 → **Revert** |

### 캐시 버전 — CSS·JS 를 고쳤다면 반드시

HTML 안의 `?v=` 숫자를 올려야 방문자에게 새 파일이 갑니다.
안 올리면 **어떤 사람은 새 화면, 어떤 사람은 옛 화면**을 보게 됩니다.

```powershell
# 프로젝트 폴더에서. 숫자는 현재 값보다 크게
Get-ChildItem *.html | ForEach-Object {
  (Get-Content $_ -Raw) -replace '\?v=\d+', '?v=8' | Set-Content $_ -Encoding utf8
}
```

---

## 관리 규칙

- **사람을 지우지 마세요.** 졸업하면 `people.json` 의 `"group"` 을 `"alumni"` 로만 바꿉니다.
  아카이브의 목적은 지나간 기록을 남기는 것입니다.
- **이미지는 줄여서 올리세요.** 긴 변 1600px, 500KB 이하.
  원본을 그대로 올리면 저장소가 금방 무거워지고 사이트도 느려집니다.
- **파일명은 영문 소문자 + 숫자 + 하이픈.** 한글·공백·괄호가 들어가면 주소가 깨지고,
  Mac 과 Windows 사이에서 파일이 어긋납니다.
- **대외 공개가 부적절한 정보는 넣지 마세요.** 과제 기여율, 사업자등록번호,
  공개를 원치 않는 개인 연락처 등.

---

## 문서

| | 언제 보나 |
|---|---|
| [01 · 콘텐츠 추가하기](docs/01-content-guide.md) | 연구원·프로젝트·활동·성과를 등록할 때 |
| [02 · 깃과 배포](docs/02-git-and-deploy.md) | 저장소 설정, 권한, 배포, 실수 복구 |
| [03 · 도메인 연결](docs/03-domain.md) | 주소를 붙이거나 바꿀 때 |
| [04 · 디자인 시스템](docs/04-design-system.md) | 색·글자·로고를 손볼 때 |
| [05 · 연구원 정보 양식](docs/05-member-info-form.md) | 구성원에게 정보를 받을 때 배포 |

---

## 문의

홈페이지 관련 문의는 연구센터로 연락해 주세요.
서울시 성동구 왕십리로 222 한양대학교 생활과학관 504-1호 · 02-2220-1189
