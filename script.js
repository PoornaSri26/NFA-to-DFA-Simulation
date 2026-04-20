// Complete NFA to DFA Converter - All Phases

let currentNFA = null;
let currentDFA = null;
let currentView = 'nfa';
let exIdx = 0;

// Phase 3: Parse helpers
function parseCSV(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function parseNFA() {
  const states = parseCSV(document.getElementById('states').value);
  const alphabet = parseCSV(document.getElementById('alphabet').value);
  const start = document.getElementById('startState').value.trim();
  const accepts = parseCSV(document.getElementById('acceptStates').value);
  const transText = document.getElementById('transitions').value.trim();

  if (!states.length) throw new Error('States cannot be empty.');
  if (!alphabet.length) throw new Error('Alphabet cannot be empty.');
  if (!start) throw new Error('Start state is required.');
  if (!states.includes(start)) throw new Error(`Start state "${start}" not in states list.`);
  for (const a of accepts) {
    if (!states.includes(a)) throw new Error(`Accept state "${a}" not in states list.`);
  }

  // Build transition map: delta[state][symbol] = Set of next states
  const delta = {};
  for (const s of states) {
    delta[s] = {};
    for (const sym of [...alphabet, 'epsilon']) delta[s][sym] = new Set();
  }

  for (const line of transText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',');
    if (parts.length < 3) throw new Error(`Bad transition line: "${trimmed}" - need state,symbol,next1;next2`);
    const [fromRaw, symRaw, ...rest] = parts;
    const from = fromRaw.trim();
    const sym = symRaw.trim();
    const toStr = rest.join(',').trim();

    if (!states.includes(from)) throw new Error(`Unknown state "${from}" in transition.`);
    if (sym !== 'epsilon' && !alphabet.includes(sym)) throw new Error(`Symbol "${sym}" not in alphabet.`);
    if (!delta[from][sym]) delta[from][sym] = new Set();

    if (toStr && toStr !== 'empty') {
      for (const t of toStr.split(';').map(s => s.trim()).filter(Boolean)) {
        if (!states.includes(t)) throw new Error(`Unknown state "${t}" in transition.`);
        delta[from][sym].add(t);
      }
    }
  }

  return { states, alphabet, start, accepts: new Set(accepts), delta };
}

// Phase 3: Epsilon-closure
function epsilonClosure(states, delta) {
  const closure = new Set(states);
  const stack = [...states];
  while (stack.length) {
    const s = stack.pop();
    const eps = delta[s] && delta[s]['epsilon'] ? delta[s]['epsilon'] : new Set();
    for (const t of eps) {
      if (!closure.has(t)) { closure.add(t); stack.push(t); }
    }
  }
  return closure;
}

function move(states, symbol, delta) {
  const result = new Set();
  for (const s of states) {
    const nexts = delta[s] && delta[s][symbol] ? delta[s][symbol] : new Set();
    for (const t of nexts) result.add(t);
  }
  return result;
}

function setKey(s) {
  return [...s].sort().join(',') || 'empty';
}

// Phase 4: Subset construction
function nfaToDfa(nfa) {
  const { alphabet, start, accepts, delta } = nfa;
  const startClosure = epsilonClosure([start], delta);
  const startKey = setKey(startClosure);

  const dfaStates = new Map(); // key -> Set
  const dfaDelta = {};         // key -> {sym: key}
  const dfaAccepts = new Set();
  const queue = [startClosure];
  dfaStates.set(startKey, startClosure);

  while (queue.length) {
    const current = queue.shift();
    const currentKey = setKey(current);
    dfaDelta[currentKey] = {};

    // Check if accept
    for (const s of current) {
      if (accepts.has(s)) { dfaAccepts.add(currentKey); break; }
    }

    for (const sym of alphabet) {
      const moved = move(current, sym, delta);
      const closed = epsilonClosure([...moved], delta);
      const key = setKey(closed);
      dfaDelta[currentKey][sym] = key;
      if (!dfaStates.has(key)) {
        dfaStates.set(key, closed);
        queue.push(closed);
      }
    }
  }

  // Build friendly state names
  const nameMap = new Map();
  let idx = 0;
  // Start state gets D0
  nameMap.set(startKey, 'D' + idx++);
  for (const [k] of dfaStates) {
    if (!nameMap.has(k)) nameMap.set(k, 'D' + idx++);
  }

  const dfaStatesList = [...dfaStates.keys()].map(k => nameMap.get(k));
  const dfaDeltaNamed = {};
  for (const [k, trans] of Object.entries(dfaDelta)) {
    const name = nameMap.get(k);
    dfaDeltaNamed[name] = {};
    for (const [sym, toKey] of Object.entries(trans)) {
      dfaDeltaNamed[name][sym] = nameMap.get(toKey);
    }
  }
  const dfaAcceptsNamed = new Set([...dfaAccepts].map(k => nameMap.get(k)));

  // Build label map (DX -> {q0,q1,...})
  const labelMap = new Map();
  for (const [k, set] of dfaStates) {
    labelMap.set(nameMap.get(k), setKey(set) || 'empty');
  }

  return {
    states: dfaStatesList,
    alphabet,
    start: nameMap.get(startKey),
    accepts: dfaAcceptsNamed,
    delta: dfaDeltaNamed,
    labelMap,
    deadState: nameMap.get('empty') || null,
    startKey,
    nameMap,
    dfaStates
  };
}

// Phase 5: Render output panel
function renderOutput(nfa, dfa) {
  const out = document.getElementById('outputContent');
  out.innerHTML = '';
  out.className = 'dfa-result';

  const stats = document.createElement('div');
  stats.className = 'stats-row';
  stats.innerHTML = `
    <div class="stat-box"><div class="stat-num">${nfa.states.length}</div><div class="stat-label">NFA States</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--accent2)">${dfa.states.length}</div><div class="stat-label">DFA States</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--accent3)">${nfa.alphabet.length}</div><div class="stat-label">Symbols</div></div>
  `;
  out.appendChild(stats);

  function block(label, content) {
    const d = document.createElement('div');
    d.className = 'result-block';
    d.innerHTML = `<div class="result-block-label">${label}</div>${content}`;
    out.appendChild(d);
  }

  // DFA States
  const chips = dfa.states.map(s => {
    let cls = 'chip';
    const isStart = s === dfa.start;
    const isAccept = dfa.accepts.has(s);
    const isDead = s === dfa.deadState && dfa.labelMap.get(s) === 'empty';
    if (isDead) cls += ' dead';
    else if (isStart && isAccept) cls += ' both';
    else if (isStart) cls += ' start';
    else if (isAccept) cls += ' accept';
    const title = dfa.labelMap.get(s);
    return `<span class="${cls}" title="{${title}}">${s}</span>`;
  }).join('');

  block('DFA States', `<div class="state-chips">${chips}</div>`);

  // Labels
  const labelHtml = dfa.states.map(s => {
    const lbl = dfa.labelMap.get(s);
    return `<div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">
      <span style="color:var(--accent2)">${s}</span> = {${lbl}}
    </div>`;
  }).join('');
  block('State Mapping (NFA subsets)', labelHtml);

  // Start + Accept
  block('Start State', `<span class="chip start">${dfa.start}</span>`);
  const acceptChips = [...dfa.accepts].map(s => `<span class="chip accept">${s}</span>`).join('');
  block('Accept States', `<div class="state-chips">${acceptChips || '<span class="chip dead">none</span>'}</div>`);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:var(--accent2)"></div>Start state</div>
    <div class="legend-item"><div class="legend-dot" style="background:var(--accent)"></div>Accept state</div>
    <div class="legend-item"><div class="legend-dot" style="background:var(--accent3)"></div>Start + Accept</div>
    <div class="legend-item"><div class="legend-dot" style="background:var(--border)"></div>Dead state</div>
  `;
  out.appendChild(legend);
}

// Phase 5: Render tables
function renderTables(nfa, dfa) {
  // NFA table
  const nfaEl = document.getElementById('nfaTable');
  const syms = [...nfa.alphabet, ...(hasEpsilon(nfa) ? ['epsilon'] : [])];
  let html = '<table><tr><th>State</th>' + syms.map(s => `<th>${s}</th>`).join('') + '</tr>';
  for (const s of nfa.states) {
    const isAccept = nfa.accepts.has(s);
    const isStart = s === nfa.start;
    const label = (isStart ? '-> ' : '') + (isAccept ? '* ' : '') + s;
    html += `<tr><td class="${isAccept ? 'accept-row' : ''}">${label}</td>`;
    for (const sym of syms) {
      const nexts = nfa.delta[s] && nfa.delta[s][sym] ? [...nfa.delta[s][sym]] : [];
      html += `<td class="${nexts.length === 0 ? 'dead-cell' : ''}">${nexts.length ? '{' + nexts.join(',') + '}' : 'Ø'}</td>`;
    }
    html += '</tr>';
  }
  nfaEl.innerHTML = html + '</table>';

  // DFA table
  const dfaEl = document.getElementById('dfaTable');
  let dhtml = '<table><tr><th>State</th>' + dfa.alphabet.map(s => `<th>${s}</th>`).join('') + '</tr>';
  for (const s of dfa.states) {
    const isAccept = dfa.accepts.has(s);
    const isStart = s === dfa.start;
    const label = (isStart ? '-> ' : '') + (isAccept ? '* ' : '') + s;
    const isDead = dfa.labelMap.get(s) === 'empty';
    dhtml += `<tr><td class="${isAccept ? 'accept-row' : ''}">${label}</td>`;
    for (const sym of dfa.alphabet) {
      const to = dfa.delta[s] && dfa.delta[s][sym];
      const isDeadTo = to && dfa.labelMap.get(to) === 'empty';
      dhtml += `<td class="${isDeadTo ? 'dead-cell' : ''}">${to || 'Ø'}</td>`;
    }
    dhtml += '</tr>';
  }
  dfaEl.innerHTML = dhtml + '</table>';
}

function hasEpsilon(nfa) {
  for (const s of nfa.states) {
    if (nfa.delta[s] && nfa.delta[s]['epsilon'] && nfa.delta[s]['epsilon'].size > 0) return true;
  }
  return false;
}

// Phase 5: Canvas diagram
const COLORS = {
  bg: '#0a0c0f', bg2: '#111318', bg3: '#181c23',
  border: '#2a2f3a', bright: '#3d4455',
  accent: '#00e5a0', accent2: '#00b8ff', accent3: '#ff6b35',
  text: '#e2e8f0', muted: '#6b7280', dim: '#3d4455'
};

function layoutStates(states, w, h) {
  const n = states.length;
  const positions = {};
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.34;

  if (n === 1) {
    positions[states[0]] = { x: cx, y: cy };
  } else if (n === 2) {
    positions[states[0]] = { x: cx - r * 0.6, y: cy };
    positions[states[1]] = { x: cx + r * 0.6, y: cy };
  } else {
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      positions[states[i]] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      };
    }
  }
  return positions;
}

function drawArrow(ctx, x1, y1, x2, y2, label, color, nodeR, curved) {
  ctx.save();
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist, ny = dy / dist;

  const sx = x1 + nx * nodeR;
  const sy = y1 + ny * nodeR;
  const ex = x2 - nx * nodeR;
  const ey = y2 - ny * nodeR;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);

  if (curved) {
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    const perp = { x: -ny, y: nx };
    const bend = 32;
    const cpx = mx + perp.x * bend;
    const cpy = my + perp.y * bend;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();
    // arrowhead
    const angle = Math.atan2(ey - cpy, ex - cpx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 9 * Math.cos(angle - 0.4), ey - 9 * Math.sin(angle - 0.4));
    ctx.lineTo(ex - 9 * Math.cos(angle + 0.4), ey - 9 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    // label at curve midpoint
    if (label) {
      ctx.font = '11px Space Mono, monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(label, cpx + 5, cpy - 5);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const angle = Math.atan2(ey - sy, ex - sx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 9 * Math.cos(angle - 0.4), ey - 9 * Math.sin(angle - 0.4));
    ctx.lineTo(ex - 9 * Math.cos(angle + 0.4), ey - 9 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    if (label) {
      const lx = (sx + ex) / 2 + (-ny * 14);
      const ly = (sy + ey) / 2 + (nx * 14);
      ctx.font = '11px Space Mono, monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(label, lx, ly);
    }
  }
  ctx.restore();
}

function drawSelfLoop(ctx, x, y, label, color, nodeR) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  const lx = x, ly = y - nodeR - 22;
  ctx.beginPath();
  ctx.arc(lx, ly, 16, 0.5, Math.PI + 0.5, false);
  ctx.stroke();
  // arrowhead down
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(lx - 0, ly + 16);
  ctx.lineTo(lx - 6, ly + 8);
  ctx.lineTo(lx + 6, ly + 8);
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = '11px Space Mono, monospace';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(label, lx, ly - 22);
  }
  ctx.restore();
}

function drawDiagram(automaton, canvasId, type) {
  const canvas = document.getElementById(canvasId);
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 900;
  const H = 420;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLORS.bg2;
  ctx.fillRect(0, 0, W, H);

  const nodeR = 24;
  const positions = layoutStates(automaton.states, W, H);

  // Group transitions by from-to pair
  const edgeMap = {};
  for (const from of automaton.states) {
    for (const sym of automaton.alphabet) {
      const toSet = type === 'nfa'
        ? (automaton.delta[from] && automaton.delta[from][sym] ? [...automaton.delta[from][sym]] : [])
        : (automaton.delta[from] && automaton.delta[from][sym] ? [automaton.delta[from][sym]] : []);
      for (const to of toSet) {
        const key = from + '|' + to;
        if (!edgeMap[key]) edgeMap[key] = { from, to, labels: [] };
        edgeMap[key].labels.push(sym);
      }
    }
    // Epsilon for NFA
    if (type === 'nfa' && automaton.delta[from] && automaton.delta[from]['epsilon']) {
      for (const to of automaton.delta[from]['epsilon']) {
        const key = from + '|' + to;
        if (!edgeMap[key]) edgeMap[key] = { from, to, labels: [] };
        edgeMap[key].labels.push('epsilon');
      }
    }
  }

  // Draw edges
  const drawn = new Set();
  for (const [key, edge] of Object.entries(edgeMap)) {
    const { from, to, labels } = edge;
    const p1 = positions[from], p2 = positions[to];
    if (!p1 || !p2) continue;
    const label = labels.join(',');
    const revKey = to + '|' + from;
    const hasReverse = edgeMap[revKey] && !drawn.has(revKey);
    const curved = hasReverse;
    const color = type === 'dfa' ? COLORS.accent2 : COLORS.accent;

    if (from === to) {
      drawSelfLoop(ctx, p1.x, p1.y, label, color, nodeR);
    } else {
      drawArrow(ctx, p1.x, p1.y, p2.x, p2.y, label, color, nodeR, curved);
    }
    drawn.add(key);
  }

  // Start arrow
  const startPos = positions[automaton.start];
  if (startPos) {
    ctx.save();
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startPos.x - nodeR - 30, startPos.y);
    ctx.lineTo(startPos.x - nodeR - 1, startPos.y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.beginPath();
    ctx.moveTo(startPos.x - nodeR - 1, startPos.y);
    ctx.lineTo(startPos.x - nodeR - 9, startPos.y - 5);
    ctx.lineTo(startPos.x - nodeR - 9, startPos.y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Draw nodes
  for (const s of automaton.states) {
    const { x, y } = positions[s];
    const isStart = s === automaton.start;
    const isAccept = automaton.accepts.has(s);
    const isDead = type === 'dfa' && automaton.labelMap && automaton.labelMap.get(s) === 'empty';

    // Outer circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = isDead ? COLORS.bg3 : COLORS.bg;
    ctx.fill();

    let strokeColor = COLORS.bright;
    if (isDead) strokeColor = COLORS.border;
    else if (isStart && isAccept) strokeColor = COLORS.accent3;
    else if (isStart) strokeColor = COLORS.accent2;
    else if (isAccept) strokeColor = COLORS.accent;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isDead ? 1 : 2;
    ctx.stroke();

    // Accept double ring
    if (isAccept) {
      ctx.beginPath();
      ctx.arc(x, y, nodeR - 5, 0, 2 * Math.PI);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // Label
    ctx.save();
    ctx.font = `${nodeR > 24 ? '12' : '11'}px Space Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDead ? COLORS.dim : (strokeColor === COLORS.bright ? COLORS.text : strokeColor);
    ctx.fillText(s, x, y);
    ctx.restore();

    // Subset label below (DFA only)
    if (type === 'dfa' && automaton.labelMap) {
      const sub = automaton.labelMap.get(s);
      ctx.save();
      ctx.font = '9px Space Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLORS.muted;
      ctx.fillText('{' + sub + '}', x, y + nodeR + 4);
      ctx.restore();
    }
  }
}

function showDiagram(type) {
  currentView = type;
  document.getElementById('tabNFA').classList.toggle('active', type === 'nfa');
  document.getElementById('tabDFA').classList.toggle('active', type === 'dfa');
  if (type === 'nfa' && currentNFA) drawDiagram(currentNFA, 'diagram', 'nfa');
  if (type === 'dfa' && currentDFA) drawDiagram(currentDFA, 'diagram', 'dfa');
}

// Phase 5: Enhanced Main convert function
function convert() {
  const errEl = document.getElementById('errorMsg');
  const convertBtn = document.getElementById('convertBtn');
  
  errEl.textContent = '';
  convertBtn.classList.add('loading');
  convertBtn.textContent = 'Converting...';
  
  try {
    const nfa = parseNFA();
    const dfa = nfaToDfa(nfa);
    currentNFA = nfa;
    currentDFA = dfa;

    renderOutput(nfa, dfa);
    renderTables(nfa, dfa);

    // Show sections with smooth animation
    const canvasSection = document.getElementById('canvasSection');
    const tableSection = document.getElementById('tableSection');
    
    canvasSection.style.display = 'block';
    canvasSection.style.opacity = '0';
    tableSection.style.display = 'block';
    tableSection.style.opacity = '0';
    
    setTimeout(() => {
      canvasSection.style.opacity = '1';
      tableSection.style.opacity = '1';
    }, 50);

    // Default to DFA view after conversion
    currentView = 'dfa';
    document.getElementById('tabNFA').classList.remove('active');
    document.getElementById('tabDFA').classList.add('active');
    setTimeout(() => drawDiagram(dfa, 'diagram', 'dfa'), 100);
    
  } catch (e) {
    errEl.textContent = 'Error: ' + e.message;
    errEl.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      errEl.style.animation = '';
    }, 500);
  } finally {
    convertBtn.classList.remove('loading');
    convertBtn.textContent = 'Convert to DFA';
  }
}

// Phase 5: Examples
const EXAMPLES = [
  {
    name: 'Strings ending in ab',
    states: 'q0,q1,q2',
    alphabet: 'a,b',
    start: 'q0',
    accepts: 'q2',
    transitions: 'q0,a,q0;q1\nq0,b,q0\nq1,b,q2'
  },
  {
    name: 'Epsilon NFA',
    states: 'q0,q1,q2,q3',
    alphabet: 'a,b',
    start: 'q0',
    accepts: 'q3',
    transitions: 'q0,epsilon,q1\nq0,epsilon,q2\nq1,a,q3\nq2,b,q3'
  },
  {
    name: 'Binary divisible by 2',
    states: 'q0,q1',
    alphabet: '0,1',
    start: 'q0',
    accepts: 'q0',
    transitions: 'q0,0,q0\nq0,1,q1\nq1,0,q0\nq1,1,q1'
  }
];

function loadExample() {
  const ex = EXAMPLES[exIdx % EXAMPLES.length];
  exIdx++;
  document.getElementById('states').value = ex.states;
  document.getElementById('alphabet').value = ex.alphabet;
  document.getElementById('startState').value = ex.start;
  document.getElementById('acceptStates').value = ex.accepts;
  document.getElementById('transitions').value = ex.transitions;
  document.getElementById('exampleBtn').textContent = `Load Example (${EXAMPLES[exIdx % EXAMPLES.length].name})`;
  convert();
}

function clearAll() {
  const outputContent = document.getElementById('outputContent');
  const canvasSection = document.getElementById('canvasSection');
  const tableSection = document.getElementById('tableSection');
  
  // Clear inputs with animation
  ['states','alphabet','startState','acceptStates','transitions'].forEach(id => {
    const input = document.getElementById(id);
    input.style.transition = 'all 0.3s ease';
    input.value = '';
    input.style.background = 'var(--bg3)';
    setTimeout(() => {
      input.style.transition = '';
    }, 300);
  });
  
  // Clear error
  document.getElementById('errorMsg').textContent = '';
  
  // Fade out sections
  outputContent.style.transition = 'opacity 0.3s ease';
  canvasSection.style.transition = 'opacity 0.3s ease';
  tableSection.style.transition = 'opacity 0.3s ease';
  
  outputContent.style.opacity = '0';
  canvasSection.style.opacity = '0';
  tableSection.style.opacity = '0';
  
  setTimeout(() => {
    outputContent.className = 'output-placeholder';
    outputContent.innerHTML = '<div class="placeholder-icon">&vdash;</div><p>Define your NFA and click Convert</p>';
    canvasSection.style.display = 'none';
    tableSection.style.display = 'none';
    
    // Fade in placeholder
    outputContent.style.opacity = '1';
    outputContent.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
      outputContent.style.transition = '';
    }, 300);
  }, 300);
  
  currentNFA = null; currentDFA = null;
}

// Phase 5: Theme toggle
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  icon.textContent = isLight ? 'D' : 'T';
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    document.getElementById('themeIcon').textContent = 'D';
  }
}

// Phase 5: Event handlers
document.getElementById('convertBtn').addEventListener('click', convert);
document.getElementById('clearBtn').addEventListener('click', clearAll);
document.getElementById('exampleBtn').addEventListener('click', loadExample);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

document.getElementById('exampleBtn').textContent = `Load Example (${EXAMPLES[0].name})`;

window.addEventListener('resize', () => {
  if (currentNFA && currentDFA) showDiagram(currentView);
});

// Initialize theme on load
initializeTheme();

// Auto-convert on load with default values
window.addEventListener('load', () => { convert(); });
