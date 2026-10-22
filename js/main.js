(function () {
  const STORAGE_KEY = 'mw_orders';

  function loadOrders() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveOrders(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function addOrder(order) {
    const list = loadOrders();
    order.id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    order.date = new Date().toLocaleString();
    order.status = order.status || 'New';
    list.unshift(order);
    saveOrders(list);
  }

  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }

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
        const total = totalEl.textContent;
        addOrder({ type: 'Plan Order', plan: card.dataset.plan, addons: selected, total: total });
        showPopup(`Plan: ${card.dataset.plan}<br/>Total: ${total}<br/>Add-ons: ${selected.length ? selected.join(', ') : 'None'}<br/><span class="text-emerald-400">Saved to admin panel.</span>`);
      });
    }
  });

  const form = document.getElementById('consultForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      addOrder({ type: 'Consultation', name: f.name.value.trim(), phone: f.phone.value.trim(), business: f.business.value.trim(), plan: f.plan.value });
      showPopup(`Thank you ${f.name.value.trim()}!<br/>We'll call you at ${f.phone.value.trim()} shortly.<br/>Business: ${f.business.value.trim()}<br/>Plan: ${f.plan.value}<br/><span class="text-emerald-400">Saved to admin panel.</span>`);
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
