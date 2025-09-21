const { chromium } = require('playwright');

async function testScriptGeneration() {
  console.log('🎭 Démarrage du test Playwright...');

  const browser = await chromium.launch({ headless: false }); // Visible pour débugger
  const page = await browser.newPage();

  try {
    // 1. Aller sur l'application
    console.log('🌐 Navigation vers http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 2. Vérifier que la page est chargée
    const title = await page.textContent('h1');
    console.log(`📄 Titre de la page: ${title}`);

    // 3. Vérifier le statut de l'API
    const statusText = await page.textContent('#status-indicator');
    console.log(`📊 Statut API: ${statusText}`);

    // 4. Remplir le formulaire
    console.log('📝 Remplissage du formulaire...');
    await page.fill('#title', 'Every Nuclear Weapon Type Explained');
    await page.fill('#word-count', '800'); // Utilisons un count plus raisonnable
    await page.selectOption('#max-retries', '3'); // Plus de retries
    await page.check('#enable-research'); // Activer la recherche

    // 5. Soumettre le formulaire
    console.log('🚀 Génération du script...');
    await page.click('#generate-btn');

    // 6. Attendre le résultat (avec timeout de 5 minutes)
    console.log('⏳ Attente du résultat...');

    try {
      // Attendre soit le succès soit l'erreur
      await Promise.race([
        page.waitForSelector('#generation-result', { state: 'visible', timeout: 300000 }),
        page.waitForSelector('#generation-error', { state: 'visible', timeout: 300000 })
      ]);

      // Vérifier ce qui est apparu
      const resultVisible = await page.isVisible('#generation-result');
      const errorVisible = await page.isVisible('#generation-error');

      if (resultVisible) {
        console.log('✅ Script généré avec succès !');

        const wordCount = await page.textContent('#result-word-count');
        const researchSources = await page.textContent('#result-research-sources');

        console.log(`📊 ${wordCount}`);
        console.log(`🔍 ${researchSources}`);

        // Vérifier le contenu du script
        const scriptContent = await page.textContent('#script-content');
        const lines = scriptContent.split('\n').slice(0, 3);
        console.log('📜 Aperçu du script:');
        lines.forEach(line => console.log(`   ${line}`));

        // Vérifier que le titre correspond
        if (scriptContent.includes('Nuclear Weapon') || scriptContent.includes('nuclear weapon')) {
          console.log('✅ Le script correspond au titre demandé !');
        } else {
          console.log('❌ Le script ne correspond PAS au titre demandé !');
          console.log('🔍 Contenu trouvé:', scriptContent.substring(0, 200) + '...');
        }
      } else if (errorVisible) {
        const errorMessage = await page.textContent('#error-message');
        console.log(`❌ Erreur de génération: ${errorMessage}`);
      }

    } catch (timeoutError) {
      console.log('⏰ Timeout - vérification de l\'état...');

      // Vérifier l'état du bouton
      const buttonDisabled = await page.isDisabled('#generate-btn');
      console.log(`🔘 Bouton disabled: ${buttonDisabled}`);

      // Vérifier les logs du serveur
      console.log('📋 Vérifiez les logs du serveur pour plus de détails');
    }

  } catch (error) {
    console.error('💥 Erreur dans le test:', error);
  } finally {
    await browser.close();
    console.log('🏁 Test terminé');
  }
}

// Lancer le test
testScriptGeneration().catch(console.error);