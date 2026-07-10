(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const mode = root.dataset.mode || "field";

  const directions = {
    field: {
      number: "01",
      name: "Uncertainty field",
      title: ["Conviction", "before", "certainty."],
      intro: "I build systems for decisions when the answer is not obvious.",
      theme: "#08110e",
    },
    ledger: {
      number: "02",
      name: "The risk ledger",
      title: ["Price", "the", "unknown."],
      intro:
        "A public risk book for the questions that reward disciplined uncertainty.",
      theme: "#f0ede4",
    },
    nocturne: {
      number: "03",
      name: "The risk film",
      title: ["Pricing", "incomplete", "information."],
      intro:
        "Public work from the point where signal starts to separate from noise.",
      theme: "#08070e",
    },
  };

  const current = directions[mode] || directions.field;
  const titleLines = document.querySelectorAll(".hero-title span");
  titleLines.forEach((line, index) => {
    line.textContent = current.title[index];
  });

  const heroIntro = document.querySelector(".hero-intro");
  if (heroIntro) heroIntro.textContent = current.intro;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", current.theme);

  document.querySelectorAll("[data-mode-link]").forEach((link) => {
    if (link.dataset.modeLink === mode)
      link.setAttribute("aria-current", "page");
  });

  const modeNumber = document.querySelector("[data-mode-number]");
  const modeName = document.querySelector("[data-mode-name]");
  if (modeNumber) modeNumber.textContent = current.number;
  if (modeName) modeName.textContent = current.name;

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  requestAnimationFrame(() => body.classList.add("is-ready"));

  const onScroll = () =>
    body.classList.toggle("is-scrolled", window.scrollY > 18);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  let activeProject = 0;
  const projects = [...document.querySelectorAll("[data-project]")];
  const stageVisuals = [...document.querySelectorAll(".stage-visual")];
  const stageLabels = [...document.querySelectorAll("[data-stage-label]")];

  function activateProject(index) {
    if (!Number.isInteger(index) || index < 0 || index >= projects.length)
      return;
    activeProject = index;
    projects.forEach((project, projectIndex) => {
      project.classList.toggle("is-active", projectIndex === index);
    });
    stageVisuals.forEach((visual, visualIndex) => {
      visual.classList.toggle("is-active", visualIndex === index);
    });
    stageLabels.forEach((label, labelIndex) => {
      label.classList.toggle("is-active", labelIndex === index);
    });
  }

  activateProject(0);

  projects.forEach((project) => {
    const index = Number(project.dataset.project);
    project.addEventListener("pointerenter", () => activateProject(index));
    project.addEventListener("focusin", () => activateProject(index));
  });

  if ("IntersectionObserver" in window) {
    const projectObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) activateProject(Number(visible.target.dataset.project));
      },
      { rootMargin: "-28% 0px -40% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    projects.forEach((project) => projectObserver.observe(project));
  }

  const canvas = document.querySelector("#signal-field");
  const context = canvas?.getContext("2d", { alpha: true });
  const instrumentValue = document.querySelector(".instrument-value");
  const projectStage = document.querySelector(".project-stage");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  if (!canvas || !context) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;
  let lastFrame = 0;
  let pointerX = window.innerWidth * 0.68;
  let pointerY = window.innerHeight * 0.42;
  let targetX = pointerX;
  let targetY = pointerY;
  let pageVisible = !document.hidden;
  let frameInterval = 33;
  let stageBounds = null;
  let stageBoundsFrame = 0;

  const style = getComputedStyle(root);
  let signal = style.getPropertyValue("--signal").trim() || "#d8ff72";
  let ember = style.getPropertyValue("--ember").trim() || "#f06a4b";
  let foreground = style.getPropertyValue("--fg").trim() || "#eeeade";

  const hexToRgba = (hex, alpha) => {
    const value = hex.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
    const number = Number.parseInt(value, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const seeded = (index) => {
    const value = Math.sin(index * 91.733 + 17.21) * 43758.5453;
    return value - Math.floor(value);
  };

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    frameInterval = coarsePointer.matches || width <= 760 ? 66 : 33;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    refreshStageBounds();
    syncPointerPresentation();
    draw(performance.now());
  }

  function refreshStageBounds() {
    stageBounds =
      mode === "ledger" && projectStage
        ? projectStage.getBoundingClientRect()
        : null;
  }

  function scheduleStageBounds() {
    if (stageBoundsFrame || mode !== "ledger") return;
    stageBoundsFrame = requestAnimationFrame(() => {
      refreshStageBounds();
      stageBoundsFrame = 0;
    });
  }

  function syncPointerPresentation() {
    root.style.setProperty("--pointer-x", `${pointerX}px`);
    root.style.setProperty("--pointer-y", `${pointerY}px`);

    if (stageBounds && projectStage) {
      projectStage.style.setProperty(
        "--lens-x",
        `${pointerX - stageBounds.left}px`,
      );
      projectStage.style.setProperty(
        "--lens-y",
        `${pointerY - stageBounds.top}px`,
      );
    }
  }

  function updatePointer(event) {
    targetX = event.clientX;
    targetY = event.clientY;

    const normalized = Math.max(0, Math.min(1, targetX / Math.max(width, 1)));
    if (instrumentValue)
      instrumentValue.textContent = (48 + normalized * 34).toFixed(1);

    if (reduceMotion.matches) {
      pointerX = targetX;
      pointerY = targetY;
      syncPointerPresentation();
    }
  }

  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("scroll", scheduleStageBounds, { passive: true });
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    if (pageVisible && !reduceMotion.matches) startAnimation();
  });

  function drawField(time) {
    const seconds = time * 0.001;
    const focusX = Math.max(width * 0.52, Math.min(width * 0.82, pointerX));
    const focusY = pointerY;

    const glow = context.createRadialGradient(
      focusX,
      focusY,
      0,
      focusX,
      focusY,
      Math.max(width, height) * 0.38,
    );
    glow.addColorStop(0, hexToRgba(signal, 0.085));
    glow.addColorStop(1, hexToRgba(signal, 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.lineCap = "round";
    for (let index = 0; index < 38; index += 1) {
      const base = seeded(index + 3);
      const vertical = (index + 0.5) * (height / 38);
      const amplitude = 18 + base * 52;
      const phase = base * Math.PI * 2 + seconds * (0.06 + base * 0.035);
      const projectShift = (activeProject - 1) * 8;

      context.beginPath();
      for (let x = -40; x <= width + 40; x += 18) {
        const distance = Math.abs(x - focusX) / Math.max(width * 0.5, 1);
        const uncertainty = 0.12 + Math.min(1, distance) * 0.88;
        const convergence = focusY + (vertical - focusY) * uncertainty;
        const wave =
          Math.sin(x * (0.006 + base * 0.003) + phase) *
          amplitude *
          uncertainty;
        const smallWave = Math.sin(x * 0.021 - phase * 1.8) * 6 * uncertainty;
        const y = convergence + wave + smallWave + projectShift;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      const alpha = index % 7 === 0 ? 0.25 : 0.09 + base * 0.07;
      context.strokeStyle =
        index % 7 === 0
          ? hexToRgba(signal, alpha)
          : hexToRgba(foreground, alpha);
      context.lineWidth = index % 7 === 0 ? 1.15 : 0.65;
      context.stroke();
    }

    context.strokeStyle = hexToRgba(signal, 0.72);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(focusX - 9, focusY);
    context.lineTo(focusX + 9, focusY);
    context.moveTo(focusX, focusY - 9);
    context.lineTo(focusX, focusY + 9);
    context.stroke();

    context.beginPath();
    context.arc(focusX, focusY, 3, 0, Math.PI * 2);
    context.fillStyle = signal;
    context.fill();
  }

  function drawLedgerLines(time, crisp = false) {
    const seconds = time * 0.001;
    const rows = 17;
    for (let row = 0; row < rows; row += 1) {
      const base = seeded(row + 90 + activeProject * 13);
      const yBase = ((row + 0.5) / rows) * height;
      context.beginPath();
      for (let x = -24; x <= width + 24; x += 14) {
        const slow =
          Math.sin(x * 0.0045 + base * 9 + seconds * 0.04) * (24 + base * 24);
        const contour =
          Math.sin(x * 0.014 - base * 5) * (7 + activeProject * 3);
        const y = yBase + slow + contour;
        if (x === -24) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = crisp
        ? hexToRgba(signal, 0.62)
        : "rgba(21, 22, 16, 0.11)";
      context.lineWidth = crisp ? 1.05 : 0.65;
      context.stroke();
    }
  }

  function drawLedger(time) {
    context.strokeStyle = "rgba(21, 22, 16, 0.07)";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 96) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 64) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    drawLedgerLines(time, false);
    context.save();
    context.beginPath();
    context.arc(pointerX, pointerY, 120, 0, Math.PI * 2);
    context.clip();
    drawLedgerLines(time, true);
    context.restore();

    context.strokeStyle = hexToRgba(signal, 0.46);
    context.beginPath();
    context.moveTo(pointerX - 15, pointerY);
    context.lineTo(pointerX + 15, pointerY);
    context.moveTo(pointerX, pointerY - 15);
    context.lineTo(pointerX, pointerY + 15);
    context.stroke();
  }

  function drawNocturne(time) {
    const seconds = time * 0.001;
    const horizon = height * 0.68;

    const wash = context.createRadialGradient(
      width * 0.72,
      height * 0.28,
      0,
      width * 0.72,
      height * 0.28,
      width * 0.5,
    );
    wash.addColorStop(0, hexToRgba(signal, 0.1));
    wash.addColorStop(1, hexToRgba(signal, 0));
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < 88; index += 1) {
      const x = seeded(index + 200) * width;
      const y = seeded(index + 600) * horizon;
      const pulse = 0.18 + 0.38 * (0.5 + 0.5 * Math.sin(seconds * 0.6 + index));
      context.fillStyle =
        index % 11 === 0
          ? hexToRgba(signal, pulse)
          : hexToRgba(foreground, pulse * 0.65);
      context.fillRect(
        x,
        y,
        index % 13 === 0 ? 2 : 1,
        index % 13 === 0 ? 2 : 1,
      );
    }

    context.lineCap = "round";
    for (let track = 0; track < 7; track += 1) {
      const base = seeded(track + 320);
      context.beginPath();
      for (let x = -20; x <= width + 20; x += 14) {
        const y =
          horizon -
          track * 18 +
          Math.sin(
            x * (0.006 + track * 0.0005) +
              seconds * (0.12 + track * 0.015) +
              base * 8,
          ) *
            (18 + track * 7);
        if (x === -20) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      const palette =
        track % 3 === 0 ? signal : track % 3 === 1 ? ember : foreground;
      context.strokeStyle = hexToRgba(palette, track < 3 ? 0.22 : 0.08);
      context.lineWidth = track < 3 ? 1 : 0.6;
      context.stroke();
    }

    const bars = Math.ceil(width / 38);
    for (let index = 0; index < bars; index += 1) {
      const base = seeded(index + 450);
      const barHeight = 28 + base * height * 0.2;
      const x = index * 38 + 8;
      context.fillStyle = hexToRgba(
        index % 5 === activeProject ? signal : foreground,
        0.035 + base * 0.035,
      );
      context.fillRect(x, height - barHeight, 18 + base * 10, barHeight);
    }
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    if (mode === "ledger") drawLedger(time);
    else if (mode === "nocturne") drawNocturne(time);
    else drawField(time);
  }

  function animate(time) {
    if (!pageVisible || reduceMotion.matches) {
      animationFrame = 0;
      syncPointerPresentation();
      draw(time);
      return;
    }

    if (time - lastFrame >= frameInterval) {
      pointerX += (targetX - pointerX) * 0.095;
      pointerY += (targetY - pointerY) * 0.095;
      syncPointerPresentation();
      draw(time);
      lastFrame = time;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  }

  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      draw(performance.now());
    } else {
      startAnimation();
    }
  });

  resizeCanvas();
  if (reduceMotion.matches) draw(performance.now());
  else startAnimation();
})();
