'use strict';
// app and Peri$scope demo server (no CORS required)
var fs            = require('fs'),
  express         = require('express'),
  periscopeRoutes = require('./periscope'),
  app             = express(),
  SERVER_PORT     = 3000;  // must match gulpfile.js EXPRESS_PORT
// define our own very simple template engine
app.engine('html',        myTemplateEngine);
app.set   ('views',       './views');
app.set   ('view engine', 'html');
app.get('/demos/:demoPage/:angularVersion', function(req, res) {
  res.render(req.params.demoPage, {
    demoPage:       req.params.demoPage,
    angularVersion: req.params.angularVersion
  });
});
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use('/', periscopeRoutes);
var server = app.listen(SERVER_PORT, function() {
  console.log('App/Peri$scope server listening on port %d', server.address().port);
});

var DEMO_HEADER = '<!doctype html>'
    + '<html lang="en">'
    + '<head>'
    + '  <meta charset="utf-8">'
    + '  <title>#angularVersion# #demoPageTitle#</title>'
    + '  <link rel="stylesheet" href="/styles/demos.css">'
    + '  <base href="/">'
    + '</head>'
    + '<body ng-app="myApp">'
    + '<div><img class="logo" src="/images/periscope_small.png" alt="Peri$scope">'
    +   '<span class="page-title">Angular #angularVersion# - #demoPageTitle#</span>'
    + '  <button onclick="instructionEl.style.display = \'none\'">hide instructions</button>'
    + '  <button onclick="instructionEl.style.display = \'block\'">show instructions</button>'
    + '  <button onclick="instructionEl.style.height = (instructionEl.offsetHeight + 20) + \'px\'"> + </button>'
    + '  <button onclick="instructionEl.style.height = (instructionEl.offsetHeight - 40) + \'px\'"> - </button>'
    + '</div>',
  DEMO_FOOTER = '<div periscope></div>'
    + '<script>var instructionEl = document.getElementById("instructions");</script>'
    + '<script src="/bower_components/angularjs-#angularVersion#/angular.js"></script>'
    + '<script src="/scripts/periscopeModule.js"></script>',
  DEMO_PAGE_TITLES = {
    nested_ctrls:       'nested controllers',
    scope_props:        '$scope properties',
    simple_form:        'simple form',
    nested_forms:       'nested forms',
    ngrepeat:           'ngRepeat',
    ngview:             'ngView',
    nginclude:          'ngInclude',
    ngif:               'ngIf',
    ngswitch:           'ngSwitch',
    dir_noscope:        'directive with no new scope',
    dir_scope:          'directive with a new child scope',
    dir_isolate:        'directive with an isolate scope',
    dir_trans_noscope:  'directive with a transcluded scope only',
    dir_trans_scope:    'directive with a transcluded scope and a child scope',
    dir_trans_isolate:  'directive with a transcluded scope and an isolate scope',
    dir_multiple:       'multiple directives on one element',
    service:            'referencing data in a service',
    service_inject_dir: 'injecting a service into a directive',
    controller_as:      '"controller as"'
  },
  CODE_PRE  = '<div class="code"><pre>',
  CODE_POST = '</pre></div>';
function myTemplateEngine(filePath, options, callback) {
  fs.readFile(filePath, function (err, content) {
    if (err) { throw new Error(err); }
    var rendered = content.toString()
      .replace('#header#',            DEMO_HEADER)
      .replace('#footer#',            DEMO_FOOTER)
      .replace(/#demoPageTitle#/g,    DEMO_PAGE_TITLES[options.demoPage])
      .replace('#demoPage#',          options.demoPage)
      .replace(/#angularVersion#/g,   options.angularVersion)
      .replace(/#psb#/g,              'Peri$scope button')
      .replace(/#rb#/g,               'reset button')
      .replace(/\|([$-\w\.\(\)]+)\|/g,'<tt>$1</tt>');
    if(options.demoPage === 'ngview') {
      if( options.angularVersion === '1.0' ||
          options.angularVersion === '1.2' ) {
        rendered = rendered
          .replace('#ngroute-script#', '')
          .replace('#ngroute-module#', '');
      } else {
        rendered = rendered
          .replace('#ngroute-script#',
            '<script src="/bower_components/angularjs-route-'
            + options.angularVersion
            + '/angular-route.js"></script>')
          .replace('#ngroute-module#', "'ngRoute',");
      }
    }
    return callback(null, sideBySideCode(rendered));
  });
}
function sideBySideCode(content) {
  if( (content.indexOf('#code-start#') > -1 )
   && (content.indexOf('#code-end#') > -1) ) {
    var code = content.slice(
      content.indexOf('#code-start#') + '#code-start#'.length,
      content.indexOf('#code-end#'));
    code = CODE_PRE + code
      .replace(/<br>/g,   '')
      .replace(/<\/?i>/g, '')
      .replace(/</g,      '&lt;')
      .replace(/{{/g,     '{<span></span>{')
      .replace(/\n\s+$/,  '')
      + CODE_POST;
    content = content
      .replace('#code-start#', code)
      .replace('#code-end#', '');
  }
  return content;
}
