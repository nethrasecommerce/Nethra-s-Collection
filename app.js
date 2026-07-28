// Main Application Controller for Nethra's E-Commerce
let products = window.products;

// --- Application State ---
let state = {
  cart: JSON.parse(localStorage.getItem('nethras_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('nethras_wishlist')) || [],
  activeFilters: {
    categories: [],
    maxPrice: 1000,
    sortBy: 'featured'
  },
  currentHeroIndex: 0
};

// --- DOM Elements ---
const appContainer = document.getElementById('app');
const cartBadgeCount = document.getElementById('cartBadgeCount');
const toastContainer = document.getElementById('toastContainer');
const navLogo = document.getElementById('navLogo');
const cartTrigger = document.getElementById('cartTrigger');

// --- Helper: Scroll to top ---
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Helper: Send SMTP Email ---
async function sendSMTPEmail(toEmail, subject, body) {
  try {
    const smtp = window.DB ? await window.DB.getEmailSettings() : {};
    if (smtp.smtpUsername && smtp.smtpPassword && window.Email) {
      const response = await window.Email.send({
        Host: smtp.smtpHost || "smtp.gmail.com",
        Username: smtp.smtpUsername,
        Password: smtp.smtpPassword,
        To: toEmail,
        From: smtp.senderEmail || smtp.smtpUsername,
        Subject: subject,
        Html: body
      });
      console.log("SMTP Email dispatch status:", response);
      return response;
    }
  } catch (e) {
    console.error("Failed to send SMTP Email:", e);
  }
  return null;
}

// --- Cart Management Functions ---
function saveCart() {
  localStorage.setItem('nethras_cart', JSON.stringify(state.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const count = state.cart.reduce((total, item) => total + item.quantity, 0);
  cartBadgeCount.textContent = count;
}

function addToCart(productId, quantity = 1, silent = false) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = state.cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({ productId, quantity });
  }

  saveCart();
  if (!silent) {
    showToast(`<i class="fa-solid fa-cart-plus"></i> Added ${product.name} to cart!`);
  }
}

function removeFromCart(productId) {
  const product = products.find(p => p.id === productId);
  state.cart = state.cart.filter(item => item.productId !== productId);
  saveCart();
  showToast(`<i class="fa-solid fa-trash-can"></i> Removed ${product ? product.name : 'item'} from cart.`);
}

function updateCartQuantity(productId, quantity) {
  const item = state.cart.find(item => item.productId === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveCart();
  }
}

function clearCart() {
  state.cart = [];
  saveCart();
}

// --- Wishlist Management ---
async function toggleWishlist(productId) {
  const user = window.DB ? window.DB.getCurrentUser() : null;
  const index = state.wishlist.indexOf(productId);
  
  if (index > -1) {
    state.wishlist.splice(index, 1);
    showToast(`<i class="fa-regular fa-heart"></i> Removed from wishlist.`);
    if (user && window.DB) {
      await window.DB.toggleUserLike(user.id, productId);
    }
  } else {
    state.wishlist.push(productId);
    showToast(`<i class="fa-solid fa-heart" style="color: #c62828;"></i> Added to wishlist!`);
    if (user && window.DB) {
      await window.DB.toggleUserLike(user.id, productId);
    }
  }
  localStorage.setItem('nethras_wishlist', JSON.stringify(state.wishlist));
}

async function syncWishlistForCurrentUser() {
  const user = window.DB ? window.DB.getCurrentUser() : null;
  if (user && window.DB) {
    state.wishlist = await window.DB.getUserLikes(user.id);
  } else {
    state.wishlist = [];
  }
  localStorage.setItem('nethras_wishlist', JSON.stringify(state.wishlist));
}

function updateUserAccountHeader() {
  const user = window.DB ? window.DB.getCurrentUser() : null;
  const navUserAccount = document.getElementById('navUserAccount');
  const navUserLabel = document.getElementById('navUserLabel');

  if (navUserAccount && navUserLabel) {
    if (user) {
      navUserAccount.setAttribute('href', '#/account');
      navUserLabel.innerHTML = `<i class="fa-solid fa-user-check" style="color:var(--color-gold);"></i> ${user.name.split(' ')[0]}`;
    } else {
      navUserAccount.setAttribute('href', '#/login');
      navUserLabel.innerHTML = `<i class="fa-regular fa-user"></i> Login`;
    }
  }
}

// --- Toast System ---
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = message;
  toastContainer.appendChild(toast);

  // Trigger animation reflow
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
}

// --- Router ---
async function router() {
  const hash = window.location.hash || '#/';
  const mainHeader = document.querySelector('.main-header');

  if (window.DB && window.DB.getProducts) {
    await window.DB.getProducts();
    products = window.products || [];
  }

  // Highlight active menu items in header
  document.querySelectorAll('.nav-link-item').forEach(link => {
    const route = link.getAttribute('href');
    if (hash === route || (hash.startsWith('#/shop') && route === '#/shop')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Simple route parser
  if (hash === '#/' || hash === '') {
    await renderHome();
  } else if (hash.startsWith('#/shop')) {
    // Parse query params if any
    const query = hash.split('?')[1];
    let filterCategory = '';
    if (query) {
      const params = new URLSearchParams(query);
      filterCategory = params.get('category') || '';
    }
    await renderShop(filterCategory);
  } else if (hash.startsWith('#/product/')) {
    const productId = parseInt(hash.split('#/product/')[1]);
    renderProductDetail(productId);
  } else if (hash === '#/cart') {
    renderCart();
  } else if (hash === '#/checkout') {
    await renderCheckout();
  } else if (hash === '#/about') {
    await renderAbout();
  } else if (hash === '#/contact') {
    await renderContact();
  } else if (hash === '#/categories') {
    renderCategoriesPage();
  } else if (hash === '#/portfolio') {
    await renderPortfolioPage();
  } else if (hash === '#/login') {
    renderLogin();
  } else if (hash === '#/register') {
    renderRegister();
  } else if (hash === '#/account') {
    renderAccount();
  } else {
    // Fallback/Not Found
    appContainer.innerHTML = `<div class="container section-padding text-center">
      <h2 style="margin-bottom: 20px;">404 Page Not Found</h2>
      <p style="margin-bottom: 30px;">The page you are looking for does not exist.</p>
      <a href="#/" class="view-all-btn">Go to Home</a>
    </div>`;
  }
  scrollToTop();
}

// --- View: Home Page ---
async function renderHome() {
  const cms = window.DB ? await window.DB.getSiteContent() : {};
  const heroTitle = cms.heroTitle || 'Artistry in Every Stencil, Elegance in Every Accessory';
  const heroSubtitle = cms.heroSubtitle || 'Premium Mehandi Stencils & Handmade Accessories that add beauty to every special occasion.';
  const heroImage = (cms.heroImage && !cms.heroImage.includes('_1784')) ? cms.heroImage : 'hero_banner.png';
  const stencilBanner = (cms.stencilBanner && !cms.stencilBanner.includes('_1784')) ? cms.stencilBanner : 'stencil_collection.png';
  const accBanner = (cms.accBanner && !cms.accBanner.includes('_1784')) ? cms.accBanner : 'acc_collection.png';

  let homeHTML = `
    <!-- Hero Slider -->
    <section class="hero-slider" id="heroSlider">
      <div class="container hero-slide">
        <div class="hero-content-wrapper">
          <div class="hero-text">
            <h3>Nethra's Collection</h3>
            <h1 style="font-size: 2.2rem; line-height: 1.2;">${heroTitle}</h1>
            <p>${heroSubtitle}</p>
            <a href="#/shop" class="hero-btn">Shop Now</a>
          </div>
          <div class="hero-image-area">
            <div style="width: 320px; height: 420px; border: 2px solid var(--color-gold); padding: 10px; position: relative; background: #000; overflow: hidden; border-radius: 8px;">
              <img src="${heroImage}" alt="Henna & Jewelry Banner" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Portfolio Banner Section -->
    <section class="section-padding container">
      <h2 class="section-title text-center">Our Portfolio</h2>
      <div class="portfolio-grid">
        <!-- Card 1 -->
        <div class="portfolio-card" data-category="Mehandi Stencils">
          <div class="portfolio-content">
            <div class="portfolio-logo">
              <span style="color:var(--color-gold); font-size: 1.4rem; font-weight: bold;">M</span>
            </div>
            <h3 class="portfolio-title">Nethra's Mehandi Stencil</h3>
            <span class="portfolio-link">View Collection</span>
          </div>
          <img class="portfolio-img" src="${stencilBanner}" alt="Mehandi Stencils">
        </div>
        <!-- Card 2 -->
        <div class="portfolio-card" data-category="Accessories">
          <div class="portfolio-content">
            <div class="portfolio-logo">
              <span style="color:var(--color-gold); font-size: 1.4rem; font-weight: bold;">A</span>
            </div>
            <h3 class="portfolio-title">Nethra's Accessories</h3>
            <span class="portfolio-link">View Collection</span>
          </div>
          <img class="portfolio-img" src="${accBanner}" alt="Accessories">
        </div>
      </div>
    </section>

    <!-- Shop By Category Circular -->
    <section class="section-padding bg-cream">
      <div class="container text-center">
        <h2 class="section-title">Shop by Category</h2>
        <div class="category-circle-wrapper">
          <!-- Category 1 -->
          <div class="category-circle-card" data-category="Mehandi Stencils">
            <div class="category-circle">
              <svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,18A2,2 0 0,1 10,16A2,2 0 0,1 12,14A2,2 0 0,1 14,16A2,2 0 0,1 12,18Z"/></svg>
            </div>
            <span class="category-name">Mehandi Stencils</span>
          </div>
          <!-- Category 2 -->
          <div class="category-circle-card" data-category="Earrings">
            <div class="category-circle">
              <svg viewBox="0 0 24 24"><path d="M12,2C10.9,2 10,2.9 10,4V7.07C7.61,7.57 6,9.66 6,12C6,14.76 8.24,17 11,17V19.08C9.3,19.54 8,21.1 8,23H10C10,21.9 10.9,21 12,21C13.1,21 14,21.9 14,23H16C16,21.1 14.7,19.54 13,19.08V17C15.76,17 18,14.76 18,12C18,9.66 16.39,7.57 14,7.07V4C14,2.9 13.1,2 12,2M12,9C13.66,9 15,10.34 15,12C15,13.66 13.66,15 12,15C10.34,15 9,13.66 9,12C9,10.34 10.34,9 12,9Z"/></svg>
            </div>
            <span class="category-name">Earrings</span>
          </div>
          <!-- Category 3 -->
          <div class="category-circle-card" data-category="Necklaces">
            <div class="category-circle">
              <svg viewBox="0 0 24 24"><path d="M12,2A3,3 0 0,0 9,5A3,3 0 0,0 12,8A3,3 0 0,0 15,5A3,3 0 0,0 12,2M12,10C8.67,10 6,12.67 6,16C6,18.5 7.5,20.5 9.8,21.4C10.2,21.8 11,22 12,22C13,22 13.8,21.8 14.2,21.4C16.5,20.5 18,18.5 18,16C18,12.67 15.33,10 12,10Z"/></svg>
            </div>
            <span class="category-name">Necklaces</span>
          </div>
          <!-- Category 4 -->
          <div class="category-circle-card" data-category="Bangles">
            <div class="category-circle">
              <svg viewBox="0 0 24 24"><path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,4C16.42,4 20,7.58 20,12C20,16.42 16.42,20 12,20C7.58,20 4,16.42 4,12C4,7.58 7.58,4 12,4M12,8C9.79,8 8,9.79 8,12C8,14.21 9.79,16 12,16C14.21,16 16,14.21 16,12C16,9.79 14.21,8 12,8Z"/></svg>
            </div>
            <span class="category-name">Bangles</span>
          </div>
          <!-- Category 5 -->
          <div class="category-circle-card" data-category="Korean Accessories">
            <div class="category-circle">
              <svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,5A1.5,1.5 0 0,1 13.5,6.5A1.5,1.5 0 0,1 12,8A1.5,1.5 0 0,1 10.5,6.5A1.5,1.5 0 0,1 12,5M8.5,9.5A1.5,1.5 0 0,1 10,11A1.5,1.5 0 0,1 8.5,12.5A1.5,1.5 0 0,1 7,11A1.5,1.5 0 0,1 8.5,9.5M15.5,9.5A1.5,1.5 0 0,1 17,11A1.5,1.5 0 0,1 15.5,12.5A1.5,1.5 0 0,1 14,11A1.5,1.5 0 0,1 15.5,9.5M12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14Z"/></svg>
            </div>
            <span class="category-name">Korean Accessories</span>
          </div>
          <!-- Category 6 -->
          <div class="category-circle-card" data-category="Hair Accessories">
            <div class="category-circle">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            <span class="category-name">Hair Accessories</span>
          </div>
        </div>
        <a href="#/shop" class="view-all-btn">View All Products</a>
      </div>
    </section>

    <!-- Trust Features Bar -->
    <section class="section-padding container">
      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-icon-box"><i class="fa-solid fa-gem"></i></div>
          <div class="feature-text">
            <h4>Premium Quality</h4>
            <p>Finest materials & trendy designs</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon-box"><i class="fa-solid fa-heart"></i></div>
          <div class="feature-text">
            <h4>Handmade with Love</h4>
            <p>Carefully curated unique collections</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon-box"><i class="fa-solid fa-truck-fast"></i></div>
          <div class="feature-text">
            <h4>Fast Shipping</h4>
            <p>Sure delivery all over India</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon-box"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="feature-text">
            <h4>Secure Payment</h4>
            <p>100% safe & secure checkout</p>
          </div>
        </div>
      </div>
    </section>
  `;

  appContainer.innerHTML = homeHTML;

  // --- Attach Event Listeners for Home Page ---
  // Category Cards clicking
  document.querySelectorAll('.category-circle-card, .portfolio-card').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      window.location.hash = `#/shop?category=${encodeURIComponent(category)}`;
    });
  });
}

// --- View: Shop Page ---
async function renderShop(preFilterCategory = '') {
  const cms = window.DB ? await window.DB.getSiteContent() : {};
  const shopTitle = cms.shopTitle || 'Explore Our Collection';
  const shopSubtitle = cms.shopSubtitle || 'Discover premium Mehandi stencils and handmade jewelry.';

  // Initialize filter state if pre-filtered from URL
  if (preFilterCategory) {
    state.activeFilters.categories = [preFilterCategory];
  } else if (!window.location.hash.includes('category=')) {
    // Reset category filter if accessing general shop
    state.activeFilters.categories = [];
  }

  const uniqueCategories = [...new Set(products.map(p => p.category))];

  let shopHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>Shop</span>
      </div>

      <div style="margin-bottom:30px; text-align:center;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:8px;">${shopTitle}</h1>
        <p style="color:var(--color-text-light); font-size:0.95rem;">${shopSubtitle}</p>
      </div>
      
      <div class="shop-layout">
        <!-- Left Sidebar Filter Column -->
        <aside class="filter-sidebar">
          
          <!-- Categories Filter Widget -->
          <div class="filter-widget">
            <h3 class="filter-widget-title">Categories</h3>
            <ul class="filter-list" id="categoryFilterList">
              ${uniqueCategories.map(cat => `
                <li>
                  <input type="checkbox" id="cat_${cat.replace(/\s+/g, '_')}" 
                         class="filter-checkbox cat-checkbox" value="${cat}"
                         ${state.activeFilters.categories.includes(cat) ? 'checked' : ''}>
                  <label for="cat_${cat.replace(/\s+/g, '_')}">${cat}</label>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Price Filter Widget -->
          <div class="filter-widget">
            <h3 class="filter-widget-title">Price Filter</h3>
            <div class="price-slider-container">
              <input type="range" class="price-range-slider" id="priceRange" 
                     min="0" max="1000" step="50" value="${state.activeFilters.maxPrice}">
              <div class="price-range-inputs">
                <span>₹0</span>
                <span>Max: <strong>₹<span id="priceVal">${state.activeFilters.maxPrice}</span></strong></span>
              </div>
              <button class="filter-btn" id="applyPriceBtn">Filter Price</button>
            </div>
          </div>

          <!-- Sort Widget -->
          <div class="filter-widget">
            <h3 class="filter-widget-title">Sort By</h3>
            <select class="sort-select" id="shopSortSelect" style="width: 100%;">
              <option value="featured" ${state.activeFilters.sortBy === 'featured' ? 'selected' : ''}>Featured</option>
              <option value="price-low" ${state.activeFilters.sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${state.activeFilters.sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="rating" ${state.activeFilters.sortBy === 'rating' ? 'selected' : ''}>Rating</option>
            </select>
          </div>

          <!-- Promo Banner -->
          <div class="sidebar-offer-card">
            <h5>Special Offer</h5>
            <h3>Get 10% Off</h3>
            <p>On Your First Order</p>
            <a href="#/shop" class="sidebar-offer-btn" id="promoShopNow">Shop Now</a>
          </div>

        </aside>

        <!-- Right Main Shop Grid Column -->
        <main class="shop-products-column">
          <div class="shop-results-bar">
            <span>Showing <span id="resultsCount">0</span> results</span>
            <div>
              <span style="margin-right:10px;">Sort by:</span>
              <select class="sort-select" id="shopSortSelectTop">
                <option value="featured" ${state.activeFilters.sortBy === 'featured' ? 'selected' : ''}>Featured</option>
                <option value="price-low" ${state.activeFilters.sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price-high" ${state.activeFilters.sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
                <option value="rating" ${state.activeFilters.sortBy === 'rating' ? 'selected' : ''}>Rating</option>
              </select>
            </div>
          </div>

          <!-- Product Grid -->
          <div class="product-grid" id="shopProductGrid"></div>
        </main>
      </div>
    </div>
  `;

  appContainer.innerHTML = shopHTML;

  // --- Attach Event Listeners for Shop Page ---
  const priceRange = document.getElementById('priceRange');
  const priceVal = document.getElementById('priceVal');
  const applyPriceBtn = document.getElementById('applyPriceBtn');
  const sortSelect = document.getElementById('shopSortSelect');
  const sortSelectTop = document.getElementById('shopSortSelectTop');
  const catCheckboxes = document.querySelectorAll('.cat-checkbox');

  // Slider change display
  priceRange.addEventListener('input', (e) => {
    priceVal.textContent = e.target.value;
  });

  // Filter Trigger - Apply Price
  applyPriceBtn.addEventListener('click', () => {
    state.activeFilters.maxPrice = parseInt(priceRange.value);
    applyFiltersAndRender();
  });

  // Sort selectors change - synchronize both dropdowns
  sortSelect.addEventListener('change', (e) => {
    state.activeFilters.sortBy = e.target.value;
    sortSelectTop.value = e.target.value;
    applyFiltersAndRender();
  });

  sortSelectTop.addEventListener('change', (e) => {
    state.activeFilters.sortBy = e.target.value;
    sortSelect.value = e.target.value;
    applyFiltersAndRender();
  });

  // Category checkbox change
  catCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = [];
      catCheckboxes.forEach(c => {
        if (c.checked) selected.push(c.value);
      });
      state.activeFilters.categories = selected;
      applyFiltersAndRender();
    });
  });

  // Initial Filter Apply
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const grid = document.getElementById('shopProductGrid');
  const countEl = document.getElementById('resultsCount');
  if (!grid) return;

  // 1. Filtering
  let filtered = products.filter(product => {
    // Category match
    const catMatch = state.activeFilters.categories.length === 0 || 
                     state.activeFilters.categories.includes(product.category);
    // Price match
    const priceMatch = product.price <= state.activeFilters.maxPrice;
    
    return catMatch && priceMatch;
  });

  // 2. Sorting
  if (state.activeFilters.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.activeFilters.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.activeFilters.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else {
    // featured: sort by ID
    filtered.sort((a, b) => a.id - b.id);
  }

  // 3. Update count
  countEl.textContent = filtered.length;

  // 4. Render Grid HTML
  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; padding: 50px 0; text-align: center; color: var(--color-text-light);">
      <i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; color: var(--color-gold); margin-bottom:15px;"></i>
      <p>No products found matching the criteria.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const isInWishlist = state.wishlist.includes(product.id);
    return `
      <div class="product-card">
        <div class="product-image-container">
          <a href="#/product/${product.id}">
            <img class="product-card-img" src="${product.image}" alt="${product.name}">
          </a>
          <!-- Heart Button -->
          <button class="wishlist-heart-btn ${isInWishlist ? 'active' : ''}" data-id="${product.id}" aria-label="Add to Wishlist">
            <i class="${isInWishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
        <div class="product-info">
          <span class="product-info-cat">${product.category}</span>
          <a href="#/product/${product.id}">
            <h4 class="product-info-title">${product.name}</h4>
          </a>
          <div class="product-rating">
            ${Array.from({ length: 5 }, (_, i) => 
              i < Math.floor(product.rating) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'
            ).join('')}
            <span>(${product.reviewsCount})</span>
          </div>
          <div class="product-price-row">
            <span class="product-price">₹${product.price.toFixed(2)}</span>
            <button class="add-cart-btn btn-add-to-cart" data-id="${product.id}">Add To Cart</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  grid.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-id'));
      addToCart(id, 1);
    });
  });

  grid.querySelectorAll('.wishlist-heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-id'));
      toggleWishlist(id);
      
      // Update heart class icon
      const icon = btn.querySelector('i');
      if (state.wishlist.includes(id)) {
        btn.classList.add('active');
        icon.className = 'fa-solid fa-heart';
      } else {
        btn.classList.remove('active');
        icon.className = 'fa-regular fa-heart';
      }
    });
  });
}

// --- View: Product Detail Page ---
function renderProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    appContainer.innerHTML = `<div class="container section-padding text-center">
      <h2>Product not found</h2>
      <a href="#/shop" class="view-all-btn" style="margin-top:20px;">Back to Shop</a>
    </div>`;
    return;
  }

  const isInWishlist = state.wishlist.includes(product.id);

  let detailHTML = `
    <div class="container section-padding">
      <!-- Breadcrumbs -->
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <a href="#/shop">Shop</a> &gt; <span>${product.name}</span>
      </div>

      <div class="product-detail-layout">
        <!-- Left Image Column -->
        <div class="product-gallery">
          <div class="main-image-container">
            <img id="detailMainImg" src="${product.image}" alt="${product.name}">
          </div>
          <!-- Thumbnail Row (Replicating details) -->
          <div class="thumbnail-row">
            <div class="thumbnail-box active" data-img="${product.image}">
              <img src="${product.image}" alt="${product.name}">
            </div>
            <!-- Standard sub-gallery representation using variations of colors -->
            <div class="thumbnail-box" data-img="${product.image}">
              <img src="${product.image}" alt="${product.name} Alternate View" style="filter: hue-rotate(30deg) brightness(0.9);">
            </div>
            <div class="thumbnail-box" data-img="${product.image}">
              <img src="${product.image}" alt="${product.name} Zoom View" style="filter: brightness(1.2);">
            </div>
          </div>
        </div>

        <!-- Right Product Specifications Sheet -->
        <div class="product-sheet">
          <h1 class="product-sheet-title">${product.name}</h1>
          
          <div class="product-sheet-rating">
            <div>
              ${Array.from({ length: 5 }, (_, i) => 
                i < Math.floor(product.rating) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'
              ).join('')}
            </div>
            <span>(${product.reviewsCount} Customer Reviews)</span>
          </div>

          <div class="product-sheet-price">₹${product.price.toFixed(2)}</div>
          
          <div class="stock-status ${product.inStock ? 'in-stock' : 'out-of-stock'}">
            <i class="fa-solid ${product.inStock ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            <span>${product.inStock ? 'In Stock' : 'Out of Stock'}</span>
          </div>

          <p class="product-sheet-desc">${product.description}</p>

          <!-- Highlights Bullet List -->
          <ul class="product-bullets-list">
            ${product.features.map(feat => `<li>${feat}</li>`).join('')}
          </ul>

          <!-- Add to Cart & Buy Now Panel -->
          <div class="actions-row">
            <div class="qty-selector">
              <button class="qty-btn" id="qtyMinusBtn">-</button>
              <div class="qty-val" id="qtyVal">1</div>
              <button class="qty-btn" id="qtyPlusBtn">+</button>
            </div>
            
            <button class="sheet-add-cart-btn" id="detailAddToCartBtn">Add To Cart</button>
            <button class="sheet-buy-now-btn" id="detailBuyNowBtn">Buy Now</button>
          </div>

          <!-- Add to Wishlist Link -->
          <div class="wishlist-btn-large" id="detailWishlistBtn">
            <i class="${isInWishlist ? 'fa-solid' : 'fa-regular'} fa-heart" style="${isInWishlist ? 'color:#c62828;' : ''}"></i>
            <span>${isInWishlist ? 'Added to Wishlist' : 'Add to Wishlist'}</span>
          </div>
        </div>
      </div>

      <!-- Information & Reviews Tabs Section -->
      <div class="details-tabs-container">
        <div class="tabs-nav">
          <span class="tab-link active" data-tab="tabDesc">Description</span>
          <span class="tab-link" data-tab="tabInfo">Additional Information</span>
          <span class="tab-link" data-tab="tabReviews">Reviews (${product.reviewsCount})</span>
        </div>
        
        <!-- Tab Panes -->
        <div class="tab-pane active" id="tabDesc">
          <p>${product.description}</p>
          <p style="margin-top: 15px;">Designed carefully under stringent standards using raw elements suitable for repeated usage. Perfect for casual wear, traditional ceremonies, weddings, and deep festival aesthetics.</p>
        </div>

        <div class="tab-pane" id="tabInfo">
          <table>
            <tbody>
              ${Object.entries(product.details).map(([key, value]) => `
                <tr>
                  <td>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</td>
                  <td>${value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="tab-pane" id="tabReviews">
          <div style="max-width: 600px;">
            <h4 style="margin-bottom: 20px; color: var(--color-text-dark); text-transform:uppercase;">Customer Reviews</h4>
            <div style="border-bottom:1px solid var(--color-grey-light); padding-bottom: 15px; margin-bottom:15px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="color:var(--color-text-dark);">Priya R.</strong>
                <span style="color:var(--color-gold); font-size:0.75rem;"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></span>
              </div>
              <p style="color:var(--color-text-light);">Excellent quality! Reused the stencil 4 times already. The print is crisp and beautiful. highly recommended!</p>
            </div>
            <div style="border-bottom:1px solid var(--color-grey-light); padding-bottom: 15px; margin-bottom:15px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="color:var(--color-text-dark);">Anjali S.</strong>
                <span style="color:var(--color-gold); font-size:0.75rem;"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i></span>
              </div>
              <p style="color:var(--color-text-light);">Bought Kundan earrings and stencils. Accessories are shining brightly. Safe packing. Delivery took 3 days.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  appContainer.innerHTML = detailHTML;

  // --- Attach Event Listeners for Details Page ---
  const mainImg = document.getElementById('detailMainImg');
  const thumbBoxes = document.querySelectorAll('.thumbnail-box');
  const qtyMinusBtn = document.getElementById('qtyMinusBtn');
  const qtyPlusBtn = document.getElementById('qtyPlusBtn');
  const qtyVal = document.getElementById('qtyVal');
  const addCartBtn = document.getElementById('detailAddToCartBtn');
  const buyNowBtn = document.getElementById('detailBuyNowBtn');
  const wishlistBtn = document.getElementById('detailWishlistBtn');
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Thumbnail switching with style filters representation
  thumbBoxes.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbBoxes.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const imgPath = thumb.getAttribute('data-img');
      const styleFilter = thumb.querySelector('img').getAttribute('style');
      
      mainImg.src = imgPath;
      if (styleFilter) {
        mainImg.setAttribute('style', styleFilter);
      } else {
        mainImg.removeAttribute('style');
      }
    });
  });

  // Quantity controllers
  let count = 1;
  qtyMinusBtn.addEventListener('click', () => {
    if (count > 1) {
      count--;
      qtyVal.textContent = count;
    }
  });

  qtyPlusBtn.addEventListener('click', () => {
    count++;
    qtyVal.textContent = count;
  });

  // Cart operations
  addCartBtn.addEventListener('click', () => {
    addToCart(product.id, count);
  });

  buyNowBtn.addEventListener('click', () => {
    addToCart(product.id, count, true);
    window.location.hash = '#/checkout';
  });

  // Wishlist toggle
  wishlistBtn.addEventListener('click', () => {
    toggleWishlist(product.id);
    const added = state.wishlist.includes(product.id);
    const heartIcon = wishlistBtn.querySelector('i');
    const label = wishlistBtn.querySelector('span');

    if (added) {
      heartIcon.className = 'fa-solid fa-heart';
      heartIcon.style.color = '#c62828';
      label.textContent = 'Added to Wishlist';
    } else {
      heartIcon.className = 'fa-regular fa-heart';
      heartIcon.removeAttribute('style');
      label.textContent = 'Add to Wishlist';
    }
  });

  // Tab switching
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      tabLinks.forEach(l => l.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      link.classList.add('active');
      const paneId = link.getAttribute('data-tab');
      document.getElementById(paneId).classList.add('active');
    });
  });
}

// --- View: Cart Page ---
function renderCart() {
  if (state.cart.length === 0) {
    appContainer.innerHTML = `
      <div class="container section-padding text-center empty-cart-view">
        <div class="empty-cart-icon"><i class="fa-solid fa-cart-shopping"></i></div>
        <h2>Your Cart is Empty</h2>
        <p style="margin-top:15px;">Add products to your cart before proceeding to checkout.</p>
        <a href="#/shop" class="view-all-btn">Go To Shop</a>
      </div>
    `;
    return;
  }

  // Calculate cart data
  const cartItems = state.cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      product,
      quantity: item.quantity,
      subtotal: product ? product.price * item.quantity : 0
    };
  }).filter(item => item.product !== undefined);

  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const freeShippingThreshold = 599;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCost = isFreeShipping ? 0 : 59;
  const total = subtotal + shippingCost;

  let cartHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>Your Cart</span>
      </div>

      <h1 style="margin-bottom: 30px; text-transform:uppercase; font-size:1.6rem;">Your Cart</h1>
      
      <div class="cart-layout">
        <!-- Left Cart Table Column -->
        <div class="cart-table-wrapper">
          <table class="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${cartItems.map(item => `
                <tr data-id="${item.product.id}">
                  <td>
                    <div class="cart-product">
                      <img class="cart-product-img" src="${item.product.image}" alt="${item.product.name}">
                      <div class="cart-product-info">
                        <h4>${item.product.name}</h4>
                        <p>Category: ${item.product.category}</p>
                      </div>
                    </div>
                  </td>
                  <td>₹${item.product.price.toFixed(2)}</td>
                  <td>
                    <div class="qty-selector" style="height:35px;">
                      <button class="qty-btn btn-cart-qty-minus" data-id="${item.product.id}">-</button>
                      <div class="qty-val cart-qty-val" data-id="${item.product.id}">${item.quantity}</div>
                      <button class="qty-btn btn-cart-qty-plus" data-id="${item.product.id}">+</button>
                    </div>
                  </td>
                  <td>₹${item.subtotal.toFixed(2)}</td>
                  <td>
                    <button class="cart-remove-btn btn-cart-remove" data-id="${item.product.id}">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <a href="#/shop" class="continue-shopping-link">Continue Shopping</a>
            <!-- Free Shipping Badge -->
            <div class="free-shipping-bar" style="margin-top:20px;">
              <div class="free-shipping-icon"><i class="fa-solid fa-truck-fast"></i></div>
              <div>
                <strong>${isFreeShipping ? 'Congratulations!' : 'Almost There!'}</strong>
                <p>${isFreeShipping ? 'You qualify for FREE Delivery!' : `Add ₹${(freeShippingThreshold - subtotal).toFixed(2)} more for FREE Delivery.`}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Cart Summary Column -->
        <div class="cart-summary-card">
          <h3 class="cart-summary-title">Cart Totals</h3>
          
          <div class="cart-summary-row" style="border-bottom:1px solid var(--color-grey-border); padding-bottom:12px;">
            <span>Subtotal</span>
            <strong>₹${subtotal.toFixed(2)}</strong>
          </div>

          <div class="cart-summary-row shipping-note">
            <div style="display:flex; justify-content:space-between; width:100%;">
              <span>Shipping</span>
              <strong>${isFreeShipping ? 'FREE' : `₹${shippingCost.toFixed(2)}`}</strong>
            </div>
            <span class="shipping-sub">${isFreeShipping ? 'Free shipping applied.' : 'Flat shipping rate. Orders above ₹599 get free shipping.'}</span>
          </div>

          <div class="cart-summary-total">
            <span>Total</span>
            <span>₹${total.toFixed(2)}</span>
          </div>

          <a href="#/checkout" class="checkout-btn">Proceed To Checkout</a>
        </div>
      </div>
    </div>
  `;

  appContainer.innerHTML = cartHTML;

  // --- Attach Event Listeners for Cart Page ---
  // Quantity Plus
  appContainer.querySelectorAll('.btn-cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      const item = state.cart.find(c => c.productId === id);
      if (item) {
        updateCartQuantity(id, item.quantity + 1);
        renderCart(); // re-render
      }
    });
  });

  // Quantity Minus
  appContainer.querySelectorAll('.btn-cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      const item = state.cart.find(c => c.productId === id);
      if (item && item.quantity > 1) {
        updateCartQuantity(id, item.quantity - 1);
        renderCart(); // re-render
      }
    });
  });

  // Remove Item
  appContainer.querySelectorAll('.btn-cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      removeFromCart(id);
      renderCart(); // re-render
    });
  });
}

// --- View: Checkout Page ---
async function renderCheckout() {
  const currentUser = window.DB ? window.DB.getCurrentUser() : null;
  if (!currentUser) {
    showToast(`<i class="fa-solid fa-user-lock"></i> Please login to place your order.`);
    sessionStorage.setItem('redirect_after_login', '#/checkout');
    window.location.hash = '#/login';
    return;
  }

  if (state.cart.length === 0) {
    window.location.hash = '#/cart';
    return;
  }

  const settings = window.DB ? await window.DB.getPaymentSettings() : {};

  const cartItems = state.cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      product,
      quantity: item.quantity,
      subtotal: product ? product.price * item.quantity : 0
    };
  }).filter(item => item.product !== undefined);

  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingCost = subtotal >= 599 ? 0 : 59;
  const total = subtotal + shippingCost;

  const savedAddress = JSON.parse(localStorage.getItem(`nethras_shipping_details_${currentUser.id}`)) || {};

  let checkoutHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <a href="#/cart">Cart</a> &gt; <span>Checkout</span>
      </div>

      <h1 style="margin-bottom:30px; text-transform:uppercase; font-size:1.6rem;">Checkout</h1>
      
      <form class="checkout-layout" id="checkoutForm">
        <!-- Left Billing Details Form -->
        <div class="checkout-form-section">
          <h3>Billing Details</h3>
          
          <div class="form-grid">
            <div class="form-group full-width">
              <label for="fullName">Full Name <span>*</span></label>
              <input type="text" id="fullName" class="form-input" placeholder="Enter full name" value="${savedAddress.fullName || ''}" required>
            </div>

            <div class="form-group">
              <label for="phone">Phone Number <span>*</span></label>
              <input type="tel" id="phone" class="form-input" placeholder="10-digit mobile number" value="${savedAddress.phone || ''}" required pattern="[0-9]{10}">
            </div>

            <div class="form-group">
              <label for="email">Email Address <span>*</span></label>
              <input type="email" id="email" class="form-input" placeholder="e.g. name@domain.com" value="${savedAddress.email || currentUser.email || ''}" required>
            </div>

            <div class="form-group full-width">
              <label for="address">Address <span>*</span></label>
              <input type="text" id="address" class="form-input" placeholder="House No., Street Name, Area" value="${savedAddress.address || ''}" required>
            </div>

            <div class="form-group">
              <label for="city">Town / City <span>*</span></label>
              <input type="text" id="city" class="form-input" placeholder="City" value="${savedAddress.city || ''}" required>
            </div>

            <div class="form-group">
              <label for="state">State <span>*</span></label>
              <select id="state" class="form-input" required>
                <option value="" disabled ${!savedAddress.state ? 'selected' : ''}>Select State</option>
                <option value="Tamil Nadu" ${savedAddress.state === 'Tamil Nadu' ? 'selected' : ''}>Tamil Nadu</option>
                <option value="Kerala" ${savedAddress.state === 'Kerala' ? 'selected' : ''}>Kerala</option>
                <option value="Karnataka" ${savedAddress.state === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
                <option value="Andhra Pradesh" ${savedAddress.state === 'Andhra Pradesh' ? 'selected' : ''}>Andhra Pradesh</option>
                <option value="Maharashtra" ${savedAddress.state === 'Maharashtra' ? 'selected' : ''}>Maharashtra</option>
                <option value="Other" ${savedAddress.state === 'Other' ? 'selected' : ''}>Other State</option>
              </select>
            </div>

            <div class="form-group">
              <label for="pincode">Pincode <span>*</span></label>
              <input type="text" id="pincode" class="form-input" placeholder="6-digit postal code" value="${savedAddress.pincode || ''}" required pattern="[0-9]{6}">
            </div>
          </div>
        </div>

        <!-- Right Summary and Payment Column -->
        <div class="checkout-order-summary">
          <h3 style="font-size:1rem; text-transform:uppercase; margin-bottom:20px; border-bottom:1px solid var(--color-gold); padding-bottom:10px;">Your Order</h3>
          
          <table class="order-summary-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${cartItems.map(item => `
                <tr>
                  <td>${item.product.name} <strong>&times; ${item.quantity}</strong></td>
                  <td style="text-align:right;">₹${item.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight:600;">
                <td style="border-top:1px solid var(--color-grey-border);">Subtotal</td>
                <td style="text-align:right; border-top:1px solid var(--color-grey-border);">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr style="font-weight:600;">
                <td>Shipping</td>
                <td style="text-align:right;">${shippingCost === 0 ? 'FREE' : `₹${shippingCost.toFixed(2)}`}</td>
              </tr>
              <tr style="font-size:1.1rem; font-weight:700; border-top:2px solid var(--color-gold);">
                <td style="padding:15px 0;">Total</td>
                <td style="text-align:right; padding:15px 0;">₹${total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Payment Accordions -->
          ${settings.upiEnabled ? `
          <div class="payment-method-box active" id="payUPIBox">
            <div class="payment-method-header" data-method="upi" style="cursor:pointer;">
              <input type="radio" name="paymentMethod" value="upi" class="payment-method-radio" checked>
              <span style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-qrcode" style="color:var(--color-gold); font-size:1.1rem;"></i> 
                <strong>UPI QR Code Payment (Scan & Pay)</strong>
              </span>
            </div>
            <div class="payment-method-desc" style="display:block; padding:15px 0;">
              <p style="margin-bottom:12px; font-size:0.85rem;">Please scan the official merchant QR code to pay <strong>₹${total.toFixed(2)}</strong>:</p>
              
              <div class="qr-payment-wrapper">
                <div class="qr-image-container">
                  <img src="${settings.upiQrImage || 'logo.png'}" alt="UPI QR Code" style="max-height:180px;">
                </div>
                <p style="color:var(--color-gold); font-weight:700; font-size:0.95rem; margin-bottom:4px; font-family:monospace;">UPI ID: ${settings.upiId}</p>
                <p style="font-size:0.75rem; color:#aaa;">Merchant: ${settings.merchantName}</p>
              </div>

              <div class="form-group" style="margin-top:15px; text-align:left;">
                <label style="font-size:0.75rem; font-weight:700; color:var(--color-gold); text-transform:uppercase; display:block; margin-bottom:5px;">Enter UPI Transaction ID / UTR Number *</label>
                <input type="text" id="upiTxnId" class="form-input" placeholder="Enter 12-digit transaction ID" style="border-color:var(--color-gold);" required pattern="[a-zA-Z0-9]{12,}">
                <p style="font-size:0.7rem; color:#aaa; margin-top:4px;">Enter the transaction reference from GPay, PhonePe, Paytm, or your banking app after making payment.</p>
              </div>
            </div>
          </div>
          ` : ''}

          ${settings.codEnabled ? `
          <div class="payment-method-box ${!settings.upiEnabled ? 'active' : ''}" id="payCODBox">
            <div class="payment-method-header" data-method="cod" style="cursor:pointer;">
              <input type="radio" name="paymentMethod" value="cod" class="payment-method-radio" ${!settings.upiEnabled ? 'checked' : ''}>
              <span style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-truck-ramp-box"></i> Cash on Delivery (COD)
              </span>
            </div>
            <p class="payment-method-desc" style="${!settings.upiEnabled ? 'display:block;' : ''}">Pay cash upon delivery of your items.</p>
          </div>
          ` : ''}

          <!-- Terms Checkbox -->
          <div class="terms-checkbox-row">
            <input type="checkbox" id="termsBox" class="terms-checkbox" required>
            <label for="termsBox">I have read and agree to the website terms and conditions. *</label>
          </div>

          <!-- Submit Btn -->
          <button type="submit" class="place-order-btn">Place Order</button>
        </div>
      </form>
    </div>
  `;

  appContainer.innerHTML = checkoutHTML;

  // --- Attach Event Listeners for Checkout Page ---
  const form = document.getElementById('checkoutForm');
  const upiBox = document.getElementById('payUPIBox');
  const codBox = document.getElementById('payCODBox');
  
  // Payment selection accordion logic
  document.querySelectorAll('.payment-method-header').forEach(header => {
    header.addEventListener('click', () => {
      const method = header.getAttribute('data-method');
      const radio = header.querySelector('input');
      radio.checked = true;

      if (method === 'upi' && upiBox) {
        upiBox.classList.add('active');
        const desc = upiBox.querySelector('.payment-method-desc');
        if (desc) desc.style.display = 'block';
        if (document.getElementById('upiTxnId')) document.getElementById('upiTxnId').required = true;

        if (codBox) {
          codBox.classList.remove('active');
          const codDesc = codBox.querySelector('.payment-method-desc');
          if (codDesc) codDesc.style.display = 'none';
        }
      } else if (method === 'cod' && codBox) {
        codBox.classList.add('active');
        const desc = codBox.querySelector('.payment-method-desc');
        if (desc) desc.style.display = 'block';

        if (upiBox) {
          upiBox.classList.remove('active');
          const upiDesc = upiBox.querySelector('.payment-method-desc');
          if (upiDesc) upiDesc.style.display = 'none';
          if (document.getElementById('upiTxnId')) document.getElementById('upiTxnId').required = false;
        }
      }
    });
  });

  // Submit Order logic
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Perform standard validations
    const name = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const stateVal = document.getElementById('state').value;
    const pincode = document.getElementById('pincode').value.trim();
    
    const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentRadio) {
      showToast(`<i class="fa-solid fa-triangle-exclamation" style="color:#f57c00;"></i> Please select a payment method.`);
      return;
    }
    const paymentMethod = paymentRadio.value;
    const upiTxnInput = document.getElementById('upiTxnId');
    const transactionId = (paymentMethod === 'upi' && upiTxnInput) ? upiTxnInput.value.trim() : '';

    if (paymentMethod === 'upi' && !transactionId) {
      showToast(`<i class="fa-solid fa-triangle-exclamation" style="color:#f57c00;"></i> Please enter UPI Transaction ID.`);
      return;
    }

    const orderNumber = 'NETH-' + Math.floor(100000 + Math.random() * 900000);

    const orderData = {
      id: orderNumber,
      customerName: name,
      phone: phone,
      email: email,
      address: address,
      city: city,
      state: stateVal,
      pincode: pincode,
      items: cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
      subtotal: subtotal,
      shippingCost: shippingCost,
      total: total,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      status: 'Pending',
      paymentVerified: false,
      paymentNotes: '',
      courierName: '',
      trackingId: '',
      trackingLink: ''
    };

    // Save shipping details for next order autofill
    const shippingDetails = {
      fullName: name,
      phone: phone,
      email: email,
      address: address,
      city: city,
      state: stateVal,
      pincode: pincode
    };
    localStorage.setItem(`nethras_shipping_details_${currentUser.id}`, JSON.stringify(shippingDetails));

    if (window.DB && window.DB.createOrder) {
      await window.DB.createOrder(orderData);
    }
    
    // Clear state
    clearCart();
    
    // Render Success View
    renderSuccessScreen(name, orderNumber, total, orderData);
  });
}

function renderSuccessScreen(name, orderNumber, total, orderData) {
  // Notification templates
  const itemsText = orderData.items.map(item => {
    const prod = products.find(p => p.id === item.productId);
    return `- ${prod ? prod.name : 'Product'} x ${item.quantity} (₹${item.price.toFixed(2)})`;
  }).join('\n');

  const emailSubject = `Order Confirmed - Nethra's #${orderNumber}`;
  const emailBody = `Dear ${name},

Thank you for your order! We have received your purchase details.

Order Summary:
${itemsText}
Subtotal: ₹${orderData.subtotal.toFixed(2)}
Shipping: ${orderData.shippingCost === 0 ? 'FREE' : `₹${orderData.shippingCost.toFixed(2)}`}
Grand Total: ₹${total.toFixed(2)}

Shipping Address:
${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}
Contact Phone: ${orderData.phone}

${orderData.paymentMethod === 'upi' ? `We are verifying your UPI transaction (Transaction ID/UTR: ${orderData.transactionId}). Your package will be dispatched once verified.` : `Your order will be shipped via Cash on Delivery.`}

Regards,
Nethra's Support Team`;

  const emailHTMLBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; color: #333;">
      <h2 style="color: #c5a059; text-align: center; border-bottom: 2px solid #c5a059; padding-bottom: 10px;">Order Confirmation</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for your order! We have received your purchase details.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${orderData.items.map(item => {
            const prod = products.find(p => p.id === item.productId);
            return `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${prod ? prod.name : 'Product'}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
          <tr>
            <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: right;">Subtotal:</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${orderData.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: right;">Shipping:</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${orderData.shippingCost === 0 ? 'FREE' : `₹${orderData.shippingCost.toFixed(2)}`}</td>
          </tr>
          <tr style="background: #fffdf5;">
            <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: right; color: #c5a059;">Grand Total:</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #c5a059;">₹${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #c5a059;">Shipping Address:</h4>
        <p style="margin: 0; line-height: 1.4;">
          ${orderData.address},<br>
          ${orderData.city}, ${orderData.state} - ${orderData.pincode}<br>
          <strong>Phone:</strong> ${orderData.phone}
        </p>
      </div>

      <p>${orderData.paymentMethod === 'upi' ? `We are verifying your UPI transaction (Transaction ID/UTR: <strong>${orderData.transactionId}</strong>). Your package will be dispatched once verified.` : `Your order will be shipped via Cash on Delivery.`}</p>

      <p style="font-size: 0.85rem; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 15px; margin-top: 25px;">
        Regards,<br><strong>Nethra's Support Team</strong>
      </p>
    </div>
  `;

  // Dispatch real emails via SMTP
  sendSMTPEmail(orderData.email, emailSubject, emailHTMLBody);
  window.DB.getEmailSettings().then(smtp => {
    if (smtp && smtp.receiverEmail) {
      sendSMTPEmail(smtp.receiverEmail, `New Order Placed - #${orderNumber}`, emailHTMLBody);
    }
  });

  const whatsappMessage = `🌸 *Nethra's Mehandi Stencils & Accessories* 🌸

Hello *${name}*! Your order *${orderNumber}* has been successfully placed.

*Order Total:* ₹${total.toFixed(2)}
*Payment Method:* ${orderData.paymentMethod === 'upi' ? 'UPI QR Code' : 'Cash on Delivery'}
*Status:* Pending Admin Verification

Thank you for shopping with us! We will send you another update once shipped.`;

  let successHTML = `
    <div class="container section-padding">
      <div class="order-success-screen">
        <div class="success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h2>Thank You, ${name}!</h2>
        <p style="font-size:1.1rem; color:var(--color-text-dark); margin-bottom:10px;">Your order has been placed successfully.</p>
        <p style="margin-bottom:15px;">Order Number: <strong>${orderNumber}</strong><br>Amount Charged: <strong>₹${total.toFixed(2)}</strong></p>
        
        <div style="background:#111; border:1px solid var(--color-gold); padding:20px; border-radius:6px; margin:20px 0; text-align:left;">
          <h4 style="color:var(--color-gold); margin-bottom:15px; font-family:var(--font-heading); display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-bell"></i> Live Notification Dispatch Simulation</h4>
          <p style="font-size:0.8rem; color:#aaa; margin-bottom:15px;">To demonstrate order notifications without external APIs, you can view the sent copies below:</p>
          
          <div class="notification-tab-container">
            <button class="notification-tab-btn active" id="tabEmailBtn">Email Sent</button>
            <button class="notification-tab-btn" id="tabWABtn">WhatsApp Sent</button>
          </div>
          
          <div id="simEmailContent" style="display:block;">
            <p style="font-size:0.8rem; margin-bottom:8px; color:var(--color-gold);"><strong>Subject:</strong> ${emailSubject}</p>
            <div class="msg-bubble-email">${emailBody}</div>
          </div>
          <div id="simWAContent" style="display:none;">
            <p style="font-size:0.8rem; margin-bottom:8px; color:var(--color-gold);"><strong>WhatsApp Notification Template:</strong></p>
            <div class="msg-bubble-whatsapp">${whatsappMessage}</div>
          </div>
        </div>

        <a href="#/" class="view-all-btn" style="margin-top:20px;">Back to Home</a>
      </div>
    </div>
  `;
  appContainer.innerHTML = successHTML;

  // Tab switching logic
  document.getElementById('tabEmailBtn').addEventListener('click', () => {
    document.getElementById('tabEmailBtn').classList.add('active');
    document.getElementById('tabWABtn').classList.remove('active');
    document.getElementById('simEmailContent').style.display = 'block';
    document.getElementById('simWAContent').style.display = 'none';
  });
  document.getElementById('tabWABtn').addEventListener('click', () => {
    document.getElementById('tabWABtn').classList.add('active');
    document.getElementById('tabEmailBtn').classList.remove('active');
    document.getElementById('simEmailContent').style.display = 'none';
    document.getElementById('simWAContent').style.display = 'block';
  });

  scrollToTop();
}

// --- View: About Us Page ---
async function renderAbout() {
  const cms = window.DB ? await window.DB.getSiteContent() : {};
  const aboutBanner = (cms.aboutBanner && !cms.aboutBanner.includes('_1784')) ? cms.aboutBanner : 'about_banner.png';
  const aboutCraftImage = (cms.aboutCraftImage && !cms.aboutCraftImage.includes('media__')) ? cms.aboutCraftImage : 'stencil_broad.png';
  const aboutStory = cms.aboutStory || 'Nethra\'s is a homegrown brand that brings you premium quality Mehandi stencils and handcrafted accessories. Every single stencil, jewelry piece, or hair ornament is designed and curated with a personal touch of elegance, creativity, and customer care.';

  let aboutHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>About Us</span>
      </div>

      <!-- About Banner -->
      <div class="about-banner">
        <img class="about-banner-img" src="${aboutBanner}" alt="Henna & Accessories Craft Banner">
        <div class="about-banner-text">
          <h1>Crafted with Passion</h1>
          <p>Nethra's - Redefining Tradition & Elegant Styling</p>
        </div>
      </div>

      <div class="about-layout">
        <!-- Text Column -->
        <div class="about-desc">
          <h2>Nethra's – Crafted with Passion, Made for You</h2>
          <p>${aboutStory}</p>
          <p>Our mission is to add elegance to your celebrations, making every festival, wedding, party, and daily styling feel extra special. We use top-notch flexible materials for our stencils to guarantee simple application and maximum reusability. Our jewelry sets and hair clips follow the latest fashion guidelines while retaining traditional aesthetic vibes.</p>
          <p>Whether you are a professional Mehandi artist looking for precise hand stencils or someone looking for beautiful Kundan earrings to go with your lehenga, Nethra's has something custom-crafted just for you.</p>
        </div>

        <!-- Graphic Image Column -->
        <div class="about-graphic">
          <img src="${aboutCraftImage}" alt="Artisan Craftsmanship" style="width:100%; border-radius:8px; border:2px solid var(--color-gold);">
        </div>
      </div>
    </div>
  `;
  appContainer.innerHTML = aboutHTML;
}

// --- View: Contact Page ---
async function renderContact() {
  const cms = window.DB ? await window.DB.getSiteContent() : {};
  const phone1 = cms.contactPhone1 || '+91 96294 27700';
  const phone2 = cms.contactPhone2 || '+91 98779 61132';
  const email = cms.contactEmail || 'nethras0504@gmail.com';
  const address = cms.contactAddress || 'Coimbatore, Tamil Nadu, India';

  const num1 = Math.floor(1 + Math.random() * 9);
  const num2 = Math.floor(1 + Math.random() * 9);
  const captchaAnswer = num1 + num2;

  let contactHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>Contact Us</span>
      </div>

      <h1 style="margin-bottom:30px; text-transform:uppercase; font-size:1.6rem; text-align:center;">Contact Us</h1>
      
      <div class="contact-layout">
        <!-- Left Info Column -->
        <div class="contact-info-col">
          <h3>Get In Touch</h3>
          <p style="font-size:0.85rem; color:var(--color-text-light); margin-bottom:30px;">We would love to hear from you. Feel free to contact us for bulk orders, customized stencils, or styling queries.</p>
          
          <ul class="contact-info-list">
            <li>
              <i class="fa-solid fa-phone"></i>
              <div>
                <h4>Call / WhatsApp</h4>
                <p>${phone1}</p>
                <p>${phone2}</p>
              </div>
            </li>
            <li>
              <i class="fa-solid fa-envelope"></i>
              <div>
                <h4>Email Support</h4>
                <p>${email}</p>
              </div>
            </li>
            <li>
              <i class="fa-solid fa-location-dot"></i>
              <div>
                <h4>Our Location</h4>
                <p>${address}</p>
              </div>
            </li>
          </ul>

          <div class="contact-social-row">
            <h4>Follow Us on Instagram</h4>
            <div class="contact-social-links" style="gap: 15px; display: flex; flex-wrap: wrap;">
              <a href="https://www.instagram.com/nethras_mehandi_stencils?igsh=MTgycGwyanl6Zjlwdw==" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; gap:6px; font-size:0.85rem;"><i class="fa-brands fa-instagram" style="font-size:1.2rem; color:var(--color-gold);"></i> @nethras_mehandi_stencils</a>
              <a href="https://www.instagram.com/nethras_accessories?igsh=MThvMHRhaW4weG9xNw==" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; gap:6px; font-size:0.85rem;"><i class="fa-brands fa-instagram" style="font-size:1.2rem; color:var(--color-gold);"></i> @nethras_accessories</a>
            </div>
          </div>
        </div>

        <!-- Right Form Column -->
        <div class="contact-form-col">
          <h3>Send Us a Message</h3>
          
          <form id="contactForm" style="margin-top:20px;">
            <div class="form-grid">
              <div class="form-group">
                <label for="contactName">Your Name <span>*</span></label>
                <input type="text" id="contactName" class="form-input" placeholder="Enter name" required>
              </div>
              <div class="form-group">
                <label for="contactPhone">Phone Number</label>
                <input type="tel" id="contactPhone" class="form-input" placeholder="10-digit number">
              </div>
              <div class="form-group full-width">
                <label for="contactEmail">Email Address <span>*</span></label>
                <input type="email" id="contactEmail" class="form-input" placeholder="e.g. name@domain.com" required>
              </div>
              <div class="form-group full-width">
                <label for="contactMsg">Message <span>*</span></label>
                <textarea id="contactMsg" class="form-input" rows="6" placeholder="Write your message here..." required style="resize:vertical;"></textarea>
              </div>
            </div>

            <!-- Math CAPTCHA -->
            <div class="captcha-container" style="max-width: 100%; margin-top: 15px;">
              <span class="captcha-question">Solve: ${num1} + ${num2} = ?</span>
              <input type="number" id="contactCaptcha" class="captcha-input" required placeholder="Ans">
            </div>

            <button type="submit" class="contact-btn" style="margin-top:20px;">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  `;

  appContainer.innerHTML = contactHTML;

  // --- Attach Event Listeners for Contact Page ---
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userCaptcha = parseInt(document.getElementById('contactCaptcha').value);
    if (userCaptcha !== captchaAnswer) {
      showToast(`<i class="fa-solid fa-circle-xmark" style="color:#d32f2f;"></i> Incorrect CAPTCHA solution.`);
      return;
    }

    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMsg').value.trim();
    
    if (window.DB && window.DB.createEnquiry) {
      await window.DB.createEnquiry({ name, phone, email, message });
    }

    // Send the real SMTP email
    const smtpSettings = window.DB ? await window.DB.getEmailSettings() : {};
    const emailSubject = `New Store Enquiry from ${name}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; color: #333;">
        <h2 style="color: #c5a059; border-bottom: 2px solid #c5a059; padding-bottom: 10px; margin-bottom: 20px;">New Store Enquiry</h2>
        <p><strong>Customer Details:</strong></p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p><strong>Message:</strong></p>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 4px; border-left: 4px solid #c5a059; font-style: italic;">${message}</p>
      </div>
    `;
    if (smtpSettings.receiverEmail) {
      sendSMTPEmail(smtpSettings.receiverEmail, emailSubject, emailBody);
    }

    // Reset Form
    form.reset();
    
    showToast(`<i class="fa-solid fa-circle-check"></i> Thank you! Sending notification email...`);

    // Simulated email popup
    setTimeout(() => {
      const emailOverlay = document.createElement('div');
      emailOverlay.className = 'notification-sim-overlay';
      emailOverlay.id = 'contactEmailSimModal';
      emailOverlay.innerHTML = `
        <div class="notification-sim-card" style="max-width: 500px;">
          <h3 style="color:var(--color-gold); margin-bottom:15px; font-family:var(--font-heading);"><i class="fa-solid fa-envelope"></i> Simulated Enquiry Email Dispatched</h3>
          <p style="font-size:0.8rem; color:#aaa; margin-bottom:15px;">To demonstrate SMTP email dispatch, here is the copy sent to the admin:</p>
          <div style="background:#111; border:1px solid var(--color-gold); padding:15px; border-radius:6px; margin-bottom:20px; text-align:left;">
            <p style="margin-bottom:8px; font-size:0.8rem; color:var(--color-gold);"><strong>To:</strong> nethras0504@gmail.com</p>
            <p style="margin-bottom:8px; font-size:0.8rem; color:var(--color-gold);"><strong>Subject:</strong> New Store Enquiry from ${name}</p>
            <div class="msg-bubble-email" style="max-height: 200px; overflow-y: auto; color:#222;">
Dear Nethra's Support Team,

You have received a new contact message:
- **Name:** ${name}
- **Phone:** ${phone || 'N/A'}
- **Email:** ${email}
- **Message:**
${message}

---
Sent automatically from Nethra's Store website contact gateway.
            </div>
          </div>
          <button type="button" class="checkout-btn" style="width: 100%;" onclick="document.getElementById('contactEmailSimModal').remove(); window.location.hash='#/';">Close Simulation & Return</button>
        </div>
      `;
      document.body.appendChild(emailOverlay);
    }, 600);
  });
}

// --- View: General Categories Page ---
function renderCategoriesPage() {
  const uniqueCategories = [...new Set(products.map(p => p.category))];
  
  let categoriesHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>Categories</span>
      </div>
      <h1 class="text-center" style="margin-bottom:40px; text-transform:uppercase; font-size:1.8rem;">Browse Categories</h1>
      
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:30px;">
        ${uniqueCategories.map(cat => {
          const sampleProd = products.find(p => p.category === cat);
          const count = products.filter(p => p.category === cat).length;
          return `
            <div class="portfolio-card" data-category="${cat}" style="height:200px;">
              <div class="portfolio-content">
                <h3 class="portfolio-title" style="font-size:1.2rem;">${cat}</h3>
                <span class="portfolio-link">${count} Products</span>
              </div>
              <img class="portfolio-img" src="${sampleProd ? sampleProd.image : ''}" alt="${cat}">
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  appContainer.innerHTML = categoriesHTML;

  appContainer.querySelectorAll('.portfolio-card').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      window.location.hash = `#/shop?category=${encodeURIComponent(category)}`;
    });
  });
}

// --- View: Portfolio Page ---
async function renderPortfolioPage() {
  const portfolioItems = window.DB ? await window.DB.getPortfolio() : [];

  let portfolioHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>Portfolio Gallery</span>
      </div>
      
      <h1 class="text-center" style="margin-bottom:12px; text-transform:uppercase; font-size:1.8rem; font-family:var(--font-heading);">Design & Craftsmanship Gallery</h1>
      <p class="text-center" style="color:var(--color-text-light); max-width:600px; margin:0 auto 40px auto; font-size:0.9rem;">Explore our curated collection of bridal henna stencils, handcrafted Kundan jewelry, and custom hair accessories.</p>

      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:25px;">
        ${portfolioItems.map(item => `
          <div style="border:2px solid var(--color-gold); background:#000; position:relative; overflow:hidden; border-radius:8px; height:320px; transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
            <img src="${item.image}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position:absolute; bottom:0; left:0; width:100%; background:linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4), transparent); color:white; padding:20px 15px 15px 15px; text-align:left;">
              <span class="badge gold" style="font-size:0.65rem; margin-bottom:6px; display:inline-block;">${item.category}</span>
              <h4 style="font-family:var(--font-heading); font-size:1rem; color:var(--color-gold); margin-bottom:4px;">${item.title}</h4>
              <p style="font-size:0.75rem; color:#ccc;">${item.description || ''}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  appContainer.innerHTML = portfolioHTML;
}

// --- View: Customer Login ---
function renderLogin() {
  const currentUser = window.DB ? window.DB.getCurrentUser() : null;
  if (currentUser) {
    window.location.hash = '#/account';
    return;
  }

  let loginHTML = `
    <div class="container section-padding">
      <div style="max-width:450px; margin:0 auto; background:var(--color-cream); border:1px solid var(--color-gold); padding:35px; border-radius:8px;">
        <h2 class="text-center" style="font-family:var(--font-heading); margin-bottom:10px;">Customer Login</h2>
        <p class="text-center" style="font-size:0.85rem; color:var(--color-text-light); margin-bottom:25px;">Welcome back to Nethra's. Login to view your orders & saved items.</p>
        
        <form id="customerLoginForm">
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">Email Address *</label>
            <input type="email" id="loginEmail" class="form-input" required placeholder="e.g. name@domain.com">
          </div>
          <div class="form-group" style="margin-bottom:20px;">
            <label style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">Password *</label>
            <input type="password" id="loginPassword" class="form-input" required placeholder="Enter password">
          </div>
          <button type="submit" class="checkout-btn" style="margin-top:10px; width:100%;">Login</button>
        </form>
        
        <div class="text-center" style="margin-top:20px; font-size:0.85rem; color:var(--color-text-light);">
          Don't have an account? <a href="#/register" style="color:var(--color-gold); font-weight:600;">Register Here</a>
        </div>
      </div>
    </div>
  `;
  appContainer.innerHTML = loginHTML;

  document.getElementById('customerLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;

    const res = await window.DB.loginUser(email, pwd);
    if (res.success) {
      showToast(`<i class="fa-solid fa-circle-check"></i> Welcome back, ${res.user.name}!`);
      await syncWishlistForCurrentUser();
      updateUserAccountHeader();
      
      const redirect = sessionStorage.getItem('redirect_after_login');
      if (redirect) {
        sessionStorage.removeItem('redirect_after_login');
        window.location.hash = redirect;
      } else {
        window.location.hash = '#/account';
      }
    } else {
      showToast(`<i class="fa-solid fa-circle-xmark" style="color:#d32f2f;"></i> ${res.error}`);
    }
  });
}

// --- View: Customer Registration ---
function renderRegister() {
  const currentUser = window.DB ? window.DB.getCurrentUser() : null;
  if (currentUser) {
    window.location.hash = '#/account';
    return;
  }

  // Generate CAPTCHA values
  const num1 = Math.floor(2 + Math.random() * 8);
  const num2 = Math.floor(2 + Math.random() * 8);
  const captchaAnswer = num1 + num2;

  // Track state
  let generatedDummyOtp = null;
  let otpSent = false;

  let registerHTML = `
    <div class="container section-padding">
      <div style="max-width:500px; margin:0 auto; background:var(--color-cream); border:1px solid var(--color-gold); padding:35px; border-radius:8px;">
        <h2 class="text-center" style="font-family:var(--font-heading); margin-bottom:10px;">Create an Account</h2>
        <p class="text-center" style="font-size:0.85rem; color:var(--color-text-light); margin-bottom:25px;">Register with Nethra's to save your favorite stencils & track your orders.</p>
        
        <form id="customerRegisterForm">
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">Full Name *</label>
            <input type="text" id="regName" class="form-input" required placeholder="Enter full name">
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">Email Address *</label>
            <input type="email" id="regEmail" class="form-input" required placeholder="e.g. name@domain.com">
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">Phone Number *</label>
            <input type="tel" id="regPhone" class="form-input" required placeholder="10-digit mobile number" pattern="[0-9]{10}">
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">Password *</label>
            <input type="password" id="regPassword" class="form-input" required placeholder="Create password">
          </div>

          <!-- Dummy OTP Section -->
          <div style="margin-bottom: 20px; text-align: center;">
            <button type="button" id="sendDummyOtpBtn" class="view-all-btn" style="width: 100%; border: 1px solid var(--color-gold); background: transparent; color: var(--color-gold);">
              <i class="fa-solid fa-key"></i> Send Verification OTP
            </button>
          </div>

          <div id="dummyOtpWrapper" class="verification-box" style="display:none;">
            <div class="verification-header">
              <span>Security Code Verification</span>
              <span id="verificationStatus" style="color:var(--color-gold);">OTP Generated</span>
            </div>
            <div class="form-group" style="margin-bottom:5px;">
              <label style="font-size:0.7rem; font-weight:600;">ENTER 6-DIGIT OTP *</label>
              <input type="text" id="regOtpInput" class="form-input" placeholder="Enter 6-digit OTP">
            </div>
          </div>

          <!-- Math CAPTCHA -->
          <div class="captcha-container">
            <span class="captcha-question">Solve: ${num1} + ${num2} = ?</span>
            <input type="number" id="regCaptcha" class="captcha-input" required placeholder="Ans">
          </div>

          <button type="submit" class="checkout-btn" style="margin-top:10px; width:100%;">Create Account</button>
        </form>
        
        <div class="text-center" style="margin-top:20px; font-size:0.85rem; color:var(--color-text-light);">
          Already registered? <a href="#/login" style="color:var(--color-gold); font-weight:600;">Login Here</a>
        </div>
      </div>
    </div>
  `;
  appContainer.innerHTML = registerHTML;

  // Send Dummy OTP click handler
  document.getElementById('sendDummyOtpBtn').addEventListener('click', () => {
    const phone = document.getElementById('regPhone').value.trim();

    if (!phone || phone.length !== 10) {
      showToast(`<i class="fa-solid fa-triangle-exclamation" style="color:#f57c00;"></i> Please enter a valid 10-digit Phone Number first.`);
      return;
    }

    generatedDummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpSent = true;

    // Show instant popup overlay with the dummy OTP
    const overlay = document.createElement('div');
    overlay.className = 'notification-sim-overlay';
    overlay.id = 'dummyOtpModal';
    overlay.innerHTML = `
      <div class="notification-sim-card" style="max-width:400px; text-align:center;">
        <h3 style="color:var(--color-gold); margin-bottom:15px;"><i class="fa-solid fa-key"></i> Dummy OTP Simulation</h3>
        <p style="font-size:0.85rem; margin-bottom:15px; color:#ccc;">Demo OTP Code generated for <strong>+91 ${phone}</strong>:</p>
        
        <div style="background:#111; border:1px solid var(--color-gold); padding:15px; border-radius:6px; margin-bottom:20px; text-align:center;">
          <p style="font-size:0.85rem; margin-bottom:5px; color:#aaa;">🔑 <strong>Verification OTP Code:</strong></p>
          <span style="font-size:1.8rem; color:var(--color-gold); font-family:monospace; font-weight:bold; letter-spacing:5px;">${generatedDummyOtp}</span>
        </div>

        <button type="button" class="checkout-btn" style="width:100%; font-weight:bold;" onclick="document.getElementById('regOtpInput').value='${generatedDummyOtp}'; document.getElementById('dummyOtpModal').remove();">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Fill & Close
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('dummyOtpWrapper').style.display = 'block';
    document.getElementById('sendDummyOtpBtn').textContent = "Resend Verification OTP";
    showToast(`<i class="fa-solid fa-paper-plane"></i> Dummy OTP code: ${generatedDummyOtp}`);
  });

  document.getElementById('customerRegisterForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check CAPTCHA
    const userCaptcha = parseInt(document.getElementById('regCaptcha').value);
    if (userCaptcha !== captchaAnswer) {
      showToast(`<i class="fa-solid fa-circle-xmark" style="color:#d32f2f;"></i> Incorrect CAPTCHA solution.`);
      return;
    }

    // Check Dummy OTP
    if (!otpSent) {
      showToast(`<i class="fa-solid fa-circle-xmark" style="color:#d32f2f;"></i> Please click 'Send Verification OTP' first.`);
      return;
    }

    const enteredOtp = document.getElementById('regOtpInput').value.trim();
    if (enteredOtp !== generatedDummyOtp) {
      showToast(`<i class="fa-solid fa-circle-xmark" style="color:#d32f2f;"></i> Invalid OTP code. Please enter ${generatedDummyOtp}`);
      return;
    }

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pwd = document.getElementById('regPassword').value;

    const res = await window.DB.registerUser({ name, email, phone, password: pwd });
    if (res.success) {
      showToast(`<i class="fa-solid fa-circle-check"></i> Account verified and created!`);
      await syncWishlistForCurrentUser();
      updateUserAccountHeader();
      
      const redirect = sessionStorage.getItem('redirect_after_login');
      if (redirect) {
        sessionStorage.removeItem('redirect_after_login');
        window.location.hash = redirect;
      } else {
        window.location.hash = '#/account';
      }
    } else {
      showToast(`<i class="fa-solid fa-circle-xmark" style="color:#d32f2f;"></i> ${res.error}`);
    }
  });
}

// --- View: Customer My Account Dashboard ---
async function renderAccount() {
  const user = window.DB ? window.DB.getCurrentUser() : null;
  if (!user) {
    window.location.hash = '#/login';
    return;
  }

  const allOrders = await window.DB.getOrders();
  const myOrders = allOrders.filter(o => o.email.toLowerCase() === user.email.toLowerCase() || o.phone === user.phone);
  
  const likedIds = await window.DB.getUserLikes(user.id);
  const likedProducts = products.filter(p => likedIds.includes(p.id));

  let accountHTML = `
    <div class="container section-padding">
      <div class="breadcrumbs">
        <a href="#/">Home</a> &gt; <span>My Account</span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom:1px solid var(--color-grey-border); padding-bottom:15px;">
        <div>
          <h1 style="font-family:var(--font-heading); font-size:1.8rem;">Hello, ${user.name}!</h1>
          <p style="font-size:0.85rem; color:var(--color-text-light);">${user.email} &bull; ${user.phone || 'No phone'}</p>
        </div>
        <button id="logoutBtn" class="add-cart-btn" style="background:var(--color-danger); border-color:var(--color-danger);">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px;">
        <div>
          <h3 style="font-family:var(--font-heading); font-size:1.2rem; margin-bottom:20px; text-transform:uppercase; border-bottom:2px solid var(--color-gold); padding-bottom:8px;">
            <i class="fa-solid fa-box-open" style="color:var(--color-gold);"></i> My Order History (${myOrders.length})
          </h3>
          
          ${myOrders.length === 0 ? `
            <div style="padding:30px; text-align:center; background:var(--color-cream); border:1px solid var(--color-grey-border);">
              <p style="color:var(--color-text-light);">You have not placed any orders yet.</p>
              <a href="#/shop" class="view-all-btn" style="margin-top:15px; display:inline-block;">Start Shopping</a>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:15px;">
              ${myOrders.map(o => {
                const steps = ['pending', 'paid', 'dispatched', 'delivered'];
                const currentStepIdx = steps.indexOf((o.status || 'pending').toLowerCase());
                const trackerClass = currentStepIdx >= 1 ? `progress-${(o.status || 'pending').toLowerCase()}` : '';

                return `
                <div style="border:1px solid var(--color-grey-border); padding:18px; background:var(--color-white); border-radius:6px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;">
                    <strong>Order #${o.id}</strong>
                    <span class="badge ${o.status ? o.status.toLowerCase() : 'pending'}">${o.status || 'Pending'}</span>
                  </div>
                  <p style="font-size:0.8rem; color:var(--color-text-light); margin-bottom:8px;">
                    Date & Time: ${o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : 'Recent'} &bull; Payment: <strong style="text-transform:uppercase;">${o.paymentMethod}</strong>
                    ${o.transactionId ? `<br>UPI Transaction ID: <strong style="font-family:monospace; color:var(--color-gold);">${o.transactionId}</strong>` : ''}
                  </p>
                  
                  <div style="font-size:0.85rem; font-weight:700; color:var(--color-text-dark); border-top:1px solid var(--color-grey-light); padding-top:8px; margin-bottom:10px;">
                    Total: ₹${o.total.toFixed(2)} (${o.items.length} items)
                  </div>

                  <div style="font-size:0.8rem; background:var(--color-cream); padding:10px; border-radius:4px; margin-bottom:10px; color:var(--color-text-dark);">
                    <p style="font-weight:700; margin-bottom:5px; text-transform:uppercase; font-size:0.7rem; color:var(--color-gold);"><i class="fa-solid fa-boxes-stacked"></i> Items Ordered:</p>
                    <ul style="padding-left:15px; margin:0; list-style:square;">
                      ${o.items.map(item => {
                        const prod = products.find(p => p.id === item.productId) || {};
                        return `<li>${prod.name || `Product #${item.productId}`} &times; ${item.quantity} (₹${(item.price || prod.price || 0).toFixed(2)})</li>`;
                      }).join('')}
                    </ul>
                  </div>

                  ${o.status === 'Cancelled' ? '' : `
                    <div style="margin-top:15px; border-top:1px dashed var(--color-grey-border); padding-top:12px;">
                      <p style="font-size:0.72rem; font-weight:700; color:var(--color-gold); text-transform:uppercase; margin-bottom:12px;"><i class="fa-solid fa-map-location-dot"></i> Shipment Tracker Timeline</p>
                      
                      <div class="tracking-timeline ${trackerClass}">
                        <div class="tracking-step ${currentStepIdx >= 0 ? 'active' : ''}">
                          <div class="tracking-step-dot"><i class="fa-solid fa-file-invoice"></i></div>
                          <div class="tracking-step-label">Ordered</div>
                        </div>
                        <div class="tracking-step ${currentStepIdx >= 1 ? 'active' : ''}">
                          <div class="tracking-step-dot"><i class="fa-solid fa-credit-card"></i></div>
                          <div class="tracking-step-label">Paid</div>
                        </div>
                        <div class="tracking-step ${currentStepIdx >= 2 ? 'active' : ''}">
                          <div class="tracking-step-dot"><i class="fa-solid fa-truck-fast"></i></div>
                          <div class="tracking-step-label">Dispatched</div>
                        </div>
                        <div class="tracking-step ${currentStepIdx >= 3 ? 'active' : ''}">
                          <div class="tracking-step-dot"><i class="fa-solid fa-house-chimney-user"></i></div>
                          <div class="tracking-step-label">Delivered</div>
                        </div>
                      </div>

                      ${o.courierName ? `
                        <div style="background:var(--color-cream); border:1px solid var(--color-gold); border-radius:4px; padding:12px; font-size:0.75rem; margin-top:15px; color:var(--color-text-dark);">
                          <p>🚚 <strong>Courier Partner:</strong> ${o.courierName}</p>
                          <p>📦 <strong>AWB / Tracking Number:</strong> <span style="font-family:monospace; font-weight:700;">${o.trackingId}</span></p>
                          ${o.trackingLink ? `<p style="margin-top:8px;"><a href="${o.trackingLink}" target="_blank" style="color:var(--color-gold); font-weight:700; text-decoration:underline;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Track Shipment Live</a></p>` : ''}
                        </div>
                      ` : `
                        <p style="font-size:0.7rem; color:var(--color-text-light); text-align:center; font-style:italic; margin-top:15px;"><i class="fa-solid fa-circle-info"></i> Awaiting payment confirmation & dispatch details from store admin.</p>
                      `}
                    </div>
                  `}
                </div>
              `; }).join('')}
            </div>
          `}
        </div>

        <div>
          <h3 style="font-family:var(--font-heading); font-size:1.2rem; margin-bottom:20px; text-transform:uppercase; border-bottom:2px solid var(--color-gold); padding-bottom:8px;">
            <i class="fa-solid fa-heart" style="color:#d32f2f;"></i> Saved / Liked Products (${likedProducts.length})
          </h3>

          ${likedProducts.length === 0 ? `
            <div style="padding:30px; text-align:center; background:var(--color-cream); border:1px solid var(--color-grey-border);">
              <p style="color:var(--color-text-light);">No saved items in your wishlist.</p>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
              ${likedProducts.map(p => `
                <div style="border:1px solid var(--color-grey-border); background:var(--color-white); padding:12px; border-radius:6px; text-align:center;">
                  <img src="${p.image}" alt="${p.name}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; margin-bottom:8px;">
                  <h4 style="font-size:0.85rem; margin-bottom:4px; font-weight:600;">${p.name}</h4>
                  <p style="font-size:0.85rem; font-weight:700; color:var(--color-gold); margin-bottom:8px;">₹${p.price.toFixed(2)}</p>
                  <button onclick="addToCart(${p.id}, 1)" class="add-cart-btn" style="width:100%; font-size:0.7rem; padding:6px;">Add To Cart</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    </div>
  `;

  appContainer.innerHTML = accountHTML;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.DB.logoutUser();
    state.wishlist = [];
    localStorage.setItem('nethras_wishlist', JSON.stringify([]));
    updateUserAccountHeader();
    showToast(`<i class="fa-solid fa-circle-check"></i> Logged out successfully.`);
    window.location.hash = '#/login';
  });
}

// --- Global Event Listeners ---

// Listen to Hash Changes for Routing
window.addEventListener('hashchange', router);
window.addEventListener('load', async () => {
  if (window.DB && window.DB.getProducts) {
    await window.DB.getProducts();
  }
  products = window.products;
  await syncWishlistForCurrentUser();
  updateUserAccountHeader();
  updateCartBadge();
  router();
});

// Logo Home Trigger
navLogo.addEventListener('click', () => {
  window.location.hash = '#/';
});

// Cart Header Trigger
cartTrigger.addEventListener('click', () => {
  window.location.hash = '#/cart';
});
