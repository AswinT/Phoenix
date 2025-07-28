/**
 * Admin Blocked Handler
 * Handles blocked admin responses from AJAX requests
 * and redirects them to admin login page with appropriate error message
 */

(function() {
  'use strict';

  // Only run on admin pages
  if (!window.location.pathname.startsWith('/admin/')) {
    return;
  }

  // Store original fetch function
  const originalFetch = window.fetch;

  // Override fetch to handle blocked admin responses
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Check if response indicates admin is blocked
      if (response.status === 403) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // Clone response to read it without consuming the original
          const clonedResponse = response.clone();
          
          try {
            const data = await clonedResponse.json();
            
            if (data.message && data.message.includes('Admin account has been blocked')) {
              // Admin is blocked, redirect to admin login with error
              window.location.href = '/admin/auth/login?error=admin_blocked';
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

  // Store original XMLHttpRequest send method
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Override XMLHttpRequest send method
  XMLHttpRequest.prototype.send = function(...args) {
    const originalOnReadyStateChange = this.onreadystatechange;
    
    this.onreadystatechange = function() {
      if (this.readyState === 4) {
        // Check if response indicates admin is blocked
        if (this.status === 403) {
          try {
            const contentType = this.getResponseHeader('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              const responseData = JSON.parse(this.responseText);
              
              if (responseData.message && responseData.message.includes('Admin account has been blocked')) {
                // Admin is blocked, redirect to admin login with error
                window.location.href = '/admin/auth/login?error=admin_blocked';
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
            
            if (responseData.message && responseData.message.includes('Admin account has been blocked')) {
              // Admin is blocked, redirect to admin login with error
              window.location.href = '/admin/auth/login?error=admin_blocked';
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
          
          if (data && data.message && data.message.includes('Admin account has been blocked')) {
            // Admin is blocked, redirect to admin login with error
            window.location.href = '/admin/auth/login?error=admin_blocked';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

})();
