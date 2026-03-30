function transitionToPage(url) {
  const container = document.querySelector('.main-container');
  if (container) {
      container.classList.add('page-fade-out');
  }
  
  setTimeout(() => {
      window.location.href = url;
  }, 400); 
}

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
e.preventDefault();

const text = target.textContent.toLowerCase();

if (text.includes("new student")) {
  transitionToPage("/html/NewSForm.html");
} else if (text.includes("new employee")) {
  transitionToPage("/html/NewEForm.html");
} else if (text.includes("student")) {
  transitionToPage("/html/StudentForm.html");
} else if (text.includes("employee")) {
  transitionToPage("/html/EmployeeForm.html");
// NEW LOGIC ADDED BELOW
} else if (text.includes("visitor")) {
  transitionToPage("/html/VisitorForm.html");
}
});

const closeBtn = document.getElementById("closeBtn");

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
      transitionToPage("/");
  });
}