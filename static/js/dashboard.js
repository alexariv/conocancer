// ============================
// 📥 FETCH USER DATA (no user ID param)
// ============================
async function fetchUserData() {
  const statsRes = await fetch(`/api/user_stats`);
  if (!statsRes.ok) throw new Error("Failed to load user stats");
  const stats = await statsRes.json();

  return {
    name: document.body.dataset.username,
    joinDate: "Apr 2025",
    photo: "default-user-icon.png",
    stats: {
      completed:  stats.completed,
      watched:    stats.watched,
      inProgress: stats.inProgress,
      quizzes:    stats.quizzes
    },
    courses: [
      { id: "introduction", percent: 0 },
      { id: "diagnosis", percent: 0 },
      { id: "treatment", percent: 0 },
      { id: "survivor", percent: 0 }
    ],
    upcoming: []
  };
};

// ============================
// 🌎 TEXT TRANSLATIONS
// ============================
const translations = {
  en: {
    welcome: "Hello",
    memberSince: "Member since",
    categories: "Categories",
    upcoming: "Upcoming Videos & Quizzes",
    statistics: "Statistics",
    viewAll: "View All",
    noUpcoming: "No upcoming content yet. Start a course to get recommendations!",
    categoriesList: {
      overview: "Introduction",
      diagnosis: "Screening & Detection",
      treatment: "Diagnosis",
      survivor: "Treatment"
    },
    categoriesSub: {
      overview: "3 Videos available",
      diagnosis: "4 Videos available",
      treatment: "3 Videos available",
      survivor: "3 Videos available"
    },
    navbar: {
      overview: "Dashboard",
      videos: "Videos & Articles",
      resources: "Resources",
      progress: "Progress",
      settings: "Setting"
    },
    stats: {
      completed: "Courses Completed",
      watched: "Videos Watched",
      inProgress: "Courses In Progress",
      quizzes: "Quizzes Completed"
    }
  },
  es: {
    welcome: "¡Hola",
    memberSince: "Miembro desde",
    categories: "Categorías",
    upcoming: "Próximos Videos y Cuestionarios",
    statistics: "Estadísticas",
    viewAll: "Ver Todo",
    noUpcoming: "No hay contenido próximo. ¡Comienza un curso para recibir recomendaciones!",
    categoriesList: {
      overview: "Introducción",
      diagnosis: "Detección y Evaluación",
      treatment: "Diagnóstico",
      survivor: "Tratamiento"
    },
    categoriesSub: {
      overview: "3 Videos disponibles",
      diagnosis: "4 Videos disponibles",
      treatment: "3 Videos disponibles",
      survivor: "3 Videos disponibles"
    },
    navbar: {
      overview: "Tablero",
      videos: "Videos y Artículos",
      resources: "Recursos",
      progress: "Progreso",
      settings: "Configuración"
    },
    stats: {
      completed: "Cursos Completados",
      watched: "Videos Vistos",
      inProgress: "Cursos en Progreso",
      quizzes: "Cuestionarios Completados"
    }
  }
};
// ============================
// UI UPDATE FUNCTIONS
// ============================
function updateUserProfile(user, lang = "en") {
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("join-date").textContent = `${translations[lang].memberSince} ${user.joinDate}`;
  document.getElementById("user-photo").src = user.photo;
}

function updateUserStats(user, lang = "en") {
  document.querySelector('[data-stat="completed"] .stat-label').textContent = translations[lang].stats.completed;
  document.querySelector('[data-stat="watched"] .stat-label').textContent = translations[lang].stats.watched;
  document.querySelector('[data-stat="inProgress"] .stat-label').textContent = translations[lang].stats.inProgress;
  document.querySelector('[data-stat="quizzes"] .stat-label').textContent = translations[lang].stats.quizzes;

  document.getElementById("stat-completed").textContent = user.stats.completed;
  document.getElementById("stat-watched").textContent = user.stats.watched;
  document.getElementById("stat-in-progress").textContent = user.stats.inProgress;
  document.getElementById("stat-quizzes").textContent = user.stats.quizzes;
}

function updateCourseProgress(user) {
  user.courses.forEach(course => {
    const card = document.querySelector(`.card[data-course="${course.id}"]`);
    if (card) {
      const ring = card.querySelector(".progress-ring");
      const text = ring.querySelector(".progress-text");

      ring.style.background = course.percent === 0
        ? "rgba(255,255,255,0.2)"
        : `conic-gradient(white ${course.percent}%, rgba(255,255,255,0.2) 0)`;

      text.textContent = `${course.percent}%`;
    }
  });
}

function updateUpcomingVideos(user, lang = "en") {
  const list = document.getElementById("video-list");
  list.innerHTML = "";

  if (!user.upcoming.length) {
    list.innerHTML = `<p>${translations[lang].noUpcoming}</p>`;
    return;
  }

  user.upcoming.forEach(item => {
    const div = document.createElement("div");
    div.className = "video-card";
    div.innerHTML = `
      <div class="icon-box">
        <img src="${item.icon}" alt="Video Icon" />
      </div>
      <div class="video-details">
        <div class="video-title">${item.title}</div>
        <div class="video-time">${item.duration}</div>
      </div>
      <div class="menu-icon">⋮</div>
    `;
    list.appendChild(div);
  });

  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric"
  });
  document.getElementById("video-date").textContent = today;
}

function applyLanguage(user, lang) {
  document.querySelector(".welcome").innerHTML = `${translations[lang].welcome} <span id="user-name">${user.name}</span>!`;

  document.querySelectorAll(".section-header")[0].querySelector("h2").textContent = translations[lang].categories;
  document.querySelectorAll(".section-header")[1].querySelector("h2").textContent = translations[lang].upcoming;
  document.querySelector(".stats h3").textContent = translations[lang].statistics;

  document.querySelectorAll(".section-header a").forEach(link => {
    link.textContent = translations[lang].viewAll;
  });

  const sidebarItems = document.querySelectorAll(".sidebar-nav li span");
  if (sidebarItems.length >= 5) {
    sidebarItems[0].textContent = translations[lang].navbar.overview;
    sidebarItems[1].textContent = translations[lang].navbar.videos;
    sidebarItems[2].textContent = translations[lang].navbar.resources;
    sidebarItems[3].textContent = translations[lang].navbar.progress;
    sidebarItems[4].textContent = translations[lang].navbar.settings;
  }

  document.getElementById("cat-overview-title").textContent = translations[lang].categoriesList.overview;
  document.getElementById("cat-diagnosis-title").textContent = translations[lang].categoriesList.diagnosis;
  document.getElementById("cat-treatment-title").textContent = translations[lang].categoriesList.treatment;
  document.getElementById("cat-survivor-title").textContent = translations[lang].categoriesList.survivor;

  document.getElementById("cat-overview-small").textContent = translations[lang].categoriesSub.overview;
  document.getElementById("cat-diagnosis-small").textContent = translations[lang].categoriesSub.diagnosis;
  document.getElementById("cat-treatment-small").textContent = translations[lang].categoriesSub.treatment;
  document.getElementById("cat-survivor-small").textContent = translations[lang].categoriesSub.survivor;

  updateUserStats(user, lang);
  updateUpcomingVideos(user, lang);

  const langButton = document.querySelector(".language");
  langButton.textContent = lang === "en" ? "Español" : "English";
}

// ============================
// 🚀 INIT
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userData = await fetchUserData();
    const storedLanguage = localStorage.getItem("preferredLanguage") || "en";

    updateUserProfile(userData, storedLanguage);
    updateUserStats(userData, storedLanguage);
    updateCourseProgress(userData);
    applyLanguage(userData, storedLanguage);

    const langButton = document.querySelector(".language");
    if (langButton) {
      langButton.addEventListener("click", () => {
        const currentLang = localStorage.getItem("preferredLanguage") || "en";
        const newLang = currentLang === "en" ? "es" : "en";
        localStorage.setItem("preferredLanguage", newLang);

        document.body.classList.add('fade-transition');
        setTimeout(() => {
          applyLanguage(userData, newLang);
          updateUserProfile(userData, newLang);
          document.body.classList.remove('fade-transition');
        }, 200);
      });
    }

  } catch (err) {
    console.error("Dashboard init error:", err);
  }
});