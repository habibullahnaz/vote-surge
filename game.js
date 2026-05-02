/**
 * game.js
 * =======
 * Vote Surge — Game Logic
 * Uses Boyer-Moore Majority Vote Algorithm as the core mechanic.
 *
 * FLOW (anti-cheat redesign):
 *   Phase 1 — PREDICT: Player picks a party BLIND (no votes shown yet)
 *   Phase 2 — REVEAL:  Votes stream in, algorithm runs, result shown
 *
 * This prevents watching votes and then picking — you must commit first.
 */

const PARTIES = [
  { id: "red",   name: "Red Party",   emoji: "🔴", color: "#e05252" },
  { id: "blue",  name: "Blue Party",  emoji: "🔵", color: "#4a90d9" },
  { id: "green", name: "Green Party", emoji: "🟢", color: "#5bb85b" },
  { id: "gold",  name: "Gold Party",  emoji: "🟡", color: "#d4a017" },
];

const LEVELS = [
  { level: 1, votes: 9,  difficulty: 0.0, label: "District Election",  speed: 700 },
  { level: 2, votes: 13, difficulty: 0.2, label: "City Election",      speed: 620 },
  { level: 3, votes: 17, difficulty: 0.4, label: "Regional Election",  speed: 540 },
  { level: 4, votes: 21, difficulty: 0.6, label: "State Election",     speed: 460 },
  { level: 5, votes: 27, difficulty: 0.8, label: "National Election",  speed: 380 },
  { level: 6, votes: 33, difficulty: 1.0, label: "Supreme Election",   speed: 300 },
];

// phase: "predict" | "reveal"
const GameState = {
  screen: "menu",
  phase: "predict",
  level: 0,
  score: 0,
  lives: 3,
  round: null,
  trace: [],
  traceIndex: 0,
  playerPick: null,
  voteInterval: null,
  voteHistory: [],
};

// ─── DOM ──────────────────────────────────────────────────
const screens = {
  menu:     document.getElementById("screen-menu"),
  playing:  document.getElementById("screen-playing"),
  result:   document.getElementById("screen-result"),
  gameover: document.getElementById("screen-gameover"),
  win:      document.getElementById("screen-win"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  GameState.screen = name;
}

// ─── Phase Management ─────────────────────────────────────

/**
 * Phase 1: Show the prediction panel, hide the vote stream.
 * Player must commit to a party before seeing any votes.
 */
function enterPredictPhase() {
  GameState.phase = "predict";
  GameState.playerPick = null;

  const lvl = LEVELS[GameState.level];

  // Update HUD
  document.getElementById("hud-level").textContent = `Level ${lvl.level}`;
  document.getElementById("hud-label").textContent = lvl.label;
  document.getElementById("hud-score").textContent = GameState.score;
  updateLives();

  // Show predict UI, hide reveal UI
  document.getElementById("predict-phase").style.display = "flex";
  document.getElementById("reveal-phase").style.display = "none";

  // Reset party buttons
  renderPartyButtons();
  document.getElementById("confirm-btn").disabled = true;

  // Show vote count hint so player has some context
  document.getElementById("predict-vote-count").textContent =
    `${lvl.votes} voters · ${lvl.label}`;
}

/**
 * Phase 2: Lock in the pick, start streaming votes.
 */
function enterRevealPhase() {
  GameState.phase = "reveal";
  GameState.voteHistory = [];
  GameState.traceIndex = 0;

  // Show chosen party badge
  const chosen = PARTIES.find(p => p.id === GameState.playerPick);
  const badge = document.getElementById("your-pick-badge");
  badge.textContent = `${chosen.emoji} ${chosen.name}`;
  badge.style.borderColor = chosen.color;
  badge.style.color = chosen.color;

  // Hide predict UI, show reveal UI
  document.getElementById("predict-phase").style.display = "none";
  document.getElementById("reveal-phase").style.display = "flex";

  resetAlgoDisplay();
  clearVoteStream();
  clearTallyBars();

  // Start streaming after a short dramatic pause
  setTimeout(() => streamVotes(LEVELS[GameState.level].speed), 600);
}

// ─── Round Setup ──────────────────────────────────────────
function startRound() {
  const lvl = LEVELS[GameState.level];
  const data = BoyerMoore.generateRound(PARTIES.map(p => p.id), lvl.votes, lvl.difficulty);

  GameState.round = { ...data, lvl };
  GameState.trace = BoyerMoore.trace(data.votes);

  showScreen("playing");
  enterPredictPhase();
}

// ─── Vote Streaming ───────────────────────────────────────
function streamVotes(speed) {
  GameState.voteInterval = setInterval(() => {
    if (GameState.traceIndex >= GameState.trace.length) {
      clearInterval(GameState.voteInterval);
      onStreamComplete();
      return;
    }

    const step = GameState.trace[GameState.traceIndex++];
    addVoteToken(step);
    updateAlgoDisplay(step);
    updateTallyBars(step.vote);
  }, speed);
}

function onStreamComplete() {
  // Brief pause so player sees the final state, then reveal result
  setTimeout(revealResult, 800);
}

// ─── Scoring & Result ─────────────────────────────────────
function revealResult() {
  const majority = GameState.round.majorityParty;
  const correct = GameState.playerPick === majority;
  const lvl = LEVELS[GameState.level];
  let earned = 0;

  if (correct) {
    earned = 100 * lvl.level;
    GameState.score += earned;
    document.getElementById("hud-score").textContent = GameState.score;
  } else {
    GameState.lives--;
    updateLives();
  }

  showResultScreen(correct, majority, earned);
}

function showResultScreen(correct, majority, earned) {
  const party    = PARTIES.find(p => p.id === majority);
  const picked   = PARTIES.find(p => p.id === GameState.playerPick);
  const result   = BoyerMoore.verify(GameState.round.votes, majority);

  document.getElementById("result-icon").textContent  = correct ? "🎉" : "❌";
  document.getElementById("result-title").textContent = correct ? "Correct!" : "Wrong!";
  document.getElementById("result-majority").textContent =
    `${party.emoji} ${party.name} won — ${result.count}/${result.total} votes (${result.percentage}%)`;

  const playerLine = document.getElementById("result-player");
  if (correct) {
    playerLine.textContent = `+${earned} points`;
    playerLine.style.color = "#5bb85b";
  } else {
    playerLine.textContent = `You predicted: ${picked ? picked.emoji + " " + picked.name : "nothing"}`;
    playerLine.style.color = "#e05252";
  }

  document.getElementById("result-algo").textContent =
    `Boyer-Moore scanned all ${result.total} votes in one pass (O(n)). ` +
    `Final candidate: ${party.name} · verified at ${result.percentage}% share.`;

  showScreen("result");

  const nextBtn = document.getElementById("next-btn");
  if (GameState.lives <= 0) {
    document.getElementById("go-score-val").textContent = GameState.score;
    nextBtn.textContent = "See Final Score";
    nextBtn.onclick = () => showScreen("gameover");
  } else if (correct && GameState.level >= LEVELS.length - 1) {
    nextBtn.textContent = "You Won! 🏆";
    nextBtn.onclick = showWinScreen;
  } else {
    if (correct) GameState.level = Math.min(GameState.level + 1, LEVELS.length - 1);
    nextBtn.textContent = correct ? "Next Level →" : "Try Again →";
    nextBtn.onclick = () => startRound();
  }
}

function showWinScreen() {
  document.getElementById("win-score").textContent = GameState.score;
  showScreen("win");
}

// ─── Player Input ─────────────────────────────────────────
function selectParty(partyId) {
  if (GameState.phase !== "predict") return;
  GameState.playerPick = partyId;

  document.querySelectorAll(".party-btn").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.party === partyId);
  });

  document.getElementById("confirm-btn").disabled = false;
}

// ─── UI Helpers ───────────────────────────────────────────
function renderPartyButtons() {
  const container = document.getElementById("party-buttons");
  container.innerHTML = "";
  PARTIES.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "party-btn";
    btn.dataset.party = p.id;
    btn.style.setProperty("--party-color", p.color);
    btn.innerHTML = `<span class="party-emoji">${p.emoji}</span><span class="party-name">${p.name}</span>`;
    btn.onclick = () => selectParty(p.id);
    container.appendChild(btn);
  });
}

function updateLives() {
  const el = document.getElementById("hud-lives");
  el.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const h = document.createElement("span");
    h.className = "heart" + (i < GameState.lives ? " active" : "");
    h.textContent = "♥";
    el.appendChild(h);
  }
}

function resetAlgoDisplay() {
  document.getElementById("algo-candidate").textContent = "—";
  document.getElementById("algo-candidate").style.color = "";
  document.getElementById("algo-count").textContent = "0";
  document.getElementById("algo-action").textContent = "Voting begins...";
}

function updateAlgoDisplay(step) {
  const party = PARTIES.find(p => p.id === step.candidate);
  const el = document.getElementById("algo-candidate");
  el.textContent = party ? `${party.emoji} ${party.name}` : "—";
  el.style.color = party ? party.color : "";
  document.getElementById("algo-count").textContent = step.count;

  const msgs = {
    new_candidate: "🆕 New candidate adopted",
    reinforce:     "💪 Candidate reinforced (+1)",
    cancel:        "⚡ Vote cancelled out (−1)",
  };
  document.getElementById("algo-action").textContent = msgs[step.action] || "";

  const panel = document.getElementById("algo-panel");
  panel.classList.remove("flash");
  void panel.offsetWidth;
  panel.classList.add("flash");
}

function addVoteToken(step) {
  const stream = document.getElementById("vote-stream");
  const party  = PARTIES.find(p => p.id === step.vote);
  const token  = document.createElement("div");
  token.className = `vote-token action-${step.action}`;
  token.style.setProperty("--party-color", party.color);
  token.textContent = party.emoji;
  token.title = `${party.name} · ${step.action}`;
  stream.appendChild(token);
  stream.scrollLeft = stream.scrollWidth;
}

function clearVoteStream() {
  document.getElementById("vote-stream").innerHTML = "";
}

function updateTallyBars(voteId) {
  GameState.voteHistory.push(voteId);
  const total = GameState.voteHistory.length;
  const container = document.getElementById("tally-bars");
  container.innerHTML = "";

  PARTIES.forEach(p => {
    const count = GameState.voteHistory.filter(v => v === p.id).length;
    if (!count) return;
    const pct = (count / total) * 100;
    const row = document.createElement("div");
    row.className = "tally-row";
    row.innerHTML = `
      <span class="tally-label">${p.emoji}</span>
      <div class="tally-track">
        <div class="tally-fill" style="width:${pct.toFixed(1)}%;background:${p.color}"></div>
      </div>
      <span class="tally-pct">${count}</span>
    `;
    container.appendChild(row);
  });
}

function clearTallyBars() {
  document.getElementById("tally-bars").innerHTML = "";
}

// ─── Boot ─────────────────────────────────────────────────
function startGame() {
  GameState.score = 0;
  GameState.lives = 3;
  GameState.level = 0;
  startRound();
}

document.getElementById("start-btn").onclick    = startGame;
document.getElementById("restart-btn").onclick  = startGame;
document.getElementById("win-restart-btn").onclick = startGame;

document.getElementById("confirm-btn").onclick = () => {
  if (GameState.playerPick) enterRevealPhase();
};

showScreen("menu");
