/* =========================================================
   app.js — منطق تطبيق "كيف أبدأ البرمجة بالطريقة الصحيحة؟"
   ========================================================= */

/* --------------------------- التخزين المحلي --------------------------- */

const INSTAGRAM_HANDLE = "prof.i3lam_ali";
const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

const STORE_KEYS = {
  progress: "labp_progress_v1",
  favorites: "labp_favorites_v1",
  settings: "labp_settings_v1",
  quizScores: "labp_quiz_scores_v1"
};

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* التخزين ممتلئ أو غير متاح - تجاهل بصمت */
    }
  }
};

let progress = Store.get(STORE_KEYS.progress, {
  completedLessons: [], // ["1-1","1-2", ...]
  lastLessonId: null
});
let favorites = Store.get(STORE_KEYS.favorites, []);
let quizScores = Store.get(STORE_KEYS.quizScores, {}); // { "1": {correct:2,total:2}, ... }
let settings = Store.get(STORE_KEYS.settings, {
  theme: "light",
  fontScale: 1
});

function persist() {
  Store.set(STORE_KEYS.progress, progress);
  Store.set(STORE_KEYS.favorites, favorites);
  Store.set(STORE_KEYS.quizScores, quizScores);
  Store.set(STORE_KEYS.settings, settings);
}

/* --------------------------- أدوات مساعدة --------------------------- */

function $(sel, root = document) {
  return root.querySelector(sel);
}
function el(tag, attrs, children) {
  attrs = attrs || {};
  children = children == null ? [] : children;
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function findChapter(chapterId) {
  return CURRICULUM.chapters.find((c) => String(c.id) === String(chapterId));
}
function findLesson(lessonId) {
  for (const ch of CURRICULUM.chapters) {
    const lesson = ch.lessons.find((l) => l.id === lessonId);
    if (lesson) return { chapter: ch, lesson };
  }
  return null;
}
function allLessons() {
  return CURRICULUM.chapters.flatMap((ch) => ch.lessons.map((l) => ({ chapter: ch, lesson: l })));
}
function chapterCompletion(ch) {
  const total = ch.lessons.length;
  if (total === 0) return 0;
  const done = ch.lessons.filter((l) => progress.completedLessons.includes(l.id)).length;
  return Math.round((done / total) * 100);
}
function totalCompletion() {
  const all = allLessons();
  const total = all.length;
  if (total === 0) return 0;
  const done = all.filter((x) => progress.completedLessons.includes(x.lesson.id)).length;
  return Math.round((done / total) * 100);
}

/* --------------------------- التوجيه (Router) --------------------------- */

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "roadmap") return { name: "roadmap" };
  if (parts[0] === "chapter") return { name: "chapter", id: parts[1] };
  if (parts[0] === "lesson") return { name: "lesson", id: parts[1] };
  if (parts[0] === "quiz") return { name: "quiz", id: parts[1] };
  if (parts[0] === "search") return { name: "search" };
  if (parts[0] === "favorites") return { name: "favorites" };
  if (parts[0] === "settings") return { name: "settings" };
  return { name: "home" };
}

function navigate(hash) {
  location.hash = hash;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  applySettings();
  render();
  registerServiceWorker();
  setupInstallPrompt();

  const params = new URLSearchParams(location.search);
  if (params.get("continue") === "1" && progress.lastLessonId) {
    navigate(`#/lesson/${progress.lastLessonId}`);
  }
});

/* --------------------------- التصيير الرئيسي --------------------------- */

const APP_ROOT = () => $("#app");

function render() {
  const route = currentRoute();
  const root = APP_ROOT();
  root.innerHTML = "";
  root.appendChild(renderTopBar(route));

  const page = el("div", { class: "page" });
  root.appendChild(page);

  switch (route.name) {
    case "home":
      page.appendChild(renderHome());
      break;
    case "roadmap":
      page.appendChild(renderRoadmap());
      break;
    case "chapter":
      page.appendChild(renderChapter(route.id));
      break;
    case "lesson":
      page.appendChild(renderLesson(route.id));
      break;
    case "quiz":
      page.appendChild(renderChapterQuiz(route.id));
      break;
    case "search":
      page.appendChild(renderSearch());
      break;
    case "favorites":
      page.appendChild(renderFavorites());
      break;
    case "settings":
      page.appendChild(renderSettings());
      break;
    default:
      page.appendChild(renderHome());
  }

  root.appendChild(renderBottomNav(route));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function renderTopBar(route) {
  const showBack = route.name !== "home";
  const bar = el("header", { class: "topbar" }, [
    showBack
      ? el("button", { class: "icon-btn", "aria-label": "رجوع", onclick: () => history.back() }, "→")
      : el("span", { class: "brand" }, "🧭"),
    el("h1", { class: "topbar-title" }, titleForRoute(route)),
    el("button", {
      class: "icon-btn",
      "aria-label": "بحث",
      onclick: () => navigate("#/search")
    }, "🔍")
  ]);
  return bar;
}

function titleForRoute(route) {
  if (route.name === "home") return "كيف أبدأ البرمجة؟";
  if (route.name === "roadmap") return "خريطة التعلم";
  if (route.name === "chapter") {
    const ch = findChapter(route.id);
    return ch ? `${ch.title}` : "الفصل";
  }
  if (route.name === "lesson") {
    const found = findLesson(route.id);
    return found ? found.lesson.title : "الدرس";
  }
  if (route.name === "quiz") return "اختبار الفصل";
  if (route.name === "search") return "البحث";
  if (route.name === "favorites") return "المفضلة";
  if (route.name === "settings") return "الإعدادات";
  return "";
}

function renderBottomNav(route) {
  const items = [
    { key: "home", icon: "🏠", label: "الرئيسية", hash: "#/" },
    { key: "roadmap", icon: "🗺️", label: "الخريطة", hash: "#/roadmap" },
    { key: "favorites", icon: "⭐", label: "المفضلة", hash: "#/favorites" },
    { key: "settings", icon: "⚙️", label: "الإعدادات", hash: "#/settings" }
  ];
  const nav = el("nav", { class: "bottom-nav" });
  items.forEach((item) => {
    const active = route.name === item.key || (item.key === "home" && route.name === "home");
    nav.appendChild(
      el(
        "button",
        {
          class: "bottom-nav-item" + (active ? " active" : ""),
          onclick: () => navigate(item.hash)
        },
        [el("span", { class: "bn-icon" }, item.icon), el("span", { class: "bn-label" }, item.label)]
      )
    );
  });
  return nav;
}

/* --------------------------- الصفحة الرئيسية --------------------------- */

function renderHome() {
  const wrap = el("div", { class: "home" });

  wrap.appendChild(
    el("section", { class: "hero" }, [
      el("div", { class: "hero-badge" }, "دليلك التفاعلي الكامل"),
      el("h2", { class: "hero-title" }, "كيف أبدأ البرمجة بالطريقة الصحيحة؟"),
      el(
        "p",
        { class: "hero-desc" },
        "رحلة منهجية خطوة بخطوة: من فهم ما هي البرمجة، إلى كتابة أول برنامج، وصولًا لاختيار تخصصك. بدون تشتت، وبدون اختصار مخل."
      ),
      el(
        "button",
        {
          class: "btn btn-primary btn-lg",
          onclick: () => navigate("#/roadmap")
        },
        progress.completedLessons.length > 0 ? "تابع رحلتك" : "ابدأ رحلتك"
      )
    ])
  );

  const pct = totalCompletion();
  wrap.appendChild(
    el("section", { class: "card progress-card" }, [
      el("div", { class: "progress-card-head" }, [
        el("span", null, "تقدّمك الإجمالي"),
        el("strong", null, `${pct}%`)
      ]),
      el("div", { class: "progress-bar" }, [el("div", { class: "progress-bar-fill", style: `width:${pct}%` })]),
      el("div", { class: "stat-row" }, [
        statPill("📘", `${progress.completedLessons.length}`, "درس مكتمل"),
        statPill("📗", `${CURRICULUM.chapters.filter((c) => chapterCompletion(c) === 100).length}`, "فصل مكتمل"),
        statPill("📝", `${Object.keys(quizScores).length}`, "اختبار مُنجز")
      ])
    ])
  );

  if (progress.lastLessonId) {
    const found = findLesson(progress.lastLessonId);
    if (found) {
      wrap.appendChild(
        el("section", { class: "card continue-card", onclick: () => navigate(`#/lesson/${found.lesson.id}`) }, [
          el("div", { class: "continue-label" }, "آخر درس توقفت عنده"),
          el("div", { class: "continue-title" }, found.lesson.title),
          el("div", { class: "continue-sub" }, `${found.chapter.title} ←`)
        ])
      );
    }
  }

  wrap.appendChild(
    el("section", { class: "card feature-card", onclick: () => navigate("#/roadmap") }, [
      el("div", { class: "feature-icon" }, "🗺️"),
      el("div", null, [
        el("div", { class: "feature-title" }, "استعرض خريطة التعلم الكاملة"),
        el("div", { class: "feature-sub" }, "14 فصلًا مرتّبًا من الأساس حتى اختيار تخصصك")
      ])
    ])
  );

  wrap.appendChild(renderInstagramCard());

  return wrap;
}

function statPill(icon, value, label) {
  return el("div", { class: "stat-pill" }, [
    el("div", { class: "stat-icon" }, icon),
    el("div", { class: "stat-value" }, value),
    el("div", { class: "stat-label" }, label)
  ]);
}

/* --------------------------- خريطة التعلم (Timeline) --------------------------- */

function renderRoadmap() {
  const wrap = el("div", { class: "roadmap" });
  wrap.appendChild(el("p", { class: "roadmap-intro" }, "امشِ في المسار خطوة بخطوة. كل بطاقة فصل تفتح لك دروسه."));

  const timeline = el("div", { class: "timeline" });
  CURRICULUM.chapters.forEach((ch, idx) => {
    const pct = chapterCompletion(ch);
    const isDone = pct === 100;
    const node = el("div", { class: "timeline-node" }, [
      el("div", { class: "timeline-line" + (idx === 0 ? " first" : "") }),
      el("div", { class: "timeline-dot" + (isDone ? " done" : "") }, isDone ? "✓" : String(ch.id)),
      el(
        "button",
        { class: "card chapter-card" + (isDone ? " chapter-done" : ""), onclick: () => navigate(`#/chapter/${ch.id}`) },
        [
          el("div", { class: "chapter-card-top" }, [
            el("span", { class: "chapter-icon" }, ch.icon || "📘"),
            el("span", { class: "chapter-num" }, `الفصل ${ch.id}`)
          ]),
          el("h3", { class: "chapter-title" }, ch.title),
          el("p", { class: "chapter-subtitle" }, ch.subtitle || ""),
          el("div", { class: "chapter-meta" }, [
            el("span", null, `⏱️ ${ch.duration}`),
            el("span", null, `📄 ${ch.lessonsCount} دروس`),
            el("span", null, `${pct}% مكتمل`)
          ]),
          el("div", { class: "progress-bar sm" }, [el("div", { class: "progress-bar-fill", style: `width:${pct}%` })])
        ]
      )
    ]);
    timeline.appendChild(node);
  });
  wrap.appendChild(timeline);
  return wrap;
}

/* --------------------------- صفحة الفصل --------------------------- */

function renderChapter(chapterId) {
  const ch = findChapter(chapterId);
  if (!ch) return el("div", { class: "empty" }, "الفصل غير موجود.");

  const wrap = el("div", { class: "chapter-page" });
  wrap.appendChild(
    el("div", { class: "chapter-page-head" }, [
      el("span", { class: "chapter-icon-lg" }, ch.icon || "📘"),
      el("div", null, [el("h2", null, ch.title), el("p", { class: "muted" }, ch.subtitle || "")])
    ])
  );

  const pct = chapterCompletion(ch);
  wrap.appendChild(
    el("div", { class: "card" }, [
      el("div", { class: "progress-card-head" }, [el("span", null, "تقدّم الفصل"), el("strong", null, `${pct}%`)]),
      el("div", { class: "progress-bar" }, [el("div", { class: "progress-bar-fill", style: `width:${pct}%` })])
    ])
  );

  const list = el("div", { class: "lesson-list" });
  ch.lessons.forEach((lesson, i) => {
    const isDone = progress.completedLessons.includes(lesson.id);
    const isFav = favorites.includes(lesson.id);
    list.appendChild(
      el(
        "button",
        {
          class: "lesson-item" + (isDone ? " done" : "") + (lesson.comingSoon ? " soon" : ""),
          onclick: () => (lesson.comingSoon ? null : navigate(`#/lesson/${lesson.id}`))
        },
        [
          el("div", { class: "lesson-item-num" }, isDone ? "✓" : String(i + 1)),
          el("div", { class: "lesson-item-body" }, [
            el("div", { class: "lesson-item-title" }, lesson.title),
            el("div", { class: "lesson-item-sub" }, lesson.comingSoon ? "قريبًا — قيد الإضافة" : "اضغط لبدء الدرس")
          ]),
          isFav ? el("span", { class: "fav-badge" }, "⭐") : null
        ]
      )
    );
  });
  wrap.appendChild(list);

  if (ch.lessons.some((l) => l.quiz && l.quiz.length) || ch.lessons.every((l) => !l.comingSoon)) {
    wrap.appendChild(
      el(
        "button",
        {
          class: "btn btn-secondary btn-block",
          onclick: () => navigate(`#/quiz/${ch.id}`)
        },
        "📝 اختبار الفصل الشامل"
      )
    );
  }

  return wrap;
}

/* --------------------------- صفحة الدرس --------------------------- */

function renderLesson(lessonId) {
  const found = findLesson(lessonId);
  if (!found) return el("div", { class: "empty" }, "الدرس غير موجود.");
  const { chapter, lesson } = found;

  if (lesson.comingSoon) {
    return el("div", { class: "empty-state" }, [
      el("div", { class: "empty-icon" }, "🚧"),
      el("h3", null, lesson.title),
      el("p", { class: "muted" }, "هذا الدرس قيد الإعداد وسيُضاف بمحتواه الكامل قريبًا ضمن تحديثات الدليل القادمة."),
      el("button", { class: "btn btn-primary", onclick: () => navigate(`#/chapter/${chapter.id}`) }, "العودة للفصل")
    ]);
  }

  progress.lastLessonId = lesson.id;
  persist();

  const isFav = favorites.includes(lesson.id);
  const wrap = el("div", { class: "lesson-page" });

  wrap.appendChild(
    el("div", { class: "lesson-head" }, [
      el("span", { class: "eyebrow" }, `${chapter.title} · درس`),
      el("div", { class: "lesson-head-row" }, [
        el("h2", null, lesson.title),
        el("button", {
          class: "icon-btn fav-toggle" + (isFav ? " active" : ""),
          "aria-label": "إضافة للمفضلة",
          onclick: () => {
            toggleFavorite(lesson.id);
            render();
          }
        }, isFav ? "⭐" : "☆")
      ])
    ])
  );

  wrap.appendChild(el("p", { class: "lesson-intro" }, lesson.intro));

  if (lesson.objectives && lesson.objectives.length) {
    wrap.appendChild(sectionBlock("🎯 أهداف الدرس", el("ul", { class: "obj-list" }, lesson.objectives.map((o) => el("li", null, o)))));
  }

  if (lesson.svg === "path-diagram") {
    wrap.appendChild(sectionBlock("📊 توضيح مرئي", renderPathDiagramSVG()));
  }
  if (lesson.svg === "folder-tree-diagram") {
    wrap.appendChild(sectionBlock("📊 توضيح مرئي", renderFolderTreeSVG()));
  }
  if (lesson.svg === "flowchart-diagram") {
    wrap.appendChild(sectionBlock("📊 توضيح مرئي", renderFlowchartSVG()));
  }

  if (lesson.sections && lesson.sections.length) {
    const explainWrap = el("div", { class: "explain" });
    lesson.sections.forEach((sec) => {
      explainWrap.appendChild(el("h3", { class: "explain-heading" }, sec.heading));
      sec.paragraphs.forEach((p) => explainWrap.appendChild(el("p", { class: "explain-p" }, p)));
    });
    wrap.appendChild(sectionBlock("📖 الشرح الكامل", explainWrap));
  }

  if (lesson.examples && lesson.examples.length) {
    const exWrap = el("div", { class: "examples" });
    lesson.examples.forEach((ex) => {
      exWrap.appendChild(
        el("div", { class: "example-card" }, [el("div", { class: "example-title" }, ex.title), el("p", null, ex.content)])
      );
    });
    wrap.appendChild(sectionBlock("💡 أمثلة", exWrap));
  }

  if (lesson.code && lesson.code.length) {
    const codeWrap = el("div", { class: "code-list" });
    lesson.code.forEach((c) => {
      if (c.caption) codeWrap.appendChild(el("div", { class: "code-caption" }, c.caption));
      codeWrap.appendChild(el("pre", { class: "code-block", dir: "ltr" }, el("code", null, c.snippet)));
      if (c.output) {
        codeWrap.appendChild(el("div", { class: "code-output-label" }, "الناتج:"));
        codeWrap.appendChild(el("pre", { class: "code-block code-output", dir: "ltr" }, el("code", null, c.output)));
      }
    });
    wrap.appendChild(sectionBlock("💻 أمثلة برمجية", codeWrap));
  }

  if (lesson.practicalExamples && lesson.practicalExamples.length) {
    wrap.appendChild(
      sectionBlock(
        "✍️ تدريب عملي",
        el("ul", { class: "practice-list" }, lesson.practicalExamples.map((p) => el("li", null, p)))
      )
    );
  }

  if (lesson.notes && lesson.notes.length) {
    wrap.appendChild(
      sectionBlock(
        "📌 ملاحظات مهمة",
        el("div", { class: "notes-box" }, lesson.notes.map((n) => el("p", null, "• " + n)))
      )
    );
  }

  if (lesson.mistakes && lesson.mistakes.length) {
    wrap.appendChild(
      sectionBlock(
        "⚠️ أخطاء شائعة",
        el("div", { class: "mistakes-box" }, lesson.mistakes.map((m) => el("p", null, "• " + m)))
      )
    );
  }

  if (lesson.summary) {
    wrap.appendChild(sectionBlock("✅ ملخص الدرس", el("p", { class: "summary-box" }, lesson.summary)));
  }

  if (lesson.quiz && lesson.quiz.length) {
    wrap.appendChild(sectionBlock("🧪 اختبر فهمك", renderInlineQuiz(lesson)));
  }

  const idxInChapter = chapter.lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = chapter.lessons[idxInChapter - 1];
  const nextLesson = chapter.lessons[idxInChapter + 1];

  wrap.appendChild(
    el("div", { class: "lesson-nav" }, [
      prevLesson
        ? el("button", { class: "btn btn-ghost", onclick: () => navigate(`#/lesson/${prevLesson.id}`) }, "→ السابق")
        : el("span"),
      el(
        "button",
        {
          class: "btn btn-primary",
          onclick: () => {
            markLessonComplete(lesson.id);
            if (nextLesson) navigate(`#/lesson/${nextLesson.id}`);
            else navigate(`#/chapter/${chapter.id}`);
          }
        },
        nextLesson ? "أنهيت الدرس · التالي ←" : "أنهيت الدرس · العودة للفصل"
      )
    ])
  );

  return wrap;
}

function sectionBlock(title, content) {
  return el("section", { class: "card section-block" }, [el("h4", { class: "section-title" }, title), content]);
}

function markLessonComplete(lessonId) {
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
    persist();
  }
}

function toggleFavorite(lessonId) {
  if (favorites.includes(lessonId)) {
    favorites = favorites.filter((id) => id !== lessonId);
  } else {
    favorites.push(lessonId);
  }
  persist();
}

/* --------------------------- رسم توضيحي SVG (مسار التعلم) --------------------------- */

function renderPathDiagramSVG() {
  const svgHTML = `
  <svg viewBox="0 0 320 140" class="lesson-svg" role="img" aria-label="رسم توضيحي: مدخلات، معالجة، مخرجات">
    <defs>
      <linearGradient id="pd-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3B5BFD"/>
        <stop offset="100%" stop-color="#22C55E"/>
      </linearGradient>
    </defs>
    <rect x="10" y="45" width="80" height="50" rx="12" fill="#EEF1FF" stroke="#3B5BFD" stroke-width="2"/>
    <text x="50" y="75" text-anchor="middle" font-size="12" fill="#1A1F36" font-weight="700">مدخلات</text>

    <rect x="120" y="35" width="90" height="70" rx="14" fill="#0B1220"/>
    <text x="165" y="65" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">تعليمات</text>
    <text x="165" y="82" text-anchor="middle" font-size="12" fill="#FFB020" font-weight="700">(الكود)</text>

    <rect x="230" y="45" width="80" height="50" rx="12" fill="#EAFBEF" stroke="#22C55E" stroke-width="2"/>
    <text x="270" y="75" text-anchor="middle" font-size="12" fill="#1A1F36" font-weight="700">مخرجات</text>

    <path d="M92 70 H118" stroke="url(#pd-grad)" stroke-width="3" marker-end="url(#arrow)"/>
    <path d="M212 70 H228" stroke="url(#pd-grad)" stroke-width="3" marker-end="url(#arrow)"/>
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#22C55E"/>
      </marker>
    </defs>
  </svg>`;
  return el("div", { class: "svg-wrap", html: svgHTML });
}

function renderFolderTreeSVG() {
  const svgHTML = `
  <svg viewBox="0 0 320 170" class="lesson-svg" role="img" aria-label="رسم توضيحي: شجرة المجلدات">
    <rect x="130" y="8" width="90" height="30" rx="8" fill="#3B5BFD"/>
    <text x="175" y="27" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">my-project</text>

    <path d="M175 38 V55 M175 55 H70 M175 55 H280" stroke="#C7CEEB" stroke-width="2" fill="none"/>
    <path d="M70 55 V70" stroke="#C7CEEB" stroke-width="2"/>
    <path d="M175 55 V70" stroke="#C7CEEB" stroke-width="2"/>
    <path d="M280 55 V70" stroke="#C7CEEB" stroke-width="2"/>

    <rect x="30" y="70" width="80" height="28" rx="8" fill="#EEF1FF" stroke="#3B5BFD" stroke-width="1.5"/>
    <text x="70" y="88" text-anchor="middle" font-size="10" fill="#1A1F36" font-weight="700">images/</text>

    <rect x="135" y="70" width="80" height="28" rx="8" fill="#EEF1FF" stroke="#3B5BFD" stroke-width="1.5"/>
    <text x="175" y="88" text-anchor="middle" font-size="10" fill="#1A1F36" font-weight="700">scripts/</text>

    <rect x="240" y="70" width="80" height="28" rx="8" fill="#EEF1FF" stroke="#3B5BFD" stroke-width="1.5"/>
    <text x="280" y="88" text-anchor="middle" font-size="10" fill="#1A1F36" font-weight="700">docs/</text>

    <path d="M70 98 V112" stroke="#C7CEEB" stroke-width="2"/>
    <rect x="30" y="112" width="80" height="26" rx="8" fill="#EAFBEF" stroke="#22C55E" stroke-width="1.5"/>
    <text x="70" y="129" text-anchor="middle" font-size="9.5" fill="#1A1F36">logo.png</text>

    <path d="M175 98 V112" stroke="#C7CEEB" stroke-width="2"/>
    <rect x="135" y="112" width="80" height="26" rx="8" fill="#EAFBEF" stroke="#22C55E" stroke-width="1.5"/>
    <text x="175" y="129" text-anchor="middle" font-size="9.5" fill="#1A1F36">app.js</text>
  </svg>`;
  return el("div", { class: "svg-wrap", html: svgHTML });
}

function renderFlowchartSVG() {
  const svgHTML = `
  <svg viewBox="0 0 300 260" class="lesson-svg" role="img" aria-label="رسم توضيحي: مخطط تدفق قرار بسيط">
    <ellipse cx="150" cy="20" rx="55" ry="16" fill="#3B5BFD"/>
    <text x="150" y="25" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">بداية</text>

    <path d="M150 36 V56" stroke="#C7CEEB" stroke-width="2"/>
    <polygon points="150,56 210,90 150,124 90,90" fill="#FFF6E6" stroke="#FFB020" stroke-width="1.5"/>
    <text x="150" y="86" text-anchor="middle" font-size="9.5" fill="#1A1F36" font-weight="700">الرقم</text>
    <text x="150" y="99" text-anchor="middle" font-size="9.5" fill="#1A1F36" font-weight="700">أكبر من صفر؟</text>

    <path d="M90 90 H40 V150" stroke="#C7CEEB" stroke-width="2" fill="none"/>
    <text x="65" y="83" text-anchor="middle" font-size="9" fill="#22C55E" font-weight="700">لا</text>
    <rect x="10" y="150" width="65" height="30" rx="8" fill="#EAFBEF" stroke="#22C55E" stroke-width="1.5"/>
    <text x="42" y="169" text-anchor="middle" font-size="9.5" fill="#1A1F36">اعرض "سالب"</text>

    <path d="M210 90 H260 V150" stroke="#C7CEEB" stroke-width="2" fill="none"/>
    <text x="235" y="83" text-anchor="middle" font-size="9" fill="#22C55E" font-weight="700">نعم</text>
    <rect x="225" y="150" width="70" height="30" rx="8" fill="#EAFBEF" stroke="#22C55E" stroke-width="1.5"/>
    <text x="260" y="169" text-anchor="middle" font-size="9.5" fill="#1A1F36">اعرض "موجب"</text>

    <path d="M42 180 V210 H150 V210" stroke="#C7CEEB" stroke-width="2" fill="none"/>
    <path d="M260 180 V210 H150" stroke="#C7CEEB" stroke-width="2" fill="none"/>
    <path d="M150 210 V226" stroke="#C7CEEB" stroke-width="2"/>
    <ellipse cx="150" cy="242" rx="55" ry="16" fill="#0B1220"/>
    <text x="150" y="247" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">نهاية</text>
  </svg>`;
  return el("div", { class: "svg-wrap", html: svgHTML });
}

/* --------------------------- الاختبارات داخل الدرس --------------------------- */

function renderInlineQuiz(lesson) {
  const container = el("div", { class: "quiz-box" });
  const state = { answers: new Array(lesson.quiz.length).fill(null), submitted: false };

  function draw() {
    container.innerHTML = "";
    lesson.quiz.forEach((q, qi) => {
      const qWrap = el("div", { class: "quiz-q" });
      qWrap.appendChild(el("div", { class: "quiz-q-title" }, `${qi + 1}. ${q.q}`));
      const opts = el("div", { class: "quiz-options" });
      q.options.forEach((opt, oi) => {
        const chosen = state.answers[qi] === oi;
        let cls = "quiz-option";
        if (state.submitted) {
          if (oi === q.correct) cls += " correct";
          else if (chosen && oi !== q.correct) cls += " wrong";
        } else if (chosen) {
          cls += " selected";
        }
        opts.appendChild(
          el(
            "button",
            {
              class: cls,
              disabled: state.submitted ? "true" : null,
              onclick: () => {
                state.answers[qi] = oi;
                draw();
              }
            },
            opt
          )
        );
      });
      qWrap.appendChild(opts);
      if (state.submitted) {
        qWrap.appendChild(el("div", { class: "quiz-explain" }, `💬 ${q.explanation}`));
      }
      container.appendChild(qWrap);
    });

    if (!state.submitted) {
      const allAnswered = state.answers.every((a) => a !== null);
      container.appendChild(
        el(
          "button",
          {
            class: "btn btn-primary btn-block",
            disabled: allAnswered ? null : "true",
            onclick: () => {
              state.submitted = true;
              draw();
            }
          },
          "تصحيح الإجابات"
        )
      );
    } else {
      const correctCount = state.answers.filter((a, i) => a === lesson.quiz[i].correct).length;
      container.appendChild(
        el("div", { class: "quiz-result" }, `نتيجتك: ${correctCount} من ${lesson.quiz.length} 🎉`)
      );
    }
  }
  draw();
  return container;
}

/* --------------------------- اختبار الفصل الشامل --------------------------- */

function renderChapterQuiz(chapterId) {
  const ch = findChapter(chapterId);
  if (!ch) return el("div", { class: "empty" }, "الفصل غير موجود.");

  const questions = ch.lessons.flatMap((l) => l.quiz || []);
  if (questions.length === 0) {
    return el("div", { class: "empty-state" }, [
      el("div", { class: "empty-icon" }, "📝"),
      el("h3", null, "لا يوجد اختبار متاح بعد لهذا الفصل"),
      el("button", { class: "btn btn-primary", onclick: () => navigate(`#/chapter/${ch.id}`) }, "العودة للفصل")
    ]);
  }

  const wrap = el("div", { class: "chapter-quiz-page" });
  wrap.appendChild(el("h2", null, `اختبار: ${ch.title}`));
  wrap.appendChild(el("p", { class: "muted" }, `${questions.length} سؤال يغطي دروس هذا الفصل`));

  const box = renderInlineQuizStandalone(questions, (score) => {
    quizScores[ch.id] = { correct: score, total: questions.length };
    persist();
  });
  wrap.appendChild(box);
  return wrap;
}

function renderInlineQuizStandalone(questions, onFinish) {
  const container = el("div", { class: "quiz-box" });
  const state = { answers: new Array(questions.length).fill(null), submitted: false };

  function draw() {
    container.innerHTML = "";
    questions.forEach((q, qi) => {
      const qWrap = el("div", { class: "quiz-q" });
      qWrap.appendChild(el("div", { class: "quiz-q-title" }, `${qi + 1}. ${q.q}`));
      const opts = el("div", { class: "quiz-options" });
      q.options.forEach((opt, oi) => {
        const chosen = state.answers[qi] === oi;
        let cls = "quiz-option";
        if (state.submitted) {
          if (oi === q.correct) cls += " correct";
          else if (chosen && oi !== q.correct) cls += " wrong";
        } else if (chosen) cls += " selected";
        opts.appendChild(
          el("button", { class: cls, disabled: state.submitted ? "true" : null, onclick: () => { state.answers[qi] = oi; draw(); } }, opt)
        );
      });
      qWrap.appendChild(opts);
      if (state.submitted) qWrap.appendChild(el("div", { class: "quiz-explain" }, `💬 ${q.explanation}`));
      container.appendChild(qWrap);
    });

    if (!state.submitted) {
      const allAnswered = state.answers.every((a) => a !== null);
      container.appendChild(
        el("button", { class: "btn btn-primary btn-block", disabled: allAnswered ? null : "true", onclick: () => {
          state.submitted = true;
          const score = state.answers.filter((a, i) => a === questions[i].correct).length;
          onFinish(score);
          draw();
        } }, "إنهاء الاختبار وعرض النتيجة")
      );
    } else {
      const score = state.answers.filter((a, i) => a === questions[i].correct).length;
      container.appendChild(el("div", { class: "quiz-result-big" }, [
        el("div", { class: "quiz-result-score" }, `${score} / ${questions.length}`),
        el("div", null, score === questions.length ? "ممتاز! نتيجة كاملة 🏆" : "أحسنت، راجع الشرح أعلاه لتثبيت المعلومة 💪")
      ]));
    }
  }
  draw();
  return container;
}

/* --------------------------- البحث --------------------------- */

function renderSearch() {
  const wrap = el("div", { class: "search-page" });
  const input = el("input", {
    class: "search-input",
    type: "search",
    placeholder: "ابحث في جميع الدروس... (مثال: متغيرات، خوارزمية، Git)",
    autofocus: "true"
  });
  const results = el("div", { class: "search-results" });

  input.addEventListener("input", () => doSearch(input.value, results));
  wrap.appendChild(input);
  wrap.appendChild(results);
  setTimeout(() => input.focus(), 50);
  return wrap;
}

function doSearch(query, resultsEl) {
  resultsEl.innerHTML = "";
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    resultsEl.appendChild(el("p", { class: "muted" }, "اكتب حرفين على الأقل لبدء البحث."));
    return;
  }
  const matches = [];
  allLessons().forEach(({ chapter, lesson }) => {
    if (lesson.comingSoon) {
      if (lesson.title.toLowerCase().includes(q)) matches.push({ chapter, lesson, snippet: "درس قادم قريبًا" });
      return;
    }
    const haystacks = [lesson.title, lesson.intro, ...(lesson.sections || []).flatMap((s) => [s.heading, ...s.paragraphs])];
    const hit = haystacks.find((h) => h && h.toLowerCase().includes(q));
    if (hit) matches.push({ chapter, lesson, snippet: hit.slice(0, 90) + "…" });
  });

  if (matches.length === 0) {
    resultsEl.appendChild(el("p", { class: "muted" }, "لا توجد نتائج مطابقة."));
    return;
  }

  matches.slice(0, 30).forEach((m) => {
    resultsEl.appendChild(
      el("button", { class: "search-result", onclick: () => navigate(`#/lesson/${m.lesson.id}`) }, [
        el("div", { class: "search-result-title" }, m.lesson.title),
        el("div", { class: "search-result-chapter" }, m.chapter.title),
        el("div", { class: "search-result-snippet" }, m.snippet)
      ])
    );
  });
}

/* --------------------------- المفضلة --------------------------- */

function renderFavorites() {
  const wrap = el("div", { class: "favorites-page" });
  if (favorites.length === 0) {
    return el("div", { class: "empty-state" }, [
      el("div", { class: "empty-icon" }, "⭐"),
      el("h3", null, "لا توجد دروس مفضّلة بعد"),
      el("p", { class: "muted" }, "اضغط أيقونة النجمة داخل أي درس لإضافته هنا.")
    ]);
  }
  favorites.forEach((lessonId) => {
    const found = findLesson(lessonId);
    if (!found) return;
    wrap.appendChild(
      el("button", { class: "lesson-item", onclick: () => navigate(`#/lesson/${lessonId}`) }, [
        el("div", { class: "lesson-item-num" }, "⭐"),
        el("div", { class: "lesson-item-body" }, [
          el("div", { class: "lesson-item-title" }, found.lesson.title),
          el("div", { class: "lesson-item-sub" }, found.chapter.title)
        ])
      ])
    );
  });
  return wrap;
}

/* --------------------------- الإعدادات --------------------------- */

function renderSettings() {
  const wrap = el("div", { class: "settings-page" });

  wrap.appendChild(
    settingsRow("🌗 الوضع الليلي", el("label", { class: "switch" }, [
      el("input", {
        type: "checkbox",
        checked: settings.theme === "dark" ? "true" : null,
        onchange: (e) => {
          settings.theme = e.target.checked ? "dark" : "light";
          applySettings();
          persist();
        }
      }),
      el("span", { class: "switch-slider" })
    ]))
  );

  wrap.appendChild(
    settingsRow(
      "🔤 حجم الخط",
      el("div", { class: "font-controls" }, [
        el("button", { class: "icon-btn", onclick: () => changeFontScale(-0.1) }, "A-"),
        el("span", { class: "font-scale-val" }, `${Math.round(settings.fontScale * 100)}%`),
        el("button", { class: "icon-btn", onclick: () => changeFontScale(0.1) }, "A+")
      ])
    )
  );

  wrap.appendChild(
    el("div", { class: "card" }, [
      el("h4", { class: "section-title" }, "📊 إحصائيات التقدّم"),
      el("p", null, `الدروس المكتملة: ${progress.completedLessons.length}`),
      el("p", null, `الاختبارات المُنجزة: ${Object.keys(quizScores).length}`),
      el("p", null, `الدروس المفضّلة: ${favorites.length}`)
    ])
  );

  wrap.appendChild(renderInstagramCard());

  wrap.appendChild(
    el(
      "button",
      {
        class: "btn btn-danger btn-block",
        onclick: () => {
          if (confirm("هل أنت متأكد من إعادة ضبط كل التقدّم؟ لا يمكن التراجع عن هذا الإجراء.")) {
            progress = { completedLessons: [], lastLessonId: null };
            favorites = [];
            quizScores = {};
            persist();
            navigate("#/");
          }
        }
      },
      "🗑️ إعادة ضبط التقدّم بالكامل"
    )
  );

  return wrap;
}

function settingsRow(label, control) {
  return el("div", { class: "card settings-row" }, [el("span", null, label), control]);
}

function renderInstagramCard() {
  const igIconSVG = `
  <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FEC053"/>
        <stop offset="30%" stop-color="#F2703E"/>
        <stop offset="60%" stop-color="#DC2A7C"/>
        <stop offset="85%" stop-color="#9B36B7"/>
        <stop offset="100%" stop-color="#5C4EE5"/>
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#ig-grad)"/>
    <rect x="12" y="12" width="24" height="24" rx="7" fill="none" stroke="#fff" stroke-width="2.6"/>
    <circle cx="24" cy="24" r="6.5" fill="none" stroke="#fff" stroke-width="2.6"/>
    <circle cx="33" cy="15" r="1.8" fill="#fff"/>
  </svg>`;

  return el(
    "a",
    {
      class: "card instagram-card",
      href: INSTAGRAM_URL,
      target: "_blank",
      rel: "noopener noreferrer"
    },
    [
      el("div", { class: "ig-icon", html: igIconSVG }),
      el("div", { class: "ig-text" }, [
        el("div", { class: "ig-label" }, "تابعني على إنستغرام"),
        el("div", { class: "ig-handle" }, `@${INSTAGRAM_HANDLE}`)
      ]),
      el("span", { class: "ig-arrow" }, "←")
    ]
  );
}

function changeFontScale(delta) {
  settings.fontScale = Math.min(1.3, Math.max(0.85, +(settings.fontScale + delta).toFixed(2)));
  applySettings();
  persist();
  render();
}

function applySettings() {
  document.documentElement.setAttribute("data-theme", settings.theme);
  document.documentElement.style.setProperty("--font-scale", settings.fontScale);
}

/* --------------------------- PWA: Service Worker + تثبيت --------------------------- */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        /* فشل التسجيل - التطبيق سيعمل بدون دعم عدم الاتصال */
      });
    });
  }
}

let deferredInstallPrompt = null;
function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    hideInstallBanner();
  });
}

function showInstallBanner() {
  if (document.getElementById("install-banner")) return;
  const banner = el("div", { id: "install-banner", class: "install-banner" }, [
    el("span", null, "📲 ثبّت التطبيق على جهازك لتصفح أسرع وبدون إنترنت"),
    el("div", { class: "install-actions" }, [
      el("button", { class: "btn btn-primary btn-sm", onclick: doInstall }, "تثبيت"),
      el("button", { class: "icon-btn", onclick: hideInstallBanner }, "✕")
    ])
  ]);
  document.body.appendChild(banner);
}
function hideInstallBanner() {
  const b = document.getElementById("install-banner");
  if (b) b.remove();
}
async function doInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  hideInstallBanner();
}
