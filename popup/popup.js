/**
 * aBMICalculator Chrome Extension Popup Controller
 * Validated clinical biometric algorithms, offline-first execution
 */

(function() {
  'use strict';

  // Constants
  const SITE_URL = 'https://www.abmicalculator.com';
  const TOOL_URLS = {
    bmi: SITE_URL + '/bmi-calculator.html',
    calorie: SITE_URL + '/calorie-calculator.html',
    whr: SITE_URL + '/whr-calculator.html',
    bodyfat: SITE_URL + '/body-fat-calculator.html',
    bmr: SITE_URL + '/bmr-tdee-calculator.html',
    ibw: SITE_URL + '/ideal-weight-calculator.html',
    ovulation: SITE_URL + '/ovulation-calculator.html',
    pregnancy: SITE_URL + '/pregnancy-calculator.html'
  };

  // State
  let currentTheme = 'dark';
  let currentUnit = 'metric'; // 'metric' or 'imperial'
  let activeTool = 'bmi';

  // DOM Elements
  const htmlRoot = document.documentElement;
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const btnUnitToggle = document.getElementById('btnUnitToggle');
  const unitIndicator = document.getElementById('unitIndicator');
  const btnSidePanel = document.getElementById('btnSidePanel');
  const toolTabs = document.querySelectorAll('.tab-btn');
  const calcViews = document.querySelectorAll('.calc-view');
  const linkFullReport = document.getElementById('linkFullReport');

  // Initialization
  async function init() {
    // 1. Set default dates for ovulation & pregnancy (today - 14 days)
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const dateStr = twoWeeksAgo.toISOString().split('T')[0];
    
    const ovInput = document.getElementById('ov_last_period');
    const pregInput = document.getElementById('preg_lmp');
    if (ovInput && !ovInput.value) ovInput.value = dateStr;
    if (pregInput && !pregInput.value) pregInput.value = dateStr;

    // 2. Load preferences from chrome.storage
    if (window.chrome && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(['theme', 'unit', 'activeTool']);
      if (stored.theme) currentTheme = stored.theme;
      if (stored.unit) currentUnit = stored.unit;
      if (stored.activeTool) activeTool = stored.activeTool;
    }

    applyTheme(currentTheme);
    applyUnits(currentUnit);
    switchTool(activeTool);

    attachListeners();
    recalculateAll();
  }

  // Event Listeners
  function attachListeners() {
    // Theme toggle
    btnThemeToggle.addEventListener('click', () => {
      currentTheme = (currentTheme === 'dark') ? 'light' : 'dark';
      applyTheme(currentTheme);
      saveState();
    });

    // Unit toggle
    btnUnitToggle.addEventListener('click', () => {
      currentUnit = (currentUnit === 'metric') ? 'imperial' : 'metric';
      applyUnits(currentUnit);
      recalculateAll();
      saveState();
    });

    // Side panel open
    btnSidePanel.addEventListener('click', async () => {
      if (window.chrome && chrome.sidePanel && chrome.sidePanel.open) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.windowId) {
            await chrome.sidePanel.open({ windowId: tab.windowId });
            window.close(); // Close popup when side panel opens
          }
        } catch (e) {
          console.warn('SidePanel open notice:', e);
        }
      }
    });

    // Tool Tab Navigation
    toolTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tool = tab.getAttribute('data-tool');
        switchTool(tool);
        saveState();
      });
    });

    // Real-time calculation triggers on any input change
    const allInputs = document.querySelectorAll('.calc-body input, .calc-body select');
    allInputs.forEach(input => {
      input.addEventListener('input', recalculateAll);
      input.addEventListener('change', recalculateAll);
    });

    // Body fat gender toggle (shows hip input for females)
    const bfGenderSelect = document.getElementById('bf_gender');
    if (bfGenderSelect) {
      bfGenderSelect.addEventListener('change', () => {
        const isFemale = bfGenderSelect.value === 'female';
        const hipGroup = document.getElementById('bfHipGroup');
        if (hipGroup) {
          hipGroup.classList.toggle('hidden', !isFemale);
        }
        recalculateAll();
      });
    }
  }

  // Theme Management
  function applyTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    } else {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    }
  }

  // Unit Management
  function applyUnits(unit) {
    unitIndicator.textContent = (unit === 'metric') ? 'Metric' : 'US / Imp';

    // BMI unit inputs
    const bmiMetric = document.getElementById('bmiHeightMetric');
    const bmiImp = document.getElementById('bmiHeightImperial');
    const lblBmiWeight = document.getElementById('lblBmiWeight');
    const bmiWeight = document.getElementById('bmi_weight');

    // Calorie unit inputs
    const calMetric = document.getElementById('calHeightMetric');
    const calImp = document.getElementById('calHeightImperial');
    const lblCalWeight = document.getElementById('lblCalWeight');
    const calWeight = document.getElementById('cal_weight');

    if (unit === 'imperial') {
      if (bmiMetric) bmiMetric.classList.add('hidden');
      if (bmiImp) bmiImp.classList.remove('hidden');
      if (lblBmiWeight) lblBmiWeight.textContent = 'Weight (lbs)';
      if (bmiWeight && bmiWeight.value == 70) bmiWeight.value = 154;

      if (calMetric) calMetric.classList.add('hidden');
      if (calImp) calImp.classList.remove('hidden');
      if (lblCalWeight) lblCalWeight.textContent = 'Weight (lbs)';
      if (calWeight && calWeight.value == 72) calWeight.value = 160;

      // Labels for WHR, Body Fat, BMR, IBW
      updateLabel('lblWhrWaist', 'Waist (in)');
      updateLabel('lblWhrHip', 'Hip (in)');
      updateLabel('lblBfHeight', 'Height (in)');
      updateLabel('lblBfWeight', 'Weight (lbs)');
      updateLabel('lblBfNeck', 'Neck (in)');
      updateLabel('lblBfWaist', 'Waist (in)');
      updateLabel('lblBfHip', 'Hip (in)');
      updateLabel('lblBmrHeight', 'Height (in)');
      updateLabel('lblBmrWeight', 'Weight (lbs)');
      updateLabel('lblIbwHeight', 'Height (in)');
      const ibwUnit = document.getElementById('ibwUnit');
      if (ibwUnit) ibwUnit.textContent = 'lbs';
    } else {
      if (bmiMetric) bmiMetric.classList.remove('hidden');
      if (bmiImp) bmiImp.classList.add('hidden');
      if (lblBmiWeight) lblBmiWeight.textContent = 'Weight (kg)';
      if (bmiWeight && bmiWeight.value == 154) bmiWeight.value = 70;

      if (calMetric) calMetric.classList.remove('hidden');
      if (calImp) calImp.classList.add('hidden');
      if (lblCalWeight) lblCalWeight.textContent = 'Weight (kg)';
      if (calWeight && calWeight.value == 160) calWeight.value = 72;

      updateLabel('lblWhrWaist', 'Waist (cm)');
      updateLabel('lblWhrHip', 'Hip (cm)');
      updateLabel('lblBfHeight', 'Height (cm)');
      updateLabel('lblBfWeight', 'Weight (kg)');
      updateLabel('lblBfNeck', 'Neck (cm)');
      updateLabel('lblBfWaist', 'Waist (cm)');
      updateLabel('lblBfHip', 'Hip (cm)');
      updateLabel('lblBmrHeight', 'Height (cm)');
      updateLabel('lblBmrWeight', 'Weight (kg)');
      updateLabel('lblIbwHeight', 'Height (cm)');
      const ibwUnit = document.getElementById('ibwUnit');
      if (ibwUnit) ibwUnit.textContent = 'kg';
    }
  }

  function updateLabel(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Tool Switching
  function switchTool(tool) {
    activeTool = tool;
    toolTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tool') === tool);
    });
    calcViews.forEach(v => {
      v.classList.toggle('active', v.id === 'view-' + tool);
    });

    if (linkFullReport && TOOL_URLS[tool]) {
      linkFullReport.href = TOOL_URLS[tool];
    }
  }

  // Save State to chrome.storage
  async function saveState() {
    if (window.chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        theme: currentTheme,
        unit: currentUnit,
        activeTool: activeTool
      });
    }
  }

  // --------------------------------------------------------------------------
  // CALCULATIONS ENGINE
  // --------------------------------------------------------------------------
  function recalculateAll() {
    calcBMI();
    calcCalorie();
    calcWHR();
    calcBodyFat();
    calcBMR();
    calcIBW();
    calcOvulation();
    calcPregnancy();
  }

  // 1. BMI Calculation
  function calcBMI() {
    let heightCm = 175;
    let weightKg = 70;

    if (currentUnit === 'imperial') {
      const ft = parseFloat(document.getElementById('bmi_height_ft')?.value) || 5;
      const inch = parseFloat(document.getElementById('bmi_height_in')?.value) || 9;
      heightCm = (ft * 12 + inch) * 2.54;
      const lbs = parseFloat(document.getElementById('bmi_weight')?.value) || 154;
      weightKg = lbs * 0.453592;
    } else {
      heightCm = parseFloat(document.getElementById('bmi_height')?.value) || 175;
      weightKg = parseFloat(document.getElementById('bmi_weight')?.value) || 70;
    }

    if (heightCm <= 0 || weightKg <= 0) return;

    const heightM = heightCm / 100;
    const bmi = +(weightKg / (heightM * heightM)).toFixed(2);
    const bmiValEl = document.getElementById('bmiValue');
    const bmiBadgeEl = document.getElementById('bmiBadge');
    const bmiBarIndicator = document.getElementById('bmiBarIndicator');
    const bmiHealthyRange = document.getElementById('bmiHealthyRange');
    const bmiPrime = document.getElementById('bmiPrime');

    if (bmiValEl) bmiValEl.textContent = bmi;

    let category = 'Normal weight';
    let badgeClass = 'badge-normal';
    if (bmi < 18.5) {
      category = 'Underweight';
      badgeClass = 'badge-under';
    } else if (bmi < 25) {
      category = 'Normal weight';
      badgeClass = 'badge-normal';
    } else if (bmi < 30) {
      category = 'Overweight';
      badgeClass = 'badge-over';
    } else {
      category = 'Obesity Class';
      badgeClass = 'badge-obese';
    }

    if (bmiBadgeEl) {
      bmiBadgeEl.textContent = category;
      bmiBadgeEl.className = 'res-badge ' + badgeClass;
    }

    // Gauge bar indicator position (scale 15 to 40)
    let pct = ((bmi - 15) / (40 - 15)) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (bmiBarIndicator) bmiBarIndicator.style.left = pct + '%';

    // Healthy weight range (18.5 - 24.9)
    const minW = (18.5 * heightM * heightM);
    const maxW = (24.9 * heightM * heightM);
    if (bmiHealthyRange) {
      if (currentUnit === 'imperial') {
        bmiHealthyRange.textContent = `${(minW * 2.20462).toFixed(1)} – ${(maxW * 2.20462).toFixed(1)} lbs`;
      } else {
        bmiHealthyRange.textContent = `${minW.toFixed(1)} – ${maxW.toFixed(1)} kg`;
      }
    }

    if (bmiPrime) {
      bmiPrime.textContent = (bmi / 25).toFixed(2);
    }
  }

  // 2. Calorie & Macro Calculation
  function calcCalorie() {
    const gender = document.getElementById('cal_gender')?.value || 'male';
    const age = parseFloat(document.getElementById('cal_age')?.value) || 28;
    const activity = parseFloat(document.getElementById('cal_activity')?.value) || 1.55;
    const goal = document.getElementById('cal_goal')?.value || 'maintain';

    let heightCm = 175;
    let weightKg = 72;

    if (currentUnit === 'imperial') {
      const ft = parseFloat(document.getElementById('cal_height_ft')?.value) || 5;
      const inch = parseFloat(document.getElementById('cal_height_in')?.value) || 9;
      heightCm = (ft * 12 + inch) * 2.54;
      const lbs = parseFloat(document.getElementById('cal_weight')?.value) || 160;
      weightKg = lbs * 0.453592;
    } else {
      heightCm = parseFloat(document.getElementById('cal_height')?.value) || 175;
      weightKg = parseFloat(document.getElementById('cal_weight')?.value) || 72;
    }

    // Mifflin-St Jeor equation
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;

    let tdee = bmr * activity;
    let targetCal = tdee;

    if (goal === 'mild_loss') targetCal -= 250;
    else if (goal === 'fat_loss') targetCal -= 500;
    else if (goal === 'mild_gain') targetCal += 250;
    else if (goal === 'bulk') targetCal += 500;

    targetCal = Math.max(1200, Math.round(targetCal));

    const calValue = document.getElementById('calValue');
    if (calValue) calValue.innerHTML = `${targetCal.toLocaleString()} <span class="unit-sub">kcal/day</span>`;

    // Macronutrient Split: 30% Protein (4 kcal/g), 45% Carbs (4 kcal/g), 25% Fat (9 kcal/g)
    const pGrams = Math.round((targetCal * 0.30) / 4);
    const cGrams = Math.round((targetCal * 0.45) / 4);
    const fGrams = Math.round((targetCal * 0.25) / 9);

    const mP = document.getElementById('macroProtein');
    const mC = document.getElementById('macroCarbs');
    const mF = document.getElementById('macroFats');
    if (mP) mP.textContent = `${pGrams}g`;
    if (mC) mC.textContent = `${cGrams}g`;
    if (mF) mF.textContent = `${fGrams}g`;
  }

  // 3. WHR Calculation
  function calcWHR() {
    const gender = document.getElementById('whr_gender')?.value || 'male';
    const waist = parseFloat(document.getElementById('whr_waist')?.value) || 82;
    const hip = parseFloat(document.getElementById('whr_hip')?.value) || 98;

    if (waist <= 0 || hip <= 0) return;

    const ratio = +(waist / hip).toFixed(2);
    const whrValue = document.getElementById('whrValue');
    const whrBadge = document.getElementById('whrBadge');
    const whrShape = document.getElementById('whrShape');
    const whrRiskDetail = document.getElementById('whrRiskDetail');

    if (whrValue) whrValue.textContent = ratio;

    let risk = 'Low Health Risk';
    let badgeClass = 'badge-normal';
    let isApple = false;

    if (gender === 'male') {
      if (ratio < 0.90) { risk = 'Low Health Risk'; badgeClass = 'badge-normal'; }
      else if (ratio < 1.0) { risk = 'Moderate Risk'; badgeClass = 'badge-over'; }
      else { risk = 'High Health Risk'; badgeClass = 'badge-obese'; isApple = true; }
    } else {
      if (ratio < 0.80) { risk = 'Low Health Risk'; badgeClass = 'badge-normal'; }
      else if (ratio < 0.85) { risk = 'Moderate Risk'; badgeClass = 'badge-over'; }
      else { risk = 'High Health Risk'; badgeClass = 'badge-obese'; isApple = true; }
    }

    if (whrBadge) {
      whrBadge.textContent = risk;
      whrBadge.className = 'res-badge ' + badgeClass;
    }
    if (whrShape) {
      whrShape.textContent = isApple ? 'Apple (Android)' : 'Pear (Gynoid)';
    }
    if (whrRiskDetail) {
      whrRiskDetail.textContent = isApple ? 'Elevated central visceral fat' : 'Optimal cardiometabolic tier';
    }
  }

  // 4. Body Fat % Calculation (US Navy Formula)
  function calcBodyFat() {
    const gender = document.getElementById('bf_gender')?.value || 'male';
    let height = parseFloat(document.getElementById('bf_height')?.value) || 175;
    let weight = parseFloat(document.getElementById('bf_weight')?.value) || 72;
    let neck = parseFloat(document.getElementById('bf_neck')?.value) || 38;
    let waist = parseFloat(document.getElementById('bf_waist')?.value) || 82;
    let hip = parseFloat(document.getElementById('bf_hip')?.value) || 98;

    // Convert to cm / kg if imperial
    if (currentUnit === 'imperial') {
      height *= 2.54;
      weight *= 0.453592;
      neck *= 2.54;
      waist *= 2.54;
      hip *= 2.54;
    }

    let bf = 15;
    try {
      if (gender === 'male') {
        const diff = waist - neck;
        if (diff > 0 && height > 0) {
          bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(height)) - 450;
        }
      } else {
        const sum = waist + hip - neck;
        if (sum > 0 && height > 0) {
          bf = 495 / (1.29579 - 0.35004 * Math.log10(sum) + 0.22100 * Math.log10(height)) - 450;
        }
      }
    } catch (e) {
      bf = 15;
    }

    bf = Math.max(3, Math.min(60, +bf.toFixed(1)));
    const fatMassKg = weight * (bf / 100);
    const leanMassKg = weight - fatMassKg;

    const bfValEl = document.getElementById('bfValue');
    const bfBadgeEl = document.getElementById('bfBadge');
    const bfFatMass = document.getElementById('bfFatMass');
    const bfLeanMass = document.getElementById('bfLeanMass');

    if (bfValEl) bfValEl.innerHTML = `${bf} <span class="unit-sub">%</span>`;

    let tier = 'Fitness';
    let badgeClass = 'badge-normal';
    if (gender === 'male') {
      if (bf < 6) { tier = 'Essential Fat'; badgeClass = 'badge-under'; }
      else if (bf < 14) { tier = 'Athletes'; badgeClass = 'badge-normal'; }
      else if (bf < 18) { tier = 'Fitness'; badgeClass = 'badge-normal'; }
      else if (bf < 25) { tier = 'Average'; badgeClass = 'badge-over'; }
      else { tier = 'Obese'; badgeClass = 'badge-obese'; }
    } else {
      if (bf < 14) { tier = 'Essential Fat'; badgeClass = 'badge-under'; }
      else if (bf < 21) { tier = 'Athletes'; badgeClass = 'badge-normal'; }
      else if (bf < 25) { tier = 'Fitness'; badgeClass = 'badge-normal'; }
      else if (bf < 32) { tier = 'Average'; badgeClass = 'badge-over'; }
      else { tier = 'Obese'; badgeClass = 'badge-obese'; }
    }

    if (bfBadgeEl) {
      bfBadgeEl.textContent = tier;
      bfBadgeEl.className = 'res-badge ' + badgeClass;
    }

    if (bfFatMass && bfLeanMass) {
      if (currentUnit === 'imperial') {
        bfFatMass.textContent = `${(fatMassKg * 2.20462).toFixed(1)} lbs`;
        bfLeanMass.textContent = `${(leanMassKg * 2.20462).toFixed(1)} lbs`;
      } else {
        bfFatMass.textContent = `${fatMassKg.toFixed(1)} kg`;
        bfLeanMass.textContent = `${leanMassKg.toFixed(1)} kg`;
      }
    }
  }

  // 5. BMR & TDEE Calculation
  function calcBMR() {
    const gender = document.getElementById('bmr_gender')?.value || 'male';
    const age = parseFloat(document.getElementById('bmr_age')?.value) || 30;
    let height = parseFloat(document.getElementById('bmr_height')?.value) || 175;
    let weight = parseFloat(document.getElementById('bmr_weight')?.value) || 70;

    if (currentUnit === 'imperial') {
      height *= 2.54;
      weight *= 0.453592;
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;
    bmr = Math.round(bmr);

    const bmrValEl = document.getElementById('bmrValue');
    const bmrSed = document.getElementById('bmrSedentary');
    const bmrMod = document.getElementById('bmrModerate');

    if (bmrValEl) bmrValEl.innerHTML = `${bmr.toLocaleString()} <span class="unit-sub">kcal</span>`;
    if (bmrSed) bmrSed.textContent = `${Math.round(bmr * 1.2).toLocaleString()} kcal`;
    if (bmrMod) bmrMod.textContent = `${Math.round(bmr * 1.55).toLocaleString()} kcal`;
  }

  // 6. Ideal Body Weight Calculation
  function calcIBW() {
    const gender = document.getElementById('ibw_gender')?.value || 'male';
    let heightCm = parseFloat(document.getElementById('ibw_height')?.value) || 175;

    if (currentUnit === 'imperial') {
      heightCm *= 2.54;
    }

    const heightInches = heightCm / 2.54;
    const over5ft = Math.max(0, heightInches - 60);

    // Devine
    const devine = (gender === 'male') ? (50 + 2.3 * over5ft) : (45.5 + 2.3 * over5ft);
    // Robinson
    const robinson = (gender === 'male') ? (52 + 1.9 * over5ft) : (49 + 1.7 * over5ft);
    // Average
    const avgKg = (devine + robinson) / 2;

    const ibwValEl = document.getElementById('ibwValue');
    const ibwDev = document.getElementById('ibwDevine');
    const ibwRob = document.getElementById('ibwRobinson');

    if (currentUnit === 'imperial') {
      if (ibwValEl) ibwValEl.innerHTML = `${(avgKg * 2.20462).toFixed(1)} <span class="unit-sub">lbs</span>`;
      if (ibwDev) ibwDev.textContent = `${(devine * 2.20462).toFixed(1)} lbs`;
      if (ibwRob) ibwRob.textContent = `${(robinson * 2.20462).toFixed(1)} lbs`;
    } else {
      if (ibwValEl) ibwValEl.innerHTML = `${avgKg.toFixed(1)} <span class="unit-sub">kg</span>`;
      if (ibwDev) ibwDev.textContent = `${devine.toFixed(1)} kg`;
      if (ibwRob) ibwRob.textContent = `${robinson.toFixed(1)} kg`;
    }
  }

  // 7. Ovulation & Fertility Calculation
  function calcOvulation() {
    const lmpVal = document.getElementById('ov_last_period')?.value;
    const cycleLen = parseInt(document.getElementById('ov_cycle_len')?.value, 10) || 28;

    if (!lmpVal) return;

    const lmp = new Date(lmpVal);
    if (isNaN(lmp.getTime())) return;

    // Ovulation occurs approximately (cycleLen - 14) days after LMP
    const lutealPhase = 14;
    const ovDays = cycleLen - lutealPhase;
    const ovDate = new Date(lmp.getTime() + ovDays * 24 * 60 * 60 * 1000);

    // Fertile window: 5 days before ovulation to ovulation day
    const winStart = new Date(ovDate.getTime() - 5 * 24 * 60 * 60 * 1000);
    const nextPeriod = new Date(lmp.getTime() + cycleLen * 24 * 60 * 60 * 1000);

    const fmt = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const ovDayText = document.getElementById('ovDayText');
    const ovWindowText = document.getElementById('ovWindowText');
    const ovNextPeriod = document.getElementById('ovNextPeriod');

    if (ovDayText) ovDayText.textContent = fmt(ovDate);
    if (ovWindowText) ovWindowText.textContent = `${fmt(winStart)} – ${fmt(ovDate)}`;
    if (ovNextPeriod) ovNextPeriod.textContent = fmt(nextPeriod);
  }

  // 8. Pregnancy Due Date Calculation (Naegele's Rule)
  function calcPregnancy() {
    const lmpVal = document.getElementById('preg_lmp')?.value;
    if (!lmpVal) return;

    const lmp = new Date(lmpVal);
    if (isNaN(lmp.getTime())) return;

    // EDD = LMP + 280 days
    const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffDays = Math.max(0, Math.floor((today - lmp) / (24 * 60 * 60 * 1000)));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    const pregDueDate = document.getElementById('pregDueDate');
    const pregAgeText = document.getElementById('pregAgeText');
    const pregTrimesterBadge = document.getElementById('pregTrimesterBadge');

    if (pregDueDate) {
      pregDueDate.textContent = edd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (pregAgeText) {
      pregAgeText.textContent = `${weeks}w ${days}d`;
    }

    let trimester = '1st Trimester';
    if (weeks >= 28) trimester = '3rd Trimester';
    else if (weeks >= 14) trimester = '2nd Trimester';

    if (pregTrimesterBadge) {
      pregTrimesterBadge.textContent = trimester;
    }
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
