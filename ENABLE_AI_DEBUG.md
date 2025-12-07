# Enable AI Service Debug Logs

## Quick Fix - Run in Browser Console

Open your browser DevTools console (F12 or Cmd+Option+I) and paste this:

```javascript
// Add AI service to current debug config
const current = localStorage.getItem('debug') || '';
const patterns = current.split(',').filter(p => p.trim());
if (!patterns.some(p => p.includes('wonder:ai'))) {
  patterns.push('wonder:ai:*');
  localStorage.setItem('debug', patterns.join(','));
  console.log('✅ AI debug enabled! Current config:', patterns.join(','));
  console.log('🔄 Refreshing page...');
  location.reload();
} else {
  console.log('ℹ️  AI debug already enabled');
  console.log('Current config:', localStorage.getItem('debug'));
}
```

## Alternative: Enable All AI Logs

```javascript
__debug.enable('wonder:ai:*')
location.reload()
```

## Verify It's Working

After refresh, you should see logs like:

```
wonder:ai:service 🎯 validateAnswer called: {userAnswer: "...", correctAnswer: "..."}
wonder:ai:service 📤 Calling validation API...
wonder:ai:service 📨 Received API response: {response: "85"}
wonder:ai:service Parsed score: 85
wonder:ai:service 📊 Validation score: {score: 85, isCorrect: true, threshold: 65, ...}
```

## Current Expected Pattern

Your debug config should include:
```
wonder:navigation:machine,wonder:scenes:dialogue,wonder:ai:*
```

## Troubleshooting

If logs still don't show:

1. Check localStorage:
```javascript
console.log(localStorage.getItem('debug'))
```

2. Manually set it:
```javascript
localStorage.setItem('debug', 'wonder:navigation:machine,wonder:scenes:dialogue,wonder:ai:*')
location.reload()
```

3. Check if debug is working at all:
```javascript
// This should return true
debug('wonder:ai:service').enabled
```
