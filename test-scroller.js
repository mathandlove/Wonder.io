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
                console.log('🧲 SCROLLER LOG:', text);
            } else if (text.includes('🔍') || text.includes('Found') || text.includes('bubbles')) {
                console.log('🔍 DEBUG LOG:', text);
            } else if (text.includes('=== FLOW POSITIONING DEBUG ===')) {
                console.log('📍 POSITION DEBUG:', text);
            }
        });
        
        console.log('📱 Loading story app...');
        await page.goto('http://localhost:5173?mode=story', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        // Wait for React app to render
        console.log('⏳ Waiting for story content to load...');
        await page.waitForTimeout(5000);
        
        // Check if flow content exists
        const flowContent = await page.$('.flow-content');
        if (!flowContent) {
            console.log('❌ .flow-content not found - story may not have loaded');
            return;
        }
        
        const flowItems = await page.$$('.flow-item');
        console.log(`✅ Found ${flowItems.length} flow items`);
        
        if (flowItems.length === 0) {
            console.log('❌ No flow items found - cannot test magnetic scroller');
            return;
        }
        
        // Test 1: Initial position
        console.log('\n📍 TEST 1: Initial positioning');
        await page.evaluate(() => {
            if (window.debugFlowPositions) {
                window.debugFlowPositions();
            } else {
                console.log('❌ debugFlowPositions() not available');
            }
        });
        
        // Test 2: Scroll down and test magnetic snap
        console.log('\n📜 TEST 2: Testing scroll down behavior');
        await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'auto' });
        });
        await page.waitForTimeout(500);
        
        await page.evaluate(() => {
            console.log('📜 Scrolling down 300px...');
            window.scrollBy({ top: 300, behavior: 'auto' });
        });
        
        // Wait for magnetic snap to occur
        await page.waitForTimeout(1500);
        
        // Test 3: Check final positioning
        console.log('\n📍 TEST 3: Checking post-scroll positioning');
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
        
        console.log(`📊 Viewport: ${positionInfo.viewportHeight}px, Scroll: ${positionInfo.scrollY}px`);
        
        positionInfo.results.forEach(result => {
            const distance = parseFloat(result.distance);
            const status = distance < 10 ? '✅ WELL CENTERED' : 
                          distance < 25 ? '⚠️ REASONABLY CENTERED' : 
                          '❌ POORLY CENTERED';
            
            console.log(`📍 Flow item ${result.index}: center=${result.itemCenter}px, distance=${result.distance}px ${status}`);
        });
        
        // Test 4: Test scroll up behavior
        console.log('\n📜 TEST 4: Testing scroll up behavior');
        await page.evaluate(() => {
            console.log('📜 Scrolling up 200px...');
            window.scrollBy({ top: -200, behavior: 'auto' });
        });
        
        await page.waitForTimeout(1500);
        
        // Test 5: Final debug check
        console.log('\n🔍 TEST 5: Final debug check');
        await page.evaluate(() => {
            if (window.debugFlowPositions) {
                window.debugFlowPositions();
            }
        });
        
        console.log('\n✅ Test completed successfully!');
        
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
    console.log('❌ Puppeteer not available. Installing...');
    console.log('Run: npm install puppeteer');
    console.log('Then run: node test-scroller.js');
}