/* =============================================
   voice.js – Voice Input & Audio Output System
   AccessNav – అందరికీ దారి
   ============================================= */

'use strict';

// ── Speech Synthesis (Text-to-Speech) ──────────────────────────────────────
const VoiceOutput = (() => {
  let audioEnabled = true;
  let currentUtterance = null;

  function isSupported() {
    return 'speechSynthesis' in window;
  }

  function setEnabled(val) {
    audioEnabled = val;
    if (!val && currentUtterance) {
      window.speechSynthesis.cancel();
    }
  }

  function speak(text, options = {}) {
    if (!audioEnabled || !isSupported()) return;
    window.speechSynthesis.cancel(); // stop current
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang    = options.lang    || 'te-IN';  // Telugu default
    utter.rate    = options.rate    || 0.9;
    utter.pitch   = options.pitch   || 1.0;
    utter.volume  = options.volume  || 1.0;
    if (options.onEnd) utter.onend = options.onEnd;
    if (options.onError) utter.onerror = options.onError;
    currentUtterance = utter;
    // Small delay for reliability across browsers
    setTimeout(() => window.speechSynthesis.speak(utter), 100);
  }

  function speakEN(text, options = {}) {
    speak(text, { ...options, lang: 'en-IN' });
  }

  function stop() {
    if (isSupported()) window.speechSynthesis.cancel();
  }

  function repeat() {
    if (currentUtterance && isSupported()) {
      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(currentUtterance), 100);
    }
  }

  return { speak, speakEN, stop, repeat, setEnabled, isSupported };
})();


// ── Speech Recognition (Voice Input) ────────────────────────────────────────
const VoiceInput = (() => {
  let recognition = null;
  let isListening  = false;
  let rippleEl     = null;

  function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function createRipple() {
    if (rippleEl) return;
    rippleEl = document.createElement('div');
    rippleEl.className = 'listening-ripple';
    rippleEl.textContent = '🎙️';
    rippleEl.title = 'Listening…';
    rippleEl.onclick = stop;
    document.body.appendChild(rippleEl);
  }

  function removeRipple() {
    if (rippleEl) { rippleEl.remove(); rippleEl = null; }
  }

  function start({ lang = 'te-IN', onResult, onError, onEnd } = {}) {
    if (!isSupported()) {
      if (onError) onError('not-supported');
      return;
    }
    if (isListening) stop();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.lang        = lang;
    recognition.continuous  = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => { isListening = true; createRipple(); };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (e) => {
      isListening = false;
      removeRipple();
      if (onError) onError(e.error);
    };

    recognition.onend = () => {
      isListening = false;
      removeRipple();
      if (onEnd) onEnd();
    };

    try { recognition.start(); }
    catch (err) { console.warn('VoiceInput start error:', err); }
  }

  function stop() {
    if (recognition && isListening) {
      try { recognition.stop(); } catch (e) {}
    }
    isListening = false;
    removeRipple();
  }

  return { start, stop, isSupported, get isListening() { return isListening; } };
})();


// ── Mode Selection via Voice ─────────────────────────────────────────────────
function startVoiceSelection() {
  const btn = document.getElementById('voice-listen-btn');
  btn.innerHTML = '<span class="mic-icon">🎙️</span><span>వింటున్నాను...</span>';
  btn.style.background = 'linear-gradient(135deg,#c00030,#e2564a)';

  // First announce the available options
  VoiceOutput.speak(
    'మీ mode చెప్పండి: Visual impairement, Mobility assistance, Hearing impairement, లేదా Cognitive assistance',
    { lang: 'te-IN' }
  );

  VoiceInput.start({
    lang: 'te-IN',
    onResult: (text) => {
      btn.innerHTML = '<span class="mic-icon">🎙️</span><span>Voice తో చెప్పండి</span>';
      btn.style.background = '';
      const mode = detectModeFromSpeech(text.toLowerCase());
      if (mode) {
        VoiceOutput.speak(`${getModeLabel(mode)} mode select చేయబడింది`, { lang: 'te-IN' });
        setTimeout(() => selectMode(mode), 1200);
      } else {
        VoiceOutput.speak('అర్థం కాలేదు. దయచేసి మళ్ళీ చెప్పండి', { lang: 'te-IN' });
        document.getElementById('overlay-subtitle').textContent =
          `"${text}" – అర్థం కాలేదు. మళ్ళీ try చేయండి.`;
      }
    },
    onError: (err) => {
      btn.innerHTML = '<span class="mic-icon">🎙️</span><span>Voice తో చెప్పండి</span>';
      btn.style.background = '';
      const msg = err === 'not-supported'
        ? 'మీ browser voice support చేయడం లేదు, please button click చేయండి'
        : 'Voice వినలేకపోయాను, మళ్ళీ try చేయండి';
      VoiceOutput.speak(msg, { lang: 'te-IN' });
    },
    onEnd: () => {
      btn.innerHTML = '<span class="mic-icon">🎙️</span><span>Voice తో చెప్పండి</span>';
      btn.style.background = '';
    }
  });
}

function detectModeFromSpeech(text) {
  const maps = {
    visual:    ['visual', 'visually', 'కంటి', 'drishti', 'దృష్టి', 'blind', 'అంధ', 'vision'],
    mobility:  ['mobility', 'wheel', 'chair', 'కుర్చీ', 'నడక', 'walk', 'రోలర్', 'రోల్'],
    hearing:   ['hearing', 'hear', 'deaf', 'చెవి', 'వినికిడి', 'sound', 'మూగ'],
    cognitive: ['cognitive', 'brain', 'మెదడు', 'think', 'memory', 'recall', 'cognitive']
  };
  for (const [mode, keywords] of Object.entries(maps)) {
    if (keywords.some(k => text.includes(k))) return mode;
  }
  return null;
}

function getModeLabel(mode) {
  const labels = {
    visual:    'Visually Impaired',
    mobility:  'Mobility Assistance',
    hearing:   'Hearing Impaired',
    cognitive: 'Cognitive Assistance'
  };
  return labels[mode] || mode;
}

// Voice input for destination field
function voiceInputDestination() {
  VoiceOutput.speak('మీరు ఎక్కడికి వెళ్ళాలో చెప్పండి', { lang: 'te-IN' });
  VoiceInput.start({
    lang: 'te-IN',
    onResult: (text) => {
      const input = document.getElementById('to-input');
      input.value = text;
      input.dispatchEvent(new Event('input'));
      VoiceOutput.speak(`Destination: ${text}`, { lang: 'en-IN' });
      updateSuggestions(text);
    },
    onError: () => {
      VoiceOutput.speak('వినలేకపోయాను, మళ్ళీ try చేయండి', { lang: 'te-IN' });
    }
  });
}

// Announce current location
function announceCurrentLocation(locationText) {
  VoiceOutput.speak(`మీ current location: ${locationText}`, { lang: 'te-IN' });
}

// Announce a navigation step
function announceStep(stepText, modeExtra = '') {
  const full = modeExtra ? `${stepText}. ${modeExtra}` : stepText;
  VoiceOutput.speak(full, { lang: 'te-IN' });
}