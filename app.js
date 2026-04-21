/* =============================================
   app.js – Main Application Controller
   AccessNav – అందరికీ దారి
   ============================================= */

'use strict';

// ── Global App State ──────────────────────────────────────────────────────────
const AppState = {
  mode:         null,    // 'visual' | 'mobility' | 'hearing' | 'cognitive'
  audioEnabled: false,
  initialized:  false
};

// ── Init: Auto-announce on page load ─────────────────────────────────────────
window.addEventListener('load', () => {
  // Small delay so browser is ready for speech
  setTimeout(() => {
    VoiceOutput.speak(
      'AccessNav కు స్వాగతం. మీరు ఏ సహాయం కావాలో చెప్పండి: Visual impairement, Mobility assistance, Hearing impairement, లేదా Cognitive assistance.',
      { lang: 'te-IN' }
    );
  }, 800);
});

// ── Mode Selection (from overlay) ────────────────────────────────────────────
function selectMode(modeId) {
  const mode = MODES[modeId];
  if (!mode) return;

  AppState.mode         = modeId;
  AppState.audioEnabled = mode.audioDefault;

  // Visual mode: always audio, skip audio banner
  if (modeId === 'visual') {
    AppState.audioEnabled = true;
    hideOverlay();
    launchApp(modeId);
    return;
  }

  // Hearing mode: never ask about audio (visual only)
  if (modeId === 'hearing') {
    AppState.audioEnabled = false;
    hideOverlay();
    launchApp(modeId);
    return;
  }

  // Other modes: show audio banner
  hideOverlay();
  showAudioBanner(modeId);
}

function hideOverlay() {
  const ov = document.getElementById('voice-overlay');
  if (ov) {
    ov.style.animation = 'none';
    ov.style.opacity   = '0';
    ov.style.transition = 'opacity 0.4s';
    setTimeout(() => ov.classList.remove('active'), 400);
  }
}

function showAudioBanner(modeId) {
  const banner = document.getElementById('audio-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.style.display = 'flex';
  }
  // Announce the question (if mode supports some audio)
  if (AppState.audioEnabled) {
    VoiceOutput.speak('Audio guidance కావాలా? ఆన్ లేదా వద్దు select చేయండి.', { lang: 'te-IN' });
  }

  // Store mode so banner buttons can use it
  banner.dataset.pendingMode = modeId;
}

function setAudio(enabled) {
  AppState.audioEnabled = enabled;
  VoiceOutput.setEnabled(enabled);

  const banner = document.getElementById('audio-banner');
  const modeId = banner?.dataset?.pendingMode || AppState.mode;

  // Visually mark selected button
  document.getElementById('audio-on-btn').style.background  = enabled ? 'var(--accent)' : 'rgba(255,255,255,0.18)';
  document.getElementById('audio-off-btn').style.background = !enabled ? '#e2564a' : 'rgba(255,255,255,0.18)';

  setTimeout(() => {
    if (banner) banner.classList.add('hidden');
    launchApp(modeId);
  }, 600);
}

// ── Launch main app ───────────────────────────────────────────────────────────
function launchApp(modeId) {
  const app = document.getElementById('main-app');
  if (app) app.classList.remove('hidden');

  AppState.mode = modeId;
  applyModeToBody(modeId);

  // Update mode badge
  const badge = document.getElementById('active-mode-badge');
  const mode  = MODES[modeId];
  if (badge && mode) badge.textContent = `${mode.icon} ${mode.label}`;

  // Update audio icon
  updateAudioIcon();

  // Detect location
  Navigation.detectLocation();

  // Show search suggestions
  populateSuggestions();

  // Announce mode welcome (visual or cognitive always speaks)
  if (AppState.audioEnabled) {
    setTimeout(() => {
      VoiceOutput.speak(mode.welcomeMsg, { lang: 'te-IN' });
    }, 500);
  }

  // Hearing mode: show visual welcome alert
  if (modeId === 'hearing') {
    setTimeout(() => {
      showVisualAlert('🔇 Hearing Mode Active – Visual alerts ON', 3000);
    }, 400);
  }

  AppState.initialized = true;
}

// ── Search & Suggestions ─────────────────────────────────────────────────────
function populateSuggestions() {
  updateSuggestions('');
}

function updateSuggestions(query) {
  const container = document.getElementById('search-suggestions');
  if (!container) return;
  const places = Navigation.getSuggestions(query || '');
  container.innerHTML = '';
  places.slice(0, 5).forEach(place => {
    const chip = document.createElement('button');
    chip.className = 'suggestion-chip';
    chip.textContent = `${place.icon} ${place.nameTe}`;
    chip.setAttribute('aria-label', `Navigate to ${place.nameTe}`);
    chip.onclick = () => selectDestination(place);
    container.appendChild(chip);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const toInput = document.getElementById('to-input');
  if (toInput) {
    toInput.addEventListener('input', (e) => updateSuggestions(e.target.value));
  }
});

function selectDestination(place) {
  const input = document.getElementById('to-input');
  if (input) input.value = `${place.icon} ${place.nameTe}`;
  // Store selected place id
  document.getElementById('to-input').dataset.placeId = place.id;
  if (AppState.audioEnabled) {
    VoiceOutput.speak(`Destination: ${place.nameTe} select చేయబడింది. Navigation start చేయండి.`, { lang: 'te-IN' });
  }
}

// ── Start Navigation ──────────────────────────────────────────────────────────
function startNavigation() {
  const toInput = document.getElementById('to-input');
  const placeId = toInput?.dataset?.placeId;

  if (!placeId) {
    // Try to match by text
    const text = toInput?.value?.toLowerCase() || '';
    const match = PLACES.find(p =>
      p.name.toLowerCase().includes(text) ||
      p.nameTe.includes(text) ||
      p.id.includes(text)
    );
    if (!match) {
      if (AppState.audioEnabled) {
        VoiceOutput.speak('Destination enter చేయండి లేదా voice తో చెప్పండి', { lang: 'te-IN' });
      }
      if (AppState.mode === 'hearing') {
        showVisualAlert('⚠️ Destination select చేయండి!', 3000);
      }
      return;
    }
    toInput.dataset.placeId = match.id;
    Navigation.start(match.id, AppState.mode);
  } else {
    Navigation.start(placeId, AppState.mode);
  }
}

// Navigation button actions
function nextStep() { Navigation.nextStep(); }
function repeatCurrentStep() { Navigation.repeatCurrentStep(); }
function closeSteps() { Navigation.closeNavigation(); }

// ── Audio toggle ──────────────────────────────────────────────────────────────
function toggleAudioGlobal() {
  if (AppState.mode === 'visual') {
    // Cannot disable audio in visual mode
    VoiceOutput.speak('Visual mode లో audio off చేయడం కుదరదు', { lang: 'te-IN' });
    return;
  }
  if (AppState.mode === 'hearing') {
    showVisualAlert('🔇 Audio not available in Hearing mode', 2000);
    return;
  }
  AppState.audioEnabled = !AppState.audioEnabled;
  VoiceOutput.setEnabled(AppState.audioEnabled);
  updateAudioIcon();
  if (AppState.audioEnabled) {
    VoiceOutput.speak('Audio on చేయబడింది', { lang: 'te-IN' });
  }
}

function updateAudioIcon() {
  const icon = document.getElementById('audio-icon');
  if (icon) icon.textContent = AppState.audioEnabled ? '🔊' : '🔇';
}

// ── Mode switch modal ─────────────────────────────────────────────────────────
function openModeSwitch() {
  const modal = document.getElementById('mode-switch-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    if (AppState.audioEnabled) {
      VoiceOutput.speak('Mode change చేయండి', { lang: 'te-IN' });
    }
  }
}

function closeModeSwitch() {
  const modal = document.getElementById('mode-switch-modal');
  if (modal) modal.classList.add('hidden');
}

function switchMode(modeId) {
  closeModeSwitch();
  Navigation.closeNavigation();
  AppState.mode         = modeId;
  AppState.audioEnabled = MODES[modeId]?.audioDefault || false;
  VoiceOutput.setEnabled(AppState.audioEnabled);
  applyModeToBody(modeId);

  const badge = document.getElementById('active-mode-badge');
  const mode  = MODES[modeId];
  if (badge && mode) badge.textContent = `${mode.icon} ${mode.label}`;
  updateAudioIcon();

  if (AppState.audioEnabled) {
    VoiceOutput.speak(`${mode.label} mode activate అయింది`, { lang: 'te-IN' });
  }
  if (modeId === 'hearing') {
    showVisualAlert(`🔇 ${mode.label} Mode Active`, 3000);
  }

  // Re-populate suggestions with new mode context
  populateSuggestions();
}

// ── Keyboard accessibility ────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModeSwitch();
    if (Navigation.isNavigating) Navigation.closeNavigation();
  }
  if (e.key === 'Enter' && document.activeElement?.id === 'to-input') {
    startNavigation();
  }
});

// Handle map click to set destination
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.getElementById('nav-map');
  if (svg) {
    svg.addEventListener('click', (e) => {
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 600;
      const y = ((e.clientY - rect.top) / rect.height) * 400;
      // Find nearest place
      let nearest = null, minDist = Infinity;
      PLACES.forEach(p => {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < minDist) { minDist = d; nearest = p; }
      });
      if (nearest && minDist < 80) {
        selectDestination(nearest);
      }
    });
  }
});