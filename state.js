// Shared state manager using chrome.storage
// Used by both content script and popup

async function getState() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['isRunning', 'currentPage', 'totalSent'], (data) => {
      resolve({
        isRunning: data.isRunning || false,
        currentPage: data.currentPage || 1,
        totalSent: data.totalSent || 0
      });
    });
  });
}

async function setState(updates) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(updates, resolve);
  });
}

async function updateState(updates) {
  const current = await getState();
  await setState({ ...current, ...updates });
}
