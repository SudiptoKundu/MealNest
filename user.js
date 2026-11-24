// ===================================================================
//  user.js  -  every page a USER can see, plus the user buttons
//  (a user only ever sees their own data)
// ===================================================================
 
// ---------- Overview: the most important numbers ----------
function userOverviewPage() {
  const result = calculateMonth();
  const me = result.people[session.userId];
  if (!me) return "";
  const eggPrice = db.eggPrice[month] || 0;
 
  return `
    <h2>Overview</h2>
    ${monthPicker()}
    <div class="grid">
      ${statCard(me.lunches + me.dinners, "Meals added")}
      ${statCard(me.guests, "Guest meals")}
      ${statCard(me.meals, "Total meals")}
      ${statCard(money2(result.rate), "Per meal rate")}
      ${statCard(me.eggs, "Eggs taken")}
      ${statCard(money2(eggPrice), "Cost per egg")}
      ${statCard(money(me.cost), "Total cost")}
      ${statCard(money(me.paid), "Paid")}
      ${statCard(balanceText(me.balance), "Back / balance")}
    </div>`;
}
 
// ---------- My Meals: tick lunch and dinner ----------
function userMealsPage() {
  let rows = "";
 
  getDaysOfMonth().forEach(function (date) {
    const menu = db.menu[date] || {};
    const entry = getMealEntry(date, session.userId);
 
    // a ticked box is locked (disabled): only the admin can remove it
    rows += `<tr>
      <td>${formatDate(date)}</td>
      <td><label>
        <input type="checkbox" ${entry.lunch ? "checked disabled" : ""} onchange="tickMeal(this, '${date}', 'lunch')">
        ${escapeHtml(menu.lunch || "-")}
      </label></td>
      <td><label>
        <input type="checkbox" ${entry.dinner ? "checked disabled" : ""} onchange="tickMeal(this, '${date}', 'dinner')">
        ${escapeHtml(menu.dinner || "-")}
      </label></td>
      <td><input type="number" min="${entry.guests}" value="${entry.guests}" style="width:70px"
                 onchange="changeGuests(this, '${date}')"></td>
    </tr>`;
  });
 
  return `
    <h2>My Meals</h2>
    ${monthPicker()}
    <p class="muted">Once a meal is ticked, only the admin can remove it.</p>
    <div class="card" id="mealSummary">${mealSummaryHtml()}</div>
    <div class="card table-wrap">
      <table>
        <tr><th>Date</th><th>Lunch (Day)</th><th>Dinner (Night)</th><th>Guest meals</th></tr>
        ${rows}
      </table>
    </div>`;
}
 
function mealSummaryHtml() {
  const result = calculateMonth();
  const me = result.people[session.userId];
  return `Meals: <b>${me.lunches + me.dinners}</b> &middot;
          Guest: <b>${me.guests}</b> &middot;
          Rate: <b>${money2(result.rate)}</b> &middot;
          Meal cost: <b>${money(me.mealCost)}</b>`;
}
 
function tickMeal(checkbox, date, field) {       // field: "lunch" or "dinner"
  if (!checkbox.checked) return;                 // users cannot untick
  setMeal(date, session.userId, field, 1);
  checkbox.disabled = true;                      // lock it
  $("#mealSummary").innerHTML = mealSummaryHtml();
}
 
function changeGuests(input, date) {
  const oldValue = getMealEntry(date, session.userId).guests;
  const newValue = Math.max(0, Number(input.value) || 0);
 
  if (newValue < oldValue) {                     // users cannot lower it
    input.value = oldValue;
    return showMessage("Only the admin can remove a selected meal");
  }
  setMeal(date, session.userId, "guests", newValue);
  input.min = newValue;
  $("#mealSummary").innerHTML = mealSummaryHtml();
}
 
// ---------- Menu: what the admin set ----------
function userMenuPage() {
  let rows = "";
 
  getDaysOfMonth().forEach(function (date) {
    const menu = db.menu[date] || {};
    const style = date === TODAY ? "font-weight:700; background:var(--bg);" : "";
    rows += `<tr style="${style}">
      <td>${formatDate(date)}${date === TODAY ? " (today)" : ""}</td>
      <td>${escapeHtml(menu.lunch || "Not set yet")}</td>
      <td>${escapeHtml(menu.dinner || "Not set yet")}</td>
    </tr>`;
  });
 
  return `
    <h2>Menu</h2>
    ${monthPicker()}
    <p class="muted">Lunch and dinner set by the admin.</p>
    <div class="card table-wrap">
      <table><tr><th>Date</th><th>Lunch</th><th>Dinner</th></tr>${rows}</table>
    </div>`;
}
 
// ---------- Payment: send money for the admin to approve ----------
function userPaymentPage() {
  const result = calculateMonth();
  const me = result.people[session.userId];
  if (!me) return "";
 
  const pendingNote = me.pending > 0
    ? `<p class="muted">Waiting for admin approval: <b>${money(me.pending)}</b></p>`
    : "";
  const fillButton = me.balance < 0
    ? `<button onclick="document.getElementById('payAmount').value = ${Math.ceil(-me.balance)}">Fill full due</button>`
    : "";
 
  return `
    <h2>Payment</h2>
    ${monthPicker()}
    <div class="grid">
      ${statCard(money(me.paid), "Payment (approved)")}
      ${statCard(money(me.cost), `Cost (${me.meals} meals x ${money2(result.rate)} + eggs ${money(me.eggCost)})`)}
      ${statCard(balanceText(me.balance), "Back (remaining balance)")}
    </div>
    <div class="card">
      <h3 style="margin-top:0">Make a payment</h3>
      ${pendingNote}
      <p class="muted">Pay any amount you like. It is sent to the admin and counts after approval.</p>
      <div class="row">
        <select id="payMethod"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Card</option></select>
        <input id="payAmount" type="number" min="1" placeholder="Amount" style="width:130px">
        ${fillButton}
        <button class="primary" onclick="sendPayment()">💳 Send payment for approval</button>
      </div>
    </div>`;
}
 
function sendPayment() {
  const amount = Number(readInput("payAmount"));
  if (!(amount > 0)) return showMessage("Enter an amount");
 
  db.payments.push({
    id: newId(), userId: session.userId, month: month, date: TODAY,
    amount: amount, method: readInput("payMethod"), status: "pending"
  });
  saveData();
  showMessage("Sent to admin for approval");
  showPage(currentPage);
}
 
// ---------- My Bill ----------
function userBillPage() {
  const result = calculateMonth();
  const me = result.people[session.userId];
  if (!me) return "";
 
  const line = function (label, value) {
    return `<tr><td>${label}</td><td style="text-align:right">${value}</td></tr>`;
  };
 
  return `
    <h2>My Bill</h2>
    ${monthPicker()}
    <div class="card">
      <table>
        ${line("Meals taken", me.lunches + me.dinners)}
        ${line("Guest meals", me.guests)}
        ${line("Total meals", me.meals)}
        ${line("Meal rate (same for everyone)", money2(result.rate))}
        ${line("Meal cost", money(me.mealCost))}
        ${line("Eggs (" + me.eggs + ")", money(me.eggCost))}
        <tr><th>Total cost</th><th style="text-align:right">${money(me.cost)}</th></tr>
        ${line("Paid", `<span class="good">${money(me.paid)}</span>`)}
        <tr><th>Balance</th><th style="text-align:right">${balanceText(me.balance)}</th></tr>
      </table>
      ${me.balance < 0 ? `<p><button class="primary" onclick="showPage('payment')">Go to Payment</button></p>` : ""}
    </div>
    <p class="muted">The rate can change until the month ends, because it depends on total bazar cost and total meals.</p>`;
}
 
// ---------- History: all my payments ----------
function userHistoryPage() {
  const mine = db.payments
    .filter(function (x) { return x.userId === session.userId; })
    .reverse();
 
  let rows = "";
  mine.forEach(function (x) {
    rows += `<tr>
      <td>${x.month}</td><td>${formatDate(x.date)}</td><td>${x.method}</td>
      <td>${money(x.amount)}</td><td>${statusBadge(x)}</td>
    </tr>`;
  });
 
  return `
    <h2>Payment History</h2>
    <div class="card table-wrap">
      <table>
        <tr><th>Month</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr>
        ${rows || "<tr><td>No payments yet</td></tr>"}
      </table>
    </div>`;
}
