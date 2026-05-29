// Popup script — polls chrome.storage for live state updates

let state = { isRunning: false, currentPage: 1, totalSent: 0 };
let pollInterval = null;

function updateUI() {
  const statusEl = document.getElementById('statusValue');
  const sentEl = document.getElementById('sentValue');
  const pageEl = document.getElementById('pageValue');
  const logEl = document.getElementById('logValue');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');

  if (state.isRunning) {
    statusEl.innerHTML = '<span class="pulse"></span>Running';
    statusEl.className = 'value running';
  } else {
    statusEl.textContent = 'Stopped';
    statusEl.className = 'value stopped';
  }

  sentEl.textContent = state.totalSent;
  pageEl.textContent = state.currentPage || '—';
  logEl.textContent = state.lastAction || '—';

  btnStart.style.display = state.isRunning ? 'none' : 'block';
  btnStop.style.display = state.isRunning ? 'block' : 'none';
}

function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(() => {
    chrome.storage.sync.get(['isRunning', 'currentPage', 'totalSent'], (data) => {
      const changed =
        data.isRunning !== state.isRunning ||
        data.currentPage !== state.currentPage ||
        data.totalSent !== state.totalSent;

      if (changed) {
        state = {
          isRunning: data.isRunning || false,
          currentPage: data.currentPage || 1,
          totalSent: data.totalSent || 0,
          lastAction: data.isRunning ? `Sent: ${data.totalSent || 0}` : 'Stopped'
        };
        updateUI();
      }
    });
  }, 1000); // poll every 1 second
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function start() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const pageParam = parseInt(url.searchParams.get('page'), 10);
    const page = isNaN(pageParam) ? 1 : pageParam;

    // Initialize storage state
    await new Promise((resolve) => {
      chrome.storage.sync.set({ isRunning: true, currentPage: page, totalSent: 0 }, resolve);
    });

    state = { isRunning: true, currentPage: page, totalSent: 0, lastAction: 'Starting...' };
    updateUI();
    startPolling();

    // Send START to content script
    chrome.tabs.sendMessage(tab.id, { type: 'START', page }).catch(() => {});
  } catch (e) {
    console.error('Start error:', e);
  }
}

async function stop() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await new Promise((resolve) => {
      chrome.storage.sync.set({ isRunning: false }, resolve);
    });

    state = { ...state, isRunning: false, lastAction: 'Stopped' };
    updateUI();
    stopPolling();

    chrome.tabs.sendMessage(tab.id, { type: 'STOP' }).catch(() => {});
  } catch (e) {
    console.error('Stop error:', e);
  }
}

async function reset() {
  await new Promise((resolve) => {
    chrome.storage.sync.set({ totalSent: 0 }, resolve);
  });
  state = { ...state, totalSent: 0, lastAction: 'Reset' };
  updateUI();
}

async function init() {
  // Load initial state from storage
  const data = await new Promise((resolve) => {
    chrome.storage.sync.get(['isRunning', 'currentPage', 'totalSent'], resolve);
  });

  state = {
    isRunning: data.isRunning || false,
    currentPage: data.currentPage || 1,
    totalSent: data.totalSent || 0,
    lastAction: '—'
  };
  updateUI();

  // If running, start polling
  if (state.isRunning) {
    startPolling();
  }
}

document.getElementById('btnStart').addEventListener('click', start);
document.getElementById('btnStop').addEventListener('click', stop);
document.getElementById('btnReset').addEventListener('click', reset);

init();
