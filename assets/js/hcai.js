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
    archive:      { ko: "기록", en: "Archive" },
    sitemap:      { ko: "바로가기", en: "Sitemap" },
    empty:        { ko: "아직 등록된 항목이 없습니다", en: "Nothing here yet" },
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

  function logoSvg(cls) {
    // hcai-logo.js 가 들고 있는 워드마크를 그대로 인라인 — currentColor 로 색이 따라옵니다
    var svg = (window.HCAILogo && window.HCAILogo.SVG) || "";
    if (!svg) return '<span class="brand__mark">HCAI</span>';
    return svg
      .replace("<svg ", '<svg class="' + cls + '" role="img" aria-label="HCAI" fill="currentColor" ')
      .replace("<g>", '<g fill="currentColor">');
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
          logoSvg("brand__logo") +
          '<span class="brand__name">' + esc(t(site.name)) + "</span>" +
        "</a>" +
        '<button class="navtoggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
          "<span>" + esc(t(UI.menu)) + "</span></button>" +
        '<nav class="nav" id="site-nav" aria-label="Main">' + navHtml +
          '<div class="langtoggle" role="group" aria-label="Language">' + langHtml + "</div>" +
        "</nav>" +
      "</div>";

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
            logoSvg("footer__logo") +
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
          tags +
          (links.length ? '<p class="person__links">' + links.join("") + "</p>" : "") +
        "</div>" +
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

    (data.publications.items || []).forEach(function (p) {
      out.push({
        kind: "publication",
        sort: p.year || "",
        date: p.year || "",
        title: t(p.title),
        desc: [p.authors, p.venue].filter(Boolean).join(" · "),
        badge: pubTypeLabel(p.type),
        note: "",
        tags: p.type,
        href: p.url || p.doi || ""
      });
    });

    return out.sort(function (a, b) { return String(b.sort).localeCompare(String(a.sort)); });
  }

  function renderArchive() {
    var host = el("#home-archive");
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
      { id: "activity", label: t(UI.activities) },
      { id: "publication", label: t(UI.publications) }
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
      '<div class="wrap">' +
        '<div class="sechead" id="archive">' +
          '<h2 class="sechead__title"><small>Archive</small>' + esc(t(UI.archive)) + "</h2>" +
          '<span class="sechead__aside">' + shown.length +
            (remaining > 0 ? " " + t(UI.showingOf) + " " + matched.length : "") +
            " " + esc(t(UI.resultCount)) + "</span>" +
        "</div>" +

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

  function renderHome() {
    var site = data.site;

    el("#hero").innerHTML =
      '<div class="wrap hero__inner">' +
        '<div class="hero__logo">' +
          '<canvas id="hero-logo" aria-label="HCAI" role="img"></canvas>' +
        "</div>" +
        '<p class="hero__eyebrow">' + esc(t(site.hero.eyebrow)) + "</p>" +
        '<h1 class="hero__title">' + esc(t(site.hero.title)) + "</h1>" +
        '<p class="hero__sub">' + esc(t(site.hero.sub)) + "</p>" +
      "</div>";

    mountHeroLogo();
    renderArchive();
  }

  var heroLogo = null;
  function mountHeroLogo() {
    var canvas = el("#hero-logo");
    if (!canvas || !window.HCAILogo) return;
    // 언어 전환으로 히어로를 다시 그리면 캔버스도 새로 생기므로 매번 붙입니다
    if (heroLogo) heroLogo.stop();
    heroLogo = window.HCAILogo.mount(canvas, { interactive: true });
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
        '<div class="split scope__row">' +
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
      if (!list.length) return "";
      var isLead = g.id === "director" && list.length === 1;
      return (
        '<section class="people__group">' +
          '<div class="sechead">' +
            '<h2 class="sechead__title sechead__title--sm">' + esc(t(g.label)) + "</h2>" +
            '<span class="sechead__aside">' + list.length + "</span>" +
          "</div>" +
          (isLead
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

    var backHref = type === "activity" ? "index.html#activities" : "index.html#research";
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
            href: p.url || p.doi || "#",
            date: p.year || "",
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

  var PAGES = { home: renderHome, about: renderAbout, people: renderPeople, entry: renderEntry };

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
    home:   ["site", "projects", "activities", "publications"],
    about:  ["site", "about"],
    people: ["site", "people"],
    entry:  ["site", "projects", "activities", "publications"]
  };

  function init(opts) {
    pageName = (opts && opts.page) || "home";
    document.documentElement.lang = lang;

    load(NEEDS[pageName] || ["site"])
      .then(function () {
        if (pageName === "home") applyHash(false);
        render();
        if (pageName === "home") {
          // 다른 페이지에서 '연구' / '활동·뉴스' 를 눌러 들어온 경우 해당 위치로
          if (location.hash) setTimeout(function () { applyHash(true); renderArchive(); }, 60);
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
