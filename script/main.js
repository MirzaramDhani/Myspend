document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (!username) {
    // belum login → lempar balik ke login page
    window.location.href = "index.html";
  }
});
