/* =====================================================
   ⚙️ Conexus Main Script — Dashboard + Auth + Inventory
===================================================== */
/* =====================================================
   🔐 ACCESS CONTROL — Redirect if not logged in
===================================================== */

// check login status
const isAuthPage = window.location.pathname.includes("auth.html");
const isLoggedIn = localStorage.getItem("loggedInUser");

if (!isAuthPage && !isLoggedIn) {
  window.location.href = "auth.html";
}

// ===== 🌗 DARK/LIGHT MODE =====
const themeToggle = document.getElementById("themeToggle");
const currentPage = window.location.pathname;

// Hide toggle on auth page
if (themeToggle) {
  if (currentPage.includes("auth.html")) {
    themeToggle.style.display = "none";
  } else {
    themeToggle.style.display = "block";
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "🌞";
  } else {
    document.body.classList.remove("dark");
    if (themeToggle) themeToggle.textContent = "🌙";
  }
}

// Load saved theme
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

// Toggle theme
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });
}

// ===== 🚀 NAVBAR (Dock Hover) =====
const topDock = document.getElementById("topDock");
if (topDock) {
  const hoverZone = document.createElement("div");
  hoverZone.style.position = "fixed";
  hoverZone.style.top = "0";
  hoverZone.style.left = "0";
  hoverZone.style.width = "100%";
  hoverZone.style.height = "40px";
  hoverZone.style.zIndex = "998";
  document.body.appendChild(hoverZone);

  hoverZone.addEventListener("mouseenter", () => (topDock.style.top = "0"));
  topDock.addEventListener("mouseleave", () => (topDock.style.top = "-60px"));
}

// ===== 🔑 AUTH PAGE =====
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

if (loginTab && signupTab && loginForm && signupForm) {
  loginTab.addEventListener("click", () => {
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
  });

  signupTab.addEventListener("click", () => {
    signupForm.style.display = "block";
    loginForm.style.display = "none";
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
  });
}

// ===== 📦 INVENTORY PAGE =====
const addItemBtn = document.getElementById("addItemBtn");
const itemList = document.getElementById("itemList");

if (addItemBtn && itemList) {
  addItemBtn.addEventListener("click", () => {
    const name = document.getElementById("itemName").value;
    const qty = document.getElementById("itemQty").value;
    if (name && qty) {
      const li = document.createElement("li");
      li.textContent = `${name} - ${qty}`;
      itemList.appendChild(li);
      document.getElementById("itemName").value = "";
      document.getElementById("itemQty").value = "";
    } else {
      alert("Bro fill both fields 💀");
    }
  });
}

// ===== 📊 DASHBOARD CHART =====
if (document.getElementById("stockChart")) {
  const ctx = document.getElementById("stockChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Paracetamol", "Amoxicillin", "Vitamin C", "Ibuprofen", "Insulin"],
      datasets: [
        {
          label: "Stock Quantity",
          data: [120, 80, 150, 60, 90],
          backgroundColor: "rgba(75,192,192,0.6)",
          borderRadius: 6
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: "#fff" } },
      },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } },
      },
    },
  });
}
// ===== 🧠 AUTH LOGIC =====
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

if (signupBtn) {
  signupBtn.addEventListener("click", () => {
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    if (email && password) {
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userPassword", password);
      alert("Signup successful! Now login 🔓");
      document.getElementById("signupForm").style.display = "none";
      document.getElementById("loginForm").style.display = "block";
    } else {
      alert("Enter both email and password 😭");
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const storedEmail = localStorage.getItem("userEmail");
    const storedPassword = localStorage.getItem("userPassword");

    if (email === storedEmail && password === storedPassword) {
      localStorage.setItem("loggedInUser", email);
      alert("Welcome back 😎");
      window.location.href = "dashboard.html";
    } else {
      alert("Invalid login. Try again 💀");
    }
  });
}
// ===== 🧠 AUTH LOGIC (No popups, inline messages) =====
const loginForm2 = document.getElementById("loginForm");
const signupForm2 = document.getElementById("signupForm");
const loginMsg = document.getElementById("loginMsg");
const signupMsg = document.getElementById("signupMsg");

if (signupForm2) {
  signupForm2.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupMsg.textContent = "⏳ Creating your account...";
    signupMsg.style.color = "white";

    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!username || !email || !password) {
      signupMsg.textContent = "⚠️ Please fill out all fields!";
      signupMsg.style.color = "orange";
      return;
    }

    const res = await fetch("http://localhost:5000/users");
    const users = await res.json();

    if (users.find((u) => u.username === username)) {
      signupMsg.textContent = "❌ Username already exists!";
      signupMsg.style.color = "red";
      return;
    }

    await fetch("http://localhost:5000/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, role: "patient" }),
    });

    signupMsg.textContent = "✅ Account created! You can sign in now.";
    signupMsg.style.color = "limegreen";
    signupForm2.reset();
  });
}

if (loginForm2) {
  loginForm2.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "⏳ Checking credentials...";
    loginMsg.style.color = "white";

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const res = await fetch("http://localhost:5000/users");
    const users = await res.json();

    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      loginMsg.textContent = `✅ Welcome back, ${user.username}! Redirecting...`;
      loginMsg.style.color = "limegreen";
      localStorage.setItem("loggedInUser", JSON.stringify(user));
      setTimeout(() => {
        if (user.role === "admin") {
          window.location.href = "admin.html";
        } else if (user.role === "doctor") {
          window.location.href = "doctor.html";
        } else {
          window.location.href = "dashboard.html";
        }
      }, 1000);
    } else {
      loginMsg.textContent = "❌ Invalid username or password.";
      loginMsg.style.color = "red";
    }
  });
}
// ===== 🚨 ALERT SYSTEM =====
if (document.querySelector(".page-alerts")) {
  const alertMessageInput = document.getElementById("alertMessage");
  const alertSeverityInput = document.getElementById("alertSeverity");
  const addAlertBtn = document.getElementById("addAlertBtn");
  const alertsContainer = document.getElementById("alertsContainer");
  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

  const API_URL = "http://localhost:5000/alerts";

  // 🔁 Fetch & display alerts
  async function loadAlerts() {
    const res = await fetch(API_URL);
    const alerts = await res.json();

    alertsContainer.innerHTML = "";

    alerts.forEach(alert => {
      if (
        alert.global === true ||
        alert.user === currentUser.username ||
        currentUser.role === "admin"
      ) {
        const alertDiv = document.createElement("div");
        alertDiv.className = `alert alert-${alert.severity}`;
        alertDiv.innerHTML = `
          <p><strong>${alert.severity.toUpperCase()}</strong> — ${alert.message}</p>
          <small>by ${alert.user}${alert.global ? " 🌍 (Global)" : ""}</small>
        `;
        alertsContainer.appendChild(alertDiv);
      }
    });
  }

  loadAlerts();

  // 🧠 Add new alert
  addAlertBtn.addEventListener("click", async () => {
    const message = alertMessageInput.value.trim();
    const severity = alertSeverityInput.value;
    if (!message) return alert("Enter an alert message, bro 💀");

    const newAlert = {
      message,
      severity,
      user: currentUser.username,
      global: currentUser.role === "admin" // only admin makes global
    };

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAlert)
    });

    alertMessageInput.value = "";
    loadAlerts();
  });
}
