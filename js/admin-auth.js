(() => {
  const form = document.getElementById('loginForm');
  if (!window.db) { showError('Configure Supabase URL and anon key in js/config.js first.'); return; }
  function showError(msg) { const el=document.getElementById('loginError'); el.textContent=msg; el.classList.remove('d-none'); }
  db.auth.getSession().then(async ({data}) => {
    if (data.session) {
      const {data: role} = await db.from('admin_users').select('user_id').eq('user_id',data.session.user.id).maybeSingle();
      if (role) location.href='index.html';
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const btn=document.getElementById('loginBtn'); btn.disabled=true; btn.textContent='Signing in...';
    const {data,error}=await db.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});
    if (error) { showError(error.message); btn.disabled=false; btn.innerHTML='Sign in <i class="bi bi-arrow-right ms-2"></i>'; return; }
    const {data:admin,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if (roleError || !admin) { await db.auth.signOut(); showError('This account is not authorised as a restaurant administrator.'); btn.disabled=false; btn.textContent='Sign in'; return; }
    location.href='index.html';
  });
})();
