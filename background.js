// Background service worker — persists across page reloads
// State is stored in chrome.storage.sync for cross-context sharing

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    chrome.storage.sync.get(['isRunning', 'currentPage', 'totalSent'], (data) => {
      sendResponse({
        isRunning: data.isRunning || false,
        currentPage: data.currentPage || 1,
        totalSent: data.totalSent || 0
      });
    });
    return true; // async response
  } else if (message.type === 'START') {
    chrome.storage.sync.set({
      isRunning: true,
      currentPage: message.page || 1,
      totalSent: 0
    });
    sendResponse({ ok: true });
  } else if (message.type === 'STOP') {
    chrome.storage.sync.set({ isRunning: false });
    sendResponse({ ok: true });
  } else if (message.type === 'UPDATE_STATE') {
    chrome.storage.sync.get(['isRunning', 'currentPage', 'totalSent'], (data) => {
      const updates = {};
      if (message.isRunning !== undefined) updates.isRunning = message.isRunning;
      if (message.currentPage !== undefined) updates.currentPage = message.currentPage;
      if (message.totalSent !== undefined) updates.totalSent = message.totalSent;
      chrome.storage.sync.set(updates);
    });
    sendResponse({ ok: true });
  } else if (message.type === 'UPDATE_BADGE') {
    chrome.action.setBadgeText({ text: String(message.count || '') });
    sendResponse({ ok: true });
  }
});
