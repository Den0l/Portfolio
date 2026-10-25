let state = null;
let sliderInterval = null;
let projectIntervals = [];
let currentPhotoList = [];
let currentPhotoIndex = 0;
let currentPhotoTitle = '';

const logoText = document.getElementById('logoText');
const profileImage = document.getElementById('profileImage');
const descriptionEl = document.getElementById('description');
const linksEl = document.getElementById('links');
const sliderTrack = document.getElementById('sliderTrack');
const sliderEmpty = document.getElementById('sliderEmpty');
const widgetsEl = document.getElementById('widgets');
const siteStatus = document.getElementById('siteStatus');
const galleryModal = document.getElementById('galleryModal');
const galleryClose = document.getElementById('galleryClose');
const galleryTitle = document.getElementById('galleryTitle');
const galleryGrid = document.getElementById('galleryGrid');
const photoModal = document.getElementById('photoModal');
const photoClose = document.getElementById('photoClose');
const photoPrev = document.getElementById('photoPrev');
const photoNext = document.getElementById('photoNext');
const photoLarge = document.getElementById('photoLarge');
const photoCounter = document.getElementById('photoCounter');
const sliderPrev = document.getElementById('sliderPrev');
const sliderNext = document.getElementById('sliderNext');

async function loadSite() {
  try {
    const [projectsResponse, configResponse] = await Promise.all([
      fetch('./projects.json'),
      fetch('./site-config.json')
    ]);
    if (!projectsResponse.ok || !configResponse.ok) {
      throw new Error('Could not load the static site data.');
    }

    const [projects, settings] = await Promise.all([
      projectsResponse.json(),
      configResponse.json()
    ]);
    if (!Array.isArray(projects) || projects.some((project) =>
      !project ||
      typeof project.id !== 'string' ||
      typeof project.title !== 'string' ||
      !Array.isArray(project.photos) ||
      project.photos.some((photo) =>
        !photo ||
        typeof photo.id !== 'string' ||
        typeof photo.file !== 'string' ||
        !photo.file
      )
    )) {
      throw new Error('The projects manifest has an invalid format.');
    }
    if (
      !settings ||
      typeof settings !== 'object' ||
      Array.isArray(settings) ||
      (settings.siteTitle !== undefined && typeof settings.siteTitle !== 'string') ||
      (settings.description !== undefined && typeof settings.description !== 'string') ||
      (settings.profileImage !== undefined && typeof settings.profileImage !== 'string') ||
      (settings.socials !== undefined && (
        !Array.isArray(settings.socials) ||
        settings.socials.some((social) =>
          !social ||
          typeof social.label !== 'string' ||
          typeof social.url !== 'string'
        )
      ))
    ) {
      throw new Error('The site configuration has an invalid format.');
    }

    state = { projects, settings };
    renderAll();
  } catch (error) {
    console.error('Failed to load portfolio data.', error);
    siteStatus.textContent = 'Could not load the portfolio. Please try again later.';
    siteStatus.classList.add('visible');
    sliderEmpty.textContent = 'Portfolio data is unavailable.';
  }
}

function renderAll() {
  renderHeader();
  renderLinks();
  renderSlider();
  renderProjects();
}

function renderHeader() {
  const { settings } = state;
  logoText.textContent = settings.siteTitle || 'Portfolio';
  document.title = settings.siteTitle || 'Portfolio';
  descriptionEl.textContent = settings.description || '';

  if (settings.profileImage) {
    loadProfileImage(settings.profileImage);
  } else {
    profileImage.style.display = 'none';
  }
}

function loadProfileImage(source) {
  const extensionlessSource = source.replace(/\.(jpe?g|png)$/i, '');
  const candidates = [...new Set([
    source,
    `${extensionlessSource}.png`,
    `${extensionlessSource}.jpg`,
    `${extensionlessSource}.jpeg`
  ])];
  let candidateIndex = 0;
  const probe = new Image();

  probe.onload = () => {
    profileImage.src = candidates[candidateIndex];
    profileImage.style.display = 'block';
  };
  probe.onerror = () => {
    candidateIndex += 1;
    if (candidateIndex < candidates.length) {
      probe.src = candidates[candidateIndex];
      return;
    }

    console.error(`Could not load profile image. Tried: ${candidates.join(', ')}`);
    profileImage.style.display = 'none';
  };
  probe.src = candidates[candidateIndex];
}

function renderLinks() {
  linksEl.replaceChildren();
  (state.settings.socials || []).forEach((social) => {
    if (!social || !social.label || !social.url) return;
    const link = document.createElement('a');
    link.className = 'link-card';
    link.href = social.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = social.label;
    linksEl.appendChild(link);
  });
}

function shuffleArray(items) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function getAllPhotos() {
  return state.projects.flatMap((project) =>
    project.photos.map((photo, index) => ({ ...photo, project, index }))
  );
}

function renderSlider() {
  const photos = shuffleArray(getAllPhotos());
  sliderTrack.replaceChildren();
  if (!photos.length) {
    sliderEmpty.style.display = 'block';
    return;
  }
  sliderEmpty.style.display = 'none';

  photos.forEach((photo) => {
    const slide = document.createElement('div');
    slide.className = 'slider-item';
    const img = document.createElement('img');
    img.src = photo.file;
    img.alt = '';
    img.loading = 'lazy';
    slide.appendChild(img);
    slide.addEventListener('click', () => {
      openGallery(photo.project, photo.id);
    });
    sliderTrack.appendChild(slide);
  });

  if (sliderInterval) clearInterval(sliderInterval);
  if (photos.length > 1) {
    sliderInterval = setInterval(() => moveSlider(1), 5000);
  }
}

function moveSlider(direction) {
  const items = sliderTrack.querySelectorAll('.slider-item');
  if (!items.length) return;
  const gap = parseFloat(getComputedStyle(sliderTrack).columnGap) || 0;
  const itemWidth = items[0].getBoundingClientRect().width + gap;
  const maxScroll = sliderTrack.scrollWidth - sliderTrack.clientWidth;
  if (maxScroll <= 0) return;

  if (direction > 0) {
    if (sliderTrack.scrollLeft + itemWidth >= maxScroll - 4) {
      sliderTrack.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      sliderTrack.scrollBy({ left: itemWidth, behavior: 'smooth' });
    }
  } else if (sliderTrack.scrollLeft <= 4) {
    sliderTrack.scrollTo({ left: maxScroll, behavior: 'smooth' });
  } else {
    sliderTrack.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  }
}

function renderProjects() {
  projectIntervals.forEach((interval) => clearInterval(interval));
  projectIntervals = [];
  widgetsEl.replaceChildren();

  state.projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'widget-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open project ${project.title}`);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = project.title;

    const imageWrap = document.createElement('div');
    imageWrap.className = 'widget-image';
    if (project.photos.length) {
      let visibleImage = document.createElement('img');
      visibleImage.alt = '';
      visibleImage.loading = 'lazy';
      visibleImage.onload = () => revealProjectImage(visibleImage);
      visibleImage.onerror = () => {
        console.error(`Could not load project image: ${project.photos[0].file}`);
      };
      visibleImage.src = project.photos[0].file;
      imageWrap.appendChild(visibleImage);

      if (project.photos.length > 1) {
        let index = 0;
        let loadingNextImage = false;
        const interval = setInterval(() => {
          if (loadingNextImage) return;
          loadingNextImage = true;
          const nextImage = document.createElement('img');
          const previousImage = visibleImage;
          const nextIndex = (index + 1) % project.photos.length;
          nextImage.alt = '';
          nextImage.onload = () => {
            revealProjectImage(nextImage, () => {
              nextImage.classList.add('is-visible');
              previousImage.classList.remove('is-visible');
              visibleImage = nextImage;
              index = nextIndex;
              loadingNextImage = false;
              setTimeout(() => previousImage.remove(), 1300);
            });
          };
          nextImage.onerror = () => {
            console.error(`Could not load project image: ${project.photos[nextIndex].file}`);
            nextImage.remove();
            loadingNextImage = false;
          };
          imageWrap.appendChild(nextImage);
          nextImage.src = project.photos[nextIndex].file;
        }, 4000);
        projectIntervals.push(interval);
      }
    } else {
      imageWrap.textContent = 'No photos';
    }

    card.append(title, imageWrap);
    card.addEventListener('click', () => openGallery(project));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openGallery(project);
      }
    });
    widgetsEl.appendChild(card);
  });
}

function revealProjectImage(image, onReveal = () => {
  image.classList.add('is-visible');
}) {
  requestAnimationFrame(() => {
    getComputedStyle(image).opacity;
    requestAnimationFrame(onReveal);
  });
}

function openGallery(project, focusPhotoId = null) {
  galleryTitle.textContent = project.title;
  galleryGrid.replaceChildren();

  project.photos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'photo-item';
    item.dataset.photoId = photo.id;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Open photo ${index + 1} of ${project.title}`);

    const img = document.createElement('img');
    img.src = photo.file;
    img.alt = '';
    img.loading = 'lazy';
    item.appendChild(img);
    item.addEventListener('click', () => openPhotoViewer(project.photos, index, project.title));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPhotoViewer(project.photos, index, project.title);
      }
    });
    galleryGrid.appendChild(item);
  });

  if (!project.photos.length) {
    galleryGrid.textContent = 'No photos yet.';
  }

  galleryModal.classList.add('show');
  if (focusPhotoId) {
    setTimeout(() => {
      const target = Array.from(galleryGrid.querySelectorAll('.photo-item'))
        .find((item) => item.dataset.photoId === focusPhotoId);
      if (!target) return;
      target.classList.add('highlight');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => target.classList.remove('highlight'), 2000);
    }, 80);
  }
}

function openPhotoViewer(photos, index, title = '') {
  currentPhotoList = photos;
  if (!currentPhotoList.length) return;
  currentPhotoTitle = title;
  currentPhotoIndex = Math.min(Math.max(index, 0), currentPhotoList.length - 1);
  updatePhotoViewer();
  photoModal.classList.add('show');
}

function updatePhotoViewer() {
  const photo = currentPhotoList[currentPhotoIndex];
  photoLarge.src = photo.file;
  const counter = `${currentPhotoIndex + 1} / ${currentPhotoList.length}`;
  photoCounter.textContent = currentPhotoTitle ? `${currentPhotoTitle} · ${counter}` : counter;
  const hasMultiplePhotos = currentPhotoList.length > 1;
  photoPrev.style.display = hasMultiplePhotos ? 'inline-flex' : 'none';
  photoNext.style.display = hasMultiplePhotos ? 'inline-flex' : 'none';
}

function stepPhoto(delta) {
  if (!currentPhotoList.length) return;
  currentPhotoIndex = (currentPhotoIndex + delta + currentPhotoList.length) % currentPhotoList.length;
  updatePhotoViewer();
}

function closePhotoViewer() {
  photoModal.classList.remove('show');
}

function closeGallery() {
  galleryModal.classList.remove('show');
}

galleryClose.addEventListener('click', closeGallery);
sliderPrev.addEventListener('click', () => moveSlider(-1));
sliderNext.addEventListener('click', () => moveSlider(1));
photoClose.addEventListener('click', closePhotoViewer);
photoPrev.addEventListener('click', () => stepPhoto(-1));
photoNext.addEventListener('click', () => stepPhoto(1));
photoModal.addEventListener('click', (event) => {
  if (event.target === photoModal) closePhotoViewer();
});
galleryModal.addEventListener('click', (event) => {
  if (event.target === galleryModal) closeGallery();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (photoModal.classList.contains('show')) {
      closePhotoViewer();
    } else if (galleryModal.classList.contains('show')) {
      closeGallery();
    }
    return;
  }

  const activeTag = document.activeElement && document.activeElement.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
  if (photoModal.classList.contains('show')) {
    if (event.key === 'ArrowLeft') stepPhoto(-1);
    if (event.key === 'ArrowRight') stepPhoto(1);
  } else if (event.key === 'ArrowLeft') {
    moveSlider(-1);
  } else if (event.key === 'ArrowRight') {
    moveSlider(1);
  }
});

loadSite();
