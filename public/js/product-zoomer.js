// Enhanced Product Image Zoom Functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize image magnifier functionality
  initImageMagnifier();
  
  // Handle thumbnail clicks
  initThumbnailGallery();
  
  // Initialize Bootstrap tabs
  initProductTabs();
});

/**
 * Professional Image Magnifier with enhanced lens effect
 */
function initImageMagnifier() {
  const mainImage = document.getElementById('mainImage');
  const zoomContainer = document.getElementById('zoomContainer');
  
  if (!mainImage || !zoomContainer) return;
  
  // Create magnifier glass element
  const magnifierGlass = document.createElement('div');
  magnifierGlass.classList.add('img-magnifier-glass');
  zoomContainer.appendChild(magnifierGlass);
  
  // Create zoomed result container - now with larger size
  const zoomResult = document.createElement('div');
  zoomResult.classList.add('img-zoom-result');
  zoomContainer.appendChild(zoomResult);
  
  // Add a zoom level indicator/slider
  const zoomControls = document.createElement('div');
  zoomControls.classList.add('zoom-controls');
  zoomControls.innerHTML = `
    <div class="zoom-level-container">
      <button class="zoom-btn" data-zoom-change="-1">-</button>
      <div class="zoom-level-indicator">×<span id="zoomLevel">4</span></div>
      <button class="zoom-btn" data-zoom-change="1">+</button>
    </div>
  `;
  zoomContainer.appendChild(zoomControls);
  
  let isActive = false;
  let magnificationLevel = 4; // Increased default magnification
  const minZoom = 2;
  const maxZoom = 8;
  
  // Add event listeners to zoom control buttons
  const zoomBtns = zoomControls.querySelectorAll('.zoom-btn');
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const change = parseInt(this.getAttribute('data-zoom-change'));
      magnificationLevel = Math.max(minZoom, Math.min(maxZoom, magnificationLevel + change));
      document.getElementById('zoomLevel').textContent = magnificationLevel;
      
      // If zoom is active, update the view
      if (isActive) {
        const lastMouseEvent = zoomContainer.lastMouseEvent;
        if (lastMouseEvent) {
          zoomContainer.dispatchEvent(new MouseEvent('mousemove', lastMouseEvent));
        }
      }
    });
  });
  
  // Show magnifier glass and zoom result on mouseenter
  zoomContainer.addEventListener('mouseenter', function() {
    magnifierGlass.style.display = 'block';
    zoomResult.style.display = 'block';
    zoomControls.style.display = 'flex';
    isActive = true;
  });
  
  // Hide magnifier glass and zoom result on mouseleave
  zoomContainer.addEventListener('mouseleave', function() {
    magnifierGlass.style.display = 'none';
    zoomResult.style.display = 'none';
    zoomControls.style.display = 'none';
    isActive = false;
  });
  
  // Update magnifier position on mousemove
  zoomContainer.addEventListener('mousemove', function(e) {
    // Store the last mouse event for zoom level changes
    zoomContainer.lastMouseEvent = e;
    
    if (!isActive) return;
    
    // Get cursor position
    const rect = zoomContainer.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    
    // Calculate magnifier glass position
    const glassWidth = magnifierGlass.offsetWidth / 2;
    const glassHeight = magnifierGlass.offsetHeight / 2;
    
    let glassX = cursorX - glassWidth;
    let glassY = cursorY - glassHeight;
    
    // Constrain magnifier glass to image boundaries
    if (glassX < 0) glassX = 0;
    if (glassY < 0) glassY = 0;
    if (glassX > rect.width - magnifierGlass.offsetWidth) {
      glassX = rect.width - magnifierGlass.offsetWidth;
    }
    if (glassY > rect.height - magnifierGlass.offsetHeight) {
      glassY = rect.height - magnifierGlass.offsetHeight;
    }
    
    // Position magnifier glass
    magnifierGlass.style.left = glassX + 'px';
    magnifierGlass.style.top = glassY + 'px';
    
    // Calculate relative position for background image
    const percentX = (cursorX / rect.width) * 100;
    const percentY = (cursorY / rect.height) * 100;
    
    // Update magnifier glass background
    magnifierGlass.style.backgroundImage = `url('${mainImage.src}')`;
    magnifierGlass.style.backgroundSize = `${rect.width * magnificationLevel}px ${rect.height * magnificationLevel}px`;
    magnifierGlass.style.backgroundPosition = `${percentX}% ${percentY}%`;
    
    // Update zoom result display
    zoomResult.style.backgroundImage = `url('${mainImage.src}')`;
    zoomResult.style.backgroundSize = `${rect.width * magnificationLevel}px ${rect.height * magnificationLevel}px`;
    zoomResult.style.backgroundPosition = `${percentX}% ${percentY}%`;
  });
  
  // Add mouse wheel zoom capability
  zoomContainer.addEventListener('wheel', function(e) {
    if (isActive) {
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      magnificationLevel = Math.max(minZoom, Math.min(maxZoom, magnificationLevel + direction));
      document.getElementById('zoomLevel').textContent = magnificationLevel;
      
      // Update zoom with new magnification level
      const lastMouseEvent = zoomContainer.lastMouseEvent;
      if (lastMouseEvent) {
        zoomContainer.dispatchEvent(new MouseEvent('mousemove', lastMouseEvent));
      }
    }
  });
  
  // Handle touch devices
  zoomContainer.addEventListener('touchstart', function(e) {
    e.preventDefault();
    isActive = true;
    magnifierGlass.style.display = 'block';
    zoomResult.style.display = 'block';
    zoomControls.style.display = 'flex';
    updateTouchZoom(e.touches[0]);
  });
  
  zoomContainer.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (isActive) {
      updateTouchZoom(e.touches[0]);
    }
  });
  
  zoomContainer.addEventListener('touchend', function() {
    isActive = false;
    magnifierGlass.style.display = 'none';
    zoomResult.style.display = 'none';
    zoomControls.style.display = 'none';
  });
  
  function updateTouchZoom(touch) {
    const rect = zoomContainer.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Simulate a mousemove event
    const simulatedMouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    
    // Store the event for zoom level changes
    zoomContainer.lastMouseEvent = simulatedMouseEvent;
    
    zoomContainer.dispatchEvent(simulatedMouseEvent);
  }
  
  // Add click to toggle full-screen zoom mode on mobile
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
        
        // Store the event for zoom level changes
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
}

/**
 * Thumbnail Gallery Functionality
 */
function initThumbnailGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      const imageSrc = this.getAttribute('onclick').match(/'([^']+)'/)[1];
      changeImage(this, imageSrc);
      
      // Reset zoom elements
      const zoomContainer = document.getElementById('zoomContainer');
      if (zoomContainer) {
        const magnifierGlass = zoomContainer.querySelector('.img-magnifier-glass');
        const zoomResult = zoomContainer.querySelector('.img-zoom-result');
        const zoomControls = zoomContainer.querySelector('.zoom-controls');
        
        if (magnifierGlass) magnifierGlass.style.display = 'none';
        if (zoomResult) zoomResult.style.display = 'none';
        if (zoomControls) zoomControls.style.display = 'none';
      }
    });
  });
}

/**
 * Product Tabs Initialization
 */
function initProductTabs() {
  const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
  
  if (tabEls.length > 0) {
    // If Bootstrap 5 is already loaded properly
    if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
      tabEls.forEach(tabEl => {
        new bootstrap.Tab(tabEl);
      });
    } else {
      // Fallback - manually add click handlers for tabs
      tabEls.forEach(tabEl => {
        tabEl.addEventListener('click', function(event) {
          event.preventDefault();
          
          // Remove active class from all tabs and tab panes
          document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
          document.querySelectorAll('.tab-pane').forEach(el => {
            el.classList.remove('show', 'active');
          });
          
          // Add active class to clicked tab
          this.classList.add('active');
          
          // Get the target tab pane and make it active
          const target = document.querySelector(this.getAttribute('data-bs-target'));
          if (target) {
            target.classList.add('show', 'active');
          }
        });
      });
    }
  }
}

/**
 * Image Change Function
 */
function changeImage(thumbnail, imageSrc) {
  document.getElementById('mainImage').src = imageSrc;
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach(thumb => thumb.classList.remove('active'));
  thumbnail.classList.add('active');
}

/**
 * Quantity Selector Functions 
 */
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