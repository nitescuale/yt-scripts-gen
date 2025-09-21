const { chromium } = require('playwright');

async function testSearchAPI() {
  console.log('🎭 Test de l\'API de recherche Google...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Vérifier le statut de l'API
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const statusText = await page.textContent('#status-indicator');
    console.log(`📊 Statut: ${statusText}`);

    // 2. Générer un script avec recherche
    console.log('📝 Test de génération avec recherche...');
    await page.fill('#title', 'Every Space Technology Explained');
    await page.fill('#word-count', '700');
    await page.check('#enable-research');

    // 3. Lancer la génération
    console.log('🚀 Génération en cours...');
    await page.click('#generate-btn');

    // 4. Attendre le résultat
    try {
      await page.waitForSelector('#generation-result', { state: 'visible', timeout: 120000 });

      const wordCount = await page.textContent('#result-word-count');
      const researchSources = await page.textContent('#result-research-sources');

      console.log(`✅ Succès ! ${wordCount}, ${researchSources}`);

      // Vérifier que ce n'est plus "mock data"
      if (researchSources.includes('research sources') && !researchSources.includes('0')) {
        console.log('🔍 Recherche Google active et fonctionnelle !');
      } else {
        console.log('⚠️ Recherche pourrait encore utiliser des données mock');
      }

    } catch (error) {
      console.log('⏰ Timeout ou erreur lors de la génération');
    }

  } catch (error) {
    console.error('💥 Erreur:', error);
  } finally {
    await browser.close();
    console.log('🏁 Test terminé');
  }
}

testSearchAPI().catch(console.error);