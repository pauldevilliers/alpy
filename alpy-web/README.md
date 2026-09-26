# Alpy Web

**A portable, browser-native workspace shell.**

Alpy Web is a sub-project of Alpy built entirely in HTML, CSS and JavaScript. It deliberately does **not** pretend to be a real operating system. Instead, it provides an OS-like interaction model that works anywhere a modern browser runs.

## Vision

- device-agnostic
- installable as a PWA
- black, minimal desktop
- configurable bottom-left application menu
- simple window manager
- basic OS-like utilities
- local persistence first
- cloud identity/state/files later
- no dependence on Linux, Windows or macOS concepts in the UI

## Included in v0.1

- black desktop
- subtle optional grid
- bottom-left Alpy launcher
- launcher search
- configurable launcher app list in state
- movable/resizable/maximisable/minimisable windows
- running-app task buttons
- Notes with local persistence
- Files placeholder
- Terminal-like command surface
- System/device information
- Settings
- lock screen
- clock
- keyboard shortcut: Ctrl/Cmd + Space for launcher
- installable PWA
- responsive mobile layout

## Run locally

Because service workers require HTTP rather than `file://`, use any tiny web server.

Python:

```bash
cd alpy-web
python3 -m http.server 8080
```

Then open:

```
http://localhost:8080
```

## State model

Current v0.1 state is intentionally local:

```
localStorage
├── alpy-web:settings
└── alpy-web:notes
```

The next stage is to replace/augment those adapters with Alpy cloud APIs while keeping the UI shell unchanged.

## Direction

The architectural principle is:

```
Alpy Web UI
   |
state adapters
   |
localStorage today
cloud profile/files tomorrow
   |
same shell on every device
```

This keeps Alpy Web genuinely portable rather than binding it to one host operating system.
