/* =========================================================
   Bungee Action Eventmodule – progressive enhancements.
   The page fully works without JS; this only improves UX.
   ========================================================= */

const WHATSAPP_NUMBER = '491704904460';
const WHATSAPP_TEXT =
  'Hallo Herr Schnitzler, ich interessiere mich für das Bungee-Trampolin für unsere Veranstaltung. ' +
  'Datum: … / Ort: … – Ist der Termin noch frei?';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initMobileCta();
  initWhatsApp();
  initContactForm();
  setYear();
});

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
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // animate only once
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

/* ---------- WhatsApp links with a prefilled message ---------- */
function initWhatsApp() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
  document.querySelectorAll('.js-wa').forEach((link) => { link.href = url; });
}

/* ---------- Contact form: validation + async submit ---------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  const setStatus = (msg, type = '') => {
    status.textContent = msg;
    status.className = 'form-status' + (type ? ` is-${type}` : '');
  };

  const isValid = (field) => (field.type === 'checkbox' ? field.checked : field.checkValidity());
  const markField = (field, valid) => {
    const target = field.type === 'checkbox' ? field.closest('.consent') : field;
    target.classList.toggle('is-invalid', !valid);
    field.setAttribute('aria-invalid', String(!valid));
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let firstInvalid = null;
    form.querySelectorAll('[required]').forEach((field) => {
      const valid = isValid(field);
      markField(field, valid);
      if (!valid && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      setStatus(firstInvalid.name === 'consent'
        ? 'Bitte stimmen Sie der Datenverarbeitung zu.'
        : 'Bitte füllen Sie alle Pflichtfelder (*) korrekt aus.', 'error');
      firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;
    setStatus('Anfrage wird gesendet …');

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'send failed');

      form.reset();
      setStatus('Vielen Dank! Ihre Anfrage ist angekommen – wir melden uns zeitnah.', 'success');
    } catch {
      setStatus('Die Anfrage konnte nicht gesendet werden. Bitte schreiben Sie direkt an info@bungee-action.de, per WhatsApp oder rufen Sie an: 0170 4904460.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Remove the error state as soon as a field becomes valid
  form.addEventListener('input', (e) => {
    const field = e.target;
    if (field.hasAttribute('required') && isValid(field)) markField(field, true);
  });
}

/* ---------- Footer year ---------- */
function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}
