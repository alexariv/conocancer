// Ensure the DOM is fully loaded before running script
document.addEventListener("DOMContentLoaded", () => {
  let currentLanguage = localStorage.getItem("preferredLanguage") || "en";
  const user_id = document.body.dataset.userId;

  const lessons = document.querySelectorAll(".lesson-item");
  const breadcrumb = document.getElementById("breadcrumb");
  const videoWrapper = document.getElementById("video-wrapper");
  const readingSection = document.getElementById("reading-section");
  const quizSection = document.getElementById("quiz-section");
  const languageBtn = document.querySelector(".language");

  const lessonTitles = {
    en: {
      video: {
        1: "Chemotherapy for Breast Cancer",
        2: "Surgeries for Breast Cancer",
      },
      reading: {
        1: "Chemotherapy",
        2: "Surgery",
      },
      quiz: {
        1: "Treatment",
      }
    },
    es: {
      video: {
        1: "Quimioterapia para el Cáncer de Mama",
        2: "Cirugías para el Cáncer de Mama",
      },
      reading: {
        1: "Quimioterapia",
        2: "Cirugías"
      },
      quiz: {
        1: "Tratamiento",
      }
    }
  };
  function updateLessonTitles() {
    lessons.forEach(lesson => {
      const type   = lesson.dataset.type; // "video"|"reading"|"quiz"
      const id     = lesson.dataset.id;   // "1","2",…
      const prefix = type === "quiz"
        ? (currentLanguage==="en" ? "Quiz:" : "Cuestionario:")
        : type === "reading"
          ? (currentLanguage==="en" ? "Reading:" : "Lectura:")
          : "Video:";
      const title  = lessonTitles[currentLanguage][type][id];
      lesson.querySelector(".lesson-title").textContent = `${prefix} ${title}`;
    });
  }
  function updateLanguageButton() {
    languageBtn.textContent = currentLanguage === "en" ? "Español" : "English";
  }
  // ←—————————————————————————————

  // 4. Now do your initial paint (before you wire up click-handlers)
  updateLanguageButton();
  updateLessonTitles();
const videoMap = {
    en: {
      1: "Cancer_Chemotherapy_11E.mp4",
      2: "Surgeries_for_Breast_Cancer_13E.mp4",
    },
    es: {
      1: "Cancer_Chemotherapy_11S.mp4",
      2: "Surgeries_for_Breast_Cancer_13S.mp4",
    }
  };

  const readingMap = {
    en: {
      1: "chemotherapyE.pdf",
      2: "surgeryE.pdf",
    },
    es: {
      1: "chemotherapyS.pdf",
      2: "surgeryS.pdf",
    }
  };
 const questionVideoIdMap = {
   en: { 1: "11E", 2: "13E" },
   es: { 1: "11S", 2: "13S" }
 };

  // =============== VIDEO + EMBEDDED QUESTIONS ===============
  async function loadVideo(id) {
    // 1) fetch saved position
  let resumeTime = 0;
  try {
    const res = await fetch(`/api/progress/position?lessonKey=video${id}`);
    const json = await res.json();
    resumeTime = json.position || 0;
  } catch (e) {
    console.warn("Could not fetch resume position", e);
  }
  let lastAllowedTime = resumeTime;
    const videoID = questionVideoIdMap[currentLanguage][id];
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

    const player = videojs("lesson-video", { controls: true,
    autoplay: false,    // ← turn this off
    muted: true,        // you can still start muted if you like
    preload: "auto",
    controlBar: {
      children: [
        "playToggle",
        "volumePanel",
        "currentTimeDisplay",
        "progressControl",    // ← this is your seek‐bar
        "durationDisplay",
        "fullscreenToggle"
      ]
    }
    });

    let hasStartedPlaying = false;
    // throttle to once every 10 seconds:
    let lastSavedTime = 0;
    player.on("timeupdate", () => {
      const now = player.currentTime();
      if (Math.abs(now - lastSavedTime) > 10) {       // 10-second granularity
    savePosition(`video${id}`, now);
    lastSavedTime = now;
    }
  });

// also save when they explicitly pause
player.on("pause", () => {
  savePosition(`video${id}`, player.currentTime());
});

    //player.ready(() => {
      //player.play().catch(() => {});
      //player.one("play", () => {
       // hasStartedPlaying = true;
       // updateProgress(`video${id}`, "in_progress");
       // updateLessonStatusUI(id, "video", "in_progress");
      //  player.muted(false);
       // player.volume(1.0);
      //});
    //});
   player.ready(() => {
  // 1) seek to the server‐saved spot
  if (resumeTime > 1) {
    player.currentTime(resumeTime);
    lastAllowedTime = resumeTime;
  }
  // 2) leave it paused so the user can hit ▶️ when ready
  player.one('play', () => {
    hasStartedPlaying = true;
    updateProgress(`video${id}`, 'in_progress');
    updateLessonStatusUI(id, 'video', 'in_progress');
    player.muted(false);
    player.volume(1.0);
  });
});

   // update the furthest-played point whenever the video is playing
  player.on("timeupdate", () => {
    if (!player.paused()) {
      lastAllowedTime = Math.max(lastAllowedTime, player.currentTime());
    }
  });

  // only clamp seeking if the user tries to jump ahead of lastAllowedTime
  player.on("seeking", () => {
    const target = player.currentTime();
    if (target > lastAllowedTime + 1) {
      player.currentTime(lastAllowedTime);
    }
  });

    player.on("ended", () => {
      if (hasStartedPlaying) {
        updateProgress(`video${id}`, "completed");
        updateLessonStatusUI(id, "video", "completed");
      }
    });
    console.log("🗂 Loading questions for", videoID, "language:", currentLanguage);
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
      });
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
        videojs("lesson-video").play();
      }
    });
  };

  // =============== READING ===============
  function loadReading() {
    const pdfURL = `/static/media/${readingMap[currentLanguage]}`;
    readingSection.innerHTML = `
      <h3>${currentLanguage === "en" ? "Reading" : "Lectura"}</h3>
      <iframe src="${pdfURL}" width="100%" height="600" style="border: none;"></iframe>
      <button id="markAsReadBtn" class="transcript-btn">${currentLanguage === "en" ? "Mark as Read" : "Marcar como Leído"}</button>
    `;
    document.getElementById("markAsReadBtn").addEventListener("click", () => {
      updateProgress("reading", "completed");
      updateLessonStatusUI(1, "reading");
      alert(currentLanguage === "en" ? "Marked as read!" : "¡Marcado como leído!");
    });
  }

  // =============== STUDY QUIZ WITH MICROPHONE ===============
  async function loadStudyQuiz(categoryId) {
    updateProgress(`quiz${categoryId}`, "in_progress");
    updateLessonStatusUI(categoryId, "quiz", "in_progress");
    // 2. Fetch questions
  const resQ = await fetch(`/api/study_quiz/${categoryId}?lang=${currentLanguage}`);
  const questions = await resQ.json();

  // 3. Fetch saved answers
  const resA = await fetch(`/api/study_answers/${categoryId}`);
  const saved = await resA.json();
  const savedMap = {};
  saved.forEach(a => {
    savedMap[a.study_question_id] = a.user_answer;
  });

      quizSection.innerHTML = `<h3>${
    currentLanguage === "en" ? "Study Quiz" : "Cuestionario de Estudio"
  }</h3>`;

  questions.forEach((q, i) => {
    const userAns = savedMap[q.study_question_id] || "";
    const questionDiv = document.createElement("div");
    questionDiv.classList.add("quiz-q");

    let optionsHTML = "";
    if (q.question_type === "Multiple Choice" || q.question_type === "T/F") {
      q.options.forEach(opt => {
        // pre-check if this option text matches saved answer
        const isChecked = userAns === opt.option_text ? 'checked' : '';
        optionsHTML += `
          <label class="quiz-option">
            <input type="radio"
                   name="q${i}"
                   value="${opt.option_text}"
                   ${isChecked}>
            ${opt.option_text}
          </label>
        `;
      });
    } else if (q.question_type === "Short Response") {
      // pre-fill textarea
      optionsHTML = `
        <textarea name="q${i}"
                  placeholder="${
                    currentLanguage === "en" ? "Your answer..." : "Tu respuesta..."
                  }"
        >${userAns}</textarea>
        <button class="mic-btn" data-index="${i}">🎤 Start Recording</button>
      `;
    }

    questionDiv.innerHTML = `
      <p><strong>${i + 1}. ${q.question_text}</strong></p>
      ${optionsHTML}
      <button class="save-answer-btn" data-index="${i}">Save Answer</button>
    `;
    quizSection.appendChild(questionDiv);
  });

    document.querySelectorAll(".save-answer-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const index = btn.dataset.index;
        const question = questions[index];
        let answer = "";

        if (question.question_type === "Multiple Choice" || question.question_type === "T/F") {
          const selected = document.querySelector(`input[name="q${index}"]:checked`);
          answer = selected ? selected.value : "";
        } else {
          const textarea = document.querySelector(`textarea[name="q${index}"]`);
          answer = textarea.value;
        }

        fetch("/api/save_study_answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id,
            category_id: categoryId,
            question_id: question.study_question_id,
            question_type: question.question_type,
            answer
          })
        }).then(() => alert("Answer saved!"));
      });
    });

    document.querySelectorAll(".mic-btn").forEach(btn => {
      const idx = btn.dataset.index;
      const textarea = document.querySelector(`textarea[name="q${idx}"]`);
      setupMicButton(btn, textarea);
    });   

    const submitBtn = document.createElement("button");
    submitBtn.classList.add("transcript-btn");
    submitBtn.textContent = currentLanguage === "en" ? "Submit Study Quiz" : "Enviar Cuestionario de Estudio";
    submitBtn.addEventListener("click", () => submitStudyQuiz(categoryId, questions));
    quizSection.appendChild(submitBtn);
  }

  function submitStudyQuiz(categoryId, questions) {
    const answers = questions.map((q,i) => {
      let ua = "";
      if (q.question_type === "Short Response") {
        ua = document.querySelector(`textarea[name="q${i}"]`).value.trim();
      } else {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        ua = sel ? sel.value : "";
      }
      return { question_id: q.study_question_id, question_type: q.question_type, user_answer: ua };
    });
  
    // 1) Save
    fetch("/api/submit_study_quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, category_id: categoryId, answers })
    })
    // 2) Then evaluate & parse JSON
    .then(() => fetch("/api/evaluate_study_quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, category_id: categoryId })
     }))
  .then(res => res.json())
  .then(showQuizSummary)   // pass the parsed response object
  .then(response => {
        // once we have the results, mark quiz completed
        updateProgress(`quiz${categoryId}`, "completed");
        updateLessonStatusUI(categoryId, "quiz", "completed");
        showQuizSummary(response);
      })
  .catch(err => console.error("Quiz flow error:", err));
}
  
  // helper to populate & show the modal
function showQuizSummary(response) {
  const { summary: items, total_awarded, total_possible } = response;
  const isEn = currentLanguage === "en";

  // localized labels
  const scoreLabel      = isEn ? "Your Score"      : "Tu puntuación";
  const correctLabel    = isEn ? "Correct"         : "Correcto";
  const incorrectLabel  = isEn ? "Incorrect"       : "Incorrecto";
  const fullyLabel      = isEn ? "Fully Correct"   : "Completamente correcto";
  const partialLabel    = isEn ? "Partially Correct": "Parcialmente correcto";

  // 1) Update the total score
  const scoreEl = document.getElementById("summaryScore");
  scoreEl.textContent = `${scoreLabel}: ${total_awarded} / ${total_possible}`;

  // 2) Populate each question line
  const list = document.getElementById("summaryList");
  list.innerHTML = "";

  items.forEach(item => {
    let statusText;
    if (item.max_points === 1) {
      statusText = item.points_awarded === 1 ? correctLabel : incorrectLabel;
    } else {
      statusText = item.points_awarded === 2
        ? fullyLabel
        : item.points_awarded === 1
          ? partialLabel
          : incorrectLabel;
    }

    const li = document.createElement("li");
    li.textContent =
      `${item.question_id}: ${statusText} — ${isEn ? "Your answer" : "Tu respuesta"}: “${item.user_answer}” ` +
      `(${item.points_awarded}/${item.max_points})`;
    list.appendChild(li);
  });

  // 3) Show the modal
  document.getElementById("quizSummaryModal").style.display = "flex";
}

 document
    .getElementById("closeSummary")
    .addEventListener("click", () => {
      document.getElementById("quizSummaryModal").style.display = "none";
    });

  
  function setupMicButton(btn, textarea) {
    let recorder, stream, chunks;
    let isRecording = false;
    const MAX_TIME = 10000; // 10s
  
    btn.addEventListener("click", () => {
      if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(s => {
            stream = s;
            recorder = new MediaRecorder(stream);
            chunks = [];
  
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
  const blob = new Blob(chunks, { type: "audio/webm" });
  console.log("Stopping recorder; blob size:", blob.size);

  fetch("/api/transcribe_whisper", {
    method: "POST",
    headers: { "Content-Type": "audio/webm" },
    body: blob
  })
  .then(r => {
    console.log("Network response status:", r.status);
    return r.json();
  })
  .then(json => {
    console.log("Whisper API returned:", json);
    if (json.transcript) {
      textarea.value += json.transcript + " ";
    } else {
      console.error("No `transcript` field in response:", json);
      alert("Transcription failed—check console for details.");
    }
  })
  .catch(err => {
    console.error("Fetch/transcription error:", err);
    alert("Error contacting transcription service");
  })
  .finally(() => {
    stream.getTracks().forEach(t => t.stop());
    btn.textContent = "🎤 Start Recording";
    isRecording = false;
  });
};

  
            recorder.start();
            isRecording = true;
            btn.textContent = "⏹ Stop Recording";
  
            setTimeout(() => {
              if (isRecording) recorder.stop();
            }, MAX_TIME);
          })
          .catch(err => {
            console.error("Mic error:", err);
            btn.textContent = "🎤 Start Recording";
          });
      } else {
        // Stop early if user clicks again
        recorder.stop();
      }
    });
  }
  
  
  
  function startASR(textarea, btn) {
    const RECORD_TIME = 10000; // 10s
    btn.textContent = "Recording…";
    btn.disabled = true;
  
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        const chunks = [];
  
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          // send to your Flask proxy
          fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: blob
          })
          .then(r => r.json())
          .then(json => {
            if (json.transcript) {
              textarea.value += json.transcript + " ";
            }
          })
          .catch(err => console.error("Transcription error:", err))
          .finally(() => {
            stream.getTracks().forEach(t => t.stop());
            btn.textContent = "🎤 Start Recording";
            btn.disabled = false;
          });
        };
  
        recorder.start();
        setTimeout(() => recorder.stop(), RECORD_TIME);
      })
      .catch(err => {
        console.error("Microphone error:", err);
        btn.textContent = "🎤 Code-Switch";
        btn.disabled = false;
      });
  }
  
  // =============== LESSON CLICK EVENTS ===============
  lessons.forEach(lesson => {
lesson.addEventListener("click", async () => {
    const type = lesson.dataset.type;
    const id   = Number(lesson.dataset.id);

    // if it's a quiz and already completed → confirm retake
    if (type === "quiz" && lesson.classList.contains("completed")) {
      const msg = currentLanguage === "en"
        ? "You’ve already completed this quiz. Would you like to retake it?"
        : "Ya completaste este cuestionario. ¿Quieres volver a intentarlo?";
      if (!confirm(msg)) {
        return;  // user cancelled → do nothing
      }
      // user wants to retake:
      await fetch(`/api/clear_study_answers/${id}`, { method: "POST" });

      // reset progress status in your progress table + UI
      updateProgress(`quiz${id}`, "in_progress");
      updateLessonStatusUI(id, "quiz", "in_progress");
    }

    //— now the normal “load” logic:
    lessons.forEach(l => l.classList.remove("active"));
    lesson.classList.add("active");

      videoWrapper.style.display = "none";
      readingSection.style.display = "none";
      quizSection.style.display = "none";

      if (type === "video") {
        loadVideo(id);
        videoWrapper.style.display = "block";
      } else if (type === "reading") {
        loadReading();
        readingSection.style.display = "block";
      } else if (type === "quiz") {
        loadStudyQuiz(id);
        quizSection.style.display = "block";
      }
    });
  });

  function updateProgress(lessonKey, status) {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonKey, status })
    });
  }
 function savePosition(lessonKey, position) {
  return fetch('/api/progress/position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonKey, position })
  })
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
      item.classList.add(status === "completed" ? "completed" : "in-progress");
      item.querySelector(".lesson-status").textContent = status === "completed" ? "Completed" : "In Progress";
    }
  }

  languageBtn.addEventListener("click", () => {
    currentLanguage = currentLanguage === "en" ? "es" : "en";
    localStorage.setItem("preferredLanguage", currentLanguage);
    updateLanguageButton();
    updateLessonTitles();
    location.reload();
  });
  // <-- After all lessons loaded
loadUserProgress()
  .then(() => {
    // this will recalc and redraw your 0% → 33% (etc) rings
    refreshDashboardProgress();
  })
  .catch(err => console.error(err));
});