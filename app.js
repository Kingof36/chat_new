const API_URL = "https://script.google.com/macros/s/AKfycbyKm7Rqhmz33jHtbvLwJdjRxHCGZ4EJGAvH-55wVCwdBDTFrY_TuUggAAiviqQtSvLNIg/exec";

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

  // Auth
  const regBtn = document.getElementById('register');
  const logBtn = document.getElementById('login');
  const logOutBtn = document.getElementById('logout');
  if (regBtn) regBtn.addEventListener('click', handleRegister);
  if (logBtn) logBtn.addEventListener('click', handleLogin);
  if (logOutBtn) logOutBtn.addEventListener('click', handleLogout);

  // Post
  const postBtn = document.getElementById('postBtn');
  if (postBtn) postBtn.addEventListener('click', handleCreatePost);

  // Chat
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const imageInput = document.getElementById('imageInput');
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (attachBtn && imageInput) {
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);
  }

  // Friends
  const searchBtn = document.getElementById('searchFriendBtn');
  if (searchBtn) searchBtn.addEventListener('click', handleSearchFriends);
  const searchInput = document.getElementById('searchFriendInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearchFriends();
    });
  }

  // Admin
  const awardBtn = document.getElementById('awardBtn');
  if (awardBtn) awardBtn.addEventListener('click', handleAwardBadge);

  // Modal
  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      document.getElementById('badgeModal').classList.add('hidden');
    });
  }

  // Tabs
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
  try { localStorage.removeItem('friendbook_user'); } catch (e) {}
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

  msg.style.color = '#333';
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

  msg.style.color = '#333';
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
  const target = document.getElementById(tabName);
  if (target) target.classList.remove('hidden');

  if (tabName === 'feed') loadFeed();
  if (tabName === 'chat') loadChatUsers();
  if (tabName === 'rewards') loadRewards();
  if (tabName === 'friends') loadFriendsData();
}

// Bảng tin
async function loadFeed() {
  const container = document.getElementById('posts');
  if (!container) return;
  container.innerHTML = '<p>Đang tải bảng tin...</p>';
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
      `).join('') || '<p>Chưa có bài viết nào.</p>';
    }
  } catch (e) { container.innerHTML = '<p>Lỗi tải bảng tin.</p>'; }
}

async function handleCreatePost() {
  const content = document.getElementById('postText').value.trim();
  if (!content) return;
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'createPost', email: currentUser.email, author: currentUser.name, content }) });
  document.getElementById('postText').value = '';
  loadFeed();
}

// Kết bạn & Tìm kiếm theo tên hiển thị
function loadFriendsData() {
  loadFriendRequests();
  loadMyFriends();
}

async function handleSearchFriends() {
  const keyword = document.getElementById('searchFriendInput').value.trim();
  const resultsContainer = document.getElementById('searchResults');
  
  if (!keyword) {
    resultsContainer.innerHTML = '<p style="padding: 10px; color: red; font-size: 13px;">Vui lòng nhập tên hiển thị để tìm kiếm!</p>';
    return;
  }

  resultsContainer.innerHTML = '<p style="padding: 10px; font-size: 13px;">Đang tìm kiếm...</p>';
  try {
    const res = await fetch(`${API_URL}?action=searchUsers&keyword=${encodeURIComponent(keyword)}&email=${encodeURIComponent(currentUser.email)}`);
    const result = await res.json();
    
    if (result.status === 'success') {
      if (result.users.length === 0) {
        resultsContainer.innerHTML = '<p style="padding: 10px; font-size: 13px; color: #666;">Không tìm thấy người dùng phù hợp.</p>';
        return;
      }

      resultsContainer.innerHTML = result.users.map(u => `
        <div class="friend-item">
          <div>
            <b style="font-size: 14px; color: #050505;">${u.name}</b><br>
            <small style="color: #65676b;">${u.email}</small>
          </div>
          <button onclick="sendFriendRequest('${u.email}')">Kết bạn</button>
        </div>
      `).join('');
    }
  } catch (e) {
    resultsContainer.innerHTML = '<p style="padding: 10px; color: red; font-size: 13px;">Lỗi kết nối.</p>';
  }
}

async function sendFriendRequest(targetEmail) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'sendFriendRequest', from: currentUser.email, to: targetEmail })
    });
    const result = await res.json();
    alert(result.message || 'Đã gửi lời mời kết bạn!');
    loadFriendsData();
  } catch (e) { alert('Lỗi kết nối.'); }
}

async function loadFriendRequests() {
  const container = document.getElementById('requests');
  if (!container) return;
  try {
    const res = await fetch(`${API_URL}?action=getFriendRequests&email=${encodeURIComponent(currentUser.email)}`);
    const result = await res.json();
    if (result.status === 'success') {
      container.innerHTML = result.requests.map(r => `
        <div class="friend-item">
          <div>
            <b style="font-size: 14px; color: #050505;">${r.name}</b><br>
            <small style="color: #65676b;">${r.email}</small>
          </div>
          <button class="accept" onclick="acceptFriendRequest('${r.email}')">Chấp nhận</button>
        </div>
      `).join('') || '<p style="padding: 10px; color: #666; font-size: 13px;">Không có lời mời kết bạn nào.</p>';
    }
  } catch (e) {}
}

async function acceptFriendRequest(fromEmail) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'acceptFriendRequest', user1: currentUser.email, user2: fromEmail })
    });
    const result = await res.json();
    alert(result.message || 'Đã kết bạn thành công!');
    loadFriendsData();
  } catch (e) { alert('Lỗi kết nối.'); }
}

async function loadMyFriends() {
  const container = document.getElementById('myFriends');
  if (!container) return;
  try {
    const res = await fetch(`${API_URL}?action=getMyFriends&email=${encodeURIComponent(currentUser.email)}`);
    const result = await res.json();
    if (result.status === 'success') {
      container.innerHTML = result.friends.map(f => `
        <div class="friend-item">
          <div>
            <b style="font-size: 14px; color: #050505;">👤 ${f.name}</b><br>
            <small style="color: #65676b;">${f.email}</small>
          </div>
          <button onclick="switchTab('chat'); selectChatUser('${f.email}', '${f.name}');">Nhắn tin</button>
        </div>
      `).join('') || '<p style="padding: 10px; color: #666; font-size: 13px;">Chưa có bạn bè nào.</p>';
    }
  } catch (e) {}
}

// Messenger & Gửi ảnh
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
  if (!list) return;
  list.innerHTML = '<p style="padding: 12px; font-size: 13px;">Đang tải danh sách...</p>';
  try {
    const res = await fetch(`${API_URL}?action=getMyFriends&email=${encodeURIComponent(currentUser.email)}`);
    const result = await res.json();
    if (result.status === 'success') {
      list.innerHTML = result.friends.map(u => `
        <div class="chat-user-item" onclick="selectChatUser('${u.email}', '${u.name}')">
          👤 ${u.name}
        </div>
      `).join('') || '<p style="padding: 12px; font-size: 13px; color: #666;">Chưa có bạn bè để nhắn tin. Hãy kết bạn trước nhé!</p>';
    }
  } catch (e) { list.innerHTML = '<p style="padding: 12px;">Lỗi tải danh sách.</p>'; }
}

function selectChatUser(email, name) {
  currentChatUser = email;
  document.getElementById('chatTitlesurname') || (document.getElementById('chatTitle').textContent = `Đang chat với: ${name}`);
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
          ${m.image ? `<img src="${m.image}" style="max-width: 200px; border-radius: 8px; margin-top: 5px; display: block;" />` : ''}
          <small>${m.time}</small>
        </div>
      `).join('') || '<p style="text-align: center; color: #888; font-size: 13px;">Hãy gửi tin nhắn đầu tiên cho bạn ấy!</p>';
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }
  } catch (e) {}
}

async function sendMessage() {
  const textInput = document.getElementById('message');
  const text = textInput.value.trim();
  if ((!text && !base64Image) || !currentChatUser) return;

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
    const res = await fetch(`${API_URL}?action=getRewards&email=${encodeURIComponent(currentUser.email)}`);
    const result = await res.json();
    if (result.status === 'success') {
      const lastCount = parseInt(localStorage.getItem('last_reward_count') || 0);
      if (result.count > lastCount) {
        document.getElementById('badgeModal').classList.remove('hidden');
        localStorage.setItem('last_reward_count', result.count);
      }
    }
  } catch (e) {}
}

async function loadRewards() {
  try {
    const res = await fetch(`${API_URL}?action=getRewards&email=${encodeURIComponent(currentUser.email)}`);
    const result = await res.json();
    if (result.status === 'success') {
      document.getElementById('weekCount').textContent = result.count;
      document.getElementById('rewardHistory').innerHTML = result.history.map(h => `
        <div class="reward-item">⭐ Nhận 1 phiếu bé ngoan lúc ${h.time} <br><small>Lý do: ${h.reason}</small></div>
      `).join('') || '<p style="font-size: 13px; color: #666;">Chưa có lịch sử nhận phiếu.</p>';
    }
  } catch (e) {}
}

// Quản trị viên
async function loadAdminUsers() {
  const select = document.getElementById('awardUser');
  if (!select) return;
  const res = await fetch(`${API_URL}?action=getUsers`);
  const result = await res.json();
  if (result.status === 'success') {
    select.innerHTML = result.users.map(u => `<option value="${u.email}">${u.name} (${u.email})</option>`).join('');
  }
}

async function handleAwardBadge() {
  const email = document.getElementById('awardUser').value;
  const reason = document.getElementById('awardReason').value;
  const msg = document.getElementById('adminMsg');

  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'awardBadge', email, reason }) });
  const result = await res.json();
  if (result.status === 'success') {
    msg.style.color = 'green';
    msg.textContent = 'Phát phiếu thành công!';
    document.getElementById('awardReason').value = '';
  } else {
    msg.style.color = 'red';
    msg.textContent = 'Lỗi phát phiếu.';
  }
}
