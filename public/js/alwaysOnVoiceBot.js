/**
 * alwaysOnVoiceBot.js
 * Click-to-activate voice assistant for BookShelf Library System
 * Triggered by clicking any element with class "va-btn" or id "voiceBotBtn"
 */
(function () {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  if (!SpeechRecognition) {
    console.warn('[VoiceBot] SpeechRecognition not supported in this browser.');
    return;
  }

  let recognition = null;
  let isListening = false;

  // ── UI indicator (bottom-left) ────────────────────────────────────────────
  const indicator = document.createElement('div');
  indicator.id = 'voiceBotIndicator';
  indicator.style.cssText = `
    position:fixed; bottom:24px; left:24px; z-index:9990;
    display:none; align-items:center; gap:8px;
    background:rgba(26,26,46,0.92); backdrop-filter:blur(8px);
    border:1px solid rgba(255,255,255,0.12); border-radius:50px;
    padding:8px 16px 8px 12px; font-size:0.78rem; font-weight:600;
    color:rgba(255,255,255,0.85); box-shadow:0 4px 20px rgba(0,0,0,0.35);
    transition:all 0.3s;
  `;
  indicator.innerHTML = `
    <div id="vbi-dot" style="width:10px;height:10px;border-radius:50%;background:#43e97b;flex-shrink:0;animation:vbPulse 1.2s infinite;"></div>
    <span id="vbi-label">🎤 Listening...</span>
  `;
  document.body.appendChild(indicator);

  const vbiLabel = document.getElementById('vbi-label');

  const style = document.createElement('style');
  style.textContent = `@keyframes vbPulse{0%,100%{opacity:1}50%{opacity:0.35}}`;
  document.head.appendChild(style);

  function showIndicator(text) {
    vbiLabel.textContent = text;
    indicator.style.display = 'flex';
  }
  function hideIndicator() {
    indicator.style.display = 'none';
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  function speak(text, onEnd) {
    if (!synth) { if (onEnd) onEnd(); return; }
    synth.cancel();
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'en-US';
    utt.rate = 1.0;
    utt.pitch = 1.05;
    utt.onstart = () => {
      showIndicator('🔊 Speaking...');
      const stopBtn = document.getElementById('voiceStopBtn');
      if (stopBtn) stopBtn.style.display = 'flex';
    };
    utt.onend = () => {
      hideIndicator();
      const stopBtn = document.getElementById('voiceStopBtn');
      if (stopBtn) stopBtn.style.display = 'none';
      if (onEnd) onEnd();
    };
    utt.onerror = () => {
      hideIndicator();
      const stopBtn = document.getElementById('voiceStopBtn');
      if (stopBtn) stopBtn.style.display = 'none';
      if (onEnd) onEnd();
    };
    synth.speak(utt);
  }

  // ── Voice search API ──────────────────────────────────────────────────────
  async function voiceSearch(query) {
    showIndicator('⏳ Searching...');
    try {
      const res = await fetch('/api/voice-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      speak(data.message, () => {
        if (data.url) setTimeout(() => { window.location.href = data.url; }, 600);
      });
    } catch (e) {
      speak("Sorry, I couldn't reach the library server.");
    }
  }

  // ── Mark attendance via voice ────────────────────────────────────────────
  function markAttendanceVoice() {
    speak("Marking your attendance. Please wait.");
    showIndicator('⏳ Marking attendance...');
    fetch('/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via: 'voice' })
    })
      .then(r => r.json())
      .then(data => speak(data.message))
      .catch(() => speak("Sorry, I could not connect to the server."));
  }

  // ── Chatbot API fallback ──────────────────────────────────────────────────
  async function askChatbot(message) {
    showIndicator('⏳ Thinking...');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      speak(data.reply || "I'm not sure about that.", () => {
        if (data.action === 'redirect' && data.url) {
          setTimeout(() => { window.location.href = data.url; }, 600);
        }
      });
    } catch (e) {
      speak("Sorry, something went wrong.");
    }
  }

  // ── Command processor ─────────────────────────────────────────────────────
  function processCommand(transcript) {
    const cmd = transcript.toLowerCase().trim();

    // Availability check
    const availPatterns = [
      /^is (.+?) available/i,
      /^do you have (.+)/i,
      /^check (?:availability of )?(.+)/i,
      /^how many copies of (.+)/i,
      /^(.+?) available\??$/i,
    ];
    for (const p of availPatterns) {
      const m = transcript.match(p);
      if (m) { voiceSearch(m[1].trim()); return; }
    }

    // Search / find
    const searchPatterns = [
      /^search (?:for )?(.+)/i,
      /^find (?:me )?(.+)/i,
      /^show (?:me )?(.+?) books?/i,
      /^books? (?:about|on) (.+)/i,
      /^look(?:ing)? for (.+)/i,
    ];
    for (const p of searchPatterns) {
      const m = transcript.match(p);
      if (m) {
        const q = m[1].trim();
        speak(`Searching for ${q}`, () => {
          window.location.href = `/listings?search=${encodeURIComponent(q)}`;
        });
        return;
      }
    }

    // Quick navigation
    const navMap = [
      { p: /\b(home|main page|go home|open home)\b/i,                        url: '/',                       label: 'Home' },
      { p: /\b(all books|catalog|browse|open books|book list)\b/i,            url: '/listings',               label: 'Book Catalog' },
      { p: /\b(trending|popular books|hot books)\b/i,                         url: '/listings?sort=trending', label: 'Trending Books' },
      { p: /\b(e.?books?|digital books?|open ebooks?)\b/i,                    url: '/ebooks',                 label: 'E-Books' },
      { p: /\b(my books?|borrowed books?|current borrow)\b/i,                 url: '/borrow/current',         label: 'My Books' },
      { p: /\b(borrow history|my history|past borrow)\b/i,                    url: '/borrow/history',         label: 'Borrow History' },
      { p: /\b(research|papers?|journals?|open research)\b/i,                 url: '/research',               label: 'Research Papers' },
      { p: /\b(blogs?|articles?|open blog)\b/i,                               url: '/blogs',                  label: 'Blogs' },
      { p: /\b(recommend|for me|suggestions?|open recommend)\b/i,             url: '/recommendations',        label: 'Recommendations' },
      { p: /\b(profile|my account|my profile|open profile)\b/i,               url: '/profile',                label: 'Profile' },
      { p: /\b(notifications?|alerts?|open notification)\b/i,                 url: '/notifications',          label: 'Notifications' },
      { p: /\b(dashboard|admin|admin panel|open dashboard)\b/i,               url: '/admin/dashboard',        label: 'Dashboard' },
      { p: /\b(login|sign in|log in|open login|go to login)\b/i,              url: '/login',                  label: 'Login' },
      { p: /\b(signup|sign up|register|create account|open signup)\b/i,       url: '/signup',                 label: 'Sign Up' },
      { p: /\b(logout|sign out|log out)\b/i,                                  url: '/logout',                 label: 'Logout' },
      { p: /\b(reservations?|my reservations?)\b/i,                           url: '/reservations',           label: 'Reservations' },
      { p: /\b(qr|qr scanner|scanner)\b/i,                                    url: '/qr/scanner',             label: 'QR Scanner' },
    ];

    // ── Attendance voice command ──────────────────────────────────────────
    if (/\b(mark.*attendance|attendance.*mark|mark.*present|i am.*present|check.*in|check in)\b/i.test(cmd)) {
      markAttendanceVoice();
      return;
    }
    for (const n of navMap) {
      if (n.p.test(cmd)) {
        speak(`Opening ${n.label}`, () => { window.location.href = n.url; });
        return;
      }
    }

    // Fallback → chatbot
    askChatbot(transcript);
  }

  // ── Start / stop recognition ──────────────────────────────────────────────
  function startListening() {
    if (isListening) {
      recognition && recognition.stop();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      showIndicator('🎤 Listening...');
      updateBtns(true);
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      processCommand(transcript);
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        speak("Microphone access was denied. Please allow microphone permission.");
      }
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };

    try {
      recognition.start();
    } catch (e) {
      stopListening();
    }
  }

  function stopListening() {
    isListening = false;
    updateBtns(false);
    // hideIndicator only if not speaking
    if (!synth || !synth.speaking) hideIndicator();
  }

  // ── Update all mic buttons ────────────────────────────────────────────────
  function updateBtns(listening) {
    document.querySelectorAll('.va-btn, #voiceBotBtn').forEach(btn => {
      btn.classList.toggle('va-listening', listening);
      const icon = btn.querySelector('i');
      if (icon) icon.className = listening ? 'fa-solid fa-stop' : 'fa-solid fa-microphone';
      btn.title = listening ? 'Stop listening' : 'Voice Assistant';
    });
  }

  // ── Attach click handlers after DOM ready ─────────────────────────────────
  function attachHandlers() {
    document.querySelectorAll('.va-btn, #voiceBotBtn').forEach(btn => {
      btn.addEventListener('click', startListening);
    });
  }

  // Expose for external use
  window.voiceBotStart = startListening;
  window.voiceBotSpeak = speak;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachHandlers);
  } else {
    attachHandlers();
  }
})();
