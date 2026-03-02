const btn = document.getElementById("dropdownBtn");
const menu = document.getElementById("dropdownMenu");
const container = btn.parentElement;

// Toggle Dropdown Visibility
btn.addEventListener("click", function(e) {
  e.stopPropagation(); 
  menu.classList.toggle("show");
  container.classList.toggle("active");
});

// Close Dropdown when clicking outside
window.addEventListener("click", function(e) {
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove("show");
    container.classList.remove("active");
  }
});

// Navigation Logic
menu.addEventListener("click", function(e) {
  const target = e.target;
  
  // Prevent the default '#' link behavior
  e.preventDefault();

  // Convert text to lowercase and check against lowercase strings
  const text = target.textContent.toLowerCase();
  
  if (text.includes("student")) {
    window.location.href = "/html/StudentForm.html";
  } else if (text.includes("employee")) {
    window.location.href = "/html/EmployeeForm.html";
  }
});

const closeBtn = document.getElementById("closeBtn");

if (closeBtn) {
    closeBtn.addEventListener("click", () => {
        window.location.href = "/";
    });
}