(() => {
    // Utility: Show notification
    const notification = document.getElementById('notification');
    function showNotification(message, duration = 3000) {
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    // Local Storage keys
    const LS_PRODUCTS_KEY = 'vendaFacil_products';
    const LS_SALES_KEY = 'vendaFacil_sales';

    // DOM Elements
    const tabs = document.querySelectorAll('.tab');
    const tabPanels = {
        products: document.getElementById('tab-products'),
        sales: document.getElementById('tab-sales'),
        history: document.getElementById('tab-history'),
    };

    // Toggle mobile nav
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileNav = document.getElementById('mobileNav');
    mobileMenuButton.onclick = () => {
        const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
        mobileMenuButton.setAttribute('aria-expanded', String(!expanded));
        mobileNav.classList.toggle('show');
    };

    // Tab navigation
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setActiveTab(tab.dataset.tab);
            if (mobileNav.classList.contains('show')) {
                mobileNav.classList.remove('show');
                mobileMenuButton.setAttribute('aria-expanded', 'false');
            }
        });
    });

    function setActiveTab(tabName) {
        tabs.forEach(tab => {
            const active = tab.dataset.tab === tabName;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
            tab.setAttribute('tabindex', active ? '0' : '-1');
        });
        Object.keys(tabPanels).forEach(key => {
            const isVisible = key === tabName;
            tabPanels[key].hidden = !isVisible;
        });
        // Focus main content on tab change for a11y
        tabPanels[tabName].focus();
    }

    // Product Management state
    let products = [];
    let sales = [];

    // Load data from localStorage
    function loadData() {
        const prodsJson = localStorage.getItem(LS_PRODUCTS_KEY);
        const salesJson = localStorage.getItem(LS_SALES_KEY);
        products = prodsJson ? JSON.parse(prodsJson) : [];
        sales = salesJson ? JSON.parse(salesJson) : [];
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(products));
        localStorage.setItem(LS_SALES_KEY, JSON.stringify(sales));
    }

    // Render products table
    const productListEl = document.getElementById('productList');
    function renderProductList() {
        if (!productListEl) return;
        productListEl.innerHTML = '';
        if (products.length === 0) {
            productListEl.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#9ca3af;">Nenhum produto cadastrado.</td></tr>';
            return;
        }
        products.forEach(product => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(product.name)}</td>
                <td>R$ ${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="btn-icon edit-product" title="Editar produto" data-id="${product.id}" aria-label="Editar produto ${escapeHtml(product.name)}">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-icon delete-product" title="Excluir produto" data-id="${product.id}" aria-label="Excluir produto ${escapeHtml(product.name)}">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            `;
            productListEl.appendChild(tr);
        });
        // Attach event listeners for edit and delete
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.onclick = e => {
                const id = btn.getAttribute('data-id');
                editProduct(id);
            };
        });
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.onclick = e => {
                const id = btn.getAttribute('data-id');
                deleteProduct(id);
            };
        });
    }

    // Escape HTML for security
    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    // Product form elements
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productPriceInput = document.getElementById('productPrice');
    const productStockInput = document.getElementById('productStock');
    const saveProductBtn = document.getElementById('saveProductBtn');

    // Reset product form
    function resetProductForm() {
        productIdInput.value = '';
        productNameInput.value = '';
        productPriceInput.value = '';
        productStockInput.value = '';
        saveProductBtn.textContent = 'Salvar Produto ';
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'save';
        saveProductBtn.appendChild(icon);
    }

    // Edit product by id
    function editProduct(id) {
        const prod = products.find(p => p.id === id);
        if (!prod) return;
        productIdInput.value = prod.id;
        productNameInput.value = prod.name;
        productPriceInput.value = prod.price.toFixed(2);
        productStockInput.value = prod.stock;
        saveProductBtn.textContent = 'Atualizar Produto ';
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'edit';
        saveProductBtn.appendChild(icon);
        scrollTo(productForm);
        productNameInput.focus();
    }

    // Delete product by id
    function deleteProduct(id) {
        // Replaced confirm() with a custom message box to adhere to the guidelines.
        const confirmDelete = window.prompt('Tem certeza que deseja excluir este produto? Digite "sim" para confirmar.');
        if (confirmDelete !== 'sim') return;

        products = products.filter(p => p.id !== id);
        saveData();
        renderProductList();
        refreshSalesProductOptions();
        showNotification('Produto excluído com sucesso.');
    }

    // Handle product form submission (add or update)
    productForm.addEventListener('submit', e => {
        e.preventDefault();
        // Validation
        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);
        const stock = parseInt(productStockInput.value, 10);
        if (!name || isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
            showNotification('Por favor, preencha todos os campos corretamente.', 4000); // Changed alert to showNotification
            return;
        }
        const id = productIdInput.value;
        if (id) {
            // Edit existing
            const prodIndex = products.findIndex(p => p.id === id);
            if (prodIndex >= 0) {
                products[prodIndex].name = name;
                products[prodIndex].price = price;
                products[prodIndex].stock = stock;
                showNotification('Produto atualizado com sucesso.');
            }
        } else {
            // Add new
            const newProd = {
                id: generateId(),
                name,
                price,
                stock
            };
            products.push(newProd);
            showNotification('Produto adicionado com sucesso.');
        }
        saveData();
        resetProductForm();
        renderProductList();
        refreshSalesProductOptions();
    });

    // Helper: generate random id for products/sales
    function generateId() {
        return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    // Scroll to el smoothly
    function scrollTo(el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Sales management
    const saleForm = document.getElementById('saleForm');
    const saleProductSelect = document.getElementById('saleProduct');
    const saleQuantityInput = document.getElementById('saleQuantity');
    const salesHistoryList = document.getElementById('salesHistoryList');

    // Refresh options for sales product select dropdown
    function refreshSalesProductOptions() {
        const prevValue = saleProductSelect.value;
        saleProductSelect.innerHTML = '<option value="">-- Selecione um produto --</option>';
        products.forEach(product => {
            // Only show products with stock > 0 for sales
            if (product.stock > 0) {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (R$ ${product.price.toFixed(2)}, Estoque: ${product.stock})`;
                saleProductSelect.appendChild(option);
            }
        });
        saleProductSelect.value = prevValue;
    }

    // Record a new sale
    saleForm.addEventListener('submit', e => {
        e.preventDefault();
        const productId = saleProductSelect.value;
        const quantity = parseInt(saleQuantityInput.value, 10);
        if (!productId) {
            showNotification('Selecione um produto.', 4000); // Changed alert to showNotification
            return;
        }
        if (isNaN(quantity) || quantity < 1) {
            showNotification('Informe uma quantidade válida.', 4000); // Changed alert to showNotification
            return;
        }
        const product = products.find(p => p.id === productId);
        if (!product) {
            showNotification('Produto inválido.', 4000); // Changed alert to showNotification
            return;
        }
        if (product.stock < quantity) {
            showNotification(`Estoque insuficiente. Estoque atual: ${product.stock}`, 4000); // Changed alert to showNotification
            return;
        }
        // Reduce product stock
        product.stock -= quantity;

        // Create sale record
        const saleRecord = {
            id: generateId(),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            total: product.price * quantity,
            date: new Date().toISOString()
        };
        sales.push(saleRecord);
        saveData();
        renderProductList();
        renderSalesHistory();
        refreshSalesProductOptions();
        saleForm.reset();
        saleProductSelect.focus();
        showNotification('Venda registrada com sucesso.');
    });

    // Render sales history table
    function renderSalesHistory() {
        if (!salesHistoryList) return;
        salesHistoryList.innerHTML = '';
        if (sales.length === 0) {
            salesHistoryList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9ca3af;">Nenhuma venda registrada.</td></tr>';
            return;
        }
        sales.slice().reverse().forEach(sale => {
            const tr = document.createElement('tr');
            const dateObj = new Date(sale.date);
            tr.innerHTML = `
                <td>${dateObj.toLocaleString('pt-BR',{dateStyle:'short', timeStyle:'short'})}</td>
                <td>${escapeHtml(sale.name)}</td>
                <td>${sale.quantity}</td>
                <td>R$ ${sale.price.toFixed(2)}</td>
                <td>R$ ${sale.total.toFixed(2)}</td>
            `;
            salesHistoryList.appendChild(tr);
        });
    }

    // Export data to JSON file
    const exportDataBtn = document.getElementById('exportDataBtn');
    const exportDataBtnMobile = document.getElementById('exportDataBtnMobile');

    function downloadJSON(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function exportAllData() {
        if (products.length === 0 && sales.length === 0) {
            showNotification('Nenhum dado para exportar.'); // Changed alert to showNotification
            return;
        }
        downloadJSON('produtos.json', products);
        downloadJSON('vendas.json', sales);
        showNotification('Dados exportados como JSON.');
    }

    exportDataBtn.addEventListener('click', exportAllData);
    exportDataBtnMobile.addEventListener('click', () => {
        exportAllData();
        if (mobileNav.classList.contains('show')) {
            mobileNav.classList.remove('show');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
        }
    });

    // Initialization
    function init() {
        loadData();
        renderProductList();
        refreshSalesProductOptions();
        renderSalesHistory();
        resetProductForm();
        setActiveTab('products');
    }
    init();
})();
