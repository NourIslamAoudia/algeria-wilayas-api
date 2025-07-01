const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

class AlgeriaWilayasAPI {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.initializeData();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    initializeData() {
        try {
            this.wilayasCommunes = require('./algeria_wilayas_communes.json');
            this.wilayasDelivery = require('./wilayas-delivery.json').wilayas;
        } catch (error) {
            console.error('Error loading data files:', error.message);
            process.exit(1);
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.'
            }
        });
        this.app.use(limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // API documentation endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Algeria Wilayas & Communes API',
                version: '1.0.0',
                endpoints: {
                    'GET /wilayas': 'List all wilayas',
                    'GET /wilaya/:name': 'Get wilaya details with communes and delivery prices',
                    'GET /wilaya/:name/communes': 'Get communes for a specific wilaya',
                    'GET /wilaya/:name/delivery': 'Get delivery prices for a specific wilaya',
                    'GET /health': 'Health check'
                }
            });
        });

        // Get all wilayas
        this.app.get('/wilayas', this.getAllWilayas.bind(this));

        // Get specific wilaya with full details
        this.app.get('/wilaya/:name', this.getWilayaDetails.bind(this));

        // Get communes only for a specific wilaya
        this.app.get('/wilaya/:name/communes', this.getWilayaCommunes.bind(this));

        // Get delivery prices only for a specific wilaya
        this.app.get('/wilaya/:name/delivery', this.getWilayaDelivery.bind(this));
    }

    getAllWilayas(req, res) {
        try {
            const wilayasList = this.wilayasCommunes.map(w => ({
                code: w.wilaya_code,
                name: w.wilaya_name,
                communes_count: w.communes?.length || 0
            }));

            res.json({
                success: true,
                count: wilayasList.length,
                data: wilayasList
            });
        } catch (error) {
            this.handleError(res, error, 'Error fetching wilayas list');
        }
    }

    getWilayaDetails(req, res) {
        try {
            const wilayaName = this.normalizeString(req.params.name);
            
            const communesData = this.findWilayaInCommunes(wilayaName);
            const deliveryData = this.findWilayaInDelivery(wilayaName);

            if (!communesData) {
                return res.status(404).json({
                    success: false,
                    error: 'Wilaya not found',
                    available_wilayas: this.wilayasCommunes.map(w => w.wilaya_name)
                });
            }

            const response = {
                success: true,
                data: {
                    wilaya_name: communesData.wilaya_name,
                    wilaya_code: communesData.wilaya_code,
                    communes: communesData.communes || [],
                    communes_count: communesData.communes?.length || 0,
                    delivery_prices: deliveryData ? {
                        domicile: deliveryData.domicile,
                        bureau: deliveryData.bureau,
                        delai: deliveryData.delai
                    } : null
                }
            };

            res.json(response);
        } catch (error) {
            this.handleError(res, error, 'Error fetching wilaya details');
        }
    }

    getWilayaCommunes(req, res) {
        try {
            const wilayaName = this.normalizeString(req.params.name);
            const communesData = this.findWilayaInCommunes(wilayaName);

            if (!communesData) {
                return res.status(404).json({
                    success: false,
                    error: 'Wilaya not found'
                });
            }

            res.json({
                success: true,
                data: {
                    wilaya_name: communesData.wilaya_name,
                    wilaya_code: communesData.wilaya_code,
                    communes: communesData.communes || [],
                    communes_count: communesData.communes?.length || 0
                }
            });
        } catch (error) {
            this.handleError(res, error, 'Error fetching communes');
        }
    }

    getWilayaDelivery(req, res) {
        try {
            const wilayaName = this.normalizeString(req.params.name);
            const deliveryData = this.findWilayaInDelivery(wilayaName);

            if (!deliveryData) {
                return res.status(404).json({
                    success: false,
                    error: 'Delivery data not found for this wilaya'
                });
            }

            res.json({
                success: true,
                data: {
                    wilaya_name: deliveryData.name,
                    delivery_prices: {
                        domicile: deliveryData.domicile,
                        bureau: deliveryData.bureau,
                        delai: deliveryData.delai
                    }
                }
            });
        } catch (error) {
            this.handleError(res, error, 'Error fetching delivery prices');
        }
    }

    findWilayaInCommunes(wilayaName) {
        return this.wilayasCommunes.find(w => 
            this.normalizeString(w.wilaya_name) === wilayaName
        );
    }

    findWilayaInDelivery(wilayaName) {
        return this.wilayasDelivery.find(w => 
            this.normalizeString(w.name) === wilayaName
        );
    }

    normalizeString(str) {
        return str.toLowerCase().trim();
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl
            });
        });

        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });
    }

    handleError(res, error, message) {
        console.error(message, error);
        res.status(500).json({
            success: false,
            error: message
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Algeria Wilayas API running at http://localhost:${this.port}`);
            console.log(`📚 API Documentation available at http://localhost:${this.port}`);
            console.log(`❤️  Health check available at http://localhost:${this.port}/health`);
        });
    }
}

// Initialize the API
const api = new AlgeriaWilayasAPI();

// For Vercel deployment (serverless)
if (process.env.NODE_ENV === 'production') {
    module.exports = api.app;
} else {
    // For local development
    api.start();
    module.exports = AlgeriaWilayasAPI;
}