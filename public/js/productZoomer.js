document.addEventListener('DOMContentLoaded', function() {
  initImageMagnifier();

  initThumbnailGallery();

  initProductTabs();
});

function initImageMagnifier() {
  const mainImage = document.getElementById('mainImage');
  const zoomContainer = document.getElementById('zoomContainer');

  if (!mainImage || !zoomContainer) return;

  const magnifierGlass = document.createElement('div');
  magnifierGlass.classList.add('img-magnifier-glass');
  zoomContainer.appendChild(magnifierGlass);

  const zoomResult = document.createElement('div');
  zoomResult.classList.add('img-zoom-result');
  zoomContainer.appendChild(zoomResult);

  const zoomControls = document.createElement('div');
  zoomControls.classList.add('zoom-controls');
  zoomControls.innerHTML = `
    <div class="zoom-level-container">
      <button class="zoom-btn" data-zoom-change="-1" title="Zoom Out">-</button>
      <div class="zoom-level-indicator">×<span id="zoomLevel">3</span></div>
      <button class="zoom-btn" data-zoom-change="1" title="Zoom In">+</button>
      <div class="zoom-presets">
        <button class="zoom-preset-btn" data-zoom-preset="2" title="2x Zoom">2×</button>
        <button class="zoom-preset-btn active" data-zoom-preset="3" title="3x Zoom">3×</button>
        <button class="zoom-preset-btn" data-zoom-preset="4" title="4x Zoom">4×</button>
        <button class="zoom-preset-btn" data-zoom-preset="5" title="5x Zoom">5×</button>
      </div>
    </div>
  `;
  zoomContainer.appendChild(zoomControls);

  const resetButton = document.createElement('button');
  resetButton.classList.add('zoom-reset-btn');
  resetButton.innerHTML = '×';
  resetButton.title = 'Reset Zoom';
  zoomResult.appendChild(resetButton);

  const loadingIndicator = document.createElement('div');
  loadingIndicator.classList.add('zoom-loading');
  zoomResult.appendChild(loadingIndicator);

  let isActive = false;
  let magnificationLevel = 3; // Optimized default magnification
  let animationFrameId = null;
  const minZoom = 2;
  const maxZoom = 6;
  const presetZoomLevels = [2, 3, 4, 5];

  let mouseMoveTimeout = null;
  
  const zoomBtns = zoomControls.querySelectorAll('.zoom-btn');
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const change = parseInt(this.getAttribute('data-zoom-change'));
      const newLevel = Math.max(minZoom, Math.min(maxZoom, magnificationLevel + change));

      if (newLevel !== magnificationLevel) {
        setZoomLevel(newLevel);

        this.style.transform = 'scale(0.9)';
        setTimeout(() => {
          this.style.transform = 'scale(1)';
        }, 100);
      }
    });
  });

  const presetBtns = zoomControls.querySelectorAll('.zoom-preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const presetLevel = parseInt(this.getAttribute('data-zoom-preset'));
      setZoomLevel(presetLevel);

      presetBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  resetButton.addEventListener('click', function(e) {
    e.preventDefault();
    setZoomLevel(3); // Reset to default

    presetBtns.forEach(b => b.classList.remove('active'));
    presetBtns[1].classList.add('active'); // 3x is default
  });

  function setZoomLevel(newLevel) {
    if (newLevel !== magnificationLevel && newLevel >= minZoom && newLevel <= maxZoom) {
      magnificationLevel = newLevel;
      document.getElementById('zoomLevel').textContent = magnificationLevel;

      presetBtns.forEach(btn => {
        const presetLevel = parseInt(btn.getAttribute('data-zoom-preset'));
        btn.classList.toggle('active', presetLevel === magnificationLevel);
      });

      if (isActive) {
        updateZoomView();
      }
    }
  }

  zoomContainer.addEventListener('mouseenter', function(e) {
    if (window.innerWidth <= 576) return; // Skip on very small screens

    isActive = true;
    magnifierGlass.style.display = 'block';
    zoomResult.style.display = 'block';
    zoomControls.style.display = 'flex';
    resetButton.style.display = 'flex';

    zoomResult.classList.add('zoom-in');
    setTimeout(() => {
      zoomResult.classList.remove('zoom-in');
    }, 300);

    updateZoomView(e);
  });

  zoomContainer.addEventListener('mouseleave', function() {
    isActive = false;

    zoomResult.classList.add('zoom-out');

    setTimeout(() => {
      magnifierGlass.style.display = 'none';
      zoomResult.style.display = 'none';
      zoomControls.style.display = 'none';
      resetButton.style.display = 'none';
      zoomResult.classList.remove('zoom-out');
    }, 300);

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  });
  
  zoomContainer.addEventListener('mousemove', function(e) {
    if (!isActive) return;

    if (mouseMoveTimeout) {
      clearTimeout(mouseMoveTimeout);
    }

    mouseMoveTimeout = setTimeout(() => {
      updateZoomView(e);
    }, 16); // ~60fps
  });

  const imageCache = new Map();
  let currentImageSrc = mainImage.src;

  function preloadImage(src) {
    if (imageCache.has(src)) {
      return Promise.resolve(imageCache.get(src));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  function updateZoomView(e) {
    if (!isActive) return;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      const rect = zoomContainer.getBoundingClientRect();
      let cursorX, cursorY;

      if (e) {
        cursorX = e.clientX - rect.left;
        cursorY = e.clientY - rect.top;
      } else {
        cursorX = rect.width / 2;
        cursorY = rect.height / 2;
      }

      const glassWidth = magnifierGlass.offsetWidth / 2;
      const glassHeight = magnifierGlass.offsetHeight / 2;

      let glassX = Math.max(0, Math.min(rect.width - magnifierGlass.offsetWidth, cursorX - glassWidth));
      let glassY = Math.max(0, Math.min(rect.height - magnifierGlass.offsetHeight, cursorY - glassHeight));

      magnifierGlass.style.transform = `translate(${glassX}px, ${glassY}px)`;
      magnifierGlass.style.left = '0px';
      magnifierGlass.style.top = '0px';

      const percentX = (cursorX / rect.width) * 100;
      const percentY = (cursorY / rect.height) * 100;

      const bgSize = `${rect.width * magnificationLevel}px ${rect.height * magnificationLevel}px`;
      const bgPosition = `${percentX}% ${percentY}%`;

      if (currentImageSrc !== mainImage.src) {
        currentImageSrc = mainImage.src;
        showLoadingState();

        preloadImage(currentImageSrc).then(() => {
          hideLoadingState();
          updateBackgrounds(bgSize, bgPosition);
        }).catch(() => {
          hideLoadingState();
          updateBackgrounds(bgSize, bgPosition);
        });
      } else {
        updateBackgrounds(bgSize, bgPosition);
      }
    });
  }

  function updateBackgrounds(bgSize, bgPosition) {
    magnifierGlass.style.backgroundImage = `url('${currentImageSrc}')`;
    magnifierGlass.style.backgroundSize = bgSize;
    magnifierGlass.style.backgroundPosition = bgPosition;

    zoomResult.style.backgroundImage = `url('${currentImageSrc}')`;
    zoomResult.style.backgroundSize = bgSize;
    zoomResult.style.backgroundPosition = bgPosition;
  }

  function showLoadingState() {
    loadingIndicator.style.display = 'block';
    zoomResult.style.opacity = '0.7';
  }

  function hideLoadingState() {
    loadingIndicator.style.display = 'none';
    zoomResult.style.opacity = '1';
  }
  
  zoomContainer.addEventListener('wheel', function(e) {
    if (isActive) {
      e.preventDefault();

      const direction = e.deltaY > 0 ? -0.5 : 0.5; // Smoother zoom increments
      const newLevel = Math.max(minZoom, Math.min(maxZoom, magnificationLevel + direction));

      if (newLevel !== magnificationLevel) {
        magnificationLevel = newLevel;
        document.getElementById('zoomLevel').textContent = magnificationLevel.toFixed(1);

        updateZoomView(e);
      }
    }
  }, { passive: false });
  
  let touchStartDistance = 0;
  let touchStartZoom = magnificationLevel;
  let touches = [];
  let touchTimeout = null;

  zoomContainer.addEventListener('touchstart', function(e) {
    e.preventDefault();
    touches = Array.from(e.touches);

    if (touches.length === 1) {
      isActive = true;
      magnifierGlass.style.display = 'block';
      zoomResult.style.display = 'block';
      zoomControls.style.display = 'flex';
      resetButton.style.display = 'flex';
      updateTouchZoom(touches[0]);
    } else if (touches.length === 2) {
      touchStartDistance = getTouchDistance(touches[0], touches[1]);
      touchStartZoom = magnificationLevel;
    }
  });

  zoomContainer.addEventListener('touchmove', function(e) {
    e.preventDefault();
    touches = Array.from(e.touches);

    if (touches.length === 1 && isActive) {
      updateTouchZoom(touches[0]);
    } else if (touches.length === 2) {
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const scale = currentDistance / touchStartDistance;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, touchStartZoom * scale));

      if (Math.abs(newZoom - magnificationLevel) > 0.1) {
        setZoomLevel(Math.round(newZoom * 2) / 2); // Round to nearest 0.5
      }
    }
  });

  zoomContainer.addEventListener('touchend', function(e) {
    touches = Array.from(e.touches);

    if (touches.length === 0) {
      touchTimeout = setTimeout(() => {
        isActive = false;
        magnifierGlass.style.display = 'none';
        zoomResult.style.display = 'none';
        zoomControls.style.display = 'none';
        resetButton.style.display = 'none';
      }, 300); // Small delay to prevent flickering
    }
  });

  function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let keyboardZoomActive = false;

  zoomContainer.addEventListener('keydown', function(e) {
    if (!zoomContainer.contains(document.activeElement)) return;

    switch(e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isActive) {
          isActive = true;
          keyboardZoomActive = true;
          magnifierGlass.style.display = 'block';
          zoomResult.style.display = 'block';
          zoomControls.style.display = 'flex';
          resetButton.style.display = 'flex';
          updateZoomView();
        } else {
          isActive = false;
          keyboardZoomActive = false;
          magnifierGlass.style.display = 'none';
          zoomResult.style.display = 'none';
          zoomControls.style.display = 'none';
          resetButton.style.display = 'none';
        }
        break;
      case '+':
      case '=':
        e.preventDefault();
        setZoomLevel(Math.min(maxZoom, magnificationLevel + 0.5));
        break;
      case '-':
        e.preventDefault();
        setZoomLevel(Math.max(minZoom, magnificationLevel - 0.5));
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault();
        const level = parseInt(e.key);
        if (level >= minZoom && level <= maxZoom) {
          setZoomLevel(level);
        }
        break;
      case 'Escape':
        e.preventDefault();
        isActive = false;
        keyboardZoomActive = false;
        magnifierGlass.style.display = 'none';
        zoomResult.style.display = 'none';
        zoomControls.style.display = 'none';
        resetButton.style.display = 'none';
        break;
    }
  });

  zoomContainer.setAttribute('tabindex', '0');
  zoomContainer.setAttribute('role', 'button');
  zoomContainer.setAttribute('aria-label', 'Product image with zoom functionality. Press Enter to activate zoom, +/- to change zoom level, 1-5 for preset levels, Escape to exit.');

  zoomContainer.addEventListener('focus', function() {
    this.style.outline = '3px solid rgba(27, 60, 83, 0.5)';
    this.style.outlineOffset = '2px';
  });

  zoomContainer.addEventListener('blur', function() {
    this.style.outline = 'none';
    if (keyboardZoomActive) {
      isActive = false;
      keyboardZoomActive = false;
      magnifierGlass.style.display = 'none';
      zoomResult.style.display = 'none';
      zoomControls.style.display = 'none';
      resetButton.style.display = 'none';
    }
  });
  
  function updateTouchZoom(touch) {
    const rect = zoomContainer.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const simulatedMouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    
    zoomContainer.lastMouseEvent = simulatedMouseEvent;
    
    zoomContainer.dispatchEvent(simulatedMouseEvent);
  }
  
  zoomContainer.addEventListener('click', function(e) {
    if (window.innerWidth < 768) {
      if (!isActive) {
        isActive = true;
        magnifierGlass.style.display = 'block';
        zoomResult.style.display = 'block';
        zoomControls.style.display = 'flex';
        zoomResult.classList.add('fullscreen-mobile');
        
        const rect = zoomContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const simulatedMouseEvent = new MouseEvent('mousemove', {
          clientX: e.clientX,
          clientY: e.clientY
        });
        
        zoomContainer.lastMouseEvent = simulatedMouseEvent;
        
        zoomContainer.dispatchEvent(simulatedMouseEvent);
      } else {
        isActive = false;
        magnifierGlass.style.display = 'none';
        zoomResult.style.display = 'none';
        zoomControls.style.display = 'none';
        zoomResult.classList.remove('fullscreen-mobile');
      }
    }
  });

  zoomResult.addEventListener('dblclick', function() {
    toggleFullscreenZoom();
  });

  function toggleFullscreenZoom() {
    if (zoomResult.classList.contains('fullscreen-zoom')) {
      exitFullscreenZoom();
    } else {
      enterFullscreenZoom();
    }
  }

  function enterFullscreenZoom() {
    zoomResult.classList.add('fullscreen-zoom');
    document.body.style.overflow = 'hidden';

    zoomResult.style.position = 'fixed';
    zoomResult.style.top = '0';
    zoomResult.style.left = '0';
    zoomResult.style.width = '100vw';
    zoomResult.style.height = '100vh';
    zoomResult.style.zIndex = '9999';
    zoomResult.style.margin = '0';
    zoomResult.style.borderRadius = '0';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border: none;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      z-index: 10000;
      transition: all 0.3s ease;
    `;
    closeBtn.addEventListener('click', exitFullscreenZoom);
    zoomResult.appendChild(closeBtn);
  }

  function exitFullscreenZoom() {
    zoomResult.classList.remove('fullscreen-zoom');
    document.body.style.overflow = '';

    zoomResult.style.position = 'absolute';
    zoomResult.style.top = '0';
    zoomResult.style.left = '100%';
    zoomResult.style.width = '450px';
    zoomResult.style.height = '450px';
    zoomResult.style.zIndex = '100';
    zoomResult.style.margin = '0 0 0 30px';
    zoomResult.style.borderRadius = '12px';

    const closeBtn = zoomResult.querySelector('.fullscreen-close-btn');
    if (closeBtn) {
      closeBtn.remove();
    }
  }

  window.currentZoomInstance = {
    isActive,
    magnificationLevel,
    setZoomLevel,
    toggleFullscreenZoom,
    preloadImage,
    zoomContainer,
    magnifierGlass,
    zoomResult,
    zoomControls,
    resetButton
  };
}

function initThumbnailGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail');

  thumbnails.forEach(thumbnail => {
    const imageSrc = thumbnail.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (imageSrc) {
      preloadThumbnailImage(imageSrc);
    }
  });

  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      const imageSrc = this.getAttribute('onclick').match(/'([^']+)'/)[1];
      changeImageWithTransition(this, imageSrc);
    });

    thumbnail.addEventListener('mouseenter', function() {
      const imageSrc = this.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      if (imageSrc) {
        preloadThumbnailImage(imageSrc);
      }
    });
  });
}

function preloadThumbnailImage(src) {
  if (!window.thumbnailImageCache) {
    window.thumbnailImageCache = new Map();
  }

  if (!window.thumbnailImageCache.has(src)) {
    const img = new Image();
    img.onload = () => {
      window.thumbnailImageCache.set(src, img);
    };
    img.src = src;
  }
}

function changeImageWithTransition(thumbnail, imageSrc) {
  const mainImage = document.getElementById('mainImage');
  const zoomContainer = document.getElementById('zoomContainer');

  if (!mainImage || !zoomContainer) return;

  const magnifierGlass = zoomContainer.querySelector('.img-magnifier-glass');
  const zoomResult = zoomContainer.querySelector('.img-zoom-result');
  const zoomControls = zoomContainer.querySelector('.zoom-controls');
  const resetButton = zoomContainer.querySelector('.zoom-reset-btn');

  if (magnifierGlass) magnifierGlass.style.display = 'none';
  if (zoomResult) {
    zoomResult.style.opacity = '0';
    setTimeout(() => {
      zoomResult.style.display = 'none';
      zoomResult.style.opacity = '1';
    }, 200);
  }
  if (zoomControls) zoomControls.style.display = 'none';
  if (resetButton) resetButton.style.display = 'none';

  mainImage.style.opacity = '0.7';

  const newImg = new Image();
  newImg.onload = () => {
    mainImage.src = imageSrc;
    mainImage.style.opacity = '1';

    document.querySelectorAll('.thumbnail').forEach(thumb => {
      thumb.classList.remove('active');
    });
    thumbnail.classList.add('active');

    if (window.currentZoomInstance) {
      window.currentZoomInstance.isActive = false;
    }
  };

  newImg.onerror = () => {
    mainImage.style.opacity = '1';
  };

  newImg.src = imageSrc;
}

function initProductTabs() {
  const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
  
  if (tabEls.length > 0) {
    if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
      tabEls.forEach(tabEl => {
        new bootstrap.Tab(tabEl);
      });
    } else {
      tabEls.forEach(tabEl => {
        tabEl.addEventListener('click', function(event) {
          event.preventDefault();
          
          document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
          document.querySelectorAll('.tab-pane').forEach(el => {
            el.classList.remove('show', 'active');
          });
          
          this.classList.add('active');
          
          const target = document.querySelector(this.getAttribute('data-bs-target'));
          if (target) {
            target.classList.add('show', 'active');
          }
        });
      });
    }
  }
}

function changeImage(thumbnail, imageSrc) {
  document.getElementById('mainImage').src = imageSrc;
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach(thumb => thumb.classList.remove('active'));
  thumbnail.classList.add('active');
}

function incrementQuantity() {
  const quantityInput = document.getElementById('quantity');
  const currentValue = parseInt(quantityInput.value);
  const maxValue = parseInt(quantityInput.getAttribute('max'));
  if (currentValue < maxValue) {
    quantityInput.value = currentValue + 1;
  }
}

function decrementQuantity() {
  const quantityInput = document.getElementById('quantity');
  const currentValue = parseInt(quantityInput.value);
  if (currentValue > 1) {
    quantityInput.value = currentValue - 1;
  }
}