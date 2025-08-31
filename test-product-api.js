// Test script pour vérifier l'ajout et la récupération de produits
// Utilise fetch natif de Node.js (v18+)

const API_BASE = 'http://localhost:3000/api';

async function testProductAPI() {
  console.log('🧪 Testing Product API...\n');

  // Test 1: Ajouter un produit pour Al Ouloum
  console.log('📦 Test 1: Ajouter un produit pour Al Ouloum');
  try {
    const newProduct = {
      name: 'Test Produit API',
      reference: 'TEST-API-001',
      description: 'Produit de test pour vérifier l\'API',
      price: 25.50,
      quantity: 100,
      barcodes: ['1234567890123']
    };

    const createResponse = await fetch(`${API_BASE}/products?stockId=al-ouloum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newProduct)
    });

    const createResult = await createResponse.json();
    console.log('✅ Création produit:', createResult);

    if (createResult.success) {
      const productId = createResult.data.id;
      console.log(`📦 Produit créé avec ID: ${productId}\n`);

      // Test 2: Récupérer les produits pour Al Ouloum avec recherche
      console.log('📦 Test 2: Récupérer les produits pour Al Ouloum avec recherche');
      const getResponse = await fetch(`${API_BASE}/products?stockId=al-ouloum&limit=50&search=Test`);
      const getResult = await getResponse.json();
      
      console.log('✅ Récupération produits:', {
        success: getResult.success,
        totalProducts: getResult.data?.products?.length || 0,
        total: getResult.data?.pagination?.total || 0
      });

      // Vérifier si notre produit est dans la liste
      const ourProduct = getResult.data?.products?.find(p => p.id === productId);
      if (ourProduct) {
        console.log('✅ Produit trouvé dans la liste:', {
          id: ourProduct.id,
          name: ourProduct.name,
          quantity: ourProduct.quantity,
          stock_id: ourProduct.stock_id
        });
      } else {
        console.log('❌ Produit non trouvé dans la liste');
      }

      // Test 3: Ajouter le même produit pour Renaissance
      console.log('\n📦 Test 3: Ajouter le même produit pour Renaissance');
      const addToRenaissanceResponse = await fetch(`${API_BASE}/products?stockId=renaissance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProduct,
          quantity: 50 // Quantité différente pour Renaissance
        })
      });

      const renaissanceResult = await addToRenaissanceResponse.json();
      console.log('✅ Ajout à Renaissance:', renaissanceResult);

      // Test 4: Récupérer les produits pour Renaissance avec recherche
      console.log('\n📦 Test 4: Récupérer les produits pour Renaissance avec recherche');
      const getRenaissanceResponse = await fetch(`${API_BASE}/products?stockId=renaissance&limit=50&search=Test`);
      const getRenaissanceResult = await getRenaissanceResponse.json();
      
      console.log('✅ Récupération produits Renaissance:', {
        success: getRenaissanceResult.success,
        totalProducts: getRenaissanceResult.data?.products?.length || 0,
        total: getRenaissanceResult.data?.pagination?.total || 0
      });

      // Vérifier si notre produit est dans la liste Renaissance
      const ourProductRenaissance = getRenaissanceResult.data?.products?.find(p => p.name === newProduct.name);
      if (ourProductRenaissance) {
        console.log('✅ Produit trouvé dans Renaissance:', {
          id: ourProductRenaissance.id,
          name: ourProductRenaissance.name,
          quantity: ourProductRenaissance.quantity,
          stock_id: ourProductRenaissance.stock_id
        });
      } else {
        console.log('❌ Produit non trouvé dans Renaissance');
      }

    } else {
      console.log('❌ Échec de création du produit:', createResult.error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testProductAPI();
