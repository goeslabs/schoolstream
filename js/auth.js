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

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage('loginMessage', error.message, 'error');
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

  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    window.location.href = 'index.html';
  }
}

initAuthPage();
