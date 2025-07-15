// Professional Authentication Handler
// Handles unauthenticated user interactions with cart/wishlist

class AuthHandler {
  // Handle authentication required responses
  static handleAuthRequired(result, action = "perform this action") {
    if (result.requiresAuth || result.message?.includes('log in')) {
      this.showAuthRequiredDialog(action, result.redirectTo || '/login');
      return true;
    }
    return false;
  }

  // Show professional authentication required dialog
  static showAuthRequiredDialog(action, redirectUrl = '/login') {
    Swal.fire({
      title: 'Sign In Required',
      text: `Please sign in to ${action}`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sign In',
      cancelButtonText: 'Continue Browsing',
      reverseButtons: true,
      customClass: {
        popup: 'auth-required-popup',
        title: 'auth-required-title',
        content: 'auth-required-content'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Store the current page to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = redirectUrl;
      }
    });
  }

  // Handle successful cart/wishlist operations
  static handleSuccess(result, action = "Operation completed") {
    // Update cart count if provided
    if (result.cartCount !== undefined) {
      const cartCountElement = document.querySelector('.cart-count');
      if (cartCountElement) {
        cartCountElement.textContent = result.cartCount;
        cartCountElement.dataset.count = result.cartCount;
      }
    }



    // Show success toast
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: result.message || action,
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true
    });
  }

  // Handle error responses
  static handleError(result, defaultMessage = "An error occurred") {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: result.message || defaultMessage,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
  }

  // Generic handler for cart/wishlist API calls
  static async handleApiCall(url, data, successAction, errorAction) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        this.handleSuccess(result, successAction);
        return { success: true, result };
      } else {
        // Check if authentication is required
        if (this.handleAuthRequired(result, errorAction)) {
          return { success: false, authRequired: true };
        }
        
        // Handle other errors
        this.handleError(result, `Failed to ${errorAction}`);
        return { success: false, result };
      }
    } catch (error) {
      console.error(`Error in ${errorAction}:`, error);
      this.handleError({}, `Error ${errorAction}`);
      return { success: false, error };
    }
  }

  // Add item to cart with professional handling
  static async addToCart(productId, quantity = 1) {
    return await this.handleApiCall(
      '/cart/add',
      { productId, quantity },
      'Item added to cart',
      'add to cart'
    );
  }


}

// Make AuthHandler globally available
window.AuthHandler = AuthHandler;

// Add custom CSS for auth dialog
const authStyles = `
<style>
.auth-required-popup {
  border-radius: 15px !important;
}

.auth-required-title {
  color: #2c3e50 !important;
  font-weight: 600 !important;
}

.auth-required-content {
  color: #5a6c7d !important;
  font-size: 16px !important;
}

.swal2-confirm {
  background-color: #3085d6 !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  padding: 10px 24px !important;
}

.swal2-cancel {
  background-color: #6c757d !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  padding: 10px 24px !important;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', authStyles);
