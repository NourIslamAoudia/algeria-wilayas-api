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
            this.deliveryEstimation = require('./delivery-estimation.json');
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
                    'POST /estimate': 'Estimate delivery cost based on weight, package type, and destination',
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

        // Estimate delivery cost
        this.app.post('/estimate', this.estimateDeliveryCost.bind(this));
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

    estimateDeliveryCost(req, res) {
        try {
            const { 
                wilaya, 
                weight, 
                packageType = 'standard', 
                deliveryOption = 'domicile',
                quantity = 1,
                value = 0,
                recurringCustomer = false
            } = req.body;

            // Validation des paramètres requis
            if (!wilaya || !weight) {
                return res.status(400).json({
                    success: false,
                    error: 'Paramètres requis manquants. Veuillez fournir: wilaya, weight',
                    requiredParams: {
                        wilaya: 'string - nom de la wilaya de destination',
                        weight: 'number - poids en kg',
                        packageType: 'string - type de colis (optionnel, défaut: standard)',
                        deliveryOption: 'string - option de livraison (optionnel, défaut: domicile)',
                        quantity: 'number - nombre de colis (optionnel, défaut: 1)',
                        value: 'number - valeur déclarée en DA (optionnel)',
                        recurringCustomer: 'boolean - client récurrent (optionnel)'
                    }
                });
            }

            // Validation du poids
            if (weight <= 0 || weight > 50) {
                return res.status(400).json({
                    success: false,
                    error: 'Le poids doit être compris entre 0.1 et 50 kg'
                });
            }

            // Validation de la quantité
            if (quantity <= 0 || quantity > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'La quantité doit être comprise entre 1 et 100'
                });
            }

            // Rechercher les données de livraison de la wilaya
            const wilayaName = this.normalizeString(wilaya);
            const deliveryData = this.findWilayaInDelivery(wilayaName);

            if (!deliveryData) {
                return res.status(404).json({
                    success: false,
                    error: 'Wilaya non trouvée',
                    availableWilayas: this.wilayasDelivery.map(w => w.name)
                });
            }

            // Calcul du coût de base
            const basePrice = deliveryOption === 'domicile' ? deliveryData.domicile : deliveryData.bureau;
            
            if (basePrice === 0 && deliveryOption === 'bureau') {
                return res.status(400).json({
                    success: false,
                    error: 'Service de retrait au bureau non disponible pour cette wilaya'
                });
            }

            // Trouver le multiplicateur de poids
            const weightRange = this.deliveryEstimation.weightRanges.find(range => 
                weight > range.min && weight <= range.max
            );
            
            if (!weightRange) {
                return res.status(400).json({
                    success: false,
                    error: 'Poids trop élevé. Maximum supporté: 50kg'
                });
            }

            // Vérifier le type de colis
            const packageConfig = this.deliveryEstimation.packageTypes[packageType];
            if (!packageConfig) {
                return res.status(400).json({
                    success: false,
                    error: 'Type de colis invalide',
                    availableTypes: Object.keys(this.deliveryEstimation.packageTypes)
                });
            }

            // Vérifier la limite de poids pour le type de colis
            if (weight > packageConfig.maxWeight) {
                return res.status(400).json({
                    success: false,
                    error: `Poids trop élevé pour le type "${packageType}". Maximum: ${packageConfig.maxWeight}kg`
                });
            }

            // Vérifier l'option de livraison
            const deliveryConfig = this.deliveryEstimation.deliveryOptions[deliveryOption];
            if (!deliveryConfig) {
                return res.status(400).json({
                    success: false,
                    error: 'Option de livraison invalide',
                    availableOptions: Object.keys(this.deliveryEstimation.deliveryOptions)
                });
            }

            // Calcul du coût unitaire
            let unitCost = basePrice * weightRange.multiplier * packageConfig.multiplier * deliveryConfig.multiplier;

            // Frais d'emballage
            const packagingFee = this.deliveryEstimation.additionalFees.packaging[packageType] || 
                                 this.deliveryEstimation.additionalFees.packaging.standard;

            // Frais de manutention selon le poids
            let handlingFee = 0;
            if (weight <= 2) {
                handlingFee = this.deliveryEstimation.additionalFees.handling.light;
            } else if (weight <= 10) {
                handlingFee = this.deliveryEstimation.additionalFees.handling.medium;
            } else {
                handlingFee = this.deliveryEstimation.additionalFees.handling.heavy;
            }

            // Assurance si valeur déclarée
            let insuranceFee = 0;
            if (value > 0) {
                insuranceFee = Math.min(
                    value * this.deliveryEstimation.additionalFees.insurance.percentage,
                    this.deliveryEstimation.additionalFees.insurance.maxFee
                );
            }

            // Coût total avant réductions
            let totalCost = (unitCost + packagingFee + handlingFee + insuranceFee) * quantity;

            // Application des réductions de quantité
            let bulkDiscount = 0;
            const bulkDiscountConfig = this.deliveryEstimation.discounts.bulk
                .sort((a, b) => b.minQuantity - a.minQuantity)
                .find(discount => quantity >= discount.minQuantity);
            
            if (bulkDiscountConfig) {
                bulkDiscount = totalCost * bulkDiscountConfig.discount;
            }

            // Réduction client récurrent
            let recurringDiscount = 0;
            if (recurringCustomer) {
                recurringDiscount = totalCost * this.deliveryEstimation.discounts.recurring.monthly;
            }

            // Coût final
            const finalCost = Math.round(totalCost - bulkDiscount - recurringDiscount);

            // Estimation du délai
            const estimatedDelay = deliveryData.delai;

            // Réponse détaillée
            res.json({
                success: true,
                data: {
                    estimation: {
                        destination: {
                            wilaya: deliveryData.name,
                            code: deliveryData.code
                        },
                        package: {
                            weight: weight,
                            type: packageType,
                            description: packageConfig.description,
                            quantity: quantity
                        },
                        delivery: {
                            option: deliveryOption,
                            description: deliveryConfig.description,
                            estimatedDelay: estimatedDelay
                        },
                        costs: {
                            basePrice: basePrice,
                            unitCost: Math.round(unitCost),
                            packagingFee: packagingFee,
                            handlingFee: handlingFee,
                            insuranceFee: Math.round(insuranceFee),
                            subtotal: Math.round(totalCost),
                            discounts: {
                                bulk: Math.round(bulkDiscount),
                                recurring: Math.round(recurringDiscount),
                                total: Math.round(bulkDiscount + recurringDiscount)
                            },
                            finalCost: finalCost,
                            currency: 'DA'
                        },
                        breakdown: {
                            weightRange: weightRange.description,
                            weightMultiplier: weightRange.multiplier,
                            packageMultiplier: packageConfig.multiplier,
                            deliveryMultiplier: deliveryConfig.multiplier,
                            appliedDiscounts: []
                        }
                    }
                }
            });

            // Ajouter les réductions appliquées au breakdown
            if (bulkDiscountConfig) {
                res.locals.estimation.breakdown.appliedDiscounts.push({
                    type: 'bulk',
                    description: bulkDiscountConfig.description,
                    amount: Math.round(bulkDiscount)
                });
            }

            if (recurringCustomer) {
                res.locals.estimation.breakdown.appliedDiscounts.push({
                    type: 'recurring',
                    description: 'Client récurrent - réduction mensuelle',
                    amount: Math.round(recurringDiscount)
                });
            }

        } catch (error) {
            this.handleError(res, error, 'Error calculating delivery estimation');
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