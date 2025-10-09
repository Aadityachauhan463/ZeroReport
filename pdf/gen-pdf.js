// 1️⃣ Import the Playwright library
const { chromium } = require('playwright');

// 2️⃣ Wrap everything inside an async function
(async () => {
  // Launch a headless browser
  const browser = await chromium.launch();

  // Create a new page
  const page = await browser.newPage();

  // Load your HTML file (make sure report.html is in same folder)
  await page.goto('file://' + process.cwd() + '/j.html');

  // Generate PDF
  await page.pdf({
    path: 'report.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  console.log('✅ PDF generated successfully!');
  await browser.close();
})();