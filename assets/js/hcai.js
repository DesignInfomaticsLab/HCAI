/* =========================================================================
   HCAI — site runtime
   빌드 도구 없이 동작합니다. content/*.json 을 읽어 화면을 그립니다.
   페이지에서 HCAI.init({ page: 'home' }) 형태로 호출합니다.

   페이지 구성
     home   — 로고 히어로 + 통합 아카이브(연도별, 필터·검색·더보기)
     about  — 센터 소개
     people — 구성원
     entry  — 개별 기록 상세 (?type=project|activity&id=…)
   ========================================================================= */

(function () {
  "use strict";

  /* ---------- 상태 ------------------------------------------------------ */

  var LANGS = ["ko", "en"];
  var lang = (function () {
    try {
      var saved = localStorage.getItem("hcai-lang");
      if (LANGS.indexOf(saved) > -1) return saved;
    } catch (e) {}
    return (navigator.language || "ko").toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
  })();

  var data = {};
  var pageName = "";

  /* ---------- UI 문자열 -------------------------------------------------- */

  var UI = {
    skip:         { ko: "본문으로 건너뛰기", en: "Skip to content" },
    menu:         { ko: "메뉴", en: "Menu" },
    close:        { ko: "닫기", en: "Close" },
    all:          { ko: "전체", en: "All" },
    ongoing:      { ko: "진행중", en: "Ongoing" },
    completed:    { ko: "종료", en: "Completed" },
    research:     { ko: "연구 프로젝트", en: "Research" },
    activities:   { ko: "활동·뉴스", en: "Activities" },
    people:       { ko: "구성원", en: "People" },
    publications: { ko: "연구 성과", en: "Publications" },
    archive:      { ko: "연구 · 활동 · 뉴스", en: "Research & News" },
    about:        { ko: "센터 소개", en: "About" },
    scope:        { ko: "연구 범위", en: "Research Scope" },
    more:         { ko: "자세히 보기", en: "Read more" },
    seeArchive:   { ko: "연구 · 활동 · 뉴스 전체 보기", en: "Browse all records" },
    sitemap:      { ko: "바로가기", en: "Sitemap" },
    empty:        { ko: "아직 등록된 항목이 없습니다", en: "Nothing here yet" },
    preparing:    { ko: "준비 중입니다", en: "Coming soon" },
    noResult:     { ko: "검색 결과가 없습니다", en: "No matching entries" },
    notFound:     { ko: "요청한 항목을 찾을 수 없습니다", en: "The requested entry was not found" },
    contact:      { ko: "연락처", en: "Contact" },
    links:        { ko: "링크", en: "Links" },
    address:      { ko: "주소", en: "Address" },
    backTo:       { ko: "목록으로", en: "Back to index" },
    prev:         { ko: "이전", en: "Previous" },
    next:         { ko: "다음", en: "Next" },
    period:       { ko: "연구 기간", en: "Period" },
    funder:       { ko: "지원 기관", en: "Funded by" },
    kind:         { ko: "구분", en: "Type" },
    status:       { ko: "상태", en: "Status" },
    date:         { ko: "일자", en: "Date" },
    place:        { ko: "장소", en: "Venue" },
    category:     { ko: "분류", en: "Category" },
    topics:       { ko: "주제", en: "Topics" },
    related:      { ko: "관련 성과", en: "Related output" },
    searchPh:     { ko: "제목 · 키워드 · 연도로 검색", en: "Search by title, keyword, or year" },
    resultCount:  { ko: "건", en: "entries" },
    loadMore:     { ko: "더 보기", en: "Show more" },
    showingOf:    { ko: "중", en: "of" },
    viewFull:     { ko: "원본 이미지 열기", en: "Open full image" }
  };

  /* ---------- 유틸 ------------------------------------------------------- */

  function t(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.join("\n");
    return v[lang] || v.ko || v.en || "";
  }

  function tArr(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    var picked = v[lang] || v.ko || v.en || [];
    return Array.isArray(picked) ? picked : [picked];
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmtDate(s) { return s ? String(s).replace(/-/g, ".") : ""; }

  function fmtPeriod(start, end) {
    if (!start && !end) return "";
    if (!end) return fmtDate(start) + " –";
    if (!start) return "– " + fmtDate(end);
    return fmtDate(start) + " – " + fmtDate(end);
  }

  function year(s) { return s ? String(s).slice(0, 4) : ""; }

  function initials(name) {
    var ko = (name && name.ko) || "", en = (name && name.en) || "";
    if (/[가-힣]/.test(ko)) return ko.length > 2 ? ko.slice(1) : ko;
    return (en || ko).trim().split(/\s+/)
      .map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
  }

  /** 최신순 정렬. JSON 안의 순서가 뒤죽박죽이어도 화면은 항상 최신순입니다. */
  function byNewest(key) {
    return function (a, b) { return String(b[key] || "").localeCompare(String(a[key] || "")); };
  }

  /* ---------- 미니 마크다운 ----------------------------------------------
     '## 제목' / '- 항목' / '> 인용' / '![캡션](경로)' / **굵게** / [링크](주소)
     ---------------------------------------------------------------------- */

  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderBody(lines) {
    var out = [], list = null;

    function flush() { if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; } }

    tArr(lines).forEach(function (raw) {
      var line = String(raw == null ? "" : raw).trim();
      if (!line) { flush(); return; }

      var img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) {
        flush();
        // 이미지는 원본을 새 탭에서 열 수 있게 링크로 감쌉니다
        out.push(
          '<figure><a href="' + esc(img[2]) + '" target="_blank" rel="noopener noreferrer" ' +
          'title="' + esc(t(UI.viewFull)) + '">' +
          '<img src="' + esc(img[2]) + '" alt="' + esc(img[1]) + '" loading="lazy"></a>' +
          (img[1] ? "<figcaption>" + inline(img[1]) + "</figcaption>" : "") +
          "</figure>"
        );
        return;
      }
      if (line.indexOf("## ") === 0) { flush(); out.push("<h3>" + inline(line.slice(3)) + "</h3>"); return; }
      if (line.indexOf("> ")  === 0) { flush(); out.push("<blockquote>" + inline(line.slice(2)) + "</blockquote>"); return; }
      if (line.indexOf("- ")  === 0) { (list = list || []).push("<li>" + inline(line.slice(2)) + "</li>"); return; }

      flush();
      out.push("<p>" + inline(line) + "</p>");
    });

    flush();
    return out.join("");
  }

  /* ---------- 데이터 로딩 ------------------------------------------------ */

  function load(names) {
    return Promise.all(names.map(function (n) {
      if (data[n]) return Promise.resolve(data[n]);
      return fetch("content/" + n + ".json", { cache: "no-cache" })
        .then(function (r) {
          if (!r.ok) throw new Error(n + ".json (" + r.status + ")");
          return r.json();
        })
        .then(function (j) { data[n] = j; return j; });
    })).then(function () {
      // 화면에 쓰기 전에 한 번만 최신순으로 정렬해 둡니다
      if (data.projects && data.projects.items) data.projects.items.sort(byNewest("start"));
      if (data.activities && data.activities.items) data.activities.items.sort(byNewest("date"));
      if (data.publications && data.publications.items) data.publications.items.sort(byNewest("year"));
    });
  }

  /* ---------- 공통 셸: 헤더 / 푸터 --------------------------------------- */

  /* --- 도트 로고 마운트 -------------------------------------------------
     헤더 · 푸터 · 히어로 모두 같은 도트 렌더러를 씁니다. 성격만 다릅니다.
       헤더  — 스크롤 내내 붙어 있으므로 정지 렌더 (움직이면 산만합니다)
       푸터  — 애니메이션. 페이지 맨 아래라 화면에 들어올 때만 돕니다
       히어로 — 애니메이션 + 마우스 인터랙션
     ---------------------------------------------------------------------- */

  var logos = {};

  function logoSlot(cls, id) {
    if (!window.HCAILogo) return '<span class="brand__mark">HCAI</span>';
    return '<span class="' + cls + '"><canvas id="' + id + '"></canvas></span>';
  }

  function mountLogo(key, id, opts) {
    var canvas = el("#" + id);
    if (!canvas || !window.HCAILogo) return;
    if (logos[key] && logos[key].stop) logos[key].stop();
    logos[key] = window.HCAILogo.mount(canvas, opts);
  }

  function renderHeader() {
    var site = data.site;
    var here = (location.pathname.split("/").pop() || "index.html");

    var navHtml = site.nav.map(function (item) {
      var file = item.href.split("#")[0] || "index.html";
      var current = (file === here && item.href.indexOf("#") < 0) ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + esc(item.href) + '"' + current + '>' + esc(t(item.label)) + "</a>";
    }).join("");

    var langHtml = LANGS.map(function (L) {
      return '<button type="button" data-lang="' + L + '" aria-pressed="' + (L === lang) + '">' + L.toUpperCase() + "</button>";
    }).join("");

    var host = el("#site-header");
    if (!host) return;

    host.innerHTML =
      '<a class="skip-link" href="#main">' + esc(t(UI.skip)) + "</a>" +
      '<div class="wrap header__inner">' +
        '<a class="brand" href="index.html" aria-label="' + esc(t(site.name)) + '">' +
          logoSlot("brand__logo", "brand-logo") +
          '<span class="brand__name">' + esc(t(site.name)) + "</span>" +
        "</a>" +
        '<button class="navtoggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
          "<span>" + esc(t(UI.menu)) + "</span></button>" +
        '<nav class="nav" id="site-nav" aria-label="Main">' + navHtml +
          '<div class="langtoggle" role="group" aria-label="Language">' + langHtml + "</div>" +
        "</nav>" +
      "</div>";

    mountLogo("brand", "brand-logo", { static: true, compact: true });

    els("[data-lang]", host).forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });

    var toggle = el(".navtoggle", host), nav = el("#site-nav", host);
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        toggle.setAttribute("aria-expanded", String(!open));
        el("span", toggle).textContent = t(open ? UI.menu : UI.close);
      });
      // 같은 페이지 안의 앵커를 눌렀을 때 모바일 메뉴를 닫습니다
      els(".nav__link", nav).forEach(function (a) {
        a.addEventListener("click", function () {
          nav.setAttribute("data-open", "false");
          toggle.setAttribute("aria-expanded", "false");
          el("span", toggle).textContent = t(UI.menu);
        });
      });
    }
  }

  function renderFooter() {
    var site = data.site, c = site.contact || {};
    var host = el("#site-footer");
    if (!host) return;

    var navHtml = site.nav.map(function (item) {
      return '<li><a href="' + esc(item.href) + '">' + esc(t(item.label)) + "</a></li>";
    }).join("");

    var linksHtml = (site.links || []).map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + "</a></li>";
    }).join("");

    host.innerHTML =
      '<div class="wrap">' +
        '<div class="footer__grid">' +
          "<div>" +
            logoSlot("footer__logo", "footer-logo") +
            '<p class="footer__title">' + esc(t(site.name)) + "</p>" +
            '<p class="footer__note">' + esc(t(site.footerNote)) + "</p>" +
          "</div>" +
          '<div class="footer__col"><h4>' + esc(t(UI.sitemap)) + "</h4><ul>" + navHtml + "</ul></div>" +
          '<div class="footer__col"><h4>' + esc(t(UI.contact)) + "</h4><ul>" +
            (c.email ? '<li><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a></li>" : "") +
            (c.phone ? '<li><a href="tel:' + esc(c.phone.replace(/[^0-9+]/g, "")) + '">' + esc(c.phone) + "</a></li>" : "") +
          "</ul></div>" +
          '<div class="footer__col"><h4>' + esc(t(UI.address)) + "</h4>" +
            "<address>" + esc(t(c.address)) + "</address>" +
            (linksHtml ? '<ul style="margin-top:1rem">' + linksHtml + "</ul>" : "") +
          "</div>" +
        "</div>" +
        '<div class="footer__bottom">' +
          "<span>© " + new Date().getFullYear() + " " + esc(t(site.name)) + "</span>" +
          "<span>" + esc(t(site.university)) + "</span>" +
        "</div>" +
      "</div>";

    mountLogo("footer", "footer-logo", { interactive: false, compact: true });
  }

  function setLang(next) {
    if (LANGS.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try { localStorage.setItem("hcai-lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    render();
  }

  /* ---------- 조각 렌더러 ------------------------------------------------- */

  function rowHtml(o) {
    return (
      '<a class="index__row" href="' + esc(o.href) + '">' +
        '<span class="index__date">' + esc(o.date) + "</span>" +
        '<span class="index__body">' +
          '<span class="index__title">' + esc(o.title) + "</span>" +
          (o.desc ? '<span class="index__desc">' + esc(o.desc) + "</span>" : "") +
        "</span>" +
        '<span class="index__meta">' + (o.meta || "") + "</span>" +
        '<span class="index__arrow" aria-hidden="true">→</span>' +
      "</a>"
    );
  }

  function catLabel(id) {
    var found = ((data.activities && data.activities.categories) || [])
      .filter(function (c) { return c.id === id; })[0];
    return found ? t(found.label) : id;
  }

  function pubTypeLabel(id) {
    var found = ((data.publications && data.publications.types) || [])
      .filter(function (c) { return c.id === id; })[0];
    return found ? t(found.label) : id;
  }

  function personCard(m, lead) {
    var photo = m.photo
      ? '<img src="' + esc(m.photo) + '" alt="' + esc(t(m.name)) + '" loading="lazy">'
      : '<div class="person__initials">' + esc(initials(m.name)) + "</div>";

    var links = (m.links || []).map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + " ↗</a>";
    });
    if (m.email) links.unshift('<a href="mailto:' + esc(m.email) + '">Email</a>');

    var tags = (m.keywords || []).length
      ? '<div class="tags">' + m.keywords.map(function (k) { return '<span class="tag">' + esc(k) + "</span>"; }).join("") + "</div>"
      : "";

    var other = lang === "ko" ? (m.name.en || "") : (m.name.ko || "");

    return (
      '<div class="person' + (lead ? " person--lead" : "") + '">' +
        '<div class="person__photo">' + photo + "</div>" +
        '<div class="stack stack--sm">' +
          '<p class="person__name">' + esc(t(m.name)) + (other ? "<span>" + esc(other) + "</span>" : "") + "</p>" +
          (t(m.role) ? '<p class="person__role">' + esc(t(m.role)) + "</p>" : "") +
          (t(m.affiliation) ? '<p class="person__aff">' + esc(t(m.affiliation)) + "</p>" : "") +
          (t(m.bio) ? '<p class="person__bio">' + esc(t(m.bio)) + "</p>" : "") +
          tags +
          (links.length ? '<p class="person__links">' + links.join("") + "</p>" : "") +
        "</div>" +
      "</div>"
    );
  }

  function alumniRow(m) {
    var other = lang === "ko" ? (m.name.en || "") : (m.name.ko || "");
    return (
      '<div class="alumnilist__item">' +
        '<span class="alumnilist__name">' + esc(t(m.name)) +
          (other ? "<span>" + esc(other) + "</span>" : "") + "</span>" +
        (t(m.role) ? '<span class="alumnilist__role">' + esc(t(m.role)) + "</span>" : "") +
      "</div>"
    );
  }

  /* ---------- 통합 아카이브 ----------------------------------------------- */

  /* 네비게이션 해시 ↔ 필터 값 */
  var HASH_FILTER = { research: "project", activities: "activity", publications: "publication", archive: "all" };
  var FILTER_HASH = { project: "research", activity: "activities", publication: "publications", all: "archive" };

  var archiveFilter = "all";
  var archiveQuery = "";
  var archiveShown = 0;   // 현재 펼쳐 놓은 개수

  function allEntries() {
    var out = [];

    (data.projects.items || []).forEach(function (p) {
      out.push({
        kind: "project",
        sort: p.start || "",
        date: fmtPeriod(p.start, p.end),
        title: t(p.title),
        desc: t(p.summary),
        badge: t(p.status === "completed" ? UI.completed : UI.ongoing),
        note: t(p.funder),
        tags: (p.tags || []).join(" "),
        href: "entry.html?type=project&id=" + encodeURIComponent(p.id)
      });
    });

    (data.activities.items || []).forEach(function (a) {
      out.push({
        kind: "activity",
        sort: a.date || "",
        date: fmtDate(a.date),
        title: t(a.title),
        desc: t(a.summary),
        badge: catLabel(a.category),
        note: t(a.place),
        tags: a.category,
        href: "entry.html?type=activity&id=" + encodeURIComponent(a.id)
      });
    });

    // 연구 성과는 별도 페이지(publications.html)에서 다루므로 여기 섞지 않습니다
    return out.sort(function (a, b) { return String(b.sort).localeCompare(String(a.sort)); });
  }

  function renderArchive() {
    var host = el("#archive-list");
    if (!host) return;

    var home = data.site.home || {};
    var limit = home.archiveLimit || 24;
    var step = home.loadMoreStep || limit;

    var entries = allEntries();
    var q = archiveQuery.trim().toLowerCase();

    var matched = entries.filter(function (e) {
      if (archiveFilter !== "all" && e.kind !== archiveFilter) return false;
      if (!q) return true;
      return (e.title + " " + e.desc + " " + e.badge + " " + e.note + " " + e.tags + " " + e.date)
        .toLowerCase().indexOf(q) > -1;
    });

    if (!archiveShown) archiveShown = limit;
    var shown = matched.slice(0, archiveShown);
    var remaining = matched.length - shown.length;

    var kinds = [
      { id: "all", label: t(UI.all) },
      { id: "project", label: t(UI.research) },
      { id: "activity", label: t(UI.activities) }
    ];

    var chips = kinds.map(function (c) {
      var n = c.id === "all" ? entries.length : entries.filter(function (e) { return e.kind === c.id; }).length;
      return '<button class="chip" type="button" data-value="' + c.id +
             '" aria-pressed="' + (archiveFilter === c.id) + '">' + esc(c.label) + " " + n + "</button>";
    }).join("");

    // 연도별 묶음
    var byYear = {}, years = [];
    shown.forEach(function (e) {
      var y = year(e.sort) || "—";
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(e);
    });
    years.sort().reverse();

    var listHtml = years.map(function (y) {
      return (
        '<section class="yeargroup">' +
          '<div class="yeargroup__head">' +
            '<h3 class="yeargroup__year">' + esc(y) + "</h3>" +
            '<span class="yeargroup__count">' + byYear[y].length + "</span>" +
          "</div>" +
          '<div class="index">' +
            byYear[y].map(function (e) {
              return rowHtml({
                href: e.href || "#",
                date: e.date,
                title: e.title,
                desc: e.desc,
                meta: '<span class="badge' + (e.kind === "publication" ? " badge--done" : "") + '">' + esc(e.badge) + "</span>" +
                      (e.note ? ' <span class="index__note">' + esc(e.note) + "</span>" : "")
              });
            }).join("") +
          "</div>" +
        "</section>"
      );
    }).join("");

    host.innerHTML =
      '<div class="wrap" id="archive">' +
        '<div class="archivecount">' + shown.length +
          (remaining > 0 ? " " + t(UI.showingOf) + " " + matched.length : "") +
          " " + esc(t(UI.resultCount)) + "</div>" +

        '<div class="archivebar">' +
          '<div class="filters">' + chips + "</div>" +
          '<input id="archive-q" class="chip chip--search" type="search" ' +
            'placeholder="' + esc(t(UI.searchPh)) + '" value="' + esc(archiveQuery) + '" ' +
            'aria-label="' + esc(t(UI.searchPh)) + '">' +
        "</div>" +

        (shown.length ? listHtml : '<p class="empty">' + esc(t(q ? UI.noResult : UI.empty)) + "</p>") +

        (remaining > 0
          ? '<div class="loadmore"><button type="button" id="archive-more">' +
              esc(t(UI.loadMore)) + " (+" + Math.min(step, remaining) + ")</button></div>"
          : "") +
      "</div>";

    // 필터 칩
    els("[data-value]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        archiveFilter = btn.getAttribute("data-value");
        archiveShown = 0;
        setHash(FILTER_HASH[archiveFilter]);
        renderArchive();
      });
    });

    // 더 보기
    var more = el("#archive-more", host);
    if (more) {
      more.addEventListener("click", function () {
        archiveShown += step;
        renderArchive();
      });
    }

    // 검색 (커서 위치 유지)
    var input = el("#archive-q", host);
    if (input) {
      input.addEventListener("input", function () {
        archiveQuery = input.value;
        archiveShown = 0;
        var pos = input.selectionStart;
        renderArchive();
        var next = el("#archive-q");
        if (next) { next.focus(); try { next.setSelectionRange(pos, pos); } catch (e) {} }
      });
    }
  }

  function setHash(name) {
    if (!name || !history.replaceState) return;
    history.replaceState(null, "", name === "archive" ? location.pathname : location.pathname + "#" + name);
  }

  function applyHash(scroll) {
    var h = (location.hash || "").replace("#", "");
    if (HASH_FILTER[h]) {
      archiveFilter = HASH_FILTER[h];
      archiveShown = 0;
      if (scroll) {
        var target = el("#archive");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return true;
    }
    return false;
  }

  /* ---------- 페이지: 홈 -------------------------------------------------- */

  function renderHero() {
    var site = data.site;
    var hero = el("#hero");
    if (!hero) return;

    // 제목의 반대쪽 언어 표기 — 원래 Cargo 타이틀 블록도 국문/영문을 함께 세웠습니다
    var alt = lang === "ko" ? (site.hero.title.en || "") : (site.hero.title.ko || "");

    hero.innerHTML =
      // 로고는 배경 레이어. 마스크로 글자 쪽만 흐려지고 오른쪽은 또렷하게 남습니다.
      '<div class="hero__bg" aria-hidden="true"><canvas id="hero-logo"></canvas></div>' +
      '<div class="wrap hero__inner">' +
        '<p class="hero__eyebrow">' + esc(t(site.hero.eyebrow)) + "</p>" +
        '<h1 class="hero__title">' + esc(t(site.hero.title)) + "</h1>" +
        (alt ? '<p class="hero__alt">' + esc(alt) + "</p>" : "") +
        '<p class="hero__sub">' + esc(t(site.hero.sub)) + "</p>" +
      "</div>";

    // 캔버스가 배경이라 클릭을 받지 못하므로, 히어로 영역 전체에서 마우스를 추적합니다
    mountLogo("hero", "hero-logo", { interactive: true, pointerTarget: hero });
  }

  /* ---------- 페이지: 홈 (히어로 + 센터 소개 2단) ------------------------- */

  function renderHome() {
    renderHero();

    var about = data.about;
    var host = el("#home-about");
    if (!host) return;

    // 오른쪽 열 — 연구 범위를 번호·제목·부제만 추려 한눈에 보이게
    var scopeHtml = (about.scope || []).map(function (s) {
      return (
        // 소개 페이지의 해당 항목으로 바로 내려가도록 번호별 앵커를 겁니다
        '<a class="scopelist__item" href="about.html#scope-' + esc(s.no) + '">' +
          '<span class="scopelist__no">' + esc(s.no) + "</span>" +
          "<span>" +
            '<span class="scopelist__title">' + esc(t(s.title)) + "</span>" +
            '<span class="scopelist__sub">' + esc(t(s.subtitle)) + "</span>" +
          "</span>" +
        "</a>"
      );
    }).join("");

    var total = allEntries().length;

    host.innerHTML =
      '<div class="wrap">' +
        '<div class="homeabout">' +
          "<div>" +
            '<div class="sechead">' +
              '<h2 class="sechead__title"><small>About</small>' + esc(t(UI.about)) + "</h2>" +
            "</div>" +
            '<div class="prose prose--wide">' + renderBody(about.lead) + "</div>" +
            '<p class="homeabout__more"><a class="backlink" href="about.html">' + esc(t(UI.more)) + " →</a></p>" +
          "</div>" +
          "<div>" +
            '<div class="sechead">' +
              '<h2 class="sechead__title"><small>Scope</small>' + esc(t(UI.scope)) + "</h2>" +
            "</div>" +
            '<div class="scopelist">' + scopeHtml + "</div>" +
            '<p class="homeabout__more"><a class="backlink" href="archive.html">' +
              esc(t(UI.seeArchive)) + " (" + total + ") →</a></p>" +
          "</div>" +
        "</div>" +
      "</div>";
  }

  /* ---------- 페이지: 연구 성과 ------------------------------------------- */

  var pubFilter = "paper";

  function pubKindLabel(id) {
    var found = ((data.publications && data.publications.kinds) || [])
      .filter(function (k) { return k.id === id; })[0];
    return found ? t(found.label) : id;
  }

  /** 논문 한 줄 — 제목 · 저자 · 학술지 · 색인 배지 · DOI */
  function paperRow(p) {
    var link = p.doi || p.url || "";
    var meta =
      (p.index ? '<span class="badge">' + esc(p.index) + "</span>" : "") +
      (p.publisher ? ' <span class="index__note">' + esc(p.publisher) + "</span>" : "") +
      // 눌러서 원문으로 갈 수 있다는 걸 드러냅니다
      (link ? ' <span class="pub__doi">DOI ↗</span>' : "");

    var body =
      '<span class="index__date">' + esc(fmtDate(p.date)) + "</span>" +
      '<span class="index__body">' +
        '<span class="index__title">' + esc(t(p.title)) + "</span>" +
        (p.authors ? '<span class="pub__authors">' + esc(p.authors) + "</span>" : "") +
        (p.venue ? '<span class="pub__venue">' + esc(p.venue) + "</span>" : "") +
      "</span>" +
      '<span class="index__meta">' + meta + "</span>" +
      '<span class="index__arrow" aria-hidden="true">' + (link ? "→" : "") + "</span>";

    return link
      ? '<a class="index__row" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + body + "</a>"
      : '<div class="index__row index__row--static">' + body + "</div>";
  }

  /** 특허 · 디자인권 한 줄 — 제목 · 발명자 · 출원/등록 정보 */
  function patentRow(p) {
    var reg = [];
    if (p.filed) reg.push((lang === "ko" ? "출원 " : "Filed ") + fmtDate(p.filed) + (p.filingNo ? " · " + p.filingNo : ""));
    if (p.registered) reg.push((lang === "ko" ? "등록 " : "Registered ") + fmtDate(p.registered) + (p.registrationNo ? " · " + p.registrationNo : ""));

    return (
      '<div class="index__row index__row--static">' +
        '<span class="index__date">' + esc(fmtDate(p.date)) + "</span>" +
        '<span class="index__body">' +
          '<span class="index__title">' + esc(t(p.title)) + "</span>" +
          (t(p.inventors) ? '<span class="pub__authors">' + esc(t(p.inventors)) + "</span>" : "") +
          (reg.length ? '<span class="pub__venue">' + esc(reg.join("  |  ")) + "</span>" : "") +
        "</span>" +
        '<span class="index__meta">' +
          '<span class="badge' + (p.kind === "design" ? " badge--done" : "") + '">' + esc(pubKindLabel(p.kind)) + "</span>" +
          (p.country ? ' <span class="index__note">' + esc(p.country) + "</span>" : "") +
        "</span>" +
        '<span class="index__arrow" aria-hidden="true"></span>' +
      "</div>"
    );
  }

  function renderPublications() {
    var host = el("#publications-list");
    if (!host) return;

    var items = (data.publications.items || []).slice()
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });

    var shown = items.filter(function (p) { return p.type === pubFilter; });

    var chips = (data.publications.types || []).map(function (c) {
      var n = items.filter(function (p) { return p.type === c.id; }).length;
      return '<button class="chip" type="button" data-pubtype="' + c.id +
             '" aria-pressed="' + (pubFilter === c.id) + '">' + esc(t(c.label)) + " " + n + "</button>";
    }).join("");

    // 연도별 묶음
    var byYear = {}, years = [];
    shown.forEach(function (p) {
      var y = year(p.date) || "—";
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(p);
    });
    years.sort().reverse();

    var listHtml = years.map(function (y) {
      return (
        '<section class="yeargroup">' +
          '<div class="yeargroup__head">' +
            '<h3 class="yeargroup__year">' + esc(y) + "</h3>" +
            '<span class="yeargroup__count">' + byYear[y].length + "</span>" +
          "</div>" +
          '<div class="index">' +
            byYear[y].map(function (p) {
              return p.type === "patent" ? patentRow(p) : paperRow(p);
            }).join("") +
          "</div>" +
        "</section>"
      );
    }).join("");

    host.innerHTML =
      '<div class="wrap">' +
        '<div class="archivecount">' + shown.length + " " + esc(t(UI.resultCount)) + "</div>" +
        '<div class="archivebar"><div class="filters">' + chips + "</div></div>" +
        (shown.length ? listHtml : '<p class="empty">' + esc(t(UI.empty)) + "</p>") +
      "</div>";

    els("[data-pubtype]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        pubFilter = btn.getAttribute("data-pubtype");
        setHash(pubFilter);          // publications.html#patent 로 바로 걸어 둘 수 있게
        renderPublications();
      });
    });
  }

  /** publications.html#paper / #patent 로 들어온 경우 탭을 맞춥니다 */
  function applyPubHash() {
    var h = (location.hash || "").replace("#", "");
    var valid = (data.publications.types || []).some(function (c) { return c.id === h; });
    if (valid && h !== pubFilter) { pubFilter = h; return true; }
    return false;
  }

  /* ---------- 페이지: 소개 ----------------------------------------------- */

  function renderAbout() {
    var site = data.site, about = data.about, c = site.contact || {};

    el("#about-intro").innerHTML =
      '<div class="wrap split">' +
        '<p class="eyebrow">' + (lang === "ko" ? "센터 소개" : "About") + "</p>" +
        '<div class="prose">' + renderBody(about.intro) + "</div>" +
      "</div>";

    var scopeHtml = about.scope.map(function (s) {
      return (
        '<div class="split scope__row" id="scope-' + esc(s.no) + '">' +
          "<div>" +
            '<p class="eyebrow scope__no">' + esc(s.no) + "</p>" +
            '<h3 class="scope__title">' + esc(t(s.title)) + "</h3>" +
            '<p class="scope__sub">' + esc(t(s.subtitle)) + "</p>" +
          "</div>" +
          '<div class="prose prose--wide">' +
            renderBody(tArr(s.items).map(function (i) { return "- " + i; })) +
          "</div>" +
        "</div>"
      );
    }).join("");

    el("#about-scope").innerHTML =
      '<div class="wrap">' +
        '<div class="sechead"><h2 class="sechead__title"><small>Scope</small>' +
          (lang === "ko" ? "연구 범위" : "Research Scope") + "</h2></div>" +
        scopeHtml +
      "</div>";

    el("#about-contact").innerHTML =
      '<div class="wrap split">' +
        '<p class="eyebrow">' + esc(t(UI.contact)) + "</p>" +
        '<dl class="detail__facts" style="margin-top:0">' +
          '<div class="detail__fact"><dt>' + esc(t(UI.address)) + '</dt><dd class="pre">' + esc(t(c.address)) + "</dd></div>" +
          '<div class="detail__fact"><dt>Tel</dt><dd>' + esc(c.phone) + "</dd></div>" +
          '<div class="detail__fact"><dt>Email</dt><dd><a class="ul" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a></dd></div>" +
        "</dl>" +
      "</div>";
  }

  /* ---------- 페이지: 구성원 --------------------------------------------- */

  function renderPeople() {
    var groups = data.people.groups || [];
    var members = data.people.members || [];

    var html = groups.map(function (g) {
      var list = members.filter(function (m) { return m.group === g.id; });

      // 비어 있는 그룹은 감춥니다. 다만 alwaysShow 가 켜져 있으면
      // 제목만 남겨 두어 '자리는 있는데 아직 채우지 않았다'를 드러냅니다.
      if (!list.length && !g.alwaysShow) return "";

      var isLead = g.id === "director" && list.length === 1;
      return (
        '<section class="people__group">' +
          '<div class="sechead">' +
            '<h2 class="sechead__title sechead__title--sm">' + esc(t(g.label)) + "</h2>" +
            (list.length ? '<span class="sechead__aside">' + list.length + "</span>" : "") +
          "</div>" +
          (!list.length
            ? '<p class="people__pending">' + esc(t(UI.preparing)) + "</p>"
            : g.hidePhoto
              // 사진 없이 이름·직함만 — Alumni 처럼 얼굴을 싣지 않는 그룹
              ? '<div class="alumnilist">' + list.map(alumniRow).join("") + "</div>"
              : isLead
                ? personCard(list[0], true)
                : '<div class="grid grid--4">' + list.map(function (m) { return personCard(m); }).join("") + "</div>") +
        "</section>"
      );
    }).join("");

    el("#people-list").innerHTML =
      '<div class="wrap">' + (html || '<p class="empty">' + esc(t(UI.empty)) + "</p>") + "</div>";
  }

  /* ---------- 페이지: 상세 ----------------------------------------------- */

  function qs(name) { return new URLSearchParams(location.search).get(name) || ""; }

  function renderEntry() {
    var type = qs("type"), id = qs("id");
    var host = el("#entry");

    var backHref = type === "activity" ? "archive.html#activities" : "archive.html#research";
    var items = type === "activity" ? (data.activities.items || []) : (data.projects.items || []);
    var idx = -1;
    items.forEach(function (it, i) { if (it.id === id) idx = i; });

    if (idx < 0) {
      host.innerHTML =
        '<div class="wrap section">' +
          '<p class="empty">' + esc(t(UI.notFound)) + "</p>" +
          '<p style="text-align:center"><a class="backlink" href="' + backHref + '">← ' + esc(t(UI.backTo)) + "</a></p>" +
        "</div>";
      return;
    }

    var it = items[idx];
    document.title = t(it.title) + " — HCAI";

    var facts = [];
    if (type === "activity") {
      facts.push([t(UI.date), fmtDate(it.date)]);
      if (t(it.place)) facts.push([t(UI.place), t(it.place)]);
      facts.push([t(UI.category), catLabel(it.category)]);
    } else {
      facts.push([t(UI.period), fmtPeriod(it.start, it.end)]);
      if (t(it.funder)) facts.push([t(UI.funder), t(it.funder)]);
      if (t(it.kind)) facts.push([t(UI.kind), t(it.kind)]);
      facts.push([t(UI.status), t(it.status === "completed" ? UI.completed : UI.ongoing)]);
    }

    var factsHtml = '<dl class="detail__facts">' + facts.map(function (f) {
      return '<div class="detail__fact"><dt>' + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>";
    }).join("") + "</dl>";

    var tagsHtml = (it.tags || []).length
      ? '<div class="tags detail__tags">' + it.tags.map(function (k) { return '<span class="tag">' + esc(k) + "</span>"; }).join("") + "</div>"
      : "";

    var rolesHtml = (it.roles || []).length
      ? '<div class="section--tight"><div class="rolelist">' + it.roles.map(function (r) {
          return '<div><p class="rolelist__label">' + esc(t(r.label)) + "</p>" +
            r.people.map(function (p) {
              return '<div class="rolelist__item"><b>' + esc(t(p.name)) + "</b><span>" + esc(t(p.org)) + "</span></div>";
            }).join("") + "</div>";
        }).join("") + "</div></div>"
      : "";

    var galleryHtml = (it.gallery || []).length
      ? '<div class="section--tight"><div class="gallery">' + it.gallery.map(function (g) {
          var src = typeof g === "string" ? g : g.src;
          var cap = typeof g === "string" ? "" : t(g.caption);
          return '<a href="' + esc(src) + '" target="_blank" rel="noopener noreferrer">' +
                 '<img src="' + esc(src) + '" alt="' + esc(cap) + '" loading="lazy"></a>';
        }).join("") + "</div></div>"
      : "";

    var linksHtml = (it.links || []).length
      ? '<div class="section--tight"><p class="rolelist__label">' + esc(t(UI.links)) + "</p>" +
        it.links.map(function (l) {
          return '<p><a class="backlink" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t(l.label)) + " ↗</a></p>";
        }).join("") + "</div>"
      : "";

    var pubs = (data.publications.items || []).filter(function (p) { return p.project === it.id; });
    var pubsHtml = pubs.length
      ? '<div class="section--tight"><p class="rolelist__label">' + esc(t(UI.related)) + "</p>" +
        '<div class="index">' + pubs.map(function (p) {
          return rowHtml({
            href: p.doi || p.url || "#",
            date: fmtDate(p.date),
            title: t(p.title),
            desc: [p.authors, p.venue].filter(Boolean).join(" · "),
            meta: '<span class="badge badge--done">' + esc(pubTypeLabel(p.type)) + "</span>"
          });
        }).join("") + "</div></div>"
      : "";

    var prev = items[idx - 1], next = items[idx + 1];
    var pagerHtml =
      '<div class="wrap"><div class="pager">' +
        (prev ? '<a href="entry.html?type=' + esc(type) + "&id=" + encodeURIComponent(prev.id) + '"><span>' + esc(t(UI.prev)) + "</span><b>" + esc(t(prev.title)) + "</b></a>" : "<span></span>") +
        (next ? '<a class="pager__next" href="entry.html?type=' + esc(type) + "&id=" + encodeURIComponent(next.id) + '"><span>' + esc(t(UI.next)) + "</span><b>" + esc(t(next.title)) + "</b></a>" : "<span></span>") +
      "</div></div>";

    var coverHtml = it.cover
      ? '<div class="wrap section--tight"><img class="detail__cover" src="' + esc(it.cover) + '" alt="" loading="lazy"></div>'
      : "";

    host.innerHTML =
      '<div class="wrap detail__head">' +
        '<a class="backlink" href="' + backHref + '">← ' + esc(t(UI.backTo)) + "</a>" +
        '<h1 class="detail__title">' + esc(t(it.title)) + "</h1>" +
        (t(it.summary) ? '<p class="detail__lead">' + esc(t(it.summary)) + "</p>" : "") +
        factsHtml + tagsHtml +
      "</div>" +
      coverHtml +
      '<div class="wrap section">' +
        '<div class="prose">' + renderBody(it.body) + "</div>" +
        rolesHtml + galleryHtml + pubsHtml + linksHtml +
      "</div>" +
      pagerHtml;
  }

  /** 해시가 가리키는 요소로 스크롤합니다.
   *  본문을 JS로 그리기 때문에 브라우저의 기본 해시 이동은 요소가 생기기 전에
   *  일어나 버립니다. 그래서 렌더가 끝난 뒤 직접 한 번 옮겨 줍니다.
   *  (헤더에 가리지 않도록 html 의 scroll-padding-top 이 함께 작동합니다) */
  function scrollToHash(smooth) {
    var id = (location.hash || "").replace("#", "");
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;

    // CSS :target 은 페이지 진입 시점에 이미 있던 요소에만 걸립니다.
    // 본문을 JS로 그리므로 직접 클래스를 붙여 표시합니다.
    els(".is-target").forEach(function (n) { n.classList.remove("is-target"); });
    target.classList.add("is-target");

    // html 에 scroll-behavior: smooth 가 걸려 있어서 "auto" 를 주면 부드러운 스크롤이
    // 됩니다. 페이지 진입 시에는 곧바로 자리를 잡아야 하므로 "instant" 로 덮어씁니다.
    target.scrollIntoView({ behavior: smooth ? "smooth" : "instant", block: "start" });
  }

  /** 처음 진입할 때의 해시 이동.
   *  웹폰트(Pretendard)가 CDN에서 늦게 도착하면 줄 높이가 바뀌면서 목표 위치가
   *  밀립니다. 그래서 렌더 직후 · 폰트 로드 후 · 한 박자 뒤 세 번 맞춥니다. */
  function settleScrollToHash() {
    if (!location.hash) return;
    requestAnimationFrame(function () { scrollToHash(false); });
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () { scrollToHash(false); });
    }
    setTimeout(function () { scrollToHash(false); }, 400);
  }

  /* ---------- reveal ------------------------------------------------------ */

  function observeReveal() {
    var targets = els(".reveal");
    if (!targets.length || !("IntersectionObserver" in window)) {
      targets.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    targets.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 렌더 진입점 ------------------------------------------------- */

  var PAGES = {
    home: renderHome,
    archive: renderArchive,
    publications: renderPublications,
    about: renderAbout,
    people: renderPeople,
    entry: renderEntry
  };

  function render() {
    renderHeader();
    renderFooter();
    if (PAGES[pageName]) PAGES[pageName]();
    els("[data-i18n-ko]").forEach(function (n) {
      n.textContent = n.getAttribute("data-i18n-" + lang) || n.getAttribute("data-i18n-ko");
    });
    observeReveal();
  }

  var NEEDS = {
    home:         ["site", "about", "projects", "activities"],
    archive:      ["site", "projects", "activities"],
    publications: ["site", "publications"],
    about:        ["site", "about"],
    people:       ["site", "people"],
    entry:        ["site", "projects", "activities", "publications"]
  };

  function init(opts) {
    pageName = (opts && opts.page) || "home";
    document.documentElement.lang = lang;

    load(NEEDS[pageName] || ["site"])
      .then(function () {
        if (pageName === "archive") applyHash(false);
        if (pageName === "publications") applyPubHash();
        render();
        if (pageName === "about") {
          // 홈의 '연구 범위' 항목에서 넘어온 경우 해당 위치로 이동
          settleScrollToHash();
          window.addEventListener("hashchange", function () { scrollToHash(true); });
        }
        if (pageName === "publications") {
          window.addEventListener("hashchange", function () {
            if (applyPubHash()) renderPublications();
          });
        }
        if (pageName === "archive") {
          // archive.html#research 처럼 필터를 지정해 들어온 경우
          window.addEventListener("hashchange", function () {
            if (applyHash(true)) renderArchive();
          });
        }
      })
      .catch(function (err) {
        console.error(err);
        var main = el("#main") || document.body;
        main.innerHTML =
          '<div class="wrap section"><p class="empty">' +
          "콘텐츠를 불러오지 못했습니다 / Failed to load content<br><br>" + esc(err.message) +
          "<br><br>로컬에서 열었다면 파일을 더블클릭하지 말고 preview.bat 으로 여세요.</p></div>";
      });
  }

  window.HCAI = { init: init, t: t, setLang: setLang };
})();
