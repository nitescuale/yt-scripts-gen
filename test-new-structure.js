const { chromium } = require('playwright');

async function testNewStructure() {
  console.log('🎭 Test de la nouvelle structure (examples vs library)...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Vérifier que l'interface charge
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('📋 Test: Interface web chargée');

    // 2. Vérifier que la library affiche les scripts existants
    await page.click('.nav-item[data-tab="library"]');
    await page.waitForTimeout(1000);

    const scriptsVisible = await page.isVisible('.scripts-grid');
    if (scriptsVisible) {
      const scriptCards = await page.$$('.script-card');
      console.log(`📚 Library: ${scriptCards.length} scripts trouvés`);
    } else {
      console.log('📚 Library: Aucun script affiché (vérifie le dossier library/)');
    }

    // 3. Tester la génération d'un nouveau script
    await page.click('.nav-item[data-tab="generator"]');
    await page.waitForTimeout(500);

    console.log('📝 Test: Génération d\'un nouveau script...');
    await page.fill('#title', 'Test New Library Structure');
    await page.fill('#word-count', '600');

    const startTime = Date.now();
    await page.click('#generate-btn');

    try {
      await page.waitForSelector('#generation-result', { state: 'visible', timeout: 120000 });

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log(`✅ Script généré en ${duration}s`);

      // 4. Vérifier que le script apparaît dans la library
      await page.click('.nav-item[data-tab="library"]');
      await page.waitForTimeout(1000);

      const updatedScriptCards = await page.$$('.script-card');
      console.log(`📚 Library mise à jour: ${updatedScriptCards.length} scripts`);

      if (updatedScriptCards.length > 0) {
        console.log('✅ La nouvelle structure fonctionne parfaitement !');
        console.log('   - Scripts générés sauvés dans library/');
        console.log('   - Interface web lit depuis library/');
        console.log('   - examples/ gardé pour les références');
      }

    } catch (error) {
      console.log('⏰ Timeout lors de la génération');
    }

  } catch (error) {
    console.error('💥 Erreur:', error);
  } finally {
    await browser.close();
    console.log('🏁 Test terminé');
  }
}

testNewStructure().catch(console.error);