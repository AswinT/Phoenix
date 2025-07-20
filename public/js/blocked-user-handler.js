/**
 * Global Blocked User Handler
 * Automatically handles blocked user responses from AJAX requests
 * and redirects them to login page with appropriate error message
 */

(function() {
  'use strict';

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
              // User is blocked, redirect to login with error
              window.location.href = '/login?error=blocked';
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
                // User is blocked, redirect to login with error
                window.location.href = '/login?error=blocked';
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
              // User is blocked, redirect to login with error
              window.location.href = '/login?error=blocked';
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
            // User is blocked, redirect to login with error
            window.location.href = '/login?error=blocked';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  console.log('Blocked User Handler initialized');
})();