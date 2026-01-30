const PRODUCTS_API = 'https://api.escuelajs.co/api/v1/products';

// Biến toàn cục cho sản phẩm
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    LoadProducts();
});

function generateNewId(listData) {
    if (!listData || listData.length === 0) return "1";
    let maxId = Math.max(...listData.map(item => parseInt(item.id) || 0));
    return (maxId + 1).toString();
}

// ===== QUẢN LÝ SẢN PHẨM =====

async function LoadProducts() {
    try {
        console.log('Đang tải sản phẩm từ API...');
        const response = await fetch(PRODUCTS_API);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allProducts = await response.json();
        console.log('Tải thành công:', allProducts.length, 'sản phẩm');
        
        filteredProducts = [...allProducts];
        currentPage = 1;
        renderProductTable();
        updatePaginationButtons();
        
        // Thêm sự kiện tìm kiếm
        document.getElementById('search-input').addEventListener('input', onSearchChange);
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
        document.getElementById('products-grid').innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: red;">❌ Không thể tải dữ liệu. Vui lòng reload trang.</div>';
    }
}

function onSearchChange() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.title.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    renderProductTable();
    updatePaginationButtons();
}

function sortByPrice(order) {
    filteredProducts.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return order === 'asc' ? priceA - priceB : priceB - priceA;
    });
    
    currentPage = 1;
    renderProductTable();
    updatePaginationButtons();
}

function sortByName(order) {
    filteredProducts.sort((a, b) => {
        const nameA = (a.title || '').toLowerCase();
        const nameB = (b.title || '').toLowerCase();
        
        if (order === 'asc') {
            return nameA.localeCompare(nameB, 'vi');
        } else {
            return nameB.localeCompare(nameA, 'vi');
        }
    });
    
    currentPage = 1;
    renderProductTable();
    updatePaginationButtons();
}

function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('items-select').value);
    currentPage = 1;
    renderProductTable();
    updatePaginationButtons();
}

function renderProductTable() {
    const grid = document.getElementById('products-grid');
    const noDataDiv = document.getElementById('no-data');
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        noDataDiv.style.display = 'block';
        return;
    }
    
    noDataDiv.style.display = 'none';
    
    // Tính toán pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Tạo HTML cards
    const html = paginatedProducts.map(product => {
        // Xử lý image URL đúng cách từ API
        let imageUrl = 'https://via.placeholder.com/300x200?text=No+Image';
        
        try {
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                let img = product.images[0];
                if (typeof img === 'string') {
                    // Xóa dấu ngoặc, ngoặc kép, whitespace
                    img = img.replace(/[\[\]"']/g, '').trim();
                    if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
                        imageUrl = img;
                    }
                }
            }
        } catch (e) {
            console.warn('Lỗi xử lý image URL:', e);
        }
        
        return `
            <div class="product-card">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23f0f0f0' width='300' height='200'/%3E%3C/svg%3E" 
                     data-src="${imageUrl}" 
                     alt="${product.title}" 
                     class="product-card-image lazy-image" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="product-card-body">
                    <h5 class="product-card-title">${product.title || 'N/A'}</h5>
                    <span class="product-card-category">${product.category?.name || 'N/A'}</span>
                    <div class="product-card-price">$${(product.price || 0).toFixed(2)}</div>
                    <p class="product-card-description">${product.description || 'Không có mô tả'}</p>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = html;
    
    // Load hình ảnh lazy
    loadLazyImages();
    
    // Cập nhật thông tin pagination
    document.getElementById('pagination-info').textContent = 
        `Trang ${currentPage} / ${totalPages} (Tổng: ${filteredProducts.length} sản phẩm)`;
}

function loadLazyImages() {
    const images = document.querySelectorAll('.lazy-image');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy-image');
                    observer.unobserve(img);
                }
            });
        });
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback cho trình duyệt cũ
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

function updatePaginationButtons() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const buttonsContainer = document.getElementById('pagination-buttons');
    
    if (totalPages <= 1) {
        buttonsContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Nút "Trước"
    if (currentPage > 1) {
        html += `<button onclick="goToPage(${currentPage - 1})">← Trước</button>`;
    }
    
    // Nút trang
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 0 5px;">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="${activeClass}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 0 5px;">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Nút "Tiếp"
    if (currentPage < totalPages) {
        html += `<button onclick="goToPage(${currentPage + 1})">Tiếp →</button>`;
    }
    
    buttonsContainer.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderProductTable();
        updatePaginationButtons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}