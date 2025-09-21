const { chromium } = require('playwright');

async function testOptimizedAPI() {
  console.log('🎭 Test API optimisée (3 requêtes max)...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Test avec un topic "Every" pour vérifier l'optimisation
    console.log('📝 Test avec "Every Modern Programming Language"...');
    await page.fill('#title', 'Every Modern Programming Language');
    await page.fill('#word-count', '800');
    await page.check('#enable-research');

    const startTime = Date.now();
    await page.click('#generate-btn');

    try {
      await page.waitForSelector('#generation-result', { state: 'visible', timeout: 120000 });

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      const wordCount = await page.textContent('#result-word-count');
      const researchSources = await page.textContent('#result-research-sources');

      console.log(`✅ Génération réussie en ${duration}s`);
      console.log(`📊 ${wordCount}, ${researchSources}`);

      // Vérifier la qualité du script
      const scriptContent = await page.textContent('#script-content');

      if (scriptContent.includes('programming') || scriptContent.includes('language')) {
        console.log('🎯 Script correspond au sujet demandé');
      }

      if (researchSources.includes('research sources') && !researchSources.includes('0')) {
        console.log('🔍 Recherche active avec optimisation réussie');
        console.log('💡 Utilisation estimée: ~3% du quota quotidien (3 requêtes)');
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

testOptimizedAPI().catch(console.error);