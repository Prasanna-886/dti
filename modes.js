/* =============================================
   modes.js – Accessibility Mode Configurations
   AccessNav – అందరికీ దారి
   ============================================= */

'use strict';

// ── Mode Definitions ──────────────────────────────────────────────────────────
const MODES = {
  visual: {
    id: 'visual',
    label: 'Visually Impaired',
    icon: '👁️',
    bodyClass: 'mode-visual',
    audioDefault: true,       // audio always on
    audioOptional: false,     // cannot turn off audio (primary interface)
    routeType: 'audio_guided',
    description: 'Audio navigation – మీకు అన్నీ voice లో చెప్తాము',
    welcomeMsg: 'Visually Impaired mode activate అయింది. మీ location తెలుసుకుంటున్నాము. దయచేసి destination చెప్పండి.',
    stepHints: {
      obstacle: 'జాగ్రత్త! ముందు obstacle ఉంది',
      turn: 'ఇప్పుడు turn తీసుకోండి',
      arrive: 'మీరు destination చేరుకున్నారు'
    }
  },

  mobility: {
    id: 'mobility',
    label: 'Mobility Assistance',
    icon: '♿',
    bodyClass: 'mode-mobility',
    audioDefault: false,
    audioOptional: true,
    routeType: 'obstacle_free',
    description: 'Obstacle-free route – రాంప్స్, steps లేని దారి',
    welcomeMsg: 'Mobility Assistance mode. మీకు ఎక్కువ obstacles లేకుండా route plan చేస్తాము.',
    stepHints: {
      ramp: '⚠️ ముందు ramp ఉంది – alternate route తీసుకున్నాము',
      step: '⚠️ Steps avoid చేసాము',
      clear: '✅ Clear path',
      elevator: '🛗 Elevator ఉంది ఇక్కడ'
    }
  },

  hearing: {
    id: 'hearing',
    label: 'Hearing Impaired',
    icon: '🔇',
    bodyClass: 'mode-hearing',
    audioDefault: false,
    audioOptional: false,     // visual alerts primary
    routeType: 'safe_visual',
    description: 'Visual alerts తో safe navigation',
    welcomeMsg: 'Hearing Impaired mode activate అయింది. అన్ని alerts screen మీద కనిపిస్తాయి.',
    stepHints: {
      traffic: '🚦 Traffic signal – ఆగండి',
      cross: '🚶 ఇప్పుడు దాటవచ్చు',
      hazard: '⚠️ Hazard ahead – జాగ్రత్త'
    }
  },

  cognitive: {
    id: 'cognitive',
    label: 'Cognitive Assistance',
    icon: '🧠',
    bodyClass: 'mode-cognitive',
    audioDefault: true,
    audioOptional: true,
    routeType: 'simple_steps',
    description: 'Simple, clear step-by-step guidance',
    welcomeMsg: 'Cognitive Assistance mode. మీకు చాలా simple గా, ఒక్కో step చెప్తాము.',
    stepHints: {
      landmark: '🏛️ ఈ building దగ్గర turn చేయండి',
      color: '🟢 Green signal వచ్చినప్పుడు వెళ్ళండి',
      rest: '🪑 Rest area ఉంది ఇక్కడ'
    }
  }
};

// ── Route Data (simulated) ────────────────────────────────────────────────────
const PLACES = [
  { id: 'hospital',  name: 'Hospital',    nameTe: 'ఆసుపత్రి',     x: 50,  y: 100, icon: '🏥' },
  { id: 'mall',      name: 'City Mall',   nameTe: 'సిటీ మాల్',    x: 195, y: 95,  icon: '🏬' },
  { id: 'school',    name: 'School',      nameTe: 'పాఠశాల',       x: 375, y: 85,  icon: '🏫' },
  { id: 'park',      name: 'Park',        nameTe: 'పార్కు',       x: 500, y: 100, icon: '🌳' },
  { id: 'bank',      name: 'Bank',        nameTe: 'బ్యాంకు',      x: 50,  y: 270, icon: '🏦' },
  { id: 'library',   name: 'Library',     nameTe: 'గ్రంథాలయం',   x: 385, y: 272, icon: '📚' },
  { id: 'busstand',  name: 'Bus Stand',   nameTe: 'బస్ స్టాండ్',  x: 505, y: 272, icon: '🚌' }
];

// ── Mode-specific route steps ─────────────────────────────────────────────────
function getRouteSteps(mode, destination) {
  const dest = PLACES.find(p => p.id === destination) || PLACES[1];

  const base = [
    { icon: '📍', text: `మీ current position నుండి బయలుదేరండి`, detail: 'Start point', action: 'start' },
    { icon: '➡️', text: `Main road కి వెళ్ళండి`, detail: '50 meters straight', action: 'move' },
    { icon: '↩️', text: `Left turn తీసుకోండి`, detail: 'At the signal', action: 'turn' },
    { icon: '🚶', text: `200 meters నడవండి`, detail: 'Along the footpath', action: 'move' },
    { icon: '↪️', text: `Right turn తీసుకోండి`, detail: `${dest.nameTe} వైపు`, action: 'turn' },
    { icon: `${dest.icon}`, text: `మీరు ${dest.nameTe} చేరుకున్నారు!`, detail: 'Destination reached', action: 'arrive' }
  ];

  switch (mode) {
    case 'visual':
      return base.map(s => ({
        ...s,
        audioText: buildAudioText_visual(s, dest)
      }));

    case 'mobility':
      return buildMobilitySteps(base, dest);

    case 'hearing':
      return buildHearingSteps(base, dest);

    case 'cognitive':
      return buildCognitiveSteps(dest);

    default:
      return base;
  }
}

function buildAudioText_visual(step, dest) {
  const extras = {
    start:  `జాగ్రత్తగా మీ చుట్టూ చూడండి. Footpath మీద నడవండి.`,
    move:   `నేరుగా నడవండి. తలుపు తెరుచుకోవడానికి చేయి చాపండి.`,
    turn:   `Turn తీసుకోవడానికి ముందు ఆగండి, traffic sound వినండి.`,
    arrive: `మీరు ${dest.nameTe} చేరుకున్నారు. ప్రవేశ ద్వారం ముందు ఉంది.`
  };
  return `${step.text}. ${extras[step.action] || ''}`;
}

function buildMobilitySteps(base, dest) {
  // Insert alternate route avoiding obstacles
  const steps = [...base];
  // Replace turn step with ramp-free route
  steps[2] = {
    icon: '♿',
    text: `Ramp ఉన్న దారి avoid చేసి, flat route తీసుకున్నాము`,
    detail: 'Obstacle-free path selected',
    action: 'ramp_avoid',
    audioText: `Steps మరియు ramps avoid చేసాము. Smooth path మీద వెళ్ళండి.`
  };
  steps.splice(4, 0, {
    icon: '🛗',
    text: `Elevator లభ్యమవుతుంది – దాన్ని use చేయండి`,
    detail: 'Level change via elevator',
    action: 'elevator',
    audioText: `ఎత్తైన భాగానికి వెళ్ళడానికి elevator ఉంది.`
  });
  return steps;
}

function buildHearingSteps(base, dest) {
  return base.map(s => ({
    ...s,
    visualAlert: getHearingVisualAlert(s.action),
    flashColor:  s.action === 'turn' ? '#ff8c42' : s.action === 'arrive' ? '#00c896' : null
  }));
}

function getHearingVisualAlert(action) {
  const alerts = {
    start:      '🟢 బయలుదేరండి – Start!',
    move:       '➡️ నేరుగా వెళ్ళండి',
    turn:       '⚠️ Turn ఇక్కడ చేయండి!',
    ramp_avoid: '♿ Smooth route',
    arrive:     '🏁 Destination చేరుకున్నారు!'
  };
  return alerts[action] || '🔵 కొనసాగండి';
}

function buildCognitiveSteps(dest) {
  // Very simple, icon-heavy, landmark-based
  return [
    { icon: '🏠', text: 'ఇంటి నుండి బయటకు వెళ్ళండి',          detail: 'Step 1 of 5', action: 'start', audioText: 'మీ ఇంటి తలుపు తెరవండి, బయటకు వెళ్ళండి.' },
    { icon: '🌳', text: 'పెద్ద చెట్టు వరకు నడవండి',            detail: 'Landmark: Big tree', action: 'move', audioText: 'రోడ్ మీద పెద్ద చెట్టు కనిపించే వరకు నేరుగా నడవండి.' },
    { icon: '🔴', text: 'ఎర్ర signal వద్ద ఆగండి',             detail: 'Wait for green', action: 'wait', audioText: 'ఎర్రటి signal light వద్ద ఆగండి. Green అయినప్పుడు మాత్రమే వెళ్ళండి.' },
    { icon: '🟢', text: 'Green అయినప్పుడు దాటండి',            detail: 'Cross road safely', action: 'cross', audioText: 'Signal ఆకుపచ్చ అయింది. జాగ్రత్తగా రోడ్ దాటండి.' },
    { icon: `${dest.icon}`, text: `${dest.nameTe} కనిపిస్తుంది`, detail: 'Almost there!', action: 'near', audioText: `${dest.nameTe} మీ ముందు కనిపిస్తుంది. లోపలికి వెళ్ళండి.` },
    { icon: '🎉', text: 'మీరు చేరుకున్నారు!',                  detail: 'You made it!', action: 'arrive', audioText: 'అభినందనలు! మీరు సురక్షితంగా చేరుకున్నారు.' }
  ];
}

// ── Mode UI helpers ───────────────────────────────────────────────────────────
function applyModeToBody(modeId) {
  // Remove existing mode classes
  document.body.classList.remove(...Object.values(MODES).map(m => m.bodyClass));
  const mode = MODES[modeId];
  if (mode) document.body.classList.add(mode.bodyClass);
}

function getModeInfoBarText(modeId) {
  const texts = {
    visual:    '👁️ Audio navigation active – అన్నీ voice లో వినవచ్చు',
    mobility:  '♿ Obstacle-free route – steps / ramps avoid చేసాము',
    hearing:   '🔇 Visual alerts active – screen మీద అన్ని notifications',
    cognitive: '🧠 Simple guidance mode – ఒక్కో step clearly చెప్తాము'
  };
  return texts[modeId] || '';
}

function showObstacles(show) {
  const g = document.getElementById('obstacle-group');
  if (g) g.classList.toggle('hidden', !show);
}

// Show big visual alert (hearing mode)
let alertTimeout = null;
function showVisualAlert(text, duration = 3000) {
  const el = document.getElementById('visual-alert');
  const textEl = document.getElementById('visual-alert-text');
  if (!el || !textEl) return;
  textEl.textContent = text;
  el.classList.remove('hidden');
  document.body.classList.add('hearing-alert');
  setTimeout(() => document.body.classList.remove('hearing-alert'), 500);
  if (alertTimeout) clearTimeout(alertTimeout);
  alertTimeout = setTimeout(() => el.classList.add('hidden'), duration);
}

// Update cognitive panel
function updateCognitivePanel(step, stepIndex, totalSteps) {
  const panel = document.getElementById('cognitive-panel');
  const icon  = document.getElementById('cog-icon');
  const text  = document.getElementById('cog-text');
  const prog  = document.getElementById('cog-progress');
  if (!panel) return;

  icon.textContent = step.icon;
  text.textContent = step.text;

  // Progress dots
  prog.innerHTML = '';
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement('div');
    dot.className = 'cog-dot' +
      (i < stepIndex ? ' done' : i === stepIndex ? ' active' : '');
    prog.appendChild(dot);
  }
}