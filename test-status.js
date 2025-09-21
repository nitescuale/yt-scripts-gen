const { chromium } = require('playwright');

async function testStatus() {
  console.log('🎭 Test du statut API...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const statusText = await page.textContent('#status-indicator');
    console.log(`📊 Statut affiché: ${statusText}`);

    if (statusText.includes('Ready')) {
      console.log('✅ Statut API correct !');
    } else {
      console.log('❌ Statut API encore incorrect');
    }

  } catch (error) {
    console.error('💥 Erreur:', error);
  } finally {
    await browser.close();
  }
}

testStatus().catch(console.error);