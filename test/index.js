'use strict';

var Test = require('segmentio-integration-tester');
var Webhooks = require('..');
var assert = require('assert');
var crypto = require('crypto');
var express = require('express');

describe('Webhooks', function(){
  var types = ['track', 'identify', 'alias', 'group', 'page', 'screen'];
  var webhooks;
  var settings;
  var server;
  var test;
  var app;

  before(function(done){
    app = express();
    app.use(express.bodyParser());
    server = app.listen(4000, done);
  });

  after(function(done){
    server.close(done);
  });

  beforeEach(function(){
    settings = {
      globalHook: 'http://localhost:4000',
    };
    webhooks = new Webhooks(settings);
    test = Test(webhooks, __dirname);
  });

  it('should have the correct settings', function(){
    test
    .name('Webhooks')
    .channels(['server', 'mobile', 'client'])
    .timeout('3s')
    .retries(1);
  });

  describe('.validate()', function(){
    it('should be invalid if .globalHook isnt a url', function(){
      test.invalid({}, { globalHook: true });
      test.invalid({}, { globalHook: '' });
      test.invalid({}, { globalHook: 'aaa' });
    });

    it('should be valid if globalHook is a url', function(){
      test.valid({}, settings);
    });
  });

  types.forEach(function(type){
    describe('#' + type, function(){
      var json;

      beforeEach(function(){
        json = test.fixture(type + '-basic');
      });

      it('should succeed on valid call', function(done){
        var route = '/' + type + '/success';
        settings.globalHook += route;

        app.post(route, function(req, res){
          assert.deepEqual(req.body, json.output);
          res.send(200);
        });

        test
        .set(settings)
        [type](json.input)
        .expects(200)
        .end(done);
      });

      it('should error on invalid calls', function(done){
        var route = '/' + type + '/error';
        settings.globalHook += route;

        app.post(route, function(req, res){
          assert.deepEqual(req.body, json.output);
          res.send(503);
        });

        test
          .set(settings)
          [type](json.input)
          .expects(503)
          .error(done);
      });

      it('should ignore bad reply', function(done){
        var route = '/bad';
        settings.globalHook += route;

        app.post(route, function(req, res){
          res.set('Content-Type', 'application/json');
          res.send(200, 'I lied, this is not JSON');
        });

        test
          .set(settings)
          .identify(json.input)
          .expects(200)
          .end(done);
      });

      it('should attach an HMAC digest when options.sharedSecret is present', function(done){
        var route = '/' + type;
        settings.globalHook += route;
        settings.sharedSecret = 'teehee';

        app.post(route, function(req, res){
          var signature = req.headers['x-signature'];
          var digest = crypto
            .createHmac('sha1', settings.sharedSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

          assert(signature);
          assert(signature === digest);

          res.send(200);
        });

        test
          .set(settings)
          .identify(json.input)
          .expects(200)
          .end(done);
      });

      // TODO: test limit
    });
  });
});
