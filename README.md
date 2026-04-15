# Clockwrk

A modern, professional landing page for a design and development agency offering unlimited creative services for a fixed monthly fee.

## Overview

Clockwrk is a static website showcasing a subscription-based design and development service. The site emphasizes flexibility, speed, and unlimited project requests without the traditional agency overhead of interviews, calls, or long-term contracts.

### Key Value Propositions

- **Unlimited Requests** - Submit as many design and development requests as needed
- **Fixed Monthly Fee** - Predictable pricing with no surprises
- **Flexible Commitment** - Pause or cancel subscription anytime
- **Quick Turnaround** - Initial results delivered in 2-3 days

## Technology Stack

This project is built with vanilla web technologies - no frameworks, no build tools, no dependencies:

- **HTML5** - Semantic markup with accessibility features (ARIA labels)
- **CSS3** - Modern CSS with custom properties, flexbox, and grid layouts
- **JavaScript (ES6+)** - Pure vanilla JavaScript for interactivity and animations

### External Resources

- [Lucide Icons](https://lucide.dev/) - Icon library loaded via CDN
- [Google Fonts](https://fonts.google.com/) - Orbitron font family

## Features

### Currently Implemented

#### 🧭 Smart Navigation System
- Expanding pill-style navigation with smooth animations
- Active link tracking based on scroll position (using Intersection Observer API)
- Smooth scroll behavior between sections
- Responsive mobile menu (hamburger)
- Scroll-based shadow enhancement

#### 🎨 Animated Hero Section
- Dual layouts optimized for desktop and mobile
- Five floating animated icons (clock, hourglass, code, zap, sparkles)
- GPU-accelerated animations using `requestAnimationFrame`
- Responsive brand logo and tagline
- Key benefits checklist
- Call-to-action button

#### 📱 Responsive Design
- Five breakpoints covering all device sizes:
  - Desktop Large (≥1400px)
  - Desktop (1024px - 1399px)
  - Tablet (860px - 1023px)
  - Mobile (480px - 859px)
  - Mobile Small (≤360px)
- Fluid typography using CSS `clamp()`
- Optimized layouts for each screen size

#### ♿ Accessibility Features
- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- Respects `prefers-reduced-motion` user preference
- High contrast text for readability

#### ⚡ Performance Optimizations
- Passive scroll event listeners
- GPU-accelerated animations (CSS `transform3d`)
- Minimal DOM manipulation
- Font loading detection to prevent FOUT (Flash of Unstyled Text)
- Efficient animation loops with `requestAnimationFrame`

### In Development

The following sections are currently placeholders showing "Coming soon...":

- **Process** - How the service workflow operates
- **Services** - Detailed service offerings
- **About** - Company and team information
- **Showcase** - Portfolio of work examples
- **Feedback** - Client testimonials
- **Pricing** - Pricing tiers and plans

## Project Structure

```
Clockwrk/
├── index.html              # Main HTML file (290 lines)
├── script.js               # JavaScript functionality (197 lines)
├── README.md               # This file
├── styles/                 # CSS stylesheets
│   ├── global.css         # Global variables, resets (125 lines) ✅
│   ├── navbar.css         # Navigation styling (353 lines) ✅
│   ├── landing.css        # Hero section styling (596 lines) ✅
│   ├── about.css          # About section (placeholder)
│   ├── feedback.css       # Testimonials section (placeholder)
│   ├── footer.css         # Footer styling (placeholder)
│   ├── pricing.css        # Pricing section (placeholder)
│   ├── process.css        # Process section (placeholder)
│   ├── responsive.css     # Additional responsive styles (minimal)
│   ├── services.css       # Services section (placeholder)
│   └── showcase.css       # Portfolio section (placeholder)
└── assets/                 # Media and resources
    ├── logos/
    │   ├── clockwrk.png   # Main brand logo
    │   └── cw.png         # Abbreviated logo
    ├── icons/             # (prepared for future icons)
    ├── misc/              # (prepared for misc assets)
    ├── people/            # (prepared for team photos)
    └── showcase/          # (prepared for portfolio images)
```

## Getting Started

Since this is a static HTML website with no build process, getting started is simple:

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (optional, but recommended)

### Running Locally

#### Option 1: Simple File Open
```bash
# Navigate to the project directory
cd /path/to/Clockwrk

# Open index.html in your browser
open index.html  # macOS
# or
start index.html # Windows
# or
xdg-open index.html # Linux
```

#### Option 2: Local Web Server (Recommended)

Using Python:
```bash
# Python 3
python -m http.server 8000

# Then visit http://localhost:8000 in your browser
```

Using Node.js (npx):
```bash
npx http-server -p 8000

# Then visit http://localhost:8000 in your browser
```

Using VS Code:
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"

## Development Status

**Current Completion: ~40%**

| Section | Status | Completion |
|---------|--------|------------|
| Navigation | ✅ Complete | 95% |
| Hero/Landing | ✅ Complete | 95% |
| Process | ⏳ Placeholder | 5% |
| Services | ⏳ Placeholder | 5% |
| About | ⏳ Placeholder | 5% |
| Showcase | ⏳ Placeholder | 5% |
| Feedback | ⏳ Placeholder | 5% |
| Pricing | ⏳ Placeholder | 5% |
| Footer | ⏳ Not Started | 0% |

## Code Architecture

### CSS Architecture

The CSS is organized into modular files for maintainability:

- **global.css** - CSS custom properties (variables), reset styles, base typography
- **navbar.css** - All navigation-related styles and animations
- **landing.css** - Hero section layout and animations
- **[section].css** - Each major section has its own stylesheet (to be implemented)

### JavaScript Features

```javascript
// Key functionality implemented in script.js:

- Smooth scroll navigation between sections
- Active nav link tracking with Intersection Observer
- Navbar expand/collapse on hover (desktop only)
- Floating icon animations with requestAnimationFrame
- Mobile menu toggle functionality
- Scroll-based navbar shadow effect
- Font loading detection
- Reduced motion preference detection
- Responsive breakpoint detection with matchMedia API
```

### Design System

The project uses CSS custom properties for consistent theming:

```css
:root {
  /* Colors, spacing, timing functions, etc. */
  /* Defined in global.css */
}
```

## Browser Support

This site uses modern web APIs and CSS features. Supported browsers:

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Opera 74+

**Note:** Intersection Observer API and CSS Grid are required.

## Performance Metrics

- **No external dependencies** (except CDN-loaded fonts and icons)
- **Lightweight** - Total size < 20KB (HTML + CSS + JS)
- **Fast load times** - No build process, no JavaScript bundles
- **Smooth animations** - 60fps animations using GPU acceleration

## Future Enhancements

### Immediate Next Steps
1. Complete the 6 placeholder content sections
2. Finish mobile menu styling and animations
3. Add footer with contact information and links
4. Populate asset directories with images

### Potential Future Features
- Contact form with backend integration
- Blog/case studies section
- Client portal login
- SEO meta tags optimization
- Image optimization and lazy loading
- Progressive Web App (PWA) features
- Analytics integration
- Cookie consent banner

## License

[License information to be added]

## Contact

[Contact information to be added]

## Known Architecture Gotchas

These are non-obvious traps in the codebase that have caused bugs. Check here before editing styles.

## Working Rules For Future AI Edits

Read `README.md` before making changes. Use it as the first source of project context, known traps, and current editing rules.

Then read `logs.md` for detailed implementation history before editing the same area.

Before making any new change, review the last 5 entries in `logs.md` so you do not repeat work, undo recent decisions, or miss active constraints.

After every code or styling change:

1. Add a new entry to `logs.md`.
2. Include the local date and time.
3. Name the files that changed.
4. Explain what changed and why.
5. Include any bug cause, specificity trap, layout constraint, or follow-up detail that another AI would need before editing the same area.

### CSS Specificity Trap — `.section h3`

`global.css` contains this rule:
```css
.section h3 {
  font-size: clamp(32px, 5vw, 48px); /* specificity: 0,1,1 */
}
```

Every section in `index.html` uses both a section-specific class AND the shared `section` class (e.g. `class="process-section section"`). Any `h3` inside a `.section` will be locked to `clamp(32px, 5vw, 48px)` by this rule.

**A single-class selector like `.process-title` (specificity `0,1,0`) will always lose to `.section h3` (specificity `0,1,1`), making font-size changes appear to have no effect.**

**Fix pattern:** Scope section title selectors to their parent to raise specificity:
```css
/* Wrong — loses to .section h3 */
.process-title { font-size: clamp(40px, 6vw, 92px); }

/* Correct — beats .section h3 */
.process-header .process-title { font-size: clamp(40px, 6vw, 92px); }
```

This fix has already been applied to `.process-header .process-title` in `styles/process.css`. Apply the same pattern to any other section titles that use an `h3` tag.

---

**Current Version:** v0.4.0 (In Development)
**Last Updated:** 2026-04-12 21:27:33 PKT
