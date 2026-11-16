(() => {
  const cfg = window.RESTAURANT_CONFIG;
  const $ = (id) => document.getElementById(id);
  const money = (n) => `${cfg.currencySymbol}${Number(n || 0).toFixed(0)}`;
  const escapeHtml = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let menu = [], categories = [], settings = {}, cart = JSON.parse(localStorage.getItem('restaurant_cart') || '{}');
  let selectedCategory = 'all';
  const cartCanvas = bootstrap.Offcanvas.getOrCreateInstance($('cartCanvas'));
  const checkoutModal = bootstrap.Modal.getOrCreateInstance($('checkoutModal'));
  const toast = bootstrap.Toast.getOrCreateInstance($('siteToast'), { delay: 1600 });

  function notify(message) { $('toastMessage').textContent = message; toast.show(); }
  function saveCart() { localStorage.setItem('restaurant_cart', JSON.stringify(cart)); renderCart(); }
  function cartRows() { return Object.values(cart).filter(x => x.quantity > 0); }
  function subtotal() { return cartRows().reduce((sum, x) => sum + Number(x.price) * x.quantity, 0); }
  function delivery() { return cartRows().length ? Number(settings.delivery_charge || 0) : 0; }
  function total() { return subtotal() + delivery(); }
  function cartCount() { return cartRows().reduce((sum, x) => sum + x.quantity, 0); }

  function renderCategories() {
    const holder = $('categoryFilters');
    holder.innerHTML = `<button class="filter-chip ${selectedCategory === 'all' ? 'active' : ''}" data-category="all">All items</button>` +
      categories.map(c => `<button class="filter-chip ${selectedCategory === c.id ? 'active' : ''}" data-category="${c.id}">${escapeHtml(c.name)}</button>`).join('');
    holder.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.category; renderCategories(); renderMenu();
    }));
  }

  function filteredMenu() {
    const q = $('searchInput').value.trim().toLowerCase();
    return menu.filter(item => {
      const categoryOK = selectedCategory === 'all' || item.category_id === selectedCategory;
      const isVeg = !item.food_type || item.food_type === 'Veg';
      const queryOK = !q || `${item.name} ${item.description || ''}`.toLowerCase().includes(q);
      return categoryOK && isVeg && queryOK && item.is_available;
    });
  }

  function renderMenu() {
    const items = filteredMenu(), grid = $('menuGrid');
    grid.innerHTML = '';
    $('menuEmpty').classList.toggle('d-none', items.length !== 0);
    items.forEach(item => {
      const col = document.createElement('div'); col.className = 'col-12 col-md-6 col-xl-4';
      const image = item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80';
      col.innerHTML = `<article class="food-card">
        <div class="food-image-wrap"><img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy">
          ${item.is_bestseller ? '<span class="food-badge">Bestseller</span>' : ''}
          
        </div>
        <div class="food-card-body">
          <div class="food-card-info">
            <h3 class="food-title">${escapeHtml(item.name)}</h3>
            <p class="food-desc">${escapeHtml(item.description || '')}</p>
          </div>
          <div class="food-card-action">
            <strong class="food-price">${money(item.price)}</strong>
            <button class="btn btn-add" data-add="${item.id}">+ Cart</button>
          </div>
        </div>
      </article>`;
      grid.appendChild(col);
    });
    grid.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => addToCart(btn.dataset.add)));
  }

  function addToCart(id) {
    const item = menu.find(x => x.id === id);
    if (!item || !item.is_available) return notify('This item is currently unavailable.');
    const existing = cart[id];
    cart[id] = { id: item.id, name: item.name, price: Number(item.price), image_url: item.image_url, quantity: existing ? existing.quantity + 1 : 1 };
    saveCart(); notify('Added to cart');
  }
  function changeQty(id, delta) {
    if (!cart[id]) return;
    cart[id].quantity += delta;
    if (cart[id].quantity <= 0) delete cart[id];
    saveCart();
  }
  function renderCart() {
    const rows = cartRows(), holder = $('cartItems');
    $('cartCount').textContent = cartCount();
    $('mobileCartItems').textContent = `${cartCount()} item${cartCount() === 1 ? '' : 's'}`;
    $('mobileCartTotal').textContent = money(total());
    const hasItems = cartCount() > 0;
    $('mobileCartBar').classList.toggle('d-none', !hasItems);
    const tc = $('siteToastContainer') || document.querySelector('.toast-container');
    if (tc) tc.classList.toggle('above-cart-bar', hasItems);
    $('cartSubtotal').textContent = money(subtotal());
    $('cartDelivery').textContent = money(delivery());
    $('cartTotal').textContent = money(total());
    if (!rows.length) {
      holder.innerHTML = '<div class="cart-empty"><i class="bi bi-bag"></i><h5>Your cart is empty</h5><p>Add something delicious from the menu.</p></div>';
      $('checkoutBtn').disabled = true; return;
    }
    $('checkoutBtn').disabled = false;
    holder.innerHTML = rows.map(x => `<div class="cart-item"><img src="${escapeHtml(x.image_url || 'https://placehold.co/100x100?text=Food')}" alt=""><div class="flex-grow-1"><strong>${escapeHtml(x.name)}</strong><div class="text-muted small">${money(x.price)} each</div><div class="qty-control mt-2"><button data-minus="${x.id}" aria-label="Decrease quantity">−</button><span>${x.quantity}</span><button data-plus="${x.id}" aria-label="Increase quantity">+</button></div></div><div class="text-end"><strong>${money(x.price * x.quantity)}</strong><button class="remove-item" data-remove="${x.id}" aria-label="Remove item"><i class="bi bi-trash"></i></button></div></div>`).join('');
    holder.querySelectorAll('[data-minus]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.minus, -1)));
    holder.querySelectorAll('[data-plus]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.plus, 1)));
    holder.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { delete cart[b.dataset.remove]; saveCart(); }));
  }

  function showCheckout() {
    if (!cartCount()) return;
    if (total() < Number(settings.minimum_order_amount || 0)) {
      notify(`Minimum order is ${money(settings.minimum_order_amount)}.`); return;
    }
    $('checkoutReview').innerHTML = `<div class="d-flex justify-content-between"><span>${cartCount()} item(s)</span><strong>${money(subtotal())}</strong></div><div class="d-flex justify-content-between"><span>Delivery</span><strong>${money(delivery())}</strong></div><hr><div class="d-flex justify-content-between fs-5"><strong>Total</strong><strong>${money(total())}</strong></div>`;
    checkoutModal.show();
  }

  function createOrderId() {
    const date = new Date(), ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `ORD-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  $('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    if (!cartCount()) { checkoutModal.hide(); return notify('Your cart is empty.'); }
    const phone = $('customerPhone').value.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) { $('customerPhone').setCustomValidity('Invalid'); form.classList.add('was-validated'); $('customerPhone').reportValidity(); $('customerPhone').setCustomValidity(''); return; }
    const number = String(settings.whatsapp_number || cfg.defaultWhatsAppNumber).replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(number)) {
      notify('Restaurant WhatsApp number is not configured. Ask the admin to update settings.'); return;
    }
    const orderId = createOrderId();
    const lines = cartRows().map((x, i) => `${i + 1}. ${x.name}\n   ${x.quantity} x ${money(x.price)} = ${money(x.price * x.quantity)}`).join('\n\n');
    const address = [$('customerAddress').value.trim(), $('customerArea').value.trim(), $('customerCity').value.trim()].filter(Boolean).join(', ');
    const message = [
      `*NEW RESTAURANT ORDER*`,
      `Order ID: ${orderId}`,
      '',
      '*CUSTOMER DETAILS*',
      `Name: ${$('customerName').value.trim()}`,
      `Phone: ${phone}`,
      `Address: ${address}`,
      '',
      '*ORDER ITEMS*',
      lines,
      '',
      `Subtotal: ${money(subtotal())}`,
      `Delivery: ${money(delivery())}`,
      `*GRAND TOTAL: ${money(total())}*`,
      $('customerNotes').value.trim() ? `\nNotes: ${$('customerNotes').value.trim()}` : '',
      '',
      'Please confirm this order.'
    ].filter(Boolean).join('\n');
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.href = url;
    checkoutModal.hide(); cartCanvas.hide();
    // Cart is deliberately retained: WhatsApp does not report whether the customer pressed Send.
    notify(`Order ${orderId} is ready in WhatsApp. Please press Send there.`);
  });

  async function loadData() {
    if (!window.db) {
      $('menuGrid').innerHTML = '';
      $('menuError').classList.remove('d-none');
      $('menuError').textContent = 'Supabase is not configured yet. Add your project URL and anon key in js/config.js, then run the SQL setup.';
      return;
    }
    const [catRes, menuRes, settingsRes] = await Promise.all([
      db.from('categories').select('*').eq('is_active', true).order('sort_order'),
      db.from('menu_items').select('*').order('created_at', { ascending: false }),
      db.from('restaurant_settings').select('*').eq('id', 1).maybeSingle()
    ]);
    if (catRes.error || menuRes.error) { $('menuError').classList.remove('d-none'); console.error(catRes.error || menuRes.error); return; }
    categories = catRes.data || [];
    menu = menuRes.data || [];
    settings = settingsRes.data || {};
    $('menuError').classList.add('d-none');
    const name = settings.restaurant_name || cfg.defaultRestaurantName;
    if ($('restaurantName')) $('restaurantName').textContent = name;
    if ($('footerRestaurantName')) $('footerRestaurantName').textContent = name;
    if ($('footerNameBottom')) $('footerNameBottom').textContent = name;
    if ($('openingHours')) $('openingHours').textContent = settings.opening_hours || 'Fresh food · Made with love';
    if ($('restaurantAddress')) $('restaurantAddress').textContent = settings.address || 'Add your restaurant address in admin settings.';
    if ($('restaurantPhone')) $('restaurantPhone').textContent = settings.contact_phone || 'Contact details';
    if ($('restaurantHours')) $('restaurantHours').textContent = settings.opening_hours || '';
    renderCategories(); renderMenu(); renderCart();
  }

  $('searchInput').addEventListener('input', renderMenu);
  ['navCartBtn', 'mobileCartBtn'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', () => cartCanvas.show());
  });
  $('checkoutBtn').addEventListener('click', showCheckout);
  $('year').textContent = new Date().getFullYear();
  renderCart();
  loadData().then(() => {
    if (window.db) db.channel('public-menu-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_settings' }, loadData)
      .subscribe();
  });
})();
