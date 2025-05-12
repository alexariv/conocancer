// Ensure the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
  let currentLanguage = localStorage.getItem("preferredLanguage") || "en";
  const user_id = document.body.dataset.userId;

  const lessons = document.querySelectorAll(".lesson-item");
  const breadcrumb = document.getElementById("breadcrumb");
  const videoWrapper = document.getElementById("video-wrapper");
  const readingSection = document.getElementById("reading-section");
  const quizSection = document.getElementById("quiz-section");
  const languageBtn = document.querySelector(".language");

  const videoMap = {
    en: {
      1: "Breast_Cancer_Survivorship_03E.mp4",
      2: "Cancer_Survivorship_Care_Plans_03E.mp4",
      3: "Cancer_Survi_Made_with_Clipchamp_03E.mp4",
    },
    es: {
      1: "Breast_Cancer_Survivorship_03S.mp4",
      2: "Cancer_Survivorship_Care_Plans_03S.mp4",
      3: "Cancer_Survi_Made_with_Clipchamp_03S.mp4",
    }
  };

  const readingMap = {
    en: "Breast Cancer_En.pdf",
    es: "Breast Cancer_SP.pdf"
  };

  function loadVideo(id) {
    const videoID = currentLanguage === "en" ? "03E" : "03S";
    const videoURL = `/static/media/${videoMap[currentLanguage][id]}`;

    if (videojs.getPlayer("lesson-video")) {
      videojs.getPlayer("lesson-video").dispose();
    }

    videoWrapper.innerHTML = `
      <video id="lesson-video" class="video-js vjs-default-skin" controls preload="auto" playsinline style="width: 100%; height: auto;">
        <source src="${videoURL}" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    `;

    const player = videojs("lesson-video", {
      autoplay: true,
      muted: true,
      controls: true
    });

    let hasStartedPlaying = false;
    let lastAllowedTime = 0;

    player.ready(() => {
      player.play().catch(() => {}); // Let autoplay try

      player.one("play", () => {
        hasStartedPlaying = true;
        updateProgress(`video${id}`, "in_progress");
        updateLessonStatusUI(id, "video", "in_progress");
        player.muted(false);
        player.volume(1.0);
      });
    });

    player.on("timeupdate", () => {
      if (!player.paused()) {
        lastAllowedTime = player.currentTime();
      }
    });

    player.on("seeking", () => {
      if (player.currentTime() > lastAllowedTime + 1) {
        player.currentTime(lastAllowedTime);
      }
    });

    player.on("ended", () => {
      if (hasStartedPlaying) {
        updateProgress(`video${id}`, "completed");
        updateLessonStatusUI(id, "video", "completed");
      }
    });

    fetch(`/api/questions/${videoID}`)
      .then(res => res.json())
      .then(questions => {
        const embeddedQuestions = questions.map(q => ({ ...q, shown: false, answered: false }));

        player.on("timeupdate", () => {
          const currentTime = player.currentTime();
          embeddedQuestions.forEach(q => {
            if (!q.shown && currentTime >= q.timestamp) {
              q.shown = true;
              player.pause();
              displayEmbeddedQuestion(q);
            }
          });
        });
      })
      .catch(err => console.error("Failed to load questions", err));
  }

  function displayEmbeddedQuestion(question) {
    quizSection.innerHTML = `
      <div class="quiz-container" style="margin-top: 20px;">
        <p><strong>${question.text}</strong></p>
        ${question.options.map(opt => `
          <label class="quiz-option">
            <input type="radio" name="q-${question.id}" value="${opt.text}">
            ${opt.text}
          </label>
        `).join('')}
        <button onclick="submitAnswer('${question.id}', document.querySelector('input[name=q-${question.id}]:checked')?.value, '${question.category_id}', '${question.type}')">Submit</button>
      </div>
    `;
    quizSection.style.display = "block";
  }

  window.submitAnswer = function (questionId, answer, categoryId, questionType) {
    if (!answer) return alert("Please select an answer first.");

    fetch("/check_answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, question_id: questionId, answer, category_id: categoryId })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.correct ? "Correct!" : "Incorrect. Try again.");

      if (data.correct) {
        fetch("/submit_answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id, question_id: questionId, answer, category_id: categoryId, question_type: questionType })
        });

        const player = videojs("lesson-video");
        player.play();
      }
    });
  };

  function loadReading() {
    const pdfURL = `/static/media/${readingMap[currentLanguage]}`;
    readingSection.innerHTML = `
      <h3>${currentLanguage === "en" ? "Reading" : "Lectura"}</h3>
      <iframe src="${pdfURL}" width="100%" height="600" style="border: none;"></iframe>
      <button id="markAsReadBtn" class="transcript-btn">${currentLanguage === "en" ? "Mark as Read" : "Marcar como Leído"}</button>
    `;
    document.getElementById("markAsReadBtn").addEventListener("click", () => {
      updateProgress("reading", true);
      updateLessonStatusUI(1, "reading");
      alert(currentLanguage === "en" ? "Marked as read!" : "¡Marcado como leído!");
    });
  }

  async function loadQuiz(id) {
    try {
      const res = await fetch(`/api/quiz?lang=${currentLanguage}&id=${id}`);
      const questions = await res.json();

      quizSection.innerHTML = `<h3>${currentLanguage === "en" ? "Study Quiz" : "Cuestionario de Estudio"}</h3>`;
      questions.forEach((q, i) => {
        const questionDiv = document.createElement("div");
        questionDiv.classList.add("quiz-q");
        questionDiv.innerHTML = `
          <p><strong>${i + 1}. ${q.question}</strong></p>
          ${q.options.map(opt => `
            <label class="quiz-option">
              <input type="radio" name="q${i}" value="${opt}"> ${opt}
            </label>
          `).join('')}
        `;
        quizSection.appendChild(questionDiv);
      });

      const submitBtn = document.createElement("button");
      submitBtn.classList.add("transcript-btn");
      submitBtn.textContent = currentLanguage === "en" ? "Submit" : "Enviar";
      submitBtn.addEventListener("click", () => {
        alert(currentLanguage === "en" ? "Quiz submitted!" : "¡Cuestionario enviado!");
        updateProgress(`quiz${id}`, true);
        updateLessonStatusUI(id, "quiz");
      });

      quizSection.appendChild(submitBtn);
    } catch (err) {
      console.error("Quiz Load Error", err);
    }
  }

  lessons.forEach(lesson => {
    lesson.addEventListener("click", () => {
      lessons.forEach(l => l.classList.remove("active"));
      lesson.classList.add("active");

      const type = lesson.dataset.type;
      const id = lesson.dataset.id;
      const title = lesson.querySelector(".lesson-title")?.textContent || "";

      videoWrapper.style.display = "none";
      readingSection.style.display = "none";
      quizSection.style.display = "none";

      if (type === "video") {
        loadVideo(id);
        videoWrapper.style.display = "block";
        breadcrumb.innerText = `Survivorship › ${title}`;
      } else if (type === "reading") {
        loadReading();
        readingSection.style.display = "block";
        breadcrumb.innerText = `Survivorship › ${currentLanguage === "en" ? "Reading" : "Lectura"}`;
      } else if (type === "quiz") {
        loadQuiz(id);
        quizSection.style.display = "block";
        breadcrumb.innerText = `Survivorship › ${currentLanguage === "en" ? "Quiz" : "Cuestionario"}`;
      }
    });
  });

  function updateProgress(lessonKey, status) {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonKey, status })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const type = lessonKey.includes("video") ? "video" : (lessonKey.includes("quiz") ? "quiz" : "reading");
        const id = parseInt(lessonKey.replace(/[^\d]/g, ""));
        updateLessonStatusUI(id, type, status);
      }
    });
  }

  async function loadUserProgress() {
    try {
      const res = await fetch("/api/progress");
      const data = await res.json();
      data.forEach(entry => {
        updateLessonStatusUI(entry.lesson_id, entry.lesson_type, entry.status);
      });
    } catch (err) {
      console.error("Could not load user progress", err);
    }
  }
  function updateLessonStatusUI(id, type, status = "completed") {
    const item = document.querySelector(`.lesson-item[data-id="${id}"][data-type="${type}"]`);
    if (item) {
      item.classList.remove("completed", "in-progress");
      item.classList.add(status === "completed" ? "completed" : status === "in_progress" ? "in-progress" : "");
      item.querySelector(".lesson-status").textContent = status === "completed"
        ? "Completed" : status === "in_progress"
        ? "In Progress" : "Not Started";
    }
  }

  // Handle language switch
  languageBtn.addEventListener("click", () => {
    currentLanguage = currentLanguage === "en" ? "es" : "en";
    localStorage.setItem("preferredLanguage", currentLanguage);
    updateLanguageUI();

    // Refresh current active lesson in new language
    const current = document.querySelector(".lesson-item.active");
    if (current) current.click();
  });

  // Change UI text to selected language
  function updateLanguageUI() {
    languageBtn.textContent = currentLanguage === "en" ? "Español" : "English";

    const sidebarItems = document.querySelectorAll(".sidebar-nav li");
    const translations = {
      en: ["Dashboard", "Videos & Articles", "Resources", "Progress", "Settings"],
      es: ["Resumen", "Videos y Artículos", "Recursos", "Progreso", "Configuración"]
    };

    sidebarItems.forEach((item, i) => {
      const textEl = item.querySelector(".nav-text");
      if (textEl) textEl.textContent = translations[currentLanguage][i];
    });

    // Update member join date localization
    document.getElementById("join-date").textContent =
      currentLanguage === "en" ? "Member since Apr 2025" : "Miembro desde Apr 2025";
  }

  loadUserProgress();
});
//user profile log in and out
document.addEventListener("DOMContentLoaded", () => {
  const dropdownToggle = document.getElementById("dropdownToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const logoutBtn = document.getElementById("logoutBtn");
  const confirmModal = document.getElementById("confirmModal");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  // Toggle Dropdown
  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
  });

  // Show Confirm Modal
  logoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = "none";
    confirmModal.style.display = "flex";
  });

  // Confirm YES
  confirmYes.addEventListener("click", () => {
    window.location.href = "/logout";// ✅ Redirect to Landing
  });

  // Confirm NO
  confirmNo.addEventListener("click", () => {
    confirmModal.style.display = "none";
  });

  // Close dropdown on outside click
  document.addEventListener("click", () => {
    dropdownMenu.style.display = "none";
  });
});