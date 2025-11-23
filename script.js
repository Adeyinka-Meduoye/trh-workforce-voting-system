const organisations = [
  {
    name: "Sanctuary Organisation",
    description: "Vote for your most outstanding team member",
    url: "https://script.google.com/macros/s/AKfycbxTsUk1ptJG7XCIrihOjbas2uBR-nqk00OZ9EDEg9eIFwx1l2Ri9HXS4djBV1tR5TZ8vA/exec",
    bgImage: "images/sanctuary.jpg"
  },
  {
    name: "Media Organisation",
    description: "Vote for your Media Team Member of the Month",
    url: "https://script.google.com/macros/s/AKfycbxWlk-asYbPUYKbij1zX0JegA-i16oUAgZDKhp-VKRnHcUlNlPsewnVWqBed-c8lVAd/exec",
    bgImage: "images/media.jpg"
  },
  {
    name: "Music Organisation",
    description: "Vote for your Music Team Member of the Month",
    url: "https://script.google.com/macros/s/AKfycbwOQDlgDvkXiVbVL545m-ypZcByc9p8qhCEQGCIodi9eTncNzSGqDe_gDXCpCRNdZ0FyA/exec",
    bgImage: "images/music.jpg"
  },
  {
    name: "Ushering Department",
    description: "Vote for this month’s outstanding usher",
    url: "https://script.google.com/macros/s/AKfycbwYZ6_E86sxeBbhsTyXUwtbdHx4Zyt_UV2xJDNbeDYVC6WbXYuguLSg11lLpqt_QIFt4w/exec",
    bgImage: "images/ushering.jpg"
  },
  {
    name: "Meet & Greet Department",
    description: "Vote for your Meet & Greet standout member",
    url: "https://script.google.com/macros/s/AKfycbxdIglNR_kd3iHPiFXXExxTyjJmedmbWjO2p9AAPxDkQwxMeqPbIdR0JgAyrAKcPgLY9w/exec",
    bgImage: "images/meetngreet.jpg"
  },
  {
    name: "Hospitality Organisation",
    description: "Vote for this month’s outstanding hospitality team member",
    url: "https://script.google.com/macros/s/AKfycbzW6-vawBW-8Li5Yd1pzOHMMBeYoDqnNM1JamBN5PxGd9u1IsCH7MMfV4HGk91jlZakXg/exec",
    bgImage: "images/hospitality.jpg"
  },
  {
    name: "Traffic, Security & Surveillance Organisation",
    description: "Vote for this month’s outstanding member",
    url: "https://script.google.com/macros/s/AKfycbw7NlfwYx7vtpDPXRd2M0amM2qR8l7D9CI64Qkg5IUTVsA5qyuEk7ha9t-ahSO8IfXzVg/exec",
    bgImage: "images/traffic.jpg"
  },
  {
    name: "Drama Organisation",
    description: "Vote for this month’s outstanding drama team member",
    url: "https://script.google.com/macros/s/AKfycbxCOBYrBb2qS5TQRnvC2gLIkArHMq3cDaumVSOjR0MsvUIYd3WwIrS3hfUFx6frearb/exec",
    bgImage: "images/drama.jpg"
  }
];

const container = document.getElementById("orgContainer");
const notification = document.getElementById("notification");

// Build organisation cards
if (container) { // Only run on index.html
  organisations.forEach(org => {
    const card = document.createElement("div");
    card.className = "card fade-in";

    card.style.backgroundImage = `url('${org.bgImage}')`;

    card.innerHTML = `
      <div class="overlay"></div>
      <h3>${org.name}</h3>
      <p>${org.description}</p>
    `;

    card.addEventListener("click", () => {
      showNotification("Redirecting to organisation voting page...");
      setTimeout(() => {
        window.location.href = org.url;
      }, 1200);
    });

    container.appendChild(card);
  });
}

// Dark mode toggle logic (persistent across pages)
const darkSwitch = document.getElementById("darkModeSwitch");

// Apply saved theme on page load
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
  if (darkSwitch) darkSwitch.checked = true;
}

// Listen to toggle
if (darkSwitch) {
  darkSwitch.addEventListener("change", () => {
    if (darkSwitch.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "enabled");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "disabled");
    }
  });
}

// Notification function
function showNotification(message) {
  if (!notification) return;
  notification.textContent = message;
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 1500);
}

// Smooth scroll for down arrow
const scrollArrow = document.getElementById("scrollArrow");
if (scrollArrow) {
  scrollArrow.addEventListener("click", () => {
    const gridSection = document.getElementById("orgContainer");
    gridSection.scrollIntoView({ behavior: "smooth" });
  });
}

// Display the current year in the UI
document.addEventListener("DOMContentLoaded", function () {
  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
