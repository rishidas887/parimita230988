const revealItems = document.querySelectorAll('.reveal');
const photoSlots = Array.from(document.querySelectorAll('.photo-slot'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
      }
    });
  },
  { threshold: 0.14 }
);

revealItems.forEach((item) => observer.observe(item));

// If a configured photo is missing, show a clear placeholder while keeping layout stable.
document.querySelectorAll('.photo-slot img').forEach((img) => {
  img.addEventListener('error', () => {
    img.parentElement.classList.add('empty');
    img.style.display = 'none';
  });
});

const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
const flames = Array.from(document.querySelectorAll('.flame'));
const cake3d = document.getElementById('cake-3d');
const knife = document.getElementById('knife');
const knifeHint = document.getElementById('knife-hint');
const bgMusic = document.getElementById('bg-music');

const candleCountdownBtn = document.getElementById('candle-countdown');
const startSlideshowBtn = document.getElementById('start-slideshow');
const countdownDisplay = document.getElementById('countdown-display');
const slashTrail = document.createElement('div');
slashTrail.className = 'slash-trail';
document.body.appendChild(slashTrail);

const confettiParticles = [];
let dpr = Math.max(1, window.devicePixelRatio || 1);

function resizeCanvas() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
}

function burstConfetti(x, y, amount = 90) {
  const colors = ['#f5d87b', '#ff7eb6', '#5cf3ff', '#ffffff', '#ffc06f'];
  for (let i = 0; i < amount; i += 1) {
    confettiParticles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.75) * 10,
      g: 0.19 + Math.random() * 0.12,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.25,
      alpha: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i -= 1) {
    const p = confettiParticles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.alpha -= 0.0085;

    if (p.alpha <= 0 || p.y > confettiCanvas.height / dpr + 20) {
      confettiParticles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x * dpr, p.y * dpr);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size * 0.5 * dpr, -p.size * 0.5 * dpr, p.size * dpr, p.size * 0.6 * dpr);
    ctx.restore();
  }
  requestAnimationFrame(animateConfetti);
}

resizeCanvas();
animateConfetti();
window.addEventListener('resize', resizeCanvas);

function forceBackgroundMusic() {
  if (!bgMusic) {
    return;
  }
  bgMusic.loop = true;
  bgMusic.volume = 1;
  const playPromise = bgMusic.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

forceBackgroundMusic();
window.addEventListener('DOMContentLoaded', forceBackgroundMusic);
window.addEventListener('load', forceBackgroundMusic);
window.addEventListener('pageshow', forceBackgroundMusic);
window.addEventListener('focus', forceBackgroundMusic);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    forceBackgroundMusic();
  }
});
document.addEventListener('pointerdown', forceBackgroundMusic, { passive: true });
document.addEventListener('touchstart', forceBackgroundMusic, { passive: true });
document.addEventListener('keydown', forceBackgroundMusic);
document.addEventListener('scroll', forceBackgroundMusic, { passive: true });
bgMusic?.addEventListener('pause', () => {
  forceBackgroundMusic();
});
bgMusic?.addEventListener('ended', () => {
  forceBackgroundMusic();
});

let knifeEnabled = false;
let knifeCutDone = false;
let knifeDragging = false;
let knifeMoveDistance = 0;
let lastKnifePoint = null;
let cutPathState = null;
let knifeGrabOffsetX = 75;
let knifeGrabOffsetY = 14;
let knifePointerId = null;
let knifeTouchMode = false;

function enableKnifeMode() {
  knifeEnabled = true;
  knifeHint.textContent = 'Now drag the knife over the cake to cut it!';
}

function resetKnifePosition() {
  knife.style.position = '';
  knife.style.left = '';
  knife.style.top = '';
  knife.style.zIndex = '';
  knife.style.transform = '';
}

function isColliding(rectA, rectB) {
  return !(
    rectA.right < rectB.left ||
    rectA.left > rectB.right ||
    rectA.bottom < rectB.top ||
    rectA.top > rectB.bottom
  );
}

function handleCakeCut() {
  if (knifeCutDone) {
    return;
  }
  knifeCutDone = true;
  cake3d.classList.add('cake-cut');
  document.body.classList.remove('impact-shake');
  void document.body.offsetWidth;
  document.body.classList.add('impact-shake');
  setTimeout(() => document.body.classList.remove('impact-shake'), 500);
  knifeHint.textContent = 'Cake cut complete! Happy Birthday Parimita!';
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([18, 24, 36]);
  }
  burstConfetti(window.innerWidth * 0.5, window.innerHeight * 0.34, 260);
}

function resetCutPathState() {
  cutPathState = {
    enteredCake: false,
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    stableFramesOnCake: 0,
  };
}

function updateSlashTrail(fromPoint, toPoint) {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 22) {
    return;
  }
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  slashTrail.style.left = `${fromPoint.x}px`;
  slashTrail.style.top = `${fromPoint.y - 4}px`;
  slashTrail.style.width = `${Math.min(distance, 180)}px`;
  slashTrail.style.transform = `rotate(${angle}deg)`;
  slashTrail.classList.remove('active');
  void slashTrail.offsetWidth;
  slashTrail.classList.add('active');
}

knife.addEventListener('pointerdown', (event) => {
  if (!knifeEnabled) {
    knifeHint.textContent = 'First finish the memory show and blow the candle.';
    return;
  }
  if (knifeCutDone) {
    return;
  }

  knifeDragging = true;
  knifePointerId = event.pointerId;
  knifeTouchMode = event.pointerType === 'touch' || event.pointerType === 'pen';
  knife.classList.add('dragging');
  knifeMoveDistance = 0;
  resetCutPathState();
  const knifeRect = knife.getBoundingClientRect();
  knifeGrabOffsetX = Math.max(12, Math.min(knifeRect.width - 12, event.clientX - knifeRect.left));
  knifeGrabOffsetY = Math.max(8, Math.min(knifeRect.height - 8, event.clientY - knifeRect.top));
  lastKnifePoint = { x: event.clientX, y: event.clientY };
  knife.style.position = 'fixed';
  knife.style.zIndex = '8';
  knife.style.left = `${event.clientX - knifeGrabOffsetX}px`;
  knife.style.top = `${event.clientY - knifeGrabOffsetY}px`;
  knife.setPointerCapture?.(event.pointerId);
  knifeHint.textContent = 'Hold and drag the knife fully across the cake.';
});

document.addEventListener('pointermove', (event) => {
  if (!knifeDragging || (knifePointerId !== null && event.pointerId !== knifePointerId)) {
    return;
  }
  if (knifeTouchMode) {
    event.preventDefault();
  }

  knife.style.left = `${event.clientX - knifeGrabOffsetX}px`;
  knife.style.top = `${event.clientY - knifeGrabOffsetY}px`;

  if (lastKnifePoint) {
    const dx = event.clientX - lastKnifePoint.x;
    const dy = event.clientY - lastKnifePoint.y;
    if (Math.hypot(dx, dy) > 2) {
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      knife.style.transform = `rotate(${Math.max(-42, Math.min(42, angle))}deg)`;
    }
    updateSlashTrail(lastKnifePoint, { x: event.clientX, y: event.clientY });
    knifeMoveDistance += Math.hypot(event.clientX - lastKnifePoint.x, event.clientY - lastKnifePoint.y);
  }
  lastKnifePoint = { x: event.clientX, y: event.clientY };

  const knifeRect = knife.getBoundingClientRect();
  const cakeRect = cake3d.getBoundingClientRect();
  const intersectingCake = isColliding(knifeRect, cakeRect);
  if (intersectingCake && cutPathState) {
    cutPathState.enteredCake = true;
    cutPathState.stableFramesOnCake += 1;
    const knifeCenterX = knifeRect.left + knifeRect.width * 0.5;
    cutPathState.minX = Math.min(cutPathState.minX, knifeCenterX);
    cutPathState.maxX = Math.max(cutPathState.maxX, knifeCenterX);

    const cakeWidth = cakeRect.width;
    const horizontalTravel = cutPathState.maxX - cutPathState.minX;
    const travelRatio = knifeTouchMode ? 0.48 : 0.6;
    const requiredDistance = knifeTouchMode ? 110 : 170;
    const requiredStableFrames = knifeTouchMode ? 4 : 6;
    const traveledAcrossCake = horizontalTravel >= cakeWidth * travelRatio;
    const deliberateDrag = knifeMoveDistance > requiredDistance && cutPathState.stableFramesOnCake > requiredStableFrames;
    if (traveledAcrossCake && deliberateDrag) {
      handleCakeCut();
      knifeDragging = false;
      knife.classList.remove('dragging');
      knifePointerId = null;
      knifeTouchMode = false;
      resetKnifePosition();
      countdownDisplay.textContent = 'Cake cut complete!';
    }
  } else if (knifeDragging && !knifeCutDone) {
    knifeHint.textContent = 'Keep holding and move the knife across the cake.';
  }
});

function endKnifeDrag() {
  if (!knifeDragging) {
    return;
  }
  knifeDragging = false;
  knife.classList.remove('dragging');
  if (knifePointerId !== null && knife.hasPointerCapture?.(knifePointerId)) {
    knife.releasePointerCapture?.(knifePointerId);
  }
  knifePointerId = null;
  knifeTouchMode = false;
  cutPathState = null;
  resetKnifePosition();
}

document.addEventListener('pointerup', (event) => {
  if (knifePointerId !== null && event.pointerId !== knifePointerId) {
    return;
  }
  endKnifeDrag();
});

document.addEventListener('pointercancel', endKnifeDrag);

let countdownActive = false;

function runCandleCountdown(onComplete) {
  if (countdownActive) {
    return;
  }
  countdownActive = true;
  flames.forEach((item) => item.classList.remove('blown'));

  let remaining = 5;
  countdownDisplay.textContent = `Blowing candle in ${remaining}...`;
  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      countdownDisplay.textContent = `Blowing candle in ${remaining}...`;
      return;
    }
    clearInterval(timer);
    flames.forEach((item) => item.classList.add('blown'));
    countdownDisplay.textContent = 'Wish made. Candle blown. Celebrate!';
    burstConfetti(window.innerWidth * 0.5, window.innerHeight * 0.28, 180);
    if (typeof onComplete === 'function') {
      onComplete();
    }
    setTimeout(() => {
      countdownActive = false;
      if (!knifeCutDone) {
        countdownDisplay.textContent = 'Now cut the cake with the knife.';
      } else {
        countdownDisplay.textContent = 'Celebration complete!';
      }
    }, 2500);
  }, 1000);
}

candleCountdownBtn.addEventListener('click', () => {
  if (!photoSequenceCompleted) {
    countdownDisplay.textContent = 'Please complete the memory show first.';
    return;
  }
  runCandleCountdown(enableKnifeMode);
});

let photoSequenceRunning = false;
let photoSequenceCompleted = false;
let sequenceTimer;

function resetPhotoSequence(hidePhotos = true) {
  clearInterval(sequenceTimer);
  photoSequenceRunning = false;
  photoSequenceCompleted = false;
  photoSlots.forEach((slot) => {
    slot.classList.remove('seq-active');
    slot.classList.remove('seq-visible');
    if (hidePhotos) {
      slot.classList.add('seq-hidden');
    } else {
      slot.classList.add('seq-visible');
      slot.classList.remove('seq-hidden');
    }
  });
}

function runPhotoSequence() {
  if (photoSequenceRunning) {
    return;
  }

  photoSequenceRunning = true;
  resetPhotoSequence();
  startSlideshowBtn.textContent = 'Photo Show Running...';
  countdownDisplay.textContent = 'Memory show has started.';
  location.hash = '#gallery';

  let index = 0;
  sequenceTimer = setInterval(() => {
    const slot = photoSlots[index];
    if (slot) {
      const previous = photoSlots[index - 1];
      if (previous) {
        previous.classList.remove('seq-active');
      }
      slot.classList.remove('seq-hidden');
      slot.classList.add('seq-visible');
      slot.classList.add('seq-active');
      slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
      burstConfetti(window.innerWidth * (0.25 + Math.random() * 0.5), window.innerHeight * (0.3 + Math.random() * 0.45), 24);
    }
    index += 1;

    if (index >= photoSlots.length) {
      clearInterval(sequenceTimer);
      photoSequenceRunning = false;
      photoSequenceCompleted = true;
      photoSlots.forEach((entry) => entry.classList.remove('seq-active'));
      startSlideshowBtn.textContent = 'Replay Photo Show';
      countdownDisplay.textContent = 'All photos shown. Candle ceremony starting.';
      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      runCandleCountdown(enableKnifeMode);
    }
  }, 1000);
}

startSlideshowBtn.addEventListener('click', runPhotoSequence);
window.addEventListener('load', () => {
  // On first load, start memories as a one-by-one flicker sequence.
  resetPhotoSequence(true);
  if (!window.location.hash) {
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  setTimeout(runPhotoSequence, 300);
});

document.addEventListener('click', (event) => {
  if (event.target.closest('a, button, .photo-slot')) {
    burstConfetti(event.clientX, event.clientY, 36);
  }
});
