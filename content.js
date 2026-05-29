// Content script — runs on LinkedIn pages, handles automation

let isRunning = false;
let currentPage = 1;
let totalSent = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START') {
    isRunning = true;
    currentPage = message.page || getCurrentPage();
    totalSent = 0;
    saveState();
    console.log('[AutoConnect] Starting on page', currentPage);
    setTimeout(startAutomation, 1000);
    sendResponse({ ok: true });
  } else if (message.type === 'STOP') {
    isRunning = false;
    saveState();
    console.log('[AutoConnect] Stopped. Total sent:', totalSent);
    sendResponse({ ok: true });
  } else if (message.type === 'NAVIGATE_NEXT_PAGE') {
    isRunning = true;
    currentPage = message.page;
    console.log('[AutoConnect] Navigating to page', currentPage);
    const url = new URL(window.location.href);
    url.searchParams.set('page', currentPage);
    window.location.href = url.toString();
    sendResponse({ ok: true });
  } else if (message.type === 'GET_STATE') {
    sendResponse({ isRunning, currentPage, totalSent });
  }
});

function getCurrentPage() {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get('page'), 10);
  return isNaN(page) ? 1 : page;
}

async function saveState() {
  chrome.storage.sync.set({ isRunning, currentPage, totalSent });
  updateBadge();
}

function findSendButton() {
  const host = document.querySelector('#interop-outlet');
  if (host && host.shadowRoot) {
    return host.shadowRoot.querySelector('button[aria-label="Send without a note"]');
  }
  return null;
}

function getConnectButtons() {
  return [...document.querySelectorAll(
    '[componentkey^="ConnectButtonstate:invitation:urn:li:member:"][componentkey$="_connect"]'
  )];
}

function updateBadge() {
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    count: totalSent
  }).catch(() => {});
}

function processNext() {
  if (!isRunning) return;

  const buttons = getConnectButtons();

  if (buttons.length === 0) {
    console.log('[AutoConnect] No more connect buttons on page', currentPage);

    isRunning = false;
    currentPage++;
    console.log('[AutoConnect] Navigating to page', currentPage);

    const url = new URL(window.location.href);
    url.searchParams.set('page', currentPage);
    window.location.href = url.toString();
    return;
  }

  const btn = buttons[0];
  console.log(`[AutoConnect] Page ${currentPage}: ${buttons.length} remaining — clicking...`);
  btn.click();
  totalSent++;
  saveState();

  setTimeout(() => {
    const sendBtn = findSendButton();
    if (sendBtn) {
      sendBtn.click();
      console.log('[AutoConnect] Sent without a note. Total:', totalSent);
    } else {
      console.warn('[AutoConnect] Send button not found.');
    }

    if (isRunning) {
      setTimeout(processNext, 2000);
    }
  }, 1000);
}

function startAutomation() {
  if (!isRunning) return;
  currentPage = getCurrentPage();
  console.log(`[AutoConnect] Page ${currentPage} ready. Processing...`);
  processNext();
}

// Resume after page reload if automation was running
function resumeIfNeeded() {
  chrome.storage.sync.get(['isRunning', 'currentPage', 'totalSent'], (data) => {
    if (data.isRunning) {
      isRunning = true;
      currentPage = getCurrentPage();
      totalSent = data.totalSent || 0;
      console.log('[AutoConnect] Resuming on page', currentPage, '- total so far:', totalSent);
      setTimeout(processNext, 2000);
    }
  });
}

setTimeout(resumeIfNeeded, 2000);

// Expose for console debugging
window.autoConnect = {
  start: (page) => {
    isRunning = true;
    currentPage = page || getCurrentPage();
    totalSent = 0;
    saveState();
    startAutomation();
  },
  stop: () => {
    isRunning = false;
    saveState();
    console.log('[AutoConnect] Stopped. Total sent:', totalSent);
  },
  status: () => ({ isRunning, currentPage, totalSent })
};

console.log('[AutoConnect] Content script loaded.');
