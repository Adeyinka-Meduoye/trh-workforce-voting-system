const organisations = [
  {
    name: "Sanctuary Organisation",
    description: "Vote for your most outstanding team member",
    url: "https://script.google.com/macros/s/AKfycbzE_NrElBUlUl2qdW56dTNeJm0sAL2Q-zcoEPt1xtQ3r8_yYQq4HmgXIsDWIZcnWKRbMA/exec",
    bgImage: "images/sanctuary.jpg"
  },
  {
    name: "Media Organisation",
    description: "Vote for your Media Team Member of the Month",
    url: "https://script.google.com/macros/s/AKfycbwqxnig04WdOvw1jZqUO571-ApEnt2mtVj523RER7YDhfiAb50hq2lYamM6XuCqcKKI/exec",
    bgImage: "images/media.jpg"
  },
  {
    name: "Music Organisation",
    description: "Vote for your Music Team Member of the Month",
    url: "https://script.google.com/macros/s/AKfycbxFq4t2FwP_Bh00cLMqlTc2Pz6zMWr4UudPqkpH_4bS5VuNsIOA0BMFoxaYpxMFZNgazQ/exec",
    bgImage: "images/music.jpg"
  },
  {
    name: "Ushering Department",
    description: "Vote for this month’s outstanding usher",
    url: "https://script.google.com/macros/s/AKfycbwwj1HwKagaVQIV3nsbx6ncJtLdh2zgrmKNaRF2unsANX_5fjuk-77Lv6tPp5ohSW9NLQ/exec",
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
    url: "https://script.google.com/macros/s/AKfycbyNmnobVyZbux4mLTJUbgJ4XzsAahanFyDb-RPymXTEU8g3EczBSq4LbYDPfOyH_2ihRA/exec",
    bgImage: "images/hospitality.jpg"
  },
  {
    name: "Traffic, Security & Surveillance Organisation",
    description: "Vote for this month’s outstanding member",
    url: "https://script.google.com/macros/s/AKfycbzE3dboy9JZ6PHjItOOIpCgy2qH7i8X783jwwRJMO1v7J_u6cLNUVOeGMnAL31O2DRmsQ/exec",
    bgImage: "images/traffic.jpg"
  },
  {
    name: "Drama Organisation",
    description: "Vote for this month’s outstanding drama team member",
    url: "https://script.google.com/macros/s/AKfycbzNsClmTX0_E_a26ylfM7ZwEYQBubNEyvpZ16p_s0kqqSj1ApJLeQ8enEaR_DdgDWgn/exec",
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