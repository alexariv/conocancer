document.addEventListener("DOMContentLoaded", () => {
  // ===== Profile Dropdown Logic =====
  const dropdownToggle = document.getElementById("dropdownToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const logoutBtn = document.getElementById("logoutBtn");
  const confirmModal = document.getElementById("confirmModal");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  dropdownToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display =
      dropdownMenu.style.display === "block" ? "none" : "block";
  });

  logoutBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = "none";
    confirmModal.style.display = "flex";
  });

  confirmYes?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  confirmNo?.addEventListener("click", () => {
    confirmModal.style.display = "none";
  });

  document.addEventListener("click", () => {
    dropdownMenu.style.display = "none";
  });

  // ===== Sidebar Toggle (if needed) =====
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  menuToggle?.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // ===== Open/Close Modals =====
  const hospitalModal = document.getElementById("hospitalModal");
  const openHospitalModalBtn = document.getElementById("openHospitalModal");
  const closeHospitalModalBtn = document.getElementById("closeModalBtn");

  openHospitalModalBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    hospitalModal.style.display = "flex";
    loadHospitalResults(); // unchanged
  });
  closeHospitalModalBtn?.addEventListener("click", () => {
    hospitalModal.style.display = "none";
  });

  const detailModal = document.getElementById("detailModal");
  const closeDetail = document.getElementById("closeDetail");
  closeDetail?.addEventListener("click", () => {
    detailModal.style.display = "none";
  });

  const detailPopup = document.getElementById("detailPopup");
  const closeDetailPopup = document.getElementById("closeDetailPopup");
  closeDetailPopup?.addEventListener("click", () => {
    detailPopup.style.display = "none";
  });

  const supportModal = document.getElementById("supportModal");
  const openSupportModal = document.getElementById("openSupportModalBtn");
  const closeSupportModal = document.getElementById("closeSupportModal");

  // Open modal
  openSupportModal?.addEventListener("click", (e) => {
    e.preventDefault();
    hospitalModal.style.display = "none";
    supportModal.style.display = "flex";
    fetchSupportGroups(); // populate content
  });

  // Close modal via X button
  closeSupportModal?.addEventListener("click", () => {
    supportModal.style.display = "none";
  });

  // Close modal if clicked outside the modal content
  window.addEventListener("click", (e) => {
    if (e.target === supportModal) {
      supportModal.style.display = "none";
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const supportModal = document.getElementById("supportModal");
    const closeSupportBtn = document.getElementById("closeSupportModal");

    if (supportModal && closeSupportBtn) {
      closeSupportBtn.addEventListener("click", () => {
        supportModal.style.display = "none";
      });
    }
  });

  const joinPopup = document.getElementById("joinGroupPopup");
  const closeJoinPopup = document.getElementById("closeJoinPopup");
  closeJoinPopup?.addEventListener("click", () => {
    joinPopup.style.display = "none";
  });

  const insuranceFilter = document.getElementById("insuranceFilter");

  insuranceFilter?.addEventListener("change", () => {
    const selectedInsurance = insuranceFilter.value;
    filterHospitalsByInsurance(selectedInsurance);
  });

  // ===== Dynamic Data Fetch =====
  fetchHospitals();
  fetchSupportGroups();

  const languageSelect = document.getElementById("languageFilter");
  const locationSelect = document.getElementById("locationFilter");

  function applySupportFilters() {
    const lang = languageSelect?.value || "all";
    const loc = locationSelect?.value || "all";

    const filtered = allSupportGroups.filter((g) => {
      const matchesLang = lang === "all" || g.language === lang;
      const matchesLoc = loc === "all" || g.location === loc;
      return matchesLang && matchesLoc;
    });

    renderSupportGroups(filtered);
  }

  languageSelect?.addEventListener("change", applySupportFilters);
  locationSelect?.addEventListener("change", applySupportFilters);

  //===== Event Delegation for dynamically‑added buttons =====
  document.getElementById("hospitalList").addEventListener("click", (e) => {
    const btn = e.target.closest(".open-hospital");
    if (!btn) return;
    e.preventDefault();
    openHospitalDetail(btn.dataset.id);
  });

  document.getElementById("supportGroupList").addEventListener("click", (e) => {
    const btn = e.target.closest(".join-group");
    if (!btn) return;
    e.preventDefault();
    window.open(
      "https://breast-cancer.adelphi.edu/services/support-groups/",
      "_blank"
    );
  });

  document.getElementById("supportGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".join-group");
    if (!btn) return;
    e.preventDefault();
    window.open(
      "https://breast-cancer.adelphi.edu/services/support-groups/",
      "_blank"
    );
  });
});

// === Hospitals Panel (Homepage) ===
function fetchHospitals() {
  fetch("/api/hospitals")
    .then((response) => response.json())
    .then((data) => {
      const hospitalList = document.getElementById("hospitalList");
      console.log("Fetched hospital data:", data);

      // Show only first 2
      const limited = data.slice(0, 2);

      hospitalList.innerHTML = limited
        .map(
          (h) => `
        <div class="center-card">
          <div>
            <strong>${h.name}</strong>
            <p>${h.address}</p>
          </div>
          <button class="open-hospital" data-id="${h.id}" type="button">Open</button>
        </div>`
        )
        .join("");
    });
}

function loadHospitalResults() {
  fetch("/api/hospitals")
    .then((response) => response.json())
    .then((data) => {
      const insuranceFilter = document.getElementById("insuranceFilter");
      const selectedInsurances = Array.from(
        insuranceFilter.selectedOptions
      ).map((option) => option.value);

      const isAllSelected =
        selectedInsurances.includes("All") || selectedInsurances.length === 0;

      // ✅ Updated logic to handle "All Insurances"
      const filteredHospitals =
        selectedInsurances.includes("all") || selectedInsurances.length === 0
          ? data
          : data.filter((hospital) =>
              hospital.insurance.some((ins) => selectedInsurances.includes(ins))
            );

      const modalList = document.getElementById("modalHospitalList");
      modalList.innerHTML = data
        .map(
          (h) => `
        <div class="result-card">
          <div>
            <strong>${h.name}</strong>
            <p>${h.address}</p>
          </div>
          <button class="open-popup" data-id="${h.id}" type="button">Open</button>
        </div>`
        )
        .join("");
      attachPopupListeners();
      initializeModalMap(filteredHospitals);
    });
}

document
  .getElementById("insuranceFilter")
  ?.addEventListener("change", async () => {
    const selectedOptions = Array.from(
      document.getElementById("insuranceFilter").selectedOptions
    ).map((option) => option.value);

    const response = await fetch("/api/hospitals");
    const hospitals = await response.json();

    const filtered = selectedOptions.length
      ? hospitals.filter((h) =>
          h.insurance.some((ins) => selectedOptions.includes(ins))
        )
      : hospitals;

    const modalList = document.getElementById("modalHospitalList");
    modalList.innerHTML = filtered
      .map(
        (h) => `
      <div class="result-card">
        <div>
          <strong>${h.name}</strong>
          <p>${h.address}</p>
        </div>
        <button class="open-popup" data-id="${h.id}" type="button">Open</button>
      </div>`
      )
      .join("");

    attachPopupListeners(); // rebind listeners
    initializeModalMap(filtered); // refresh map
  });

function attachPopupListeners() {
  const popupButtons = document.querySelectorAll(".open-popup");
  popupButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      showHospitalPopup(id);
    });
  });
}

function openHospitalDetail(id) {
  console.log("Opening hospital detail for ID:", id); // <== HERE
  fetch(`/api/hospitals/${id}`)
    .then((res) => res.json())
    .then((h) => {
      const modal = document.getElementById("detailModal");
      modal.querySelector("h3").textContent = h.name;
      modal.querySelector(".hospital-img").src = `/static/imgs/${
        h.image || "default.jpg"
      }`;
      const info = modal.querySelectorAll("p");
      info[0].textContent = h.address;
      info[1].textContent = h.phone;
      info[2].textContent = h.hours;

      const tagContainer = modal.querySelector(".tags");
      tagContainer.innerHTML = `
        <p><strong>Accepted Insurance:</strong></p>
        ${h.insurance.map((i) => `<span class="tag">${i}</span>`).join("")}
        <p style="margin-top: 10px;"><strong>Services:</strong></p>
        ${h.services.map((s) => `<span class="tag">${s}</span>`).join("")}
      `;
      modal.style.display = "flex";
    });
}

function showHospitalPopup(id) {
  fetch(`/api/hospitals/${id}`)
    .then((res) => res.json())
    .then((h) => {
      const popup = document.getElementById("detailPopup");
      popup.querySelector("h3").textContent = h.name;
      popup.querySelector(".popup-img").src = `/static/imgs/${
        h.image || "default.jpg"
      }`;
      const info = popup.querySelectorAll("p");
      info[0].textContent = h.address;
      info[1].textContent = h.phone;
      info[2].textContent = h.hours;

      const insuranceTags = popup.querySelector("#popupInsurance");
      insuranceTags.innerHTML = h.insurance
        .map((i) => `<span class="popup-tag">${i}</span>`)
        .join("");
      const serviceTags = popup.querySelector("#popupServices");
      serviceTags.innerHTML = h.services
        .map((s) => `<span class="popup-tag">${s}</span>`)
        .join("");

      popup.style.display = "flex";
    });
}

// === Support Group Panel ===
function fetchSupportGroups() {
  const data = [
    {
      id: 1,
      name: "Young Women’s Drop-In Support Group – Under 45 years of age *Virtual",
      language: "English",
      description:
        "This group will address the unique needs of young women with breast cancer and will meet via zoom",
      schedule: "Tuesday’s from 7pm – 8pm",
      location: "Virtual",
    },
    {
      id: 2,
      name: "Drop-In Support Group – Virtual",
      language: "English",
      description:
        "Newly Diagnosed Drop-In Support Group - This group will address the unique needs of young women with breast cancer and will meet via zoom",
      schedule: "Friday’s from 12pm – 1pm",
      location: "Virtual",
    },
    {
      id: 3,
      name: "Drop-In Support Group – In-Person",
      language: "English",
      description:
        "Hormone Therapy Drop-In Support Group - This support group is for breast cancer patients and survivors who are currently on hormone therapy (as adjuvant therapy).",
      schedule: "Monday’s from 6pm – 7pm",
      location: "In-Person",
    },
    {
      id: 4,
      name: "Stage 4 Breast Cancer Support Group – Virtual",
      language: "English",
      description:
        "Men and women with Stage 4 Metastatic Breast Cancer are welcome to join an ongoing twice-monthly group via zoom to share information, feelings, hopes and coping strategies.",
      schedule: "Twice-Monthly",
      location: "Virtual",
    },
    {
      id: 5,
      name: "Cafecito – *Virtual*",
      language: "Spanish",
      description:
        "Un grupo de apoyo para pacientes y sobrevivientes de Cáncer del seno.",
      schedule: "Meets 1st Thursday of the month",
      location: "In-Person",
    },
    {
      id: 6,
      name: "Cafecito – *Virtual*",
      language: "Spanish",
      description:
        "Un grupo de apoyo para pacientes y sobrevivientes de Cáncer del seno.",
      schedule: "Meets 2nd Thursday of the month",
      location: "Virtual",
    },
    {
      id: 7,
      name: "Cafecito – *Virtual*",
      language: "Spanish",
      description:
        "Un grupo de apoyo para pacientes y sobrevivientes de Cáncer del seno.",
      schedule: "Meets 3rd Thursday of the month",
      location: "Virtual",
    },
    {
      id: 8,
      name: "Cafecito – *Virtual*",
      language: "Spanish",
      description:
        "Un grupo de apoyo para pacientes y sobrevivientes de Cáncer del seno.",
      schedule: "Meets 4th Thursday of the month",
      location: "Virtual",
    },
  ];

  // Store for filtering
  cachedSupportGroups = data;
  allSupportGroups = data;

  // === Homepage panel – show 2 only
  const homepageList = document.getElementById("supportGroupList");
  homepageList.innerHTML = data
    .slice(0, 2)
    .map(
      (g) => `
        <div class="support-card">
          <strong>${g.name}</strong>
          <span class="badge">${g.language}</span>
          <p>${g.description}</p>
          <p>🕒 ${g.schedule}</p>
          <p>📍 ${g.location}</p>
          <button class="join-group final-join" data-id="${g.id}" type="button">Join Group</button>
        </div>`
    )
    .join("");

  // === Preload full list into modal
  renderSupportGroups(data); // uses full unfiltered list
}

// === Render for Modal (called by language filter too)
function renderSupportGroups(data) {
  const modalList = document.getElementById("supportGrid");
  modalList.innerHTML = data
    .map(
      (g) => `
      <div class="support-card">
        <strong>${g.name}</strong>
        <span class="badge">${g.language}</span>
        <p>${g.description}</p>
        <p>🕒 ${g.schedule}</p>
        <p>📍 ${g.location}</p>
        <button class="join-group final-join" data-id="${g.id}" type="button">Join Group</button>
      </div>`
    )
    .join("");
}

function populateSupportModal(data) {
  const modalList = document.getElementById("supportGrid");
  modalList.innerHTML = data
    .map(
      (g) => `
    <div class="support-card">
      <strong>${g.name}</strong>
      <span class="badge">${g.language}</span>
      <p>${g.description}</p>
      <p>🕒 ${g.schedule}</p>
      <p>📍 ${g.location}</p>
      <button class="join-group" data-id="${g.id}" type="button">Join Group</button>
    </div>`
    )
    .join("");
}

function openSupportGroupDetail(id) {
  fetch(`/api/support-groups/${id}`)
    .then((res) => res.json())
    .then((group) => {
      const modal = document.getElementById("joinGroupPopup");
      document.getElementById("groupName").textContent = group.name;
      document.getElementById("groupLanguage").textContent = group.language;
      document.getElementById("groupSchedule").textContent = group.schedule;
      document.getElementById("groupLocation").textContent = group.location;
      document.getElementById("groupDescription").textContent =
        group.description;
      modal.style.display = "flex";
    });
}
const translations = {
  en: {
    overview: "Overview",
    videos: "Videos & Articles",
    resources: "Resources",
    progress: "Progress",
    setting: "Setting",
    userSince: "Member since Apr 2025",
    hospitals: "Hospitals and Clinics",
    support: "Support Groups",
  },
  es: {
    overview: "Resumen",
    videos: "Videos y Artículos",
    resources: "Recursos",
    progress: "Progreso",
    setting: "Configuración",
    userSince: "Miembro desde abril 2025",
    hospitals: "Hospitales y Clínicas",
    support: "Grupos de Apoyo",
  },
};
document.querySelector(".language").addEventListener("click", () => {
  applyTranslations("es"); // change 'es' to 'en' to toggle back
});

function applyTranslations(lang) {
  const t = translations[lang];

  // Sidebar labels (use span or label with IDs)
  document.querySelector("li:nth-child(1) span").textContent = t.overview;
  document.querySelector("li:nth-child(2) span").textContent = t.videos;
  document.querySelector("li:nth-child(3) span").textContent = t.resources;
  document.querySelector("li:nth-child(4) span").textContent = t.progress;
  document.querySelector("li:nth-child(5) span").textContent = t.setting;

  // Profile
  document.getElementById("join-date").textContent = t.userSince;

  // Panel titles
  document.querySelector(".hospitals-panel h3").textContent = t.hospitals;
  document.querySelector(".support-panel h3").textContent = t.support;
}
let currentLang = "en";

document.querySelector(".language").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "es" : "en";
  applyTranslations(currentLang);
});

document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([40.7891, -73.135], 10); // Long Island center

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  }).addTo(map);

  // ADD MARKERS FROM ENRICHED HOSPITAL DATA
  fetch("/api/hospitals")
    .then((res) => res.json())
    .then((hospitals) => {
      hospitals.forEach((h) => {
        const marker = L.marker([h.lat, h.lon]).addTo(map);
        marker.bindPopup(`
          <b>${h.name}</b><br>
          ${h.address}<br>
          Oncologist: ${h.oncologist}<br>
          Hours: ${h.hours || "Not available"}
        `);
      });
    });
});

// ✅ Your main logic above...

// ✅ ADD THIS at the bottom — outside of everything else:
// ✅ ADD THIS at the bottom – outside of everything else:
let modalMap;
let modalMarkers = [];
let userSearchMarker = null; // So it's scoped across searches

// 🔴 Define a red marker icon
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function initializeModalMap(hospitals) {
  if (modalMap) {
    modalMap.remove();
    modalMap = null;
    modalMarkers = [];
  }

  modalMap = L.map("modalMap").setView([40.789, -73.134], 9); // Long Island

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(modalMap);

  // 🔁 Add all hospital markers
  hospitals.forEach((h) => {
    if (h.lat && h.lon) {
      const marker = L.marker([h.lat, h.lon]).addTo(modalMap);
      marker.bindPopup(`
        <strong>${h.name}</strong><br>
        ${h.address}<br>
        <em>Oncologist: ${h.oncologist || "To Be Assigned"}</em><br>
        <em>Hours: ${h.hours || "Not available"}</em>
      `);
      modalMarkers.push(marker);
    }
  });

  // ✅ Add geocoder control (clickable magnifying glass)
  L.Control.geocoder({
    defaultMarkGeocode: false,
  })
    .on("markgeocode", function (e) {
      const center = e.geocode.center;
      modalMap.setView(center, 14);
      L.marker(center, { icon: redIcon })
        .addTo(modalMap)
        .bindPopup(`<strong>Your Location</strong><br>${e.geocode.name}`)
        .openPopup();
    })
    .addTo(modalMap);

  // ✅ 🔍 Address bar input — handle Enter key
  const input = document.getElementById("addressSearchInput");
  if (input) {
    console.log("✅ Listening on address input...");
    input.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const query = input.value.trim();
        if (!query || !modalMap) return;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}`
        );
        const data = await res.json();
        if (!data.length) {
          alert("Location not found.");
          return;
        }

        const result = data[0];
        const latlng = [parseFloat(result.lat), parseFloat(result.lon)];

        // Remove previous search marker
        if (userSearchMarker) {
          modalMap.removeLayer(userSearchMarker);
        }

        // Add new red marker
        userSearchMarker = L.marker(latlng, { icon: redIcon })
          .addTo(modalMap)
          .bindPopup(`<strong>Your Location</strong><br>${result.display_name}`)
          .openPopup();

        modalMap.setView(latlng, 14);
      }

      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".open-hospital");
        if (!btn) return;
        e.preventDefault();
        console.log("Clicked open-hospital", btn.dataset.id); // ✅ Debug
        openHospitalDetail(btn.dataset.id);
      });
    });
  }
}


 const dropdownToggle = document.getElementById("dropdownToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");

  if (dropdownToggle && dropdownMenu) {
    dropdownToggle.addEventListener("click", () => {
      dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
        dropdownMenu.style.display = "none";
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      alert("Logging out...");
      window.location.href = "/logout";
    });
  }