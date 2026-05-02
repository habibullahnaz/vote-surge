# 🗳️ Vote Surge

> A web-based game that teaches and demonstrates the **Boyer-Moore Majority Vote Algorithm** through an interactive election simulation.

**Course:** Analysis of Algorithms  
**Algorithm:** Boyer-Moore Majority Vote  
**Tech Stack:** HTML5 · CSS3 · Vanilla JavaScript (no frameworks)  
**Live Demo:** *(deploy to GitHub Pages and paste link here)*

---

## 📸 Screenshot

*(Add a screenshot here after running the game)*

---

## 🎮 How to Play

1. Voters (colored tokens) stream in one by one
2. The Boyer-Moore algorithm runs **live** — you see the candidate and count update in real time
3. Predict which party will be the **majority** (>50% of all votes)
4. Lock in your prediction **early** for a speed bonus!
5. You have **3 lives** — survive all 6 election levels to win

---

## 🧠 The Algorithm

### Boyer-Moore Majority Vote

**Problem:** Given an array of n elements, find the element that appears **more than n/2 times**.

**Naive approach:** Sort the array → O(n log n), or use a hash map → O(n) time but O(n) space.

**Boyer-Moore's insight:** We can do it in **O(n) time and O(1) space** with a single pass.

### How it works

```
candidate = null
count = 0

for each vote in votes:
    if count == 0:
        candidate = vote       ← adopt this voter as candidate
    elif vote == candidate:
        count++                ← reinforce the candidate
    else:
        count--                ← cancel one vote out
```

After one pass, `candidate` holds the **majority element** (if one exists).

A second verification pass confirms it appears > n/2 times.

### Why does it work?

Think of votes cancelling each other out. If a majority element exists (appears > n/2 times), it cannot be fully cancelled — it always "survives" the cancellations.

Even if every non-majority vote cancels one majority vote, there are still majority votes left over.

### Complexity

| | Time | Space |
|---|---|---|
| Boyer-Moore | O(n) | O(1) |
| Hash Map | O(n) | O(n) |
| Sort-based | O(n log n) | O(1) or O(n) |

### Important Note

Boyer-Moore **guarantees a candidate** but NOT that a majority exists. If no majority element exists, the algorithm still returns a candidate — you must verify with a second pass.

---

## 🗂️ Project Structure

```
vote-surge/
├── index.html       ← Game UI and all screens
├── style.css        ← Full styling (dark political poster aesthetic)
├── algorithm.js     ← Boyer-Moore implementation (pure, documented)
├── game.js          ← Game logic, state machine, scoring
└── README.md        ← This file
```

### Key files explained

**`algorithm.js`** — The pure algorithm with no game dependencies:
- `boyerMooreCandidate(votes)` — core O(n) O(1) pass
- `verifyMajority(votes, candidate)` — second verification pass
- `boyerMooreTrace(votes)` — step-by-step trace for animation
- `generateRound(parties, total, difficulty)` — random round generator

**`game.js`** — Game logic:
- State machine: menu → playing → result → gameover/win
- 6 difficulty levels with increasing vote counts and tighter margins
- Scoring: base points per level + speed bonus for early predictions

---

## 🚀 Running Locally

No build step, no dependencies.

```bash
git clone https://github.com/YOUR_USERNAME/vote-surge.git
cd vote-surge
# Open index.html in any browser
```

Or use a local server (recommended to avoid font loading issues):

```bash
python3 -m http.server 8000
# Visit: http://localhost:8000
```

---

## 🌐 Deploying to GitHub Pages

1. Push your code to `main` branch
2. Go to **Settings → Pages**
3. Set source: `main` branch, root `/`
4. GitHub Pages URL: `https://YOUR_USERNAME.github.io/vote-surge`

---

## 📊 Game Levels

| Level | Election | Votes | Difficulty | Speed |
|-------|----------|-------|------------|-------|
| 1 | District | 9 | Easy | 900ms/vote |
| 2 | City | 13 | Low | 800ms/vote |
| 3 | Regional | 17 | Medium | 700ms/vote |
| 4 | State | 21 | High | 600ms/vote |
| 5 | National | 27 | Hard | 500ms/vote |
| 6 | Supreme | 33 | Extreme | 420ms/vote |

---

## 👤 Author

**[Your Name]**  
Student, Analysis of Algorithms  
[Your University]

---

## 📄 License

MIT License — free to use and modify.
