# 02 · 깃(Git)과 배포

이 사이트는 **GitHub에 올리면 그 자체가 곧 홈페이지**가 됩니다. 별도의 서버나 호스팅 결제가 없습니다.

```
내 컴퓨터에서 파일 수정  →  git push  →  1~2분 뒤 실제 홈페이지에 반영
```

---

## 왜 개인 계정이 아니라 "연구실 계정"인가

가장 흔한 사고가 **담당 연구원이 졸업하면서 사이트 소유권이 사라지는 것**입니다.
처음부터 아래 구조로 만들어 두면 사람이 바뀌어도 사이트는 남습니다.

> **권장: GitHub Organization(조직) 을 만들고 그 안에 저장소를 둔다.**
> 조직 소유자(Owner)에 **교수님 계정 + 담당 연구원 계정 두 명 이상**을 넣습니다.
> 담당 연구원이 바뀌면 그 사람만 빼고 새 사람을 넣으면 됩니다.

---

---

## 저장소가 내 계정이 아닐 때 (지금 상황)

홈페이지는 **연구실 계정** 소유로 두고, 실제 작업은 **내 계정으로** 하는 것이 정답입니다.

> ⛔ **연구실 계정의 비밀번호를 받아 이 PC에 로그인하지 마세요.**
> - 누가 무엇을 고쳤는지 추적이 안 됩니다 (전부 "연구실 계정"이 한 일로 남습니다)
> - 이 PC에는 이미 개인 계정 자격증명이 저장되어 있어 서로 충돌합니다
> - 비밀번호를 아는 사람이 늘수록 회수가 불가능해집니다

### 올바른 순서

**① 연구실 계정(소유자)이 할 일**

1. 저장소를 만듭니다 — 이름 `<계정명>.github.io`, **Public**
2. **Settings → Collaborators → Add people** 에서 내 GitHub 아이디를 초대

> ⚠️ **개인 계정 저장소에는 Admin 권한을 줄 수 없습니다.**
> 권한 드롭다운 자체가 없고, 초대된 사람은 무조건 쓰기(Write) 권한만 받습니다.
> GitHub 의 정책이라 우회할 방법이 없습니다. 선택지는 둘입니다.
>
> **(a) 그대로 쓰기** — 소유자가 **Settings → Pages 를 한 번만** 켜 주면 끝입니다.
> 그 뒤로는 협업자가 push 하는 것만으로 자동 배포되므로 Admin 이 필요 없습니다.
> 도메인 연결도 소유자가 한 번 해 주면 이후 손댈 일이 없습니다.
>
> **(b) Organization 으로 옮기기** (권장) — 조직 저장소에서만 권한 드롭다운이 나타나
> Admin 을 줄 수 있고, Owner 를 여러 명 둘 수 있어 인수인계에도 안전합니다.
> 옮기는 방법은 아래 [Organization 으로 옮기기](#organization-으로-옮기기) 참고.

**② 내가 할 일** — 초대 메일의 수락 링크를 누른 뒤, 이 폴더에서:

```powershell
# 원격 주소는 연구실 계정/조직 이름으로 바꾸세요
git remote add origin https://github.com/<연구실계정>/<저장소이름>.git
git push -u origin main
```

로그인 창이 뜨면 **내 계정으로** 로그인합니다. 연구실 계정이 아닙니다.
저장소 소유자는 연구실이고, 나는 권한을 받아 밀어 넣는 구조입니다.

**③ 커밋에 남는 이름**

내 이름과 이메일이 그대로 남습니다. 정상이고, 그래야 이력 추적이 됩니다.

```powershell
git log -1 --format='%an <%ae>'
```

굳이 연구실 공용 이름으로 남기고 싶다면 **이 저장소에서만** 바꿀 수 있지만, 권하지 않습니다.

```powershell
git config user.name "HCAI"          # --global 없이 = 이 저장소에만 적용
git config user.email "hcai@hanyang.ac.kr"
```

### Organization 으로 옮기기

이미 개인 계정에 저장소를 만들었어도 **내용을 그대로 옮길 수 있습니다.**
커밋 기록·이슈가 전부 따라오고, 기존 주소로 들어와도 새 주소로 자동 연결됩니다.

1. 연구실 계정으로 [Organization 을 먼저 만듭니다](https://github.com/organizations/plan) (Free 플랜)
   — 이름 예) `hcai-hanyang`
2. 저장소 → **Settings → General → 맨 아래 Danger Zone → Transfer**
3. 새 소유자에 조직 이름을 입력 → 저장소 이름을 다시 입력해 확인
4. 옮긴 뒤 **저장소 이름을 `<조직명>.github.io` 로 변경**합니다
   (Settings → General → Repository name)
   > 이름이 조직명과 다르면 주소가 `조직명.github.io/저장소이름/` 처럼 한 단계 깊어집니다.
5. **Settings → Collaborators and teams → Role 드롭다운** 이 이제 보입니다 → 담당자를 **Admin** 으로
6. **Settings → Pages** 에서 배포를 다시 켜 줍니다 (이전 설정은 따라오지 않습니다)
7. 내 PC 의 원격 주소를 새 주소로 바꿉니다

   ```powershell
   git remote set-url origin https://github.com/<조직명>/<조직명>.github.io.git
   git remote -v          # 바뀐 주소 확인
   ```

### 자격증명이 꼬였을 때

다른 계정으로 로그인되어 push 가 거부되면 (`403`, `Permission denied`):

1. Windows 검색 → **자격 증명 관리자** → Windows 자격 증명
2. `git:https://github.com` 항목을 **제거**
3. 다시 `git push` → 로그인 창이 새로 뜹니다

### 인수인계할 때

졸업·이직으로 담당이 바뀌면 **소유권은 그대로 두고 사람만 교체**합니다.

- 새 담당자를 Collaborator(Admin)로 추가
- 떠나는 사람을 목록에서 제거
- 저장소와 도메인은 연구실 소유이므로 아무것도 옮길 필요가 없습니다

---

## 1단계 · 최초 1회 설정

### (1) GitHub 조직 만들기

1. [github.com](https://github.com) 가입 (교수님 또는 연구실 대표 계정)
2. 오른쪽 위 프로필 → **Your organizations** → **New organization** → **Free** 플랜
3. 조직 이름: 예) `hcai-hanyang`  ← 나중에 주소에 쓰이므로 짧고 명확하게
4. **Settings → People** 에서 연구원 계정을 초대 (Role: Member)
5. **Settings → People → 교수님 계정** 을 **Owner** 로 지정

### (2) 저장소(repository) 만들기

조직 페이지에서 **New repository**

| 항목 | 값 | 이유 |
|---|---|---|
| Repository name | `hcai-hanyang.github.io` | 조직명과 똑같이 짓고 `.github.io` 를 붙이면 사이트 주소가 `https://hcai-hanyang.github.io/` 로 **깔끔하게** 나옵니다 |
| Visibility | **Public** | GitHub Pages 무료 사용 조건입니다. 소스가 공개되지만 홈페이지 소스라 문제없습니다 |
| Add a README | 체크 해제 | 이미 있습니다 |

### (3) 이 폴더를 저장소에 연결하기

**이 폴더는 이미 git 저장소로 초기화되어 있고 커밋도 쌓여 있습니다.**
`git init` 은 다시 하지 마세요. 원격만 연결하면 됩니다.

```powershell
# 주소는 연구실 계정/조직 이름으로 바꾸세요
git remote add origin https://github.com/hcai-hanyang/hcai-hanyang.github.io.git
git push -u origin main
```

> 처음 push할 때 로그인 창이 뜹니다. **비밀번호가 아니라 브라우저 로그인**을 선택하면 가장 쉽습니다.

원격 주소를 잘못 넣었다면 지우고 다시 넣으면 됩니다.

```powershell
git remote remove origin
git remote add origin https://github.com/올바른/주소.git
```

### (4) GitHub Pages 켜기

저장소 → **Settings → Pages**

- **Source**: `Deploy from a branch`
- **Branch**: `main` / `/ (root)` → **Save**

1~2분 뒤 `https://hcai-hanyang.github.io/` 에서 사이트가 열립니다. 여기까지가 최초 설정입니다.

---

## 2단계 · 평소 작업 흐름

### 방법 A — 컴퓨터에서 (권장, 이미지까지 한 번에)

```powershell
git pull                          # ① 다른 사람 변경사항 먼저 받기 (중요!)
                                  # ② 파일 수정 + preview.bat 으로 확인
git add .
git commit -m "2026년 3월 세미나 활동 추가"
git push                          # ③ 반영
```

**`git pull` 을 먼저 하는 습관**이 충돌을 막는 가장 확실한 방법입니다.

### 방법 B — GitHub 웹사이트에서 (프로그램 설치 없이)

깃을 모르는 연구원도 이 방법으로 콘텐츠를 관리할 수 있습니다.

1. GitHub 저장소에서 `content/activities.json` 클릭
2. 오른쪽 위 **연필 아이콘(Edit this file)** 클릭
3. 내용 수정
4. 아래 **Commit changes** → 무엇을 바꿨는지 한 줄 적고 초록 버튼 클릭
5. 1~2분 뒤 사이트 반영

이미지 업로드도 웹에서 가능합니다: `assets/img/activities` 폴더 → **Add file → Upload files**

---

## 3단계 · 여러 명이 함께 관리할 때

인원이 2~3명이면 다 같이 `main` 에 직접 push해도 큰 문제는 없습니다.
하지만 **홈페이지가 잘못 올라가는 걸 막고 싶다면** 아래 규칙을 권합니다.

### 브랜치 + Pull Request 방식

```powershell
git checkout -b add-2026-seminar     # 새 작업 가지 만들기
# ... 수정 ...
git add .
git commit -m "2026 세미나 추가"
git push -u origin add-2026-seminar
```

GitHub에 가면 **Compare & pull request** 버튼이 뜹니다. 클릭 → 담당자가 확인 → **Merge** 하면 사이트에 반영됩니다.

**설정으로 강제하기** — Settings → Branches → Add branch protection rule → Branch name: `main`
→ ☑ Require a pull request before merging

### 커밋 메시지 규칙 (권장)

나중에 "언제 뭘 바꿨더라"를 찾기 쉬워집니다.

```
콘텐츠: 2026 SIG 워크샵 활동 추가
구성원: 김철수 석사과정 추가 / 이승원 alumni 이동
디자인: 모바일 헤더 여백 수정
문서: 도메인 가이드 갱신
```

---

## 4단계 · 사고가 났을 때

| 상황 | 해결 |
|---|---|
| **아직 커밋 안 한 수정을 되돌리고 싶다** | `git restore .` (수정 전체 취소) |
| **방금 한 커밋을 취소하고 싶다 (아직 push 전)** | `git reset --soft HEAD~1` (파일은 그대로, 커밋만 취소) |
| **push까지 했는데 사이트가 깨졌다** | GitHub 저장소 → **Commits** → 정상이던 커밋 → **Revert** 버튼 |
| **JSON을 잘못 고쳐서 화면이 비었다** | 브라우저 `F12` → Console 의 빨간 오류 확인. 대부분 쉼표/따옴표 실수입니다 |
| **push할 때 충돌(conflict)이 났다** | `git pull` 후 표시된 `<<<<<<<` `=======` `>>>>>>>` 부분을 직접 정리하고 다시 커밋 |
| **실수로 파일을 지웠다** | 깃에는 모든 기록이 남아 있습니다. Commits에서 이전 시점을 찾아 복구 가능 |

> 💡 깃의 가장 큰 장점: **되돌릴 수 없는 실수가 거의 없습니다.** 겁내지 말고 자주 커밋하세요.

---

## 5단계 · 인수인계 체크리스트

담당 연구원이 바뀔 때 반드시 확인할 것:

- [ ] 저장소 소유자가 **연구실 계정/조직**인지 (개인 계정이면 지금 옮기세요)
- [ ] 조직이라면 **Owner 가 최소 2명** (교수님 포함)인지
- [ ] 담당자가 저장소 **Admin** 권한인지 — 조직 저장소에서만 지정할 수 있습니다.
      개인 계정 저장소라면 소유자가 Pages·도메인 설정을 직접 해 줘야 합니다
- [ ] 도메인 등록업체(가비아 등) 계정 ID/비밀번호가 **연구실 공용 계정**인지, 결제 카드가 유효한지
- [ ] 도메인 **자동 갱신이 켜져 있는지** (가장 흔한 사고: 갱신 실패로 사이트 사라짐)
- [ ] 새 담당자에게 이 `docs/` 폴더 안내

---

## 참고 · 왜 GitHub Pages인가

| | 내용 |
|---|---|
| 비용 | 무료 (Public 저장소) |
| HTTPS | 자동 발급·갱신 |
| 용량 | 저장소 1GB, 월 트래픽 100GB 권장 — 연구센터 규모에는 충분 |
| 제한 | 서버 기능(회원가입·DB·문의 폼 저장 등)은 불가. 정적 페이지 전용 |
| 문의 폼이 필요하면 | [Formspree](https://formspree.io) 무료 플랜을 붙이면 됩니다 |
