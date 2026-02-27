const btn = document.getElementById("dropdownBtn");
const menu = document.getElementById("dropdownMenu");
// Get the parent container so we can rotate the arrow
const container = btn.parentElement;

btn.addEventListener("click", function(e) {
  e.stopPropagation(); // Prevents the window click listener from firing
  menu.classList.toggle("show");
  
  // This is the missing line that triggers the CSS rotation
  container.classList.toggle("active");
});

// Close when clicking outside
window.addEventListener("click", function(e) {
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove("show");
    // Reset the arrow position when closing
    container.classList.remove("active");
  }
});

// Add this to your existing SChoose.js
const closeBtn = document.getElementById("closeBtn");

closeBtn.addEventListener("click", () => {
    // Redirects to the main landing page
    window.location.href = "/";
});