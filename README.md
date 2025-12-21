# uiframe

[![Tests](https://github.com/dduraipandian/uiframe/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dduraipandian/uiframe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D%2020-brightgreen)](https://nodejs.org/)

A lightweight, opinionated composable UI framework for building professional web interfaces. Built on top of Bootstrap 5, `uiframe` provides high-performance, reusable UI components with minimal configuration and native ES Module support.

## Why uiframe?

`uiframe` is designed as a utility wrapper for Bootstrap 5. It provides a set of complex components (like resizable split panes, searchable dropdowns, and recursive trees) that are easy to drop into any project without the overhead of a heavy framework.

## Features

- **🚀 Performance Oriented**: Efficient DOM manipulation and clean lifecycle management.
- **🎨 Modern Aesthetics**: Professional styling out of the box with Bootstrap 5 integration.
- **📂 Component Library**:
  - **Table**: Feature-rich data grid with search, pagination, and JSON/CSV export.
  - **Tree**: Dynamic, recursive tree view with lazy loading and state persistence.
  - **ContextMenu**: Flexible right-click menus with async initialization.
  - **DropDown**: Compact dropdown with optional search, item animations, and event-driven selection.
  - **Tab**: Dynamic tab management for complex layouts.
  - **Spinner**: Customizable loading indicators with event handling.
  - **Split**: Two or multi-pane layout with a draggable divider
  - **Online**: Real-time network status monitoring with automatic Toast notifications.
- **🧪 Robust Testing**: Comprehensive unit test suite using Jest and JSDOM.

## Getting Started

### Prerequisites

- **Node.js** (v20 or higher; tested on v20, v22, v24)
- **Modern browser** with ES Module support (all modern browsers: Chrome 61+, Firefox 67+, Safari 11+, Edge 79+)

### Installation

Clone locally for development:
```bash
git clone https://github.com/dduraipandian/uiframe.git
cd uiframe
npm install
```

### Quick Start

All components are ES Modules. Here's a simple example using the `Spinner` component:

```html
<!-- In your HTML -->
<div id="app-container"></div>

<script type="module">
  import { Spinner } from "./components/spinner.js";
  // or import { Spinner } from "uiframe"; if installed via npm

  const mySpinner = new Spinner({
    name: "MainLoader",
    options: { 
      loadingText: "Loading data...", 
      spinnerColor: "text-primary" 
    },
  });

  // Render into a container
  mySpinner.renderInto("app-container");

  // Control visibility
  mySpinner.show();
  setTimeout(() => mySpinner.hide(), 2000);
</script>
```

## Documentation

To run the interactive documentation and live demos locally:

```bash
npm install
npm run dev
# Visit http://localhost:8000 in your browser
```

The docs include live demos for all components with interactive examples.

## Development

### Running Tests

We use Jest and JSDOM for unit testing:

```bash
npm install  # Install dev dependencies
npm test     # Run full test suite
```

All tests (38 tests across 9 suites) are passing. See [tests/](tests/) for examples.

### Code Quality

```bash
npm run lint    # Run ESLint style checker
npm run format  # Auto-format code with Prettier
```

### Components Structure

All core components are located in [components/](components/):

| File | Purpose |
|------|---------|
| `base.js` | Core component classes (`Component`, `EmitterComponent`) |
| `utils.js` | Shared utility functions (deep value access, etc.) |
| `spinner.js` | Loading indicator with custom styling |
| `table.js` | Data grid with search, pagination, export |
| `tree.js` | Recursive tree view with lazy-loading & state persistence |
| `tab.js` | Dynamic tab management |
| `dropdown.js` | Searchable dropdown component |
| `contextmenu.js` | Right-click context menus |
| `online.js` | Network status monitoring |
| `split.js` | Resizable split pane layouts |

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork & Clone** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make changes** and add tests if applicable
4. **Run tests & lint**: `npm test && npm run lint`
5. **Commit** with clear messages
6. **Push** and open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is properly formatted (`npm run format`)
- No linting errors (`npm run lint`)
- Changes include relevant test updates

## License

MIT © 2025 [dduraipandian](https://github.com/dduraipandian). See [LICENSE](LICENSE) for details.
