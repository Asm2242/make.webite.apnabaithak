(function () {
  const ORDERS_KEY = 'mw_orders';
  const USERS_KEY = 'mw_users';
  const SESSION_KEY = 'mw_session';

  function loadOrders() { try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) { return []; } }
  function saveOrders(list) { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); }
  function loadUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch (e) { return []; } }
  function saveUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }
  function currentUser() { const id = localStorage.getItem(SESSION_KEY); if (!id) return null; return loadUsers().find(u => u.id === id) || null; }
  function setCurrentUser(id) { if (id) localStorage.setItem(SESSION_KEY, id); else localStorage.removeItem(SESSION_KEY); }
  function genCode() { return 'REF-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }

  function registerUser(name, email, password, phone) {
    const users = loadUsers();
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered' };
    const u = { id: Date.now() + '-' + Math.random().toString(36).slice(2,6), name, email, password, phone, referralCode: genCode(), credits: 0, orders: 0 };
    users.push(u); saveUsers(users); setCurrentUser(u.id);
    return { ok: true, user: u };
  }
  function loginUser(email, password) {
    const u = loadUsers().find(x => x.email === email && x.password === password);
    if (!u) return { ok: false, msg: 'Invalid credentials' };
    setCurrentUser(u.id); return { ok: true, user: u };
  }
  function logoutUser() { setCurrentUser(null); }

  function addOrder(order) {
    const list = loadOrders();
    order.id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    order.date = new Date().toLocaleString();
    order.status = order.status || 'New';
    const u = currentUser();
    if (u) order.userId = u.id;
    list.unshift(order);
    saveOrders(list);
    // grant credits
    if (u) {
      const users = loadUsers();
      const buyer = users.find(x => x.id === u.id);
      if (buyer) { buyer.credits = (buyer.credits || 0) + 500; buyer.orders = (buyer.orders || 0) + 1; saveUsers(users); }
    }
    // referral credit to referrer
    if (order.referrerId) {
      const users = loadUsers();
      const ref = users.find(x => x.id === order.referrerId);
      if (ref) { ref.credits = (ref.credits || 0) + 500; saveUsers(users); }
    }
  }

  // UI helpers
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  // Auth modal
  const authModal = document.getElementById('authModal');
  function openAuth() { if (authModal) authModal.classList.remove('hidden'); }
  function closeAuth() { if (authModal) authModal.classList.add('hidden'); }
  const authOpenBtn = document.getElementById('authOpenBtn');
  if (authOpenBtn) authOpenBtn.addEventListener('click', openAuth);
  const authClose = document.getElementById('authClose');
  if (authClose) authClose.addEventListener('click', closeAuth);
  if (authModal) authModal.addEventListener('click', e => { if (e.target.id === 'authModal') closeAuth(); });

  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginTab) loginTab.addEventListener('click', () => { loginTab.classList.add('bg-blue-600'); registerTab.classList.remove('bg-blue-600'); loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); });
  if (registerTab) registerTab.addEventListener('click', () => { registerTab.classList.add('bg-blue-600'); loginTab.classList.remove('bg-blue-600'); registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });

  if (loginForm) loginForm.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    const r = loginUser(f.email.value.trim(), f.password.value);
    if (r.ok) { closeAuth(); updateAuthUI(); alert('Welcome ' + r.user.name); }
    else alert(r.msg);
  });
  if (registerForm) registerForm.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    const r = registerUser(f.name.value.trim(), f.email.value.trim(), f.password.value, f.phone.value.trim());
    if (r.ok) { closeAuth(); updateAuthUI(); alert('Account created. Your referral code: ' + r.user.referralCode); }
    else alert(r.msg);
  });
  const skipLoginBtn = document.getElementById('skipLoginBtn');
  if (skipLoginBtn) skipLoginBtn.addEventListener('click', () => { closeAuth(); alert('Continuing as guest'); });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => { logoutUser(); updateAuthUI(); });

  function updateAuthUI() {
    const u = currentUser();
    const openBtn = document.getElementById('authOpenBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    if (u) {
      if (openBtn) openBtn.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      if (userInfo) { userInfo.classList.remove('hidden'); userInfo.textContent = u.name + ' (Credits: ₹' + (u.credits||0) + ', Code: ' + u.referralCode + ')'; }
    } else {
      if (openBtn) openBtn.classList.remove('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      if (userInfo) userInfo.classList.add('hidden');
    }
  }
  updateAuthUI();

  // Pricing totals + order modal
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
        pendingOrder = { plan: card.dataset.plan, addons: selected, baseTotal: totalEl.textContent, discount: 0 };
        if (orderModal) {
          orderModal.classList.remove('hidden');
          recalcOrderTotal();
        } else {
          const name = prompt('Enter your Full Name:');
          const phone = prompt('Enter your Phone Number:');
          if (name && phone) saveOrderFromModal(name, phone, '');
        }
      });
    }
  });

  const couponInput = document.getElementById('couponInput');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const orderTotalDisplay = document.getElementById('orderTotalDisplay');
  const discountDisplay = document.getElementById('discountDisplay');

  function parseAmount(str) { return parseInt(str.replace(/[^\d]/g, ''), 10) || 0; }

  function recalcOrderTotal() {
    if (!pendingOrder || !orderTotalDisplay) return;
    let total = parseAmount(pendingOrder.baseTotal);
    let discount = pendingOrder.discount || 0;
    const code = couponInput ? couponInput.value.trim().toUpperCase() : '';
    // determine discount
    let newDiscount = 0; let referrerId = null;
    if (code === 'FIRST250') newDiscount = 250;
    else if (code === 'WELCOME10') newDiscount = Math.round(total * 0.10);
    else if (code === 'REF500') newDiscount = 500;
    else {
      // referral code from another user
      const users = loadUsers();
      const ref = users.find(u => u.referralCode === code);
      const u = currentUser();
      if (ref && (!u || ref.id !== u.id)) { newDiscount = 500; referrerId = ref.id; }
    }
    pendingOrder.discount = newDiscount;
    pendingOrder.referrerId = referrerId;
    pendingOrder.coupon = code;
    const final = Math.max(0, total - newDiscount);
    if (discountDisplay) discountDisplay.textContent = 'Discount: ₹' + newDiscount.toLocaleString('en-IN');
    orderTotalDisplay.textContent = 'Total: ₹' + final.toLocaleString('en-IN');
  }
  if (applyCouponBtn) applyCouponBtn.addEventListener('click', recalcOrderTotal);
  if (couponInput) couponInput.addEventListener('input', recalcOrderTotal);

  function saveOrderFromModal(name, phone, coupon) {
    if (!pendingOrder) return;
    const finalTotal = orderTotalDisplay ? parseAmount(orderTotalDisplay.textContent) : parseAmount(pendingOrder.baseTotal);
    addOrder({
      type: 'Plan Order',
      plan: pendingOrder.plan,
      addons: pendingOrder.addons,
      total: '₹' + finalTotal.toLocaleString('en-IN'),
      name: name,
      phone: phone,
      coupon: pendingOrder.coupon || coupon,
      discount: pendingOrder.discount || 0,
      referrerId: pendingOrder.referrerId || null
    });
    showPopup(`Plan: ${pendingOrder.plan}<br/>Total: ₹${finalTotal.toLocaleString('en-IN')}<br/>Discount: ₹${(pendingOrder.discount||0).toLocaleString('en-IN')}<br/>Add-ons: ${pendingOrder.addons.length ? pendingOrder.addons.join(', ') : 'None'}<br/>Name: ${name}<br/>Phone: ${phone}<br/><span class="text-emerald-400">Saved to admin panel.</span>`);
    pendingOrder = null;
  }

  if (orderForm) {
    orderForm.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const name = f.name.value.trim();
      const phone = f.phone.value.trim();
      recalcOrderTotal();
      saveOrderFromModal(name, phone, f.coupon ? f.coupon.value : '');
      orderForm.reset();
      if (orderModal) orderModal.classList.add('hidden');
    });
  }
  const orderClose = document.getElementById('orderModalClose');
  if (orderClose) orderClose.addEventListener('click', () => { if (orderModal) orderModal.classList.add('hidden'); pendingOrder = null; });
  if (orderModal) orderModal.addEventListener('click', e => { if (e.target.id === 'orderModal') { orderModal.classList.add('hidden'); pendingOrder = null; } });

  // skip login in order modal
  const skipOrderLogin = document.getElementById('skipOrderLogin');
  if (skipOrderLogin) skipOrderLogin.addEventListener('click', () => {
    const name = prompt('Enter your Full Name (guest):');
    const phone = prompt('Enter your Phone Number:');
    if (name && phone) { recalcOrderTotal(); saveOrderFromModal(name.trim(), phone.trim(), ''); if (orderModal) orderModal.classList.add('hidden'); }
  });

  // Contact form
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
