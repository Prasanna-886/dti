/* =============================================
   navigation.js – Route & Navigation Logic
   AccessNav – అందరికీ దారి
   ============================================= */

'use strict';

const Navigation = (() => {
  let currentMode     = null;
  let currentSteps    = [];
  let currentStepIdx  = 0;
  let destination     = null;
  let userLocation    = { lat: 17.385, lng: 78.486, name: 'మీ current location' };
  let isNavigating    = false;

  // ── Geolocation ─────────────────────────────────────────────────────────────
  function detectLocation() {
    const textEl = document.getElementById('current-location-text');
    const input  = document.getElementById('from-input');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation.lat = pos.coords.latitude;
          userLocation.lng = pos.coords.longitude;
          // Reverse geocode simulation
          const locationName = simulateReverseGeocode(pos.coords.latitude, pos.coords.longitude);
          userLocation.name = locationName;
          if (textEl) textEl.textContent = `📍 ${locationName}`;
          if (input)  input.value = locationName;
          announceCurrentLocation(locationName);
        },
        (err) => {
          const fallback = 'Hyderabad, Near Charminar';
          if (textEl) textEl.textContent = `📍 ${fallback}`;
          if (input)  input.value = fallback;
          userLocation.name = fallback;
          announceCurrentLocation(fallback);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      const fallback = 'Hyderabad City Centre';
      if (textEl) textEl.textContent = `📍 ${fallback}`;
      if (input)  input.value = fallback;
    }
  }

  function simulateReverseGeocode(lat, lng) {
    // Simulated place names based on rough coordinates
    if (lat > 17.4 && lng > 78.5) return 'Secunderabad, Station Road';
    if (lat > 17.4) return 'Begumpet, Near Airport';
    if (lng > 78.5) return 'LB Nagar, Ring Road';
    return 'Hyderabad, Charminar Area';
  }

  // ── Destination Suggestions ──────────────────────────────────────────────────
  function getSuggestions(query) {
    const q = query.toLowerCase();
    return PLACES.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.nameTe.includes(q) ||
      p.id.includes(q)
    ).slice(0, 5);
  }

  // ── Start Navigation ─────────────────────────────────────────────────────────
  function start(destId, modeId) {
    destination    = destId;
    currentMode    = modeId;
    currentSteps   = getRouteSteps(modeId, destId);
    currentStepIdx = 0;
    isNavigating   = true;

    const mode = MODES[modeId];
    const dest = PLACES.find(p => p.id === destId);

    // Draw route on map
    drawRoute(destId);

    // Show obstacles if mobility mode
    showObstacles(modeId === 'mobility');

    // Mode-specific UI
    if (modeId === 'cognitive') {
      showCognitivePanel();
    } else {
      showStepsPanel(mode, dest);
    }

    // Announce start
    if (mode.audioDefault || AppState.audioEnabled) {
      const startMsg = `Navigation start. ${dest?.nameTe || dest?.name} వైపు route: ${currentSteps.length} steps.`;
      VoiceOutput.speak(startMsg, { lang: 'te-IN' });
    }

    // First step
    setTimeout(() => advanceToStep(0), 1500);
  }

  // ── Step Management ──────────────────────────────────────────────────────────
  function advanceToStep(idx) {
    if (idx >= currentSteps.length) { finishNavigation(); return; }
    currentStepIdx = idx;
    const step = currentSteps[idx];

    // Update steps list highlight
    updateStepHighlight(idx);

    // Mode-specific step handling
    switch (currentMode) {
      case 'visual':
        if (AppState.audioEnabled) {
          announceStep(step.audioText || step.text, '');
        }
        break;

      case 'mobility':
        if (AppState.audioEnabled) {
          announceStep(step.audioText || step.text);
        }
        // Show obstacle info
        if (step.action === 'ramp_avoid') {
          showVisualAlert('♿ Alternate route – Ramp/Step avoid చేసాము', 3000);
        }
        break;

      case 'hearing':
        // No audio – only visual alerts
        if (step.visualAlert) showVisualAlert(step.visualAlert, 3000);
        if (step.flashColor)  flashBorder(step.flashColor);
        break;

      case 'cognitive':
        updateCognitivePanel(step, idx, currentSteps.length);
        if (AppState.audioEnabled) {
          announceStep(step.audioText || step.text);
        }
        break;
    }

    // Move user pin on map toward destination
    animateUserPin(idx, currentSteps.length);
  }

  function nextStep() {
    advanceToStep(currentStepIdx + 1);
  }

  function repeatCurrentStep() {
    advanceToStep(currentStepIdx);
  }

  function finishNavigation() {
    isNavigating = false;
    const dest = PLACES.find(p => p.id === destination);
    const msg = `మీరు ${dest?.nameTe || 'destination'} సురక్షితంగా చేరుకున్నారు! అభినందనలు!`;

    if (currentMode === 'hearing') {
      showVisualAlert('🎉 Destination చేరుకున్నారు! Congratulations!', 5000);
    } else {
      VoiceOutput.speak(msg, { lang: 'te-IN' });
    }
    if (currentMode === 'cognitive') {
      const icon = document.getElementById('cog-icon');
      const text = document.getElementById('cog-text');
      if (icon) icon.textContent = '🎉';
      if (text) text.textContent = 'మీరు చేరుకున్నారు!';
    }
  }

  // ── Map Drawing ──────────────────────────────────────────────────────────────
  function drawRoute(destId) {
    const dest    = PLACES.find(p => p.id === destId);
    const path    = document.getElementById('route-path');
    const destPin = document.getElementById('dest-pin');
    if (!dest || !path) return;

    // Simple curved path from center (user) to destination
    const sx = 290, sy = 200;
    const ex = dest.x, ey = dest.y;
    const cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 40;
    path.setAttribute('d', `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`);
    path.style.opacity = '1';

    // Move destination pin
    if (destPin) {
      destPin.setAttribute('transform', `translate(${ex},${ey})`);
      destPin.style.opacity = '1';
    }
  }

  function animateUserPin(stepIdx, total) {
    const pin  = document.getElementById('user-pin');
    const dest = PLACES.find(p => p.id === destination);
    if (!pin || !dest) return;
    const progress = stepIdx / (total - 1);
    const sx = 290, sy = 200;
    const ex = dest.x, ey = dest.y;
    const x  = sx + (ex - sx) * progress;
    const y  = sy + (ey - sy) * progress;
    pin.style.transition = 'transform 0.8s ease';
    pin.setAttribute('transform', `translate(${x},${y})`);
  }

  // ── Steps Panel UI ───────────────────────────────────────────────────────────
  function showStepsPanel(mode, dest) {
    const panel    = document.getElementById('steps-panel');
    const title    = document.getElementById('steps-title');
    const infoBar  = document.getElementById('mode-info-bar');
    const listEl   = document.getElementById('steps-list');
    if (!panel) return;

    title.textContent   = `${mode.icon} ${dest?.nameTe || dest?.name} Navigation`;
    infoBar.textContent = getModeInfoBarText(currentMode);
    listEl.innerHTML    = '';

    currentSteps.forEach((step, i) => {
      const item = document.createElement('div');
      item.className = 'step-item';
      item.id = `step-${i}`;
      item.innerHTML = `
        <div class="step-num">${i + 1}</div>
        <div class="step-content">
          <div class="step-text">${step.text}</div>
          <div class="step-detail">${step.detail || ''}</div>
        </div>
        <div class="step-icon">${step.icon}</div>
      `;
      listEl.appendChild(item);
    });

    panel.classList.remove('hidden');
  }

  function showCognitivePanel() {
    const panel = document.getElementById('cognitive-panel');
    const steps = document.getElementById('steps-panel');
    if (panel) panel.classList.remove('hidden');
    if (steps) steps.classList.add('hidden');
  }

  function updateStepHighlight(idx) {
    currentSteps.forEach((_, i) => {
      const el = document.getElementById(`step-${i}`);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (i < idx)      el.classList.add('done');
      else if (i === idx) el.classList.add('active');
    });
    // Scroll active step into view
    const active = document.getElementById(`step-${idx}`);
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Flash border for hearing mode ─────────────────────────────────────────
  function flashBorder(color) {
    document.body.style.outline = `6px solid ${color}`;
    setTimeout(() => { document.body.style.outline = ''; }, 600);
  }

  // ── Close steps ───────────────────────────────────────────────────────────
  function closeNavigation() {
    isNavigating = false;
    const panel   = document.getElementById('steps-panel');
    const cogPane = document.getElementById('cognitive-panel');
    const path    = document.getElementById('route-path');
    const destPin = document.getElementById('dest-pin');
    const userPin = document.getElementById('user-pin');

    if (panel)   panel.classList.add('hidden');
    if (cogPane) cogPane.classList.add('hidden');
    if (path)    path.style.opacity = '0';
    if (destPin) destPin.style.opacity = '0';
    if (userPin) userPin.setAttribute('transform', 'translate(290,200)');

    showObstacles(false);
    VoiceOutput.stop();
  }

  return {
    detectLocation,
    getSuggestions,
    start,
    nextStep,
    repeatCurrentStep,
    closeNavigation,
    get isNavigating() { return isNavigating; },
    get currentMode()  { return currentMode; }
  };
})();