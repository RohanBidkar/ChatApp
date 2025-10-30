// Keep-alive utility for Render free tier
// This prevents the app from sleeping by pinging it periodically

class KeepAlive {
  constructor(options = {}) {
    this.url = options.url || window.location.origin;
    this.interval = options.interval || 5 * 60 * 1000; // 5 minutes
    this.endpoint = options.endpoint || '/ping';
    this.enabled = options.enabled !== false;
    this.debug = options.debug || false;
    
    this.intervalId = null;
    this.isActive = false;
  }

  start() {
    if (!this.enabled || this.isActive) return;
    
    this.isActive = true;
    this.log('Keep-alive started');
    
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.interval);
    
    // Initial ping
    this.ping();
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.log('Keep-alive stopped');
  }

  async ping() {
    try {
      const response = await fetch(`${this.url}${this.endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        this.log('Ping successful');
      } else {
        this.log('Ping failed:', response.status);
      }
    } catch (error) {
      this.log('Ping error:', error.message);
    }
  }

  log(...args) {
    if (this.debug) {
      console.log('[KeepAlive]', ...args);
    }
  }
}

// Auto-start keep-alive in production
if (import.meta.env.PROD) {
  const keepAlive = new KeepAlive({
    interval: 5 * 60 * 1000, // 5 minutes
    debug: false,
    enabled: true
  });
  
  keepAlive.start();
  
  // Stop when page is hidden (save resources)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keepAlive.stop();
    } else {
      keepAlive.start();
    }
  });
}

export default KeepAlive;