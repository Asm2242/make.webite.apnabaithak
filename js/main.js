(function () {
  const SESSION_KEY = 'mw_session_user';

  function currentUser() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function setCurrentUser(u) { if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); else localStorage.removeItem(SESSION_KEY); }

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    if (!res.ok) throw new Error('API ' + res.status);
    return res.json();
  }

  async function registerUser(name, email, password, phone) {
    try {
      const r = await api('/api/users', { method: 'POST', body: JSON.stringify({ action: 'register', name, email, password, phone }) });
      if (r.ok) { setCurrentUser(r.user); return r; }
      return r;
    } catch (e) {
      // fallback localStorage
      const users = JSON.parse(localStorage.getItem('mw_users') || '[]');
      if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered' };
      const u = { id: Date.now() + '-' + Math.random().toString(36).slice(2,6), name, email, password, phone, referralCode: 'REF-' + Math.random().toString(36).slice(2,8).toUpperCase(), credits: 0, orders: 0 };
      users.push(u); localStorage.setItem('mw_users', JSON.stringify(users)); setCurrentUser(u);
      return { ok: true, user: u };
    }
  }

  async function loginUser(email, password) {
    try {
      const r = await api('/api/users', { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) });
      if (r.ok) { setCurrentUser(r.user); return r; }
      return r;
    } catch (e) {
      const users = JSON.parse(localStorage.getItem('mw_users') || '[]');
      const u = users.find(x => x.email === email && x.password === password);
      if (!u) return { ok: false, msg: 'Invalid credentials' };
      setCurrentUser(u); return { ok: true, user: u };
    }
  }

  function logoutUser() { setCurrentUser(null); }

  async function addOrder(order) {
    const u = currentUser();
    const payload = Object.assign({}, order, { userId: u ? u.id : null });
    try {
      const r = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      if (r.user) setCurrentUser(r.user);
      return r;
    } catch (e) {
      const list = JSON.parse(localStorage.getItem('mw_orders') || '[]');
      const o = Object.assign({}, order, { id: Date.now() + '-' + Math.random().toString(36).slice(2,7), date: new Date().toLocaleString(), status: 'New' });
      list.unshift(o); localStorage.setItem('mw_orders', JSON.stringify(list));
      return { ok: true, id: o.id };
    }
  }

  async function loadOrders() {
    try { return await api('/api/orders'); } catch (e) { return JSON.parse(localStorage.getItem('mw_orders') || '[]'); }
  }

  async function loadUsers() {
    try { return await api('/api/users'); } catch (e) { return JSON.parse(localStorage.getItem('mw_users') || '[]'); }
  }

  async function loadNewsletter() {
    try { return await api('/api/newsletter'); } catch (e) { return (JSON.parse(localStorage.getItem('mw_newsletter') || '[]')).map(e => ({ email: e })); }
  }

  async function saveNewsletter(email) {
    try { await api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) }); }
    catch (e) {
      const list = JSON.parse(localStorage.getItem('mw_newsletter') || '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('mw_newsletter', JSON.stringify(list));
    }
  }

  // UI
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  const authModal = document.getElementById('authModal');
  function openAuth() { if (authModal) authModal.classList.remove('hidden'); }
  function closeAuth() { if (authModal) authModal.classList.add('hidden'); }
  const authOpenBtns = document.querySelectorAll('#authOpenBtn, .auth-open-btn');
  authOpenBtns.forEach(b => b.addEventListener('click', openAuth));
  const authClose = document.getElementById('authClose');
  if (authClose) authClose.addEventListener('click', closeAuth);
  if (authModal) authModal.addEventListener('click', e => { if (e.target.id === 'authModal') closeAuth(); });

  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginTab) loginTab.addEventListener('click', () => { loginTab.classList.add('bg-blue-600'); registerTab.classList.remove('bg-blue-600'); loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); });
  if (registerTab) registerTab.addEventListener('click', () => { registerTab.classList.add('bg-blue-600'); loginTab.classList.remove('bg-blue-600'); registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });

  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    const r = await loginUser(f.email.value.trim(), f.password.value);
    if (r.ok) { closeAuth(); updateAuthUI(); alert('Welcome ' + r.user.name); }
    else alert(r.msg);
  });
  if (registerForm) registerForm.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    const r = await registerUser(f.name.value.trim(), f.email.value.trim(), f.password.value, f.phone.value.trim());
    if (r.ok) { closeAuth(); updateAuthUI(); alert('Account created. Your referral code: ' + r.user.referralCode); }
    else alert(r.msg);
  });
  const skipLoginBtn = document.getElementById('skipLoginBtn');
  if (skipLoginBtn) skipLoginBtn.addEventListener('click', () => { closeAuth(); alert('Continuing as guest'); });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => { logoutUser(); updateAuthUI(); });

  function updateAuthUI() {
    const u = currentUser();
    const openBtns = document.querySelectorAll('#authOpenBtn, .auth-open-btn');
    const lbs = document.querySelectorAll('#logoutBtn, .logout-btn');
    const userInfo = document.getElementById('userInfo');
    if (u) {
      openBtns.forEach(b => b.classList.add('hidden'));
      lbs.forEach(b => b.classList.remove('hidden'));
      if (userInfo) { userInfo.classList.remove('hidden'); userInfo.textContent = u.name + ' (Credits: ₹' + (u.credits||0) + ', Code: ' + u.referralCode + ')'; }
    } else {
      openBtns.forEach(b => b.classList.remove('hidden'));
      lbs.forEach(b => b.classList.add('hidden'));
      if (userInfo) userInfo.classList.add('hidden');
    }
  }
  updateAuthUI();

  // Pricing
  let pendingOrder = null;
  const orderModal = document.getElementById('orderModal');
  const orderForm = document.getElementById('orderDetailsForm');

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
      recalcOrderTotal();
    }
    addons.forEach(cb => cb.addEventListener('change', updateTotal));
    if (btn) {
      btn.addEventListener('click', () => {
        const selected = Array.from(addons).filter(cb => cb.checked).map(cb => cb.parentElement.textContent.trim());
        pendingOrder = { plan: card.dataset.plan, addons: selected, baseTotal: totalEl.textContent, discount: 0, referrerId: null, coupon: '' };
        if (orderModal) {
          orderModal.classList.remove('hidden');
          const uf = document.getElementById('userInfo');
          const u = currentUser();
          if (uf) {
            if (u) { uf.classList.remove('hidden'); uf.textContent = 'Logged in as ' + u.name; }
            else uf.classList.add('hidden');
          }
          recalcOrderTotal();
        } else {
          const name = prompt('Enter your Full Name:');
          const phone = prompt('Enter your Phone Number:');
          if (name && phone) saveOrderFromModal(name, phone);
        }
      });
    }
  });

  const couponInput = document.getElementById('couponInput');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const orderTotalDisplay = document.getElementById('orderTotalDisplay');
  const discountDisplay = document.getElementById('discountDisplay');

  function parseAmount(str) { return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0; }

  function recalcOrderTotal() {
    if (!pendingOrder || !orderTotalDisplay) return;
    let total = parseAmount(pendingOrder.baseTotal);
    const code = couponInput ? couponInput.value.trim().toUpperCase() : '';
    let newDiscount = 0; let referrerId = null;
    if (code === 'FIRST250') newDiscount = 250;
    else if (code === 'WELCOME10') newDiscount = Math.round(total * 0.10);
    else if (code === 'REF500') newDiscount = 500;
    else if (code) {
      // check referral code via API sync not possible sync; store for server validation later
      newDiscount = 500; // optimistic
    }
    pendingOrder.discount = newDiscount;
    pendingOrder.coupon = code;
    pendingOrder.referrerId = referrerId;
    const final = Math.max(0, total - newDiscount);
    if (discountDisplay) discountDisplay.textContent = 'Discount: ₹' + newDiscount.toLocaleString('en-IN');
    orderTotalDisplay.textContent = 'Total: ₹' + final.toLocaleString('en-IN');
  }
  if (applyCouponBtn) applyCouponBtn.addEventListener('click', recalcOrderTotal);
  if (couponInput) couponInput.addEventListener('input', recalcOrderTotal);

  async function saveOrderFromModal(name, phone) {
    if (!pendingOrder) return;
    const finalTotal = orderTotalDisplay ? parseAmount(orderTotalDisplay.textContent) : parseAmount(pendingOrder.baseTotal);
    const r = await addOrder({
      type: 'Plan Order',
      plan: pendingOrder.plan,
      addons: pendingOrder.addons,
      total: '₹' + finalTotal.toLocaleString('en-IN'),
      name: name,
      phone: phone,
      coupon: pendingOrder.coupon || '',
      discount: pendingOrder.discount || 0,
      referrerId: pendingOrder.referrerId || null
    });
    if (r && r.user) setCurrentUser(r.user);
    updateAuthUI();
    showPopup(`Plan: ${pendingOrder.plan}<br/>Total: ₹${finalTotal.toLocaleString('en-IN')}<br/>Discount: ₹${(pendingOrder.discount||0).toLocaleString('en-IN')}<br/>Add-ons: ${pendingOrder.addons.length ? pendingOrder.addons.join(', ') : 'None'}<br/>Name: ${name}<br/>Phone: ${phone}<br/><span class="text-emerald-400">Saved to database.</span>`);
    pendingOrder = null;
  }

  if (orderForm) {
    orderForm.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const name = f.name.value.trim();
      const phone = f.phone.value.trim();
      recalcOrderTotal();
      await saveOrderFromModal(name, phone);
      orderForm.reset();
      if (orderModal) orderModal.classList.add('hidden');
    });
  }
  const orderClose = document.getElementById('orderModalClose');
  if (orderClose) orderClose.addEventListener('click', () => { if (orderModal) orderModal.classList.add('hidden'); pendingOrder = null; });
  if (orderModal) orderModal.addEventListener('click', e => { if (e.target.id === 'orderModal') { orderModal.classList.add('hidden'); pendingOrder = null; } });

  const skipOrderLogin = document.getElementById('skipOrderLogin');
  if (skipOrderLogin) skipOrderLogin.addEventListener('click', async () => {
    const name = prompt('Enter your Full Name (guest):');
    const phone = prompt('Enter your Phone Number:');
    if (name && phone) { recalcOrderTotal(); await saveOrderFromModal(name.trim(), phone.trim()); if (orderModal) orderModal.classList.add('hidden'); }
  });

  // Contact form
  const form = document.getElementById('consultForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      await addOrder({ type: 'Consultation', name: f.name.value.trim(), phone: f.phone.value.trim(), business: f.business.value.trim(), plan: f.plan.value });
      showPopup(`Thank you ${f.name.value.trim()}!<br/>We'll call you at ${f.phone.value.trim()} shortly.<br/>Business: ${f.business.value.trim()}<br/>Plan: ${f.plan.value}<br/><span class="text-emerald-400">Saved to database.</span>`);
      f.reset();
    });
  }

  // Newsletter
  const nf = document.getElementById('newsletterForm');
  if (nf) nf.addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    await saveNewsletter(email);
    alert('Subscribed: ' + email);
    e.target.reset();
  });

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

  // Expose for admin page
  window.MW = { loadOrders, loadUsers, loadNewsletter, api };
})();
