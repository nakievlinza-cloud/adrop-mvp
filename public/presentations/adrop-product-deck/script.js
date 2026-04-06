const slides = Array.from(document.querySelectorAll('.slide'));
const railDots = document.getElementById('rail-dots');
const currentSlideLabel = document.getElementById('current-slide');
const totalSlidesLabel = document.getElementById('total-slides');
const prevButton = document.getElementById('prev-slide');
const nextButton = document.getElementById('next-slide');

let activeIndex = 0;

function formatIndex(index) {
  return String(index + 1).padStart(2, '0');
}

function goToSlide(index) {
  const clamped = Math.max(0, Math.min(index, slides.length - 1));
  slides[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setActive(index) {
  activeIndex = index;
  currentSlideLabel.textContent = formatIndex(index);
  document.querySelectorAll('.rail-dot').forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
    dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
  });
}

slides.forEach((slide, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rail-dot';
  button.setAttribute('aria-label', `Слайд ${index + 1}: ${slide.dataset.title || ''}`);
  button.addEventListener('click', () => goToSlide(index));
  railDots.appendChild(button);
});

totalSlidesLabel.textContent = String(slides.length).padStart(2, '0');
setActive(0);

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    const index = slides.indexOf(visible.target);
    if (index >= 0) {
      setActive(index);
    }
  },
  {
    threshold: [0.35, 0.55, 0.75],
    rootMargin: '-8% 0px -20% 0px',
  }
);

slides.forEach((slide) => observer.observe(slide));

prevButton?.addEventListener('click', () => goToSlide(activeIndex - 1));
nextButton?.addEventListener('click', () => goToSlide(activeIndex + 1));

document.addEventListener('keydown', (event) => {
  if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    goToSlide(activeIndex + 1);
  }

  if (['ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    goToSlide(activeIndex - 1);
  }

  if (event.key === 'Home') {
    event.preventDefault();
    goToSlide(0);
  }

  if (event.key === 'End') {
    event.preventDefault();
    goToSlide(slides.length - 1);
  }
});
