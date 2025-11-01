/* ======================================================
   GLOBAL THEME TOGGLE
====================================================== */
const toggleBtn = document.getElementById("themeToggle");
if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

/* ======================================================
   AUTH PAGE (Login / Signup)
====================================================== */
async function handleAuth(isSignup = false) {
  const username = document.getElementById("username")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
  if (!username || !password) return alert("Please fill all fields!");

  const endpoint = isSignup ? "/api/signup" : "/api/login";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Auth failed");

    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } catch (err) {
    alert(err.message);
  }
}

/* ======================================================
   DASHBOARD PAGE
====================================================== */
async function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "auth.html");

  try {
    const res = await fetch("/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    // Update metrics
    document.getElementById("totalMedicines").textContent = data.totalMedicines || 0;
    document.getElementById("lowStock").textContent = data.lowStock || 0;
    document.getElementById("expiringSoon").textContent = data.expiringSoon || 0;
    document.getElementById("totalValue").textContent = `₹${data.totalValue?.toLocaleString() || 0}`;

    // Render chart
    const ctx = document.getElementById("stockChart");
    if (ctx) {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.chart?.labels || [],
          datasets: [{
            label: "Stock Quantity",
            data: data.chart?.values || [],
            backgroundColor: "rgba(100, 149, 237, 0.6)",
            borderColor: "rgba(100, 149, 237, 1)",
            borderWidth: 1,
          }],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });
    }

    // Recent activity
    const logList = document.getElementById("recentActivity");
    logList.innerHTML = "";
    (data.recentActivity || []).forEach(log => {
      const li = document.createElement("li");
      li.textContent = log;
      logList.appendChild(li);
    });
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

/* ======================================================
   INVENTORY PAGE
====================================================== */
let inventory = [];

async function loadInventory() {
  try {
    const res = await fetch("/api/inventory");
    inventory = await res.json();
    renderInventoryTable(inventory);
  } catch (err) {
    console.error("Failed to load inventory:", err);
  }
}

function renderInventoryTable(data) {
  const tbody = document.getElementById("inventoryTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.expiry}</td>
      <td>${item.supplier}</td>
      <td>${item.category}</td>
      <td>${item.status}</td>
      <td>
        <button onclick="editItem(${item.id})" class="secondary-btn">✏️</button>
        <button onclick="deleteItem(${item.id})" class="secondary-btn">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function addItem(item) {
  try {
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) loadInventory();
  } catch (err) {
    console.error("Failed to add item:", err);
  }
}

async function editItem(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return alert("Item not found!");

  // TODO: open modal pre-filled with `item` values
  alert(`Edit feature for ${item.name} coming soon`);
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  try {
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    if (res.ok) loadInventory();
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

const searchInput = document.getElementById("search");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = inventory.filter(i =>
      i.name.toLowerCase().includes(term) ||
      i.supplier.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term)
    );
    renderInventoryTable(filtered);
  });
}

/* ======================================================
   ALERTS PAGE
====================================================== */
async function loadAlerts() {
  try {
    const res = await fetch("/api/alerts");
    const data = await res.json();
    const container = document.querySelector(".alerts");
    if (!container) return;
    container.innerHTML = "";

    data.forEach(alertItem => {
      const div = document.createElement("div");
      div.className = `alert ${alertItem.type}`;
      div.textContent = alertItem.message;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load alerts:", err);
  }
}

/* ======================================================
   PAGE INITIALIZER
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("dashboard")) loadDashboard();
  if (document.body.classList.contains("inventory")) loadInventory();
  if (document.body.classList.contains("alerts")) loadAlerts();
});
