const SUPABASE_URL = (window.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || '').trim();

let supabaseClient = null;

function showMessage(id, message, type) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `auth-message ${type}`;
  el.style.display = '';
}

function clearMessage(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.className = 'auth-message';
  el.style.display = 'none';
}

async function fetchUserProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('status, role')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

function switchAuthView(view) {
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  const isLogin = view === 'login';
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
  loginForm.style.display = isLogin ? '' : 'none';
  registerForm.style.display = isLogin ? 'none' : '';
  clearMessage('loginMessage');
  clearMessage('registerMessage');
}

async function handleLogin(event) {
  event.preventDefault();
  clearMessage('loginMessage');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage('loginMessage', error.message, 'error');
    return;
  }

  try {
    const userId = data?.user?.id;
    if (!userId) {
      await supabaseClient.auth.signOut();
      showMessage('loginMessage', 'Could not load user profile. Please try again.', 'error');
      return;
    }

    const profile = await fetchUserProfile(userId);
    const status = (profile?.status || '').toLowerCase();
    const role = (profile?.role || '').toLowerCase();

    if (status === 'pending') {
      await supabaseClient.auth.signOut();
      showMessage('loginMessage', 'Your account is awaiting approval from the administrator.', 'error');
      return;
    }

    if (status !== 'approved') {
      await supabaseClient.auth.signOut();
      showMessage('loginMessage', 'Your account is not approved yet. Contact the administrator.', 'error');
      return;
    }

    if (role === 'admin') {
      window.location.href = 'index.html';
      return;
    }
  } catch (profileError) {
    await supabaseClient.auth.signOut();
    showMessage('loginMessage', 'Could not verify your account status. Please try again.', 'error');
    return;
  }

  window.location.href = 'index.html';
}

async function handleRegister(event) {
  event.preventDefault();
  clearMessage('registerMessage');

  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerPasswordConfirm').value;

  if (password !== confirm) {
    showMessage('registerMessage', 'Passwords do not match.', 'error');
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { status: 'pending', role: 'parent' }
    }
  });

  if (error) {
    showMessage('registerMessage', error.message, 'error');
    return;
  }

  showMessage(
    'registerMessage',
    'Account created. Your account is pending approval. You will be notified when access is granted.',
    'success'
  );
  document.getElementById('registerPassword').value = '';
  document.getElementById('registerPasswordConfirm').value = '';
}

async function initAuthPage() {
  if (!window.supabase?.createClient) {
    showMessage('loginMessage', 'Supabase SDK failed to load.', 'error');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    showMessage('loginMessage', 'Supabase config is missing. Update js/config.js.', 'error');
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const pendingNotice = localStorage.getItem('auth_notice');
  if (pendingNotice) {
    showMessage('loginMessage', pendingNotice, 'error');
    localStorage.removeItem('auth_notice');
  }

  const { data } = await supabaseClient.auth.getSession();
  if (data?.session?.user?.id) {
    try {
      const profile = await fetchUserProfile(data.session.user.id);
      const status = (profile?.status || '').toLowerCase();
      if (status === 'approved') {
        window.location.href = 'index.html';
        return;
      }
      await supabaseClient.auth.signOut();
      showMessage('loginMessage', 'Your account is awaiting approval from the administrator.', 'error');
    } catch (e) {
      await supabaseClient.auth.signOut();
      showMessage('loginMessage', 'Could not verify your account status. Please log in again.', 'error');
    }
  }
}

initAuthPage();
