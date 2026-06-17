const SITE_CONFIG = Object.freeze({
  brand: "YJJ",
  title: "历年项目回顾与精选",
  role: "3D RENDERING ARTIST",
  location: "BASED IN CHINA",
});

const projects = Array.isArray(window.PORTFOLIO_PROJECTS)
  ? window.PORTFOLIO_PROJECTS
  : [];
const PROJECT_DISPLAY_MOVES = Object.freeze([
  {
    projectId: "p-2024-03",
    targetYear: 2023,
    beforeProjectId: "p-2023-02",
  },
]);

const archive = document.querySelector("#project-archive");
const yearNavList = document.querySelector("#year-nav-list");
const viewer = document.querySelector("#project-viewer");
const viewerSlides = document.querySelector("#viewer-slides");
const viewerTitle = document.querySelector("#viewer-title");
const viewerYear = document.querySelector("#viewer-year");
const viewerCurrent = document.querySelector("#viewer-current");
const viewerTotal = document.querySelector("#viewer-total");
const closeButton = document.querySelector(".viewer__close");
const previousButton = document.querySelector(".viewer__previous");
const nextButton = document.querySelector(".viewer__next");

let activeProjectIndex = -1;
let viewerTrigger = null;
let slideObserver = null;

function applySiteConfig() {
  document.querySelectorAll("[data-site-brand]").forEach((element) => {
    element.textContent = SITE_CONFIG.brand;
  });
  document.querySelectorAll("[data-site-title]").forEach((element) => {
    element.setAttribute("aria-label", SITE_CONFIG.title);
  });
  document.querySelectorAll("[data-site-role]").forEach((element) => {
    element.textContent = SITE_CONFIG.role;
  });
  document.querySelectorAll("[data-site-location]").forEach((element) => {
    element.textContent = SITE_CONFIG.location;
  });
  document.title = `${SITE_CONFIG.title} — ${SITE_CONFIG.role}`;
  document.querySelector("#current-year").textContent = new Date().getFullYear();
}

function pictureMarkup(image, sizes, loading = "lazy") {
  return `
    <picture>
      <source type="image/avif" srcset="${image.avifSrcset}" sizes="${sizes}">
      <img
        src="${image.src}"
        srcset="${image.srcset}"
        sizes="${sizes}"
        width="${image.width}"
        height="${image.height}"
        alt="${image.alt}"
        loading="${loading}"
        decoding="async"
      >
    </picture>
  `;
}

function imageOrientation(image) {
  const ratio = image.width / image.height;
  if (ratio < 0.85) return "is-portrait";
  if (ratio <= 1.15) return "is-square";
  return "is-landscape";
}

function displayProjectsForYear(year) {
  const movedProjectIds = new Set(
    PROJECT_DISPLAY_MOVES.map((move) => move.projectId),
  );
  const displayProjects = projects.filter(
    (project) => project.year === year && !movedProjectIds.has(project.id),
  );

  PROJECT_DISPLAY_MOVES.filter((move) => move.targetYear === year).forEach(
    (move) => {
      const project = projects.find(
        (candidate) => candidate.id === move.projectId,
      );
      if (!project) return;

      const targetIndex = displayProjects.findIndex(
        (candidate) => candidate.id === move.beforeProjectId,
      );
      if (targetIndex === -1) {
        displayProjects.push(project);
        return;
      }
      displayProjects.splice(targetIndex, 0, project);
    },
  );

  return displayProjects;
}

function projectCardMarkup(project) {
  const globalIndex = projects.findIndex(
    (candidate) => candidate.id === project.id,
  );
  const isSingle = project.images.length === 1;
  const gallery = project.images
    .map(
      (image, imageIndex) => `
        <button
          class="project-image ${imageOrientation(image)}"
          type="button"
          data-project-index="${globalIndex}"
          data-image-index="${imageIndex}"
          aria-label="查看 ${project.name} 项目图片 ${imageIndex + 1}"
        >
          <span class="project-image__media">
            ${pictureMarkup(image, "(max-width: 800px) 92vw, 50vw")}
          </span>
          <span class="project-image__index">
            ${String(imageIndex + 1).padStart(2, "0")}
          </span>
        </button>
      `,
    )
    .join("");

  return `
    <article class="project-card${isSingle ? " is-single" : ""}">
      <header class="project-card__header">
        <h4 class="project-card__title">${project.name}</h4>
        <p>${String(project.images.length).padStart(2, "0")} IMAGES</p>
      </header>
      <div class="project-card__gallery">
        ${gallery}
      </div>
    </article>
  `;
}

function singleProjectGroupMarkup(projectsInGroup, orientation) {
  if (!projectsInGroup.length) return "";
  return `
    <div class="project-card-group is-${orientation}">
      ${projectsInGroup.map(projectCardMarkup).join("")}
    </div>
  `;
}

function yearProjectMarkup(yearProjects) {
  const firstSingleIndex = yearProjects.findIndex(
    (project) => project.images.length === 1,
  );

  if (firstSingleIndex === -1) {
    return yearProjects.map(projectCardMarkup).join("");
  }

  const singleProjects = yearProjects.filter(
    (project) => project.images.length === 1,
  );
  const multiProjects = yearProjects.filter(
    (project) => project.images.length > 1,
  );
  const portraitSingles = singleProjects.filter(
    (project) => imageOrientation(project.images[0]) === "is-portrait",
  );
  const landscapeSingles = singleProjects.filter(
    (project) => imageOrientation(project.images[0]) !== "is-portrait",
  );
  const beforeSingles = multiProjects.filter(
    (project) => yearProjects.indexOf(project) < firstSingleIndex,
  );
  const afterSingles = multiProjects.filter(
    (project) => yearProjects.indexOf(project) > firstSingleIndex,
  );

  return [
    ...beforeSingles.map(projectCardMarkup),
    singleProjectGroupMarkup(portraitSingles, "portrait"),
    singleProjectGroupMarkup(landscapeSingles, "landscape"),
    ...afterSingles.map(projectCardMarkup),
  ].join("");
}

function renderArchive() {
  const years = [...new Set(projects.map((project) => project.year))];

  yearNavList.innerHTML = years
    .map(
      (year, index) =>
        `<a href="#year-${year}" class="${index === 0 ? "is-active" : ""}" data-year-link="${year}">${year}</a>`,
    )
    .join("");

  archive.innerHTML = years
    .map((year) => {
      const yearProjects = displayProjectsForYear(year);
      const cards = yearProjectMarkup(yearProjects);

      return `
        <section class="year-section" id="year-${year}" data-year="${year}">
          <header class="year-section__header">
            <h3>${year}</h3>
            <p>${String(yearProjects.length).padStart(2, "0")} PROJECTS</p>
          </header>
          <div class="project-grid">${cards}</div>
        </section>
      `;
    })
    .join("");
}

function observePage() {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  document
    .querySelectorAll(".reveal, .project-card")
    .forEach((element) => revealObserver.observe(element));

  const yearObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      document.querySelectorAll("[data-year-link]").forEach((link) => {
        link.classList.toggle(
          "is-active",
          link.dataset.yearLink === visible.target.dataset.year,
        );
      });
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.5] },
  );

  document
    .querySelectorAll(".year-section")
    .forEach((section) => yearObserver.observe(section));
}

function renderViewer(project) {
  viewerTitle.textContent = project.name;
  viewerYear.textContent = String(project.year);
  viewerCurrent.textContent = "01";
  viewerTotal.textContent = String(project.images.length).padStart(2, "0");

  viewerSlides.innerHTML = project.images
    .map(
      (image, index) => `
        <section class="viewer__slide" data-slide-index="${index}">
          ${pictureMarkup(
            image,
            "(max-width: 800px) 96vw, 88vw",
            index === 0 ? "eager" : "lazy",
          )}
        </section>
      `,
    )
    .join("");

  viewerSlides.scrollTop = 0;
  slideObserver?.disconnect();
  slideObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      viewerCurrent.textContent = String(
        Number(visible.target.dataset.slideIndex) + 1,
      ).padStart(2, "0");
    },
    { root: viewerSlides, threshold: [0.55, 0.8] },
  );
  viewerSlides
    .querySelectorAll(".viewer__slide")
    .forEach((slide) => slideObserver.observe(slide));
}

function openProject(index, trigger = null, imageIndex = 0) {
  activeProjectIndex = (index + projects.length) % projects.length;
  viewerTrigger = trigger || viewerTrigger;
  renderViewer(projects[activeProjectIndex]);

  if (!viewer.open) {
    viewer.showModal();
    document.body.classList.add("viewer-open");
  }

  const targetSlide = viewerSlides.querySelector(
    `[data-slide-index="${imageIndex}"]`,
  );
  if (targetSlide) {
    targetSlide.scrollIntoView({ block: "start" });
    viewerCurrent.textContent = String(imageIndex + 1).padStart(2, "0");
  }
  closeButton.focus();
}

function closeViewer() {
  if (!viewer.open) return;
  viewer.close();
}

function changeProject(direction) {
  openProject(activeProjectIndex + direction);
}

archive.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-index]");
  if (!button) return;
  openProject(
    Number(button.dataset.projectIndex),
    button,
    Number(button.dataset.imageIndex || 0),
  );
});

closeButton.addEventListener("click", closeViewer);
previousButton.addEventListener("click", () => changeProject(-1));
nextButton.addEventListener("click", () => changeProject(1));

viewer.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeViewer();
});

viewer.addEventListener("close", () => {
  slideObserver?.disconnect();
  document.body.classList.remove("viewer-open");
  viewerTrigger?.focus();
});

viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

document.addEventListener("keydown", (event) => {
  if (!viewer.open) return;
  if (event.key === "ArrowLeft") changeProject(-1);
  if (event.key === "ArrowRight") changeProject(1);
});

applySiteConfig();
renderArchive();
observePage();
