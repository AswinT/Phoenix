/**
 * Global Blocked User Handler
 * Automatically handles blocked user responses from AJAX requests
 * Shows SweetAlert popup and redirects them to login page
 */

(function() {
  'use strict';

  // Function to show blocked user alert
  function showBlockedUserAlert() {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Account Blocked',
        text: 'Your account has been blocked by the administrator. Please contact support for assistance.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#1B3C53',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        window.location.href = '/login?error=blocked';
      });
    } else {
      // Fallback if SweetAlert is not available
      alert('Your account has been blocked by the administrator. Please contact support for assistance.');
      window.location.href = '/login?error=blocked';
    }
  }

  // Store original fetch function
  const originalFetch = window.fetch;

  // Override fetch to handle blocked user responses
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);

      // Check if response indicates user is blocked
      if (response.status === 403) {
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          // Clone response to read it without consuming the original
          const clonedResponse = response.clone();

          try {
            const data = await clonedResponse.json();

            if (data.blocked || (data.message && data.message.includes('blocked'))) {
              // User is blocked, show alert and redirect
              showBlockedUserAlert();
              return response; // Return original response
            }
          } catch (e) {
            // If JSON parsing fails, continue with original response
          }
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  // Override XMLHttpRequest for older AJAX requests
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(data) {
    const xhr = this;
    
    // Store original onreadystatechange
    const originalOnReadyStateChange = xhr.onreadystatechange;
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        // Check if response indicates user is blocked
        if (xhr.status === 403) {
          try {
            const contentType = xhr.getResponseHeader('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              const responseData = JSON.parse(xhr.responseText);
              
              if (responseData.blocked || (responseData.message && responseData.message.includes('blocked'))) {
                // User is blocked, show alert and redirect
                showBlockedUserAlert();
                return;
              }
            }
          } catch (e) {
            // If JSON parsing fails, continue with original handler
          }
        }
      }
      
      // Call original handler
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, arguments);
  };

  // Handle jQuery AJAX if jQuery is available
  if (typeof $ !== 'undefined' && $.ajaxSetup) {
    $(document).ajaxComplete(function(event, xhr, settings) {
      if (xhr.status === 403) {
        try {
          const contentType = xhr.getResponseHeader('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            const responseData = JSON.parse(xhr.responseText);
            
            if (responseData.blocked || (responseData.message && responseData.message.includes('blocked'))) {
              // User is blocked, show alert and redirect
              showBlockedUserAlert();
            }
          }
        } catch (e) {
          // If JSON parsing fails, ignore
        }
      }
    });
  }

  // Handle axios if available
  if (typeof axios !== 'undefined') {
    axios.interceptors.response.use(
      function (response) {
        return response;
      },
      function (error) {
        if (error.response && error.response.status === 403) {
          const data = error.response.data;
          
          if (data && (data.blocked || (data.message && data.message.includes('blocked')))) {
            // User is blocked, show alert and redirect
            showBlockedUserAlert();
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Handle page redirects with blocked user alerts
  document.addEventListener('DOMContentLoaded', function() {
    // Skip handling on login pages as they have their own blocked user handling
    if (window.location.pathname === '/login' ||
        window.location.pathname === '/auth/login' ||
        window.location.pathname.includes('/login')) {
      return;
    }

    // For non-login pages, check if user was just blocked and redirected
    const wasBlocked = sessionStorage.getItem('userWasBlocked');
    if (wasBlocked === 'true') {
      sessionStorage.removeItem('userWasBlocked');
      showBlockedUserAlert();
    }
  });

  // Intercept regular page navigation for blocked users
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    checkForBlockedRedirect(args[2]);
    return originalPushState.apply(this, args);
  };

  history.replaceState = function(...args) {
    checkForBlockedRedirect(args[2]);
    return originalReplaceState.apply(this, args);
  };

  function checkForBlockedRedirect(url) {
    if (url && url.includes('/login?error=blocked')) {
      sessionStorage.setItem('userWasBlocked', 'true');
    }
  }

  console.log('Blocked User Handler initialized');

  // Image preview for return item modals
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input[type="file"][id^="returnImage"]').forEach(function(input) {
      input.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const previewId = 'returnImagePreview' + input.id.replace('returnImage', '');
        const preview = document.getElementById(previewId);
        if (file && preview) {
          const reader = new FileReader();
          reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        } else if (preview) {
          preview.src = '#';
          preview.style.display = 'none';
        }
      });
    });
  });
})();