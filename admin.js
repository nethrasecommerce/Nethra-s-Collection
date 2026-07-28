// Admin Panel Controller for Nethra's E-Commerce

let adminState = {
  products: [],
  orders: [],
  enquiries: [],
  activeTab: 'dashboard'
};

// --- DOM References ---
const adminToastContainer = document.getElementById('adminToastContainer');
const paneDashboard = document.getElementById('paneDashboard');
const paneProducts = document.getElementById('paneProducts');
const paneOrders = document.getElementById('paneOrders');
const paneEnquiries = document.getElementById('paneEnquiries');
const pageTitle = document.getElementById('pageTitle');

// Product Modal
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const productModalTitle = document.getElementById('productModalTitle');
const prodEditId = document.getElementById('prodEditId');
const prodName = document.getElementById('prodName');
const prodCategory = document.getElementById('prodCategory');
const prodPrice = document.getElementById('prodPrice');
const prodStock = document.getElementById('prodStock');
const prodImage = document.getElementById('prodImage');
const prodDesc = document.getElementById('prodDesc');
const prodFeatures = document.getElementById('prodFeatures');

// Order Modal
const orderModal = document.getElementById('orderModal');
const modalOrderId = document.getElementById('modalOrderId');
const orderDetailsBody = document.getElementById('orderDetailsBody');

// Toast Notification
function showAdminToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = msg;
  adminToastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Data Fetching & Sync ---
async function loadAdminData() {
  try {
    adminState.products = await window.DB.getProducts();
    adminState.orders = await window.DB.getOrders();
    adminState.enquiries = await window.DB.getEnquiries();
    adminState.paymentSettings = await window.DB.getPaymentSettings();
    adminState.emailSettings = await window.DB.getEmailSettings();
    adminState.customers = await window.DB.getUsersWithDetails();
    adminState.categories = await window.DB.getCategories();
    adminState.siteContent = await window.DB.getSiteContent();
    adminState.portfolio = await window.DB.getPortfolio();

    populateCategoryDropdowns();
    renderDashboard();
    renderProductsTable();
    renderOrdersTable();
    renderEnquiriesTable();
    renderPaymentSettings();
    renderEmailSettings();
    renderCustomersTable();
    renderSiteContentForm();
    renderPortfolioTable();
  } catch (e) {
    console.error("Failed loading admin data:", e);
    showAdminToast("<i class='fa-solid fa-triangle-exclamation'></i> Data sync error.");
  }
}

function populateCategoryDropdowns() {
  const select = document.getElementById('prodCategory');
  if (!select) return;

  const categories = adminState.categories || [];
  let html = categories.map(c => `<option value="${c}">${c}</option>`).join('');
  html += `<option value="__custom__" style="font-weight:bold; color:var(--color-gold);">+ Add New Custom Category...</option>`;

  select.innerHTML = html;
}

document.getElementById('prodCategory').addEventListener('change', (e) => {
  const wrapper = document.getElementById('customCategoryWrapper');
  const input = document.getElementById('prodCustomCategory');
  if (e.target.value === '__custom__') {
    wrapper.style.display = 'block';
    input.required = true;
    input.focus();
  } else {
    wrapper.style.display = 'none';
    input.required = false;
  }
});

// --- Tab Switching ---
function switchTab(tabName) {
  adminState.activeTab = tabName;
  
  // Sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Panes active state
  const panePayment = document.getElementById('panePayment');
  const paneEmail = document.getElementById('paneEmail');
  const paneCustomers = document.getElementById('paneCustomers');
  const paneSiteContent = document.getElementById('paneSiteContent');
  const panePortfolio = document.getElementById('panePortfolio');
  [paneDashboard, paneProducts, paneOrders, paneEnquiries, panePayment, paneEmail, paneCustomers, paneSiteContent, panePortfolio].forEach(pane => {
    if (pane) pane.classList.remove('active');
  });

  if (tabName === 'dashboard') {
    paneDashboard.classList.add('active');
    pageTitle.textContent = "Dashboard Overview";
    renderDashboard();
  } else if (tabName === 'products') {
    paneProducts.classList.add('active');
    pageTitle.textContent = "Product Management";
    renderProductsTable();
  } else if (tabName === 'orders') {
    paneOrders.classList.add('active');
    pageTitle.textContent = "Order Management";
    renderOrdersTable();
  } else if (tabName === 'enquiries') {
    paneEnquiries.classList.add('active');
    pageTitle.textContent = "Customer Enquiries";
    renderEnquiriesTable();
  } else if (tabName === 'payment') {
    panePayment.classList.add('active');
    pageTitle.textContent = "UPI & QR Code Payment Settings";
    renderPaymentSettings();
  } else if (tabName === 'email-settings') {
    paneEmail.classList.add('active');
    pageTitle.textContent = "SMTP Email Gateway Configuration";
    renderEmailSettings();
  } else if (tabName === 'customers') {
    paneCustomers.classList.add('active');
    pageTitle.textContent = "Customer Accounts & Activity";
    renderCustomersTable();
  } else if (tabName === 'content') {
    paneSiteContent.classList.add('active');
    pageTitle.textContent = "Page Content & Banners Editor";
    renderSiteContentForm();
  } else if (tabName === 'portfolio') {
    panePortfolio.classList.add('active');
    pageTitle.textContent = "Portfolio Showcase Gallery Manager";
    renderPortfolioTable();
  }
}

// --- 1. Render Dashboard ---
function renderDashboard() {
  const revenue = adminState.orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.total : 0), 0);
  const outOfStock = adminState.products.filter(p => !p.inStock).length;

  document.getElementById('statRevenue').textContent = `₹${revenue.toFixed(2)}`;
  document.getElementById('statOrders').textContent = adminState.orders.length;
  document.getElementById('statProducts').textContent = adminState.products.length;
  document.getElementById('statOutOfStock').textContent = outOfStock;

  // Recent Orders table (last 5)
  const recentOrdersBody = document.getElementById('recentOrdersBody');
  const recent = adminState.orders.slice(0, 5);

  if (recent.length === 0) {
    recentOrdersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-text-muted);">No orders placed yet.</td></tr>`;
  } else {
    recentOrdersBody.innerHTML = recent.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customerName}</td>
        <td>₹${o.total.toFixed(2)}</td>
        <td><span style="text-transform:uppercase;">${o.paymentMethod}</span></td>
        <td><span class="badge ${o.status ? o.status.toLowerCase() : 'pending'}">${o.status || 'Pending'}</span></td>
      </tr>
    `).join('');
  }

  // Quick Stock Overview
  const stockList = document.getElementById('quickStockList');
  stockList.innerHTML = adminState.products.slice(0, 6).map(p => `
    <div class="quick-stock-item">
      <div class="stock-product-meta">
        <img src="${p.image}" alt="${p.name}" class="stock-img">
        <div>
          <h4 style="font-size:0.85rem; font-weight:600;">${p.name}</h4>
          <span style="font-size:0.75rem; color:var(--color-text-muted);">₹${p.price.toFixed(2)}</span>
        </div>
      </div>
      <span class="badge ${p.inStock ? 'in-stock' : 'out-of-stock'}">
        ${p.inStock ? 'In Stock' : 'Out of Stock'}
      </span>
    </div>
  `).join('');
}

// --- 2. Render Products Table ---
function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  const search = (document.getElementById('productSearchInput').value || '').toLowerCase();

  const filtered = adminState.products.filter(p => 
    p.name.toLowerCase().includes(search) || 
    p.category.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--color-text-muted);">No products found matching search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        <img src="${p.image}" alt="${p.name}" style="width:45px; height:45px; object-fit:cover; border-radius:4px; border:1px solid var(--color-border); cursor:pointer;" onclick="openProductPreviewModal(${p.id})" title="Click to Preview Product">
      </td>
      <td><strong style="cursor:pointer;" onclick="openProductPreviewModal(${p.id})">${p.name}</strong></td>
      <td>${p.category}</td>
      <td>₹${p.price.toFixed(2)}</td>
      <td>
        <button class="badge ${p.inStock ? 'in-stock' : 'out-of-stock'}" 
                onclick="toggleProductStock(${p.id}, ${!p.inStock})" 
                style="cursor:pointer; border:none;" title="Click to toggle stock status">
          ${p.inStock ? 'In Stock' : 'Out of Stock'}
        </button>
      </td>
      <td><i class="fa-solid fa-star" style="color:var(--color-gold); font-size:0.75rem;"></i> ${p.rating} (${p.reviewsCount})</td>
      <td>
        <button class="action-icon-btn" onclick="openProductPreviewModal(${p.id})" title="View Product Preview"><i class="fa-solid fa-eye"></i></button>
        <button class="action-icon-btn" onclick="openEditProductModal(${p.id})" title="Edit Product"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="action-icon-btn delete" onclick="confirmDeleteProduct(${p.id})" title="Delete Product"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    </tr>
  `).join('');
}

// Toggle Stock
async function toggleProductStock(id, newStatus) {
  await window.DB.updateProduct(id, { inStock: newStatus });
  showAdminToast(`<i class="fa-solid fa-rotate"></i> Stock status updated.`);
  loadAdminData();
}

// Open Product Modal (Add)
function openAddProductModal() {
  prodEditId.value = '';
  productForm.reset();
  populateCategoryDropdowns();
  document.getElementById('customCategoryWrapper').style.display = 'none';
  document.getElementById('prodCustomCategory').required = false;
  document.getElementById('prodImagePreviewWrapper').style.display = 'none';
  productModalTitle.textContent = "Add New Product";
  productModal.classList.add('active');
}

// Open Product Modal (Edit)
function openEditProductModal(id) {
  const p = adminState.products.find(item => item.id === id);
  if (!p) return;

  populateCategoryDropdowns();
  document.getElementById('customCategoryWrapper').style.display = 'none';
  document.getElementById('prodCustomCategory').required = false;

  prodEditId.value = p.id;
  prodName.value = p.name;
  
  if (adminState.categories.includes(p.category)) {
    prodCategory.value = p.category;
  } else {
    // If custom category exists for product, add option
    const opt = document.createElement('option');
    opt.value = p.category;
    opt.textContent = p.category;
    prodCategory.insertBefore(opt, prodCategory.lastElementChild);
    prodCategory.value = p.category;
  }

  prodPrice.value = p.price;
  prodStock.value = p.inStock ? "true" : "false";
  prodImage.value = p.image;
  if (p.image) {
    document.getElementById('prodImagePreview').src = p.image;
    document.getElementById('prodImagePreviewWrapper').style.display = 'block';
  } else {
    document.getElementById('prodImagePreviewWrapper').style.display = 'none';
  }

  prodDesc.value = p.description || '';
  prodFeatures.value = Array.isArray(p.features) ? p.features.join(', ') : (p.features || '');

  productModalTitle.textContent = "Edit Product";
  productModal.classList.add('active');
}

function closeProductModal() {
  productModal.classList.remove('active');
}

// Submit Add/Edit Product
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = prodEditId.value ? parseInt(prodEditId.value) : null;
  const featuresArr = prodFeatures.value.split(',').map(f => f.trim()).filter(f => f.length > 0);

  let selectedCategory = prodCategory.value;
  if (selectedCategory === '__custom__') {
    const customVal = document.getElementById('prodCustomCategory').value.trim();
    if (!customVal) {
      showAdminToast("<i class='fa-solid fa-triangle-exclamation'></i> Please enter a custom category name!");
      return;
    }
    selectedCategory = customVal;
    await window.DB.addCategory(selectedCategory);
    adminState.categories = await window.DB.getCategories();
    populateCategoryDropdowns();
  }

  const productData = {
    name: prodName.value.trim(),
    category: selectedCategory,
    price: parseFloat(prodPrice.value),
    inStock: prodStock.value === "true",
    image: prodImage.value.trim(),
    description: prodDesc.value.trim(),
    features: featuresArr
  };

  if (id) {
    await window.DB.updateProduct(id, productData);
    showAdminToast(`<i class="fa-solid fa-check-circle"></i> Product updated successfully!`);
  } else {
    await window.DB.addProduct(productData);
    showAdminToast(`<i class="fa-solid fa-plus-circle"></i> New product created under '${selectedCategory}'!`);
  }

  closeProductModal();
  loadAdminData();
});

// Delete Product
async function confirmDeleteProduct(id) {
  const p = adminState.products.find(item => item.id === id);
  if (!p) return;

  if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
    await window.DB.deleteProduct(id);
    showAdminToast(`<i class="fa-solid fa-trash-can"></i> Product deleted.`);
    loadAdminData();
  }
}

// --- 3. Render Orders Table ---
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  const filter = document.getElementById('orderStatusFilter').value;

  const filtered = adminState.orders.filter(o => 
    filter === 'all' || o.status === filter
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--color-text-muted);">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td style="font-size:0.75rem; color:var(--color-text-muted);">${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Today'}</td>
      <td>${o.customerName}</td>
      <td>${o.phone}<br><span style="font-size:0.75rem; color:var(--color-text-muted);">${o.email}</span></td>
      <td><span style="text-transform:uppercase;">${o.paymentMethod}</span></td>
      <td><strong>₹${o.total.toFixed(2)}</strong></td>
      <td>
        <select class="admin-select" style="padding:4px 8px; font-size:0.75rem;" onchange="updateOrderStatus('${o.id}', this.value)">
          <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Dispatched" ${o.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="action-icon-btn" onclick="openOrderModal('${o.id}')" title="View Details"><i class="fa-solid fa-eye"></i></button>
        <button class="action-icon-btn delete-btn" onclick="deleteOrderAdmin('${o.id}')" title="Delete Order" style="color:#d32f2f; margin-left:6px;"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(orderId, status) {
  await window.DB.updateOrderStatus(orderId, status);
  showAdminToast(`<i class="fa-solid fa-rotate"></i> Order status set to ${status}.`);
  loadAdminData();
}

window.deleteOrderAdmin = async function(orderId) {
  if (confirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone.`)) {
    await window.DB.deleteOrder(orderId);
    showAdminToast(`<i class="fa-solid fa-trash"></i> Order #${orderId} deleted successfully.`);
    loadAdminData();
  }
};

// Open Order Modal Details
function openOrderModal(orderId) {
  const o = adminState.orders.find(item => item.id === orderId);
  if (!o) return;

  modalOrderId.textContent = o.id;

  const itemsHTML = o.items.map(item => {
    const prod = (adminState.products || []).find(p => p.id === item.productId) || (window.products || []).find(p => p.id === item.productId) || {
      name: `Product #${item.productId}`,
      price: item.price || 0,
      image: 'stencil_collection_1784443190864.png',
      category: 'Store Item'
    };

    const itemTotal = (item.price || prod.price) * item.quantity;

    return `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:15px; background:var(--color-black); border:1px solid var(--color-border); padding:12px; border-radius:6px; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${prod.image}" alt="${prod.name}" style="width:55px; height:55px; object-fit:cover; border-radius:4px; border:1px solid var(--color-gold); cursor:pointer;" onclick="openProductPreviewModal(${item.productId})">
          <div>
            <h5 style="font-size:0.9rem; font-weight:700; margin-bottom:2px; cursor:pointer;" onclick="openProductPreviewModal(${item.productId})">${prod.name}</h5>
            <span class="badge gold" style="font-size:0.7rem; font-weight:600;">${prod.category}</span>
            <p style="font-size:0.8rem; color:var(--color-text-muted); margin-top:2px;">₹${(item.price || prod.price).toFixed(2)} &times; ${item.quantity} unit(s)</p>
          </div>
        </div>
        <div style="text-align:right;">
          <strong style="font-size:0.95rem; color:var(--color-gold); display:block; margin-bottom:6px;">₹${itemTotal.toFixed(2)}</strong>
          <button class="action-icon-btn" onclick="openProductPreviewModal(${item.productId})" title="View Product Preview" style="font-size:0.75rem; padding:4px 8px;">
            <i class="fa-solid fa-eye"></i> View Preview
          </button>
        </div>
      </div>
    `;
  }).join('');

  orderDetailsBody.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; border-bottom:1px solid var(--color-border); padding-bottom:15px;">
      <div>
        <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:8px;"><i class="fa-solid fa-user"></i> Customer Information</h4>
        <p><strong>Name:</strong> ${o.customerName}</p>
        <p><strong>Phone:</strong> ${o.phone}</p>
        <p><strong>Email:</strong> ${o.email}</p>
        <p><strong>Order Timestamp:</strong> ${o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : 'N/A'}</p>
      </div>
      <div>
        <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:8px;"><i class="fa-solid fa-location-dot"></i> Shipping Address</h4>
        <p>${o.address}</p>
        <p>${o.city}, ${o.state} - ${o.pincode}</p>
      </div>
    </div>

    <!-- Items Ordered Section with Product Preview Cards -->
    <div style="margin-bottom:20px;">
      <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:12px;"><i class="fa-solid fa-boxes-stacked"></i> Ordered Items (${o.items.length})</h4>
      ${itemsHTML}
    </div>

    <!-- Payment details verification panel -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
      <div style="background:var(--color-black); border:1px solid var(--color-border); padding:15px; border-radius:6px;">
        <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:10px;"><i class="fa-solid fa-receipt"></i> Order Breakdown & UTR</h4>
        <p><strong>Payment Method:</strong> <span style="text-transform:uppercase; font-weight:700;">${o.paymentMethod}</span></p>
        ${o.transactionId ? `<p><strong>UPI Transaction ID (UTR):</strong> <span style="font-family:monospace; color:var(--color-gold); font-weight:bold; font-size:0.9rem;">${o.transactionId}</span></p>` : ''}
        <p><strong>Subtotal:</strong> ₹${o.subtotal.toFixed(2)}</p>
        <p><strong>Shipping:</strong> ${o.shippingCost === 0 ? 'FREE' : `₹${o.shippingCost.toFixed(2)}`}</p>
        <p style="font-size:1.1rem; font-weight:700; color:var(--color-gold); margin-top:8px; border-top:1px dashed var(--color-border); padding-top:8px;">Grand Total: ₹${o.total.toFixed(2)}</p>
      </div>

      <div style="background:var(--color-black); border:1px solid var(--color-border); padding:15px; border-radius:6px;">
        <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:10px;"><i class="fa-solid fa-circle-check"></i> Payment Verification</h4>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.7rem; font-weight:600; display:block; margin-bottom:4px;">VERIFICATION STATUS</label>
          <select id="modalPaymentVerified" class="admin-input" style="padding:6px;">
            <option value="false" ${!o.paymentVerified ? 'selected' : ''}>Unverified / Pending</option>
            <option value="true" ${o.paymentVerified ? 'selected' : ''}>Verified / Paid</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.7rem; font-weight:600; display:block; margin-bottom:4px;">VERIFICATION NOTES</label>
          <input type="text" id="modalPaymentNotes" class="admin-input" placeholder="e.g. Received via PhonePe" value="${o.paymentNotes || ''}" style="padding:6px;">
        </div>
      </div>
    </div>

    <!-- Courier / Dispatch Tracking Details -->
    <div style="background:var(--color-black); border:1px solid var(--color-border); padding:15px; border-radius:6px; margin-bottom:20px;">
      <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:12px;"><i class="fa-solid fa-truck-ramp-box"></i> Shipping & Courier Details</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div class="form-group">
          <label style="font-size:0.7rem; font-weight:600; display:block; margin-bottom:4px;">COURIER PARTNER</label>
          <input type="text" id="modalCourierName" class="admin-input" placeholder="e.g. Delhivery, DTDC" value="${o.courierName || ''}" style="padding:6px;">
        </div>
        <div class="form-group">
          <label style="font-size:0.7rem; font-weight:600; display:block; margin-bottom:4px;">TRACKING ID / AWB</label>
          <input type="text" id="modalTrackingId" class="admin-input" placeholder="e.g. 123456789" value="${o.trackingId || ''}" style="padding:6px;">
        </div>
        <div class="form-group">
          <label style="font-size:0.7rem; font-weight:600; display:block; margin-bottom:4px;">TRACKING URL LINK</label>
          <input type="text" id="modalTrackingLink" class="admin-input" placeholder="e.g. https://delhivery.com/..." value="${o.trackingLink || ''}" style="padding:6px;">
        </div>
      </div>
    </div>

    <!-- Action Forms and status updater -->
    <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:15px; border-radius:6px; border:1px solid var(--color-border);">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:0.8rem; font-weight:700; color:var(--color-gold);">ORDER STATUS:</span>
        <select id="modalOrderStatus" class="admin-input" style="width:140px; padding:6px; font-size:0.8rem;">
          <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Paid" ${o.status === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Dispatched" ${o.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button type="button" class="primary-btn" onclick="deleteOrderModal('${o.id}')" style="background:#d32f2f; border-color:#d32f2f; padding:8px 16px; font-size:0.8rem;">
          <i class="fa-solid fa-trash"></i> Delete Order
        </button>
        <button type="button" class="primary-btn" onclick="generateInvoice('${o.id}')" style="background:#4caf50; border-color:#4caf50; padding:8px 16px; font-size:0.8rem;">
          <i class="fa-solid fa-file-invoice"></i> Print / Save Invoice
        </button>
        <button type="button" class="primary-btn" onclick="saveOrderAdminUpdates('${o.id}')" style="padding:8px 16px; font-size:0.8rem;">
          <i class="fa-solid fa-floppy-disk"></i> Update Order
        </button>
      </div>
    </div>
  `;

  orderModal.classList.add('active');
}

window.saveOrderAdminUpdates = async function(orderId) {
  const paymentVerified = document.getElementById('modalPaymentVerified').value === 'true';
  const paymentNotes = document.getElementById('modalPaymentNotes').value.trim();
  const courierName = document.getElementById('modalCourierName').value.trim();
  const trackingId = document.getElementById('modalTrackingId').value.trim();
  const trackingLink = document.getElementById('modalTrackingLink').value.trim();
  const status = document.getElementById('modalOrderStatus').value;

  const updates = {
    paymentVerified,
    paymentNotes,
    courierName,
    trackingId,
    trackingLink,
    status
  };

  await window.DB.updateOrderPaymentAndCourier(orderId, updates);
  showAdminToast(`<i class="fa-solid fa-check-circle"></i> Order details updated successfully!`);
  closeOrderModal();
  loadAdminData();
};

window.deleteOrderModal = async function(orderId) {
  if (confirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone.`)) {
    await window.DB.deleteOrder(orderId);
    closeOrderModal();
    showAdminToast(`<i class="fa-solid fa-trash"></i> Order #${orderId} deleted successfully.`);
    loadAdminData();
  }
};

window.generateInvoice = function(orderId) {
  const o = adminState.orders.find(item => item.id === orderId);
  if (!o) return;

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    showAdminToast("<i class='fa-solid fa-triangle-exclamation'></i> Pop-up blocked! Please enable pop-ups.");
    return;
  }
  
  const itemsRows = o.items.map(item => {
    const prod = adminState.products.find(p => p.id === item.productId) || {};
    const itemTotal = (item.price || prod.price || 0) * item.quantity;
    return `
      <tr>
        <td style="border:1px solid #ddd; padding:8px;">${prod.name || 'Product'}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">₹${(item.price || prod.price || 0).toFixed(2)}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${item.quantity}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:right;">₹${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice #${o.id}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
        .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #c5a059; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #000; }
        .gold { color: #c5a059; }
        .company-details { text-align: right; font-size: 0.85rem; line-height: 1.4; }
        .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .meta-box h4 { margin-top: 0; margin-bottom: 8px; color: #c5a059; border-bottom: 1px solid #eee; padding-bottom: 4px; text-transform: uppercase; font-size: 0.85rem; }
        .meta-box p { margin: 4px 0; font-size: 0.85rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f8f8f8; font-weight: bold; text-align: left; text-transform: uppercase; font-size: 0.8rem; }
        th, td { border: 1px solid #eee; padding: 10px; font-size: 0.85rem; }
        .total-box { margin-top: 30px; text-align: right; line-height: 1.6; }
        .print-btn-bar { margin-top: 40px; text-align: center; }
        .print-btn { background-color: #c5a059; color: white; border: none; padding: 10px 20px; font-size: 1rem; cursor: pointer; border-radius: 4px; }
        .print-btn:hover { background-color: #b08d4b; }
        @media print {
          .print-btn-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div style="display:flex; align-items:center; gap:14px;">
          <img src="logo.png" alt="Nethra's Logo" style="width:65px; height:65px; object-fit:contain; border-radius:50%; border:2px solid #c5a059;">
          <div>
            <div class="logo" style="font-family: Georgia, serif; letter-spacing:1px; color:#111;">NETHRA'S</div>
            <div style="font-size:0.75rem; color:#666; font-weight:600; letter-spacing:1px;">MEHANDI STENCILS & ACCESSORIES</div>
          </div>
        </div>
        <div class="company-details">
          <strong>Nethra's Store</strong><br>
          Phone: +91 96294 27700, 98779 61132<br>
          Email: nethras0504@gmail.com<br>
          Coimbatore, Tamil Nadu, India
        </div>
      </div>

      <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 20px; color:#c5a059;">INVOICE</div>

      <div class="invoice-meta">
        <div class="meta-box">
          <h4>Billing / Shipping To</h4>
          <p><strong>Name:</strong> ${o.customerName}</p>
          <p><strong>Phone:</strong> ${o.phone}</p>
          <p><strong>Email:</strong> ${o.email}</p>
          <p><strong>Address:</strong> ${o.address}, ${o.city}, ${o.state} - ${o.pincode}</p>
        </div>
        <div class="meta-box" style="text-align: right;">
          <h4>Invoice Info</h4>
          <p><strong>Invoice Number:</strong> #${o.id}</p>
          <p><strong>Date & Time:</strong> ${o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : 'Recent'}</p>
          <p><strong>Payment Method:</strong> ${o.paymentMethod.toUpperCase()}</p>
          ${o.transactionId ? `<p><strong>UPI Transaction ID:</strong> ${o.transactionId}</p>` : ''}
          <p><strong>Payment Status:</strong> ${o.paymentVerified ? 'Verified / Paid' : 'Pending Verification'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Item Details</th>
            <th style="text-align: center; width: 15%;">Unit Price</th>
            <th style="text-align: center; width: 15%;">Qty</th>
            <th style="text-align: right; width: 20%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          <tr>
            <td colspan="3" style="text-align: right; font-weight: bold; border: none; padding-top: 20px;">Subtotal:</td>
            <td style="text-align: right; font-weight: bold; border-top: 1px solid #eee; padding-top: 20px;">₹${o.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right; font-weight: bold; border: none;">Shipping Cost:</td>
            <td style="text-align: right; font-weight: bold; border: none;">${o.shippingCost === 0 ? 'FREE' : `₹${o.shippingCost.toFixed(2)}`}</td>
          </tr>
          <tr style="font-size: 1.1rem; color: #c5a059;">
            <td colspan="3" style="text-align: right; font-weight: bold; border: none;">Grand Total:</td>
            <td style="text-align: right; font-weight: bold; border-top: 2px solid #c5a059;">₹${o.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      ${o.courierName ? `
        <div style="margin-top:30px; background:#f9f9f9; padding:15px; border-radius:4px; font-size:0.85rem;">
          <strong>Courier Partner:</strong> ${o.courierName} &bull; <strong>AWB / Tracking Number:</strong> ${o.trackingId}
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 50px; font-size: 0.8rem; color: #666;">
        Thank you for choosing Nethra's Mehandi Stencils & Accessories!
      </div>

      <div class="print-btn-bar">
        <button class="print-btn" onclick="window.print()">Print Invoice / Save as PDF</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
};

function closeOrderModal() {
  orderModal.classList.remove('active');
}

// Open Product Preview Modal
function openProductPreviewModal(productId) {
  const p = (adminState.products || []).find(item => item.id === productId) || (window.products || []).find(item => item.id === productId);
  if (!p) {
    showAdminToast("<i class='fa-solid fa-triangle-exclamation'></i> Product details unavailable.");
    return;
  }

  const productPreviewBody = document.getElementById('productPreviewBody');
  const productPreviewModal = document.getElementById('productPreviewModal');

  const featuresListHTML = (p.features && p.features.length > 0) ? `
    <div style="margin-top:15px;">
      <h5 style="font-size:0.8rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:6px;">Key Highlights</h5>
      <ul style="padding-left:18px; font-size:0.85rem; color:var(--color-text-muted);">
        ${p.features.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  productPreviewBody.innerHTML = `
    <div style="display:grid; grid-template-columns: 240px 1fr; gap:25px; align-items:start;">
      <!-- Product Image -->
      <div>
        <img src="${p.image}" alt="${p.name}" style="width:100%; height:240px; object-fit:cover; border-radius:8px; border:2px solid var(--color-gold);">
      </div>

      <!-- Product Details -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <span class="badge gold" style="margin-bottom:6px; display:inline-block;">${p.category}</span>
            <h2 style="font-size:1.4rem; font-weight:700; color:#ffffff; font-family:var(--font-heading); margin-top:4px;">${p.name}</h2>
          </div>
          <span class="badge ${p.inStock ? 'in-stock' : 'out-of-stock'}" style="font-size:0.8rem;">
            ${p.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>

        <div style="font-size:1.4rem; font-weight:700; color:var(--color-gold); margin-bottom:12px;">
          ₹${p.price.toFixed(2)}
        </div>

        <div style="margin-bottom:15px; font-size:0.85rem; color:var(--color-text-muted);">
          <i class="fa-solid fa-star" style="color:var(--color-gold);"></i> <strong>${p.rating || 5.0}</strong> (${p.reviewsCount || 12} Customer Reviews)
        </div>

        <div style="background:var(--color-black); border:1px solid var(--color-border); padding:12px; border-radius:6px; margin-bottom:15px;">
          <h5 style="font-size:0.8rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:4px;">Description</h5>
          <p style="font-size:0.85rem; color:var(--color-text-light); line-height:1.5;">${p.description || 'No description provided.'}</p>
        </div>

        ${featuresListHTML}

        <div style="margin-top:20px; display:flex; gap:10px;">
          <button class="primary-btn" onclick="closeProductPreviewModal(); openEditProductModal(${p.id});">
            <i class="fa-solid fa-pen-to-square"></i> Edit Product
          </button>
        </div>
      </div>
    </div>
  `;

  productPreviewModal.classList.add('active');
}

function closeProductPreviewModal() {
  const productPreviewModal = document.getElementById('productPreviewModal');
  if (productPreviewModal) productPreviewModal.classList.remove('active');
}

document.getElementById('closeProductPreviewModalBtn').addEventListener('click', closeProductPreviewModal);

// --- 4. Render Enquiries Table ---
function renderEnquiriesTable() {
  const tbody = document.getElementById('enquiriesTableBody');

  if (adminState.enquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--color-text-muted);">No messages received.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminState.enquiries.map(e => `
    <tr>
      <td style="font-size:0.75rem; color:var(--color-text-muted);">${e.created_at ? new Date(e.created_at).toLocaleDateString() : 'Today'}</td>
      <td><strong>${e.name}</strong></td>
      <td>${e.email}<br><span style="font-size:0.75rem; color:var(--color-text-muted);">${e.phone || 'N/A'}</span></td>
      <td style="max-width:300px; font-size:0.8rem; color:var(--color-text-muted);">${e.message}</td>
      <td><span class="badge in-stock">${e.status || 'Received'}</span></td>
    </tr>
  `).join('');
}

// --- 5. Render Payment Settings ---
function renderPaymentSettings() {
  const s = adminState.paymentSettings || {};
  document.getElementById('upiEnabled').checked = s.upiEnabled !== false;
  document.getElementById('upiId').value = s.upiId || '9629427700@upi';
  document.getElementById('upiQrImage').value = s.upiQrImage || 'logo.png';
  document.getElementById('merchantName').value = s.merchantName || "Nethra's Mehandi & Accessories";
  document.getElementById('codEnabled').checked = s.codEnabled !== false;
}

document.getElementById('paymentSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settings = {
    upiEnabled: document.getElementById('upiEnabled').checked,
    upiId: document.getElementById('upiId').value.trim(),
    upiQrImage: document.getElementById('upiQrImage').value.trim(),
    merchantName: document.getElementById('merchantName').value.trim(),
    codEnabled: document.getElementById('codEnabled').checked
  };

  await window.DB.savePaymentSettings(settings);
  adminState.paymentSettings = settings;
  showAdminToast(`<i class="fa-solid fa-check-circle"></i> UPI & Payment Settings saved!`);
});

// --- Render Email & SMTP Settings ---
function renderEmailSettings() {
  const s = adminState.emailSettings || {};
  document.getElementById('smtpHost').value = s.smtpHost || 'smtp.gmail.com';
  document.getElementById('smtpPort').value = s.smtpPort || 587;
  document.getElementById('smtpUsername').value = s.smtpUsername || '';
  document.getElementById('smtpPassword').value = s.smtpPassword || '';
  document.getElementById('senderEmail').value = s.senderEmail || 'nethras0504@gmail.com';
  document.getElementById('receiverEmail').value = s.receiverEmail || 'nethras0504@gmail.com';
}

document.getElementById('emailSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settings = {
    smtpHost: document.getElementById('smtpHost').value.trim(),
    smtpPort: parseInt(document.getElementById('smtpPort').value),
    smtpUsername: document.getElementById('smtpUsername').value.trim(),
    smtpPassword: document.getElementById('smtpPassword').value.trim(),
    senderEmail: document.getElementById('senderEmail').value.trim(),
    receiverEmail: document.getElementById('receiverEmail').value.trim()
  };

  await window.DB.saveEmailSettings(settings);
  adminState.emailSettings = settings;
  showAdminToast(`<i class="fa-solid fa-check-circle"></i> SMTP Email configuration saved!`);
});

// --- 6. Render Customers Table ---
function renderCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  const customers = adminState.customers || [];

  if (customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--color-text-muted);">No registered customers yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.email}</td>
      <td>${c.phone || 'N/A'}</td>
      <td><span class="badge processing">${c.ordersCount || 0} Orders</span></td>
      <td><strong>₹${(c.totalSpent || 0).toFixed(2)}</strong></td>
      <td><span class="badge gold">${(c.likedProductIds || []).length} Liked Items</span></td>
      <td style="font-size:0.75rem; color:var(--color-text-muted);">${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}</td>
      <td>
        <button class="action-icon-btn" onclick="openCustomerModal(${c.id})" title="View Customer Orders & Liked Products"><i class="fa-solid fa-eye"></i> Details</button>
        <button class="action-icon-btn delete-btn" onclick="deleteCustomerAdmin(${c.id}, '${(c.name || '').replace(/'/g, "\\'")}')" title="Delete Customer Account" style="color:#d32f2f; margin-left:6px;"><i class="fa-solid fa-trash"></i> Delete</button>
      </td>
    </tr>
  `).join('');
}

window.deleteCustomerAdmin = async function(userId, userName) {
  if (confirm(`Are you sure you want to delete customer account "${userName}"? This action cannot be undone.`)) {
    await window.DB.deleteUser(userId);
    closeCustomerModal();
    showAdminToast(`<i class="fa-solid fa-trash"></i> Customer account "${userName}" deleted successfully.`);
    loadAdminData();
  }
};

// Open Customer Modal Details
function openCustomerModal(userId) {
  const c = adminState.customers.find(item => item.id === userId);
  if (!c) return;

  const deleteBtn = document.getElementById('deleteCustomerModalBtn');
  if (deleteBtn) {
    deleteBtn.onclick = function() {
      deleteCustomerAdmin(c.id, c.name);
    };
  }

  const modalCustomerName = document.getElementById('modalCustomerName');
  const customerDetailsBody = document.getElementById('customerDetailsBody');
  const customerModal = document.getElementById('customerModal');

  modalCustomerName.textContent = c.name;

  const likedProducts = (adminState.products || []).filter(p => (c.likedProductIds || []).includes(p.id));

  customerDetailsBody.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; border-bottom:1px solid var(--color-border); padding-bottom:15px;">
      <div>
        <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:8px;">Customer Profile</h4>
        <p><strong>Name:</strong> ${c.name}</p>
        <p><strong>Email:</strong> ${c.email}</p>
        <p><strong>Phone:</strong> ${c.phone || 'N/A'}</p>
      </div>
      <div>
        <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:8px;">Activity Summary</h4>
        <p><strong>Total Orders Placed:</strong> ${c.ordersCount || 0}</p>
        <p><strong>Total Revenue Generated:</strong> ₹${(c.totalSpent || 0).toFixed(2)}</p>
        <p><strong>Total Liked Products:</strong> ${(c.likedProductIds || []).length}</p>
      </div>
    </div>

    <!-- Orders Placed by Customer -->
    <div style="margin-bottom:25px;">
      <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:12px;">Order History (${c.orders.length})</h4>
      ${c.orders.length === 0 ? '<p style="font-size:0.8rem; color:var(--color-text-muted);">No orders placed yet.</p>' : `
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${c.orders.map(o => `
            <div style="background:var(--color-black); border:1px solid var(--color-border); padding:12px; border-radius:6px; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <strong>Order ID: ${o.id}</strong>
                <span class="badge ${o.status ? o.status.toLowerCase() : 'pending'}">${o.status}</span>
              </div>
              <p style="font-size:0.75rem; color:var(--color-text-muted);">Date: ${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Recent'} &bull; Payment: <strong style="text-transform:uppercase;">${o.paymentMethod}</strong></p>
              <p style="font-weight:700; color:var(--color-gold); margin-top:4px;">Amount: ₹${o.total.toFixed(2)} (${o.items.length} items)</p>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Liked / Wishlist Products by Customer -->
    <div>
      <h4 style="font-size:0.85rem; color:var(--color-gold); text-transform:uppercase; margin-bottom:12px;">Liked / Wishlist Products (${likedProducts.length})</h4>
      ${likedProducts.length === 0 ? '<p style="font-size:0.8rem; color:var(--color-text-muted);">No liked products.</p>' : `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px;">
          ${likedProducts.map(p => `
            <div style="background:var(--color-black); border:1px solid var(--color-border); padding:10px; border-radius:6px; text-align:center;">
              <img src="${p.image}" alt="${p.name}" style="width:100%; height:90px; object-fit:cover; border-radius:4px; margin-bottom:6px;">
              <h5 style="font-size:0.8rem; margin-bottom:2px;">${p.name}</h5>
              <span style="font-size:0.8rem; color:var(--color-gold); font-weight:700;">₹${p.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  customerModal.classList.add('active');
}

function closeCustomerModal() {
  const customerModal = document.getElementById('customerModal');
  if (customerModal) customerModal.classList.remove('active');
}

document.getElementById('closeCustomerModalBtn').addEventListener('click', closeCustomerModal);

// Global Event Handlers & Routing
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.getAttribute('data-tab');
    switchTab(tab);
  });
});

document.getElementById('productSearchInput').addEventListener('input', renderProductsTable);
document.getElementById('orderStatusFilter').addEventListener('change', renderOrdersTable);

document.getElementById('openAddProductModalBtn').addEventListener('click', openAddProductModal);
document.getElementById('closeProductModalBtn').addEventListener('click', closeProductModal);
document.getElementById('cancelProductModalBtn').addEventListener('click', closeProductModal);
document.getElementById('closeOrderModalBtn').addEventListener('click', closeOrderModal);

// --- 7. Render Site Content Form ---
function renderSiteContentForm() {
  const c = adminState.siteContent || {};
  document.getElementById('cmsHeroTitle').value = c.heroTitle || '';
  document.getElementById('cmsHeroSubtitle').value = c.heroSubtitle || '';
  document.getElementById('cmsHeroImage').value = (c.heroImage && !c.heroImage.includes('_1784')) ? c.heroImage : 'hero_banner.png';
  document.getElementById('cmsAboutBanner').value = (c.aboutBanner && !c.aboutBanner.includes('_1784')) ? c.aboutBanner : 'about_banner.png';
  document.getElementById('cmsStencilBanner').value = (c.stencilBanner && !c.stencilBanner.includes('_1784')) ? c.stencilBanner : 'stencil_collection.png';
  document.getElementById('cmsAccBanner').value = (c.accBanner && !c.accBanner.includes('_1784')) ? c.accBanner : 'acc_collection.png';
  document.getElementById('cmsShopTitle').value = c.shopTitle || '';
  document.getElementById('cmsShopSubtitle').value = c.shopSubtitle || '';
  document.getElementById('cmsShopBanner').value = (c.shopBanner && !c.shopBanner.includes('_1784')) ? c.shopBanner : 'acc_collection.png';
  document.getElementById('cmsAboutStory').value = c.aboutStory || '';
  document.getElementById('cmsAboutCraftImage').value = (c.aboutCraftImage && !c.aboutCraftImage.includes('media__')) ? c.aboutCraftImage : 'stencil_broad.png';
  document.getElementById('cmsPhone1').value = c.contactPhone1 || '';
  document.getElementById('cmsPhone2').value = c.contactPhone2 || '';
  document.getElementById('cmsEmail').value = c.contactEmail || '';
  document.getElementById('cmsAddress').value = c.contactAddress || '';
  document.getElementById('cmsInstaStencils').value = c.instaStencils || '';
  document.getElementById('cmsInstaAcc').value = c.instaAcc || '';
  document.getElementById('cmsFooterDesc').value = c.footerDesc || '';
}

document.getElementById('siteContentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = {
    heroTitle: document.getElementById('cmsHeroTitle').value.trim(),
    heroSubtitle: document.getElementById('cmsHeroSubtitle').value.trim(),
    heroImage: document.getElementById('cmsHeroImage').value.trim(),
    aboutBanner: document.getElementById('cmsAboutBanner').value.trim(),
    stencilBanner: document.getElementById('cmsStencilBanner').value.trim(),
    accBanner: document.getElementById('cmsAccBanner').value.trim(),
    shopTitle: document.getElementById('cmsShopTitle').value.trim(),
    shopSubtitle: document.getElementById('cmsShopSubtitle').value.trim(),
    shopBanner: document.getElementById('cmsShopBanner').value.trim(),
    aboutStory: document.getElementById('cmsAboutStory').value.trim(),
    aboutCraftImage: document.getElementById('cmsAboutCraftImage').value.trim(),
    contactPhone1: document.getElementById('cmsPhone1').value.trim(),
    contactPhone2: document.getElementById('cmsPhone2').value.trim(),
    contactEmail: document.getElementById('cmsEmail').value.trim(),
    contactAddress: document.getElementById('cmsAddress').value.trim(),
    instaStencils: document.getElementById('cmsInstaStencils').value.trim(),
    instaAcc: document.getElementById('cmsInstaAcc').value.trim(),
    footerDesc: document.getElementById('cmsFooterDesc').value.trim()
  };

  await window.DB.saveSiteContent(content);
  adminState.siteContent = content;
  showAdminToast(`<i class="fa-solid fa-check-circle"></i> All Website Pages & Banners saved live!`);
});

// --- Image File Upload Handlers ---
function attachFileUploadHandler(fileInputId, textInputId, previewImgId = null, previewWrapperId = null) {
  const fileInput = document.getElementById(fileInputId);
  const textInput = document.getElementById(textInputId);
  if (!fileInput || !textInput) return;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      textInput.value = dataUrl;

      if (previewImgId && previewWrapperId) {
        const img = document.getElementById(previewImgId);
        const wrapper = document.getElementById(previewWrapperId);
        if (img && wrapper) {
          img.src = dataUrl;
          wrapper.style.display = 'block';
        }
      }

      showAdminToast(`<i class="fa-solid fa-image"></i> Image uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  });
}

// --- 8. Render Portfolio Table ---
function renderPortfolioTable() {
  const tbody = document.getElementById('portfolioTableBody');
  const portfolio = adminState.portfolio || [];

  if (portfolio.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--color-text-muted);">No portfolio items found. Click 'Add Portfolio Showcase Item' to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = portfolio.map(item => `
    <tr>
      <td>
        <img src="${item.image}" alt="${item.title}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid var(--color-border);">
      </td>
      <td><strong>${item.title}</strong></td>
      <td><span class="badge gold">${item.category}</span></td>
      <td style="max-width:260px; font-size:0.8rem; color:var(--color-text-muted);">${item.description || 'Showcase design'}</td>
      <td>
        <button class="action-icon-btn delete" onclick="confirmDeletePortfolio(${item.id})" title="Delete Portfolio Item"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    </tr>
  `).join('');
}

function openAddPortfolioModal() {
  document.getElementById('portfolioForm').reset();
  document.getElementById('portfolioModal').classList.add('active');
}

function closePortfolioModal() {
  document.getElementById('portfolioModal').classList.remove('active');
}

document.getElementById('openAddPortfolioModalBtn').addEventListener('click', openAddPortfolioModal);
document.getElementById('closePortfolioModalBtn').addEventListener('click', closePortfolioModal);
document.getElementById('cancelPortfolioModalBtn').addEventListener('click', closePortfolioModal);

document.getElementById('portfolioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newItem = {
    title: document.getElementById('portTitle').value.trim(),
    category: document.getElementById('portCategory').value,
    image: document.getElementById('portImage').value.trim(),
    description: document.getElementById('portDesc').value.trim()
  };

  await window.DB.addPortfolioItem(newItem);
  showAdminToast(`<i class="fa-solid fa-plus-circle"></i> Portfolio showcase item added!`);
  closePortfolioModal();
  loadAdminData();
});

async function confirmDeletePortfolio(id) {
  if (confirm("Are you sure you want to remove this item from the portfolio gallery?")) {
    await window.DB.deletePortfolioItem(id);
    showAdminToast(`<i class="fa-solid fa-trash-can"></i> Portfolio item removed.`);
    loadAdminData();
  }
}

// Bind file uploads on load
attachFileUploadHandler('prodImageFile', 'prodImage', 'prodImagePreview', 'prodImagePreviewWrapper');
attachFileUploadHandler('cmsHeroImageFile', 'cmsHeroImage');
attachFileUploadHandler('cmsAboutBannerFile', 'cmsAboutBanner');
attachFileUploadHandler('cmsStencilBannerFile', 'cmsStencilBanner');
attachFileUploadHandler('cmsAccBannerFile', 'cmsAccBanner');
attachFileUploadHandler('cmsShopBannerFile', 'cmsShopBanner');
attachFileUploadHandler('portImageFile', 'portImage');
attachFileUploadHandler('upiQrImageFile', 'upiQrImage');

// Load on start
window.addEventListener('load', () => {
  loadAdminData();
});
