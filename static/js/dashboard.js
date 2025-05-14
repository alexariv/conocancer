// ============================
// 📥 FETCH USER DATA FROM DATABASE
// ============================
async function fetchUserData() {
  const user_id = document.body.dataset.userId;

  const res = await fetch(`/api/introduction_progress?user_id=${user_id}`);
  const data = await res.json();

  // Check data structure clearly
  console.log("Fetched API Data:", data);

  const stats = {
    completed: Object.values(data).reduce((sum, c) => sum + c.completed, 0),
    watched: Object.values(data).reduce((sum, c) => sum + c.completed, 0),
    inProgress: Object.values(data).reduce((sum, c) => sum + (c.total - c.completed), 0),
    quizzes: 0
  };

  const courses = Object.keys(data).map(category => ({
    id: category,
    percent: data[category].percent
  }));

  return {
    name: userName,
    stats,
    courses,
    upcoming: []
  };
}


// ============================
// 🌎 TEXT TRANSLATIONS
// ============================
const translations = {
  en: {
    welcome: "Hello",
    memberSince: "Member since",
    categories: "Categories",
    upcoming: "Upcoming Videos",
    statistics: "Statistics",
    viewAll: "View All",
    noUpcoming: "Check the progress page for video recommendations!",
    categoriesList: {
      introduction: "Introduction",
      diagnosis: "Screening & Detection",
      treatment: "Diagnosis",
      survivor: "Treatment"
    },
    categoriesSub: {
      introduction: "3 Videos available",
      diagnosis: "4 Videos available",
      treatment: "3 Videos available",
      survivor: "3 Videos available"
    },
    navbar: {
      introduction: "Dashboard",
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
    upcoming: "Próximos Videos",
    statistics: "Estadísticas",
    viewAll: "Ver Todo",
    noUpcoming: "No hay contenido próximo. ¡Comienza un curso para recibir recomendaciones!",
    categoriesList: {
      introduction: "Introducción",
      diagnosis: "Detección y Evaluación",
      treatment: "Diagnóstico",
      survivor: "Tratamiento"
    },
    categoriesSub: {
      introduction: "3 Videos disponibles",
      diagnosis: "4 Videos disponibles",
      treatment: "3 Videos disponibles",
      survivor: "3 Videos disponibles"
    },
    navbar: {
      introduction: "Tablero",
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
// 📊 UPDATE UI FUNCTIONS
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

      if (course.percent === 0) {
        ring.style.background = "rgba(255,255,255,0.2)";
      } else {
        ring.style.background = `conic-gradient(white ${course.percent}%, rgba(255,255,255,0.2) 0)`;
      }

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

  // Section Titles
  document.querySelectorAll(".section-header")[0].querySelector("h2").textContent = translations[lang].categories;
  document.querySelectorAll(".section-header")[1].querySelector("h2").textContent = translations[lang].upcoming;

  // View All Links
  document.querySelectorAll(".section-header a").forEach(link => {
    link.textContent = translations[lang].viewAll;
  });

  // Navbar Texts
  const sidebarItems = document.querySelectorAll(".sidebar-nav li span");
  if (sidebarItems.length >= 5) {
    sidebarItems[0].textContent = translations[lang].navbar.introduction;
    sidebarItems[1].textContent = translations[lang].navbar.videos;
    sidebarItems[2].textContent = translations[lang].navbar.resources;
    sidebarItems[3].textContent = translations[lang].navbar.progress;
    sidebarItems[4].textContent = translations[lang].navbar.settings;
  }

  // Category Cards
  document.getElementById("cat-introduction-title").textContent = translations[lang].categoriesList.introduction;
  document.getElementById("cat-diagnosis-title").textContent = translations[lang].categoriesList.diagnosis;
  document.getElementById("cat-treatment-title").textContent = translations[lang].categoriesList.treatment;
  document.getElementById("cat-survivor-title").textContent = translations[lang].categoriesList.survivor;

  document.getElementById("cat-introduction-small").textContent = translations[lang].categoriesSub.introduction;
  document.getElementById("cat-diagnosis-small").textContent = translations[lang].categoriesSub.diagnosis;
  document.getElementById("cat-treatment-small").textContent = translations[lang].categoriesSub.treatment;
  document.getElementById("cat-survivor-small").textContent = translations[lang].categoriesSub.survivor;

  updateUpcomingVideos(user, lang);

  // Language Button
  const langButton = document.querySelector(".language");
  langButton.textContent = lang === "en" ? "Español" : "English";
}

// ============================
// 🚀 MAIN INIT FUNCTION
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const storedLanguage = localStorage.getItem("preferredLanguage") || "en";
    const userData = await fetchUserData();

    updateUserProfile(userData, storedLanguage);
    updateCourseProgress(userData);
    applyLanguage(userData, storedLanguage);

    await fetchAllCategoryProgress();
    await fetchAndRenderUpcoming();
    await fetchAndRenderQuizStats();
    await fetchRecentPerformance();

    document.querySelector(".language").addEventListener("click", () => {
      const currentLang = localStorage.getItem("preferredLanguage") || "en";
      const newLang = currentLang === "en" ? "es" : "en";
      localStorage.setItem("preferredLanguage", newLang);

      document.body.classList.add("fade-transition");
      setTimeout(() => {
        applyLanguage(userData, newLang);
        updateUserProfile(userData, newLang);
        document.body.classList.remove("fade-transition");
      }, 200);
    });

  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
});

function updateUserProfile(user, lang = "en") {
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("join-date").textContent = `${translations[lang].memberSince} ${user.joinDate}`;
  document.getElementById("user-photo").src = user.photo;
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
    div.style.cursor = "pointer";
    div.innerHTML = `
      <div class="icon-box ${item.colorClass}">
        <img src="${item.icon}" alt="icon" width="20" height="20" />
      </div>
      <div class="video-details">
        <div class="video-title">${item.title}</div>
        <div class="video-time">${item.duration}</div>
      </div>
      <div class="menu-icon">⋮</div>
    `;
    div.addEventListener("click", () => {
      const routeMap = {
        introduction: "/introduction",
        diagnosis: "/diagnosis",
        treatment: "/treatment",
        survivor: "/survivorship"
      };
      window.location.href = routeMap[item.category] || "/videos-and-articles";
    });
    list.appendChild(div);
  });

  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric"
  });
  document.getElementById("video-date").textContent = today;
}

function applyLanguage(user, lang) {
  document.querySelector(".welcome").innerHTML = `${translations[lang].welcome} <span id="user-name">${user.name}</span>!`;

  // Section headers
  document.querySelectorAll(".section-header")[0].querySelector("h2").textContent = translations[lang].categories;
  document.querySelectorAll(".section-header")[1].querySelector("h2").textContent = translations[lang].upcoming;
  document.querySelector(".recent-performance h3").textContent = translations[lang].heading.recent;

  document.querySelectorAll(".section-header a").forEach(link => {
    link.textContent = translations[lang].viewAll;
  });

  // Sidebar
  const sidebarItems = document.querySelectorAll(".sidebar-nav li span");
  if (sidebarItems.length >= 5) {
    sidebarItems[0].textContent = translations[lang].navbar.introduction;
    sidebarItems[1].textContent = translations[lang].navbar.videos;
    sidebarItems[2].textContent = translations[lang].navbar.resources;
    sidebarItems[3].textContent = translations[lang].navbar.progress;
    sidebarItems[4].textContent = translations[lang].navbar.settings;
  }

  // Categories
  document.getElementById("cat-introduction-title").textContent = translations[lang].categoriesList.introduction;
  document.getElementById("cat-diagnosis-title").textContent = translations[lang].categoriesList.diagnosis;
  document.getElementById("cat-treatment-title").textContent = translations[lang].categoriesList.treatment;
  document.getElementById("cat-survivor-title").textContent = translations[lang].categoriesList.survivor;

  document.getElementById("cat-introduction-small").textContent = translations[lang].categoriesSub.introduction;
  document.getElementById("cat-diagnosis-small").textContent = translations[lang].categoriesSub.diagnosis;
  document.getElementById("cat-treatment-small").textContent = translations[lang].categoriesSub.treatment;
  document.getElementById("cat-survivor-small").textContent = translations[lang].categoriesSub.survivor;

  updateUpcomingVideos(user, lang);
}

async function fetchUserData() {
  const user_id = document.body.dataset.userId;
  const res = await fetch(`/api/introduction_progress?user_id=${user_id}`);
  const data = await res.json();

  const stats = {
    completed: Object.values(data).reduce((sum, c) => sum + c.completed, 0),
    watched: Object.values(data).reduce((sum, c) => sum + c.completed, 0),
    inProgress: Object.values(data).reduce((sum, c) => sum + (c.total - c.completed), 0),
    quizzes: 0
  };

  const courses = Object.keys(data).map(category => ({
    id: category,
    percent: data[category].percent
  }));

  return {
    name: userName,
    photo: userPhoto,
    joinDate: userJoinDate,
    stats,
    courses,
    upcoming: []
  };
}

async function fetchAndRenderUpcoming() {
  const currentLang = localStorage.getItem("preferredLanguage") || "en";
  const res = await fetch("/api/next-upcoming");
  const items = await res.json();
  updateUpcomingVideos({ upcoming: items }, currentLang);
}

async function fetchAllCategoryProgress() {
  const res = await fetch("/api/progress");
  const rows = await res.json();
  
  const courses = [];
  for (let [key, idxs] of Object.entries(CATEGORY_MAP)) {
    const totalLessons = idxs.videoIds.length + idxs.quizIds.length + idxs.readingIds.length;
    const done = rows.filter(r =>
      r.status === "completed" &&
      ((r.lesson_type === "video" && idxs.videoIds.includes(r.lesson_id)) ||
      (r.lesson_type === "quiz" && idxs.quizIds.includes(r.lesson_id)) ||
      (r.lesson_type === "reading" && idxs.readingIds.includes(r.lesson_id)))
    ).length;
    const pct = totalLessons ? Math.round((done / totalLessons) * 100) : 0;
    courses.push({ id: key, percent: pct });
  }
  updateCourseProgress({ courses });
}

async function fetchAndRenderQuizStats() {
  const res = await fetch("/api/study-history");
  const history = await res.json();
  const quizzesCompleted = history.length;
  document.getElementById("stat-quizzes").textContent = quizzesCompleted;
}

async function fetchRecentPerformance() {
  try {
    const res = await fetch("/api/recent-quizzes");
    const quizzes = await res.json();
    renderRecentPerformance(quizzes);
  } catch (err) {
    console.error("❌ Failed to load recent quizzes:", err);
  }
}

function renderRecentPerformance(quizzes) {
  const container = document.getElementById("recent-performance-container");
  container.innerHTML = quizzes.map(q => {
    const scoreClass = q.score >= 90 ? "blue" : q.score >= 75 ? "green" : "pink";
    const catLabel = translations[currentLang]?.items[q.category] || q.category;
    return `
      <div class="performance-row">
        <div><strong>${q.title}</strong><br><small>${catLabel}</small></div>
        <span class="score ${scoreClass}">${q.score}%</span>
      </div>`;
  }).join("");
}