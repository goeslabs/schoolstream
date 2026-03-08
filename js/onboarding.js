const SUPABASE_URL = (window.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || '').trim();

let supabaseClient = null;
let currentUserId = null;

function showOnboardingMessage(message, type) {
  const el = document.getElementById('onboardingMessage');
  el.textContent = message;
  el.className = `auth-message ${type}`;
  el.style.display = '';
}

function getSelectedYearGroups() {
  return Array.from(document.querySelectorAll('.onboarding-option input:checked')).map(i => i.value);
}

function syncSelectionStyles() {
  document.querySelectorAll('.onboarding-option').forEach(label => {
    const input = label.querySelector('input');
    label.classList.toggle('checked', !!input?.checked);
  });
}

function hasYearGroups(profile) {
  return Array.isArray(profile?.year_groups) && profile.year_groups.length > 0;
}

async function fetchProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('status, role, year_groups')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveOnboarding(event) {
  event.preventDefault();

  const selected = getSelectedYearGroups();
  if (!selected.length) {
    showOnboardingMessage('Please select at least one year group.', 'error');
    return;
  }

  const { error } = await supabaseClient
    .from('profiles')
    .update({ year_groups: selected })
    .eq('id', currentUserId);

  if (error) {
    showOnboardingMessage('Could not save your selections. Please try again.', 'error');
    return;
  }

  window.location.href = 'index.html';
}

async function initOnboarding() {
  if (!window.supabase?.createClient) {
    showOnboardingMessage('Supabase SDK failed to load.', 'error');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    showOnboardingMessage('Supabase config is missing. Update js/config.js.', 'error');
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  document.querySelectorAll('.onboarding-option input').forEach(input => {
    input.addEventListener('change', syncSelectionStyles);
  });
  syncSelectionStyles();

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data?.session?.user?.id) {
    window.location.href = 'auth.html';
    return;
  }

  currentUserId = data.session.user.id;

  try {
    const profile = await fetchProfile(currentUserId);
    if (!profile) {
      await supabaseClient.auth.signOut();
      localStorage.setItem('auth_notice', 'Your profile is not set up yet. Contact the administrator.');
      window.location.href = 'auth.html';
      return;
    }

    const status = (profile.status || '').toLowerCase();
    const role = (profile.role || '').toLowerCase();

    if (status === 'pending') {
      await supabaseClient.auth.signOut();
      localStorage.setItem('auth_notice', 'Your account is awaiting approval from the administrator.');
      window.location.href = 'auth.html';
      return;
    }

    if (status !== 'approved') {
      await supabaseClient.auth.signOut();
      localStorage.setItem('auth_notice', 'Your account is not approved yet. Contact the administrator.');
      window.location.href = 'auth.html';
      return;
    }

    if (role === 'admin' || hasYearGroups(profile)) {
      window.location.href = 'index.html';
    }
  } catch (e) {
    console.error('Onboarding profile check failed:', e);
    showOnboardingMessage('Could not load your profile. Please try again.', 'error');
  }
}

initOnboarding();
