# aBMICalculator - Official Chrome Extension (Manifest V3)

> Clinical-grade health, fitness, and biometric calculators in your Chrome browser popup, side panel, and omnibox.

---

## 🌟 Features

- **8 Clinical Calculators**:
  1. **BMI Calculator**: WHO adult classification, BMI prime, healthy weight range.
  2. **Calorie & Macro**: Mifflin-St Jeor TDEE energy targets, customized protein/carbs/fat split.
  3. **Waist-to-Hip Ratio (WHR)**: Cardiometabolic risk stratification & body shape analysis.
  4. **Body Fat % (US Navy)**: Lean body mass & fat percentage.
  5. **BMR & TDEE**: Basal metabolic rate comparisons.
  6. **Ideal Body Weight**: Devine, Robinson, and clinical average targets.
  7. **Ovulation & Fertility**: Fertile window & peak conception probability.
  8. **Pregnancy Due Date**: Naegele's rule EDD & gestational age tracking.
- **100% Offline & Instant**: Zero latency, no external API calls required for computations.
- **Chrome Side Panel**: Dock the calculators next to medical research, nutrition logs, or patient EHRs.
- **Omnibox Address Bar Shortcuts**: Type `bmi <weight> <height>` (e.g. `bmi 75 180`) directly into Chrome's URL bar for an instant live calculation!
- **Dark & Light Themes**: Auto-saved to `chrome.storage.local`.
- **Metric & US Imperial Units**: Instant 1-click unit conversion.

---

## 📦 How to Install in Google Chrome (Developer / Unpacked Mode)

1. Download or extract the `abmi-chrome-extension` directory (or download `abmi-chrome-extension.zip` and unzip it).
2. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the `abmi-chrome-extension` folder.
6. The **aBMICalculator** extension icon will now appear in your browser toolbar! Click the extension pin icon to pin it for instant 1-click access.

---

## 🚀 Omnibox Usage

1. Click Chrome's address bar (or press `Ctrl+L` / `Cmd+L`).
2. Type `bmi` followed by a space.
3. Type your weight (kg) and height (cm):
   ```
   bmi 72 178
   ```
4. Chrome will instantly show your calculated BMI and WHO category in the suggestion dropdown!
5. Press `Enter` to open the full interactive clinical report on `aBMICalculator.com`.

---

## 📄 License

GPL-2.0+ &bull; Free forever for personal and commercial usage. Powered by [aBMICalculator.com](https://www.abmicalculator.com).
