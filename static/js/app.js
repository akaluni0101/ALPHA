const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

let currentAudioBlob = null;
let currentFileName = "";
let mediaRecorder = null;
let recordedChunks = [];
let recordInterval = null;
let recordStartTime = 0;
let testimonialIndex = 0;

function initWave() {
  const wave = $("#hero-wave");
  if (!wave) return;
  const heights = [18, 29, 45, 68, 36, 52, 84, 58, 31, 75, 48, 91, 41, 63, 28, 72, 53, 34, 81, 44, 26, 59, 88, 39, 67, 31, 77, 47, 25, 57, 73, 42, 64, 32, 80, 49];
  heights.forEach((height, index) => {
    const bar = document.createElement("span");
    bar.className = "wave-bar";
    bar.style.height = `${height}%`;
    bar.style.animationDelay = `${(index % 9) * -0.12}s`;
    wave.appendChild(bar);
  });
}

const viewSections = {
  home: ["home"],
  about: ["about", "why"],
  features: ["features"],
  process: ["process"],
  showcase: ["showcase"],
  testimonials: ["testimonials"],
  faq: ["faq"],
  contact: ["contact"],
  analyzer: ["analyzer"],
  pricing: ["pricing"]
};

function normalizeInternalLinks() {
  $$('a[href^="#"]').forEach(link => {
    const target = link.getAttribute("href").slice(1) || "home";
    const route = viewSections[target] ? target : Object.keys(viewSections).find(key => viewSections[key].includes(target)) || "home";
    link.href = `/?view=${route}`;
    link.dataset.route = route;
    link.addEventListener("click", event => {
      event.preventDefault();
      navigateToView(route);
    });
  });
}

function renderView(route, push = false) {
  const activeRoute = viewSections[route] ? route : "home";
  const visibleSections = viewSections[activeRoute];
  $$('main > section').forEach(section => {
    const shouldShow = visibleSections.includes(section.id) || (activeRoute === "home" && section.classList.contains("stats-strip"));
    section.classList.toggle("route-hidden", !shouldShow);
  });
  $("main").classList.remove("route-transition");
  void $("main").offsetWidth;
  $("main").classList.add("route-transition");
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === activeRoute));
  document.title = `GEARSENSE | ${activeRoute.charAt(0).toUpperCase() + activeRoute.slice(1)}`;
  document.documentElement.scrollTop = 0;
  if (push) history.pushState({ view: activeRoute }, "", `/?view=${activeRoute}`);
  $$("main > section:not(.route-hidden) .reveal").forEach(element => element.classList.add("visible"));
}

function navigateToView(route) {
  renderView(route, true);
  const nav = $("#primary-nav");
  nav.classList.remove("open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

function initNavigation() {
  const header = $("#site-header");
  const menuToggle = $("#menu-toggle");
  const nav = $("#primary-nav");
  const progress = $("#scroll-progress");

  const updateScrollState = () => {
    header.classList.toggle("scrolled", window.scrollY > 30);
    $("#back-top").classList.toggle("show", window.scrollY > 550);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${maxScroll ? (window.scrollY / maxScroll) * 100 : 0}%`;
  };
  window.addEventListener("scroll", updateScrollState, { passive: true });
  updateScrollState();

  menuToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });
  normalizeInternalLinks();
  const initialRoute = new URLSearchParams(window.location.search).get("view") || "home";
  renderView(initialRoute);
  window.addEventListener("popstate", () => renderView(new URLSearchParams(window.location.search).get("view") || "home"));
}

function initRevealAnimations() {
  const elements = $$(".reveal");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  elements.forEach(element => observer.observe(element));
}

function animateCounters() {
  $$(".counter").forEach(counter => {
    const target = Number(counter.dataset.target);
    const decimal = target % 1 !== 0;
    const duration = 1100;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = (target * eased).toFixed(decimal ? 1 : 0);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function initCounters() {
  const strip = $(".stats-strip");
  let ran = false;
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !ran) {
      ran = true;
      animateCounters();
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  observer.observe(strip);
}

function initPortfolio() {
  $$(".filter-button").forEach(button => button.addEventListener("click", () => {
    $$(".filter-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const filter = button.dataset.filter;
    $$(".project-card").forEach(card => {
      const match = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !match);
    });
  }));
}

function renderTestimonial(index) {
  const testimonials = $$(".testimonial");
  const dots = $$("#slider-dots button");
  testimonialIndex = (index + testimonials.length) % testimonials.length;
  testimonials.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === testimonialIndex));
  dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === testimonialIndex));
}

function initTestimonials() {
  $("#testimonial-prev").addEventListener("click", () => renderTestimonial(testimonialIndex - 1));
  $("#testimonial-next").addEventListener("click", () => renderTestimonial(testimonialIndex + 1));
  $$("#slider-dots button").forEach((dot, index) => dot.addEventListener("click", () => renderTestimonial(index)));
}

function initPricing() {
  const toggle = $("#billing-toggle");
  toggle.addEventListener("click", () => {
    const yearly = toggle.classList.toggle("yearly");
    $$(".monthly-price").forEach(price => {
      if (price.dataset.yearly) price.textContent = yearly ? price.dataset.yearly : price.textContent === price.dataset.yearly ? price.closest(".price-card").querySelector("h3").textContent === "Operate" ? "49" : "99" : price.textContent;
    });
  });
}

function initFaq() {
  const items = $$(".faq-list details");
  items.forEach(item => item.addEventListener("toggle", () => {
    if (!item.open) return;
    items.forEach(other => { if (other !== item) other.open = false; });
  }));
}

function setFieldError(input, message) {
  const error = input.parentElement.querySelector("small");
  input.classList.toggle("invalid", Boolean(message));
  if (error) error.textContent = message;
}

function initContactForm() {
  const form = $("#contact-form");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#contact-name");
    const email = $("#contact-email");
    const message = $("#contact-message");
    let valid = true;
    if (!name.value.trim()) { setFieldError(name, "Please add your name."); valid = false; } else setFieldError(name, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setFieldError(email, "Enter a valid email address."); valid = false; } else setFieldError(email, "");
    if (!message.value.trim()) { setFieldError(message, "Tell us a little about the signal."); valid = false; } else setFieldError(message, "");
    if (valid) {
      $("#form-success").classList.add("show");
      form.reset();
    }
  });
}

function initNewsletter() {
  $("#newsletter-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#newsletter-email");
    const message = $("#newsletter-message");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
      message.textContent = "Enter a valid email and we'll take it from there.";
      message.style.color = "#ffe0d5";
      return;
    }
    message.textContent = "You're on the list. Watch your inbox for the next signal note.";
    message.style.color = "#ffe9bb";
    input.value = "";
  });
}

function showAlert(message) {
  const alert = $("#alert-banner");
  alert.textContent = message;
  alert.style.display = "block";
}
function hideAlert() { $("#alert-banner").style.display = "none"; }

function setAudioFile(file) {
  currentAudioBlob = file;
  currentFileName = file.name || "browser_recording.webm";
  $("#selected-file-label").textContent = `Selected: ${currentFileName} · ${(file.size / 1024).toFixed(1)} KB`;
  $("#audio-player").src = URL.createObjectURL(file);
  $("#playback-container").style.display = "block";
  hideAlert();
}

function initAnalyzer() {
  const dropZone = $("#drop-zone");
  const fileInput = $("#file-input");
  dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", event => { event.preventDefault(); dropZone.classList.remove("dragover"); if (event.dataTransfer.files[0]) setAudioFile(event.dataTransfer.files[0]); });
  fileInput.addEventListener("change", event => { if (event.target.files[0]) setAudioFile(event.target.files[0]); });
  $("#btn-record").addEventListener("click", toggleRecording);
  $("#btn-submit").addEventListener("click", submitAnalysis);
}

async function toggleRecording() {
  const button = $("#btn-record");
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.stop();
    clearInterval(recordInterval);
    button.innerHTML = '<span>●</span> Record <small id="record-timer">00:00</small>';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => { if (event.data.size) recordedChunks.push(event.data); };
    mediaRecorder.onstop = () => {
      setAudioFile(new File([new Blob(recordedChunks)], "browser_recording.webm", { type: mediaRecorder.mimeType || "audio/webm" }));
      stream.getTracks().forEach(track => track.stop());
    };
    mediaRecorder.start();
    button.innerHTML = '<span>■</span> Stop <small id="record-timer">00:00</small>';
    recordStartTime = Date.now();
    recordInterval = setInterval(() => {
      const seconds = Math.floor((Date.now() - recordStartTime) / 1000);
      const timer = $("#record-timer");
      if (timer) timer.textContent = `00:${String(seconds).padStart(2, "0")}`;
      if (seconds >= 10) toggleRecording();
    }, 500);
  } catch (error) { showAlert(`Microphone unavailable: ${error.message}`); }
}

async function submitAnalysis() {
  if (!currentAudioBlob) { showAlert("Choose a recording or use the microphone before analyzing."); return; }
  const button = $("#btn-submit");
  button.disabled = true;
  button.innerHTML = "Analyzing signal <span>…</span>";
  hideAlert();
  const formData = new FormData();
  formData.append("file", currentAudioBlob, currentFileName);
  formData.append("machine_category", $("#machine-select").value);
  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(`[${data.error_code || "ERROR"}] ${data.detail || "Analysis failed."}`);
    renderAnalysis(data);
  } catch (error) { showAlert(error.message || "The analysis service is unavailable."); }
  finally { button.disabled = false; button.innerHTML = 'Analyze acoustic health <span>→</span>'; }
}

function renderAnalysis(data) {
  const result = $("#scan-result");
  const predicted = data.predicted_class || "uncertain";
  const normal = data.probabilities?.normal || 0;
  const irregular = data.probabilities?.irregular || data.probabilities?.abnormal || 0;
  $("#result-title").textContent = predicted.charAt(0).toUpperCase() + predicted.slice(1);
  $("#status-badge").textContent = predicted.toUpperCase();
  $("#status-badge").className = `result-badge status-${predicted}`;
  $("#res-summary").textContent = data.result_summary || "Readout complete.";
  $("#res-confidence").textContent = `${(data.confidence * 100).toFixed(1)}%`;
  $("#prob-normal-val").textContent = `${(normal * 100).toFixed(1)}%`;
  $("#prob-irregular-val").textContent = `${(irregular * 100).toFixed(1)}%`;
  $("#bar-normal").style.width = `${normal * 100}%`;
  $("#bar-irregular").style.width = `${irregular * 100}%`;
  let intelligence = $("#signal-intelligence");
  if (!intelligence) {
    intelligence = document.createElement("div");
    intelligence.id = "signal-intelligence";
    intelligence.className = "signal-intelligence";
    intelligence.innerHTML = `
      <div class="intelligence-card"><span class="mono">FAULT SIGNATURE</span><strong id="fault-label">—</strong><small id="fault-evidence">—</small><b id="fault-confidence">—</b></div>
      <div class="intelligence-card"><span class="mono">MACHINE FINGERPRINT</span><strong id="machine-type">—</strong><small id="machine-evidence">—</small><b id="machine-confidence">—</b></div>
    `;
    result.appendChild(intelligence);
  }
  const fault = data.fault_diagnostics || {};
  const fingerprint = data.machine_fingerprint || {};
  $("#fault-label").textContent = fault.label || "No specific fault signature";
  $("#fault-evidence").textContent = fault.evidence || "No evidence available";
  $("#fault-confidence").textContent = `${((fault.confidence || 0) * 100).toFixed(0)}% confidence`;
  $("#machine-type").textContent = (fingerprint.machine_type || "unknown").replaceAll("_", " ");
  $("#machine-evidence").textContent = fingerprint.evidence || "No fingerprint evidence available";
  $("#machine-confidence").textContent = `${((fingerprint.confidence || 0) * 100).toFixed(0)}% match`;
  let visualPanel = $("#analysis-visuals");
  if (!visualPanel) {
    visualPanel = document.createElement("div");
    visualPanel.id = "analysis-visuals";
    visualPanel.className = "analysis-visuals";
    visualPanel.innerHTML = `
      <div class="analysis-visual"><span class="mono">WAVEFORM / TIME DOMAIN</span><img id="result-waveform" alt="Audio waveform graph"></div>
      <div class="analysis-visual"><span class="mono">SPECTROGRAM / FREQUENCY</span><img id="result-spectrogram" alt="Audio frequency spectrogram"></div>
    `;
    result.appendChild(visualPanel);
  }
  $("#result-waveform").src = data.visualizations?.waveform_image || "";
  $("#result-spectrogram").src = data.visualizations?.spectrogram_image || "";
  result.style.display = "block";
}

function initFloatingTools() {
  $("#back-top").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const helpButton = $("#help-button");
  const popover = $("#help-popover");
  const chatbot = $("#chatbot");
  const openChat = () => { popover.classList.remove("show"); chatbot.classList.add("open"); chatbot.setAttribute("aria-hidden", "false"); $("#chatbot-input").focus(); };
  helpButton.addEventListener("click", () => popover.classList.toggle("show"));
  $("#open-chat").addEventListener("click", openChat);
  $("#close-chat").addEventListener("click", () => { chatbot.classList.remove("open"); chatbot.setAttribute("aria-hidden", "true"); });
  initChatbot();
}

const assistantKnowledge = [
  { terms: ["uncertain", "confidence", "threshold"], answer: "Uncertain means the signal sits between GEARSENSE's decision bands. A normal result requires at least 90% normal probability; a result at or below 65% is irregular. The range between them is uncertain, so a human inspection or another recording is recommended." },
  { terms: ["irregular", "abnormal", "fault", "failure"], answer: "Irregular means the acoustic profile does not meet the normal threshold. It can point to changes such as bearing flutter, cavitation, friction, or another pattern outside the learned profile. Treat it as an inspection signal, not a diagnosis of one exact part." },
  { terms: ["normal", "90", "ninety"], answer: "A result is Normal when the normal probability is at least 90%. The analyzer also shows the confidence and the Normal versus Irregular probability split." },
  { terms: ["record", "recording", "audio", "upload", "file", "sample"], answer: "Use a clear 1–10 second recording in WAV, MP3, WebM, OGG, or FLAC format. Keep the machine in its normal operating environment, avoid clipping, and capture close enough to hear the machine without covering the microphone." },
  { terms: ["machine", "fan", "pump", "valve", "slider", "category"], answer: "GEARSENSE currently supports Industrial Fan, Industrial Pump, Solenoid Valve, Slide Rail, and an Unspecified category. Choose the closest category before you analyze a clip." },
  { terms: ["graph", "waveform", "spectrogram", "visual", "chart"], answer: "After analysis, the result includes a time-domain waveform and a frequency spectrogram. The waveform shows amplitude changes over time; the spectrogram shows where energy appears across frequencies." },
  { terms: ["software", "ffmpeg", "troubleshoot", "diagnostic", "system"], answer: "The software diagnostics check the API, model artifacts, database, FFmpeg, and audio dependencies. If FFmpeg is unavailable, WebM or MP3 decoding may fail; WAV is a good fallback." },
  { terms: ["privacy", "store", "stored", "data", "audio"], answer: "The application processes the audio for analysis and stores the structured result rather than the raw recording. The local prototype keeps history in SQLite." },
  { terms: ["hello", "hi", "help", "what can", "who are"], answer: "I am the GEARSENSE signal guide. I can explain results, thresholds, recording tips, graphs, supported machines, troubleshooting, and privacy." }
];

function getAssistantAnswer(question) {
  const normalized = question.toLowerCase();
  let best = null;
  let score = 0;
  assistantKnowledge.forEach(item => {
    const itemScore = item.terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0);
    if (itemScore > score) { score = itemScore; best = item; }
  });
  return best?.answer || "I don't have enough product context to answer that confidently. Try asking about thresholds, recording tips, graphs, supported machines, software diagnostics, or privacy.";
}

function addChatMessage(text, role) {
  const messages = $("#chatbot-messages");
  const item = document.createElement("div");
  item.className = `chat-message ${role}`;
  item.innerHTML = `${role === "assistant" ? '<span class="message-avatar">∿</span>' : ""}<p></p>`;
  item.querySelector("p").textContent = text;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

function askAssistant(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addChatMessage(cleanQuestion, "user");
  window.setTimeout(() => addChatMessage(getAssistantAnswer(cleanQuestion), "assistant"), 220);
}

function initChatbot() {
  $("#chatbot-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#chatbot-input");
    askAssistant(input.value);
    input.value = "";
  });
  $$("#chat-suggestions button").forEach(button => button.addEventListener("click", () => askAssistant(button.dataset.question)));
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.innerHTML = document.body.innerHTML.replaceAll("ALPHA", "GEARSENSE");
  $$("a").forEach(link => {
    if (link.textContent.includes("Book a demo")) link.innerHTML = "Start with Operate <span>→</span>";
  });
  if (window.lucide) lucide.createIcons();
  initWave();
  initNavigation();
  initRevealAnimations();
  initCounters();
  initPortfolio();
  initTestimonials();
  initPricing();
  initFaq();
  initContactForm();
  initNewsletter();
  initAnalyzer();
  initFloatingTools();
});
