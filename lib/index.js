'use strict';

/**
 * Module dependencies.
 */

var crypto = require('crypto');
var integration = require('segmentio-integration');
var url = require('url');

/**
 * Expose `Webhooks`
 */

var Webhooks = module.exports = integration('Webhooks')
  .channels(['server', 'mobile', 'client'])
  .timeout('3s')
  .retries(1);

/**
 * Ensure `globalHook` is a url.
 */

Webhooks.ensure(function(_, settings){
  if (isUrl(settings.globalHook)) return;
  return this.invalid('"globalHook" must be a valid url, got "%s"', settings.globalHook);
});

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

function request(message, fn){
  var body = JSON.stringify(message.json());

  var req = this
    .post(this.settings.globalHook)
    .type('json')
    .send(body)
    .parse(ignore);

  var sharedSecret = this.settings.sharedSecret;

  if (typeof sharedSecret === 'string' && sharedSecret.length) {
    var digest = crypto
      .createHmac('sha1', sharedSecret)
      .update(body, 'utf8')
      .digest('hex');

    req.set('X-Signature', digest);
  }

  req.end(this.handle(fn));
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
