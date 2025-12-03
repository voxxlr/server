# Voxxlr Refactoring Plan

## Project Overview

This project consists of three subdomains:
- **www.voxxlr.com** - Marketing/landing page with login
- **app.voxxlr.com** - Application launchpad with 10+ productivity apps
- **doc.voxxlr.com** - Document/dataset API and 3D/2D viewer engine

### Current Stack
- Express.js servers with Mustache templating
- Vanilla JavaScript with 30+ custom Web Components (Shadow DOM)
- Custom CSS files (~600 lines total across 3 files)
- Docker + Nginx for deployment

### Target Stack
- **Vite** (build tooling + dev server)
- **Tailwind CSS** (styling)
- **Lit** (Web Components)
- **Alpine.js** (lightweight interactivity)
- **Static Hosting** (Cloud Storage/CDN for HTML/JS/CSS)
- **Cloud Functions** (API routes only)

### Architecture Change

**Before (Server-Side Rendering):**
```
Browser → Express + Mustache → Dynamic HTML with {{{variables}}}
```

**After (Static + API):**
```
Browser → Static Files (CDN) → Vite-built HTML/JS/CSS
              ↓
         Cloud Functions → API routes only (/api/*)
```

**Configuration Strategy:**
| Config Type | Approach |
|-------------|----------|
| Domains (app_domain, etc.) | Build-time env vars via Vite |
| OAuth config | Runtime API call to `/api/config` |
| Demo URLs | Build-time or config API |
| User tokens | Runtime auth flow (unchanged) |

**Local Development:**
```
Vite Dev Server (port 5173) → Hot reload, env vars from .env
         ↓
    Proxy to Cloud Functions emulator or mock API
```

---

## Phase 1: Vite + Tailwind CSS Setup

### Scope
| File | Lines | Description |
|------|-------|-------------|
| `www/client/index.css` | ~200 | Landing page styles |
| `app/client/ui.css` | ~130 | Core UI variables & button styles |
| Component inline styles | ~2000+ | Styles embedded in 30+ web components |

### Tasks

#### 1.1 Setup Tailwind CSS with Vite
```
/workspaces/server/
├── vite.config.js          # Shared Vite config
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS with Tailwind
└── src/
    └── styles/
        └── globals.css     # Tailwind base + custom utilities
```

#### 1.2 Create Tailwind Design Tokens
Map existing CSS variables to Tailwind config:
```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#0075FF',
      important: '#FF7500', 
      active: '#00aa00',
      border: '#ccc',
      hover: '#EAEAEA',
      panel: '#EAEAEA',
      // Status colors
      info: '#0075FF',
      warn: '#ffcc00',
      severe: '#cc3300',
      resolved: '#339900'
    }
  }
}
```

#### 1.3 Migrate Each Subdomain (Order)
1. **www** (simplest - 1 component, 1 CSS file)
2. **doc** (viewer pages, API docs)
3. **app** (most complex - 30+ components)

#### 1.4 Component Style Migration Strategy
For each web component with inline `<style>`:
1. Extract styles to analyze
2. Replace with Tailwind classes
3. Use `@apply` sparingly for complex patterns
4. Keep Shadow DOM encapsulation (Tailwind can work with Shadow DOM via `@layer`)

---

## Phase 2: Web Components → Lit Migration

### Current Pattern (Vanilla)
```javascript
class VxHeader extends HTMLElement {
    constructor() {
        super();
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.innerHTML = `<style>...</style><div>...</div>`;
    }
}
customElements.define("vx-header", VxHeader);
```

### Target Pattern (Lit)
```javascript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('vx-header')
class VxHeader extends LitElement {
    static styles = css`...`; // or Tailwind
    
    @property() name = '';
    
    render() {
        return html`<div>...</div>`;
    }
}
```

### Migration Order (by complexity)

#### Simple Components (display-only)
- `va-login`
- `va-menu`

#### Interactive Components
- `vx-header`
- `vx-listing`
- `vx-overlay`

#### Complex Components
- `vx-viewer`
- `vx-inventory`
- Editor tools

#### Viewer Components
- `2d.js`
- `3d.js`
- Overlay components

### Components Inventory (30+)
| Subdomain | Component | Complexity | Priority |
|-----------|-----------|------------|----------|
| www | `va-login` | Low | 1 |
| app | `va-menu` | Low | 2 |
| app | `va-links` | Medium | 3 |
| app | `vx-header` | Medium | 4 |
| app | `vx-file` | Medium | 5 |
| app | `vx-listing` | Medium | 6 |
| app | `vx-overlay` | Medium | 7 |
| app | `vx-hierarchy` | High | 8 |
| app | `vx-inventory` | High | 9 |
| app | `vx-viewer` | High | 10 |
| app | `vx-viewpoint` | Medium | 11 |
| app/editor | `va-camera` | Medium | 12 |
| app/editor | `va-filter` | Medium | 13 |
| app/editor | `va-icon` | Medium | 14 |
| app/editor | `va-image` | Medium | 15 |
| app/editor | `va-import` | Medium | 16 |
| app/editor | `va-line` | Medium | 17 |
| app/editor | `va-link` | Medium | 18 |
| app/editor | `va-polygon` | Medium | 19 |
| app/editor | `va-text` | Medium | 20 |
| app/volumetric | `va-flood` | Medium | 21 |
| app/volumetric | `va-elevation` | Medium | 22 |
| app/volumetric | `va-volume` | Medium | 23 |
| app/volumetric | `va-profile` | Medium | 24 |
| app/upload | `va-config` | Medium | 25 |
| app/upload | `va-manager` | Medium | 26 |
| app/upload | `va-dropzone` | Medium | 27 |
| doc | Viewer overlays | High | 28+ |

---

## Phase 3: Alpine.js Integration

### Use Cases
- Simple interactive elements that don't need full components
- Form handling in landing page
- Toggle states, dropdowns, modals
- Progressive enhancement

### Examples
```html
<!-- Login dropdown -->
<div x-data="{ open: false }">
    <button @click="open = !open">Login</button>
    <div x-show="open" x-cloak>...</div>
</div>
```

---

## Phase 4: Vite Build System

### New Project Structure
```
/workspaces/server/
├── vite.config.js
├── package.json              # Workspace root
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── components/           # Shared Lit components
│   │   ├── vx-header.ts
│   │   ├── vx-viewer.ts
│   │   └── ...
│   ├── styles/
│   │   └── globals.css
│   └── lib/                  # Shared utilities
├── www/
│   ├── index.html
│   ├── login.html
│   └── vite.config.js        # Extends root
├── app/
│   ├── index.html
│   ├── launchpad.html
│   └── vite.config.js
└── doc/
    ├── index.html
    └── vite.config.js
```

---

## Phase 5: Cloud Functions (Future)

Replace Express servers with:
- **Google Cloud Functions** or **Cloud Run**
- Keep the `_platform/gce` abstractions
- Use serverless-compatible routing

---

## Execution Timeline

### Step 1: Setup (Day 1)
- [ ] Initialize Vite at project root
- [ ] Configure Tailwind CSS
- [ ] Create shared `globals.css` with design tokens
- [ ] Test build pipeline

### Step 2: www Subdomain (Days 2-3)
- [ ] Convert `index.css` → Tailwind classes
- [ ] Convert `va-login.js` → Lit component
- [ ] Update HTML files
- [ ] Test login flow

### Step 3: app Subdomain - Core (Days 4-7)
- [ ] Convert `ui.css` → Tailwind
- [ ] Convert core components: `vx-header`, `va-menu`, `va-links`
- [ ] Convert listing components: `vx-listing`, `vx-inventory`
- [ ] Test launchpad

### Step 4: app Subdomain - Editor (Days 8-12)
- [ ] Convert all `va-*` editor components
- [ ] Test editor functionality

### Step 5: doc Subdomain (Days 13-15)
- [ ] Convert viewer pages
- [ ] Convert overlay components
- [ ] Test API docs

### Step 6: Integration & Testing (Days 16-18)
- [ ] Full integration testing
- [ ] Performance optimization
- [ ] Documentation update

---

## Open Questions

1. **TypeScript?** Should we migrate to TypeScript while converting to Lit?
2. **Design refresh?** Keep exact current styles or modernize?
3. **Gradual rollout?** Deploy incrementally or all at once?
4. **Testing?** Add unit tests during migration?

---

## Progress Tracking

### Phase 1: Tailwind CSS
- [ ] Setup complete
- [ ] www subdomain migrated
- [ ] doc subdomain migrated
- [ ] app subdomain migrated

### Phase 2: Lit Components
- [ ] www components migrated
- [ ] app core components migrated
- [ ] app editor components migrated
- [ ] doc components migrated

### Phase 3: Alpine.js
- [ ] Identified use cases
- [ ] Implemented where needed

### Phase 4: Vite
- [ ] Build system working
- [ ] All subdomains building
- [ ] Production builds optimized

### Phase 5: Cloud Functions
- [ ] API routes migrated
- [ ] Authentication working
- [ ] Deployment configured
