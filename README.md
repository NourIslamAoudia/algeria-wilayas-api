# 🇩🇿 Algeria Wilayas & Communes API

Une API REST complète pour accéder aux données des wilayas (départements) et communes d'Algérie, avec les tarifs de livraison.

## 🌐 URL de l'API

**Production :** https://algeria-wilayas-api-kappa.vercel.app/

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Endpoints](#endpoints)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Structure des données](#structure-des-données)
- [Installation locale](#installation-locale)
- [Déploiement](#déploiement)
- [Contribution](#contribution)

## ✨ Fonctionnalités

- 📍 **58 wilayas** complètes avec leurs communes
- 💰 **Tarifs de livraison** (domicile et bureau)
- ⏰ **Délais de livraison** estimés
- 🚀 **API REST** rapide et fiable
- 🔒 **Sécurisée** avec rate limiting
- 📱 **Compatible CORS** pour les applications web

## 🛠 Endpoints

### 1. Documentation de l'API
```
GET /
```
Retourne la documentation de base de l'API.

### 2. Statut de santé
```
GET /health
```
Vérifie le statut de l'API.

### 3. Liste de toutes les wilayas
```
GET /wilayas
```
Retourne la liste complète des 58 wilayas avec le nombre de communes.

### 4. Détails complets d'une wilaya
```
GET /wilaya/:name
```
Retourne les détails complets d'une wilaya : communes et tarifs de livraison.

### 5. Communes d'une wilaya
```
GET /wilaya/:name/communes
```
Retourne uniquement la liste des communes d'une wilaya.

### 6. Tarifs de livraison d'une wilaya
```
GET /wilaya/:name/delivery
```
Retourne uniquement les tarifs de livraison d'une wilaya.

## 📖 Exemples d'utilisation

### JavaScript (Fetch API)

```javascript
// Obtenir toutes les wilayas
fetch('https://algeria-wilayas-api-kappa.vercel.app/wilayas')
  .then(response => response.json())
  .then(data => console.log(data));

// Obtenir les détails d'Alger
fetch('https://algeria-wilayas-api-kappa.vercel.app/wilaya/alger')
  .then(response => response.json())
  .then(data => console.log(data));

// Obtenir les communes de Constantine
fetch('https://algeria-wilayas-api-kappa.vercel.app/wilaya/constantine/communes')
  .then(response => response.json())
  .then(data => console.log(data));

// Obtenir les tarifs de livraison d'Oran
fetch('https://algeria-wilayas-api-kappa.vercel.app/wilaya/oran/delivery')
  .then(response => response.json())
  .then(data => console.log(data));
```

### cURL

```bash
# Liste des wilayas
curl https://algeria-wilayas-api-kappa.vercel.app/wilayas

# Détails d'une wilaya
curl https://algeria-wilayas-api-kappa.vercel.app/wilaya/alger

# Communes d'une wilaya
curl https://algeria-wilayas-api-kappa.vercel.app/wilaya/alger/communes

# Tarifs de livraison
curl https://algeria-wilayas-api-kappa.vercel.app/wilaya/alger/delivery
```

### Python (requests)

```python
import requests

# Base URL
base_url = "https://algeria-wilayas-api-kappa.vercel.app"

# Obtenir toutes les wilayas
response = requests.get(f"{base_url}/wilayas")
wilayas = response.json()

# Obtenir les détails d'Alger
response = requests.get(f"{base_url}/wilaya/alger")
alger_details = response.json()

# Obtenir les communes de Blida
response = requests.get(f"{base_url}/wilaya/blida/communes")
blida_communes = response.json()
```

## 📊 Structure des données

### Réponse pour `/wilayas`
```json
{
  "success": true,
  "count": 58,
  "data": [
    {
      "code": 1,
      "name": "Adrar",
      "communes_count": 22
    }
  ]
}
```

### Réponse pour `/wilaya/:name`
```json
{
  "success": true,
  "data": {
    "wilaya_name": "Alger",
    "wilaya_code": 16,
    "communes": ["Alger Centre", "Sidi M'Hamed", "..."],
    "communes_count": 57,
    "delivery_prices": {
      "domicile": 400,
      "bureau": 200,
      "delai": "24 h"
    }
  }
}
```

### Réponse pour `/wilaya/:name/delivery`
```json
{
  "success": true,
  "data": {
    "wilaya_name": "Alger",
    "delivery_prices": {
      "domicile": 400,
      "bureau": 200,
      "delai": "24 h"
    }
  }
}
```

## 💰 Tarifs de livraison

- **domicile** : Tarif en dinars algériens (DA) pour la livraison à domicile
- **bureau** : Tarif en DA pour le retrait au bureau/point relais (0 = gratuit ou non disponible)
- **delai** : Délai estimé de livraison

## 🏠 Installation locale

1. **Cloner le projet**
```bash
git clone [URL_DU_REPO]
cd algeria-wilayas-api
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Démarrer en mode développement**
```bash
npm run dev
```

4. **Démarrer en mode production**
```bash
npm start
```

L'API sera disponible sur `http://localhost:3001`

## 🚀 Déploiement

### Vercel (Recommandé)

1. Connectez votre repository GitHub à Vercel
2. Vercel détectera automatiquement la configuration
3. L'API sera déployée automatiquement

### Autres plateformes

L'API est compatible avec :
- **Heroku**
- **Railway**
- **Render**
- **DigitalOcean App Platform**

## 🔧 Technologies utilisées

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Helmet** - Sécurité HTTP
- **CORS** - Cross-Origin Resource Sharing
- **express-rate-limit** - Limitation du taux de requêtes

## 📝 Données sources

- **Wilayas et communes** : Basé sur le découpage administratif officiel de l'Algérie (ONS)
- **Tarifs de livraison** : Données de référence pour les services de livraison

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence ISC.

## 📞 Support

Pour toute question ou problème, n'hésitez pas à ouvrir une issue sur GitHub.

---

**🔗 Liens utiles :**
- [API en direct](https://algeria-wilayas-api-kappa.vercel.app/)
- [Documentation interactive](https://algeria-wilayas-api-kappa.vercel.app/)
- [Statut de l'API](https://algeria-wilayas-api-kappa.vercel.app/health)
