/* =========================================================
   Tic Tac Toe (井字棋) - game logic
   Plain JavaScript, no libraries. Sections:
     1. Settings
     2. Game state
     3. Winning lines
     4. Computer player (Easy / Normal / Hard)
     5. Sound
     6. Game actions (move, undo, new game)
     7. Drawing the screen
     8. Buttons and start-up
   In the code, 'P' = the Player (you) and 'C' = the Computer.
   ========================================================= */
'use strict';

/* ---------- 1. SETTINGS ---------- */
const LEVEL_HINTS = {
  easy:   '简单：电脑随便下，轻松玩。',
  normal: '普通：电脑会拦住您，也会抓住机会赢。',
  hard:   '困难：电脑非常聪明，很难赢，来挑战一下吧！'
};

// Board sizes: n = squares per row, k = how many in a row are needed to win.
const SIZES = { 3: { n: 3, k: 3 }, 4: { n: 4, k: 4 }, 5: { n: 5, k: 4 } };

// localStorage can fail (for example in private browsing), so wrap it safely.
function loadSetting(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}
function saveSetting(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

/* ---------- 2. GAME STATE ---------- */
const savedLevel = loadSetting('ttt-level', 'easy');
const savedSize = loadSetting('ttt-size', '3');
const savedSound = loadSetting('ttt-sound', 'on');

const state = {
  size: ['3', '4', '5'].includes(savedSize) ? Number(savedSize) : 3,
  level: savedLevel in LEVEL_HINTS ? savedLevel : 'easy',     // Easy by default
  sound: savedSound !== 'off',                                // sound is on by default

  board: [],          // each square is '' or 'P' or 'C'
  history: [],        // moves in order: {i: square, p: 'P' or 'C'}
  over: false,        // is the game finished?
  result: null,       // 'P', 'C' or 'draw'
  winLine: [],        // the winning squares
  thinking: false,    // is the computer waiting to move?
  notice: null        // temporary message, e.g. 'taken'
};

let lines = [];            // all winning lines for the current board size
let centreOrder = [];      // squares sorted from the middle outwards
let squares = [];          // the square buttons on the screen
let computerTimer = null;  // the 1-second wait before the computer moves
let autoTimer = null;      // the wait before a new game starts by itself
const AUTO_RESTART_MS = 5000;   // 5 seconds, so the player can see who won

/* ---------- 3. WINNING LINES ---------- */
// Builds every possible winning line (rows, columns, diagonals).
function buildLines(n, k) {
  const result = [];
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of directions) {
        const endR = r + (k - 1) * dr;
        const endC = c + (k - 1) * dc;
        if (endR < 0 || endR >= n || endC < 0 || endC >= n) continue;
        const line = [];
        for (let s = 0; s < k; s++) line.push((r + s * dr) * n + (c + s * dc));
        result.push(line);
      }
    }
  }
  return result;
}

// Returns {player, line} if someone has a winning line, otherwise null.
function findWinner(board) {
  for (const line of lines) {
    const first = board[line[0]];
    if (first && line.every(i => board[i] === first)) {
      return { player: first, line: line };
    }
  }
  return null;
}

function emptySquares(board) {
  return centreOrder.filter(i => board[i] === '');
}

/* ---------- 4. COMPUTER PLAYER ---------- */
// Looks for a square that would complete a winning line for `player`.
// Returns -1 if there is none.
function findCompletingSquare(board, player) {
  const need = SIZES[state.size].k - 1;
  for (const line of lines) {
    const mine = line.filter(i => board[i] === player).length;
    const empty = line.filter(i => board[i] === '');
    if (mine === need && empty.length === 1) return empty[0];
  }
  return -1;
}

// EASY: any empty square, chosen at random.
function easyMove(board) {
  const empty = emptySquares(board);
  return empty[Math.floor(Math.random() * empty.length)];
}

// NORMAL: win if possible, else block the player, else random.
function normalMove(board) {
  let move = findCompletingSquare(board, 'C');            // can I win?
  if (move < 0) move = findCompletingSquare(board, 'P');  // must I block?
  return move >= 0 ? move : easyMove(board);
}

// HARD: the computer looks ahead at future moves ("minimax" with pruning).
// On the 3x3 board it looks at every possible game, so it never loses.
// On the 4x4 board it looks several moves ahead and scores the positions.
const LINE_WEIGHT = [0, 1, 10, 100, 1000];

function evaluate(board) {
  let score = 0;
  for (const line of lines) {
    let p = 0, c = 0;
    for (const i of line) {
      if (board[i] === 'P') p++;
      else if (board[i] === 'C') c++;
    }
    if (p && c) continue;                  // blocked line, worth nothing
    if (c) score += LINE_WEIGHT[c];
    else if (p) score -= LINE_WEIGHT[p];
  }
  return score;
}

function search(board, player, depth, maxDepth, alpha, beta) {
  const winner = findWinner(board);
  if (winner) return winner.player === 'C' ? 100000 - depth : depth - 100000;
  const empty = emptySquares(board);
  if (empty.length === 0) return 0;
  if (depth >= maxDepth) return evaluate(board);

  if (player === 'C') {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = 'C';
      best = Math.max(best, search(board, 'P', depth + 1, maxDepth, alpha, beta));
      board[i] = '';
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const i of empty) {
    board[i] = 'P';
    best = Math.min(best, search(board, 'C', depth + 1, maxDepth, alpha, beta));
    board[i] = '';
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

function hardMove(board) {
  const copy = board.slice();
  const maxDepth = state.size === 3 ? 9 : state.size === 4 ? 5 : 3;
  let bestScore = -Infinity;
  let bestMoves = [];
  for (const i of emptySquares(copy)) {
    copy[i] = 'C';
    const score = search(copy, 'P', 1, maxDepth, -Infinity, Infinity);
    copy[i] = '';
    if (score > bestScore) { bestScore = score; bestMoves = [i]; }
    else if (score === bestScore) bestMoves.push(i);
  }
  // If several moves are equally good, pick one at random for variety.
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function chooseComputerMove() {
  if (state.level === 'hard') return hardMove(state.board);
  if (state.level === 'normal') return normalMove(state.board);
  return easyMove(state.board);
}

/* ---------- 5. SOUND ---------- */
// All sounds are made by the browser itself (no sound files needed).
let audioContext = null;

function getAudio() {
  try {
    if (!audioContext) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioClass) return null;
      audioContext = new AudioClass();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch (e) {
    return null;
  }
}

// Plays one soft note. `delay` is in seconds from now.
function playNote(frequency, delay, length) {
  if (!state.sound) return;
  const ctx = getAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.2, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

function playMoveSound(player) {          // you: higher note, computer: lower note
  playNote(player === 'P' ? 660 : 440, 0, 0.2);
}
function playWinSound() {                 // happy rising notes
  [523, 659, 784, 1047].forEach((f, n) => playNote(f, 0.3 + n * 0.18, 0.35));
}
function playLoseSound() {                // gentle falling notes
  [392, 330, 262].forEach((f, n) => playNote(f, 0.3 + n * 0.25, 0.4));
}
function playDrawSound() {
  [440, 440].forEach((f, n) => playNote(f, 0.3 + n * 0.28, 0.35));
}

/* ---------- 6. GAME ACTIONS ---------- */
function cancelComputerTimer() {
  if (computerTimer) {
    clearTimeout(computerTimer);
    computerTimer = null;
  }
  state.thinking = false;
}

function cancelAutoRestart() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function newGame() {
  cancelComputerTimer();
  cancelAutoRestart();
  state.board = Array(state.size * state.size).fill('');
  state.history = [];
  state.over = false;
  state.result = null;
  state.winLine = [];
  state.notice = null;
  render();                      // the player always goes first
}

function placeMark(index, player) {
  state.board[index] = player;
  state.history.push({ i: index, p: player });
  state.notice = null;
  playMoveSound(player);

  const winner = findWinner(state.board);
  if (winner) {
    state.over = true;
    state.result = winner.player;
    state.winLine = winner.line;
  } else if (emptySquares(state.board).length === 0) {
    state.over = true;
    state.result = 'draw';
  } else if (player === 'P') {
    startComputerTurn();
  }
  // When the game ends (someone wins or loses, or it is a draw), a new game
  // starts by itself after a few seconds. "New Game" can be pressed sooner.
  if (state.over) {
    autoTimer = setTimeout(newGame, AUTO_RESTART_MS);
    if (state.result === 'P') playWinSound();
    else if (state.result === 'C') playLoseSound();
    else playDrawSound();
  }
  render();
}

// The computer waits about 1 second so the player can follow what happened.
function startComputerTurn() {
  state.thinking = true;
  computerTimer = setTimeout(() => {
    computerTimer = null;
    state.thinking = false;
    placeMark(chooseComputerMove(), 'C');
  }, 1000);
}

function handleSquareTap(index) {
  if (state.over || state.thinking) return;
  if (state.board[index] !== '') {
    state.notice = 'taken';
    render();
    return;
  }
  placeMark(index, 'P');
}

// Take back the last move. If the last move was the computer's, take back
// your move too, so it is your turn again.
function undoMove() {
  if (state.history.length === 0) return;
  cancelComputerTimer();
  cancelAutoRestart();             // Undo cancels the automatic new game
  state.over = false;
  state.result = null;
  state.winLine = [];

  let last = state.history.pop();
  state.board[last.i] = '';
  if (last.p === 'C' && state.history.length > 0) {
    last = state.history.pop();
    state.board[last.i] = '';
  }
  state.notice = null;
  render();
}

function setLevel(level) {
  state.level = level;
  saveSetting('ttt-level', level);
  render();                      // the game carries on, only the computer's skill changes
}

function setSize(size) {
  if (state.size === size) return;
  state.size = size;
  saveSetting('ttt-size', String(size));
  prepareBoard();
  newGame();
}

/* ---------- 7. DRAWING THE SCREEN ---------- */
const $ = id => document.getElementById(id);

// Creates the square buttons for the chosen board size.
function prepareBoard() {
  const { n, k } = SIZES[state.size];
  lines = buildLines(n, k);

  // Squares sorted from the middle outwards (the computer prefers the middle).
  const middle = (n - 1) / 2;
  centreOrder = Array.from({ length: n * n }, (_, i) => i).sort((a, b) => {
    const da = Math.hypot(Math.floor(a / n) - middle, (a % n) - middle);
    const db = Math.hypot(Math.floor(b / n) - middle, (b % n) - middle);
    return da - db;
  });

  const boardEl = $('board');
  boardEl.innerHTML = '';
  boardEl.className = 'board size' + n;
  boardEl.style.setProperty('--n', n);
  squares = [];
  for (let i = 0; i < n * n; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cell';
    btn.addEventListener('click', () => handleSquareTap(i));
    boardEl.appendChild(btn);
    squares.push(btn);
  }
}

// Works out the status line text and its colour style.
function getStatus() {
  if (state.over) {
    const note = '稍后自动开始新游戏';
    if (state.result === 'draw') return { text: '平局！', note: note, style: 'draw' };
    if (state.result === 'P') return { text: '您赢了！太棒了！🎉', note: note, style: 'win' };
    return { text: '电脑赢了。别灰心！', note: note, style: 'lose' };
  }
  if (state.notice === 'taken') return { text: '这个格子已经有了，请点别的空格。', style: '' };
  if (state.thinking) return { text: '电脑正在想…', style: '' };
  return { text: '轮到您了（X），请点一个空格子。', style: '' };
}

function render() {
  const n = SIZES[state.size].n;

  // Status line
  const status = getStatus();
  const statusEl = $('status');
  const statusKey = status.text + '|' + (status.note || '');
  if (statusEl.dataset.key !== statusKey) {      // only rewrite when it changed
    statusEl.dataset.key = statusKey;
    statusEl.textContent = status.text;
    if (status.note) {
      const note = document.createElement('span');
      note.className = 'status-note';
      note.textContent = status.note;
      statusEl.appendChild(note);
    }
  }
  statusEl.className = 'status' + (status.style ? ' ' + status.style : '');

  // Board squares
  const lastMove = state.history.length ? state.history[state.history.length - 1].i : -1;
  squares.forEach((btn, i) => {
    const value = state.board[i];
    let css = 'cell';
    if (value === 'P') css += ' p';
    if (value === 'C') css += ' c';
    if (state.winLine.includes(i)) css += ' win';
    else if (i === lastMove && !state.over) css += ' last';
    btn.className = css;
    btn.textContent = value === 'P' ? 'X' : value === 'C' ? 'O' : '';

    const what = value === 'P' ? 'X' : value === 'C' ? 'O' : '空';
    btn.setAttribute('aria-label', `第${Math.floor(i / n) + 1}行，第${(i % n) + 1}列，${what}`);
    btn.setAttribute('aria-disabled', (value || state.over || state.thinking) ? 'true' : 'false');
  });

  // Undo is only available when there is a move to take back
  $('undoBtn').disabled = state.history.length === 0;

  // Level and size buttons
  document.querySelectorAll('[data-level]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.level === state.level));
  });
  document.querySelectorAll('[data-size]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.size) === state.size));
  });
  $('levelHint').textContent = LEVEL_HINTS[state.level];
  $('soundBtn').textContent = state.sound ? '声音：开' : '声音：关';
}

/* ---------- 8. BUTTONS AND START-UP ---------- */
document.querySelectorAll('[data-level]').forEach(btn => {
  btn.addEventListener('click', () => setLevel(btn.dataset.level));
});
document.querySelectorAll('[data-size]').forEach(btn => {
  btn.addEventListener('click', () => setSize(Number(btn.dataset.size)));
});

$('soundBtn').addEventListener('click', () => {
  state.sound = !state.sound;
  saveSetting('ttt-sound', state.sound ? 'on' : 'off');
  render();
  playMoveSound('P');            // a little test sound when turned on
});

$('newGameBtn').addEventListener('click', newGame);
$('undoBtn').addEventListener('click', undoMove);

// Arrow keys move between squares (helps keyboard users).
$('board').addEventListener('keydown', event => {
  const n = SIZES[state.size].n;
  const current = squares.indexOf(document.activeElement);
  if (current < 0) return;
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n };
  if (!(event.key in moves)) return;
  const target = current + moves[event.key];
  const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
  const sameRow = Math.floor(target / n) === Math.floor(current / n);
  if (target >= 0 && target < n * n && (!horizontal || sameRow)) squares[target].focus();
  event.preventDefault();
});

// Start!
prepareBoard();
newGame();
