(() => {
  const $ = id => document.getElementById(id);
  const escapeHtml = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => `₹${Number(n || 0).toFixed(0)}`;
  let adminUser, menu = [], categories = [], settings = {}, editingImageUrl = '';
  const modal = bootstrap.Modal.getOrCreateInstance($('itemModal'));
  function notice(message, bad = false) { const el = $('adminNotice'); el.textContent = message; el.className = `admin-notice ${bad ? 'is-error' : 'is-success'}`; el.classList.remove('d-none'); setTimeout(() => el.classList.add('d-none'), 4500); }
  async function requireAdmin() {
    if (!window.db) { location.href = 'login.html'; return false; }
    const { data: { session } } = await db.auth.getSession();
    if (!session) { location.href = 'login.html'; return false; }
    const { data: role, error } = await db.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (error || !role) { await db.auth.signOut(); location.href = 'login.html'; return false; }
    adminUser = session.user; $('adminEmail').textContent = adminUser.email; return true;
  }
  async function loadAll() {
    const [m, c, s] = await Promise.all([
      db.from('menu_items').select('*').order('created_at', { ascending: false }),
      db.from('categories').select('*').order('sort_order'),
      db.from('restaurant_settings').select('*').eq('id', 1).maybeSingle()
    ]);
    if (m.error || c.error || s.error) { notice((m.error || c.error || s.error).message, true); return; }
    menu = m.data || []; categories = c.data || []; settings = s.data || {};
    renderStats(); renderMenuTable(); renderCategories(); fillSettings();
  }
  function renderStats() {
    $('statTotal').textContent = menu.length;
    $('statAvailable').textContent = menu.filter(x => x.is_available).length;
    $('statSoldout').textContent = menu.filter(x => !x.is_available).length;
    $('statCategories').textContent = categories.length;
    $('adminRestaurantName').textContent = settings.restaurant_name || 'Restaurant Admin';
  }
  function renderMenuTable() {
    $('menuTableBody').innerHTML = menu.length ? menu.map(x => {
      const cat = categories.find(c => c.id === x.category_id);
    return `<tr><td><div class="table-product"><img src="${escapeHtml(x.image_url || 'https://placehold.co/80x80?text=Food')}" alt=""><div><strong>${escapeHtml(x.name)}</strong><small>${x.is_bestseller ? '★ Bestseller' : ''}</small></div></div></td><td>${escapeHtml(cat?.name || '—')}</td><td><strong>${money(x.price)}</strong></td><td><span class="status-pill ${x.is_available ? 'available' : 'soldout'}">${x.is_available ? 'Available' : 'Sold out'}</span></td><td class="text-end"><div class="table-actions"><button class="btn btn-sm btn-light" data-edit="${x.id}" title="Edit"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-light text-danger" data-delete="${x.id}" title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>`;
  }).join(''): '<tr><td colspan="5" class="text-center py-5 text-muted">No menu items yet. Add your first item.</td></tr>';
  $('menuTableBody').querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.edit)));
  $('menuTableBody').querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteItem(b.dataset.delete)));
}
  function renderCategories() {
  $('categoryList').innerHTML = categories.map(c => `<div class="category-row"><span>${escapeHtml(c.name)}</span><div><button class="btn btn-sm btn-light" data-rename="${c.id}"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-light text-danger" data-delcat="${c.id}"><i class="bi bi-trash"></i></button></div></div>`).join('') || '<p class="text-muted">No categories created.</p>';
  $('itemCategory').innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  $('categoryList').querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', () => renameCategory(b.dataset.rename)));
  $('categoryList').querySelectorAll('[data-delcat]').forEach(b => b.addEventListener('click', () => deleteCategory(b.dataset.delcat)));
}
function fillSettings() {
  $('settingName').value = settings.restaurant_name || '';
  $('settingWhatsapp').value = settings.whatsapp_number || '';
  $('settingPhone').value = settings.contact_phone || '';
  $('settingHours').value = settings.opening_hours || '';
  $('settingAddress').value = settings.address || '';
  $('settingDelivery').value = settings.delivery_charge ?? 0;
  $('settingMinimum').value = settings.minimum_order_amount ?? 0;
}
function openAdd() {
  $('itemForm').reset(); $('itemId').value = ''; if ($('itemType')) $('itemType').value = 'Veg'; editingImageUrl = ''; $('itemModalTitle').textContent = 'Add menu item'; $('currentImage').textContent = ''; renderCategories(); modal.show();
}
function openEdit(id) {
  const x = menu.find(i => i.id === id); if (!x) return;
  $('itemForm').reset(); $('itemId').value = x.id; $('itemName').value = x.name; $('itemCategory').value = x.category_id; $('itemDescription').value = x.description || '';
  $('itemPrice').value = x.price; if ($('itemType')) $('itemType').value = x.food_type || 'Veg'; $('itemAvailable').value = String(x.is_available); $('itemBestseller').checked = !!x.is_bestseller;
  editingImageUrl = x.image_url || ''; $('currentImage').textContent = editingImageUrl ? 'An image is currently saved. Upload a new one to replace it.' : 'No image uploaded.';
  $('itemModalTitle').textContent = 'Edit menu item'; modal.show();
}
async function uploadImage(file) {
  if (!file) return editingImageUrl;
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use JPG, PNG or WebP images.');
  const ext = file.name.split('.').pop().toLowerCase(), path = `menu/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from('menu-images').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = db.storage.from('menu-images').getPublicUrl(path);
  return data.publicUrl;
}
$('itemForm').addEventListener('submit', async e => {
  e.preventDefault(); const btn = $('saveItemBtn'); btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const image = await uploadImage($('itemImage').files[0]);
    const payload = { name: $('itemName').value.trim(), category_id: $('itemCategory').value, description: $('itemDescription').value.trim(), price: Number($('itemPrice').value), food_type: $('itemType')?.value || 'Veg', is_available: $('itemAvailable').value === 'true', is_bestseller: $('itemBestseller').checked, image_url: image || null };
    if (!payload.category_id) throw new Error('Create a category before adding a menu item.');
    const id = $('itemId').value;
    const result = id ? await db.from('menu_items').update(payload).eq('id', id) : await db.from('menu_items').insert(payload);
    if (result.error) throw result.error;
    modal.hide(); await loadAll(); notice(id ? 'Menu item updated.' : 'Menu item added.');
  } catch (err) { notice(err.message || 'Could not save item.', true); }
  finally { btn.disabled = false; btn.textContent = 'Save item'; }
});
async function deleteItem(id) {
  const x = menu.find(i => i.id === id); if (!x || !confirm(`Delete "${x.name}"? This cannot be undone.`)) return;
  const { error } = await db.from('menu_items').delete().eq('id', id);
  if (error) notice(error.message, true); else { await loadAll(); notice('Menu item deleted.'); }
}
$('categoryForm').addEventListener('submit', async e => {
  e.preventDefault(); const name = $('categoryName').value.trim(); if (!name) return;
  const { error } = await db.from('categories').insert({ name, sort_order: categories.length + 1, is_active: true });
  if (error) notice(error.message, true); else { $('categoryName').value = ''; await loadAll(); notice('Category added.'); }
});
async function renameCategory(id) {
  const c = categories.find(x => x.id === id); const name = prompt('New category name:', c?.name || ''); if (!name?.trim()) return;
  const { error } = await db.from('categories').update({ name: name.trim() }).eq('id', id);
  if (error) notice(error.message, true); else { await loadAll(); notice('Category updated.'); }
}
async function deleteCategory(id) {
  const c = categories.find(x => x.id === id);
  if (menu.some(x => x.category_id === id)) return notice('Move or delete this category’s menu items before deleting the category.', true);
  if (!confirm(`Delete category "${c.name}"?`)) return;
  const { error } = await db.from('categories').delete().eq('id', id);
  if (error) notice(error.message, true); else { await loadAll(); notice('Category deleted.'); }
}
$('settingsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = { id: 1, restaurant_name: $('settingName').value.trim(), whatsapp_number: $('settingWhatsapp').value.replace(/\D/g, ''), contact_phone: $('settingPhone').value.trim(), opening_hours: $('settingHours').value.trim(), address: $('settingAddress').value.trim(), delivery_charge: Number($('settingDelivery').value || 0), minimum_order_amount: Number($('settingMinimum').value || 0) };
  if (!/^\d{10,15}$/.test(payload.whatsapp_number)) return notice('Enter WhatsApp number with country code, e.g. 919876543210.', true);
  const { error } = await db.from('restaurant_settings').upsert(payload);
  if (error) notice(error.message, true); else { await loadAll(); notice('Restaurant settings saved.'); }
});
$('addItemBtn').addEventListener('click', openAdd);
$('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); location.href = 'login.html'; });
$('sidebarToggle').addEventListener('click', () => $('adminSidebar').classList.toggle('show'));
document.querySelectorAll('.sidebar-link').forEach(l => l.addEventListener('click', () => $('adminSidebar').classList.remove('show')));
(async () => { if (await requireAdmin()) { await loadAll(); db.channel('admin-menu-live').on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, loadAll).on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, loadAll).subscribe(); } })();
}) ();
