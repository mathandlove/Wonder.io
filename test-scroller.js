// Test script to verify magnetic scroller functionality
// Run with: node test-scroller.js

const puppeteer = require('puppeteer');

async function testMagneticScroller() {
    let browser;
    
    try {

        
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: true, // Set to false to see the browser
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Listen to console logs from the page
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('🧲') || text.includes('MAGNETIC') || text.includes('magnetic')) {
            } else if (text.includes('🔍') || text.includes('Found') || text.includes('bubbles')) {
            } else if (text.includes('=== FLOW POSITIONING DEBUG ===')) {
            }
        });
        
        await page.goto('http://localhost:5173?mode=story', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        // Wait for React app to render
        await page.waitForTimeout(5000);
        
        // Check if flow content exists
        const flowContent = await page.$('.flow-content');
        if (!flowContent) {
            return;
        }
        
        const flowItems = await page.$$('.flow-item');
        
        if (flowItems.length === 0) {
            return;
        }
        
        // Test 1: Initial position
        await page.evaluate(() => {
            if (window.debugFlowPositions) {
                window.debugFlowPositions();
            } else {
            }
        });
        
        // Test 2: Scroll down and test magnetic snap
        await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'auto' });
        });
        await page.waitForTimeout(500);
        
        await page.evaluate(() => {
            window.scrollBy({ top: 300, behavior: 'auto' });
        });
        
        // Wait for magnetic snap to occur
        await page.waitForTimeout(1500);
        
        // Test 3: Check final positioning
        const positionInfo = await page.evaluate(() => {
            const viewportCenter = window.innerHeight / 2;
            const flowItems = document.querySelectorAll('.flow-item');
            const results = [];
            
            flowItems.forEach((item, index) => {
                const rect = item.getBoundingClientRect();
                const itemCenter = rect.top + rect.height / 2;
                const distance = Math.abs(itemCenter - viewportCenter);
                
                results.push({
                    index: index + 1,
                    itemCenter: itemCenter.toFixed(1),
                    viewportCenter: viewportCenter.toFixed(1),
                    distance: distance.toFixed(1),
                    isNearCenter: distance < 50
                });
            });
            
            return {
                viewportHeight: window.innerHeight,
                scrollY: window.scrollY,
                results: results.filter(r => r.isNearCenter) // Only show items near center
            };
        });
        
        
        positionInfo.results.forEach(result => {
            const distance = parseFloat(result.distance);
            const status = distance < 10 ? '✅ WELL CENTERED' : 
                          distance < 25 ? '⚠️ REASONABLY CENTERED' : 
                          '❌ POORLY CENTERED';
            
        });
        
        // Test 4: Test scroll up behavior
        await page.evaluate(() => {
            window.scrollBy({ top: -200, behavior: 'auto' });
        });
        
        await page.waitForTimeout(1500);
        
        // Test 5: Final debug check
        await page.evaluate(() => {
            if (window.debugFlowPositions) {
                window.debugFlowPositions();
            }
        });
        
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Check if puppeteer is available
try {
    require('puppeteer');
    testMagneticScroller();
} catch (e) {
}