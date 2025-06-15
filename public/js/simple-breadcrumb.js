/* ===================================
   PHOENIX - CONCISE BREADCRUMB SYSTEM
   =================================== */

class SimpleBreadcrumb {
  constructor() {
    this.currentPath = window.location.pathname;
    this.routeMap = this.initializeRouteMap();
    this.init();
  }

  initializeRouteMap() {
    return {
      // User-facing routes
      '/': { name: 'Home' },
      '/dashboard': { name: 'Home' },
      '/shop': { name: 'Shop' },
      '/products': { name: 'Shop' },
      '/profile': { name: 'Profile' },
      '/settings': { name: 'Settings' },
      '/login': { name: 'Login' },
      '/signup': { name: 'Sign Up' },
      '/verify-otp': { name: 'Verify OTP' },
      '/forgot-password': { name: 'Forgot Password' },
      '/forgot-verify-otp': { name: 'Verify OTP' },
      '/reset-password': { name: 'Reset Password' },
      '/new-password': { name: 'Reset Password' },
      '/error': { name: 'Error' },
      
      // Admin routes
      '/admin/login': { name: 'Admin Login' },
      '/admin/dashboard': { name: 'Admin Home' },
      '/admin/users': { name: 'Users' },
      '/admin/products': { name: 'Products' },
      '/admin/products/add': { name: 'Add Product' },
      '/admin/categories': { name: 'Categories' },
      '/admin/orders': { name: 'Orders' },
      '/admin/sales': { name: 'Sales Analytics' },
      '/admin/coupons': { name: 'Coupons' },
      '/admin/banners': { name: 'Banners' },
      '/admin/offers': { name: 'Special Offers' }
    };
  }

  init() {
    this.generateBreadcrumb();
  }

  generateBreadcrumb() {
    const breadcrumbContainer = document.querySelector('.breadcrumb-container');
    if (!breadcrumbContainer) return;

    const breadcrumbItems = this.buildBreadcrumbItems();
    const breadcrumbHTML = this.renderBreadcrumb(breadcrumbItems);
    
    const breadcrumbNav = breadcrumbContainer.querySelector('.breadcrumb-nav');
    if (breadcrumbNav) {
      breadcrumbNav.innerHTML = breadcrumbHTML;
    }
  }

  buildBreadcrumbItems() {
    const pathSegments = this.currentPath.split('/').filter(segment => segment);
    const items = [];

    // Handle root/home
    if (this.currentPath === '/' || this.currentPath === '/dashboard') {
      return [{ 
        name: 'Home', 
        path: '/dashboard', 
        active: true 
      }];
    }

    // Handle standalone auth pages (no parent breadcrumb)
    const authPages = ['/login', '/signup', '/verify-otp', '/forgot-password', '/forgot-verify-otp', '/reset-password', '/new-password', '/error'];
    if (authPages.includes(this.currentPath)) {
      const routeInfo = this.routeMap[this.currentPath];
      if (routeInfo) {
        return [{
          name: routeInfo.name,
          path: this.currentPath,
          active: true
        }];
      }
    }

    // Handle admin login (standalone)
    if (this.currentPath === '/admin/login') {
      return [{
        name: 'Admin Login',
        path: '/admin/login',
        active: true
      }];
    }

    // Handle admin routes
    if (this.currentPath.startsWith('/admin')) {
      items.push({
        name: 'Admin Home',
        path: '/admin/dashboard',
        active: false
      });

      // Build admin breadcrumb path
      if (this.currentPath !== '/admin/dashboard') {
        let currentPath = '';
        for (let i = 1; i < pathSegments.length; i++) {
          currentPath += '/' + pathSegments[i];
          const routeInfo = this.routeMap[currentPath];
          
          if (routeInfo) {
            items.push({
              name: routeInfo.name,
              path: currentPath,
              active: i === pathSegments.length - 1
            });
          } else {
            // Handle dynamic routes
            const dynamicRoute = this.handleDynamicRoute(currentPath, pathSegments, i);
            if (dynamicRoute) {
              items.push(dynamicRoute);
            }
          }
        }
      } else {
        items[0].active = true;
      }
    } else {
      // Handle user-facing routes
      items.push({
        name: 'Home',
        path: '/dashboard',
        active: false
      });

      if (this.currentPath !== '/dashboard' && this.currentPath !== '/') {
        let currentPath = '';
        for (let i = 0; i < pathSegments.length; i++) {
          currentPath += '/' + pathSegments[i];
          const routeInfo = this.routeMap[currentPath];
          
          if (routeInfo) {
            items.push({
              name: routeInfo.name,
              path: currentPath,
              active: i === pathSegments.length - 1
            });
          } else {
            // Handle dynamic routes
            const dynamicRoute = this.handleDynamicRoute(currentPath, pathSegments, i);
            if (dynamicRoute) {
              items.push(dynamicRoute);
            }
          }
        }
      } else {
        items[0].active = true;
      }
    }

    return items;
  }

  handleDynamicRoute(currentPath, pathSegments, index) {
    // Handle product details
    if (currentPath.includes('/product/') && !currentPath.includes('/admin')) {
      return {
        name: this.getProductName() || 'Product Details',
        path: currentPath,
        active: true
      };
    }

    // Handle admin product edit
    if (currentPath.includes('/admin/products/') && currentPath.includes('/edit')) {
      return {
        name: 'Edit Product',
        path: currentPath,
        active: true
      };
    }

    // Handle admin user details
    if (currentPath.includes('/admin/users/') && pathSegments[pathSegments.length - 1] !== 'users') {
      return {
        name: 'User Details',
        path: currentPath,
        active: true
      };
    }

    return null;
  }

  getProductName() {
    // Try to get product name from page title or data attribute
    const productTitle = document.querySelector('[data-product-name]');
    if (productTitle) {
      return productTitle.getAttribute('data-product-name');
    }

    const pageTitle = document.querySelector('h1');
    if (pageTitle && pageTitle.textContent.trim()) {
      return pageTitle.textContent.trim();
    }

    return null;
  }

  renderBreadcrumb(items) {
    return items.map((item, index) => {
      const isLast = index === items.length - 1;
      const linkClass = item.active ? 'breadcrumb-link active' : 'breadcrumb-link';
      
      let html = `
        <li class="breadcrumb-item">
          <a href="${item.path}" class="${linkClass}" ${item.active ? 'aria-current="page"' : ''}>
            ${item.name}
          </a>
      `;
      
      if (!isLast) {
        html += `
          <span class="breadcrumb-separator" aria-hidden="true"> > </span>
        `;
      }
      
      html += '</li>';
      return html;
    }).join('');
  }
}

// Initialize breadcrumb system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SimpleBreadcrumb();
});
