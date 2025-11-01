/* ===== Global Variables ===== */
const toggleBtn = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("theme");

/* ===== Theme Toggle ===== */
if (currentTheme === "dark") document.body.classList.add("dark");

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const theme = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", theme);
  });
}

/* ===== Auth Page ===== */
async function handleAuth(isSignup = false) {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) return alert("Please enter both username and password!");

  const endpoint = isSignup ? "/api/signup" : "/api/login";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } else {
    alert(data.message || "Authentication failed");
  }
}

/* ===== Dashboard Page ===== */
async function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "auth.html");

  const res = await fetch("/api/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  // Update metrics
  document.getElementById("totalMedicines").textContent = data.totalMedicines;
  document.getElementById("lowStock").textContent = data.lowStock;
  document.getElementById("expiringSoon").textContent = data.expiringSoon;
  document.getElementById("totalValue").textContent = `₹${data.totalValue.toLocaleString()}`;

  // Render Chart.js
  const ctx = document.getElementById("stockChart");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.chart.labels,
      datasets: [
        {
          label: "Stock Quantity",
          data: data.chart.values,
          backgroundColor: "rgba(78, 140, 255, 0.5)",
          borderColor: "rgba(78, 140, 255, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  // Recent activity
  const logList = document.getElementById("recentActivity");
  logList.innerHTML = "";
  data.recentActivity.forEach((log) => {
    const li = document.createElement("li");
    li.textContent = log;
    logList.appendChild(li);
  });
}

/* ===== Inventory Page ===== */
async function loadInventory() {
  const res = await fetch("/api/inventory");
  const data = await res.json();

  const tableBody = document.querySelector("#inventoryTable tbody");
  tableBody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.expiry}</td>
      <td>${item.supplier}</td>
      <td>${item.category}</td>
      <td>${item.status}</td>
      <td>
        <button onclick="editItem(${item.id})">✏️</button>
        <button onclick="deleteItem(${item.id})">🗑️</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function editItem(id) {
  // Logic to edit medicine (open popup or redirect)
  alert(`Edit feature for item ${id} coming soon!`);
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
  if (res.ok) {
    alert("Item deleted!");
    loadInventory();
  }
}

/* ===== Alerts Page ===== */
async function loadAlerts() {
  const res = await fetch("/api/alerts");
  const data = await res.json();

  const container = document.querySelector(".alerts");
  container.innerHTML = "";

  data.forEach((alertItem) => {
    const div = document.createElement("div");
    div.className = `alert ${alertItem.type}`;
    div.textContent = alertItem.message;
    container.appendChild(div);
  });
}

/* ===== Page Initializer ===== */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("dashboard")) loadDashboard();
  if (document.body.classList.contains("inventory")) loadInventory();
  if (document.body.classList.contains("alerts")) loadAlerts();
});
