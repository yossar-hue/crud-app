// ===== CONFIGURACIÓN GLOBAL =====
const config = {
    apiUrl: '/api/products',
    itemsPerPage: 10,
    currentPage: 1,
    totalPages: 1
};

// ===== ESTADO GLOBAL =====
let products = [];
let editingProductId = null;
let pendingAction = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    try {
        // Configurar eventos
        setupEventListeners();
        
        // Cargar productos iniciales
        await loadProducts();
        
        // Actualizar estadísticas
        updateStatistics();
        
        // Configurar animaciones
        setupAnimations();
        
        // Efecto de carga inicial
        setTimeout(() => {
            const pageTransition = document.querySelector('.page-transition');
            if (pageTransition) {
                pageTransition.style.opacity = '0';
            }
        }, 1500);
        
        // Inicializar tooltips
        initializeBootstrapComponents();
        
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        showToast('Error al inicializar la aplicación', 'error');
    }
}

// ===== CONFIGURACIÓN DE EVENTOS =====
function setupEventListeners() {
    // Botón guardar producto
    const saveBtn = document.getElementById('saveProductBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProduct);
    }
    
    // Validación en tiempo real del formulario
    setupFormValidation();
    
    // Buscador
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Botón de búsqueda
    const searchBtn = document.querySelector('.btn-outline-negro');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                handleSearch({ target: searchInput });
            }
        });
    }
    
    // Botón de confirmación
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', executePendingAction);
    }
    
    // Scroll del navbar
    window.addEventListener('scroll', handleScroll);
    
    // Eventos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            if (modal) modal.hide();
        }
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            const saveBtn = document.getElementById('saveProductBtn');
            if (saveBtn) saveProduct();
        }
    });
    
    // Contador de caracteres para descripción
    const descriptionInput = document.getElementById('productDescription');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', updateCharCount);
    }
}

function setupAnimations() {
    // Animación de entrada para las tarjetas
    const cards = document.querySelectorAll('.summary-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Efecto hover para botones
    const buttons = document.querySelectorAll('.btn-rojo-gradiente');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-3px)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
        });
    });
}

// ===== VALIDACIÓN DEL FORMULARIO =====
function setupFormValidation() {
    const form = document.getElementById('productForm');
    if (!form) return;
    
    // Validación en tiempo real
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
        });
    });
    
    // Prevenir el envío automático del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
}

function validateField(event) {
    const field = event.target;
    
    // Solo validar si el campo es requerido
    if (field.hasAttribute('required')) {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            return false;
        }
        
        // Validaciones específicas
        if (field.id === 'productName' && field.value.trim().length < 3) {
            field.classList.add('is-invalid');
            return false;
        }
        
        if (field.id === 'productPrice') {
            const value = parseFloat(field.value);
            if (isNaN(value) || value <= 0) {
                field.classList.add('is-invalid');
                return false;
            }
        }
        
        if (field.id === 'productStock') {
            const value = parseInt(field.value);
            if (isNaN(value) || value < 0) {
                field.classList.add('is-invalid');
                return false;
            }
        }
    }
    
    field.classList.remove('is-invalid');
    return true;
}

function updateCharCount() {
    const descriptionInput = document.getElementById('productDescription');
    const charCount = document.getElementById('charCount');
    
    if (descriptionInput && charCount) {
        const currentLength = descriptionInput.value.length;
        charCount.textContent = currentLength;
        
        if (currentLength > 500) {
            charCount.classList.add('text-danger');
        } else {
            charCount.classList.remove('text-danger');
        }
    }
}

// ===== FUNCIONES PRINCIPALES =====
async function loadProducts() {
    try {
        showLoading(true);
        
        const response = await fetch(config.apiUrl);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        products = await response.json();
        renderProducts();
        updatePagination();
        updateStatistics();
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        showToast('Error al cargar los productos', 'error');
        renderError();
    } finally {
        showLoading(false);
    }
}

function renderProducts() {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No hay productos registrados</h5>
                        <p class="text-muted">Comienza agregando tu primer producto</p>
                        <button class="btn btn-rojo-gradiente mt-3" onclick="openProductModal()">
                            <i class="fas fa-plus-circle me-2"></i>
                            Agregar Producto
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Calcular índices para paginación
    const startIndex = (config.currentPage - 1) * config.itemsPerPage;
    const endIndex = startIndex + config.itemsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedProducts.map(product => `
        <tr class="product-row" data-id="${product.id}">
            <td>
                <span class="product-id">#${product.id}</span>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="product-avatar me-3">
                        <i class="fas fa-cube"></i>
                    </div>
                    <div>
                        <h6 class="product-name mb-1">${escapeHtml(product.name)}</h6>
                        <small class="text-muted">${escapeHtml(product.description || 'Sin descripción')}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge-category">${escapeHtml(product.category)}</span>
            </td>
            <td>
                <span class="product-price">$${product.price.toFixed(2)}</span>
            </td>
            <td>
                <span class="stock-badge ${getStockClass(product.stock)}">
                    ${product.stock} unidades
                </span>
            </td>
            <td>
                <small class="text-muted">
                    ${formatDate(product.createdAt)}
                </small>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${product.id})" 
                            data-bs-toggle="tooltip" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete(${product.id})"
                            data-bs-toggle="tooltip" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-dark" onclick="viewProduct(${product.id})"
                            data-bs-toggle="tooltip" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Actualizar información de la tabla
    updateTableInfo();
    
    // Actualizar estadísticas en el sidebar
    updateSidebarStats();
}

function getStockClass(stock) {
    if (stock === 0) return 'stock-low';
    if (stock < 10) return 'stock-medium';
    return 'stock-high';
}

// ===== GESTIÓN DE PRODUCTOS =====
function openProductModal(product = null) {
    const modalElement = document.getElementById('productModal');
    if (!modalElement) {
        console.error('Modal element not found');
        return;
    }
    
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    
    // Resetear el formulario primero
    if (form) {
        form.reset();
        // Remover clases de validación
        const inputs = form.querySelectorAll('.is-invalid');
        inputs.forEach(input => input.classList.remove('is-invalid'));
    }
    
    if (product) {
        // Modo edición
        modalTitle.innerHTML = `<i class="fas fa-edit me-2"></i>Editar Producto`;
        editingProductId = product.id;
        
        // Llenar campos con datos del producto
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productStock').value = product.stock;
        
        // Actualizar contador de caracteres
        updateCharCount();
    } else {
        // Modo creación
        modalTitle.innerHTML = `<i class="fas fa-plus-circle me-2"></i>Nuevo Producto`;
        editingProductId = null;
        
        // Resetear el ID oculto
        const productIdInput = document.getElementById('productId');
        if (productIdInput) {
            productIdInput.value = '';
        }
        
        // Actualizar contador de caracteres
        updateCharCount();
    }
    
    modal.show();
    
    // Enfocar el primer campo después de que el modal se muestre
    setTimeout(() => {
        const nameInput = document.getElementById('productName');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 500);
}

// ===== VALIDACIÓN MEJORADA =====
function validateForm(formData) {
    const name = formData.get('productName');
    const price = formData.get('productPrice');
    const category = formData.get('productCategory');
    const stock = formData.get('productStock');
    const description = formData.get('productDescription');
    
    // Validar nombre
    if (!name || name.trim().length < 3) {
        return {
            isValid: false,
            message: 'El nombre debe tener al menos 3 caracteres',
            field: 'productName'
        };
    }
    
    // Validar precio
    if (!price || price.trim() === '') {
        return {
            isValid: false,
            message: 'El precio es requerido',
            field: 'productPrice'
        };
    }
    
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
        return {
            isValid: false,
            message: 'El precio debe ser un número mayor a 0',
            field: 'productPrice'
        };
    }
    
    // Validar categoría
    if (!category) {
        return {
            isValid: false,
            message: 'Seleccione una categoría',
            field: 'productCategory'
        };
    }
    
    // Validar stock
    if (!stock || stock.trim() === '') {
        return {
            isValid: false,
            message: 'El stock es requerido',
            field: 'productStock'
        };
    }
    
    const stockValue = parseInt(stock);
    if (isNaN(stockValue) || stockValue < 0) {
        return {
            isValid: false,
            message: 'El stock debe ser un número entero no negativo',
            field: 'productStock'
        };
    }
    
    // Validar descripción (opcional pero con límite)
    if (description && description.length > 500) {
        return {
            isValid: false,
            message: 'La descripción no puede exceder los 500 caracteres',
            field: 'productDescription'
        };
    }
    
    return {
        isValid: true,
        message: 'Formulario válido'
    };
}

// ===== FUNCIÓN GUARDAR PRODUCTO =====
async function saveProduct() {
    const form = document.getElementById('productForm');
    if (!form) return;
    
    const formData = new FormData(form);
    
    // Validación ANTES de procesar
    const validationResult = validateForm(formData);
    if (!validationResult.isValid) {
        showToast(validationResult.message, 'warning');
        return;
    }
    
    const productData = {
        name: formData.get('productName'),
        description: formData.get('productDescription'),
        price: parseFloat(formData.get('productPrice')),
        category: formData.get('productCategory'),
        stock: parseInt(formData.get('productStock'))
    };
    
    try {
        showLoading(true);
        
        let url = config.apiUrl;
        let method = 'POST';
        
        if (editingProductId) {
            url = `${config.apiUrl}/${editingProductId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar el producto');
        }
        
        const savedProduct = await response.json();
        
        // Cerrar modal
        const modalElement = document.getElementById('productModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        // Recargar productos
        await loadProducts();
        
        // Mostrar mensaje de éxito
        const message = editingProductId 
            ? '✅ Producto actualizado correctamente' 
            : '✅ Producto creado correctamente';
        
        showToast(message, 'success');
        
        // Efecto visual
        if (editingProductId) {
            highlightProduct(savedProduct.id);
        }
        
        // Resetear estado de edición
        editingProductId = null;
        
    } catch (error) {
        console.error('Error al guardar producto:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function editProduct(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Producto no encontrado');
        
        const product = await response.json();
        openProductModal(product);
        
    } catch (error) {
        console.error('Error al cargar producto:', error);
        showToast('❌ Error al cargar el producto', 'error');
    } finally {
        showLoading(false);
    }
}

function confirmDelete(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmDetails = document.getElementById('confirmDetails');
    
    if (confirmMessage) {
        confirmMessage.textContent = 
            `¿Está seguro de eliminar el producto "${product.name}"?`;
    }
    
    if (confirmDetails) {
        confirmDetails.textContent = 
            'Esta acción no se puede deshacer y se eliminarán todos los datos asociados.';
    }
    
    pendingAction = {
        type: 'delete',
        id: id,
        product: product
    };
    
    const modalElement = document.getElementById('confirmModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

async function deleteProduct(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${config.apiUrl}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar');
        }
        
        // Remover de la lista local
        products = products.filter(p => p.id !== id);
        
        // Re-renderizar
        renderProducts();
        updateStatistics();
        
        showToast('Producto eliminado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function viewProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        showToast(`Vista detallada de: ${product.name}`, 'info');
    }
}

// ===== PAGINACIÓN =====
function updatePagination() {
    config.totalPages = Math.ceil(products.length / config.itemsPerPage);
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    if (config.totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botón anterior
    html += `
        <li class="page-item ${config.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${config.currentPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Números de página
    for (let i = 1; i <= config.totalPages; i++) {
        if (i === 1 || i === config.totalPages || 
            (i >= config.currentPage - 1 && i <= config.currentPage + 1)) {
            html += `
                <li class="page-item ${i === config.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === config.currentPage - 2 || i === config.currentPage + 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Botón siguiente
    html += `
        <li class="page-item ${config.currentPage === config.totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${config.currentPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > config.totalPages || page === config.currentPage) return;
    
    config.currentPage = page;
    renderProducts();
    
    // Scroll suave hacia la tabla
    const mainCard = document.querySelector('.main-card');
    if (mainCard) {
        mainCard.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ===== BÚSQUEDA =====
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderProducts();
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.id.toString().includes(searchTerm)
    );
    
    // Renderizar productos filtrados
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    
    if (filteredProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No se encontraron productos</h5>
                        <p class="text-muted">No hay productos que coincidan con "${searchTerm}"</p>
                        <button class="btn btn-rojo-gradiente mt-3" onclick="document.getElementById('searchInput').value=''; renderProducts();">
                            <i class="fas fa-times me-2"></i>
                            Limpiar búsqueda
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredProducts.map(product => `
        <tr class="product-row" data-id="${product.id}">
            <td>#${product.id}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="product-avatar me-3">
                        <i class="fas fa-cube"></i>
                    </div>
                    <div>
                        <h6 class="product-name mb-1">${highlightText(product.name, searchTerm)}</h6>
                        <small class="text-muted">${escapeHtml(product.description || 'Sin descripción')}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge-category">${escapeHtml(product.category)}</span>
            </td>
            <td>$${product.price.toFixed(2)}</td>
            <td>
                <span class="stock-badge ${getStockClass(product.stock)}">
                    ${product.stock} unidades
                </span>
            </td>
            <td>
                <small class="text-muted">
                    ${formatDate(product.createdAt)}
                </small>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-dark" onclick="viewProduct(${product.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateTableInfo(filteredProducts.length);
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return escapeHtml(text);
    
    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return escapedText.replace(regex, '<span class="rojo-text fw-bold">$1</span>');
}

// ===== ESTADÍSTICAS =====
function updateStatistics() {
    if (!products.length) {
        resetStatistics();
        return;
    }
    
    // Total productos
    updateElementText('totalProducts', products.length);
    updateElementText('sidebarProductCount', products.length);
    updateElementText('cardTotalProducts', products.length);
    
    // Total stock
    const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
    updateElementText('totalStock', totalStock);
    updateElementText('cardTotalStock', totalStock.toLocaleString());
    
    // Valor total
    const totalValue = products.reduce((sum, product) => sum + (product.price * (product.stock || 0)), 0);
    updateElementText('cardTotalValue', `$${totalValue.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`);
    
    // Categorías únicas
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    updateElementText('cardCategories', uniqueCategories.length);
}

function updateSidebarStats() {
    if (!products.length) {
        updateElementText('sidebarProductCount', '0');
        return;
    }
    updateElementText('sidebarProductCount', products.length);
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function resetStatistics() {
    updateElementText('totalProducts', '0');
    updateElementText('sidebarProductCount', '0');
    updateElementText('cardTotalProducts', '0');
    updateElementText('totalStock', '0');
    updateElementText('cardTotalStock', '0');
    updateElementText('cardTotalValue', '$0');
    updateElementText('cardCategories', '0');
}

// ===== UTILIDADES =====
function showLoading(show) {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    
    if (show) {
        tbody.innerHTML = `
            <tr id="loadingRow">
                <td colspan="7" class="text-center py-5">
                    <div class="spinner-border rojo-text" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-3 text-gris">Cargando productos...</p>
                </td>
            </tr>
        `;
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toastId = `toast-${Date.now()}`;
    
    const typeIcons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const typeColors = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    };
    
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert">
            <div class="toast-header ${typeColors[type]} text-white">
                <i class="fas fa-${typeIcons[type]} me-2"></i>
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        delay: 5000
    });
    
    toast.show();
    
    // Remover del DOM después de ocultarse
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Fecha no disponible';
    }
}

function updateTableInfo(filteredCount = null) {
    const total = filteredCount !== null ? filteredCount : products.length;
    const startIndex = (config.currentPage - 1) * config.itemsPerPage + 1;
    const endIndex = Math.min(startIndex + config.itemsPerPage - 1, total);
    
    const tableInfo = document.getElementById('tableInfo');
    if (tableInfo) {
        if (total === 0) {
            tableInfo.textContent = 'No hay productos para mostrar';
        } else {
            tableInfo.textContent = `Mostrando ${startIndex}-${endIndex} de ${total} productos`;
        }
    }
}

function resetProductForm() {
    const form = document.getElementById('productForm');
    if (form) {
        form.reset();
        
        // Remover todas las clases de validación
        const inputs = form.querySelectorAll('.is-invalid');
        inputs.forEach(input => input.classList.remove('is-invalid'));
        
        // Resetear contador de caracteres
        const charCount = document.getElementById('charCount');
        if (charCount) {
            charCount.textContent = '0';
            charCount.classList.remove('text-danger');
        }
    }
    
    editingProductId = null;
    const productIdInput = document.getElementById('productId');
    if (productIdInput) {
        productIdInput.value = '';
    }
}

function renderError() {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-5">
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5 class="text-danger">Error al cargar los productos</h5>
                    <p class="text-muted">Intenta recargar la página o verifica tu conexión</p>
                    <button class="btn btn-rojo mt-3" onclick="loadProducts()">
                        <i class="fas fa-redo me-2"></i>
                        Reintentar
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function highlightProduct(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
        row.classList.add('highlighted');
        setTimeout(() => {
            row.classList.remove('highlighted');
        }, 2000);
    }
}

function handleScroll() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
}

function executePendingAction() {
    if (!pendingAction) return;
    
    const modalElement = document.getElementById('confirmModal');
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }
    
    switch (pendingAction.type) {
        case 'delete':
            deleteProduct(pendingAction.id);
            break;
    }
    
    pendingAction = null;
}

// ===== FUNCIONES DE SEGURIDAD =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== INICIALIZAR TOOLTIPS Y POPOVERS =====
function initializeBootstrapComponents() {
    // Tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach(popoverTriggerEl => {
        new bootstrap.Popover(popoverTriggerEl);
    });
}

// Hacer funciones disponibles globalmente
window.openProductModal = openProductModal;
window.editProduct = editProduct;
window.confirmDelete = confirmDelete;
window.viewProduct = viewProduct;
window.changePage = changePage;
window.loadProducts = loadProducts;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeBootstrapComponents);