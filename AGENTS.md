# Web pages

Before creating or changing any webpage, HTML, CSS, or client-side UI, use [Modern Web Guidance](https://github.com/googlechrome/modern-web-guidance) first. Do not write the interface from memory.

```sh
npx -y modern-web-guidance@latest search "<query>" --skill-version 2026_11_09-5bcc021b
npx -y modern-web-guidance@latest retrieve "<id>"
```

Search one platform capability at a time, then retrieve the matching guides, including the broader discipline guide when it applies. Follow the guide's markup, the fallback it names, and its browser-support notes.

**Browser support:** Baseline Widely available features need no fallback. Newly available features are allowed when the guide's feature detection and graceful fallback are kept. Do not add a polyfill the guide does not ask for.

This does not apply to backend, CI, or tooling-only edits.
