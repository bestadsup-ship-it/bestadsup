/**
 * B2B Ad Platform - JavaScript Ad Tag
 * Lightweight ad serving tag (<10KB gzipped)
 * Timeout: 500ms, Non-blocking
 */
(function() {
  'use strict';

  // Configuration
  var AD_SERVER_URL = 'http://localhost:3001'; // Override via data-ad-server attribute
  var TIMEOUT_MS = 500;

  /**
   * Main Ad Tag Class
   */
  function AdTag(element) {
    this.element = element;
    this.adUnitId = element.getAttribute('data-ad-unit-id');
    this.adServerUrl = element.getAttribute('data-ad-server') || AD_SERVER_URL;
    this.timeout = parseInt(element.getAttribute('data-timeout')) || TIMEOUT_MS;

    if (!this.adUnitId) {
      console.error('B2B AdTag: data-ad-unit-id is required');
      return;
    }

    this.render();
  }

  /**
   * Render the ad
   */
  AdTag.prototype.render = function() {
    var self = this;
    var timedOut = false;

    // Set timeout
    var timeoutId = setTimeout(function() {
      timedOut = true;
      console.warn('B2B AdTag: Request timed out after ' + self.timeout + 'ms');
    }, this.timeout);

    // Build request payload
    var payload = {
      ad_unit_id: this.adUnitId,
      page_url: window.location.href,
      user_agent: navigator.userAgent
    };

    // Make request
    this.request(this.adServerUrl + '/ad/request', payload, function(response) {
      clearTimeout(timeoutId);

      if (timedOut) return;

      if (response && response.creative_url) {
        self.displayAd(response);
      } else {
        self.displayNoFill();
      }
    });
  };

  /**
   * Make HTTP request
   */
  AdTag.prototype.request = function(url, payload, callback) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            callback(response);
          } catch (e) {
            console.error('B2B AdTag: Failed to parse response', e);
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    };

    xhr.onerror = function() {
      callback(null);
    };

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));
  };

  /**
   * Display the ad creative
   */
  AdTag.prototype.displayAd = function(response) {
    var container = document.createElement('div');
    container.className = 'b2b-ad-container';
    container.style.cssText = 'position:relative;overflow:hidden;';

    var img = document.createElement('img');
    img.src = response.creative_url;
    img.style.cssText = 'max-width:100%;height:auto;display:block;';
    img.alt = 'Advertisement';

    // Fire tracking pixels on load
    var self = this;
    img.onload = function() {
      if (response.tracking_pixels && response.tracking_pixels.length > 0) {
        response.tracking_pixels.forEach(function(pixelUrl) {
          self.firePixel(pixelUrl);
        });
      }
    };

    container.appendChild(img);
    this.element.appendChild(container);
  };

  /**
   * Display no-fill fallback
   */
  AdTag.prototype.displayNoFill = function() {
    // Silent no-fill - don't display anything
    this.element.style.display = 'none';
  };

  /**
   * Fire tracking pixel
   */
  AdTag.prototype.firePixel = function(url) {
    var img = new Image(1, 1);
    img.src = url;
  };

  /**
   * Initialize all ad units on page
   */
  function init() {
    // Support both class and data attribute selectors
    var elements = document.querySelectorAll('.b2b-ad-unit, [data-ad-unit-id]');

    for (var i = 0; i < elements.length; i++) {
      new AdTag(elements[i]);
    }
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for manual initialization
  window.B2BAdTag = {
    init: init,
    version: '1.0.0'
  };
})();
