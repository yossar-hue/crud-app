const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Helper para leer archivos HTML
const readHtmlFile = (filename) => {
    try {
        return fs.readFileSync(path.join(__dirname, 'views', filename), 'utf8');
    } catch (error) {
        console.error(`Error leyendo ${filename}:`, error);
        return '';
    }
};

// Ruta principal
app.get('/', (req, res) => {
    try {
        // Leer todas las partes
        const header = readHtmlFile('header.html');
        const indexContent = readHtmlFile('index.html');
        const footer = readHtmlFile('footer.html');
        
        // Construir la página completa
        const fullPage = `
            <!DOCTYPE html>
            <html lang="es">
            ${header}
            <body>
                <div class="app-container">
                    ${indexContent}
                    ${footer}
                </div>
            </body>
            </html>
        `;
        
        res.send(fullPage);
    } catch (error) {
        console.error('Error sirviendo página principal:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// API Routes
const dataFilePath = path.join(__dirname, 'data', 'products.json');

// Helper para leer productos
const readProducts = () => {
    try {
        if (!fs.existsSync(dataFilePath)) {
            return [];
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo productos:', error);
        return [];
    }
};

// Helper para guardar productos
const saveProducts = (products) => {
    try {
        const dir = path.dirname(dataFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(dataFilePath, JSON.stringify(products, null, 2));
        return true;
    } catch (error) {
        console.error('Error guardando productos:', error);
        return false;
    }
};

// GET todos los productos
app.get('/api/products', (req, res) => {
    try {
        const products = readProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error al leer productos' });
    }
});

// GET producto específico
app.get('/api/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const products = readProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error al leer producto' });
    }
});

// POST crear producto
app.post('/api/products', (req, res) => {
    try {
        const products = readProducts();
        
        const newProduct = {
            id: Date.now(),
            name: req.body.name,
            description: req.body.description || '',
            price: parseFloat(req.body.price),
            category: req.body.category,
            stock: parseInt(req.body.stock) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        products.push(newProduct);
        
        if (saveProducts(products)) {
            res.status(201).json(newProduct);
        } else {
            res.status(500).json({ error: 'Error al guardar producto' });
        }
    } catch (error) {
        console.error('Error en POST /api/products:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT actualizar producto
app.put('/api/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const products = readProducts();
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const updatedProduct = {
            ...products[productIndex],
            name: req.body.name || products[productIndex].name,
            description: req.body.description || products[productIndex].description,
            price: req.body.price ? parseFloat(req.body.price) : products[productIndex].price,
            category: req.body.category || products[productIndex].category,
            stock: req.body.stock ? parseInt(req.body.stock) : products[productIndex].stock,
            updatedAt: new Date().toISOString()
        };

        products[productIndex] = updatedProduct;
        
        if (saveProducts(products)) {
            res.json(updatedProduct);
        } else {
            res.status(500).json({ error: 'Error al actualizar producto' });
        }
    } catch (error) {
        console.error('Error en PUT /api/products/:id:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE eliminar producto
app.delete('/api/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const products = readProducts();
        const filteredProducts = products.filter(p => p.id !== productId);

        if (products.length === filteredProducts.length) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (saveProducts(filteredProducts)) {
            res.json({ 
                message: 'Producto eliminado correctamente', 
                id: productId 
            });
        } else {
            res.status(500).json({ error: 'Error al eliminar producto' });
        }
    } catch (error) {
        console.error('Error en DELETE /api/products/:id:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// Crear carpeta data si no existe
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Crear archivo products.json inicial si no existe
if (!fs.existsSync(dataFilePath)) {
    const initialProducts = [
        {
            id: 1,
            name: "Laptop Gamer",
            description: "Laptop de alta gama para gaming",
            price: 1299.99,
            category: "Electrónica",
            stock: 15,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 2,
            name: "Smartphone Pro",
            description: "Teléfono inteligente con cámara avanzada",
            price: 899.99,
            category: "Electrónica",
            stock: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 3,
            name: "Zapatos Deportivos",
            description: "Zapatos para running de alta calidad",
            price: 89.99,
            category: "Ropa",
            stock: 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    saveProducts(initialProducts);
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`SISTEMA Gestion corriendo en http://localhost:${PORT}`);
    console.log(`Archivo de datos: ${dataFilePath}`);
});