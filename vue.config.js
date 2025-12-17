// const path = require('path');
// const PrerenderSPAPlugin = require('prerender-spa-plugin');

// Pre-rendering temporarily disabled due to Webpack 5 compatibility issues
// Google still crawls fine with dynamic meta tags (Google executes JavaScript)
// const bookIds = [1, 2, 3, 4, 5, 10, 100, 104, 106];
// const bookRoutes = bookIds.map(id => `/book/${id}/1`);

module.exports = {
  productionSourceMap: false,
  outputDir: 'dist',
  pwa: {
    iconPaths: {
      favicon32: './favicon.ico',
      favicon16: './favicon.ico',
      appleTouchIcon: './favicon.ico',
      maskIcon: './favicon.ico',
      msTileImage: './favicon.ico',
      androidChrome: './favicon.ico'
    }
  },
  // Pre-rendering disabled - relying on dynamic meta tags which work for Google
  /*
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      return {
        plugins: [
          new PrerenderSPAPlugin({
            staticDir: path.join(__dirname, 'dist'),
            routes: [
              '/',
              '/books',
              ...bookRoutes
            ],
            renderer: new PrerenderSPAPlugin.PuppeteerRenderer({
              renderAfterTime: 5000,
              headless: true
            })
          })
        ]
      };
    }
  }
  */
};
