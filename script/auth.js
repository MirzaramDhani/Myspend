const supa = window.supabaseClient;

const bcrypt = window.dcodeIO.bcrypt;
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  let { data, error } = await supa
    .from("users")
    .select("id, username, password")
    .eq("username", username)
    .single();

  if (error || !data) {
    document.getElementById("error").innerText = "Username tidak ditemukan!";
    return;
  }

  const valid = bcrypt.compareSync(password, data.password); // cek hash
  if (!valid) {
    document.getElementById("error").innerText = "Password salah!";
    return;
  }

  // Simpan session
  localStorage.setItem("user_id", data.id);
  localStorage.setItem("username", data.username);
  localStorage.setItem("login_time", Date.now());

  window.location.href = "main.html";
}


// Fungsi logout
function logout() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  localStorage.removeItem("login_time");
  window.location.href = "index.html"; // halaman login
}

// Fungsi cek session (panggil di main.html)
function checkSession() {
  const loginTime = localStorage.getItem("login_time");
  const oneHour = 60 * 60 * 1000; // 1 jam dalam ms

  if (!loginTime) {
    // tidak ada data login
    logout();
    return;
  }

  const now = Date.now();
  if (now - loginTime > oneHour) {
    alert("Sesi login sudah habis. Silakan login kembali.");
    logout();
  }
}

