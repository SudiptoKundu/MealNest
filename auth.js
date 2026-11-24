
 
let loginRole = "user";     
let isRegistering = false;    
 
function showLoginPage() {
  $("#shell").hidden = true;
  $("#login").hidden = false;
 
  const isAdmin = loginRole === "admin";
  const registering = !isAdmin && isRegistering;
  const pressEnter = `onkeydown="if (event.key === 'Enter') handleLogin()"`;
 
  const nameField = registering
    ? `<div class="row"><input id="loginName" placeholder="Full name" style="width:100%"></div>`
    : "";
 
  let hint;
  if (isAdmin) {
    hint = `<p class="muted">Demo admin: admin / admin123</p>`;
  } else {
    hint = `<p class="muted">
              ${registering ? "Already have an account?" : "No account?"}
              <a href="#" onclick="chooseLoginMode(${!registering}); return false">${registering ? "Login" : "Register"}</a><br>
              Demo user: user@demo.com / user123
            </p>`;
  }
 
  $("#login").innerHTML = `
    <div class="card">
      <h2>🍽️ Meal Management</h2>
      <div class="tabs">
        <button class="${isAdmin ? "" : "active"}" onclick="chooseLoginRole('user')">User Login</button>
        <button class="${isAdmin ? "active" : ""}" onclick="chooseLoginRole('admin')">Admin Login</button>
      </div>
      ${nameField}
      <div class="row">
        <input id="loginEmail" autocapitalize="off" autocomplete="off" style="width:100%" ${pressEnter}
               placeholder="${isAdmin ? "Admin username" : "Email"}">
      </div>
      <div class="row">
        <input id="loginPassword" type="password" autocomplete="off" style="width:100%" ${pressEnter}
               placeholder="Password">
      </div>
      <button class="primary" style="width:100%" onclick="handleLogin()">${registering ? "Create account" : "Login"}</button>
      ${hint}
    </div>`;
}
 
function chooseLoginRole(role) {
  loginRole = role;
  isRegistering = false;
  showLoginPage();
}
 
function chooseLoginMode(registering) {
  isRegistering = registering;
  showLoginPage();
}
 
function handleLogin() {
  const email = readInput("loginEmail").trim();
  const password = readInput("loginPassword").trim();
 
  if (loginRole === "admin") loginAsAdmin(email, password);
  else if (isRegistering) registerUser(email, password);
  else loginAsUser(email, password);
}
 
function loginAsAdmin(username, password) {
  if (username.toLowerCase() === ADMIN_LOGIN.username && password === ADMIN_LOGIN.password) {
    session = { role: "admin", name: "Admin" };
    saveSession();
    startApp();
  } else {
    showMessage("Wrong admin username or password");
  }
}
 
function loginAsUser(email, password) {
  const user = db.users.find(function (u) {
    return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
  });
  if (!user) return showMessage("Wrong email or password");
  if (user.blocked) return showMessage("This account is blocked by admin");
 
  session = { role: "user", userId: user.id, name: user.name };
  saveSession();
  startApp();
}
 
function registerUser(email, password) {
  const name = readInput("loginName").trim();
  if (!name || !email || password.length < 4) return showMessage("Fill all fields (password min 4 characters)");
 
  const emailTaken = db.users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
  if (emailTaken) return showMessage("Email already registered");
 
  const user = { id: newId(), name: name, email: email, password: password, blocked: false };
  db.users.push(user);
  saveData();
 
  session = { role: "user", userId: user.id, name: user.name };
  saveSession();
  startApp();
}
 
