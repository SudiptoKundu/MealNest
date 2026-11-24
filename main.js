
const ADMIN_PAGES = [
  { id: "summary",  label: "Summary",    render: adminSummaryPage },
  { id: "members",  label: "Members",    render: adminMembersPage },
  { id: "menu",     label: "Menu",       render: adminMenuPage },
  { id: "daily",    label: "Daily",      render: adminDailyPage },
  { id: "sheet",    label: "Meal Sheet", render: adminSheetPage },
  { id: "bazar",    label: "Bazar",      render: adminBazarPage },
  { id: "payments", label: "Payments",   render: adminPaymentsPage },
  { id: "eggs",     label: "Eggs",       render: adminEggsPage },
  { id: "users",    label: "Users",      render: adminUsersPage }
];
 
const USER_PAGES = [
  { id: "overview", label: "Overview",   render: userOverviewPage },
  { id: "meals",    label: "My Meals",   render: userMealsPage },
  { id: "menu",     label: "Menu",       render: userMenuPage },
  { id: "payment",  label: "Payment",    render: userPaymentPage },
  { id: "bill",     label: "My Bill",    render: userBillPage },
  { id: "history",  label: "History",    render: userHistoryPage }
];
 
function getPages() {
  return session.role === "admin" ? ADMIN_PAGES : USER_PAGES;
}

function showPage(pageId) {
  currentPage = pageId;
  const pages = getPages();
  const pendingCount = db.payments.filter(function (x) { return x.status === "pending"; }).length;
 
  let buttons = "";
  pages.forEach(function (page) {
    let label = page.label;
    if (session.role === "admin" && page.id === "payments" && pendingCount > 0) label += " (" + pendingCount + ")";
    buttons += `<button class="${page.id === pageId ? "active" : ""}" onclick="showPage('${page.id}')">${label}</button>`;
  });
  $("#nav").innerHTML = buttons;
 
  const page = pages.find(function (p) { return p.id === pageId; });
  $("#app").innerHTML = page.render();
}
 
function changeMonth(newMonth) {
  if (!newMonth) return;
  month = newMonth;
  showPage(currentPage);
}

function startApp() {
  const userStillExists = session.role === "admin" || db.users.some(function (u) { return u.id === session.userId; });
  if (!userStillExists) {
    session = null;
    saveSession();
    return showLoginPage();
  }
 
  $("#login").hidden = true;
  $("#shell").hidden = false;
  $("#title").textContent = session.role === "admin" ? "🛠️ Admin Panel" : "🍽️ Member Panel";
  $("#who").textContent = session.name;
  showPage(getPages()[0].id);
}

$("#logoutButton").onclick = function () {
  session = null;
  saveSession();
  showLoginPage();
};
 
loadData();
loadSession();
if (session) startApp();
else showLoginPage();
