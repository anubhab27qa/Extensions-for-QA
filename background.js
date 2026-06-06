chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => {});

chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    frameworkId: 'javaSeleniumPageFactory',
    priority: [
      'id',
      'dataTestId',
      'dataTest',
      'dataQa',
      'dataCy',
      'name',
      'relativeCss',
      'relativeXpath',
      'css',
      'xpath',
      'role',
      'className',
      'ariaLabel',
      'anchoredTextXpath',
      'xpathText',
      'linkText',
      'partialLinkText'
    ],
    includeContainers: true,
    includeHidden: true,
    includeNested: true,
    autoOpenPopups: true,
    respectGlobalStore: true,
    className: 'PageLocators'
  };

  const existing = await chrome.storage.sync.get(['settings']);
  if (!existing.settings) {
    await chrome.storage.sync.set({ settings: defaults });
  }
});

async function waitForContentScript(tabId, attempts = 25) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const pong = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      if (pong?.ready) return true;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return false;
}

async function ensureContentScript(tabId) {
  if (await waitForContentScript(tabId, 3)) {
    return true;
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/content.js']
  });

  const ready = await waitForContentScript(tabId, 25);
  if (!ready) {
    throw new Error('Could not start scanner on this page. Refresh the page and try again.');
  }
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_PROGRESS') {
    chrome.storage.local.set({
      scanProgress: {
        ...message.progress,
        updatedAt: Date.now()
      }
    }).catch(() => {});
    return false;
  }

  if (message.type === 'SCAN_COMPLETE') {
    chrome.storage.local.set({
      scanProgress: {
        phase: message.result?.ok ? 'complete' : 'error',
        percent: message.result?.ok ? 100 : 0,
        detail: message.result?.ok
          ? `Found ${message.result.stats?.unique || 0} unique locators`
          : message.result?.error || 'Scan failed',
        updatedAt: Date.now()
      }
    }).catch(() => {});
    return false;
  }

  if (message.type === 'OPEN_SIDE_PANEL' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'SCAN_ACTIVE_TAB') {
    (async () => {
      let tab = null;
      if (message.tabId) {
        tab = await chrome.tabs.get(message.tabId).catch(() => null);
      }
      if (!tab?.id) {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tab = tabs[0];
      }
      if (!tab?.id) {
        sendResponse({ ok: false, error: 'No active tab' });
        return;
      }

      const url = tab.url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
        sendResponse({ ok: false, error: 'Cannot scan browser internal pages. Open a regular website first.' });
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        sendResponse({ ok: false, error: `Cannot scan this page type: ${url || 'unknown URL'}` });
        return;
      }

      await chrome.storage.local.set({
        scanProgress: {
          phase: 'preparing',
          percent: 0,
          processed: 0,
          total: 0,
          captured: 0,
          skipped: 0,
          detail: 'Starting scan…',
          updatedAt: Date.now()
        }
      });

      await ensureContentScript(tab.id);
      const settings = (await chrome.storage.sync.get(['settings'])).settings || {};
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'SCAN_PAGE',
        frameworkId: message.frameworkId || settings.frameworkId,
        className: message.className || settings.className,
        options: { ...settings, ...message.options }
      });
      sendResponse(response);
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || String(error) });
    });
    return true;
  }

  return false;
});
