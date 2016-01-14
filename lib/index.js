'use strict';

/**
 * Module dependencies.
 */

var crypto = require('crypto');
var integration = require('segmentio-integration');
var url = require('url');
var Batch = require('batch');

/**
 * Expose `Webhooks`
 */

var Webhooks = module.exports = integration('Webhooks')
  .channels(['server', 'mobile', 'client'])
  .timeout('3s')
  .retries(1);

/**
 * Expose our methods
 */

Webhooks.prototype.identify = request;
Webhooks.prototype.alias = request;
Webhooks.prototype.group = request;
Webhooks.prototype.track = request;
Webhooks.prototype.page = request;
Webhooks.prototype.screen = request;

/**
 * Request.
 *
 * @param {Facade} message
 * @param {Function} fn
 * @api private
 */

function request(message, done){
  var body = JSON.stringify(message.json());
  var sharedSecret = this.settings.sharedSecret;
  var digest;
  var self = this;

  if (typeof sharedSecret === 'string' && sharedSecret.length) {
    digest = crypto
      .createHmac('sha1', sharedSecret)
      .update(body, 'utf8')
      .digest('hex');
  }

  var batch = new Batch();
  batch.throws(false);

  var hooks = self.settings.hooks.slice(0, 5);
  var validHooks = hooks.filter(isUrl);
  if (validHooks.length === 0) {
    return done();
  }
  validHooks.forEach(function(hook) {
    batch.push(function(done) {
      var req = self
        .post(hook)
        .type('json')
        .send(body)
        .parse(ignore);

      if (digest) {
        req.set('X-Signature', digest);
      }

      req.end(self.handle(done));
    });
  });

  batch.end(function(errors, results) {
    var realErrors = errors.filter(function(error) {
      return error !== null;
    });
    // Only fail if all the webhooks were down.
    if (realErrors.length === validHooks.length) {
      var error = new Error('Batch failed');
      error.errors = realErrors;
      return done(error, results);
    }
    done(null, results);
  });
}

/**
 * Check if the given `value` is a valid url.
 *
 * @param {Mixed} value
 * @return {Boolean}
 * @api private
 */

function isUrl(value){
  var parsed = url.parse(String(value));
  return parsed.protocol && parsed.host;
}

/**
 * Ignore is a superagent parser (which segmentio-integration
 * uses under the hood) to just completely ignore the response
 * from the webhook request. This is ideal because we can't
 * rely on content-type header for parsing and more importantly we
 * don't really want to parse an unbound amount of data that
 * the request could respond with.
 */

function ignore(res, fn){
  res.text = '';
  res.on('data', function(){});
  res.on('end', fn);
}
