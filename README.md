# Test Locator Pro

Chrome extension that scans any webpage and generates **copy-ready test automation locators** for multiple frameworks, with smart naming and **cross-language deduplication** for multi-country sites.

## Features

- **Multi-framework output**: Java Selenium (`@FindBy`), Java `By.*`, Python Selenium, C# Selenium, Playwright (JS/Java/Python), Cypress, WebdriverIO, TestCafe, Robot Framework
- **Configurable locator priority**: drag-and-drop order (id → data-testid → name → css → structural xpath, etc.)
- **Standard naming**: `btn_submit`, `inp_email`, `lnk_home`, `ddl_country`, `chk_terms`, etc.
- **Nested coverage**: shadow DOM, iframes, hidden modals, and auto-opened popups
- **63-domain dedup**: stores structural fingerprints globally so the same element across localized domains is captured once

## Install

1. Icons are already included. To regenerate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
```

Or with Node.js:

```bash
node scripts/generate-icons.js
```

2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `test-locator-pro` folder

## Usage

1. Open any page you want to automate
2. Click the **Test Locator Pro** extension icon
3. Choose your framework and locator priority
4. Click **Scan Page**
5. Open **Results Panel** to copy individual locators or the full Page Object class

### Cross-domain deduplication

When **Cross-domain dedup (63 locales)** is enabled, locators are fingerprinted by **structure and stable attributes** (id, name, data-* attributes, DOM path) — **not visible text**. If you scan `example.com/en` and later `example.de`, duplicate elements are skipped automatically.

Use **Clear cross-domain locator store** in the popup to reset the global registry.

### Popup auto-scan

With **Auto-open popups** enabled, the extension clicks modal triggers (Bootstrap modals, `aria-haspopup`, etc.), extracts locators from opened dialogs, then closes them. Limited to 15 triggers per scan for safety.

## Example output (Java Page Factory)

```java
@FindBy(id = "submit-btn")
private WebElement btn_submit;

@FindBy(css = "input[name=\"email\"]")
private WebElement inp_email;

@FindBy(xpath = "//button[@data-testid=\"close-modal\"]")
private WebElement btn_close_modal;
```

## Project structure

```
test-locator-pro/
├── manifest.json
├── background.js
├── content/content.js
├── popup/
├── sidepanel/
└── src/lib/
    ├── locatorEngine.js      # Locator generation
    ├── naming.js             # btn_, inp_, lnk_ conventions
    ├── dedup.js              # Cross-domain fingerprint store
    ├── frameworkFormatters.js
    └── scanner.js            # Page + popup scanning
```

## Tips for multi-language sites

1. Prefer **id**, **data-testid**, **name**, and **structural xpath** in priority
2. Keep **xpathText** and **linkText** lower in priority (language-dependent)
3. Scan one reference locale first, then scan other domains — duplicates are skipped automatically

## License

MIT
