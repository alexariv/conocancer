document.addEventListener("DOMContentLoaded", () => {
  const feedbackBtn = document.getElementById("feedback-btn");
  const modal = document.getElementById("feedback-modal");
  const closeModal = document.querySelector(".close-modal");
  const feedbackForm = document.getElementById("feedback-form");
  const languageSwitch = document.getElementById("language-switch");
  const languageLabel = document.getElementById("language-label");

  const translations = {
    en: {
      formTitle: "Feedback Form",
      formSubtitle: "We'd love to hear from you! Your feedback helps us improve the experience for everyone.",
      experienceQuestion: "How is your experience using the site?",
      notGreat: "Not great",
      okay: "Okay",
      good: "Good",
      great: "Great",
      problemsQuestion: "Did you experience any problems?",
      audioIssue: "Audio did not play",
      videoIssue: "The video didn’t load",
      transcriptionIssue: "The studio didn’t transcribe my voice correctly",
      languageSwitchIssue: "The language didn’t switch properly",
      confusingContent: "Something was confusing",
      other: "Other",
      problemDetailPlaceholder: "The video...",
      additionalFeedback: "Anything else you’d like to share?",
      additionalFeedbackPlaceholder: "It was hard to understand one of the quiz questions...",
      sendFeedback: "Send Feedback",
      thankYou: "We appreciate your time—thank you for helping us improve!",
      alertMessage: "Thank you for your feedback!"
    },
    es: {
      formTitle: "Formulario de Retroalimentación",
      formSubtitle: "¡Nos encantaría saber de ti! Tus comentarios nos ayudan a mejorar la experiencia para todos.",
      experienceQuestion: "¿Cómo ha sido tu experiencia usando el sitio?",
      notGreat: "No muy buena",
      okay: "Aceptable",
      good: "Buena",
      great: "Excelente",
      problemsQuestion: "¿Experimentaste algún problema?",
      audioIssue: "El audio no se reprodujo",
      videoIssue: "El video no se cargó",
      transcriptionIssue: "El estudio no transcribió mi voz correctamente",
      languageSwitchIssue: "El idioma no cambió correctamente",
      confusingContent: "Algo fue confuso",
      other: "Otro",
      problemDetailPlaceholder: "El video...",
      additionalFeedback: "¿Algo más que te gustaría compartir?",
      additionalFeedbackPlaceholder: "Fue difícil entender una de las preguntas del cuestionario...",
      sendFeedback: "Enviar Retroalimentación",
      thankYou: "¡Agradecemos tu tiempo! Gracias por ayudarnos a mejorar.",
      alertMessage: "¡Gracias por tu retroalimentación!"
    }
  };

  let currentLang = "en";

  const updateLanguage = () => {
    const lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (translations[lang][key]) {
        el.placeholder = translations[lang][key];
      }
    });
    languageLabel.textContent = lang.toUpperCase();
  };

  feedbackBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });

  feedbackForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const experience = feedbackForm.experience.value;
    const problems = Array.from(feedbackForm.querySelectorAll("input[name='problem']:checked")).map(cb => cb.value);
    const problemDetail = feedbackForm["problem-detail"].value;
    const additional = feedbackForm["additional-feedback"].value;

    const data = {
      experience,
      problems,
      problemDetail,
      additional
    };

    console.log("Feedback submitted:", data);
    alert(translations[currentLang].alertMessage);
    feedbackForm.reset();
    modal.classList.add("hidden");
  });

  languageSwitch.addEventListener("change", () => {
    currentLang = languageSwitch.checked ? "es" : "en";
    updateLanguage();
  });

  // Initialize with default language
  updateLanguage();
});
