// Database Service for Nethra's E-Commerce (Supabase + Local Storage Fallback)
const SUPABASE_URL = "https://vcunddopqhoviwhxnjqz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdW5kZG9wcWhvdml3aHhuanF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mjc0MTUsImV4cCI6MjEwMDEwMzQxNX0.7yu4QCOQLr3kAM0IkX2JRPwTC2JkTKVT4oi1bHjjZaY";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

window.DB = {
  // --- PRODUCTS ---
  async getProducts() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id.asc`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Normalize Supabase fields (snake_case to camelCase)
          const normalized = data.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: parseFloat(item.price),
            rating: parseFloat(item.rating || 4.5),
            reviewsCount: item.reviews_count || 0,
            inStock: item.in_stock,
            features: typeof item.features === 'string' ? JSON.parse(item.features) : (item.features || []),
            description: item.description,
            details: typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || {}),
            image: item.image
          }));
          localStorage.setItem('nethras_products', JSON.stringify(normalized));
          window.products = normalized;
          return normalized;
        }
      }
    } catch (e) {
      console.warn("Supabase fetch failed, fallback to localStorage/default:", e);
    }
    
    // Local storage fallback
    const local = localStorage.getItem('nethras_products');
    if (local) {
      window.products = JSON.parse(local);
      return window.products;
    }
    return window.products || [];
  },

  async addProduct(product) {
    const payload = {
      name: product.name,
      category: product.category,
      price: product.price,
      rating: product.rating || 4.8,
      reviews_count: product.reviewsCount || 1,
      in_stock: product.inStock !== false,
      features: product.features || [],
      description: product.description || '',
      details: product.details || {},
      image: product.image || 'stencil_broad.png'
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const result = await response.json();
        await this.getProducts(); // refresh cache
        return result[0];
      }
    } catch (e) {
      console.error("Supabase addProduct failed:", e);
    }

    // Local fallback
    const newId = (window.products.length > 0 ? Math.max(...window.products.map(p => p.id)) : 0) + 1;
    const newProduct = { ...product, id: newId };
    window.products.push(newProduct);
    localStorage.setItem('nethras_products', JSON.stringify(window.products));
    return newProduct;
  },

  async updateProduct(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.inStock !== undefined) payload.in_stock = updates.inStock;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.features !== undefined) payload.features = updates.features;
    if (updates.details !== undefined) payload.details = updates.details;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        await this.getProducts();
        return true;
      }
    } catch (e) {
      console.error("Supabase updateProduct failed:", e);
    }

    // Local fallback
    const index = window.products.findIndex(p => p.id === id);
    if (index > -1) {
      window.products[index] = { ...window.products[index], ...updates };
      localStorage.setItem('nethras_products', JSON.stringify(window.products));
    }
    return true;
  },

  async deleteProduct(id) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        await this.getProducts();
        return true;
      }
    } catch (e) {
      console.error("Supabase deleteProduct failed:", e);
    }

    // Local fallback
    window.products = window.products.filter(p => p.id !== id);
    localStorage.setItem('nethras_products', JSON.stringify(window.products));
    return true;
  },

  // --- ORDERS ---
  async getOrders() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (response.ok) {
        const data = await response.json();
        const normalized = data.map(o => ({
          id: o.id,
          customerName: o.customer_name,
          phone: o.phone,
          email: o.email,
          address: o.address,
          city: o.city,
          state: o.state,
          pincode: o.pincode,
          items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
          subtotal: parseFloat(o.subtotal),
          shippingCost: parseFloat(o.shipping_cost),
          total: parseFloat(o.total),
          paymentMethod: o.payment_method,
          status: o.status || 'Pending',
          createdAt: o.created_at,
          transactionId: o.transaction_id || '',
          paymentVerified: o.payment_verified || false,
          paymentNotes: o.payment_notes || '',
          courierName: o.courier_name || '',
          trackingId: o.tracking_id || '',
          trackingLink: o.tracking_link || ''
        }));
        localStorage.setItem('nethras_orders', JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.warn("Supabase orders fetch failed:", e);
    }

    const local = localStorage.getItem('nethras_orders');
    return local ? JSON.parse(local) : [];
  },

  async createOrder(order) {
    const payload = {
      id: order.id,
      customer_name: order.customerName,
      phone: order.phone,
      email: order.email,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      items: order.items,
      subtotal: order.subtotal,
      shipping_cost: order.shippingCost || 0,
      total: order.total,
      payment_method: order.paymentMethod,
      status: order.status || 'Pending',
      transaction_id: order.transactionId || '',
      payment_verified: order.paymentVerified || false,
      payment_notes: order.paymentNotes || '',
      courier_name: order.courierName || '',
      tracking_id: order.trackingId || '',
      tracking_link: order.trackingLink || ''
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Supabase createOrder failed:", e);
    }

    // Always keep local copy as backup
    const orders = await this.getOrders();
    orders.unshift({
      ...order,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('nethras_orders', JSON.stringify(orders));
    return order;
  },

  async updateOrderStatus(orderId, status) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error("Supabase updateOrderStatus failed:", e);
    }

    const local = JSON.parse(localStorage.getItem('nethras_orders') || '[]');
    const target = local.find(o => o.id === orderId);
    if (target) {
      target.status = status;
      localStorage.setItem('nethras_orders', JSON.stringify(local));
    }
    return true;
  },

  async updateOrderPaymentAndCourier(orderId, updates) {
    const payload = {};
    if (updates.paymentVerified !== undefined) payload.payment_verified = updates.paymentVerified;
    if (updates.paymentNotes !== undefined) payload.payment_notes = updates.paymentNotes;
    if (updates.courierName !== undefined) payload.courier_name = updates.courierName;
    if (updates.trackingId !== undefined) payload.tracking_id = updates.trackingId;
    if (updates.trackingLink !== undefined) payload.tracking_link = updates.trackingLink;
    if (updates.status !== undefined) payload.status = updates.status;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Supabase updateOrderPaymentAndCourier failed:", e);
    }

    const local = JSON.parse(localStorage.getItem('nethras_orders') || '[]');
    const target = local.find(o => o.id === orderId);
    if (target) {
      Object.assign(target, updates);
      localStorage.setItem('nethras_orders', JSON.stringify(local));
    }
    return true;
  },

  async deleteOrder(orderId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.error("Supabase deleteOrder failed:", e);
    }

    let orders = JSON.parse(localStorage.getItem('nethras_orders') || '[]');
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem('nethras_orders', JSON.stringify(orders));
    return true;
  },

  // --- ENQUIRIES ---
  async getEnquiries() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/enquiries?select=*&order=created_at.desc`, { headers });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('nethras_enquiries', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Supabase enquiries fetch failed:", e);
    }

    const local = localStorage.getItem('nethras_enquiries');
    return local ? JSON.parse(local) : [];
  },

  async createEnquiry(enquiry) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/enquiries`, {
        method: 'POST',
        headers,
        body: JSON.stringify(enquiry)
      });
    } catch (e) {
      console.error("Supabase createEnquiry failed:", e);
    }

    const enquiries = await this.getEnquiries();
    enquiries.unshift({ ...enquiry, created_at: new Date().toISOString() });
    localStorage.setItem('nethras_enquiries', JSON.stringify(enquiries));
  },

  // --- PAYMENT SETTINGS (UPI QR CODE) ---
  async getPaymentSettings() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_settings?id=eq.1`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const s = data[0];
          const settings = {
            upiEnabled: s.upi_enabled !== false,
            upiId: s.upi_id || '9629427700@upi',
            upiQrImage: s.upi_qr_image || 'logo.png',
            merchantName: s.merchant_name || "Nethra's Mehandi & Accessories",
            codEnabled: s.cod_enabled !== false
          };
          localStorage.setItem('nethras_payment_settings', JSON.stringify(settings));
          return settings;
        }
      }
    } catch (e) {
      console.warn("Supabase getPaymentSettings failed:", e);
    }

    const local = localStorage.getItem('nethras_payment_settings');
    return local ? JSON.parse(local) : {
      upiEnabled: true,
      upiId: '9629427700@upi',
      upiQrImage: 'logo.png',
      merchantName: "Nethra's Mehandi & Accessories",
      codEnabled: true
    };
  },

  async savePaymentSettings(settings) {
    const payload = {
      upi_enabled: settings.upiEnabled,
      upi_id: settings.upiId,
      upi_qr_image: settings.upiQrImage,
      merchant_name: settings.merchantName,
      cod_enabled: settings.codEnabled,
      updated_at: new Date().toISOString()
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/payment_settings?id=eq.1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Supabase savePaymentSettings failed:", e);
    }

    localStorage.setItem('nethras_payment_settings', JSON.stringify(settings));
    return settings;
  },

  // --- EMAIL & SMTP SETTINGS ---
  async getEmailSettings() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/email_settings?id=eq.1`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const s = data[0];
          const settings = {
            smtpHost: s.smtp_host || 'smtp.gmail.com',
            smtpPort: parseInt(s.smtp_port || 587),
            smtpUsername: s.smtp_username || '',
            smtpPassword: s.smtp_password || '',
            senderEmail: s.sender_email || 'nethras0504@gmail.com',
            receiverEmail: s.receiver_email || 'nethras0504@gmail.com'
          };
          localStorage.setItem('nethras_email_settings', JSON.stringify(settings));
          return settings;
        }
      }
    } catch (e) {
      console.warn("Supabase getEmailSettings failed:", e);
    }

    const local = localStorage.getItem('nethras_email_settings');
    return local ? JSON.parse(local) : {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      senderEmail: 'nethras0504@gmail.com',
      receiverEmail: 'nethras0504@gmail.com'
    };
  },

  async saveEmailSettings(settings) {
    const payload = {
      smtp_host: settings.smtpHost,
      smtp_port: parseInt(settings.smtpPort),
      smtp_username: settings.smtpUsername,
      smtp_password: settings.smtpPassword,
      sender_email: settings.senderEmail,
      receiver_email: settings.receiverEmail,
      updated_at: new Date().toISOString()
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/email_settings?id=eq.1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Supabase saveEmailSettings failed:", e);
    }

    localStorage.setItem('nethras_email_settings', JSON.stringify(settings));
    return settings;
  },

  // --- USER AUTHENTICATION & CUSTOMER DATA ---
  async registerUser(userData) {
    const payload = {
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone,
      password: userData.password
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const result = await response.json();
        const user = result[0];
        localStorage.setItem('nethras_user', JSON.stringify(user));
        return { success: true, user };
      } else {
        const err = await response.json();
        if (err.message && err.message.includes('unique')) {
          return { success: false, error: 'Email is already registered! Please login.' };
        }
      }
    } catch (e) {
      console.warn("Supabase registerUser failed, using fallback:", e);
    }

    // Local fallback
    let users = JSON.parse(localStorage.getItem('nethras_users') || '[]');
    if (users.some(u => u.email === payload.email)) {
      return { success: false, error: 'Email is already registered!' };
    }
    const newUser = { ...payload, id: users.length + 1, created_at: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('nethras_users', JSON.stringify(users));
    localStorage.setItem('nethras_user', JSON.stringify(newUser));
    return { success: true, user: newUser };
  },

  async loginUser(email, password) {
    const targetEmail = email.toLowerCase().trim();
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(targetEmail)}&password=eq.${encodeURIComponent(password)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const user = data[0];
          localStorage.setItem('nethras_user', JSON.stringify(user));
          return { success: true, user };
        }
      }
    } catch (e) {
      console.warn("Supabase loginUser failed, checking fallback:", e);
    }

    // Local fallback
    let users = JSON.parse(localStorage.getItem('nethras_users') || '[]');
    const matched = users.find(u => u.email === targetEmail && u.password === password);
    if (matched) {
      localStorage.setItem('nethras_user', JSON.stringify(matched));
      return { success: true, user: matched };
    }
    return { success: false, error: 'Invalid email or password.' };
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('nethras_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  logoutUser() {
    localStorage.removeItem('nethras_user');
  },

  async getUserLikes(userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_likes?user_id=eq.${userId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        return data.map(item => item.product_id);
      }
    } catch (e) {
      console.warn("Supabase getUserLikes failed:", e);
    }
    return JSON.parse(localStorage.getItem(`nethras_likes_${userId}`) || '[]');
  },

  async toggleUserLike(userId, productId) {
    const likes = await this.getUserLikes(userId);
    const exists = likes.includes(productId);
    
    if (exists) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/user_likes?user_id=eq.${userId}&product_id=eq.${productId}`, {
          method: 'DELETE',
          headers
        });
      } catch (e) {}
      const updated = likes.filter(id => id !== productId);
      localStorage.setItem(`nethras_likes_${userId}`, JSON.stringify(updated));
      return false;
    } else {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/user_likes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_id: userId, product_id: productId })
        });
      } catch (e) {}
      likes.push(productId);
      localStorage.setItem(`nethras_likes_${userId}`, JSON.stringify(likes));
      return true;
    }
  },

  async getUsersWithDetails() {
    let users = [];
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, { headers });
      if (response.ok) {
        users = await response.json();
      }
    } catch (e) {
      console.warn("Supabase getUsers failed:", e);
    }

    if (users.length === 0) {
      users = JSON.parse(localStorage.getItem('nethras_users') || '[]');
    }

    const allOrders = await this.getOrders();

    const usersDetailed = await Promise.all(users.map(async u => {
      const userOrders = allOrders.filter(o => o.email.toLowerCase() === u.email.toLowerCase() || o.phone === u.phone);
      const userLikes = await this.getUserLikes(u.id);
      return {
        ...u,
        ordersCount: userOrders.length,
        totalSpent: userOrders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.total : 0), 0),
        orders: userOrders,
        likedProductIds: userLikes
      };
    }));

    return usersDetailed;
  },

  async deleteUser(userId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.error("Supabase deleteUser failed:", e);
    }

    let users = JSON.parse(localStorage.getItem('nethras_users') || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('nethras_users', JSON.stringify(users));
    return true;
  },

  // --- DYNAMIC CATEGORIES ---
  async getCategories() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=*&order=id.asc`, { headers });
      if (response.ok) {
        const data = await response.json();
        const names = data.map(c => c.name);
        localStorage.setItem('nethras_categories', JSON.stringify(names));
        return names;
      }
    } catch (e) {
      console.warn("Supabase getCategories failed:", e);
    }

    const local = localStorage.getItem('nethras_categories');
    return local ? JSON.parse(local) : [
      "Mehandi Stencils",
      "Earrings",
      "Necklaces",
      "Bangles",
      "Korean Accessories",
      "Hair Accessories"
    ];
  },

  async addCategory(name) {
    const categoryName = name.trim();
    if (!categoryName) return;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: categoryName })
      });
    } catch (e) {
      console.error("Supabase addCategory failed:", e);
    }

    const categories = await this.getCategories();
    if (!categories.includes(categoryName)) {
      categories.push(categoryName);
      localStorage.setItem('nethras_categories', JSON.stringify(categories));
    }
    return categories;
  },

  // --- SITE CONTENT CMS ---
  async getSiteContent() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/site_content?id=eq.1`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const s = data[0];
          const content = {
            heroTitle: s.hero_title,
            heroSubtitle: s.hero_subtitle,
            heroImage: s.hero_image,
            stencilBanner: s.stencil_banner,
            accBanner: s.acc_banner,
            aboutBanner: s.about_banner,
            aboutStory: s.about_story,
            aboutCraftImage: s.about_craft_image,
            contactPhone1: s.contact_phone1,
            contactPhone2: s.contact_phone2,
            contactEmail: s.contact_email,
            contactAddress: s.contact_address,
            shopTitle: s.shop_title,
            shopSubtitle: s.shop_subtitle,
            shopBanner: s.shop_banner,
            instaStencils: s.insta_stencils,
            instaAcc: s.insta_acc,
            footerDesc: s.footer_desc
          };
          localStorage.setItem('nethras_site_content', JSON.stringify(content));
          return content;
        }
      }
    } catch (e) {
      console.warn("Supabase getSiteContent failed:", e);
    }

    const local = localStorage.getItem('nethras_site_content');
    return local ? JSON.parse(local) : {
      heroTitle: 'Artistry in Every Stencil, Elegance in Every Accessory',
      heroSubtitle: 'Discover handcrafted Mehandi stencils & premium Indian fashion jewelry designed to elevate your unique style.',
      heroImage: 'hero_banner.png',
      stencilBanner: 'stencil_collection.png',
      accBanner: 'acc_collection.png',
      aboutBanner: 'about_banner.png',
      aboutStory: 'At Nethras, we believe that beauty lies in intricate details. Started as a passionate artisan venture in Coimbatore, Tamil Nadu, Nethras has grown into a cherished brand known for premium re-usable Mehandi stencils and authentic handcrafted fashion accessories.',
      aboutCraftImage: 'stencil_broad.png',
      contactPhone1: '+91 96294 27700',
      contactPhone2: '+91 98779 61132',
      contactEmail: 'nethras0504@gmail.com',
      contactAddress: 'Coimbatore, Tamil Nadu, India',
      shopTitle: 'Explore Our Collection',
      shopSubtitle: 'Discover premium Mehandi stencils and handmade jewelry.',
      shopBanner: 'acc_collection.png',
      instaStencils: 'https://www.instagram.com/nethras_mehandi_stencils?igsh=MTgycGwyanl6Zjlwdw==',
      instaAcc: 'https://www.instagram.com/nethras_accessories?igsh=MThvMHRhaW4weG9xNw==',
      footerDesc: 'Nethra\'s brings you premium Mehandi stencils and handmade accessories that add beauty to every moment. Crafted with love, designed to wow.'
    };
  },

  async saveSiteContent(content) {
    const payload = {
      hero_title: content.heroTitle,
      hero_subtitle: content.heroSubtitle,
      hero_image: content.heroImage,
      stencil_banner: content.stencilBanner,
      acc_banner: content.accBanner,
      about_banner: content.aboutBanner,
      about_story: content.aboutStory,
      about_craft_image: content.aboutCraftImage,
      contact_phone1: content.contactPhone1,
      contact_phone2: content.contactPhone2,
      contact_email: content.contactEmail,
      contact_address: content.contactAddress,
      shop_title: content.shopTitle,
      shop_subtitle: content.shopSubtitle,
      shop_banner: content.shopBanner,
      insta_stencils: content.instaStencils,
      insta_acc: content.instaAcc,
      footer_desc: content.footerDesc,
      updated_at: new Date().toISOString()
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/site_content?id=eq.1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Supabase saveSiteContent failed:", e);
    }

    localStorage.setItem('nethras_site_content', JSON.stringify(content));
    return content;
  },

  // --- PORTFOLIO GALLERY ---
  async getPortfolio() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/portfolio?select=*&order=id.asc`, { headers });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('nethras_portfolio', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Supabase getPortfolio failed:", e);
    }

    const local = localStorage.getItem('nethras_portfolio');
    return local ? JSON.parse(local) : [
      { id: 1, title: 'Bridal Full Hand Stencil Design', category: 'Mehandi Stencils', image: 'stencil_broad.png', description: 'Royal bridal full hand mehandi stencil design.' },
      { id: 2, title: 'Mandala Palm Stencil Collection', category: 'Mehandi Stencils', image: 'stencil_floral.png', description: 'Intricate mandala palm pattern stencil.' },
      { id: 3, title: 'Royal Kundan Jhumka Showcase', category: 'Earrings', image: 'kundan_earrings.png', description: 'Handcrafted royal Kundan jhumka.' },
      { id: 4, title: 'Classic Velvet Pearl Choker Set', category: 'Necklaces', image: 'pearl_choker.png', description: 'Handmade velvet choker with lustrous pearls.' },
      { id: 5, title: 'Pastel Matte Hair Claw Clip Set', category: 'Hair Accessories', image: 'claw_clip.png', description: 'Trendy Korean style pastel matte hair claw clips.' },
      { id: 6, title: 'Handmade Brass Bangle Collection', category: 'Bangles', image: 'traditional_bangles.png', description: 'Traditional handcrafted temple design brass bangles.' },
      { id: 7, title: 'Crystal Pendant Necklace', category: 'Necklaces', image: 'crystal_necklace.png', description: 'Sparkling handcrafted crystal pendant necklace.' },
      { id: 8, title: 'Traditional Gold Jhumka Earrings', category: 'Earrings', image: 'jhumka_earrings.png', description: 'Classic Indian ethnic gold plated jhumka earrings.' }
    ];
  },

  async addPortfolioItem(item) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/portfolio`, {
        method: 'POST',
        headers,
        body: JSON.stringify(item)
      });
    } catch (e) {
      console.error("Supabase addPortfolioItem failed:", e);
    }

    const portfolio = await this.getPortfolio();
    portfolio.push({ ...item, id: portfolio.length + 1 });
    localStorage.setItem('nethras_portfolio', JSON.stringify(portfolio));
    return portfolio;
  },

  async deletePortfolioItem(id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/portfolio?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.error("Supabase deletePortfolioItem failed:", e);
    }

    let portfolio = JSON.parse(localStorage.getItem('nethras_portfolio') || '[]');
    portfolio = portfolio.filter(p => p.id !== id);
    localStorage.setItem('nethras_portfolio', JSON.stringify(portfolio));
    return true;
  }
};
