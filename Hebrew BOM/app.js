"use strict";

var DATA = null;
var currentView = { type: "title" };
var fontSize = 1.25;
var currentLang = "he";

var $ = function(id) { return document.getElementById(id); };
var content, sidebar, overlay, navContent, searchInput, searchResults, progressFill, scrollTopBtn;

var engNames = {
  "1_nephi":"1 Nephi","2_nephi":"2 Nephi","jacob":"Jacob","enos":"Enos",
  "jarom":"Jarom","omni":"Omni","words_of_mormon":"Words of Mormon",
  "mosiah":"Mosiah","alma":"Alma","helaman":"Helaman",
  "3_nephi":"3 Nephi","4_nephi":"4 Nephi","mormon":"Mormon",
  "ether":"Ether","moroni":"Moroni"
};

function bookName(book) {
  if (currentLang === "en") return engNames[book.id] || book.name;
  return book.name;
}

function toggleSidebar() { sidebar.classList.toggle("open"); overlay.classList.toggle("visible"); }
function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("visible"); }

function updateFont(d) {
  fontSize = Math.max(0.9, Math.min(2.0, fontSize + d));
  document.documentElement.style.setProperty("--fs-base", fontSize + "rem");
  localStorage.setItem("bom_fontsize", fontSize);
}

function savePosition() { localStorage.setItem("bom_position", JSON.stringify(currentView)); }

function restorePosition() {
  try {
    var pos = JSON.parse(localStorage.getItem("bom_position"));
    if (pos && pos.type === "chapter") { showChapter(pos.book, pos.chapter); return; }
    if (pos && pos.type === "fm") { showFrontMatter(pos.id); return; }
  } catch(e) {}
  showTitlePage();
}

function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function hebToNum(h) {
  var s = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9};
  var t = {'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90};
  var sp = {'טו':15,'טז':16};
  h = h.replace(/\u05F3/g,'');
  if (sp[h]) return sp[h];
  var n = 0;
  for (var i = 0; i < h.length; i++) { n += (s[h[i]] || 0) + (t[h[i]] || 0); }
  return n;
}

/* ===== INTERLINEAR PHRASE CHUNKING ===== */

function chunkHebrew(text) {
  text = text.replace(/\u05C3/g, '').trim(); // remove sof pasuq
  var words = text.split(/\s+/);
  if (words.length === 0) return [];

  var breakStarters = /^(וַ|וְ|וּ|כִּי$|אֲשֶׁר$|הִנֵּה$|לָכֵן$|לֵאמֹר$|אֶת$|גַּם$|אַךְ$|אָז$|פֶּן$|עַד$)/;
  var chunks = [];
  var i = 0;

  while (i < words.length) {
    var chunk = [words[i]];
    i++;
    var added = 0;

    while (i < words.length && added < 2) {
      var w = words[i];
      // break before conjunctions/particles if chunk already has content
      if (added >= 1 && breakStarters.test(w)) break;
      chunk.push(w);
      i++;
      added++;
    }
    chunks.push(chunk.join(' '));
  }
  return chunks;
}

function chunkEnglish(text, nChunks) {
  var words = text.split(/\s+/);
  if (nChunks <= 0 || nChunks === 1) return [text];

  var total = words.length;
  var base = Math.floor(total / nChunks);
  var extra = total % nChunks;
  var chunks = [];
  var pos = 0;

  for (var i = 0; i < nChunks; i++) {
    var size = base + (i < extra ? 1 : 0);
    chunks.push(words.slice(pos, pos + size).join(' '));
    pos += size;
  }
  return chunks;
}

/* ===== NAVIGATION ===== */

function buildNav() {
  var html = "";
  var fmLabels = {
    title:"שער",translator_intro:"מבוא המתרגם",title_page:"דף השער",
    introduction:"מבוא",three_witnesses:"עדות שלשת העדים",
    eight_witnesses:"עדות שמונה עדים",joseph_smith:"עדות יוסף סמית",
    brief_explanation:"ביאור קצר"
  };
  html += '<div class="nav-section"><div class="nav-section-title">הקדמות</div>';
  DATA.front_matter.forEach(function(fm) {
    html += '<div class="nav-fm" data-fm="' + fm.id + '">' + (fmLabels[fm.id] || fm.title) + "</div>";
  });
  html += "</div>";

  html += '<div class="nav-section"><div class="nav-section-title">ספרים</div>';
  DATA.books.forEach(function(book, bi) {
    var name = bookName(book);
    html += '<div class="nav-book" data-book="' + bi + '"><span>' + esc(name) + "</span>";
    if (book.chapters.length > 1) html += '<span class="arrow">&#9664;</span>';
    html += "</div>";
    if (book.chapters.length > 1) {
      html += '<div class="nav-chapters" data-bookch="' + bi + '">';
      book.chapters.forEach(function(ch, ci) {
        html += '<div class="nav-ch" data-book="' + bi + '" data-ch="' + ci + '">' + ch.number + "</div>";
      });
      html += "</div>";
    }
  });
  html += "</div>";
  navContent.innerHTML = html;

  navContent.querySelectorAll(".nav-fm").forEach(function(el) {
    el.onclick = function() { showFrontMatter(el.dataset.fm); closeSidebar(); };
  });
  navContent.querySelectorAll(".nav-book").forEach(function(el) {
    el.onclick = function() {
      var bi = parseInt(el.dataset.book);
      if (DATA.books[bi].chapters.length <= 1) { showChapter(bi, 0); closeSidebar(); }
      else {
        var chList = navContent.querySelector('[data-bookch="' + bi + '"]');
        chList.classList.toggle("open"); el.classList.toggle("expanded");
      }
    };
  });
  navContent.querySelectorAll(".nav-ch").forEach(function(el) {
    el.onclick = function(e) {
      e.stopPropagation();
      showChapter(parseInt(el.dataset.book), parseInt(el.dataset.ch));
      closeSidebar();
    };
  });
  updateActiveNav();
}

function updateActiveNav() {
  navContent.querySelectorAll(".active").forEach(function(el) { el.classList.remove("active"); });
  if (currentView.type === "fm") {
    var el = navContent.querySelector('[data-fm="' + currentView.id + '"]');
    if (el) el.classList.add("active");
  } else if (currentView.type === "chapter") {
    var books = navContent.querySelectorAll(".nav-book");
    if (books[currentView.book]) books[currentView.book].classList.add("active");
    var chEl = navContent.querySelector('.nav-ch[data-book="' + currentView.book + '"][data-ch="' + currentView.chapter + '"]');
    if (chEl) chEl.classList.add("active");
    var chList = navContent.querySelector('[data-bookch="' + currentView.book + '"]');
    if (chList) { chList.classList.add("open"); books[currentView.book].classList.add("expanded"); }
  }
}

/* ===== RENDERING ===== */

function showTitlePage() {
  content.innerHTML =
    '<div class="title-page">' +
    '<h1>ספר מורמון</h1>' +
    '<div class="subtitle">' + (currentLang === "en" ? "Another Testament of Jesus Christ" : "עדות אחרת ישוע המשיח") + '</div>' +
    '<div class="title-divider"></div>' +
    '<div class="translator">' + (currentLang === "en" ? "Translated into Biblical Hebrew by" : "תרגם ללשון המקרא בידי") + '</div>' +
    '<div class="translator" style="font-weight:700;font-size:1.2rem;margin-top:4px">כריס לאמב / Chris Lamb</div>' +
    '<div class="edition">מהדורה עברית ראשונה · תשפ״ו</div>' +
    '</div>' +
    '<div style="text-align:center;padding:32px 0">' +
    '<button class="ch-nav-btn" id="startBtn" style="font-size:1.1rem;padding:12px 32px">' +
    (currentLang === "en" ? "Introduction &#8594;" : "מבוא &#8592;") + '</button></div>';
  $("startBtn").onclick = function() { showFrontMatter("introduction"); };
  currentView = { type: "title" };
  window.scrollTo({ top: 0 }); savePosition();
}

function showFrontMatter(id) {
  if (id === "title") { showTitlePage(); return; }
  var fm = DATA.front_matter.find(function(f) { return f.id === id; });
  if (!fm) return;

  var html = '<div class="fm-section"><div class="fm-title">' + esc(fm.title) + "</div>";
  fm.content.forEach(function(p) {
    if (p !== fm.title) html += '<div class="fm-para">' + esc(p) + "</div>";
  });
  html += "</div>";

  var fmList = DATA.front_matter;
  var idx = fmList.findIndex(function(f) { return f.id === id; });
  html += '<div class="chapter-nav">';
  if (idx < fmList.length - 1) {
    html += '<button class="ch-nav-btn" data-action="fm-next">' + esc(fmList[idx+1].title) + " &#8592;</button>";
  } else {
    html += '<button class="ch-nav-btn" data-action="first-chapter">' + esc(bookName(DATA.books[0])) + " &#8592;</button>";
  }
  if (idx > 0) {
    html += '<button class="ch-nav-btn" data-action="fm-prev">&#8594; ' + esc(fmList[idx-1].title) + "</button>";
  }
  html += "</div>";
  content.innerHTML = html;

  var nb = content.querySelector('[data-action="fm-next"]');
  if (nb) nb.onclick = function() { showFrontMatter(fmList[idx+1].id); };
  var pb = content.querySelector('[data-action="fm-prev"]');
  if (pb) pb.onclick = function() { showFrontMatter(fmList[idx-1].id); };
  var fb = content.querySelector('[data-action="first-chapter"]');
  if (fb) fb.onclick = function() { showChapter(0, 0); };

  currentView = { type: "fm", id: id };
  updateActiveNav(); window.scrollTo({ top: 0 }); savePosition();
}

function renderVerse(v, lang) {
  var hebText = v.text || "";
  var engText = v.en || "";

  if (lang === "inter") {
    if (!hebText && !engText) return '';
    var n = hebToNum(v.num);
    var html = '<div class="verse-inter">';
    html += '<span class="verse-num-inter">' + esc(v.num) + '</span>';

    if (hebText) {
      var hebChunks = chunkHebrew(hebText);
      var engChunks = engText ? chunkEnglish(engText, hebChunks.length) : [];

      for (var i = 0; i < hebChunks.length; i++) {
        var eng = i < engChunks.length ? engChunks[i] : '';
        html += '<span class="inter-phrase">' +
          '<span class="inter-heb">' + esc(hebChunks[i]) + '</span>' +
          '<span class="inter-eng">' + esc(eng) + '</span>' +
          '</span>';
      }
    } else if (engText) {
      html += '<span class="inter-phrase"><span class="inter-heb" style="color:var(--ink-faint)">[—]</span>' +
        '<span class="inter-eng">' + esc(engText) + '</span></span>';
    }
    html += '</div>';
    return html;
  }

  if (lang === "dual") {
    var n = hebToNum(v.num);
    return '<div class="verse-dual">' +
      '<div class="verse-eng">' + (engText ? esc(engText) : '<span class="empty">[—]</span>') + '</div>' +
      '<div class="verse-center"><span class="vnum-heb">' + esc(v.num) + '</span><span class="vnum-eng">' + n + '</span></div>' +
      '<div class="verse-heb">' + (hebText ? esc(hebText) : '<span class="empty">[—]</span>') + '</div>' +
      '</div>';
  }

  var text = lang === "en" ? engText : hebText;
  if (!text) return '';
  return '<span class="verse"><span class="verse-num">' + esc(v.num) + '</span> <span class="verse-text">' + esc(text) + '</span></span>';
}

function showChapter(bookIdx, chIdx) {
  var book = DATA.books[bookIdx];
  if (!book) return;
  var ch = book.chapters[chIdx];
  if (!ch) return;
  var name = bookName(book);
  var html = "";

  if (chIdx === 0) {
    html += '<div class="book-header"><h2>' + esc(name) + "</h2>";
    if (book.header) {
      book.header.forEach(function(h) {
        if (h !== book.name) html += '<div class="book-header-text">' + esc(h) + "</div>";
      });
    }
    html += "</div>";
  }

  html += '<div class="chapter"><div class="chapter-head">';
  if (book.chapters.length > 1) {
    html += '<div class="chapter-number">' + (currentLang === "en" ? "Chapter " : "פרק ") + esc(ch.number) + "</div>";
  }
  if (ch.header) {
    ch.header.forEach(function(h) { html += '<div class="chapter-summary">' + esc(h) + "</div>"; });
  }
  html += '</div><div class="verses-block">';
  ch.verses.forEach(function(v) { html += renderVerse(v, currentLang); });
  html += "</div></div>";

  html += '<div class="chapter-nav">';
  var nextName, prevName;
  if (chIdx < book.chapters.length - 1) {
    nextName = (currentLang === "en" ? "Chapter " : "פרק ") + book.chapters[chIdx+1].number;
    html += '<button class="ch-nav-btn" data-action="next">' + esc(nextName) + " &#8592;</button>";
  } else if (bookIdx < DATA.books.length - 1) {
    nextName = bookName(DATA.books[bookIdx+1]);
    html += '<button class="ch-nav-btn" data-action="next">' + esc(nextName) + " &#8592;</button>";
  } else { html += "<span></span>"; }

  if (chIdx > 0) {
    prevName = (currentLang === "en" ? "Chapter " : "פרק ") + book.chapters[chIdx-1].number;
    html += '<button class="ch-nav-btn" data-action="prev">&#8594; ' + esc(prevName) + "</button>";
  } else if (bookIdx > 0) {
    prevName = bookName(DATA.books[bookIdx-1]);
    html += '<button class="ch-nav-btn" data-action="prev">&#8594; ' + esc(prevName) + "</button>";
  } else {
    html += '<button class="ch-nav-btn" data-action="to-fm">&#8594; ' + (currentLang === "en" ? "Introduction" : "ביאור קצר") + "</button>";
  }
  html += "</div>";
  content.innerHTML = html;

  var nb = content.querySelector('[data-action="next"]');
  if (nb) nb.onclick = function() {
    if (chIdx < book.chapters.length - 1) showChapter(bookIdx, chIdx + 1);
    else if (bookIdx < DATA.books.length - 1) showChapter(bookIdx + 1, 0);
  };
  var pb = content.querySelector('[data-action="prev"]');
  if (pb) pb.onclick = function() {
    if (chIdx > 0) showChapter(bookIdx, chIdx - 1);
    else if (bookIdx > 0) { var p = DATA.books[bookIdx-1]; showChapter(bookIdx-1, p.chapters.length-1); }
  };
  var fb = content.querySelector('[data-action="to-fm"]');
  if (fb) fb.onclick = function() { showFrontMatter("brief_explanation"); };

  currentView = { type: "chapter", book: bookIdx, chapter: chIdx };
  updateActiveNav(); window.scrollTo({ top: 0 }); savePosition();
}

/* ===== SEARCH ===== */

var searchTimeout;

function doSearch() {
  var q = searchInput.value.trim();
  if (q.length < 2) { searchResults.innerHTML = ""; return; }
  var ql = q.toLowerCase();
  var results = [];
  for (var bi = 0; bi < DATA.books.length && results.length < 30; bi++) {
    var book = DATA.books[bi];
    for (var ci = 0; ci < book.chapters.length && results.length < 30; ci++) {
      var ch = book.chapters[ci];
      for (var vi = 0; vi < ch.verses.length && results.length < 30; vi++) {
        var v = ch.verses[vi];
        if ((v.text && v.text.indexOf(q) !== -1) || (v.en && v.en.toLowerCase().indexOf(ql) !== -1)) {
          results.push({
            bi: bi, ci: ci,
            ref: book.name + " " + (book.chapters.length > 1 ? ch.number + ":" : "") + v.num,
            text: v.text || v.en || ""
          });
        }
      }
    }
  }
  if (!results.length) {
    searchResults.innerHTML = '<div style="padding:12px;color:var(--sidebar-text);opacity:0.5;font-size:0.85rem">לא נמצאו תוצאות</div>';
    return;
  }
  searchResults.innerHTML = results.map(function(r) {
    return '<div class="search-result" data-bi="' + r.bi + '" data-ci="' + r.ci + '">' +
      '<span class="sr-ref">' + esc(r.ref) + '</span>' +
      '<span class="sr-text">' + esc(r.text.substring(0, 80)) + '...</span></div>';
  }).join("");
  searchResults.querySelectorAll(".search-result").forEach(function(el) {
    el.onclick = function() { showChapter(parseInt(el.dataset.bi), parseInt(el.dataset.ci)); closeSidebar(); };
  });
}

/* ===== INIT ===== */

function init() {
  content = $("content");
  sidebar = $("sidebar");
  overlay = $("overlay");
  navContent = $("navContent");
  searchInput = $("searchInput");
  searchResults = $("searchResults");
  progressFill = $("progressFill");
  scrollTopBtn = $("scrollTop");

  // Menu
  $("menuBtn").onclick = toggleSidebar;
  overlay.onclick = closeSidebar;

  // Theme
  $("themeBtn").onclick = function() {
    var isDark = document.body.getAttribute("data-theme") === "dark";
    document.body.setAttribute("data-theme", isDark ? "" : "dark");
    localStorage.setItem("bom_theme", isDark ? "light" : "dark");
  };
  if (localStorage.getItem("bom_theme") === "dark") document.body.setAttribute("data-theme", "dark");

  // Font
  $("fontUp").onclick = function() { updateFont(0.1); };
  $("fontDown").onclick = function() { updateFont(-0.1); };
  var sf = localStorage.getItem("bom_fontsize");
  if (sf) { fontSize = parseFloat(sf); updateFont(0); }

  // Language toggle
  document.querySelectorAll(".lang-btn").forEach(function(btn) {
    btn.onclick = function() {
      document.querySelectorAll(".lang-btn").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentLang = btn.dataset.lang;
      document.documentElement.setAttribute("data-lang", currentLang);
      localStorage.setItem("bom_lang", currentLang);
      if (currentView.type === "chapter") showChapter(currentView.book, currentView.chapter);
      else if (currentView.type === "fm") showFrontMatter(currentView.id);
      else showTitlePage();
      buildNav();
    };
  });

  var savedLang = localStorage.getItem("bom_lang");
  if (savedLang) {
    currentLang = savedLang;
    document.documentElement.setAttribute("data-lang", currentLang);
    document.querySelectorAll(".lang-btn").forEach(function(b) {
      b.classList.toggle("active", b.dataset.lang === currentLang);
    });
  }

  // Progress & scroll
  window.addEventListener("scroll", function() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progressFill.style.width = (h > 0 ? (window.scrollY / h * 100) : 0) + "%";
    scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
  });
  scrollTopBtn.onclick = function() { window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Search
  searchInput.oninput = function() { clearTimeout(searchTimeout); searchTimeout = setTimeout(doSearch, 300); };

  // Keyboard
  document.addEventListener("keydown", function(e) {
    if (e.target.tagName === "INPUT") return;
    if (currentView.type !== "chapter") return;
    var book = DATA.books[currentView.book];
    if (e.key === "ArrowLeft") {
      if (currentView.chapter < book.chapters.length - 1) showChapter(currentView.book, currentView.chapter + 1);
      else if (currentView.book < DATA.books.length - 1) showChapter(currentView.book + 1, 0);
    }
    if (e.key === "ArrowRight") {
      if (currentView.chapter > 0) showChapter(currentView.book, currentView.chapter - 1);
      else if (currentView.book > 0) { var p = DATA.books[currentView.book-1]; showChapter(currentView.book-1, p.chapters.length-1); }
    }
  });

  // Load data
  fetch("data.json")
    .then(function(r) { return r.json(); })
    .then(function(d) {
      DATA = d;
      buildNav();
      restorePosition();
    })
    .catch(function(err) {
      content.innerHTML = '<div class="loading" style="color:red">Error loading data: ' + err.message + '</div>';
    });
}

document.addEventListener("DOMContentLoaded", init);
