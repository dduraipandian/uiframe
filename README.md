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
- **📂 Component Library** (Package-based):
  - **Table**: Feature-rich data grid with search, pagination, and JSON/CSV export.
  - **Tree**: Dynamic, recursive tree view with lazy loading and state persistence.
  - **ContextMenu**: Flexible right-click menus with manual positioning.
  - **DropDown**: Compact dropdown with search, animations, and event-driven selection.
  - **Tab**: Dynamic tab management for complex layouts.
  - **Spinner**: Customizable loading indicators.
  - **Split**: Draggable multi-pane layouts.
  - **Online**: Real-time network status monitoring.
- **🧪 Robust Testing**: Comprehensive unit test suite (40+ tests) passing across all components.

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

All components are built as browser-ready bundles and ESM/CJS packages.

#### In the Browser (IIFE)

Load `core.min.js` first, followed by the components you need. All components are available under the global `uiframe` object.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
/>
<!-- Load UI Frame CSS (base utilities + component styles) -->
<link rel="stylesheet" href="./packages/core/dist/base.css" />
<link rel="stylesheet" href="./packages/table/dist/table.css" />

<script src="./packages/core/dist/core.min.js"></script>
<script src="./packages/table/dist/table.min.js"></script>

<div id="app-container"></div>

<script>
  // Components are automatically attached to the window.uiframe object
  const myTable = new uiframe.Table({
    name: "MainTable",
    options: {
      search: true,
      pagination: true,
    },
  });

  myTable.renderInto("app-container");
  myTable.updateData([{ id: 1, name: "Sample Item" }]);
</script>
```

#### Using ESM (Modern Bundlers)

```javascript
import { Table } from "@uiframe/table";
import "@uiframe/core/style"; // Base utilities
import "@uiframe/table/style"; // Component styles

const myTable = new Table({ name: "Users" });
myTable.renderInto(document.body);
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

`uiframe` follows a modular structure where each component is a separate package in the `packages/` directory.

| Package        | Purpose                                                      |
| -------------- | ------------------------------------------------------------ |
| `core`         | Base classes (`Component`, `EmitterComponent`) and `Utility` |
| `spinner`      | Loading indicator with custom styling                        |
| `table`        | Data grid with search, pagination, export                    |
| `tree`         | Recursive tree view with lazy-loading                        |
| `tab`          | Dynamic tab management                                       |
| `dropdown`     | Searchable dropdown component                                |
| `contextmenu`  | Right-click context menus                                    |
| `online`       | Network status monitoring                                    |
| `split`        | Resizable split pane layouts                                 |
| `notification` | Toast and modal-based notifications                          |

Core source code is located in `components/`. Packages in `packages/` build these into their respective `dist/` folders using Rollup.

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
