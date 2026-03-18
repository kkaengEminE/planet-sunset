export class Navigation {
  constructor(scrollController) {
    this.scrollController = scrollController;
    this.buttons = document.querySelectorAll('.nav-btn');
    this.activeScene = 'ocean';

    this._initEvents();
  }

  _initEvents() {
    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const scene = btn.dataset.scene;
        if (this.scrollController) {
          this.scrollController.scrollToScene(scene);
        }
      });
    });
  }

  setActive(sceneName) {
    this.activeScene = sceneName;
    this.buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scene === sceneName);
    });

    // Update nav background tint
    const nav = document.getElementById('sunset-nav');
    const tints = {
      ocean: 'rgba(26, 10, 5, 0.5)',
      planet: 'rgba(10, 5, 20, 0.5)',
    };
    nav.style.background = tints[sceneName] || 'rgba(26, 10, 5, 0.5)';
  }
}
