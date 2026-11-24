// ===================================================================
//  data.js  -  saved data, small helper functions and the bill maths
// ===================================================================
 
const CURRENCY = "৳";
const DB_KEY = "mealdb_v3";           // browser storage name for all data
const SESSION_KEY = "mealsess_v3";    // browser storage name for "who is logged in"
const ADMIN_LOGIN = { username: "admin", password: "admin123" };
 
// ---------- Variables used by the whole app ----------
let db;                // all saved data (see createStarterData below)
let session = null;    // logged-in person: { role, name, userId }
let month = "";        // month being viewed, like "2026-11"
let currentPage = "";  // id of the page being shown
let selectedDay = "";  // date picked on the admin Daily page
 
// ---------- Today's date, like "2026-11-09" ----------
function pad(number) {
  return String(number).padStart(2, "0");      // 5 -> "05"
}
const now = new Date();
const TODAY = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
month = TODAY.slice(0, 7);
 
// ---------- Saving and loading ----------
// How the data looks:
//   users:    [{ id, name, email, password, blocked }]
//   menu:     { "2026-11-05": { lunch: "Rice", dinner: "Khichuri" } }
//   meals:    { "2026-11-05|1": { lunch: 1, dinner: 0, guests: 2 } }   (date | userId)
//   bazar:    [{ id, date, cost, note }]                               (market costs)
//   payments: [{ id, userId, month, date, amount, method, status }]   (status: pending / approved / rejected)
//   eggs:     { "2026-11|1": 6 }                                       (month | userId)
//   eggPrice: { "2026-11": 12 }
function createStarterData() {
  return {
    lastId: 10,
    users: [{ id: 1, name: "Demo User", email: "user@demo.com", password: "user123", blocked: false }],
    menu: {},
    meals: {},
    bazar: [],
    payments: [],
    eggs: {},
    eggPrice: {}
  };
}
 
function loadData() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (error) { db = null; }
  if (!db) db = createStarterData();
}
 
function saveData() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (error) { /* ignore */ }
}
 
function loadSession() {
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (error) { session = null; }
}
 
function saveSession() {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (error) { /* ignore */ }
}
 
// ---------- Small helpers ----------
function $(selector) {
  return document.querySelector(selector);
}
 
function readInput(id) {
  return document.getElementById(id).value;
}
 
function newId() {
  db.lastId = db.lastId + 1;
  return db.lastId;
}
 
function escapeHtml(text) {            // stops typed text from breaking the page
  return String(text).replace(/[&<>"]/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
  });
}
 
function money(amount) {               // 150.4 -> ৳150
  return CURRENCY + Math.round(amount);
}
 
function money2(amount) {              // 71.5 -> ৳71.50
  return CURRENCY + Number(amount).toFixed(2);
}
 
function formatDate(date) {            // "2026-11-05" -> "05-11-2026"
  return date.split("-").reverse().join("-");
}
 
function getUserName(userId) {
  const user = db.users.find(function (u) { return u.id === userId; });
  return user ? user.name : "(deleted)";
}
 
function getDaysOfMonth() {            // every date of the chosen month
  const parts = month.split("-").map(Number);
  const howMany = new Date(parts[0], parts[1], 0).getDate();
  const days = [];
  for (let i = 1; i <= howMany; i++) days.push(month + "-" + pad(i));
  return days;
}
 
let messageTimer;
function showMessage(text) {           // popup at the bottom of the screen
  const box = $("#msg");
  box.textContent = text;
  box.style.display = "block";
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () { box.style.display = "none"; }, 2200);
}
 
function monthPicker() {
  return `<div class="row"><b>Month:</b>
            <input type="month" value="${month}" onchange="changeMonth(this.value)">
          </div>`;
}
 
function statCard(value, label) {
  return `<div class="card stat"><b>${value}</b><span class="muted">${label}</span></div>`;
}
 
function balanceText(balance) {        // balance = paid - cost
  if (balance < 0) return `<span class="bad">Due ${money(-balance)}</span>`;
  if (balance > 0) return `<span class="good">Get back ${money(balance)}</span>`;
  return `<span class="good">Settled</span>`;
}
 
function statusBadge(payment) {
  if (payment.status === "pending") return `<span class="badge" style="color:var(--main)">Pending</span>`;
  if (payment.status === "rejected") return `<span class="badge bad">Rejected</span>`;
  return `<span class="badge good">Approved</span>`;
}
 
// ---------- Meals ----------
// One entry = one person on one date.
function getMealEntry(date, userId) {
  return db.meals[date + "|" + userId] || { lunch: 0, dinner: 0, guests: 0 };
}
 
function setMeal(date, userId, field, value) {      // field: "lunch", "dinner" or "guests"
  const key = date + "|" + userId;
  if (!db.meals[key]) db.meals[key] = { lunch: 0, dinner: 0, guests: 0 };
  db.meals[key][field] = value;
  saveData();
}
 
// ---------- The bill maths ----------
// Meal rate = (bazar cost - egg cost) / total meals     (same rate for everybody)
// Cost      = meals x rate + eggs
// Balance   = approved payments - cost
function calculateMonth() {
  const people = {};
  let totalMeals = 0;
  let totalEggCost = 0;
  const eggPrice = db.eggPrice[month] || 0;
 
  db.users.forEach(function (user) {
    people[user.id] = { lunches: 0, dinners: 0, guests: 0 };
  });
 
  // 1. count every meal in this month
  for (const key in db.meals) {
    const parts = key.split("|");
    const date = parts[0];
    const userId = parts[1];
    if (!date.startsWith(month) || !people[userId]) continue;
    people[userId].lunches += db.meals[key].lunch;
    people[userId].dinners += db.meals[key].dinner;
    people[userId].guests += db.meals[key].guests;
  }
 
  // 2. eggs and totals
  db.users.forEach(function (user) {
    const p = people[user.id];
    p.eggs = db.eggs[month + "|" + user.id] || 0;
    p.eggCost = p.eggs * eggPrice;
    p.meals = p.lunches + p.dinners + p.guests;
    totalEggCost += p.eggCost;
    totalMeals += p.meals;
  });
 
  // 3. the one fixed meal rate
  const bazarTotal = db.bazar
    .filter(function (b) { return b.date.startsWith(month); })
    .reduce(function (sum, b) { return sum + b.cost; }, 0);
  const rate = totalMeals > 0 ? Math.max(0, bazarTotal - totalEggCost) / totalMeals : 0;
 
  // 4. each person's cost, payments and balance
  db.users.forEach(function (user) {
    const p = people[user.id];
    const myPayments = db.payments.filter(function (x) { return x.userId === user.id && x.month === month; });
    p.mealCost = p.meals * rate;
    p.cost = p.mealCost + p.eggCost;
    p.paid = 0;
    p.pending = 0;
    myPayments.forEach(function (x) {
      if (x.status === "approved") p.paid += x.amount;
      if (x.status === "pending") p.pending += x.amount;
    });
    p.balance = p.paid - p.cost;
  });
 
  return { people: people, rate: rate, bazarTotal: bazarTotal, totalMeals: totalMeals, totalEggCost: totalEggCost };
}
 
