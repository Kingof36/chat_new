const API_URL = "https://script.google.com/macros/s/AKfycbzchy27tSwfMWmfeH8QK-ucbfGQQZrYz3BvdpNaafNEC9gly1G1W--Ud3dwkG868CBj1w/exec";

let currentUser = null;
let currentChatUser = null;
let base64Image = "";

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

  document.getElementById('register').addEventListener('click', handleRegister);
  document.getElementById('login').addEventListener('click', handleLogin);
  document.getElementById('logout').addEventListener('click', handleLogout);
  document.getElementById('postBtn').addEventListener('click', handleCreatePost);
  
  // Chat events
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('attachBtn').addEventListener('click', () => document.getElementById('imageInput').click());
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
  
  // Admin events
  const awardBtn = document.getElementById('awardBtn');
  if (awardBtn) awardBtn.addEventListener('click', handleAwardBadge);

  // Modal close
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('badgeModal').classList.add('hidden');
  });

  document.querySelectorAll('.nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.getAttribute('data-tab'));
    });
  });
}

function showMainApp() {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('logout').classList.remove('hidden');
  document.getElementById('who').textContent = `Xin chào, ${currentUser.name || currentUser.email}`;
  
  if (currentUser.email === 'admin@friendbook.com' || currentUser.email === 'admin') {
    document.getElementById('adminTab').classList.remove('hidden');
    loadAdminUsers();
  }

  loadFeed();
  checkRewardsNotification();
}

function showAuthScreen() {
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('logout').classList.add('hidden');
  document.getElementById('who').textContent = '';
  localStorage.removeItem('friendbook_user');
}

async function handleRegister() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('authMsg');

  if (!name || !email || !password) {
    msg.style.color = 'red';
    msg.textContent = 'Vui lòng điền đủ thông tin!';
    return;
  }

  msg.textContent = 'Đang đăng ký...';
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'register', name, email, password }) });
    const result = await res.json();
    if (result.status === 'success') {
      msg.style.color = 'green';
      msg.textContent = 'Đăng ký thành công! Hãy đăng nhập.';
    } else {
      msg.style.color = 'red';
      msg.textContent = result.message;
    }
  } catch (e) {
    msg.style.color = 'red';
    msg.textContent = 'Lỗi kết nối!';
  }
}

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('authMsg');

  if (!email || !password) {
    msg.style.color = 'red';
    msg.textContent = 'Vui lòng nhập tài khoản!';
    return;
  }

  msg.textContent = 'Đang đăng nhập...';
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) });
    const result = await res.json();
    if (result.status === 'success') {
      currentUser = result.user;
      localStorage.setItem('friendbook_user', JSON.stringify(currentUser));
      msg.textContent = '';
      showMainApp();
    } else {
      msg.style.color = 'red';
      msg.textContent = result.message;
    }
  } catch (e) {
    msg.style.color = 'red';
    msg.textContent = 'Lỗi kết nối máy chủ!';
  }
}

function handleLogout() {
  currentUser = null;
  showAuthScreen();
}

function switchTab(tabName) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(tabName).classList.remove('hidden');

  if (tabName === 'feed') loadFeed();
  if (tabName === 'chat') loadChatUsers();
  if (tabName === 'rewards') loadRewards();
  if (tabName === 'friends') loadFriendsData();
}

// Bảng tin
async function loadFeed() {
  const container = document.getElementById('posts');
  container.innerHTML = 'Đang tải...';
  try {
    const res = await fetch(`${API_URL}?action=getPosts`);
    const result = await res.json();
    if (result.status === 'success') {
      container.innerHTML = result.posts.map(p => `
        <div class="post-card">
          <b>${p.author}</b>
          <p>${p.content}</p>
          <small>${p.time}</small>
        </div>
      `).join('') || '<p>Chưa có bài viết.</p>';
    }
  } catch (e) { container.innerHTML = 'Lỗi tải bảng tin.'; }
}

async function handleCreatePost() {
  const content = document.getElementById('postText').value.trim();
  if (!content) return;
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'createPost', email: currentUser.email, author: currentUser.name, content }) });
  document.getElementById('postText').value = '';
  loadFeed();
}

// Chat Messenger & Gửi ảnh
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(uploadEvent) {
    base64Image = uploadEvent.target.result;
    alert('Đã đính kèm ảnh thành công! Bấm Gửi để gửi ảnh.');
  };
  reader.readAsDataURL(file);
}

async function loadChatUsers() {
  const list = document.getElementById('chatFriends');
  list.innerHTML = 'Đang tải danh sách...';
  try {
    const res = await fetch(`${API_URL}?action=getUsers`);
    const result = await res.json();
    if (result.status === 'success') {
      list.innerHTML = result.users.filter(u => u.email !== currentUser.email).map(u => `
        <div class="chat-user-item" onclick="selectChatUser('${u.email}', '${u.name}')">
          👤 ${u.name}
        </div>
      `).join('') || '<p>Chưa có người dùng nào khác.</p>';
    }
  } catch (e) { list.innerHTML = 'Lỗi tải danh sách.'; }
}

function selectChatUser(email, name) {
  currentChatUser = email;
  document.getElementById('chatTitle').textContent = `Đang chat với: ${name}`;
  loadMessages();
}

async function loadMessages() {
  if (!currentChatUser) return;
  const msgContainer = document.getElementById('messages');
  try {
    const res = await fetch(`${API_URL}?action=getMessages&user1=${currentUser.email}&user2=${currentChatUser}`);
    const result = await res.json();
    if (result.status === 'success') {
      msgContainer.innerHTML = result.messages.map(m => `
        <div class="message-bubble ${m.from === currentUser.email ? 'sent' : 'received'}">
          <p>${m.text}</p>
          ${m.image ? `<img src="${m.image}" style="max-width: 200px; border-radius: 6px; margin-top: 5px;" />` : ''}
          <small>${m.time}</small>
        </div>
      `).join('') || '<p>Chưa có tin nhắn nào.</p>';
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }
  } catch (e) {}
}

async function sendMessage() {
  const textInput = document.getElementById('message');
  const text = textInput.value.trim();
  if (!text && !base64Image) return;

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'sendMessage',
      from: currentUser.email,
      to: currentChatUser,
      text: text,
      image: base64Image
    })
  });

  textInput.value = '';
  base64Image = "";
  loadMessages();
}

// Phiếu bé ngoan & Thông báo
async function checkRewardsNotification() {
  try {
    const res = await fetch(`${API_URL}?action=getRewards&email=${currentUser.email}`);
    const result = await res.json();
    if (result.status === 'success') {
      const lastCount = localStorage.getItem('last_reward_count') || 0;
      if (result.count > lastCount && result.count > 0) {
        document.getElementById('badgeModal').classList.remove('hidden');
        localStorage.setItem('last_reward_count', result.count);
      }
    }
  } catch (e) {}
}

async function loadRewards() {
  try {
    const res = await fetch(`${API_URL}?action=getRewards&email=${currentUser.email}`);
    const result = await res.json();
    if (result.status === 'success') {
      document.getElementById('weekCount').textContent = result.count;
      document.getElementById('rewardHistory').innerHTML = result.history.map(h => `
        <div class="reward-item">⭐ Nhận 1 phiếu lúc ${h.time}</div>
      `).join('') || '<p>Chưa có lịch sử nhận phiếu.</p>';
    }
  } catch (e) {}
}

// Quản trị viên
async function loadAdminUsers() {
  const select = document.getElementById('awardUser');
  const res = await fetch(`${API_URL}?action=getUsers`);
  const result = await res.json();
  if (result.status === 'success') {
    select.innerHTML = result.users.map(u => `<option value="${u.email}">${u.name} (${u.email})</option>`).join('');
  }
}

document.getElementById('awardBtn').addEventListener('click', async () => {
  const email = document.getElementById('awardUser').value;
  const reason = document.getElementById('awardReason').value;
  const msg = document.getElementById('adminMsg');

  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'awardBadge', email, reason }) });
  const result = await res.json();
  if (result.status === 'success') {
    msg.style.color = 'green';
    msg.textContent = 'Phát phiếu thành công!';
  } else {
    msg.style.color = 'red';
    msg.textContent = 'Lỗi phát phiếu.';
  }
});

function loadFriendsData() {}
