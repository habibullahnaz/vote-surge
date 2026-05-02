/**
 * algorithm.js
 * ============
 * Boyer-Moore Majority Vote Algorithm
 * Course: Analysis of Algorithms
 *
 * THEORY:
 * -------
 * The Boyer-Moore Majority Vote Algorithm finds the majority element
 * in a sequence — an element that appears MORE than n/2 times.
 *
 * Key insight: if we cancel out each occurrence of a non-majority element
 * with one occurrence of the majority element, the majority element
 * will always survive.
 *
 * Time Complexity:  O(n) — single pass through the array
 * Space Complexity: O(1) — only two variables: candidate + count
 *
 * WHY IT WORKS:
 * If a majority element exists (appears > n/2 times), even after
 * cancelling it with every other element, it still has leftover votes.
 * It cannot be fully cancelled out.
 */

/**
 * Core Boyer-Moore algorithm — pure, no side effects.
 * Returns the majority candidate (NOT verified yet).
 *
 * @param {Array} votes - array of voter values (e.g. ["A","B","A","A","B"])
 * @returns {*} candidate - the potential majority element
 */
function boyerMooreCandidate(votes) {
  let candidate = null;
  let count = 0;

  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i];

    if (count === 0) {
      // No current candidate — adopt this voter
      candidate = vote;
      count = 1;
    } else if (vote === candidate) {
      // Same party — reinforce the candidate
      count++;
    } else {
      // Different party — cancel one vote out
      count--;
    }
  }

  return candidate;
}

/**
 * Verification pass — confirms the candidate is actually a majority.
 * Boyer-Moore only guarantees a candidate; we must verify separately.
 *
 * @param {Array} votes - original vote array
 * @param {*} candidate - candidate returned from boyerMooreCandidate()
 * @returns {{ isMajority: boolean, candidate: *, count: number, total: number }}
 */
function verifyMajority(votes, candidate) {
  const total = votes.length;
  const count = votes.filter(v => v === candidate).length;
  return {
    isMajority: count > total / 2,
    candidate,
    count,
    total,
    percentage: ((count / total) * 100).toFixed(1)
  };
}

/**
 * Step-by-step trace of the algorithm.
 * Used to animate each voter arriving in the game.
 *
 * @param {Array} votes
 * @returns {Array<{vote, candidate, count, action}>} - one entry per step
 */
function boyerMooreTrace(votes) {
  const trace = [];
  let candidate = null;
  let count = 0;

  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i];
    let action;

    if (count === 0) {
      candidate = vote;
      count = 1;
      action = "new_candidate";
    } else if (vote === candidate) {
      count++;
      action = "reinforce";
    } else {
      count--;
      action = "cancel";
    }

    trace.push({
      index: i,
      vote,
      candidate,
      count,
      action
    });
  }

  return trace;
}

/**
 * Generate a random round of votes.
 * Guarantees a majority party exists (appears > n/2 times).
 *
 * @param {string[]} parties - list of party names
 * @param {number} totalVotes - number of voters in this round
 * @param {number} difficulty - 0.0 (easy) to 1.0 (hard)
 * @returns {{ votes: string[], majorityParty: string }}
 */
function generateRound(parties, totalVotes, difficulty) {
  // Majority party gets between 51% (hard) and 80% (easy) of votes
  const minMajority = Math.ceil(totalVotes / 2) + 1;
  const maxMajority = Math.floor(totalVotes * (0.8 - difficulty * 0.29));
  const majorityCount = Math.floor(
    Math.random() * (maxMajority - minMajority + 1) + minMajority
  );

  const majorityParty = parties[Math.floor(Math.random() * parties.length)];
  const others = parties.filter(p => p !== majorityParty);

  const votes = [];

  // Fill majority votes
  for (let i = 0; i < majorityCount; i++) votes.push(majorityParty);

  // Fill remaining with other parties
  const remaining = totalVotes - majorityCount;
  for (let i = 0; i < remaining; i++) {
    votes.push(others[Math.floor(Math.random() * others.length)]);
  }

  // Shuffle using Fisher-Yates
  for (let i = votes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [votes[i], votes[j]] = [votes[j], votes[i]];
  }

  return { votes, majorityParty, majorityCount, totalVotes };
}

// Export for use in game.js
window.BoyerMoore = {
  candidate: boyerMooreCandidate,
  verify: verifyMajority,
  trace: boyerMooreTrace,
  generateRound
};
