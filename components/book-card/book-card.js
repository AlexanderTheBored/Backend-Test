export function initBookCards() {
  const bookCards = document.querySelectorAll('.book-card');

  bookCards.forEach(card => {
    const inner = card.querySelector('.book-inner');
    let requestId = null;

    function updateTransform(e) {
      const rect = card.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / 10);
      const rotateY = (x - centerX) / 10;

      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    }

    function resetTransform() {
      inner.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
      inner.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
      requestId = null;
      setTimeout(() => {
        inner.style.transition = 'transform 0.1s ease-out';
      }, 500);
    }

    card.addEventListener('pointermove', (e) => {
      if (requestId) cancelAnimationFrame(requestId);
      requestId = requestAnimationFrame(() => updateTransform(e));
    });

    card.addEventListener('pointerleave', resetTransform);
    card.addEventListener('pointercancel', resetTransform);
    card.addEventListener('pointerup', resetTransform);

    // Image loading with fallback and retry limit
    const id = card.dataset.id;
    const ext = card.dataset.ext || 'jpg';
    const img = card.querySelector('.manga-cover');
    let attempts = 0;

    if (img && id) {
      const primary = `/assets/covers/${id}.${ext}`;
      const fallback = `/assets/covers/${id}.${ext === 'jpg' ? 'png' : 'jpg'}`;

      img.src = primary;
      img.onerror = () => {
        attempts++;
        if (attempts === 1) {
          img.src = fallback;
        } else if (attempts >= 5) {
          img.onerror = null;
          console.warn(`⚠️ Cover failed for ID ${id}. Fallback to default.`);
          img.src = '/assets/covers/default.jpg'; // Optional fallback
        }
      };
    }
  });
}

export function openReader(slug) {
  window.location.href = `/mangareader.html?slug=${slug}`;
}
