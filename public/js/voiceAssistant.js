/**
 * Voice Assistant
 * Speech recognition + TTS for the library system
 */
(function () {
    'use strict';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synth = window.speechSynthesis;
    let recognition = null;
    let isListening = false;

    // ── Text-to-Speech ────────────────────────────────────────────────────
    function speakResponse(text) {
        if (!synth) return;
        synth.cancel();
        // Strip HTML tags for speech
        const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const utt = new SpeechSynthesisUtterance(clean);
        utt.lang = "en-US";
        utt.rate = 1.0;
        utt.pitch = 1.0;
        synth.speak(utt);
    }

    // ── Toast notification ────────────────────────────────────────────────
    function showToast(msg, type = "info") {
        let el = document.getElementById("vaToast");
        if (!el) {
            el = document.createElement("div");
            el.id = "vaToast";
            el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 22px;border-radius:50px;color:#fff;font-weight:600;z-index:9999;font-size:0.88rem;box-shadow:0 4px 20px rgba(0,0,0,0.25);transition:opacity 0.3s;pointer-events:none;";
            document.body.appendChild(el);
        }
        const colors = { info: "linear-gradient(135deg,#4facfe,#00f2fe)", success: "linear-gradient(135deg,#43e97b,#38f9d7)", error: "linear-gradient(135deg,#f5576c,#f093fb)", warning: "linear-gradient(135deg,#feca57,#ff9f43)" };
        el.style.background = colors[type] || colors.info;
        el.textContent = msg;
        el.style.opacity = "1";
        el.style.display = "block";
        clearTimeout(el._timer);
        el._timer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => { el.style.display = "none"; }, 300); }, 3500);
    }

    // ── Send to chatbot API ───────────────────────────────────────────────
    async function sendToChatbot(text) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if (data.reply) speakResponse(data.reply);
            if (data.action === "redirect" && data.url) {
                showToast("🔗 Navigating...", "info");
                setTimeout(() => { window.location.href = data.url; }, 1200);
            }
            // Inject into chatbot UI if open
            const chatMessages = document.getElementById("chatMessages");
            if (chatMessages) {
                appendChatMessage("user", text);
                appendChatMessage("bot", data.reply || "...");
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (e) {
            speakResponse("Sorry, I couldn't connect to the library assistant.");
        }
    }

    // ── Process voice command ─────────────────────────────────────────────
    function processVoiceCommand(transcript) {
        const cmd = transcript.toLowerCase().trim();
        showToast(`🎤 "${transcript}"`, "info");

        // Direct navigation shortcuts (no chatbot round-trip needed)
        const quickNav = [
            { p: /go home|open home|home page/, url: "/", label: "Home" },
            { p: /open books|browse books|all books|catalog/, url: "/listings", label: "Book Catalog" },
            { p: /e.?books|digital books/, url: "/ebooks", label: "E-Books" },
            { p: /open login|sign in/, url: "/login", label: "Login" },
            { p: /open signup|register/, url: "/signup", label: "Sign Up" },
            { p: /logout|sign out/, url: "/logout", label: "Logout" },
            { p: /open blog|blogs/, url: "/blogs", label: "Blogs" },
            { p: /research|open research/, url: "/research", label: "Research" },
            { p: /my books|borrowed books/, url: "/borrow/current", label: "My Books" },
            { p: /borrow history/, url: "/borrow/history", label: "Borrow History" },
            { p: /add book|new book/, url: "/admin/books/new", label: "Add Book" },
            { p: /recommend|for me/, url: "/recommendations", label: "Recommendations" },
            { p: /my profile|open profile/, url: "/profile", label: "Profile" },
            { p: /notification/, url: "/notifications", label: "Notifications" },
            { p: /dashboard/, url: "/admin/dashboard", label: "Dashboard" },
            { p: /trending/, url: "/listings?sort=trending", label: "Trending Books" },
        ];

        for (const n of quickNav) {
            if (n.p.test(cmd)) {
                speakResponse(`Opening ${n.label}`);
                showToast(`🔗 Opening ${n.label}...`, "success");
                setTimeout(() => { window.location.href = n.url; }, 900);
                return;
            }
        }

        // Search command — extract query and redirect
        const searchPatterns = [
            /search (?:for )?(.+)/i,
            /find (?:me )?(.+)/i,
            /show (?:me )?(.+) books?/i,
            /books? (?:about|on) (.+)/i,
            /look(?:ing)? for (.+)/i,
        ];
        for (const p of searchPatterns) {
            const m = cmd.match(p);
            if (m) {
                const query = m[1].trim();
                speakResponse(`Searching for ${query}`);
                showToast(`🔍 Searching: "${query}"`, "success");
                setTimeout(() => { window.location.href = `/listings?search=${encodeURIComponent(query)}`; }, 900);
                return;
            }
        }

        // Availability check
        const availMatch = cmd.match(/is (.+?) available/i);
        if (availMatch) {
            sendToChatbot(`is ${availMatch[1]} available`);
            return;
        }

        // Everything else → send to chatbot
        sendToChatbot(transcript);
    }

    // ── Start / stop recognition ──────────────────────────────────────────
    function startVoiceRecognition() {
        if (!SpeechRecognition) {
            showToast("❌ Voice not supported in this browser", "error");
            return;
        }
        if (isListening) {
            recognition.stop();
            return;
        }
        recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            showToast("🎤 Listening... speak now", "info");
            updateVoiceBtn(true);
        };
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            processVoiceCommand(transcript);
        };
        recognition.onend = () => {
            isListening = false;
            updateVoiceBtn(false);
        };
        recognition.onerror = (e) => {
            isListening = false;
            updateVoiceBtn(false);
            if (e.error !== "no-speech") showToast("❌ Voice error: " + e.error, "error");
        };
        recognition.start();
    }

    function updateVoiceBtn(listening) {
        const btns = document.querySelectorAll(".va-btn");
        btns.forEach(btn => {
            btn.classList.toggle("va-listening", listening);
            btn.title = listening ? "Stop listening" : "Voice Assistant";
            const icon = btn.querySelector("i");
            if (icon) {
                icon.className = listening ? "fa-solid fa-stop" : "fa-solid fa-microphone";
            }
        });
    }

    // ── Chatbot UI helper ─────────────────────────────────────────────────
    function appendChatMessage(role, text) {
        const chatMessages = document.getElementById("chatMessages");
        if (!chatMessages) return;
        const div = document.createElement("div");
        div.className = `chat-msg chat-${role}`;
        div.innerHTML = text;
        chatMessages.appendChild(div);
    }

    // ── Expose globally ───────────────────────────────────────────────────
    window.startVoiceRecognition = startVoiceRecognition;
    window.speakResponse = speakResponse;
    window.processVoiceCommand = processVoiceCommand;

    // ── Auto-attach to any .va-btn ────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(".va-btn").forEach(btn => {
            btn.addEventListener("click", startVoiceRecognition);
        });
    });
})();
