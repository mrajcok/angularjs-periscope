'use strict';
var gulp        = require('gulp'),
    open        = require('gulp-open'),
    nodemon     = require('gulp-nodemon'),
    jshint      = require('gulp-jshint'),
    livereload  = require('gulp-livereload'),
    SERVER_START_DELAY = 2000;

gulp.task('js-client', function() {
  return gulp.src('public/scripts/*.js')
    .pipe(livereload())
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});
// -----------------------------------------------------------------------------
gulp.task('js-demo-server', function() {
  return gulp.src(['demo-server.js','periscope.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});
gulp.task('demo-nodemon', function(cb) {
  var firstCall = true;
  return nodemon({ 
    script: 'demo-server.js',
    watch:  ['demo-server.js', 'periscope.js']
  })
  .on('change', ['js-demo-server'])
  .on('start', function() {
    if(firstCall) {
      firstCall = false;
      console.log('waiting', SERVER_START_DELAY + 'ms for server to start');
      setTimeout(function() {
        cb();
      }, SERVER_START_DELAY);
    }
  });
});
gulp.task('demo-views', function() {
  return gulp.src('views/*.html')
    .pipe(livereload());
});
gulp.task('demo-css', function() {
  return gulp.src('public/styles/demos.css')
    .pipe(livereload());
});
// the default target runs the "demo-server", which serves both the Peri$scope
// demo app (public/index.html) and a user-customizable app (public/app.html)
// as well as the Peri$scope server-side services that interact with GraphViz
// to draw the graphs and generate PNGs
gulp.task('default', ['demo-nodemon'], function() {
  console.log('opening browser...');
  gulp.src('public/index.html')
    .pipe(open('', {url: 'http://localhost:3000'} ));
  livereload.listen();
  gulp.watch('public/scripts/*.js', ['js-client']);
  gulp.watch(['public/*.html', 'views/*.html'], ['demo-views']);
  // Chome Workspaces and LivereLoad don't play nice together with
  // CSS files. What happens is that after you edit a CSS file in your editor,
  // LiveReload initiates a GET for the CSS file with a query string, e.g.,
  // http://localhost:3000/styles/demos.css?livereload=1426910880323
  // That query string seems disable the Workspaces functionality -- i.e.,
  // if you then try to edit the file in the Chrome Styles tab, the change
  // is not persisted to disk.  Bummer.
  // I prefer to edit CSS styles in Chrome's Styles tab rather than an editor,
  // so below I disable LiveReloading of the demos CSS file.
  // If you don't use Workspaces to edit CSS, you'll want to uncomment the
  // following line:
  //gulp.watch('public/styles/demos.css', ['demo-css']);
});
// -----------------------------------------------------------------------------
gulp.task('js-periscope-server', function() {
  return gulp.src(['periscope-server.js','periscope.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});
gulp.task('periscope-nodemon', function() {
  return nodemon({
    script: 'periscope-server.js',
    watch: ['periscope-server.js', 'periscope.js'],
  })
 .on('change', ['js-periscope-server']);
});
// This target runs a CORS-enabled server for the server-side Peri$scope
// services.  Use it to draw pictures of your app.
gulp.task('periscope-server', ['periscope-nodemon'], function() {
  gulp.watch(['periscope-server.js','periscope.js'], ['js-periscope-server']);
});
// -----------------------------------------------------------------------------
gulp.task('js-app-server', function() {
  return gulp.src(['app-server.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});
gulp.task('app-nodemon', function(cb) {
  var firstCall = true;
  return nodemon({
    script: 'app-server.js',
    watch: ['app-server.js'],
  })
  .on('change', ['js-app-server'])
  .on('start', function() {
    if(firstCall) {
      firstCall = false;
      console.log('waiting', SERVER_START_DELAY + 'ms for server to start');
      setTimeout(function() {
        cb();
      }, SERVER_START_DELAY);
    }
  });
});
// This target runs an app server, no Peri$scope services.
gulp.task('app-server', ['app-nodemon'], function() {
  console.log('opening browser...');
  gulp.src('public/app.html')
    .pipe(open('', {url: 'http://localhost:3000/app.html'} ));
  gulp.watch('public/scripts/*.js', ['js-client']);
});
// -----------------------------------------------------------------------------
var markdown;
gulp.task('markdown', function() {
  if(!markdown)  markdown = require('gulp-markdown');
  return gulp.src('README.md')
    .pipe(markdown())
    .pipe(gulp.dest('public'))
    .pipe(livereload());
});
// Use this target for modifying the README.md file.
gulp.task('readme', ['demo-nodemon','markdown'], function () {
  gulp.src('README.md')
    .pipe(open('', {url: 'http://localhost:3000/README.html'}));
  livereload.listen();
  gulp.watch(['README.md'], ['markdown']);
});
