/* ──────────────────────────────────────────────
   SecureAuth — Shared Frontend Logic
   ────────────────────────────────────────────── */

/* Force scroll to top on every page load / navigation */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

/* ═══════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════ */
let _toastRoot = null;

function _getToastRoot() {
  if (_toastRoot) return _toastRoot;
  _toastRoot = document.createElement("div");
  _toastRoot.style.cssText =
    "position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;max-width:360px;pointer-events:none;";
  document.body.appendChild(_toastRoot);
  return _toastRoot;
}

function showToast(message, type = "info", duration = 4000) {
  const root = _getToastRoot();
  const palette = {
    success: { icon: "fa-circle-check",        color: "#10b981" },
    error:   { icon: "fa-circle-xmark",        color: "#ef4444" },
    warning: { icon: "fa-triangle-exclamation",color: "#f59e0b" },
    info:    { icon: "fa-circle-info",         color: "#3b82f6" },
  };
  const { icon, color } = palette[type] || palette.info;
  const id = "t" + Date.now() + Math.floor(Math.random() * 9999);

  const wrap = document.createElement("div");
  wrap.id = id;
  wrap.style.cssText =
    "pointer-events:auto;animation:toastIn 0.3s cubic-bezier(0.4,0,0.2,1) forwards;";

  wrap.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:11px;background:#fff;border-radius:10px;
                padding:13px 13px 22px 13px;border-left:4px solid ${color};
                box-shadow:0 4px 24px rgba(0,0,0,0.13);position:relative;overflow:hidden;min-width:270px;">
      <i class="fas ${icon}" style="color:${color};font-size:1.05rem;flex-shrink:0;margin-top:1px;"></i>
      <p style="flex:1;font-size:0.875rem;font-weight:500;color:#1e293b;line-height:1.45;margin:0;word-break:break-word;">${message}</p>
      <button onclick="document.getElementById('${id}')?.remove()"
              style="background:none;border:none;cursor:pointer;font-size:1.15rem;color:#94a3b8;
                     line-height:1;padding:1px 2px;flex-shrink:0;transition:color .15s;">×</button>
      <div style="position:absolute;bottom:0;left:0;height:3px;background:${color};
                  width:100%;transform-origin:left;animation:toastProg ${duration}ms linear forwards;"></div>
    </div>`;

  root.appendChild(wrap);
  setTimeout(() => {
    if (!document.getElementById(id)) return;
    wrap.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => wrap.remove(), 300);
  }, duration);
}


/* ═══════════════════════════════════════════
   API HELPER
   ═══════════════════════════════════════════ */
async function api(method, url, data) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  };
  const res = await fetch(url, opts);
  const json = await res.json();

  if (json && json.code === "ACCOUNT_DISABLED") {
    showToast("Your account has been disabled. Logging you out…", "error", 3500);
    setTimeout(async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/login";
    }, 3000);
  }
  return json;
}


/* ═══════════════════════════════════════════
   AUTH STATE
   ═══════════════════════════════════════════ */
let currentUser = null;

async function checkAuthStatus() {
  try {
    const data = await api("GET", "/api/auth/me");
    if (data && data.success) { currentUser = data.user; return data.user; }
    return null;
  } catch { return null; }
}

async function requireAuth() {
  const user = await checkAuthStatus();
  if (!user) { window.location.href = "/login"; return null; }
  return user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.role !== "admin") { window.location.href = "/"; return null; }
  return user;
}

async function redirectIfLoggedIn(to = "/") {
  try {
    const data = await api("GET", "/api/auth/me");
    if (data && data.success) window.location.href = to;
  } catch {}
}


/* ═══════════════════════════════════════════
   AVATAR HELPER  — load circular avatar into elements
   ═══════════════════════════════════════════ */
function loadAvatar(userId, imgEl, iconEl) {
  if (!userId || !imgEl) return;
  const src = `/api/auth/avatar/${userId}?t=${Date.now()}`;
  const probe = new Image();
  probe.src = src;
  probe.onload = () => {
    imgEl.src = src;
    imgEl.classList.remove("hidden");
    if (iconEl) iconEl.classList.add("hidden");
  };
}


/* ═══════════════════════════════════════════
   HEADER & SIDEBAR POPULATION
   ═══════════════════════════════════════════ */
function populateHeader(user) {
  currentUser = user;

  document.getElementById("auth-links")?.classList.remove("hidden");
  document.getElementById("guest-links")?.classList.add("hidden");
  document.getElementById("sidebar-user")?.classList.remove("hidden");
  document.getElementById("sidebar-guest")?.classList.add("hidden");

  const hName   = document.getElementById("header-username");
  const sbName  = document.getElementById("sidebar-username");
  const sbEmail = document.getElementById("sidebar-email");
  if (hName)   hName.textContent  = user.username;
  if (sbName)  sbName.textContent  = user.username;
  if (sbEmail) sbEmail.textContent = user.email;

  // Swap Home → Dashboard in nav
  document.querySelectorAll(".nav-home").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".nav-dashboard").forEach(el => el.classList.remove("hidden"));

  // Show Profile link in mobile sidebar (hidden for guests)
  const sbProfile = document.getElementById("sidebar-profile-link");
  if (sbProfile) sbProfile.style.display = "flex";

  if (user.role === "admin") {
    document.getElementById("admin-nav-link")?.style && (document.getElementById("admin-nav-link").style.display = "block");
    document.getElementById("admin-dropdown-link")?.style && (document.getElementById("admin-dropdown-link").style.display = "flex");
    document.getElementById("sidebar-admin-link")?.style && (document.getElementById("sidebar-admin-link").style.display = "flex");
  }

  // Header + sidebar avatars
  loadAvatar(
    user._id,
    document.getElementById("header-avatar"),
    document.getElementById("header-user-icon")
  );
  loadAvatar(
    user._id,
    document.getElementById("sidebar-avatar"),
    document.getElementById("sidebar-user-icon")
  );

  setActiveNav();
  startTokenRefresh();
}


/* ═══════════════════════════════════════════
   TOKEN AUTO-REFRESH  (every 14 min)
   ═══════════════════════════════════════════ */
let _refreshTimer = null;

function startTokenRefresh() {
  clearInterval(_refreshTimer);
  _refreshTimer = setInterval(async () => {
    try {
      const data = await fetch("/api/auth/refresh", {
        method: "POST", credentials: "include",
      }).then(r => r.json());
      if (!data.success) {
        clearInterval(_refreshTimer);
        showToast("Session expired. Please log in again.", "warning");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } catch {}
  }, 14 * 60 * 1000);
}


/* ═══════════════════════════════════════════
   ACTIVE NAV HIGHLIGHT
   ═══════════════════════════════════════════ */
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    const active = path === href || (href.length > 1 && path.startsWith(href));
    if (active) {
      link.classList.add("text-blue-600", "bg-blue-50");
      link.classList.remove("text-gray-600");
    }
  });
}


/* ═══════════════════════════════════════════
   SIDEBAR  (slides from TOP)
   ═══════════════════════════════════════════ */
function initSidebar() {
  const hamburger = document.getElementById("hamburger");
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebar-overlay");
  const closeBtn  = document.getElementById("sidebar-close");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("-translate-y-full");
    sidebar.classList.add("translate-y-0");
    if (overlay) {
      overlay.classList.remove("hidden");
      requestAnimationFrame(() => overlay.classList.add("opacity-100"));
    }
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("-translate-y-full");
    sidebar.classList.remove("translate-y-0");
    if (overlay) {
      overlay.classList.remove("opacity-100");
      setTimeout(() => overlay.classList.add("hidden"), 300);
    }
    document.body.style.overflow = "";
  }

  hamburger?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);
}


/* ═══════════════════════════════════════════
   USER DROPDOWN
   ═══════════════════════════════════════════ */
function initUserDropdown() {
  const btn      = document.getElementById("user-menu-btn");
  const dropdown = document.getElementById("user-dropdown");
  if (!btn || !dropdown) return;

  btn.addEventListener("click", e => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", () => dropdown.classList.add("hidden"));
}


/* ═══════════════════════════════════════════
   LOGOUT
   ═══════════════════════════════════════════ */
async function logout() {
  try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
  window.location.href = "/login";
}


/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */
function getInitials(name) {
  return (name || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function makeRoleBadge(user, size) {
  const sm = size === "lg"
    ? "text-sm px-3 py-1 gap-2"
    : "text-xs px-2.5 py-1 gap-1.5";
  if (user.isSuperAdmin) {
    return `<span class="inline-flex items-center font-bold rounded-full bg-amber-100 text-amber-700 ${sm}"><i class="fas fa-crown"></i> Owner</span>`;
  }
  if (user.role === "admin") {
    return `<span class="inline-flex items-center font-bold rounded-full bg-violet-100 text-violet-700 ${sm}"><i class="fas fa-shield"></i> Admin</span>`;
  }
  return `<span class="inline-flex items-center font-bold rounded-full bg-emerald-100 text-emerald-700 ${sm}"><i class="fas fa-user"></i> User</span>`;
}


/* ═══════════════════════════════════════════
   DASHBOARD STAGGER ANIMATION
   Called after the dashboard view is revealed.
   Each element with [data-dash-delay] gets the
   .dash-enter class applied after its delay (ms).
   ═══════════════════════════════════════════ */
function animateDashboardIn() {
  document.querySelectorAll("#dashboard-view [data-dash-delay]").forEach(el => {
    const delay = parseInt(el.dataset.dashDelay) || 0;
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.opacity = "";
      el.classList.add("dash-enter");
    }, delay);
  });
}

/* ═══════════════════════════════════════════
   SCROLL-TO-TOP BUTTON  (shared across all pages)
   ═══════════════════════════════════════════ */
function initScrollTopBtn() {
  const btn   = document.getElementById("scroll-top-btn");
  if (!btn) return;
  const pctEl = document.getElementById("scroll-pct");
  const ring  = document.getElementById("scroll-ring");
  const CIRC  = 150.8; // 2 * π * 24

  function onScroll() {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

    if (pctEl) pctEl.textContent = pct + "%";
    if (ring)  ring.style.strokeDashoffset = CIRC * (1 - pct / 100);

    if (scrollTop >= docHeight * 0.25) {
      btn.classList.remove("opacity-0", "pointer-events-none", "translate-y-4");
      btn.classList.add("opacity-100", "pointer-events-auto", "translate-y-0");
    } else {
      btn.classList.add("opacity-0", "pointer-events-none", "translate-y-4");
      btn.classList.remove("opacity-100", "pointer-events-auto", "translate-y-0");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ═══════════════════════════════════════════
   BIDIRECTIONAL AOS  (scroll up AND down)
   AOS mirror mode can miss elements in some layouts;
   this scroll listener directly checks bounding rects
   and toggles aos-animate, making both directions reliable.
   ═══════════════════════════════════════════ */
function initBidirectionalAOS() {
  let ticking = false;
  function check() {
    document.querySelectorAll("[data-aos]").forEach(el => {
      const r = el.getBoundingClientRect();
      const inView = r.top < window.innerHeight - 30 && r.bottom > 30;
      el.classList.toggle("aos-animate", inView);
    });
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(check); ticking = true; }
  }, { passive: true });
  // Run once after AOS finishes its own init scan
  setTimeout(check, 200);
}

/* ═══════════════════════════════════════════
   DOM READY INIT
   ═══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 650, once: false, mirror: true, offset: 30 });
    initBidirectionalAOS();
  }

  initSidebar();
  initUserDropdown();
  initScrollTopBtn();

  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document.getElementById("sidebar-logout")?.addEventListener("click", logout);

  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
});
