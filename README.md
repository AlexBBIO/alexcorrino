# AlexCorrino.com

Static personal site for Alex Corrino, deployed on Vercel.

The site includes three shareable art directions backed by the same semantic content:

- `/field` — a dark probability surface where noisy paths converge into a decision
- `/ledger` — a warm editorial risk book with an observation lens
- `/nocturne` — a cinematic, after-hours project sequence

The root URL uses the Field direction. Everything is vanilla HTML, CSS, SVG, and Canvas 2D; there is no build step.

## Local preview

Serve the repository root with any static HTTP server. For example:

```powershell
python -m http.server 4173
```

The Vercel rewrites make `/field`, `/ledger`, and `/nocturne` resolve to `index.html` in production.
