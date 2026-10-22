// Shared interactions
(function () {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }

  // Pricing totals + order buttons (if present)
  document.querySelectorAll('.plan-card').forEach(card => {
    const base = parseInt(card.dataset.base, 10);
    const totalEl = card.querySelector('.total');
    const addons = card.querySelectorAll('.addon');
    const btn = card.querySelector('.order-btn');
    if (!totalEl) return;
    function updateTotal() {
      let extra = 0;
      addons.forEach(cb => { if (cb.checked) extra += parseInt(cb.dataset.price, 10); });
      totalEl.textContent = '₹' + (base + extra).toLocaleString('en-IN');
    }
    addons.forEach(cb => cb.addEventListener('change', updateTotal));
    if (btn) {
      btn.addEventListener('click', () => {
        const selected = Array.from(addons).filter(cb => cb.checked).map(cb => cb.parentElement.textContent.trim());
        showPopup(`Plan: ${card.dataset.plan}<br/>Total: ${totalEl.textContent}<br/>Add-ons: ${selected.length ? selected.join(', ') : 'None'}`);
      });
    }
  });

  // Contact form
  const form = document.getElementById('consultForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      showPopup(`Thank you ${f.name.value.trim()}!<br/>We'll call you at ${f.phone.value.trim()} shortly.<br/>Business: ${f.business.value.trim()}<br/>Plan: ${f.plan.value}`);
      f.reset();
    });
  }

  window.showPopup = function (msg) {
    const el = document.getElementById('popupMsg');
    if (el) el.innerHTML = msg;
    const p = document.getElementById('popup');
    if (p) p.classList.remove('hidden');
  };
  const close = document.getElementById('popupClose');
  if (close) close.addEventListener('click', () => document.getElementById('popup').classList.add('hidden'));
  const popup = document.getElementById('popup');
  if (popup) popup.addEventListener('click', e => { if (e.target.id === 'popup') popup.classList.add('hidden'); });
})();
