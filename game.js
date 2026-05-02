/**
 * game.js
 * =======
 * Vote Surge — Game Logic
 * Uses Boyer-Moore Majority Vote Algorithm as the core mechanic.
 */

const PARTIES = [
  { id: "red",    name: "Red Party",    emoji: "🔴", color: "#e05252" },
  { id: "blue",   name: "Blue Party",   emoji: "🔵", color: "#4a90d9" },
  { id: "green",  name: "Green Party",  emoji: "🟢", color: "#5bb85b" },
  { id: "gold",   name: "Gold Party",   emoji: "🟡", color: "#d4a017" },
];

const LEVELS = [
  { level: 1, votes: 9,  difficulty: 0.0, label: "District Election",   speed: 900 },
  { level: 2, votes: 13, difficulty: 0.2, label: "City Election",       speed: 800 },
  { level: 3, votes: 17, difficulty: 0.4, label: "Regional Election",   speed: 700 },
  { level: 4, votes: 21, difficulty: 0.6, label: "State Election",      speed: 600 },
  { level: 5, votes: 27, difficulty: 0.8, label: "National Election",   speed: 500 },
  { level: 6, votes: 33, difficulty: 1.0, label: "Supreme Election",    speed: 420 },
];

const GameState = {
  screen: "menu",       // menu | playing | result | gameover | win
  level: 0,
  score: 0,
  lives: 3,
  round: null,          // current round data
  trace: [],            // step-by-step algo trace
  traceIndex: 0,        // which step we're on
  playerPick: null,     // player's prediction
  timerInterval: null,
  voteInterval: null,
  timeLeft: 0,
  lockedIn: false,
  voteHistory: [],      // for tally bars
};

// ─── DOM references ───────────────────────────────────────
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

// ─── Round Setup ──────────────────────────────────────────
function startRound() {
  const lvl = LEVELS[GameState.level];
  const { votes, majorityParty, majorityCount, totalVotes } =
    BoyerMoore.generateRound(PARTIES.map(p => p.id), lvl.votes, lvl.difficulty);

  GameState.round = { votes, majorityParty, majorityCount, totalVotes, lvl };
  GameState.trace = BoyerMoore.trace(votes);
  GameState.traceIndex = 0;
  GameState.playerPick = null;
  GameState.lockedIn = false;
  GameState.voteHistory = [];

  // Update HUD
  document.getElementById("hud-level").textContent = `Level ${lvl.level}`;
  document.getElementById("hud-label").textContent = lvl.label;
  document.getElementById("hud-score").textContent = GameState.score;
  updateLives();
  renderPartyButtons();
  resetAlgoDisplay();
  clearVoteStream();
  clearTallyBars();

  document.getElementById("lock-btn").disabled = true;
  document.getElementById("lock-btn").textContent = "Lock In Prediction";
  document.getElementById("prediction-area").classList.remove("locked");

  // Start the vote stream
  streamVotes(lvl.speed);
}

function streamVotes(speed) {
  GameState.traceIndex = 0;

  GameState.voteInterval = setInterval(() => {
    if (GameState.traceIndex >= GameState.trace.length) {
      clearInterval(GameState.voteInterval);
      onStreamComplete();
      return;
    }

    const step = GameState.trace[GameState.traceIndex];
    GameState.traceIndex++;

    addVoteToken(step);
    updateAlgoDisplay(step);
    updateTallyBars(step.vote);

    // Enable lock-in after 3 votes
    if (GameState.traceIndex >= 3) {
      document.getElementById("lock-btn").disabled = false;
    }

  }, speed);
}

function onStreamComplete() {
  if (!GameState.lockedIn) {
    // Auto-lock with penalty
    lockIn(true);
  } else {
    revealResult();
  }
}

// ─── Player Prediction ────────────────────────────────────
function selectParty(partyId) {
  if (GameState.lockedIn) return;
  GameState.playerPick = partyId;

  document.querySelectorAll(".party-btn").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.party === partyId);
  });

  document.getElementById("lock-btn").disabled = false;
}

function lockIn(auto = false) {
  if (GameState.lockedIn) return;
  if (!GameState.playerPick && !auto) return;

  GameState.lockedIn = true;
  document.getElementById("lock-btn").disabled = true;
  document.getElementById("lock-btn").textContent = auto ? "Time's up!" : "✓ Locked In!";
  document.getElementById("prediction-area").classList.add("locked");

  if (auto && !GameState.playerPick) {
    GameState.playerPick = "__none__";
  }

  // If stream still going, wait for it
  if (GameState.traceIndex >= GameState.trace.length) {
    revealResult();
  }
}

function revealResult() {
  clearInterval(GameState.voteInterval);

  const majority = GameState.round.majorityParty;
  const correct = GameState.playerPick === majority;
  const lvl = LEVELS[GameState.level];

  // Score: base points + speed bonus
  if (correct) {
    const speedBonus = Math.max(0, lvl.votes - GameState.traceIndex) * 5;
    const base = 100 * lvl.level;
    const earned = base + speedBonus;
    GameState.score += earned;
    document.getElementById("hud-score").textContent = GameState.score;
    showResultScreen(true, majority, earned);
  } else {
    GameState.lives--;
    updateLives();
    showResultScreen(false, majority, 0);
  }
}

// ─── Result Screen ────────────────────────────────────────
function showResultScreen(correct, majority, earned) {
  const party = PARTIES.find(p => p.id === majority);
  const playerParty = PARTIES.find(p => p.id === GameState.playerPick);
  const result = BoyerMoore.verify(GameState.round.votes, majority);

  document.getElementById("result-icon").textContent = correct ? "🗳️" : "❌";
  document.getElementById("result-title").textContent = correct ? "Correct!" : "Wrong Prediction";
  document.getElementById("result-majority").textContent =
    `${party.emoji} ${party.name} won with ${result.count}/${result.total} votes (${result.percentage}%)`;
  document.getElementById("result-player").textContent =
    correct
      ? `+${earned} points (includes speed bonus!)`
      : `You picked: ${playerParty ? playerParty.emoji + " " + playerParty.name : "nothing"}`;
  document.getElementById("result-player").style.color =
    correct ? "#5bb85b" : "#e05252";

  // Algo explanation
  document.getElementById("result-algo").textContent =
    `Boyer-Moore traced ${GameState.trace.length} votes. ` +
    `The algorithm's final candidate was ${party.name}, ` +
    `which was verified as majority (${result.percentage}% of votes).`;

  showScreen("result");

  // Check game state
  setTimeout(() => {
    const nextBtn = document.getElementById("next-btn");
    if (GameState.lives <= 0) {
      nextBtn.textContent = "See Results";
      nextBtn.onclick = () => showScreen("gameover");
    } else if (GameState.level >= LEVELS.length - 1 && correct) {
      nextBtn.textContent = "You Won! 🎉";
      nextBtn.onclick = showWinScreen;
    } else {
      if (correct) GameState.level = Math.min(GameState.level + 1, LEVELS.length - 1);
      nextBtn.textContent = correct ? "Next Level →" : "Try Again →";
      nextBtn.onclick = () => { showScreen("playing"); startRound(); };
    }
  }, 100);
}

function showWinScreen() {
  document.getElementById("win-score").textContent = GameState.score;
  showScreen("win");
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
    const heart = document.createElement("span");
    heart.className = "heart" + (i < GameState.lives ? " active" : "");
    heart.textContent = "♥";
    el.appendChild(heart);
  }
}

function resetAlgoDisplay() {
  document.getElementById("algo-candidate").textContent = "—";
  document.getElementById("algo-count").textContent = "0";
  document.getElementById("algo-action").textContent = "Waiting for first vote...";
  document.getElementById("algo-candidate").style.color = "";
}

function updateAlgoDisplay(step) {
  const party = PARTIES.find(p => p.id === step.candidate);
  const el = document.getElementById("algo-candidate");
  el.textContent = party ? `${party.emoji} ${party.name}` : "—";
  el.style.color = party ? party.color : "";
  document.getElementById("algo-count").textContent = step.count;

  const actions = {
    new_candidate: "🆕 New candidate adopted",
    reinforce:     "💪 Candidate reinforced (+1)",
    cancel:        "⚡ Vote cancelled out (−1)",
  };
  document.getElementById("algo-action").textContent = actions[step.action] || "";

  // Flash the panel
  const panel = document.getElementById("algo-panel");
  panel.classList.remove("flash");
  void panel.offsetWidth;
  panel.classList.add("flash");
}

function addVoteToken(step) {
  const stream = document.getElementById("vote-stream");
  const party = PARTIES.find(p => p.id === step.vote);
  const token = document.createElement("div");
  token.className = `vote-token action-${step.action}`;
  token.style.setProperty("--party-color", party.color);
  token.textContent = party.emoji;
  token.title = party.name;
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
    if (count === 0) return;
    const pct = (count / total) * 100;
    const row = document.createElement("div");
    row.className = "tally-row";
    row.innerHTML = `
      <span class="tally-label">${p.emoji}</span>
      <div class="tally-track">
        <div class="tally-fill" style="width:${pct.toFixed(1)}%; background:${p.color}"></div>
      </div>
      <span class="tally-pct">${count}</span>
    `;
    container.appendChild(row);
  });
}

function clearTallyBars() {
  document.getElementById("tally-bars").innerHTML = "";
}

// ─── Menu / Boot ──────────────────────────────────────────
function startGame() {
  GameState.score = 0;
  GameState.lives = 3;
  GameState.level = 0;
  showScreen("playing");
  startRound();
}

document.getElementById("start-btn").onclick = startGame;
document.getElementById("restart-btn").onclick = startGame;
document.getElementById("win-restart-btn").onclick = startGame;
document.getElementById("lock-btn").onclick = () => lockIn(false);

showScreen("menu");
