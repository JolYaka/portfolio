/* ============================================================
   Portfolio Génie Électrique
   Données + rendu + mode édition protégé par code
   100% client-side (localStorage). Aucune dépendance.
   ============================================================ */

const STORAGE_KEY = "portfolio_data_v1";
const CODE_KEY = "portfolio_code_v1";
const DEFAULT_CODE = "1234"; // ⚠️ à changer dès la première connexion

/* ============================================================
   Supabase — stockage en ligne (édition visible par tous)
   Remplace les deux valeurs ci-dessous par celles de ton projet
   (Supabase Dashboard > Settings > API).
   La clé "anon" est PUBLIQUE : sans droit d'écriture (RLS), elle ne
   permet que la lecture + l'appel des fonctions serveur.
   ============================================================ */
const SUPABASE_URL = "https://uwwxbzshxarihscajjfa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d3hienNoeGFyaWhzY2FqamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTE4NTksImV4cCI6MjA5OTQyNzg1OX0.dzgkqQcV0QpVpEH6DgqqSALdLo1OwhzpJ4Q2UiZlys0";

// Activé seulement si les valeurs ci-dessus ont bien été remplacées.
const SB_ENABLED =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) &&
  !SUPABASE_ANON_KEY.startsWith("VOTRE_");

// Code vérifié en mémoire pendant une session d'édition (jamais stocké).
let sessionCode = null;

const sbHeaders = () => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
});

// Appel d'une fonction serveur (RPC).
async function sbRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  return text ? JSON.parse(text) : null;
}

// Lecture du contenu en ligne (renvoie l'objet data, ou null).
async function sbFetchData() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/portfolio?id=eq.1&select=data`,
    { headers: sbHeaders() }
  );
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0]?.data ?? null;
}

/* ---------- Données par défaut (le bénéficiaire les modifie) ---------- */
const DEFAULT_DATA = {
  name: "Prénom Nom",
  role: "Étudiant en Génie Électrique",
  tagline: "",
  location: "Mahdia, Tunisie",
  email: "prenom.nom@email.com",
  phone: "+216 00 000 000",
  linkedin: "",
  github: "",
  about: [
    "Étudiant en troisième année de génie électrique, je m'intéresse à la conception de circuits, à l'électrotechnique et aux systèmes embarqués. J'aime comprendre comment l'énergie est produite, transformée et maîtrisée.",
    "Curieux et rigoureux, je consacre mon temps libre à des projets concrets : montages électroniques, programmation de microcontrôleurs et petites automatisations.",
  ],
  facts: [
    { k: "Niveau", v: "Licence 3 Génie Électrique" },
    { k: "École", v: "ISET Mahdia" },
    { k: "Disponibilité", v: "Ouvert aux stages" },
  ],
  skills: [],
  projects: [],
  stages: [],
  parcours: [],
};

/* ---------- État ---------- */
let state = load();
let editing = false;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    return { ...structuredClone(DEFAULT_DATA), ...JSON.parse(raw) };
  } catch (e) {
    return structuredClone(DEFAULT_DATA);
  }
}
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function getCode() {
  return localStorage.getItem(CODE_KEY) || DEFAULT_CODE;
}
function setCode(c) {
  localStorage.setItem(CODE_KEY, c);
}

/* ---------- Helpers DOM ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

/* Texte éditable lié à l'état. `set` reçoit la nouvelle valeur. */
function editText({ tag = "span", value, set, ph = "Texte…", cls = "", multiline = false }) {
  const node = el(tag, { class: cls, "data-edit": true, "data-ph": ph });
  node.textContent = value || "";
  if (!value) node.setAttribute("data-empty", "");
  if (editing) {
    node.setAttribute("contenteditable", "plaintext-only");
    // repli si plaintext-only non supporté
    if (node.contentEditable !== "plaintext-only") node.setAttribute("contenteditable", "true");
    node.addEventListener("input", () => {
      const txt = node.innerText.replace(/\n+$/, "");
      if (txt) node.removeAttribute("data-empty");
      else node.setAttribute("data-empty", "");
      set(txt);
      persist();
    });
    if (!multiline) {
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.preventDefault();
      });
    }
  }
  return node;
}

/* ============================================================
   RENDU
   ============================================================ */
function render() {
  const app = $("#app");
  app.innerHTML = "";
  document.body.classList.toggle("editing", editing);

  app.append(
    heroSection(),
    aboutSection(),
    skillsSection(),
    projectsSection(),
    stagesSection(),
    parcoursSection(),
    contactSection()
  );

  // brand + footer name
  $$('[data-bind="name"]').forEach((n) => (n.textContent = state.name || "Portfolio"));
}

function heroSection() {
  const s = el("section", { class: "hero", id: "top" });
  s.append(
    editText({ tag: "p", cls: "hero__role", value: state.role, ph: "Votre rôle", set: (v) => (state.role = v) }),
    editText({ tag: "h1", cls: "hero__name", value: state.name, ph: "Votre nom", set: (v) => (state.name = v) }),
    editText({
      tag: "p",
      cls: "hero__tagline",
      value: state.tagline,
      ph: "Une phrase qui vous présente…",
      multiline: true,
      set: (v) => (state.tagline = v),
    })
  );

  const meta = el("div", { class: "hero__meta" });
  meta.append(
    editText({ value: state.location, ph: "Ville", set: (v) => (state.location = v) }),
    el("span", { class: "dot" }),
    editText({ value: state.email, ph: "Email", set: (v) => (state.email = v) })
  );
  s.append(meta);

  const cta = el("div", { class: "hero__cta" });
  cta.append(
    el("a", { class: "btn btn--primary", href: "#contact" }, "Me contacter"),
    el("a", { class: "btn", href: "#projects" }, "Voir mes projets")
  );
  s.append(cta);
  return s;
}

function aboutSection() {
  const s = el("section", { class: "section", id: "about" });
  s.append(el("span", { class: "section__label" }, "À propos"));
  s.append(el("h2", { class: "section__title" }, "Quelques mots sur moi"));

  const grid = el("div", { class: "about__grid" });
  const text = el("div", { class: "about__text" });
  state.about.forEach((p, i) =>
    text.append(
      editText({ tag: "p", value: p, ph: "Paragraphe de présentation…", multiline: true, set: (v) => (state.about[i] = v) })
    )
  );
  grid.append(text);

  const facts = el("div", { class: "about__facts" });
  state.facts.forEach((f, i) => {
    const row = el("div", { class: "fact" });
    row.append(
      editText({ cls: "fact__k", value: f.k, ph: "Libellé", set: (v) => (state.facts[i].k = v) }),
      editText({ cls: "fact__v", value: f.v, ph: "Valeur", set: (v) => (state.facts[i].v = v) })
    );
    facts.append(row);
  });
  grid.append(facts);
  s.append(grid);
  return s;
}

function skillsSection() {
  const s = el("section", { class: "section", id: "skills" });
  s.append(el("span", { class: "section__label" }, "Compétences"));
  s.append(el("h2", { class: "section__title" }, "Ce que je maîtrise"));

  const chips = el("div", { class: "chips" });
  state.skills.forEach((sk, i) => {
    const chip = el("span", { class: "chip" });
    chip.append(
      editText({ value: sk, ph: "Compétence", set: (v) => (state.skills[i] = v) }),
      el("button", {
        class: "chip__rm",
        title: "Supprimer",
        onclick: () => {
          state.skills.splice(i, 1);
          persist();
          render();
        },
      }, "×")
    );
    chips.append(chip);
  });
  if (!editing && state.skills.length === 0) {
    chips.append(el("p", { style: "color:var(--muted);font-size:.96rem;" }, "Compétences à venir."));
  }
  s.append(chips);
  s.append(addButton("+ Ajouter une compétence", () => {
    state.skills.push("Nouvelle compétence");
    persist();
    render();
  }));
  return s;
}

function projectsSection() {
  const s = el("section", { class: "section", id: "projects" });
  s.append(el("span", { class: "section__label" }, "Projets"));
  s.append(el("h2", { class: "section__title" }, "Réalisations & projets"));

  const grid = el("div", { class: "projects__grid" });
  state.projects.forEach((p, i) => {
    const card = el("article", { class: "card" });
    card.append(
      el("button", {
        class: "card__rm", title: "Supprimer le projet",
        onclick: () => { state.projects.splice(i, 1); persist(); render(); },
      }, "×"),
      editText({ tag: "h3", cls: "card__title", value: p.title, ph: "Titre du projet", set: (v) => (state.projects[i].title = v) }),
      editText({ tag: "p", cls: "card__desc", value: p.desc, ph: "Description…", multiline: true, set: (v) => (state.projects[i].desc = v) })
    );

    const tags = el("div", { class: "card__tags" });
    (p.tags || []).forEach((t, ti) => {
      const tag = el("span", { class: "tag" });
      tag.append(editText({ value: t, ph: "tag", set: (v) => (state.projects[i].tags[ti] = v) }));
      if (editing) {
        tag.append(el("button", {
          class: "chip__rm",
          onclick: () => { state.projects[i].tags.splice(ti, 1); persist(); render(); },
        }, "×"));
      }
      tags.append(tag);
    });
    if (editing) {
      tags.append(el("button", {
        class: "add-btn", style: "margin-top:0;padding:4px 12px;font-size:.76rem;",
        onclick: () => { (state.projects[i].tags ||= []).push("tag"); persist(); render(); },
      }, "+ tag"));
    }
    card.append(tags);

    // Lien : visible si renseigné, éditable en mode édition
    if (editing) {
      const linkWrap = el("div", { class: "card__link" });
      linkWrap.append(
        "🔗 ",
        editText({ value: p.link, ph: "https://lien-du-projet (optionnel)", set: (v) => (state.projects[i].link = v) })
      );
      card.append(linkWrap);
    } else if (p.link) {
      card.append(el("a", { class: "card__link", href: p.link, target: "_blank", rel: "noopener" }, "Voir le projet →"));
    }

    grid.append(card);
  });
  if (!editing && state.projects.length === 0) {
    grid.append(el("p", { style: "color:var(--muted);font-size:.96rem;" }, "Projets à venir."));
  }
  s.append(grid);
  s.append(addButton("+ Ajouter un projet", () => {
    state.projects.push({ title: "Nouveau projet", desc: "Description du projet.", tags: ["tag"], link: "" });
    persist();
    render();
  }));
  return s;
}

function stagesSection() {
  const s = el("section", { class: "section", id: "stages" });
  s.append(el("span", { class: "section__label" }, "Stages"));
  s.append(el("h2", { class: "section__title" }, "Stages & expériences"));

  const tl = el("div", { class: "timeline" });
  state.stages.forEach((it, i) => {
    const item = el("div", { class: "item" });
    item.append(
      el("button", {
        class: "item__rm", title: "Supprimer",
        onclick: () => { state.stages.splice(i, 1); persist(); render(); },
      }, "×"),
      editText({ cls: "item__period", value: it.period, ph: "Période", set: (v) => (state.stages[i].period = v) })
    );
    const body = el("div");
    body.append(
      editText({ tag: "div", cls: "item__title", value: it.title, ph: "Poste / mission", set: (v) => (state.stages[i].title = v) }),
      editText({ tag: "div", cls: "item__place", value: it.place, ph: "Entreprise / organisme", set: (v) => (state.stages[i].place = v) }),
      editText({ tag: "div", cls: "item__detail", value: it.detail, ph: "Ce que j'y ai fait…", multiline: true, set: (v) => (state.stages[i].detail = v) })
    );
    item.append(body);
    tl.append(item);
  });
  if (!editing && state.stages.length === 0) {
    tl.append(el("p", { style: "color:var(--muted);font-size:.96rem;" }, "Stages à venir."));
  }
  s.append(tl);
  s.append(addButton("+ Ajouter un stage", () => {
    state.stages.push({ period: "Année", title: "Poste / mission", place: "Entreprise", detail: "Description du stage." });
    persist();
    render();
  }));
  return s;
}

function parcoursSection() {
  const s = el("section", { class: "section", id: "parcours" });
  s.append(el("span", { class: "section__label" }, "Parcours"));
  s.append(el("h2", { class: "section__title" }, "Formation académique"));

  const tl = el("div", { class: "timeline" });
  state.parcours.forEach((it, i) => {
    const item = el("div", { class: "item" });
    item.append(
      el("button", {
        class: "item__rm", title: "Supprimer",
        onclick: () => { state.parcours.splice(i, 1); persist(); render(); },
      }, "×"),
      editText({ cls: "item__period", value: it.period, ph: "Période", set: (v) => (state.parcours[i].period = v) })
    );
    const body = el("div");
    body.append(
      editText({ tag: "div", cls: "item__title", value: it.title, ph: "Diplôme / intitulé", set: (v) => (state.parcours[i].title = v) }),
      editText({ tag: "div", cls: "item__place", value: it.place, ph: "Établissement", set: (v) => (state.parcours[i].place = v) }),
      editText({ tag: "div", cls: "item__detail", value: it.detail, ph: "Détails…", multiline: true, set: (v) => (state.parcours[i].detail = v) })
    );
    item.append(body);
    tl.append(item);
  });
  if (!editing && state.parcours.length === 0) {
    tl.append(el("p", { style: "color:var(--muted);font-size:.96rem;" }, "Formation à venir."));
  }
  s.append(tl);
  s.append(addButton("+ Ajouter une étape", () => {
    state.parcours.push({ period: "Année", title: "Diplôme / intitulé", place: "Établissement", detail: "Détails." });
    persist();
    render();
  }));
  return s;
}

function contactSection() {
  const s = el("section", { class: "section", id: "contact" });
  s.append(el("span", { class: "section__label" }, "Contact"));
  s.append(el("h2", { class: "section__title" }, "Prenons contact"));

  const row = el("div", { class: "contact__row" });
  const links = [
    { key: "email", ph: "Email", href: (v) => `mailto:${v}` },
    { key: "phone", ph: "Téléphone", href: (v) => `tel:${v.replace(/\s/g, "")}` },
    { key: "linkedin", ph: "URL LinkedIn", href: (v) => v },
    { key: "github", ph: "URL GitHub", href: (v) => v },
  ];
  links.forEach((l) => {
    const icon = () => el("span", { class: "ico", html: ICONS[l.key] });
    if (editing) {
      const wrap = el("div", { class: "contact__link" });
      wrap.append(icon(), editText({ value: state[l.key], ph: l.ph, set: (v) => (state[l.key] = v) }));
      row.append(wrap);
    } else if (state[l.key]) {
      const isMail = l.key === "email" || l.key === "phone";
      row.append(
        el(
          "a",
          { class: "contact__link", href: l.href(state[l.key]), target: isMail ? null : "_blank", rel: "noopener" },
          icon(),
          el("span", {}, state[l.key])
        )
      );
    }
  });
  s.append(row);
  return s;
}

/* Logos officiels (SVG inline, héritent de la couleur du texte) */
const ICONS = {
  email:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>',
  phone:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"></path></svg>',
  github:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"></path></svg>',
};

function addButton(label, onClick) {
  const b = el("button", { class: "add-btn", onclick: onClick }, label);
  if (!editing) b.hidden = true;
  return b;
}

/* ============================================================
   MODE ÉDITION : verrouillage, modales, actions
   ============================================================ */
function toast(msg) {
  const t = $("#toast");
  t.hidden = false;
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => (t.hidden = true), 300);
  }, 2200);
}

function openModal(id) {
  $("#" + id).hidden = false;
}
function closeModal(id) {
  $("#" + id).hidden = true;
}

function enterEditMode() {
  editing = true;
  $("#lockBtn").classList.add("is-active");
  $("#toolbar").hidden = false;
  render();
  toast("Mode édition activé");
}
function exitEditMode() {
  editing = false;
  sessionCode = null; // on oublie le code en sortant
  persist();
  $("#lockBtn").classList.remove("is-active");
  $("#toolbar").hidden = true;
  render();
}

/* Enregistrer = publier en ligne (visible par tous). */
async function saveRemote() {
  persist(); // cache local d'abord
  if (!SB_ENABLED) { toast("Enregistré localement (en ligne non configuré)"); return; }
  const btn = $('#toolbar [data-action="save"]');
  if (btn) btn.disabled = true;
  try {
    await sbRpc("save_portfolio", { p_code: sessionCode, p_data: state });
    toast("Publié en ligne ✓");
  } catch (e) {
    toast("Échec de publication. Vérifie ta connexion.");
    console.warn(e);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* Bouton cadenas */
$("#lockBtn").addEventListener("click", () => {
  if (editing) {
    exitEditMode();
  } else {
    $("#codeInput").value = "";
    $("#codeError").hidden = true;
    openModal("codeModal");
    setTimeout(() => $("#codeInput").focus(), 50);
  }
});

/* Soumission du code */
async function trySubmitCode() {
  const val = $("#codeInput").value.trim();
  const err = $("#codeError");

  // Mode local (Supabase non configuré) : comparaison locale.
  if (!SB_ENABLED) {
    if (val === getCode()) { closeModal("codeModal"); enterEditMode(); }
    else { err.textContent = "Code incorrect."; err.hidden = false; }
    return;
  }

  // Mode en ligne : vérification côté serveur.
  const btn = $("#codeSubmit");
  btn.disabled = true;
  err.hidden = true;
  try {
    const ok = await sbRpc("verify_portfolio_code", { p_code: val });
    if (ok === true) {
      sessionCode = val; // gardé en mémoire pour les enregistrements
      closeModal("codeModal");
      enterEditMode();
    } else {
      err.textContent = "Code incorrect.";
      err.hidden = false;
    }
  } catch (e) {
    err.textContent = "Erreur de connexion. Réessaie.";
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
}
$("#codeSubmit").addEventListener("click", trySubmitCode);
$("#codeInput").addEventListener("keydown", (e) => { if (e.key === "Enter") trySubmitCode(); });

/* Fermeture des modales (boutons [data-close] + clic fond) */
$$("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest(".modal").hidden = true));
$$(".modal").forEach((m) =>
  m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; })
);

/* Barre d'outils */
$("#toolbar").addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "save") { saveRemote(); }
  else if (action === "exit") { exitEditMode(); }
  else if (action === "export") { exportData(); }
  else if (action === "import") { $("#importFile").click(); }
  else if (action === "code") { openChangeCode(); }
  else if (action === "reset") { resetData(); }
});

/* Export JSON */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "portfolio-data.json" });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Fichier exporté");
}

/* Import JSON */
$("#importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state = { ...structuredClone(DEFAULT_DATA), ...data };
      persist();
      render();
      toast("Contenu importé ✓");
    } catch (err) {
      toast("Fichier invalide");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

/* Réinitialisation */
function resetData() {
  if (!confirm("Réinitialiser tout le contenu aux valeurs par défaut ? Cette action est irréversible.")) return;
  state = structuredClone(DEFAULT_DATA);
  persist();
  render();
  toast("Contenu réinitialisé");
}

/* Changement de code */
function openChangeCode() {
  $("#newCode1").value = "";
  $("#newCode2").value = "";
  $("#changeCodeError").hidden = true;
  openModal("changeCodeModal");
  setTimeout(() => $("#newCode1").focus(), 50);
}
$("#changeCodeSubmit").addEventListener("click", async () => {
  const a = $("#newCode1").value.trim();
  const b = $("#newCode2").value.trim();
  const err = $("#changeCodeError");
  if (a.length < 4) { err.textContent = "Le code doit faire au moins 4 caractères."; err.hidden = false; return; }
  if (a !== b) { err.textContent = "Les deux codes ne correspondent pas."; err.hidden = false; return; }

  // Mode local
  if (!SB_ENABLED) {
    setCode(a);
    closeModal("changeCodeModal");
    toast("Code modifié ✓");
    return;
  }

  // Mode en ligne : changement côté serveur (vérifie l'ancien code).
  const btn = $("#changeCodeSubmit");
  btn.disabled = true;
  err.hidden = true;
  try {
    await sbRpc("change_portfolio_code", { p_old: sessionCode, p_new: a });
    sessionCode = a; // on continue la session avec le nouveau code
    closeModal("changeCodeModal");
    toast("Code modifié ✓");
  } catch (e) {
    err.textContent = "Impossible de changer le code. Réessaie.";
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Init ---------- */
$("#year").textContent = new Date().getFullYear();
render(); // affichage immédiat (contenu local/par défaut)
initRemote(); // puis on récupère la dernière version en ligne

async function initRemote() {
  if (!SB_ENABLED) return; // Supabase non configuré : mode 100% local
  try {
    const remote = await sbFetchData();
    if (remote && Object.keys(remote).length) {
      state = { ...structuredClone(DEFAULT_DATA), ...remote };
      persist(); // cache local
      if (!editing) render();
    }
  } catch (e) {
    console.warn("Supabase indisponible : contenu local utilisé.", e);
  }
}
