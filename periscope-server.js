'use strict';
// Peri$scope server only, CORS-enabled.  Run this alongside your app server.
var express       = require('express'),
  periscopeRoutes = require('./periscope'),
  app             = express(),
  SERVER_PORT     = 3300;  // must match port in constant corsServerUrl in scripts/periscope.js
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin",  "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  res.header("Access-Control-Allow-Methods", "POST");
  next();
});
app.use('/', periscopeRoutes);
var server = app.listen(SERVER_PORT, function() {
  console.log('Peri$scope CORS-enabled server listening on port %d', server.address().port);
});
