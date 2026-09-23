const state = {
  view: 'home',
  message: null,
  checkoutCoupon: null,
  session: null,
  products: [],
  cart: [],
  orders: [],
  coupons: [],
  inventory: [],
  movements: [],
  dashboard: null,
  cash: null
};

async function api(endpoint, options = {}) {
  const config = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: { ...(options.headers || {}) }
  };

  if (options.body !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`api/${endpoint}`, config);
  let data;
  try {
    data = await response.json();
  } catch {
    data = { success: false, message: 'Resposta inválida da API.' };
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }

  return data;
}

function e(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function formatDate(value) {
  if (!value) return '—';
  const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? e(value) : date.toLocaleString('pt-BR');
}

function getSession() {
  return state.session;
}

function showMessage(text, type = 'success') {
  state.message = { text, type };
  render();
  window.setTimeout(() => {
    if (state.message?.text === text) {
      state.message = null;
      render();
    }
  }, 2800);
}

function showError(error) {
  console.error(error);
  if (error?.status === 401 || error?.status === 403) {
    state.session = null;
    state.view = 'login';
    state.message = { text: error?.message || 'Sua sessão expirou. Entre novamente.', type: 'error' };
    render();
    return;
  }
  showMessage(error?.message || 'Ocorreu um erro inesperado.', 'error');
}

async function loadSession() {
  const data = await api('auth.php');
  state.session = data.user || null;
}

async function loadProducts() {
  const data = await api('products.php');
  state.products = data.products || [];
}

async function loadCart() {
  if (state.session?.role !== 'client') {
    state.cart = [];
    return;
  }
  const data = await api('cart.php');
  state.cart = data.items || [];
}

async function loadOrders() {
  const data = await api('orders.php');
  state.orders = data.orders || [];
}

async function loadCoupons() {
  const data = await api('coupons.php');
  state.coupons = data.coupons || [];
}

async function loadInventory() {
  const data = await api('inventory.php');
  state.inventory = data.items || [];
  state.movements = data.movements || [];
}

async function loadDashboard() {
  state.dashboard = await api('dashboard.php');
}

async function loadCash() {
  state.cash = await api('cash.php');
}

async function loadForView(view) {
  if (view === 'home') {
    await loadProducts();
    if (state.session?.role === 'client') await loadCart();
    return;
  }

  if (['cart', 'checkout'].includes(view)) {
    await loadCart();
    return;
  }

  if (view === 'orders' || view === 'admin-orders') {
    await loadOrders();
    return;
  }

  if (view === 'admin') {
    await loadDashboard();
    return;
  }

  if (view === 'admin-menu') {
    await loadProducts();
    return;
  }

  if (view === 'admin-inventory') {
    await loadInventory();
    return;
  }

  if (view === 'admin-coupons') {
    await loadCoupons();
    return;
  }

  if (view === 'admin-cash') {
    await loadCash();
  }
}

function canOpen(view) {
  const user = getSession();
  if (['cart', 'checkout', 'orders'].includes(view)) return user?.role === 'client';
  if (view.startsWith('admin')) return user?.role === 'admin';
  return true;
}

async function go(view) {
  if (!canOpen(view)) {
    view = getSession()?.role === 'admin' ? 'admin' : 'login';
  }

  state.view = view;
  state.message = null;
  renderLoading();

  try {
    await loadForView(view);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      state.session = null;
      state.view = 'login';
      state.message = { text: 'Sua sessão expirou. Entre novamente.', type: 'error' };
      render();
      return;
    }
    showError(error);
  }
}

async function logout() {
  try {
    await api('auth.php', { method: 'POST', body: { action: 'logout' } });
  } catch (error) {
    console.error(error);
  }
  state.session = null;
  state.cart = [];
  state.checkoutCoupon = null;
  await go('home');
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function cartDetails() {
  return state.cart;
}

function calculateCartTotal(coupon = null) {
  const subtotal = cartDetails().reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  let discount = 0;
  if (coupon) {
    discount = coupon.type === 'percent' ? subtotal * (Number(coupon.value) / 100) : Number(coupon.value);
    discount = Math.min(discount, subtotal);
  }
  return { subtotal, discount, total: subtotal - discount };
}

async function addToCart(productId) {
  if (state.session?.role !== 'client') return go('login');
  try {
    const data = await api('cart.php', { method: 'POST', body: { productId } });
    state.cart = data.items || [];
    await go('cart');
  } catch (error) {
    showError(error);
  }
}

async function updateCart(productId, delta) {
  const item = state.cart.find(row => row.productId === productId);
  if (!item) return;
  const quantity = Number(item.quantity) + delta;

  try {
    const data = await api('cart.php', { method: 'PUT', body: { productId, quantity } });
    state.cart = data.items || [];
    render();
  } catch (error) {
    showError(error);
  }
}

async function removeFromCart(productId) {
  try {
    const data = await api(`cart.php?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' });
    state.cart = data.items || [];
    render();
  } catch (error) {
    showError(error);
  }
}

async function applyCoupon() {
  const input = document.getElementById('couponCode');
  const code = input?.value.trim().toUpperCase();
  if (!code) return showMessage('Informe o código do cupom.', 'error');

  try {
    const data = await api(`coupons.php?code=${encodeURIComponent(code)}`);
    state.checkoutCoupon = data.coupon;
    showMessage(`Cupom ${data.coupon.code} aplicado.`);
  } catch (error) {
    state.checkoutCoupon = null;
    showError(error);
  }
}

async function finalizeOrder(event) {
  event.preventDefault();
  const customerName = document.getElementById('customerName').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const paymentMethod = document.getElementById('paymentMethod').value;

  try {
    const data = await api('orders.php', {
      method: 'POST',
      body: {
        customerName,
        customerPhone,
        paymentMethod,
        couponCode: state.checkoutCoupon?.code || ''
      }
    });
    state.checkoutCoupon = null;
    await Promise.all([loadCart(), loadProducts(), loadOrders()]);
    state.view = 'orders';
    state.message = { text: data.message, type: 'success' };
    render();
  } catch (error) {
    showError(error);
  }
}

async function login(event) {
  event.preventDefault();
  try {
    const data = await api('auth.php', {
      method: 'POST',
      body: {
        action: 'login',
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      }
    });
    state.session = data.user;
    await go(data.user.role === 'admin' ? 'admin' : 'home');
  } catch (error) {
    showError(error);
  }
}

async function register(event) {
  event.preventDefault();
  try {
    const data = await api('auth.php', {
      method: 'POST',
      body: {
        action: 'register',
        name: document.getElementById('registerName').value.trim(),
        phone: document.getElementById('registerPhone').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        password: document.getElementById('registerPassword').value
      }
    });
    state.session = data.user;
    await go('home');
  } catch (error) {
    showError(error);
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const id = Number(document.getElementById('productId').value || 0);
  const body = {
    id,
    name: document.getElementById('productName').value.trim(),
    description: document.getElementById('productDescription').value.trim(),
    price: Number(document.getElementById('productPrice').value),
    stock: Number(document.getElementById('productStock').value),
    emoji: document.getElementById('productEmoji').value.trim() || '🍽️'
  };

  try {
    const data = await api('products.php', { method: id ? 'PUT' : 'POST', body });
    clearProductForm();
    await loadProducts();
    showMessage(data.message);
  } catch (error) {
    showError(error);
  }
}

function editProduct(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productStock').value = product.stock;
  document.getElementById('productEmoji').value = product.emoji || '';
  document.getElementById('productName').focus();
}

function clearProductForm() {
  ['productId', 'productName', 'productDescription', 'productPrice', 'productStock', 'productEmoji'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
}

async function deleteProduct(id) {
  if (!window.confirm('Excluir este prato?')) return;
  try {
    const data = await api(`products.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadProducts();
    showMessage(data.message);
  } catch (error) {
    showError(error);
  }
}

function kitchenStockStatus(item) {
  if (Number(item.quantity) <= 0) return { label: 'Sem estoque', className: 'danger' };
  if (Number(item.quantity) <= Number(item.minStock)) return { label: 'Estoque baixo', className: 'warning' };
  return { label: 'Normal', className: 'success' };
}

function kitchenStockValue(item) {
  return Number(item.quantity || 0) * Number(item.unitCost || 0);
}

async function saveKitchenItem(event) {
  event.preventDefault();
  const id = Number(document.getElementById('kitchenItemId').value || 0);
  const body = {
    id,
    name: document.getElementById('kitchenName').value.trim(),
    category: document.getElementById('kitchenCategory').value,
    unit: document.getElementById('kitchenUnit').value,
    quantity: Number(document.getElementById('kitchenQuantity').value),
    minStock: Number(document.getElementById('kitchenMinStock').value),
    unitCost: Number(document.getElementById('kitchenUnitCost').value || 0),
    supplier: document.getElementById('kitchenSupplier').value.trim(),
    location: document.getElementById('kitchenLocation').value.trim()
  };

  try {
    const data = await api('inventory.php', { method: id ? 'PUT' : 'POST', body });
    clearKitchenForm();
    await loadInventory();
    showMessage(data.message);
  } catch (error) {
    showError(error);
  }
}

function editKitchenItem(id) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;
  document.getElementById('kitchenItemId').value = item.id;
  document.getElementById('kitchenName').value = item.name;
  document.getElementById('kitchenCategory').value = item.category;
  document.getElementById('kitchenUnit').value = item.unit;
  document.getElementById('kitchenQuantity').value = item.quantity;
  document.getElementById('kitchenMinStock').value = item.minStock;
  document.getElementById('kitchenUnitCost').value = item.unitCost || 0;
  document.getElementById('kitchenSupplier').value = item.supplier || '';
  document.getElementById('kitchenLocation').value = item.location || '';
  document.getElementById('kitchenName').focus();
  document.getElementById('kitchen-stock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearKitchenForm() {
  ['kitchenItemId', 'kitchenName', 'kitchenQuantity', 'kitchenMinStock', 'kitchenUnitCost', 'kitchenSupplier', 'kitchenLocation'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  if (document.getElementById('kitchenCategory')) document.getElementById('kitchenCategory').value = 'Alimento';
  if (document.getElementById('kitchenUnit')) document.getElementById('kitchenUnit').value = 'kg';
}

async function deleteKitchenItem(id) {
  const item = state.inventory.find(i => i.id === id);
  if (!item || !window.confirm(`Excluir ${item.name} do estoque da cozinha?`)) return;
  try {
    const data = await api(`inventory.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadInventory();
    showMessage(data.message);
  } catch (error) {
    showError(error);
  }
}

async function registerInventoryMovement(id, type) {
  const inputElement = document.getElementById(`inventoryMove-${id}`);
  const quantity = Number(inputElement?.value || 0);
  if (quantity <= 0) return showMessage('Informe uma quantidade maior que zero.', 'error');

  try {
    const data = await api('inventory.php', { method: 'POST', body: { action: 'movement', id, type, quantity } });
    await loadInventory();
    showMessage(data.message);
  } catch (error) {
    showError(error);
  }
}

async function saveCoupon(event) {
  event.preventDefault();
  try {
    const data = await api('coupons.php', {
      method: 'POST',
      body: {
        code: document.getElementById('couponNewCode').value.trim(),
        type: document.getElementById('couponType').value,
        value: Number(document.getElementById('couponValue').value)
      }
    });
    await loadCoupons();
    showMessage(data.message);
  } catch (error) {
    showError(error);
  }
}

async function toggleCoupon(id) {
  const coupon = state.coupons.find(c => c.id === id);
  if (!coupon) return;
  try {
    await api('coupons.php', { method: 'PUT', body: { id, active: !coupon.active } });
    await loadCoupons();
    render();
  } catch (error) {
    showError(error);
  }
}

async function changeOrderStatus(id, status) {
  try {
    await api('orders.php', { method: 'PUT', body: { id, status } });
    await loadOrders();
    if (state.view === 'admin') await loadDashboard();
    render();
  } catch (error) {
    showError(error);
  }
}

function userIconSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z" fill="currentColor"/></svg>`;
}

function userBadge(user) {
  if (!user) return '';
  return `<div class="user-badge" title="Usuário logado"><span class="user-avatar">${userIconSvg()}</span><span class="user-badge-text"><strong>${e(user.name)}</strong><small>${user.role === 'admin' ? 'Administrador' : 'Cliente'}</small></span></div>`;
}

function navbar() {
  const user = getSession();
  return `<header class="topbar"><div class="container topbar-inner"><a class="brand" href="#" onclick="go('home'); return false;"><span class="brand-badge">🍽️</span><span>Pedido Fácil</span></a><nav class="nav-actions">
    ${user?.role === 'client' ? `<button class="btn btn-outline" onclick="go('home')">Cardápio</button><button class="btn btn-outline" onclick="go('orders')">Meus pedidos</button><button class="btn btn-primary cart-nav-btn" onclick="go('cart')">Carrinho <span>${cartCount()}</span></button>${userBadge(user)}<button class="btn" onclick="logout()">Sair</button>` : ''}
    ${user?.role === 'admin' ? `<button class="btn btn-outline" onclick="go('admin')">Administração</button><button class="btn btn-outline" onclick="go('home')">Ver cardápio</button>${userBadge(user)}<button class="btn" onclick="logout()">Sair</button>` : ''}
    ${!user ? `<button class="btn btn-outline" onclick="go('login')">Entrar</button><button class="btn btn-primary" onclick="go('register')">Criar conta</button>` : ''}
  </nav></div></header>`;
}

function messageHtml() {
  if (!state.message) return '';
  return `<div class="alert ${state.message.type === 'error' ? 'error' : 'success'}">${e(state.message.text)}</div>`;
}

function homeView() {
  const user = getSession();
  return `${navbar()}<main class="page client-page"><div class="container">${messageHtml()}
    <div class="client-menu-header"><div><span class="client-eyebrow">Pedido Fácil</span><h1>Cardápio</h1><p>Escolha seus pratos favoritos e adicione ao pedido.</p></div>
      ${user?.role === 'client' ? `<button class="client-cart-summary" onclick="go('cart')"><span class="client-cart-icon">🛒</span><span><strong>${cartCount()}</strong><small>${cartCount() === 1 ? 'item no carrinho' : 'itens no carrinho'}</small></span></button>` : ''}
    </div>
    <section class="grid-products client-products">${state.products.map(product => `<article class="product-card client-product-card"><div class="product-visual">${e(product.emoji || '🍽️')}</div><div class="product-body"><h3>${e(product.name)}</h3><p class="muted product-description">${e(product.description || 'Sem descrição.')}</p><div class="product-meta"><span class="price">${currency(product.price)}</span><span class="badge ${product.stock > 0 ? 'success' : 'danger'}">${product.stock > 0 ? 'Disponível' : 'Esgotado'}</span></div>${user?.role === 'client' ? `<button class="btn btn-primary btn-block client-add-btn" ${product.stock <= 0 ? 'disabled' : ''} onclick="addToCart(${product.id})">Adicionar ao pedido</button>` : user?.role === 'admin' ? '<div class="admin-preview-note">Visualização do cardápio do cliente</div>' : `<button class="btn btn-primary btn-block client-add-btn" onclick="go('login')">Entrar para pedir</button>`}</div></article>`).join('')}</section>
  </div></main>${footer()}`;
}

function loginView() {
  return `${navbar()}<main class="auth-wrap"><section class="auth-card">${messageHtml()}<h1>Entrar</h1><p class="muted">Use sua conta de cliente ou o administrador padrão.</p><form onsubmit="login(event)" class="stack"><div class="form-group"><label>E-mail</label><input id="email" type="email" required placeholder="voce@email.com" /></div><div class="form-group"><label>Senha</label><input id="password" type="password" required placeholder="Sua senha" /></div><button class="btn btn-primary btn-block" type="submit">Entrar</button></form><p class="muted" style="margin-top:18px">Admin: <strong>admin@admin.com</strong> / <strong>admin123</strong></p><button class="btn btn-outline btn-block" onclick="go('register')">Criar conta de cliente</button></section></main>`;
}

function registerView() {
  return `${navbar()}<main class="auth-wrap"><section class="auth-card">${messageHtml()}<h1>Criar conta</h1><p class="muted">Cadastro simples para realizar seus pedidos.</p><form onsubmit="register(event)" class="stack"><div class="form-group"><label>Nome</label><input id="registerName" required /></div><div class="form-group"><label>Telefone</label><input id="registerPhone" required placeholder="(67) 99999-9999" /></div><div class="form-group"><label>E-mail</label><input id="registerEmail" type="email" required /></div><div class="form-group"><label>Senha</label><input id="registerPassword" type="password" minlength="4" required /></div><button class="btn btn-primary btn-block" type="submit">Cadastrar</button></form></section></main>`;
}

function cartView() {
  const items = cartDetails();
  const totals = calculateCartTotal();
  return `${navbar()}<main class="page"><div class="container">${messageHtml()}<div class="section-header"><div><h1>Carrinho</h1><p class="muted">Atualize quantidades, remova itens e confira o total.</p></div><button class="btn btn-outline" onclick="go('home')">Continuar comprando</button></div><section class="panel">${items.length ? `<div class="table-wrap"><table><thead><tr><th>Prato</th><th>Valor</th><th>Quantidade</th><th>Subtotal</th><th></th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${e(item.product.emoji || '')} ${e(item.product.name)}</strong></td><td>${currency(item.product.price)}</td><td><div class="qty-control"><button onclick="updateCart(${item.productId}, -1)">−</button><strong>${item.quantity}</strong><button onclick="updateCart(${item.productId}, 1)">+</button></div></td><td>${currency(item.subtotal)}</td><td><button class="btn btn-danger btn-sm" onclick="removeFromCart(${item.productId})">Remover</button></td></tr>`).join('')}</tbody></table></div><div class="summary"><div class="summary-row total"><span>Total</span><span>${currency(totals.total)}</span></div><button class="btn btn-primary btn-block" onclick="go('checkout')">Finalizar compra</button></div>` : `<div class="empty"><h3>Seu carrinho está vazio</h3><p>Adicione algum prato para continuar.</p><button class="btn btn-primary" onclick="go('home')">Ver cardápio</button></div>`}</section></div></main>${footer()}`;
}

function checkoutView() {
  const user = getSession();
  const items = cartDetails();
  if (!items.length) return cartView();
  const totals = calculateCartTotal(state.checkoutCoupon);
  return `${navbar()}<main class="page"><div class="container">${messageHtml()}<div class="section-header"><div><h1>Finalizar compra</h1><p class="muted">Confirme seus dados e a forma de pagamento.</p></div><button class="btn btn-outline" onclick="go('cart')">Voltar ao carrinho</button></div><div class="admin-grid"><section class="panel"><h2>Dados do cliente</h2><form onsubmit="finalizeOrder(event)" class="form-grid"><div class="form-group full"><label>Nome do cliente</label><input id="customerName" value="${e(user?.name || '')}" required /></div><div class="form-group full"><label>Número de telefone</label><input id="customerPhone" value="${e(user?.phone || '')}" required /></div><div class="form-group full"><label>Forma de pagamento</label><select id="paymentMethod"><option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Dinheiro">Dinheiro</option></select></div><div class="form-group full"><label>Cupom de desconto</label><div class="actions"><input id="couponCode" placeholder="Ex.: BEMVINDO10" value="${e(state.checkoutCoupon?.code || '')}" /><button class="btn" type="button" onclick="applyCoupon()">Aplicar</button></div></div><div class="form-group full"><button class="btn btn-success btn-block" type="submit">Confirmar e salvar pedido</button></div></form></section><section class="panel"><h2>Resumo</h2><div class="stack">${items.map(item => `<div class="summary-row"><span>${item.quantity}x ${e(item.product.name)}</span><strong>${currency(item.subtotal)}</strong></div>`).join('')}<div class="summary-row"><span>Subtotal</span><strong>${currency(totals.subtotal)}</strong></div><div class="summary-row"><span>Desconto</span><strong>− ${currency(totals.discount)}</strong></div><div class="summary-row total"><span>Total</span><span>${currency(totals.total)}</span></div></div></section></div></div></main>`;
}

function orderCard(order, admin = false) {
  return `<article class="order-card"><div class="order-top"><div><strong>${e(order.number)}</strong><div class="muted">${formatDate(order.createdAt)}</div></div><span class="badge ${order.status === 'Concluído' ? 'success' : order.status === 'Cancelado' ? 'danger' : 'warning'}">${e(order.status)}</span></div><p><strong>Cliente:</strong> ${e(order.customerName)} · ${e(order.customerPhone)}</p><ul class="order-items">${(order.items || []).map(item => `<li>${item.quantity}x ${e(item.name)} — ${currency(item.subtotal)}</li>`).join('')}</ul><p><strong>Pagamento:</strong> ${e(order.paymentMethod)}${order.coupon ? ` · Cupom: ${e(order.coupon)}` : ''}</p><p><strong>Total:</strong> ${currency(order.total)}</p>${admin ? `<div class="actions"><select onchange="changeOrderStatus(${order.id}, this.value)">${['Recebido', 'Em preparo', 'Pronto', 'Concluído', 'Cancelado'].map(status => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>` : ''}</article>`;
}

function ordersView() {
  return `${navbar()}<main class="page"><div class="container">${messageHtml()}<div class="section-header"><div><h1>Meus pedidos</h1><p class="muted">Histórico dos pedidos realizados.</p></div></div><div class="stack">${state.orders.length ? state.orders.map(order => orderCard(order)).join('') : '<div class="panel empty"><h3>Nenhum pedido realizado</h3><p>Seu histórico aparecerá aqui.</p></div>'}</div></div></main>${footer()}`;
}

function adminSidebar(active) {
  const links = [['admin', '▦', 'Dashboard'], ['admin-orders', '🧾', 'Pedidos'], ['admin-menu', '🍽️', 'Cardápio'], ['admin-inventory', '📦', 'Estoque da cozinha'], ['admin-coupons', '🏷️', 'Cupons'], ['admin-cash', '💰', 'Fluxo de caixa']];
  return `<aside class="admin-sidebar"><div class="admin-sidebar-title">Gerenciamento</div><nav class="admin-sidebar-nav">${links.map(([view, icon, label]) => `<button class="admin-nav-link ${active === view ? 'active' : ''}" onclick="go('${view}')"><span>${icon}</span>${label}</button>`).join('')}</nav></aside>`;
}

function adminPage(active, title, subtitle, content) {
  return `${navbar()}<main class="admin-page"><div class="container admin-shell">${adminSidebar(active)}<section class="admin-content">${messageHtml()}<div class="admin-page-header"><div><h1>${e(title)}</h1><p>${e(subtitle)}</p></div></div>${content}</section></div></main>${footer()}`;
}

function adminView() {
  const data = state.dashboard || { metrics: {}, recentOrders: [], recentMovements: [], lowStock: [] };
  const m = data.metrics || {};
  const content = `<section class="stats-grid stats-grid-admin"><button class="stat-card stat-link" onclick="go('admin-orders')"><span>Total de pedidos</span><strong>${m.totalOrders || 0}</strong><small>Ver pedidos</small></button><button class="stat-card stat-link" onclick="go('admin-orders')"><span>Pedidos em aberto</span><strong>${m.openOrders || 0}</strong><small>Acompanhar produção</small></button><button class="stat-card stat-link" onclick="go('admin-menu')"><span>Pratos disponíveis</span><strong>${m.productStock || 0}</strong><small>Gerenciar cardápio</small></button><button class="stat-card stat-link ${m.lowStockItems ? 'stat-warning' : ''}" onclick="go('admin-inventory')"><span>Insumos críticos</span><strong>${m.lowStockItems || 0}</strong><small>${m.lowStockItems ? 'Precisam de reposição' : 'Estoque saudável'}</small></button><button class="stat-card stat-link" onclick="go('admin-inventory')"><span>Valor dos insumos</span><strong>${currency(m.inventoryValue)}</strong><small>Estoque da cozinha</small></button><button class="stat-card stat-link" onclick="go('admin-cash')"><span>Fluxo de caixa</span><strong>${currency(m.revenue)}</strong><small>Consultar movimentação</small></button></section>
  ${(data.lowStock || []).length ? `<div class="alert warning-alert"><strong>Atenção ao estoque:</strong> ${data.lowStock.map(item => `${e(item.name)} (${formatNumber(item.quantity)} ${e(item.unit)})`).join(', ')}. <button class="btn btn-sm" onclick="go('admin-inventory')">Abrir estoque</button></div>` : ''}
  <div class="admin-grid dashboard-grid"><section class="panel"><div class="section-header"><div><h2>Pedidos recentes</h2><p class="muted">Últimos pedidos recebidos.</p></div><button class="btn btn-sm" onclick="go('admin-orders')">Ver todos</button></div><div class="stack compact-stack">${(data.recentOrders || []).length ? data.recentOrders.map(order => `<div class="dashboard-list-item"><div><strong>${e(order.number)}</strong><small>${e(order.customerName)} · ${formatDate(order.createdAt)}</small></div><div class="dashboard-list-right"><span class="badge ${order.status === 'Concluído' ? 'success' : order.status === 'Cancelado' ? 'danger' : 'warning'}">${e(order.status)}</span><strong>${currency(order.total)}</strong></div></div>`).join('') : '<div class="empty compact-empty">Nenhum pedido ainda.</div>'}</div></section><section class="panel"><div class="section-header"><div><h2>Movimentações do estoque</h2><p class="muted">Últimas entradas e saídas.</p></div><button class="btn btn-sm" onclick="go('admin-inventory')">Ver estoque</button></div><div class="stack compact-stack">${(data.recentMovements || []).length ? data.recentMovements.map(move => `<div class="dashboard-list-item"><div><strong>${e(move.itemName)}</strong><small>${formatDate(move.createdAt)} · ${e(move.note || 'Sem observação')}</small></div><div class="dashboard-list-right"><span class="badge ${move.type === 'Entrada' ? 'success' : 'warning'}">${e(move.type)}</span><strong>${formatNumber(move.quantity)} ${e(move.unit)}</strong></div></div>`).join('') : '<div class="empty compact-empty">Nenhuma movimentação registrada.</div>'}</div></section></div>`;
  return adminPage('admin', 'Dashboard', 'Visão geral da operação e atalhos para cada área administrativa.', content);
}

function adminOrdersView() {
  const content = `<div class="section-header admin-section-tools"><div><h2>Todos os pedidos</h2><p class="muted">Atualize o andamento dos pedidos dos clientes.</p></div><span class="badge">${state.orders.length} pedidos</span></div><div class="stack">${state.orders.length ? state.orders.map(order => orderCard(order, true)).join('') : '<div class="panel empty">Nenhum pedido ainda.</div>'}</div>`;
  return adminPage('admin-orders', 'Pedidos', 'Acompanhe o atendimento e altere o status de cada pedido.', content);
}

function adminMenuView() {
  const products = state.products;
  const content = `<div class="admin-grid admin-management-grid"><section class="panel"><div class="section-header"><div><h2>Cadastro de pratos</h2><p class="muted">Cadastre ou edite os itens vendidos ao cliente.</p></div></div><form onsubmit="saveProduct(event)" class="form-grid"><input type="hidden" id="productId" /><div class="form-group"><label>Nome</label><input id="productName" required /></div><div class="form-group"><label>Emoji</label><input id="productEmoji" placeholder="🍔" maxlength="4" /></div><div class="form-group full"><label>Descrição</label><input id="productDescription" /></div><div class="form-group"><label>Valor</label><input id="productPrice" type="number" step="0.01" min="0" required /></div><div class="form-group"><label>Disponibilidade</label><input id="productStock" type="number" min="0" required /><small class="field-hint">Quantidade disponível para venda.</small></div><div class="form-group full actions"><button class="btn btn-primary" type="submit">Salvar prato</button><button class="btn" type="button" onclick="clearProductForm()">Limpar</button></div></form></section><section class="panel"><div class="section-header"><div><h2>Resumo do cardápio</h2><p class="muted">${products.length} itens cadastrados.</p></div><button class="btn btn-outline btn-sm" onclick="go('home')">Visualizar como cliente</button></div><div class="menu-mini-preview">${products.slice(0, 5).map(p => `<div><span>${e(p.emoji || '🍽️')}</span><p><strong>${e(p.name)}</strong><small>${currency(p.price)} · ${p.stock} disponíveis</small></p></div>`).join('')}</div></section></div><section class="panel admin-table-panel"><div class="section-header"><div><h2>Cardápio e disponibilidade</h2><p class="muted">Controle exatamente o que aparece para o cliente.</p></div></div><div class="table-wrap"><table><thead><tr><th>Prato</th><th>Preço</th><th>Disponível</th><th>Ações</th></tr></thead><tbody>${products.map(p => `<tr><td><strong>${e(p.emoji || '')} ${e(p.name)}</strong><div class="muted">${e(p.description || '')}</div></td><td>${currency(p.price)}</td><td><span class="badge ${p.stock > 5 ? 'success' : p.stock > 0 ? 'warning' : 'danger'}">${p.stock}</span></td><td class="actions"><button class="btn btn-sm" onclick="editProduct(${p.id})">Editar</button><button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Excluir</button></td></tr>`).join('')}</tbody></table></div></section>`;
  return adminPage('admin-menu', 'Cardápio', 'Gerencie os pratos, preços e disponibilidade para os clientes.', content);
}

function adminInventoryView() {
  const items = state.inventory;
  const lowStockItems = items.filter(item => Number(item.quantity) <= Number(item.minStock));
  const content = `${lowStockItems.length ? `<div class="alert warning-alert"><strong>Reposição necessária:</strong> ${lowStockItems.map(item => `${e(item.name)} (${formatNumber(item.quantity)} ${e(item.unit)})`).join(', ')}.</div>` : ''}<section class="panel" id="kitchen-stock"><div class="section-header"><div><h2>Cadastro de alimentos e suprimentos</h2><p class="muted">Controle os insumos usados na cozinha separadamente dos pratos vendidos.</p></div><span class="badge ${lowStockItems.length ? 'warning' : 'success'}">${items.length} insumos</span></div><form onsubmit="saveKitchenItem(event)" class="form-grid inventory-form"><input type="hidden" id="kitchenItemId" /><div class="form-group"><label>Insumo / produto</label><input id="kitchenName" required placeholder="Ex.: Arroz, carne, luvas" /></div><div class="form-group"><label>Categoria</label><select id="kitchenCategory"><option>Alimento</option><option>Bebida</option><option>Descartável</option><option>Higiene</option><option>Limpeza</option><option>Outro</option></select></div><div class="form-group"><label>Unidade</label><select id="kitchenUnit"><option value="kg">kg</option><option value="g">g</option><option value="l">litro</option><option value="ml">ml</option><option value="un">unidade</option><option value="cx">caixa</option><option value="pct">pacote</option></select></div><div class="form-group"><label>Quantidade atual</label><input id="kitchenQuantity" type="number" min="0" step="0.001" required placeholder="0" /></div><div class="form-group"><label>Estoque mínimo</label><input id="kitchenMinStock" type="number" min="0" step="0.001" required placeholder="0" /><small class="field-hint">Gera alerta quando atingir este valor.</small></div><div class="form-group"><label>Custo por unidade</label><input id="kitchenUnitCost" type="number" min="0" step="0.01" placeholder="0,00" /></div><div class="form-group"><label>Fornecedor</label><input id="kitchenSupplier" placeholder="Nome do fornecedor" /></div><div class="form-group"><label>Local de armazenamento</label><input id="kitchenLocation" placeholder="Despensa, freezer, prateleira..." /></div><div class="form-group full actions"><button class="btn btn-primary" type="submit">Salvar insumo</button><button class="btn" type="button" onclick="clearKitchenForm()">Limpar formulário</button></div></form><div class="table-wrap inventory-table-wrap"><table class="inventory-table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Custo</th><th>Situação</th><th>Entrada / saída</th><th>Ações</th></tr></thead><tbody>${items.length ? items.map(item => { const status = kitchenStockStatus(item); return `<tr class="${status.className === 'warning' || status.className === 'danger' ? 'stock-low-row' : ''}"><td><strong>${e(item.name)}</strong><div class="muted inventory-subtext">${e(item.supplier || 'Sem fornecedor')}${item.location ? ` · ${e(item.location)}` : ''}</div></td><td>${e(item.category)}</td><td><strong>${formatNumber(item.quantity)} ${e(item.unit)}</strong></td><td>${formatNumber(item.minStock)} ${e(item.unit)}</td><td>${currency(item.unitCost)}<div class="muted inventory-subtext">Total: ${currency(kitchenStockValue(item))}</div></td><td><span class="badge ${status.className}">${status.label}</span></td><td><div class="inventory-movement"><input id="inventoryMove-${item.id}" type="number" min="0.001" step="0.001" placeholder="Qtd." /><button class="btn btn-success btn-sm" onclick="registerInventoryMovement(${item.id}, 'Entrada')">+ Entrada</button><button class="btn btn-danger btn-sm" onclick="registerInventoryMovement(${item.id}, 'Saída')">− Saída</button></div></td><td class="actions"><button class="btn btn-sm" onclick="editKitchenItem(${item.id})">Editar</button><button class="btn btn-danger btn-sm" onclick="deleteKitchenItem(${item.id})">Excluir</button></td></tr>`; }).join('') : '<tr><td colspan="8" class="empty">Nenhum insumo cadastrado.</td></tr>'}</tbody></table></div></section><section class="panel admin-table-panel"><div class="section-header"><div><h2>Últimas movimentações</h2><p class="muted">Histórico recente de entradas, saídas e ajustes.</p></div></div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Insumo</th><th>Movimento</th><th>Quantidade</th><th>Observação</th></tr></thead><tbody>${state.movements.length ? state.movements.slice(0, 12).map(move => `<tr><td>${formatDate(move.createdAt)}</td><td><strong>${e(move.itemName)}</strong></td><td><span class="badge ${move.type === 'Entrada' ? 'success' : 'warning'}">${e(move.type)}</span></td><td>${formatNumber(move.quantity)} ${e(move.unit)}</td><td class="muted">${e(move.note || '—')}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Ainda não há movimentações registradas.</td></tr>'}</tbody></table></div></section>`;
  return adminPage('admin-inventory', 'Estoque da cozinha', 'Cadastre alimentos e suprimentos, registre entradas e saídas e acompanhe níveis mínimos.', content);
}

function adminCouponsView() {
  const content = `<div class="admin-grid admin-management-grid"><section class="panel"><div class="section-header"><div><h2>Novo cupom</h2><p class="muted">Crie cupons percentuais ou de valor fixo.</p></div></div><form onsubmit="saveCoupon(event)" class="form-grid"><div class="form-group full"><label>Código</label><input id="couponNewCode" required placeholder="PROMO10" /></div><div class="form-group"><label>Tipo</label><select id="couponType"><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></div><div class="form-group"><label>Valor</label><input id="couponValue" type="number" min="0" step="0.01" required /></div><div class="form-group full"><button class="btn btn-primary" type="submit">Cadastrar cupom</button></div></form></section><section class="panel"><div class="section-header"><div><h2>Cupons cadastrados</h2><p class="muted">Ative ou desative promoções sem excluir o cadastro.</p></div></div><div class="stack coupon-list">${state.coupons.length ? state.coupons.map(c => `<div class="coupon-row"><div><strong>${e(c.code)}</strong><small>${c.type === 'percent' ? `${c.value}% de desconto` : `${currency(c.value)} de desconto`}</small></div><button class="btn btn-sm ${c.active ? 'btn-success' : ''}" onclick="toggleCoupon(${c.id})">${c.active ? 'Ativo' : 'Inativo'}</button></div>`).join('') : '<div class="empty compact-empty">Nenhum cupom cadastrado.</div>'}</div></section></div>`;
  return adminPage('admin-coupons', 'Cupons de desconto', 'Gerencie promoções que podem ser aplicadas no fechamento do pedido.', content);
}

function adminCashView() {
  const cash = state.cash || { summary: { paymentTotals: {} }, orders: [] };
  const s = cash.summary || { paymentTotals: {} };
  const paymentTotals = s.paymentTotals || {};
  const content = `<section class="stats-grid cash-stats"><div class="stat-card"><span>Receita registrada</span><strong>${currency(s.revenue)}</strong></div><div class="stat-card"><span>Pedidos válidos</span><strong>${s.validOrders || 0}</strong></div><div class="stat-card"><span>Ticket médio</span><strong>${currency(s.averageTicket)}</strong></div><div class="stat-card"><span>Descontos concedidos</span><strong>${currency(s.discounts)}</strong></div></section><div class="admin-grid dashboard-grid"><section class="panel"><div class="section-header"><div><h2>Por forma de pagamento</h2><p class="muted">Valores dos pedidos não cancelados.</p></div></div><div class="stack compact-stack">${Object.keys(paymentTotals).length ? Object.entries(paymentTotals).map(([payment, value]) => `<div class="summary-row cash-method-row"><span>${e(payment)}</span><strong>${currency(value)}</strong></div>`).join('') : '<div class="empty compact-empty">Sem movimentação financeira.</div>'}</div></section><section class="panel"><div class="section-header"><div><h2>Observação</h2><p class="muted">Visão operacional do caixa.</p></div></div><p class="muted">A receita é calculada diretamente no MySQL/MariaDB a partir dos pedidos não cancelados. Esta versão registra a forma de pagamento informada no checkout, mas não integra um gateway financeiro real.</p></section></div><section class="panel admin-table-panel"><div class="section-header"><div><h2>Movimentação por pedido</h2><p class="muted">Histórico financeiro dos pedidos.</p></div></div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Pagamento</th><th>Status</th><th>Total</th></tr></thead><tbody>${cash.orders.length ? cash.orders.map(order => `<tr><td>${formatDate(order.createdAt)}</td><td><strong>${e(order.number)}</strong></td><td>${e(order.customerName)}</td><td>${e(order.paymentMethod)}</td><td><span class="badge ${order.status === 'Concluído' ? 'success' : order.status === 'Cancelado' ? 'danger' : 'warning'}">${e(order.status)}</span></td><td><strong>${currency(order.total)}</strong></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Nenhuma movimentação registrada.</td></tr>'}</tbody></table></div></section>`;
  return adminPage('admin-cash', 'Fluxo de caixa', 'Acompanhe receita, descontos, ticket médio e valores por forma de pagamento.', content);
}

function footer() {
  return `<footer class="footer"><div class="container">Pedido Fácil · PHP puro + JavaScript + MySQL/MariaDB</div></footer>`;
}

function renderLoading() {
  const app = document.getElementById('app');
  if (app) app.innerHTML = `${navbar()}<main class="page"><div class="container"><div class="panel empty"><div class="loader"></div><p>Carregando...</p></div></div></main>`;
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  const views = { home: homeView, login: loginView, register: registerView, cart: cartView, checkout: checkoutView, orders: ordersView, admin: adminView, 'admin-orders': adminOrdersView, 'admin-menu': adminMenuView, 'admin-inventory': adminInventoryView, 'admin-coupons': adminCouponsView, 'admin-cash': adminCashView };
  app.innerHTML = (views[state.view] || homeView)();
}

async function init() {
  renderLoading();
  try {
    await loadSession();
    await loadForView('home');
    state.view = 'home';
    render();
  } catch (error) {
    document.getElementById('app').innerHTML = `<main class="auth-wrap"><section class="auth-card"><h1>Erro ao iniciar</h1><div class="alert error">${e(error.message)}</div><p class="muted">Confira o <strong>dbconfig.php</strong>, importe <strong>database/database.sql</strong> e acesse o projeto por um servidor PHP.</p></section></main>`;
  }
}

init();
