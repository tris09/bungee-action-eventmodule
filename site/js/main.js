/* =========================================================
   Bungee Action Eventmodule – progressive enhancements.
   The page fully works without JS; this only improves UX.
   ========================================================= */

const WHATSAPP_NUMBER = '491704904460';
const root = document.documentElement;

let currentLang = 'de';
// German lives in the HTML, the others in js/i18n.js
const SUPPORTED_LANGS = ['de', 'en', 'fr', 'nl'];

const msg = (key) => (window.I18N_MESSAGES?.[currentLang] || window.I18N_MESSAGES?.de || {})[key] || '';

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  initTheme();
  initNav();
  initScrollToTop();
  initReveal();
  initMobileCta();
  initContactForm();
  setYear();
});

/* ---------- Small helper: localStorage can throw (private mode, blocked storage) ---------- */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

/* ---------- Language switch (DE / EN) ---------- */
function initLanguage() {
  const textEls = document.querySelectorAll('[data-i18n]');
  const attrEls = document.querySelectorAll('[data-i18n-attr]');

  // Remember the German originals from the HTML, so we can switch back
  textEls.forEach((el) => { el.dataset.i18nDe = el.innerHTML; });
  attrEls.forEach((el) => {
    parseAttrList(el.dataset.i18nAttr).forEach(([attr]) => {
      el.dataset[`i18nDe_${attr.replace(/-/g, '_')}`] = el.getAttribute(attr) ?? '';
    });
  });

  const select = document.getElementById('lang-select');

  const apply = (lang) => {
    currentLang = SUPPORTED_LANGS.includes(lang) ? lang : 'de';
    const dict = window.I18N?.[currentLang] || {};

    textEls.forEach((el) => {
      const key = el.dataset.i18n;
      el.innerHTML = currentLang === 'de' ? el.dataset.i18nDe : (dict[key] ?? el.dataset.i18nDe);
    });
    attrEls.forEach((el) => {
      parseAttrList(el.dataset.i18nAttr).forEach(([attr, key]) => {
        const original = el.dataset[`i18nDe_${attr.replace(/-/g, '_')}`];
        el.setAttribute(attr, currentLang === 'de' ? original : (dict[key] ?? original));
      });
    });

    root.lang = currentLang;
    if (select) select.value = currentLang;
    updateWhatsAppLinks(); // links inside translated texts were just re-created
    updateThemeLabel();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
  };

  select?.addEventListener('change', () => {
    store.set('lang', select.value);
    apply(select.value);
  });

  // Saved choice > first supported browser language > German
  const saved = store.get('lang');
  const browserLangs = (navigator.languages?.length ? navigator.languages : [navigator.language || 'de'])
    .map((l) => l.toLowerCase().slice(0, 2));
  const browserLang = browserLangs.find((l) => SUPPORTED_LANGS.includes(l)) || 'de';
  apply(SUPPORTED_LANGS.includes(saved) ? saved : browserLang);
}

function parseAttrList(value = '') {
  return value.split(';').filter(Boolean).map((pair) => pair.split(':').map((s) => s.trim()));
}

/* ---------- Light / dark mode ---------- */
function initTheme() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('theme', next);
    updateThemeLabel();
  });

  // Follow the OS setting live, as long as the user has not chosen manually
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (store.get('theme')) return;
    root.dataset.theme = e.matches ? 'dark' : 'light';
    updateThemeLabel();
  });

  updateThemeLabel();
}

function updateThemeLabel() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const isDark = root.dataset.theme === 'dark';
  toggle.setAttribute('aria-label', isDark ? msg('themeToLight') : msg('themeToDark'));
  toggle.setAttribute('aria-pressed', String(isDark));
}

/* ---------- WhatsApp links with a prefilled message ---------- */
function updateWhatsAppLinks() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg('waText'))}`;
  document.querySelectorAll('.js-wa').forEach((link) => { link.href = url; });
}

/* ---------- Mobile navigation ---------- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ---------- Logo: smooth scroll back to the top ---------- */
function initScrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.js-to-top').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', location.pathname); // remove "#..." from the URL
    });
  });
}

/* ---------- Fade/slide elements in when they scroll into view ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-visible');
      observer.unobserve(el); // animate only once
      // Remove the stagger delay afterwards, otherwise hover effects would start late
      setTimeout(() => { el.style.transitionDelay = ''; }, 1200);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  // Small stagger for elements that sit next to each other (cards, stats)
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.transitionDelay = `${siblings.indexOf(el) * 80}ms`;
    observer.observe(el);
  });
}

/* ---------- Hide sticky CTA in hero and contact section ---------- */
function initMobileCta() {
  const cta = document.querySelector('.mobile-cta');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('kontakt');
  if (!cta || !hero || !contact || !('IntersectionObserver' in window)) return;

  const visible = { hero: true, contact: false };
  const update = () => cta.classList.toggle('is-hidden', visible.hero || visible.contact);

  new IntersectionObserver(([e]) => { visible.hero = e.isIntersecting; update(); }, { threshold: 0.25 }).observe(hero);
  new IntersectionObserver(([e]) => { visible.contact = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(contact);
}

/* ---------- Contact form: validation, spam protection, async submit ---------- */

// Server error codes (kontakt.php) -> message keys in I18N_MESSAGES
const FORM_ERRORS = {
  captcha: 'formCaptcha',
  captcha_expired: 'formCaptchaExpired',
  too_fast: 'formTooFast',
  rate: 'formRate',
  spam: 'formSpam',
  validation: 'formRequired',
};

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const widget = form.querySelector('altcha-widget');
  let altchaPayload = '';
  let proofStartedAt = 0;

  // Status messages are stored by key, so they follow a later language switch
  let lastStatus = null;
  const setStatus = (key, type = '') => {
    lastStatus = key ? { key, type } : null;
    status.textContent = key ? msg(key) : '';
    status.className = 'form-status' + (type ? ` is-${type}` : '');
  };
  document.addEventListener('langchange', () => { if (lastStatus) setStatus(lastStatus.key, lastStatus.type); });

  /* Load the ALTCHA widget only when the form comes close: keeps the first page load light */
  const loadAltcha = () => import('./vendor/altcha.min.js').then(() => customElements.whenDefined('altcha-widget'));
  let altchaReady = null;
  const ensureAltcha = () => (altchaReady ??= loadAltcha().then(() => {
    widget.configure?.({ language: currentLang });
  }).catch(() => null));

  if (widget) {
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { ensureAltcha(); obs.disconnect(); }
    }, { rootMargin: '600px 0px' }).observe(form);

    // The widget reports every state change; keep the latest proof
    widget.addEventListener('statechange', (e) => {
      const state = e.detail?.state;
      if (state === 'verifying') proofStartedAt = Date.now(); // ≈ moment the challenge was issued
      altchaPayload = state === 'verified' ? (e.detail.payload || '') : '';
    });
    document.addEventListener('langchange', (e) => widget.configure?.({ language: e.detail.lang }));
  }

  // Our own required fields (the ALTCHA widget brings its own checkbox, handled separately)
  const requiredFields = () => [...form.querySelectorAll('[required]')].filter((f) => !f.closest('altcha-widget'));
  const isValid = (field) => (field.type === 'checkbox' ? field.checked : field.checkValidity());
  const markField = (field, valid) => {
    const target = field.type === 'checkbox' ? field.closest('.consent') : field;
    target.classList.toggle('is-invalid', !valid);
    field.setAttribute('aria-invalid', String(!valid));
  };

  /** Make sure the proof-of-work is done; solves it now if the visitor was faster. */
  const getProof = async () => {
    if (!widget) return '';
    await ensureAltcha();
    let payload = altchaPayload;
    if (!payload && typeof widget.verify === 'function') {
      setStatus('formVerifying');
      proofStartedAt = Date.now();
      const result = await widget.verify().catch(() => null);
      payload = result?.payload || altchaPayload;
    }
    if (payload) await waitForMinFillTime(payload);
    return payload;
  };

  /**
   * The server rejects forms sent faster than the minimum fill time after the
   * challenge was issued (typical bot behaviour). If a fresh proof was just
   * solved, wait out the rest of that time instead of failing.
   */
  const waitForMinFillTime = async (payload) => {
    let minFill = 0;
    try { minFill = JSON.parse(atob(payload)).challenge.parameters.data.mf || 0; } catch { /* ignore */ }
    const waitMs = proofStartedAt + minFill * 1000 + 500 - Date.now();
    if (waitMs > 0) {
      setStatus('formVerifying');
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 10000)));
    }
  };

  /** Every challenge works only once: start fresh for the next attempt. */
  const resetProof = (solveNext) => {
    altchaPayload = '';
    widget?.reset?.();
    if (solveNext) widget?.verify?.().catch(() => {});
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let firstInvalid = null;
    requiredFields().forEach((field) => {
      const valid = isValid(field);
      markField(field, valid);
      if (!valid && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      setStatus(firstInvalid.name === 'consent' ? 'formConsent' : 'formRequired', 'error');
      firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;

    try {
      const proof = await getProof();
      if (!proof) throw new Error('captcha');

      setStatus('formSending');
      const body = new FormData(form);
      body.set('altcha', proof);
      body.set('lang', currentLang);

      const res = await fetch(form.action, {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'send');

      form.reset();
      setStatus('formSuccess', 'success');
      resetProof(false);
    } catch (err) {
      setStatus(FORM_ERRORS[err.message] || 'formError', 'error');
      resetProof(true); // the visitor will probably try again: solve the next proof right away
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Remove the error state as soon as a field becomes valid
  form.addEventListener('input', (e) => {
    const field = e.target;
    if (field.hasAttribute('required') && !field.closest('altcha-widget') && isValid(field)) markField(field, true);
  });
}

/* ---------- Footer year ---------- */
function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}
