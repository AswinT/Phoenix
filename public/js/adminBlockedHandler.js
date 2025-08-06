
(function() {
  'use strict';

  if (!window.location.pathname.startsWith('/admin/')) {
    return;
  }

  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      if (response.status === 403) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const clonedResponse = response.clone();
          
          try {
            const data = await clonedResponse.json();
            
            if (data.message && data.message.includes('Admin account has been blocked')) {
              window.location.href = '/admin/auth/login?error=admin_blocked';
              return response; // Return original response
            }
          } catch (e) {
          }
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function(...args) {
    const originalOnReadyStateChange = this.onreadystatechange;
    
    this.onreadystatechange = function() {
      if (this.readyState === 4) {
        if (this.status === 403) {
          try {
            const contentType = this.getResponseHeader('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              const responseData = JSON.parse(this.responseText);
              
              if (responseData.message && responseData.message.includes('Admin account has been blocked')) {
                window.location.href = '/admin/auth/login?error=admin_blocked';
                return;
              }
            }
          } catch (e) {
          }
        }
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, arguments);
  };

  if (typeof $ !== 'undefined' && $.ajaxSetup) {
    $(document).ajaxComplete(function(event, xhr, settings) {
      if (xhr.status === 403) {
        try {
          const contentType = xhr.getResponseHeader('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            const responseData = JSON.parse(xhr.responseText);
            
            if (responseData.message && responseData.message.includes('Admin account has been blocked')) {
              window.location.href = '/admin/auth/login?error=admin_blocked';
            }
          }
        } catch (e) {
        }
      }
    });
  }

  if (typeof axios !== 'undefined') {
    axios.interceptors.response.use(
      function (response) {
        return response;
      },
      function (error) {
        if (error.response && error.response.status === 403) {
          const data = error.response.data;
          
          if (data && data.message && data.message.includes('Admin account has been blocked')) {
            window.location.href = '/admin/auth/login?error=admin_blocked';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

})();
