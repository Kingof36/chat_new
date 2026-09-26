// Dán Link Web App Google Apps Script của bạn vào đây (kết thúc bằng /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbymOnvkF93anTrm54WRAdJhgQQeoBG4xhZAKQB-TKZ_tHwBL_8DDBuN0rOE69CF1Ypy/exec";

let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('friendbook_user')) || null;
} catch (e) {
  currentUser = null;
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  if (currentUser) {
    showMainApp();
  } else {
    showAuthScreen();
  }

  const registerBtn = document.getElementById('register');
  const loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('logout');
  const postBtn = document.getElementById('postBtn');

  if (registerBtn) registerBtn.addEventListener('click', handleRegister);
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (postBtn) postBtn.addEventListener('click', handleCreatePost);

  document.querySelectorAll('.nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function showMainApp() {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('logout').classList.remove('hidden');
  document.getElementById('who').textContent = `Xin chào, ${currentUser.name || currentUser.email}`;
  
  if (currentUser.email === 'admin@friendbook.com') {
    document.getElementById('adminTab').classList.remove('hidden');
  }

  loadFeed();
}

function showAuthScreen() {
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('logout').classList.add('hidden');
  document.getElementById('who').textContent = '';
  try {
    localStorage.removeItem('friendbook_user');
  } catch (e) {}
}

async function handleRegister() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const authMsg = document.getElementById('authMsg');

  if (!name || !email || !password) {
    authMsg.style.color = 'red';
    authMsg.textContent = 'Vui lòng điền đầy đủ thông tin!';
    return;
  }

  authMsg.style.color = '#333';
  authMsg.textContent = 'Đang đăng ký...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', name, email, password })
    });
    const result = await response.json();

    if (result.status === 'success') {
      authMsg.style.color = 'green';
      authMsg.textContent = 'Đăng ký thành công! Hãy đăng nhập.';
    } else {
      authMsg.style.color = 'red';
      authMsg.textContent = result.message || 'Đăng ký thất bại!';
    }
  } catch (err) {
    authMsg.style.color = 'red';
    authMsg.textContent = 'Lỗi kết nối máy chủ!';
  }
}

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const authMsg = document.getElementById('authMsg');

  if (!email || !password) {
    authMsg.style.color = 'red';
    authMsg.textContent = 'Vui lòng nhập email và mật khẩu!';
    return;
  }

  authMsg.style.color = '#333';
  authMsg.textContent = 'Đang đăng nhập...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, password })
    });
    const result = await response.json();

    if (result.status === 'success') {
      currentUser = result.user;
      try {
        localStorage.setItem('friendbook_user', JSON.stringify(currentUser));
      } catch (e) {}
      authMsg.textContent = '';
      showMainApp(); // Chuyển giao diện tức thì, không bị kẹt
    } else {
      authMsg.style.color = 'red';
      authMsg.textContent = result.message || 'Sai email hoặc mật khẩu!';
    }
  } catch (err) {
    authMsg.style.color = 'red';
    authMsg.textContent = 'Lỗi kết nối máy chủ!';
  }
}

function handleLogout() {
  currentUser = null;
  showAuthScreen();
}

function switchTab(tabName) {
  document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
  const targetView = document.getElementById(tabName);
  if (targetView) targetView.classList.remove('hidden');

  if (tabName === 'feed') loadFeed();
}

async function loadFeed() {
  const postsContainer = document.getElementById('posts');
  postsContainer.innerHTML = '<p>Đang tải bảng tin...</p>';
  try {
    const response = await fetch(`${API_URL}?action=getPosts`);
    const result = await response.json();
    if (result.status === 'success') {
      postsContainer.innerHTML = result.posts.map(p => `
        <div style="background: #fff; border: 1px solid #e1e8ed; padding: 12px; margin-bottom: 12px; border-radius: 8px;">
          <b>${p.author}</b>
          <p style="margin: 8px 0;">${p.content}</p>
          <small style="color: #888;">${p.time}</small>
        </div>
      `).join('') || '<p>Chưa có bài viết nào.</p>';
    } else {
      postsContainer.innerHTML = '<p>Không thể tải bài viết.</p>';
    }
  } catch (e) {
    postsContainer.innerHTML = '<p>Lỗi kết nối tải bảng tin.</p>';
  }
}

async function handleCreatePost() {
  const content = document.getElementById('postText').value.trim();
  if (!content) return;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'createPost', email: currentUser.email, author: currentUser.name, content })
    });
    const result = await response.json();
    if (result.status === 'success') {
      document.getElementById('postText').value = '';
      loadFeed();
    } else {
      alert(result.message || 'Không thể đăng bài.');
    }
  } catch (err) {
    alert('Lỗi kết nối khi đăng bài.');
  }
}
