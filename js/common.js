// Config and State
const defaultConfig = {
  hero_title: 'Track Your Dream Job Journey',
  hero_subtitle: 'Organize your job applications, track progress, and land your next opportunity with our powerful job tracking system.',
  contact_title: 'Get In Touch',
  background_color: '#0f172a',
  surface_color: '#1e293b',
  text_color: '#ffffff',
  primary_action_color: '#6366f1',
  secondary_action_color: '#a855f7',
  font_family: 'Space Grotesk',
  font_size: 16
};

let config = { ...defaultConfig };
let currentUser = localStorage.getItem('currentUser') || null; // PERSISTENCE
let jobs = [];
let jobToDelete = null;
let recordCount = 0;
let currentRounds = [];
// Profile data state
let profileSkills = [];
let profileExperience = [];
let profileEducation = [];
let profileCertifications = [];
let profileData = {};

// Valid user credentials (for demo)
const validUsers = {
  'akshayjain': 'password123'
};
// Registered users storage: { userId: { password: '...', email: '...' } }
const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || {};

// Element SDK
if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange: async (newConfig) => {
      config = { ...defaultConfig, ...newConfig };
      applyConfig();
    },
    mapToCapabilities: (cfg) => ({
      recolorables: [
        { get: () => cfg.background_color || defaultConfig.background_color, set: (v) => { cfg.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
        { get: () => cfg.surface_color || defaultConfig.surface_color, set: (v) => { cfg.surface_color = v; window.elementSdk.setConfig({ surface_color: v }); } },
        { get: () => cfg.text_color || defaultConfig.text_color, set: (v) => { cfg.text_color = v; window.elementSdk.setConfig({ text_color: v }); } },
        { get: () => cfg.primary_action_color || defaultConfig.primary_action_color, set: (v) => { cfg.primary_action_color = v; window.elementSdk.setConfig({ primary_action_color: v }); } },
        { get: () => cfg.secondary_action_color || defaultConfig.secondary_action_color, set: (v) => { cfg.secondary_action_color = v; window.elementSdk.setConfig({ secondary_action_color: v }); } }
      ],
      borderables: [],
      fontEditable: { get: () => cfg.font_family || defaultConfig.font_family, set: (v) => { cfg.font_family = v; window.elementSdk.setConfig({ font_family: v }); } },
      fontSizeable: { get: () => cfg.font_size || defaultConfig.font_size, set: (v) => { cfg.font_size = v; window.elementSdk.setConfig({ font_size: v }); } }
    }),
    mapToEditPanelValues: (cfg) => new Map([
      ['hero_title', cfg.hero_title || defaultConfig.hero_title],
      ['hero_subtitle', cfg.hero_subtitle || defaultConfig.hero_subtitle],
      ['contact_title', cfg.contact_title || defaultConfig.contact_title]
    ])
  });
}

function applyConfig() {
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const contactTitle = document.getElementById('contactTitle');

  if (heroTitle) {
    heroTitle.innerHTML = (config.hero_title || defaultConfig.hero_title).replace('Dream Job', '<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Dream Job</span>');
  }
  if (heroSubtitle) heroSubtitle.textContent = config.hero_subtitle || defaultConfig.hero_subtitle;
  if (contactTitle) contactTitle.textContent = config.contact_title || defaultConfig.contact_title;

  const font = config.font_family || defaultConfig.font_family;
  const baseSize = config.font_size || defaultConfig.font_size;
  document.body.style.fontFamily = `${font}, sans-serif`;
  document.querySelectorAll('h1').forEach(el => el.style.fontSize = `${baseSize * 3}px`);
  document.querySelectorAll('h2').forEach(el => el.style.fontSize = `${baseSize * 1.875}px`);
  document.querySelectorAll('h3').forEach(el => el.style.fontSize = `${baseSize * 1.25}px`);
  document.querySelectorAll('p, span, button, input, select, textarea, label').forEach(el => {
    if (!el.closest('h1') && !el.closest('h2') && !el.closest('h3')) {
      el.style.fontSize = `${baseSize}px`;
    }
  });
}

// Data SDK
const dataHandler = {
  onDataChanged(data) {
    // Only modify jobs that belong to the current user
    jobs = data.filter(j => j.user_id === currentUser);
    recordCount = data.length;

    // If we are on dashboard, re-render
    if (document.getElementById('jobList')) {
      renderJobs();
      updateStats();
    }

    // If we are on profile, reload profile
    if (document.getElementById('profilePage')) {
      loadProfile();
    }
  }
};

async function initDataSdk() {
  if (window.dataSdk) {
    const result = await window.dataSdk.init(dataHandler);
    if (!result.isOk) {
      console.error('Data SDK init failed');
    }
  }
}

// Navigation (UPDATED FOR MPA)
function navigateTo(page) {
  if (page === 'home') {
    window.location.href = 'index.html';
  } else if (page === 'contact') {
    window.location.href = 'contact.html';
  } else if (page === 'profile') {
    if (currentUser) {
      window.location.href = 'profile.html';
    } else {
      window.location.href = 'index.html';
    }
  } else if (page === 'dashboard') {
    if (currentUser) {
      window.location.href = 'dashboard.html';
    } else {
      showToast('Please login first', 'error');
    }
  }
}

// Auth Helpers
function checkAuth() {
  if (currentUser) {
    const userDisplay = document.getElementById('userDisplay');
    const dashboardBtn = document.getElementById('dashboardNavBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginHeaderBtn = document.getElementById('loginHeaderBtn');
    const registerHeaderBtn = document.getElementById('registerHeaderBtn');

    if (userDisplay) {
      userDisplay.textContent = `👤 ${currentUser}`;
      userDisplay.classList.remove('hidden');
    }
    if (dashboardBtn) dashboardBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');

    if (loginHeaderBtn) loginHeaderBtn.classList.add('hidden');
    if (registerHeaderBtn) registerHeaderBtn.classList.add('hidden');
  } else {
    // If on protected page, redirect home
    const path = window.location.pathname;
    if (path.includes('dashboard.html') || path.includes('profile.html')) {
      window.location.href = 'index.html';
    }
  }
}

function scrollToAuthForm(formType) {
  if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
    window.location.href = 'index.html?auth=' + formType;
    return;
  }
  switchAuthTab(formType);
  const authCard = document.getElementById('authCard');
  if (authCard) {
    authCard.scrollIntoView({ behavior: 'smooth' });
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  // Also handle modal tabs if they exist
  const authLoginTab = document.getElementById('authLoginTab');
  const authRegisterTab = document.getElementById('authRegisterTab');
  const authLoginForm = document.getElementById('authLoginForm');
  const authRegisterForm = document.getElementById('authRegisterForm');

  if (tab === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginTab) {
      loginTab.classList.add('border-indigo-500', 'text-indigo-400');
      loginTab.classList.remove('border-transparent', 'text-slate-400');
    }
    if (registerTab) {
      registerTab.classList.remove('border-indigo-500', 'text-indigo-400');
      registerTab.classList.add('border-transparent', 'text-slate-400');
    }

    if (authLoginForm) authLoginForm.classList.remove('hidden');
    if (authRegisterForm) authRegisterForm.classList.add('hidden');
    if (authLoginTab) {
      authLoginTab.classList.add('border-indigo-500', 'text-indigo-400');
      authLoginTab.style.borderColor = '#6366f1'; // fallback
    }
    if (authRegisterTab) {
      authRegisterTab.style.borderColor = 'transparent';
    }

  } else {
    if (registerForm) registerForm.classList.remove('hidden');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerTab) {
      registerTab.classList.add('border-indigo-500', 'text-indigo-400');
      registerTab.classList.remove('border-transparent', 'text-slate-400');
    }
    if (loginTab) {
      loginTab.classList.remove('border-indigo-500', 'text-indigo-400');
      loginTab.classList.add('border-transparent', 'text-slate-400');
    }

    if (authRegisterForm) authRegisterForm.classList.remove('hidden');
    if (authLoginForm) authLoginForm.classList.add('hidden');
    if (authRegisterTab) {
      authRegisterTab.classList.add('border-indigo-500', 'text-indigo-400');
      authRegisterTab.style.borderColor = '#6366f1';
    }
    if (authLoginTab) {
      authLoginTab.style.borderColor = 'transparent';
    }
  }
}

function handleLogin(e) {
  e.preventDefault();
  // Handle both main login and modal login
  const isModal = e.target.id === 'authLoginForm';
  const userIdInput = isModal ? document.getElementById('authLoginUserId') : document.getElementById('loginUserId');
  const passwordInput = isModal ? document.getElementById('authLoginPassword') : document.getElementById('loginPassword');
  const errorEl = isModal ? document.getElementById('authLoginError') : document.getElementById('loginError');

  const userId = userIdInput.value.trim();
  const password = passwordInput.value;

  // Check validUsers (demo static) OR registeredUsers (localStorage)
  // registeredUsers now stores objects: { password: '...', email: '...' }
  // Backward compatibility check: if it's a string, treat as password.
  let isRegistered = false;
  if (registeredUsers[userId]) {
    const stored = registeredUsers[userId];
    const storedPass = (typeof stored === 'string') ? stored : stored.password;
    if (storedPass === password) {
      isRegistered = true;
    }
  }

  if ((validUsers[userId] === password) || isRegistered) {
    currentUser = userId;
    localStorage.setItem('currentUser', currentUser); // PERSIST

    checkAuth(); // Update UI

    e.target.reset();
    showToast('Welcome back!', 'success');
    if (isModal) closeAuthModal();
    navigateTo('dashboard');
    if (errorEl) errorEl.classList.add('hidden');
  } else {
    if (errorEl) {
      errorEl.textContent = 'Invalid user ID or password';
      errorEl.classList.remove('hidden');
    }
  }
}

function handleRegister(e) {
  e.preventDefault();
  const isModal = e.target.id === 'authRegisterForm';
  const userIdInput = isModal ? document.getElementById('authRegUserId') : document.getElementById('regUserId');
  const emailInput = isModal ? document.getElementById('authRegEmail') : document.getElementById('regEmail');
  const passwordInput = isModal ? document.getElementById('authRegPassword') : document.getElementById('regPassword');

  const confirmPasswordInput = isModal ? null : document.getElementById('regConfirmPassword');

  const userId = userIdInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : password; // Skip check if no field
  const msgEl = isModal ? document.getElementById('authRegMsg') : document.getElementById('registerMsg');

  if (password !== confirmPassword) {
    msgEl.textContent = 'Passwords do not match.';
    msgEl.classList.remove('hidden', 'text-green-400');
    msgEl.classList.add('text-red-400');
    return;
  }

  if (password.length < 6) {
    msgEl.textContent = 'Password must be at least 6 characters long.';
    msgEl.classList.remove('hidden', 'text-green-400');
    msgEl.classList.add('text-red-400');
    return;
  }

  if (validUsers[userId] || registeredUsers[userId]) {
    msgEl.textContent = 'User ID already exists.';
    msgEl.classList.remove('hidden', 'text-green-400');
    msgEl.classList.add('text-red-400');
    return;
  }

  // Store object with password and email for autofill
  registeredUsers[userId] = { password, email };
  localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers)); // PERSIST

  msgEl.textContent = 'Account created! Please login.';
  msgEl.classList.remove('hidden', 'text-red-400');
  msgEl.classList.add('text-green-400');

  setTimeout(() => {
    switchAuthTab('login');
    if (!isModal) {
      document.getElementById('loginUserId').value = userId;
      document.getElementById('regUserId').value = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regPassword').value = '';
      if (document.getElementById('regConfirmPassword')) document.getElementById('regConfirmPassword').value = '';
    } else {
      document.getElementById('authLoginUserId').value = userId;
      document.getElementById('authRegUserId').value = '';
      document.getElementById('authRegEmail').value = '';
      document.getElementById('authRegPassword').value = '';
    }
    msgEl.classList.add('hidden');
  }, 1500);
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  checkAuth();
  navigateTo('home');
  showToast('Logged out successfully', 'info');
}

function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  const icon = document.getElementById(fieldId + 'Icon');
  if (!field) return;

  if (field.type === 'password') {
    field.type = 'text';
    if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
  } else {
    field.type = 'password';
    if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>';
  }
}

// Auth Modal Helpers
function openAuthModal(tab) {
  document.getElementById('authModal').classList.remove('hidden');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function openForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').classList.remove('hidden');
}

function closeForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').classList.add('hidden');
  document.getElementById('forgotPasswordForm').reset();
  document.getElementById('forgotMsg').classList.add('hidden');
}

function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;
  const msgEl = document.getElementById('forgotMsg');

  msgEl.textContent = '✓ Password reset link sent to ' + email + '. Please check your email.';
  msgEl.classList.remove('hidden', 'text-red-400');
  msgEl.classList.add('text-green-400');

  setTimeout(() => {
    closeForgotPasswordModal();
    showToast('Password reset instructions sent!', 'success');
  }, 2000);
}

// Change Password
function openChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.add('hidden');
  const form = document.getElementById('changePasswordForm');
  if (form) form.reset();
  const msg = document.getElementById('changePassMsg');
  if (msg) msg.classList.add('hidden');
}

function handleChangePassword(e) {
  e.preventDefault();
  const oldPass = document.getElementById('oldPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmNewPassword').value;
  const msgEl = document.getElementById('changePassMsg');

  // Verify old password
  let currentStored = registeredUsers[currentUser];
  // Normalize legacy data if string
  if (typeof currentStored === 'string') currentStored = { password: currentStored, email: '' };

  // If user is from validUsers (demo data), we might not allow change or just simulate it.
  // Assuming mostly registered users.
  const isDemoUser = validUsers[currentUser] === oldPass;
  const isRegUser = currentStored && currentStored.password === oldPass;

  if (!isDemoUser && !isRegUser) {
    msgEl.textContent = 'Incorrect old password.';
    msgEl.classList.remove('hidden', 'text-green-400');
    msgEl.classList.add('text-red-400');
    return;
  }

  if (newPass !== confirmPass) {
    msgEl.textContent = 'New passwords do not match.';
    msgEl.classList.remove('hidden', 'text-green-400');
    msgEl.classList.add('text-red-400');
    return;
  }

  if (newPass.length < 6) {
    msgEl.textContent = 'Password must be at least 6 characters.';
    msgEl.classList.remove('hidden', 'text-green-400');
    msgEl.classList.add('text-red-400');
    return;
  }

  // Update password
  if (registeredUsers[currentUser]) {
    if (typeof registeredUsers[currentUser] === 'string') {
      registeredUsers[currentUser] = { password: newPass, email: '' };
    } else {
      registeredUsers[currentUser].password = newPass;
    }
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
  } else {
    // If it was a demo user, we can't really save it permanently unless we move them to registeredUsers
    // For this app context (demo), let's just create an entry in registeredUsers
    registeredUsers[currentUser] = { password: newPass, email: '' };
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
  }

  msgEl.textContent = 'Password updated successfully!';
  msgEl.classList.remove('text-red-400');
  msgEl.classList.add('text-green-400');
  msgEl.classList.remove('hidden');

  setTimeout(() => {
    closeChangePasswordModal();
    showToast('Password changed!', 'success');
  }, 1500);
}

// Contact form
function handleContact(e) {
  e.preventDefault();
  const msgEl = document.getElementById('contactMsg');
  msgEl.textContent = '✓ Message sent successfully! We\'ll get back to you soon.';
  msgEl.classList.remove('hidden');
  e.target.reset();
  setTimeout(() => msgEl.classList.add('hidden'), 5000);
}

// Profile
function loadProfile() {
  if (!currentUser) return;

  const profileInfo = jobs.find(j => j.company === 'Profile' && j.position === 'Professional');

  if (profileInfo) {
    profileData = { ...profileInfo };
  } else {
    profileData = {};
  }

  // Auto-fill from registration data if available
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; }

  // Set UserID (read-only)
  setVal('profileUserId', currentUser);

  // Try to find email from registeredUsers if not in profileData (or if profileData is empty)
  let userEmail = profileData.email;
  if (!userEmail && registeredUsers[currentUser]) {
    const stored = registeredUsers[currentUser];
    userEmail = (typeof stored === 'object') ? stored.email : '';
  }

  setVal('fullName', profileData.full_name);
  setVal('email', userEmail);
  setVal('phone', profileData.phone);
  setVal('location', profileData.location);
  setVal('summary', profileData.professional_summary);

  try {
    profileSkills = profileData.skills ? JSON.parse(profileData.skills) : [];
  } catch (e) { profileSkills = []; }

  try {
    profileExperience = profileData.experience ? JSON.parse(profileData.experience) : [];
  } catch (e) { profileExperience = []; }

  try {
    profileEducation = profileData.education ? JSON.parse(profileData.education) : [];
  } catch (e) { profileEducation = []; }

  try {
    profileCertifications = profileData.certifications ? JSON.parse(profileData.certifications) : [];
  } catch (e) { profileCertifications = []; }

  renderSkillsTable();
  renderExperienceTable();
  renderEducationTable();
  renderCertificationsTable();
}

async function saveProfile(e) {
  if (e) e.preventDefault();

  const profileInfo = {
    full_name: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    location: document.getElementById('location').value,
    professional_summary: document.getElementById('summary') ? document.getElementById('summary').value : (profileData.professional_summary || ''),
    skills: JSON.stringify(profileSkills),
    experience: JSON.stringify(profileExperience),
    education: JSON.stringify(profileEducation),
    certifications: JSON.stringify(profileCertifications),
    user_id: currentUser,
    company: 'Profile',
    position: 'Professional',
    status: 'Profile',
    rounds: '[]'
  };

  const existingProfile = jobs.find(j => j.company === 'Profile' && j.position === 'Professional');

  let result;
  if (existingProfile) {
    result = await window.dataSdk.update({ ...existingProfile, ...profileInfo });
  } else {
    result = await window.dataSdk.create(profileInfo);
  }

  if (result.isOk) {
    showToast('Profile saved successfully!', 'success');
  } else {
    showToast('Error saving profile', 'error');
  }
}

// ------ Dynamic List Helpers ------

// Skills
function addSkillRow() {
  profileSkills.push({ name: '', level: 'Beginner' });
  renderSkillsTable();
}
function removeSkillRow(index) {
  profileSkills.splice(index, 1);
  renderSkillsTable();
}
function updateSkill(index, field, value) {
  profileSkills[index][field] = value;
}
function renderSkillsTable() {
  const container = document.getElementById('skillsTableBody');
  if (!container) return;

  if (profileSkills.length === 0) {
    container.innerHTML = '<tr><td colspan="3" class="px-4 py-3 text-center text-slate-500 text-sm">No skills added yet</td></tr>';
    return;
  }
  container.innerHTML = profileSkills.map((item, idx) => `
    <tr class="hover:bg-slate-700/30 transition-colors">
      <td class="px-2 py-2">
        <input type="text" placeholder="Skill Name" value="${escapeHtml(item.name || '')}" onchange="updateSkill(${idx}, 'name', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"/>
      </td>
      <td class="px-2 py-2">
        <select onchange="updateSkill(${idx}, 'level', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
           <option value="Beginner" ${item.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
           <option value="Intermediate" ${item.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
           <option value="Advanced" ${item.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
           <option value="Expert" ${item.level === 'Expert' ? 'selected' : ''}>Expert</option>
        </select>
      </td>
      <td class="px-2 py-2 text-center">
        <button type="button" onclick="removeSkillRow(${idx})" class="text-red-400 hover:text-red-300">
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Experience
function addExperienceRow() {
  profileExperience.push({ role: '', company: '', duration: '' });
  renderExperienceTable();
}
function removeExperienceRow(index) {
  profileExperience.splice(index, 1);
  renderExperienceTable();
}
function updateExperience(index, field, value) {
  profileExperience[index][field] = value;
}
function renderExperienceTable() {
  const container = document.getElementById('experienceTableBody');
  if (!container) return;
  if (profileExperience.length === 0) {
    container.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-center text-slate-500 text-sm">No experience added yet</td></tr>';
    return;
  }
  container.innerHTML = profileExperience.map((item, idx) => `
    <tr class="hover:bg-slate-700/30 transition-colors">
       <td class="px-2 py-2"><input type="text" placeholder="Role/Title" value="${escapeHtml(item.role || '')}" onchange="updateExperience(${idx}, 'role', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2"><input type="text" placeholder="Company" value="${escapeHtml(item.company || '')}" onchange="updateExperience(${idx}, 'company', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2"><input type="text" placeholder="Duration (e.g. 2020-2022)" value="${escapeHtml(item.duration || '')}" onchange="updateExperience(${idx}, 'duration', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2 text-center"><button type="button" onclick="removeExperienceRow(${idx})" class="text-red-400 hover:text-red-300"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td>
    </tr>
  `).join('');
}

// Education
function addEducationRow() {
  profileEducation.push({ degree: '', institution: '', year: '' });
  renderEducationTable();
}
function removeEducationRow(index) {
  profileEducation.splice(index, 1);
  renderEducationTable();
}
function updateEducation(index, field, value) {
  profileEducation[index][field] = value;
}
function renderEducationTable() {
  const container = document.getElementById('educationTableBody');
  if (!container) return;
  if (profileEducation.length === 0) {
    container.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-center text-slate-500 text-sm">No education added yet</td></tr>';
    return;
  }
  container.innerHTML = profileEducation.map((item, idx) => `
    <tr class="hover:bg-slate-700/30 transition-colors">
       <td class="px-2 py-2"><input type="text" placeholder="Degree" value="${escapeHtml(item.degree || '')}" onchange="updateEducation(${idx}, 'degree', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2"><input type="text" placeholder="Institution" value="${escapeHtml(item.institution || '')}" onchange="updateEducation(${idx}, 'institution', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2"><input type="text" placeholder="Year" value="${escapeHtml(item.year || '')}" onchange="updateEducation(${idx}, 'year', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2 text-center"><button type="button" onclick="removeEducationRow(${idx})" class="text-red-400 hover:text-red-300"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td>
    </tr>
  `).join('');
}

// Certifications
function addCertificationRow() {
  profileCertifications.push({ name: '', issuer: '', year: '' });
  renderCertificationsTable();
}
function removeCertificationRow(index) {
  profileCertifications.splice(index, 1);
  renderCertificationsTable();
}
function updateCertification(index, field, value) {
  profileCertifications[index][field] = value;
}
function renderCertificationsTable() {
  const container = document.getElementById('certificationsTableBody');
  if (!container) return;
  if (profileCertifications.length === 0) {
    container.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-center text-slate-500 text-sm">No certifications added yet</td></tr>';
    return;
  }
  container.innerHTML = profileCertifications.map((item, idx) => `
    <tr class="hover:bg-slate-700/30 transition-colors">
       <td class="px-2 py-2"><input type="text" placeholder="Certification Name" value="${escapeHtml(item.name || '')}" onchange="updateCertification(${idx}, 'name', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2"><input type="text" placeholder="Issuer" value="${escapeHtml(item.issuer || '')}" onchange="updateCertification(${idx}, 'issuer', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2"><input type="text" placeholder="Year" value="${escapeHtml(item.year || '')}" onchange="updateCertification(${idx}, 'year', this.value)" class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm outline-none"/></td>
       <td class="px-2 py-2 text-center"><button type="button" onclick="removeCertificationRow(${idx})" class="text-red-400 hover:text-red-300"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td>
    </tr>
  `).join('');
}


function exportToPDF() {
  const fullName = document.getElementById('fullName').value || 'Your Name';
  const email = document.getElementById('email').value || 'email@example.com';
  const phone = document.getElementById('phone').value || '+1 (555) 000-0000';
  const location = document.getElementById('location').value || 'City, Country';
  const summary = document.getElementById('summary') ? document.getElementById('summary').value : '';

  // Helper to generate list items
  const generateList = (items, fields) => {
    if (!items || items.length === 0) return '';
    return items.map(item => {
      const parts = fields.map(f => item[f]).filter(val => val);
      return `<div class="cv-item" style="margin-bottom:8px;">${parts.join(' - ')}</div>`;
    }).join('');
  };

  const cvHtml = `
        <div class="cv-container">
          <div class="cv-header">
            <div class="cv-name">${escapeHtml(fullName)}</div>
            <div class="cv-contact">
              ${escapeHtml(email)} | ${escapeHtml(phone)} | ${escapeHtml(location)}
            </div>
          </div>

          ${summary ? `
            <div class="cv-section">
              <div class="cv-section-title">PROFESSIONAL SUMMARY</div>
              <div class="cv-entry">${escapeHtml(summary).replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}

          ${profileSkills.length > 0 ? `
            <div class="cv-section">
              <div class="cv-section-title">SKILLS</div>
              <div class="cv-entry">
                ${profileSkills.map(s => `${escapeHtml(s.name)} (${escapeHtml(s.level)})`).join(' • ')}
              </div>
            </div>
          ` : ''}

          ${profileExperience.length > 0 ? `
            <div class="cv-section">
              <div class="cv-section-title">WORK EXPERIENCE</div>
              ${profileExperience.map(exp => `
                 <div class="cv-entry">
                   <div class="cv-entry-title">${escapeHtml(exp.role)} at ${escapeHtml(exp.company)}</div>
                   <div class="cv-entry-subtitle">${escapeHtml(exp.duration)}</div>
                 </div>
              `).join('')}
            </div>
          ` : ''}

          ${profileEducation.length > 0 ? `
            <div class="cv-section">
              <div class="cv-section-title">EDUCATION</div>
              ${profileEducation.map(edu => `
                 <div class="cv-entry">
                   <div class="cv-entry-title">${escapeHtml(edu.degree)}</div>
                   <div class="cv-entry-subtitle">${escapeHtml(edu.institution)} - ${escapeHtml(edu.year)}</div>
                 </div>
              `).join('')}
            </div>
          ` : ''}

          ${profileCertifications.length > 0 ? `
            <div class="cv-section">
              <div class="cv-section-title">CERTIFICATIONS</div>
              ${profileCertifications.map(cert => `
                 <div class="cv-entry">
                   <div class="cv-entry-title">${escapeHtml(cert.name)}</div>
                   <div class="cv-entry-subtitle">${escapeHtml(cert.issuer)} - ${escapeHtml(cert.year)}</div>
                 </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

  const element = document.createElement('div');
  element.innerHTML = cvHtml;

  const opt = {
    margin: 10,
    filename: `${fullName.replace(/\s+/g, '_')}_CV.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(element).save();
    showToast('CV downloaded successfully!', 'success');
  } else {
    showToast('PDF generator loading...', 'info');
  }
}

// Job CRUD
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Job Application';
  document.getElementById('jobForm').reset();
  document.getElementById('editingJobId').value = '';
  document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
  currentRounds = [];
  renderRoundsTable();
  document.getElementById('jobModal').classList.remove('hidden');
}

function openEditModal(job) {
  document.getElementById('modalTitle').textContent = 'Edit Application';
  document.getElementById('editingJobId').value = job.__backendId;
  document.getElementById('jobCompany').value = job.company;
  document.getElementById('jobPosition').value = job.position;
  document.getElementById('jobStatus').value = job.status;
  document.getElementById('jobDate').value = job.applied_date || '';
  document.getElementById('jobNotes').value = job.notes || '';
  currentRounds = job.rounds ? JSON.parse(job.rounds) : [];
  renderRoundsTable();
  document.getElementById('jobModal').classList.remove('hidden');
}

function addRoundRow() {
  currentRounds.push({ round: '', date: '' });
  renderRoundsTable();
}

function removeRoundRow(index) {
  currentRounds.splice(index, 1);
  renderRoundsTable();
}

function updateRound(index, field, value) {
  currentRounds[index][field] = value;
}

function renderRoundsTable() {
  const tbody = document.getElementById('roundsTable');
  if (currentRounds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="px-3 py-4 text-center text-slate-500 text-xs">No rounds added yet</td></tr>';
    return;
  }

  tbody.innerHTML = currentRounds.map((round, idx) => `
        <tr class="hover:bg-slate-700/50">
          <td class="px-3 py-2">
            <input type="text" placeholder="e.g., Technical Round" value="${escapeHtml(round.round)}" onchange="updateRound(${idx}, 'round', this.value)" class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"/>
          </td>
          <td class="px-3 py-2">
            <input type="date" value="${round.date}" onchange="updateRound(${idx}, 'date', this.value)" class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"/>
          </td>
          <td class="px-3 py-2 text-center">
            <button type="button" onclick="removeRoundRow(${idx})" class="text-red-400 hover:text-red-300 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </td>
        </tr>
      `).join('');
}

function closeModal() {
  document.getElementById('jobModal').classList.add('hidden');
}

async function handleJobSubmit(e) {
  e.preventDefault();
  const editingId = document.getElementById('editingJobId').value;
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const jobData = {
    company: document.getElementById('jobCompany').value,
    position: document.getElementById('jobPosition').value,
    status: document.getElementById('jobStatus').value,
    applied_date: document.getElementById('jobDate').value,
    notes: document.getElementById('jobNotes').value,
    user_id: currentUser,
    rounds: JSON.stringify(currentRounds)
  };

  let result;
  if (editingId) {
    const existingJob = jobs.find(j => j.__backendId === editingId);
    result = await window.dataSdk.update({ ...existingJob, ...jobData });
  } else {
    if (recordCount >= 999) {
      showToast('Maximum limit reached', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save';
      return;
    }
    result = await window.dataSdk.create(jobData);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save';

  if (result.isOk) {
    closeModal();
    showToast(editingId ? 'Application updated!' : 'Application added!', 'success');
  } else {
    showToast('Error saving application', 'error');
  }
}

function openDeleteConfirm(job) {
  jobToDelete = job;
  document.getElementById('deleteConfirm').classList.remove('hidden');
}

function closeDeleteConfirm() {
  jobToDelete = null;
  document.getElementById('deleteConfirm').classList.add('hidden');
}

async function confirmDelete() {
  if (!jobToDelete) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const result = await window.dataSdk.delete(jobToDelete);

  btn.disabled = false;
  btn.textContent = 'Delete';
  closeDeleteConfirm();

  if (result.isOk) {
    showToast('Application deleted', 'success');
  } else {
    showToast('Error deleting application', 'error');
  }
}

function renderJobs() {
  const container = document.getElementById('jobList');
  if (!container) return; // not on dashboard

  const warning = document.getElementById('limitWarning');

  const userJobs = jobs.filter(j => j.company !== 'Profile'); // Filter out profile data

  if (userJobs.length >= 999) {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  if (userJobs.length === 0) {
    container.innerHTML = `
          <div class="card-gradient rounded-xl p-8 border border-slate-700/50 text-center">
            <svg class="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p class="text-slate-400">No job applications yet. Click "Add Application" to get started!</p>
          </div>
        `;
    return;
  }

  container.innerHTML = userJobs.map(job => `
        <div class="card-gradient rounded-xl p-5 border border-slate-700/50 hover:border-indigo-500/30 transition-all slide-in" data-job-id="${job.__backendId}">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold">${escapeHtml(job.company)}</h3>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(job.status)}">${job.status}</span>
              </div>
              <p class="text-slate-300">${escapeHtml(job.position)}</p>
              ${job.applied_date ? `<p class="text-slate-500 text-sm mt-1">Applied: ${formatDate(job.applied_date)}</p>` : ''}
              ${job.notes ? `<p class="text-slate-400 text-sm mt-2 italic">"${escapeHtml(job.notes)}"</p>` : ''}
              ${job.rounds && JSON.parse(job.rounds).length > 0 ? `<div class="mt-3 text-xs"><p class="text-slate-500 font-medium mb-1">Rounds:</p><div class="space-y-1">${JSON.parse(job.rounds).map(r => `<p class="text-slate-400">• ${escapeHtml(r.round)} - ${formatDate(r.date)}</p>`).join('')}</div></div>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <button onclick='openEditModal(${JSON.stringify(job).replace(/'/g, "\\'")})' class="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all" title="Edit">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button onclick='openDeleteConfirm(${JSON.stringify(job).replace(/'/g, "\\'")})' class="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all" title="Delete">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');
}

function updateStats() {
  // Filter out profile logic handled in renderJobs but here we need to filter too
  const userJobs = jobs.filter(j => j.company !== 'Profile');

  const statTotal = document.getElementById('statTotal');
  if (statTotal) {
    statTotal.textContent = userJobs.length;
    document.getElementById('statApplied').textContent = userJobs.filter(j => j.status === 'Applied').length;
    document.getElementById('statInterview').textContent = userJobs.filter(j => j.status === 'Interview').length;
    document.getElementById('statOffer').textContent = userJobs.filter(j => j.status === 'Offer').length;
  }
}

function getStatusClass(status) {
  const classes = {
    'Applied': 'bg-blue-500/20 text-blue-400',
    'Screening': 'bg-cyan-500/20 text-cyan-400',
    'Interview': 'bg-yellow-500/20 text-yellow-400',
    'Offer': 'bg-green-500/20 text-green-400',
    'Rejected': 'bg-red-500/20 text-red-400'
  };
  return classes[status] || 'bg-slate-500/20 text-slate-400';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const msg = document.getElementById('toastMessage');

  if (!toast) return;

  const icons = {
    success: '<svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    error: '<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    info: '<svg class="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
  };

  if (icon) icon.innerHTML = icons[type];
  if (msg) msg.textContent = message;

  toast.classList.remove('translate-y-20', 'opacity-0');

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  applyConfig();
  checkAuth();
  await initDataSdk();

  // Page specific init
  if (window.location.pathname.includes('profile.html')) {
    loadProfile();
  }

  // Handle URL params for auth
  const urlParams = new URLSearchParams(window.location.search);
  const authType = urlParams.get('auth');
  if (authType) {
    // Clear the param
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => scrollToAuthForm(authType), 100);
  }
});
