const isLoggedIn = localStorage.getItem("loggedIn");
if (isLoggedIn !== "true") {
  alert("Please login first");
  window.location.href = "index.html";
}

const hour = new Date().getHours();
let greeting = "Welcome";
if (hour < 12) greeting = "Good Morning";
else if (hour < 18) greeting = "Good Afternoon";
else greeting = "Good Evening";

function showNotice(message, kind = "info") {
  const notice = document.getElementById("profileNotice");
  if (!notice) return;
  notice.className = `profile-notice show ${kind}`;
  notice.textContent = message;
  clearTimeout(showNotice.timeout);
  showNotice.timeout = setTimeout(() => notice.classList.remove("show"), 2600);
}

function renderProfile() {
  const userName = localStorage.getItem("name") || "Guest";
  const phone = localStorage.getItem("phone") || "Not Available";
  const walletBalance = localStorage.getItem("walletBalance") || "1250";
  const rewardPoints = localStorage.getItem("rewardPoints") || "350";

  document.getElementById("welcome").innerHTML = `👋 ${greeting}, ${userName}`;
  document.getElementById("phone").innerHTML = `📱 ${phone}`;
  document.getElementById("avatar").innerText = userName.charAt(0).toUpperCase();
  document.getElementById("walletBalance").innerText = `₹${walletBalance}`;
  document.getElementById("rewardPoints").innerText = rewardPoints;
}

function logout() {
  const confirmLogout = confirm("Are you sure you want to logout?");
  if (!confirmLogout) return;
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("name");
  localStorage.removeItem("phone");
  window.location.href = "index.html";
}

function openActionModal(type) {
  const modal = document.getElementById("actionModal");
  const content = document.getElementById("actionModalContent");
  if (!modal || !content) return;

  const userName = localStorage.getItem("name") || "Guest";
  const phone = localStorage.getItem("phone") || "Not Available";
  const walletBalance = localStorage.getItem("walletBalance") || "1250";
  const notifyEnabled = localStorage.getItem("notifyEnabled") === "true";
  const darkMode = localStorage.getItem("darkMode") === "true";
  const locationEnabled = localStorage.getItem("locationEnabled") === "true";

  if (type === "edit") {
    content.innerHTML = `
      <h3>Edit profile</h3>
      <label>Name</label>
      <input id="editName" value="${userName}">
      <label>Phone</label>
      <input id="editPhone" value="${phone}">
      <div class="action-modal-actions">
        <button class="secondary" onclick="closeActionModal()">Cancel</button>
        <button class="primary" onclick="saveProfileChanges()">Save</button>
      </div>`;
  } else if (type === "wallet") {
    content.innerHTML = `
      <h3>Wallet</h3>
      <p style="margin-bottom:12px;color:#6b7280;">Current balance: <strong>₹${walletBalance}</strong></p>
      <div class="action-modal-actions">
        <button class="secondary" onclick="addWalletAmount(500)">+ ₹500</button>
        <button class="primary" onclick="addWalletAmount(1000)">+ ₹1000</button>
      </div>`;
  } else if (type === "settings") {
    content.innerHTML = `
      <h3>Settings</h3>
      <div class="toggle-row"><span>Push notifications</span><input type="checkbox" id="notifyEnabled" ${notifyEnabled ? "checked" : ""}></div>
      <div class="toggle-row"><span>Location access</span><input type="checkbox" id="locationEnabled" ${locationEnabled ? "checked" : ""}></div>
      <div class="action-modal-actions">
        <button class="secondary" onclick="closeActionModal()">Cancel</button>
        <button class="primary" onclick="saveSettings()">Save</button>
      </div>`;
  }

  modal.hidden = false;
}

function closeActionModal() {
  document.getElementById("actionModal").hidden = true;
}

function saveProfileChanges() {
  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  if (!name || !phone) {
    showNotice("Please add both name and phone.");
    return;
  }
  localStorage.setItem("name", name);
  localStorage.setItem("phone", phone);
  renderProfile();
  closeActionModal();
  showNotice("Profile updated successfully.");
}

function addWalletAmount(amount) {
  const current = Number(localStorage.getItem("walletBalance") || "1250");
  const updated = current + amount;
  localStorage.setItem("walletBalance", updated.toString());
  renderProfile();
  closeActionModal();
  showNotice(`Wallet topped up by ₹${amount}.`);
}

function saveSettings() {
  localStorage.setItem("notifyEnabled", document.getElementById("notifyEnabled").checked ? "true" : "false");
  localStorage.setItem("locationEnabled", document.getElementById("locationEnabled").checked ? "true" : "false");
  closeActionModal();
  showNotice("Settings saved.");
}

async function loadOrderHistory() {
  try {
    const response = await fetch("/api/orders");
    let orders = await response.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      orders = JSON.parse(localStorage.getItem("orders") || "[]");
    } else {
      localStorage.setItem("orders", JSON.stringify(orders));
    }
    document.getElementById("totalOrders").innerText = orders.length;
    const orderContainer = document.getElementById("orderHistory");
    if (!orderContainer) return;
    orderContainer.innerHTML = "";
    if (orders.length === 0) {
      orderContainer.innerHTML = '<div class="order-card"><h3>No Orders Yet</h3><p>Your orders will appear here.</p></div>';
      return;
    }
    orders.slice(0, 5).forEach(order => {
      orderContainer.innerHTML += `
        <div class="order-card">
          <h3>Order #${order.id}</h3>
          <p><strong>Status:</strong> ${order.status || "Pending"}</p>
          <p><strong>Amount:</strong> ₹${order.amount || 0}</p>
          <p><strong>Customer:</strong> ${order.customer_name || "You"}</p>
          <p><strong>Order Type:</strong> ${order.order_type || "Dine-in"}</p>
        </div>`;
    });
  } catch (err) {
    console.error("Order History Error:", err);
    const fallback = JSON.parse(localStorage.getItem("orders") || "[]");
    document.getElementById("totalOrders").innerText = fallback.length;
    document.getElementById("orderHistory").innerHTML = fallback.length ? fallback.slice(0, 5).map(order => `<div class="order-card"><h3>Order #${order.id}</h3><p><strong>Status:</strong> ${order.status || "Pending"}</p><p><strong>Amount:</strong> ₹${order.amount || 0}</p></div>`).join("") : '<div class="order-card"><h3>No Orders Yet</h3><p>Your orders will appear here.</p></div>';
  }
}

document.querySelectorAll(".menu-item").forEach(item => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    if (action === "orders") {
      window.location.href = "orders.html";
    } else {
      openActionModal(action);
    }
  });
});

renderProfile();
loadOrderHistory();