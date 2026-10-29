/**
 * aBMICalculator Chrome Extension - Background Service Worker (Manifest V3)
 */

const SITE_URL = 'https://www.abmicalculator.com';

// 1. Extension Installation & Setup
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize default preferences in chrome.storage.local
  const existing = await chrome.storage.local.get(['theme', 'unit', 'activeTool', 'history']);
  if (!existing.theme) {
    await chrome.storage.local.set({
      theme: 'dark',
      unit: 'metric',
      activeTool: 'bmi',
      history: []
    });
  }

  // Set side panel behavior: allow opening on demand
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    } catch (e) {
      console.warn('sidePanel behavior setup notice:', e);
    }
  }

  // Create Context Menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'abmi_open_sidepanel',
      title: 'Open Health Calculators (Side Panel)',
      contexts: ['action', 'page']
    });

    chrome.contextMenus.create({
      id: 'abmi_visit_site',
      title: 'Visit aBMICalculator.com',
      contexts: ['action', 'page']
    });
  });
});

// 2. Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'abmi_open_sidepanel') {
    if (tab && tab.windowId && chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } else if (info.menuItemId === 'abmi_visit_site') {
    chrome.tabs.create({ url: SITE_URL });
  }
});

// 3. Omnibox Integration (Keyword: bmi)
// Usage: type 'bmi 75 180' in Chrome URL bar for instant calculation
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const parts = text.trim().split(/\s+/).map(Number);
  const suggestions = [];

  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
    const weightKg = parts[0];
    const heightCm = parts[1];
    const heightM = heightCm / 100;
    const bmi = +(weightKg / (heightM * heightM)).toFixed(2);

    let category = 'Normal weight';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'Overweight';
    else if (bmi < 35) category = 'Obesity Class I';
    else if (bmi < 40) category = 'Obesity Class II';
    else category = 'Obesity Class III';

    suggestions.push({
      content: `${SITE_URL}/bmi-calculator.html`,
      description: `<match>BMI ${bmi}</match> - <dim>${category}</dim> (Weight: ${weightKg}kg, Height: ${heightCm}cm) - Press Enter for clinical breakdown`
    });
  } else {
    suggestions.push({
      content: `${SITE_URL}/bmi-calculator.html`,
      description: `Type <match>bmi &lt;weight_kg&gt; &lt;height_cm&gt;</match> (e.g. <dim>bmi 75 180</dim>) to calculate instantly`
    });
  }

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener((text) => {
  if (text.startsWith('http')) {
    chrome.tabs.create({ url: text });
  } else {
    chrome.tabs.create({ url: `${SITE_URL}/bmi-calculator.html` });
  }
});
