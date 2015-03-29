# ![Peri$scope][logo]

A tool for visualizing [AngularJS](http://angularjs.org) prototypal $scope
inheritance, $scope data structures, and services.

[logo]:          https://github.com/mrajcok/angularjs-periscope/raw/master/public/images/periscope_large.png
[key]:           https://github.com/mrajcok/angularjs-periscope/raw/master/public/images/key.png
[ngrepeat]:      https://github.com/mrajcok/angularjs-periscope/raw/master/public/images/ngrepeat.png
[isolate_scope]: https://github.com/mrajcok/angularjs-periscope/raw/master/public/images/isolate_scope.png
[service]:       https://github.com/mrajcok/angularjs-periscope/raw/master/public/images/service.png
[controller_as]: https://github.com/mrajcok/angularjs-periscope/raw/master/public/images/controller_as.png

## Screenshots

![key][key]

![ng-repeat][ngrepeat]

**Fig. 1** - ng-repeat

![isolate scope][isolate_scope]

**Fig. 2** - isolate scope

![service][service]

**Fig. 3** - service

!["controller as"][controller_as]

**Fig. 4** - "controller as"

## Installation

Install [GraphViz](http://graphviz.org/Download.php).<br>
Install [Node.js](https://nodejs.org/).

````
$ sudo npm install -g bower
$ git clone git://github.com/mrajcok/angularjs-periscope
$ cd angularjs-periscope
$ npm install --production  # note, this will also run bower install
````

If bower says "Unable to find a suitable version for angular, please choose one:",
select the latest angular version shown.

If the GraphViz tools (e.g., `dot`) are not in your path, edit `GRAPHVIZ_PATH`
(around line 7) in file `periscope.js`.

To start a server and view the demo pages:
- `$ node demo-server.js`
- open http://localhost:3000/

To visualize some of your own AngularJS snippets:
- edit `public/app.html` and `public/scripts/app.js` with some of your own code
- `$ node demo-server.js`
- open http://localhost:3000/app.html

To run a CORS-enabled Peri$scope server alongside your existing server, to
visualize your app:
- copy `public/scripts/periscopeModule.js` to a directory your server can access
- add to your HTML: `<script src="/path_to_copy_of/periscopeModule.js"></script>`
- add to your HTML: `<div periscope></div>`
- `$ node periscope-server.js`
- open up a page on your server
- click the "CORS" checkbox to send Peri$scope requests to the Peri$scope server<br>
  (Note that the default port for the CORS-enabled Peri$scope server is 3300.)

Note that trying to visualize your entire app is probably not a good idea.
Normally you'll just want to put the salient pieces of your app into a
test project, and run Peri$scope against that.

---

If you want to help contribute to the Peri$scope project, follow the installation
instructions below instead:<br>
(If you already performed the above installation, no problem... 
just install gulp globally, then run `npm install`, then you can run
the gulp targets mentioned below.)

Install [GraphViz](http://graphviz.org/Download.php).<br>
Install [Node.js](https://nodejs.org/).

````
$ sudo npm install -g gulp
$ sudo npm install -g bower
$ git clone git://github.com/mrajcok/angularjs-periscope
$ cd angularjs-periscope
$ npm install  # note, this will also run bower install
````

If bower says "Unable to find a suitable version for angular, please choose one:",
select the latest angular version shown.

If the GraphViz tools (e.g., `dot`) are not in your path, edit `GRAPHVIZ_PATH`
(around line 7) in file `periscope.js`.

If you want live reloading of HTML and JavaScript changes, install the
[LiveReload browser plugin](http://help.livereload.com/kb/general-use/browser-extensions).

To start a server and view the demo pages:
- `$ gulp  # this should automatically open the demo home page and enable LiveReload server-side`
  <br>(if the home page doesn't load, open http://localhost:3000/)
- enable LiveReload in your browser

With LiveReload enabled:
- if you change a server file (`demo-server.js` or `periscope.js`), the server will
restart, but the browser will (purposely) not reload
- if you change a `views/*.html` file or a `public/scripts/*.js` file, the browser
will reload

I recommend using 
[Workspaces](https://developer.chrome.com/devtools/docs/workspaces)
to edit CSS directly inside Chrome's Styles tab,
rather than using LiveReload, since we're not using Less or Sass here.
However, if you'd rather edit the demo CSS file in your favorite editor and have
LiveReload reload changes, uncomment the last `gulp.watch(...)` line in
`gulpfile.js` for the `default` target.

To run a CORS-enabled Peri$scope server alongside your existing server, to
visualize your app:
- copy `public/scripts/periscopeModule.js` to a directory your server can access
- add to your HTML: 
  - `<script src="/path_to_copy_of/periscopeModule.js"></script>`
  - `<div periscope></div>`
- `$ gulp periscope-server`
- open up a page on your server
- click the "CORS" checkbox to send Peri$scope requests to the Peri$scope server<br>
  (The default port for the CORS-enabled Peri$scope server is 3300.  If you want
   to use a different port, change `SERVER_PORT` in `periscope-server.js` and
   constant `corsServerUrl` in `periscopeModule.js`.)

## Purpose

A picture is worth 1,000 words.  This is certainly true regarding how
AngularJS uses prototypal inheritance with scopes.

Use Peri$scope to visualize the following:
- $scope relationships: inheritance (all the way up to the $rootScope) and siblings
- $scope properties/data structures
- services (just their properties/data structures)
- changes to $scope and service properties over time
- watch listeners (experimental feature)

Use Peri$scope to
- generate pictures to better answer questions on StackOverflow (as you'll
  read in the next section, that's how Peri$scope got started)
- learn about prototypal inheritance
- see how AngularJS has changed between releases (e.g., bring up the
  "transcluded scope with new isolate scope" demo page in Angular v1.2
  and Angular v1.4 and notice the difference in the graphs)
- find bugs in your code (e.g., you spelled some scope property name incorrectly
  in a child scope, and you were unable to figure this out until Peri$scope
  drew you a picture)
- show your coworkers (with a picture!) the real problem :)
  
Most of the Peri$scope features are explained in the demo pages, so we won't
repeat them here, except for one:
- To find the scope `$id` associated with an element, select the element with
  the browser's dev tools, then in the console type:<br>
  `scopeId($0)`
  `scopeId()` is a global function that Peri$scope defines.

To learn more about prototypal scope inheritance, see also AngularJS wiki page
[Understanding Scopes](https://github.com/angular/angular.js/wiki/Understanding-Scopes).

## History

I/Mark started writing Peri$scope as a result of trying to answer a bunch of
AngularJS v1.0 questions on StackOverflow back in 2012.  I started adding
hack after hack to support new features quickly.  A few people asked about it,
and I wanted to learn some Node.js so finally, in late 2014 I began the rewrite.
I switched the server side from Python to Node.js,
and I cleaned up and enhanced the client side, which now uses a good bit of
recursion.
It turned out to be more work than I anticipated (that always happens, right?)
However, it is much more useable now than it was in 2012, but it has not been
tested much.  YMMV.  Contributions are welcomed.

## Possible Future Enhancements

- Add controller names to scopes created with ng-controller.
  This should be possible with `angular.module(moduleName)._invokeQueue`.
- Create GraphViz nodes for `FormControllers` and `NgModelControllers`.
- If an array has more than, say, 10 elements, only show the first 5?
- Use a different color for a new property vs a changed value.
- Add to the ng-repeat demo page an example using `track by ...`

## Known Issues
- Objects of type Date, RegExp, Error and Function are not referenced properly
  like arrays and objects are.
- The key/legend only renders correctly with the `dot` rendering engine.
- If a child scope and a parent scope both inject a service, the child scope may
  incorrectly reference the parent scope service property rather than point to
  the service.  The "find x in ancestor" code should probably be changed
  to match the deepest match, not the first/shallowest match.
- If a scope property is an object and one of its properties references
  a service or ancestor property, `_ref...` shows up rather than a reference.
- Sometimes Graphviz may crash.  E.g.,
````
ERR! post Error: Command failed:
ERR! post     at ChildProcess.exithandler (child_process.js:648:15)
ERR! post     at ChildProcess.emit (events.js:98:17)
ERR! post     at maybeClose (child_process.js:756:16)
ERR! post     at Process.ChildProcess._handle.onexit (child_process.js:823:5)
ERR! post  execFile error: %s { [Error: Command failed: ] killed: false, code: -1073741819, signal: null }
````
Try selecting a different rendering engine like `sfdp` to see if the problem
really is GraphViz.  If it is, report it to the GraphViz project, not this one.

## Design Notes
- Prototypal inheritance, `$parent`, and `$$nextSibling` edges are always drawn
  from the top row of the scope (GraphViz port `proto`).  However, the head of
  the edge is free to connect to the destination node wherever. This makes for much
  nicer layouts then attaching the edge to the top row of the destination node.
- `periscope.js` adds a `p` prefix to all GraphViz port names, to guard against
  JavaScript property names that start with a number (but who would do that?).
- GraphViz ports are quoted, to guard against JavaScript names that use odd
  characters.
- References start with `__ref`, followed by
  - `p|` for primitive (only used with @ and =)
  - `a|` for array
  - `o|` for object
  - `s|` for service
  - `-|` for isolate @ or = or & with no ancestor match.<br>
  Followed by `scope<id>:` or `<serviceName>:`.<br>
  Followed by array and object names, separated by `_`.<br>
  Array elements are denoted via `/n`, where _n_ is the zero-based index.<br>
  For @ isolate bindings, the value follows: `|<value>`.<br>
  Isolate scope bindings end with `|@` or `|=` or `|&`.<br>
  Examples:
  - `__refs|myService`
  - `__refa|myService:serviceArray/3_aa`,
  - `__ref-|scope2:myObj_myArray/0|my name is Mark|@`
- `_type` indicates the type of scope, or the controller name.

- The server that drives the demo pages (`demo-server.js`) has a very small
  template engine.
  A template engine is required to insert the user-selected version of AngularJS
  into each demo page.  The engine was then expanded to include the common
  headear and footer boilerplate HTML, some `#...#` variable substitutions,
  and then (as a late feature) the side-by-side code, which I feel added a lot
  to the demos because now we can see the HTML that is generating the demo without
  having to view the source.

## Unit Tests

Where are the unit tests, you ask?<br>
Well, you didn't write them yet :)  Seriously, if someone would like to tackle
this, it would be appreciated.  This hasn't been given this too much thought, but
here are a few ideas for the motivated individual:
the unit tests could bring up demo pages, generate a graph, compare/diff
the GraphViz text output to some stored/known-good output.  Click some
buttons/links on the page (use Selenium?), generate another graph, and do
another comarison/diff to another stored file.

## Miscellaneous

Use unminified AngularJS files if you want to see the actual function names
of the watch listeners.

There is a `readme` gulp target.  If you plan on making
a lot of edits to this README.md file, you might want to try it
(or you might just want to take a look and see how it works so you can add this
capability to your own projects):
- `$ gulp readme  # this should automatically open public/README.html and enable LiveReload`
  <br>(if the page doesn't load, open http://localhost:3000/README.html)
- enable LiveReload in your browser
