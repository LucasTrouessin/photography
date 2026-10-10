(function () {
  const pad = n => String(n).padStart(2, "0");
  const el = (tag, attrs = {}, kids = []) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    kids.forEach(c => e.appendChild(c));
    return e;
  };
  const path = (p, file) => `${p.folder}/${file}`;
  const cover = p => p.cover || p.photos[0];

  /* ---------- ACCUEIL ---------- */
  function renderHome(data) {
    const wrap = document.getElementById("categories");
    data.categories.forEach(cat => {
      const list = cat.projects;
      if (!list.length) return;
      const grid = el("div", { class: "project-grid" });
      list.forEach(p => {
        const box = el("div", { class: "project-image placeholder" }, [el("span", { text: p.title.toUpperCase() })]);
        const img = new Image();
        img.alt = p.title;
        img.onload = () => { box.className = "project-image"; box.replaceChildren(img); };
        if (cover(p)) img.src = path(p, cover(p));
        grid.appendChild(el("a", { class: "project", href: `project.html?p=${encodeURIComponent(p.slug)}` }, [
          box,
          el("div", {}, [el("strong", { text: p.title })])
        ]));
      });
      wrap.appendChild(el("section", { class: "category", id: cat.id }, [
        el("div", { class: "category-title" }, [
          el("h3", { text: cat.label })
        ]),
        grid
      ]));
    });
  }

  /* ---------- PAGE PROJET ---------- */
  function renderProject(data) {
    const slug = new URLSearchParams(location.search).get("p");
    let cat = null, p = null;
    data.categories.forEach(c => c.projects.forEach(x => { if (x.slug === slug) { cat = c; p = x; } }));
    const head = document.getElementById("head");
    const gal = document.getElementById("gallery");
    if (!p) {
      head.appendChild(el("h1", { text: "Project not found" }));
      return;
    }
    document.title = `${p.title} — ${(data.site && data.site.name) || "Lucas Trouessin"}`;
    head.appendChild(el("span", { class: "kicker", text: cat.label }));
    head.appendChild(el("h1", { text: p.title }));
    if (p.description) head.appendChild(el("p", { text: p.description }));

    const list = p.photos;
    if (!list.length) gal.appendChild(el("p", { class: "empty", text: "No photos yet." }));
    const loaded = [];           // urls réellement chargées
    let failed = 0;
    list.forEach((f, i) => {
      const fig = el("figure");
      const img = new Image();
      img.alt = `${p.title} — photo ${i + 1}`;
      img.loading = "lazy";
      img.tabIndex = 0;
      img.onload = () => { loaded.push(img); };
      img.onerror = () => {
        fig.remove();
        if (++failed === list.length) {
          gal.appendChild(el("p", { class: "empty", text: `No photos yet — add them to ${p.folder}/` }));
        }
      };
      img.src = path(p, f);
      const open = () => openLightbox(gal.querySelectorAll("img"), img);
      img.addEventListener("click", open);
      img.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
      fig.appendChild(img);
      gal.appendChild(fig);
    });

    // projet précédent / suivant dans la même catégorie
    const sib = cat.projects, idx = sib.findIndex(x => x.slug === p.slug);
    const pager = document.getElementById("pager");
    const link = (q, label) => el("a", { href: `project.html?p=${encodeURIComponent(q.slug)}`, text: label });
    pager.appendChild(idx > 0 ? link(sib[idx - 1], `← ${sib[idx - 1].title}`) : el("a", { href: "index.html#" + cat.id, text: "← Back" }));
    pager.appendChild(idx < sib.length - 1 ? link(sib[idx + 1], `${sib[idx + 1].title} →`) : el("span"));
  }

  /* ---------- LIGHTBOX ---------- */
  let lb, lbImg, lbCount, imgs = [], cur = 0, touchX = null;
  function buildLightbox() {
    lbImg = el("img", { alt: "" });
    lbCount = el("span", { class: "count" });
    const mk = (cls, label, txt, fn) => { const b = el("button", { class: cls, "aria-label": label, text: txt }); b.onclick = fn; return b; };
    lb = el("div", { class: "lb", role: "dialog", "aria-modal": "true", "aria-label": "Photo viewer" }, [
      lbImg, lbCount,
      mk("x", "Close", "Close", closeLb), mk("prev", "Previous photo", "Prev", () => go(-1)), mk("next", "Next photo", "Next", () => go(1))
    ]);
    // Clic sur la photo : photo suivante (s'arrête à la dernière). Le fond blanc ne ferme rien.
    lbImg.addEventListener("click", () => go(1));
    lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      touchX = null;
    });
    document.body.appendChild(lb);
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    });
  }
  function show() {
    lbImg.src = imgs[cur].currentSrc || imgs[cur].src;
    lbImg.alt = imgs[cur].alt;
    lbCount.textContent = `${pad(cur + 1)} / ${pad(imgs.length)}`;
    lbImg.style.cursor = cur === imgs.length - 1 ? "default" : "pointer";
    lb.querySelector(".prev").style.visibility = cur === 0 ? "hidden" : "visible";
    lb.querySelector(".next").style.visibility = cur === imgs.length - 1 ? "hidden" : "visible";
  }
  function go(d) {
    const n = cur + d;
    if (n < 0 || n >= imgs.length) return;   // pas de boucle : on s'arrête aux extrémités
    cur = n; show();
  }
  function openLightbox(nodes, img) {
    if (!lb) buildLightbox();
    imgs = Array.from(nodes); cur = imgs.indexOf(img);
    show(); lb.classList.add("open"); document.body.style.overflow = "hidden";
    lb.querySelector(".x").focus();
  }
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; }

  /* ---------- À PROPOS (texte + email) ---------- */
  function renderAbout(data) {
    const a = data.about || {};
    const p = document.querySelector(".about p");
    const c = document.querySelector("a.contact");
    if (p && a.text) p.textContent = a.text;
    if (c && a.email) {
      c.href = `mailto:${a.email}`;
      c.textContent = `${a.email} ↗`;
    }
  }

  /* ---------- CHARGEMENT DES DONNÉES (site.json) ---------- */
  const page = document.body.dataset.page;
  fetch("site.json", { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      if (page === "home") { renderHome(data); renderAbout(data); }
      if (page === "project") renderProject(data);
    })
    .catch(err => {
      console.error("Impossible de charger site.json", err);
      const m = document.querySelector("main");
      if (m) m.appendChild(el("p", { class: "empty", text: "Unable to load the content." }));
    });

  /* ---------- ANNÉE DU COPYRIGHT ---------- */
  const year = document.getElementById("current-year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- PROTECTION DES PHOTOS ----------
     Délégation d'événements : fonctionne aussi pour les images
     créées après le chargement de la page (galeries, lightbox). */
  document.addEventListener("contextmenu", e => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });
  document.addEventListener("dragstart", e => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });
})();
