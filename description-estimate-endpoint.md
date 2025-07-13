# Endpoint POST /estimate - Estimation des coûts de livraison

## Description
Cet endpoint permet d'estimer le coût de livraison en fonction de plusieurs paramètres comme le poids, le type de colis, la destination, etc.

## URL
```
POST /estimate
```

## Paramètres de la requête (JSON)

### Paramètres obligatoires
| Paramètre | Type | Description |
|-----------|------|-------------|
| `wilaya` | string | Nom de la wilaya de destination |
| `weight` | number | Poids du colis en kilogrammes (0.1 - 50 kg) |

### Paramètres optionnels
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `packageType` | string | "standard" | Type de colis (voir types disponibles) |
| `deliveryOption` | string | "domicile" | Option de livraison ("domicile" ou "bureau") |
| `quantity` | number | 1 | Nombre de colis (1-100) |
| `value` | number | 0 | Valeur déclarée en DA (pour l'assurance) |
| `recurringCustomer` | boolean | false | Client récurrent (pour réductions) |

## Types de colis disponibles
- `standard` : Colis standard (max 50kg)
- `fragile` : Colis fragile avec protection supplémentaire (max 30kg)
- `express` : Livraison express 24-48h (max 20kg)
- `valuable` : Colis de valeur avec assurance incluse (max 25kg)
- `food` : Produits alimentaires (max 15kg)
- `electronic` : Équipements électroniques (max 30kg)

## Exemple de requête
```json
{
  "wilaya": "Alger",
  "weight": 2.5,
  "packageType": "fragile",
  "deliveryOption": "domicile",
  "quantity": 2,
  "value": 50000,
  "recurringCustomer": true
}
```

## Exemple de réponse
```json
{
  "success": true,
  "data": {
    "estimation": {
      "destination": {
        "wilaya": "Alger",
        "code": "16"
      },
      "package": {
        "weight": 2.5,
        "type": "fragile",
        "description": "Colis fragile (protection supplémentaire)",
        "quantity": 2
      },
      "delivery": {
        "option": "domicile",
        "description": "Livraison à domicile",
        "estimatedDelay": "24 h"
      },
      "costs": {
        "basePrice": 400,
        "unitCost": 780,
        "packagingFee": 100,
        "handlingFee": 25,
        "insuranceFee": 1000,
        "subtotal": 3810,
        "discounts": {
          "bulk": 0,
          "recurring": 305,
          "total": 305
        },
        "finalCost": 3505,
        "currency": "DA"
      },
      "breakdown": {
        "weightRange": "Lourd (2-5kg)",
        "weightMultiplier": 2.0,
        "packageMultiplier": 1.3,
        "deliveryMultiplier": 1.0,
        "appliedDiscounts": [
          {
            "type": "recurring",
            "description": "Client récurrent - réduction mensuelle",
            "amount": 305
          }
        ]
      }
    }
  }
}
```

## Codes d'erreur possibles
- `400` : Paramètres manquants ou invalides
- `404` : Wilaya non trouvée
- `500` : Erreur serveur

## Réductions appliquées
### Réductions de quantité
- 5+ colis : 5% de réduction
- 10+ colis : 10% de réduction
- 20+ colis : 15% de réduction

### Réductions clients récurrents
- Client mensuel : 8% de réduction
- Client trimestriel : 12% de réduction
- Client annuel : 20% de réduction

## Frais supplémentaires
### Assurance
- 2% de la valeur déclarée (maximum 500 DA)

### Emballage
- Standard : 50 DA
- Fragile : 100 DA
- Valeur : 150 DA

### Manutention
- Léger (≤ 2kg) : 0 DA
- Moyen (2-10kg) : 25 DA
- Lourd (> 10kg) : 50 DA
