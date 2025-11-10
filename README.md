# Yoink - Design System Extractor

**Yoink** is a Chrome extension that scans any web page and extracts its design system tokens into clean, organized YAML format — perfect for AI analysis or documentation.

## ✨ Features

- 🎨 **CSS Variable Extraction**: Captures semantic CSS custom properties with theme variants
- 🌓 **Dark Mode Detection**: Automatically detects and shows light/dark theme values
- 🧩 **Component Pattern Analysis**: Detects 30+ UI component types (buttons, cards, inputs, modals, etc.)
- 📐 **Typography Scale Detection**: Identifies type scales, line-height patterns, and heading hierarchies
- 📊 **Usage Tracking**: Shows how many elements use each color, shadow, or spacing value
- 🔍 **Duplicate Detection**: Identifies CSS variables with the same color values
- 📋 **Copy to Clipboard**: Instantly copy the generated YAML
- 💾 **Download as .yaml**: Save the design system as a YAML file
- 🔒 **100% Private**: No network calls, no data collection — everything runs locally in your browser
- ⚡ **Performance Optimized**: DOM caching and smart element sampling for fast extraction

## 🚀 Installation

### From Chrome Web Store (Coming Soon)

Once published, you'll be able to install Yoink directly from the Chrome Web Store with one click.

### From Source

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd yoink
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` folder

## 📖 Usage

1. Navigate to any website (e.g., https://ui.shadcn.com)
2. Click the Yoink extension icon in your toolbar
3. Click "Scan Page Styles"
4. Review the extracted design tokens
5. Copy or download the Markdown output

## 🏗️ Project Structure

```
yoink/
├── src/
│   ├── scripts/
│   │   ├── background.ts      # Service worker
│   │   ├── contentScript.ts   # Page style extraction
│   │   └── popup.ts           # UI and markdown generation
│   ├── styles/
│   │   └── popup.css          # Popup styling
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── popup.html             # Popup UI
├── dist/                      # Compiled extension (generated)
├── icons/                     # Extension icons
├── manifest.json              # Chrome extension manifest
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🛠️ Development

### Scripts

- `npm run build` - Build the extension (TypeScript → JavaScript + copy assets)
- `npm run watch` - Watch mode for development
- `npm run clean` - Clean the dist folder
- `npm run package` - Create a zip file for distribution

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run build` (or `npm run watch` for auto-rebuild)
3. Go to `chrome://extensions/` and click refresh on the Yoink extension
4. Test your changes

### Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Chrome Extension Manifest V3** - Latest extension format
- **Vanilla JS/HTML/CSS** - No framework dependencies

## 📝 What It Extracts

### Design Tokens
- **CSS Variables**: Brand colors, semantic colors, spacing, radius values with theme variants
- **Colors**: Color palette with usage tracking and duplicate detection
- **Typography**: Font families, type scale analysis, heading hierarchy, line-height patterns
- **Spacing**: Spacing scale with base unit detection (4px, 8px systems, etc.)
- **Shadows**: Elevation system with 6 levels (subtle to extra heavy)
- **Layout**: Container patterns, breakpoints, grid systems, flexbox patterns
- **Icons**: SVG patterns, icon sizes, icon font detection
- **Animations**: Transition durations, easing functions, animation patterns
- **Z-Index Hierarchy**: Layering system (base, dropdown, modal, toast levels)

### Components (30+ Types)
- **Forms**: Buttons, inputs, dropdowns, toggles, sliders, comboboxes, date pickers, color pickers
- **Navigation**: Breadcrumbs, pagination, tabs, navigation items
- **Feedback**: Alerts, modals, tooltips, badges, skeleton loaders, empty states
- **Content**: Cards, tables, headings, avatars, dividers
- **Interactive**: Accordions, progress bars, search bars

### Advanced Features
- ✅ Light/dark theme variant detection
- ✅ Material Design pattern recognition
- ✅ Component state extraction (hover, focus, active, disabled)
- ✅ Responsive breakpoint analysis
- ✅ OKLCH/LAB color format support with RGB conversion
- ✅ Filters out Tailwind utility variables and browser extension variables
- ✅ DOM structure extraction with semantic analysis

## 📦 Building for Production

```bash
npm run package
```

This creates `yoink-extension.zip` in the root directory, ready for Chrome Web Store submission.

## 🔒 Privacy & Security

Yoink takes your privacy seriously:

- ✅ **No Network Requests**: All processing happens locally in your browser
- ✅ **No Data Collection**: We don't track, store, or transmit any data
- ✅ **No Analytics**: Zero tracking or telemetry
- ✅ **Minimal Permissions**: Only requests `activeTab`, `scripting`, and `clipboardWrite`
- ✅ **Open Source**: Full source code available for audit
- ✅ **CORS-Safe**: Gracefully handles cross-origin stylesheets

## 🔄 Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and updates.

**Current Version:** 2.1.3

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow existing code style and TypeScript conventions
- Add JSDoc comments for public functions
- Test on multiple websites before submitting PRs
- Update CHANGELOG.md with your changes
