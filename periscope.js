'use strict';
// server-side periscope code
var rootScopeId            = null,  // we'll get these values from the browser
  refPrefix                = null,
  GRAPHVIZ_PATH            = '',
  // if the graphviz executables aren't in your path, set the path:
  //GRAPHVIZ_PATH            = '/usr/local/bin/',
  //GRAPHVIZ_PATH            = 'C:/Program Files (x86)/Graphviz2.38/bin/',
  ARTIFACTS_DIR            = 'artifacts',
  IMAGES_DIR               = 'public/gv_images',
  GRAPHVIZ_FILE_SUFFIX     = '.gv',
  IMAGE_FILE_SUFFIX        = '.png',
  PROTO_LINE_STYLE         = 'dashed',
  // http://www.graphviz.org/doc/info/colors.html
  PARENT_LINE_COLOR        = 'royalblue2',
  SIBLING_LINE_COLOR       = 'forestgreen',
  SIBLING_LINE_STYLE       = 'solid',
  UNKNOWN_REF_BGCOLOR      = '#fbb4ae',
  SCOPE_BGCOLOR            = 'beige',
  ROOT_SCOPE_BGCOLOR       = SCOPE_BGCOLOR,
  MAIN_SCOPE_BGCOLOR       = SCOPE_BGCOLOR,
  SERVICE_BGCOLOR          = '#e5d8bd',
  SCOPE_BORDER_COLOR       = 'gray70',
  ROOT_SCOPE_BORDER_COLOR  = 'gray70',
  MAIN_SCOPE_BORDER_COLOR  = 'gray50',
  DIFF_BGCOLOR             = 'khaki1',
  NEW_NODE_COLOR           = 'tan1',  // new scope or new service
  PRIMITIVE_BGCOLOR        = 'gray88',
  ARRAY_BGCOLOR            = 'lightblue2',
  ARRAY_BORDER_COLOR       = 'steelblue2',
  OBJECT_BGCOLOR           = 'thistle2',
  OBJECT_BORDER_COLOR      = 'plum3',
  FUNCTION_BGCOLOR         = '#ccebc5', // 'darkseagreen2',
  WATCHERS_BGCOLOR         = 'lightgoldenrod2',
  WATCHERS_BORDER_COLOR    = 'lightgoldenrod3',
  REF_LINE_STYLE           = 'dashed',  // 'dotted',
  REF_LINE_COLORS          = {};  // darker versions
  REF_LINE_COLORS[PRIMITIVE_BGCOLOR] = SCOPE_BORDER_COLOR;
  REF_LINE_COLORS[ARRAY_BGCOLOR]     = ARRAY_BORDER_COLOR;
  REF_LINE_COLORS[OBJECT_BGCOLOR]    = OBJECT_BORDER_COLOR;
  REF_LINE_COLORS[SERVICE_BGCOLOR]   = 'peachpuff3';

  var GV_ENGINE_TEMPLATES = {
    dot:    'digraph {\nrankdir=LR\nnodesep=0.05\n'
      + 'node [fontname="{font}", fontsize={fontSize}, '
      + 'margin="0.02, 0.05", height="0.2" ]\n',
    neato: 'digraph {\noverlap=prism;\n'
      + 'node [fontname="{font}", fontsize={fontSize} ]\n',
    fdp:   'digraph {\n'
      + 'node [fontname="{font}", fontsize={fontSize} ]\n',
    sfdp:  'digraph {\n'
      + 'node [fontname="{font}", fontsize={fontSize} ]\n',
    circo: 'digraph {\n'
      + 'node [fontname="{font}", fontsize={fontSize} ]\n'
  },
  // note, unlike HTML5, GraphViz requires closing tags for elements
  GV_KEY = 'subgraph cluster_01 {\ncolor=white;\n'
    + 'key [label=<<table border="0" cellpadding="2" cellspacing="0" cellborder="0">'
    + '<tr><td align="right" port="pi">prototypal inheritance</td></tr>'
    + '<tr><td align="right" port="par">$parent</td></tr>'
    + '{0}'
    + '</table>>]\n'
    + 'key2 [label=<<table border="0" cellpadding="2" cellspacing="0" cellborder="0">'
    + '<tr><td port="pi">&nbsp;</td></tr>'
    + '<tr><td port="par">&nbsp;</td></tr>'
    + '{1}'
    + '</table>>]\n'
    + 'key:pi:e  -> key2:pi:w  [style=' + PROTO_LINE_STYLE   + ']\n'
    + 'key:par:e -> key2:par:w [color=' + PARENT_LINE_COLOR  + ']\n'
    + '{2}'
    + '}',
  GV_KEY_ITEMS = {
    sibling: ['<tr><td align="right" port="sib">$$nextSibling</td></tr>',
      '<tr><td port="sib">&nbsp;</td></tr>',
      'key:sib:e -> key2:sib:w [color=' + SIBLING_LINE_COLOR + ']\n' ],
    primitive: [ '<tr><td align="right" port="refp">primitive reference</td></tr>',
      '<tr><td port="refp">&nbsp;</td></tr>',
      'key:refp:e -> key2:refp:w [color="' + REF_LINE_COLORS[PRIMITIVE_BGCOLOR]
        + '", style=' + REF_LINE_STYLE + ']\n' ],
    array: [ '<tr><td align="right" port="refa">array reference</td></tr>',
      '<tr><td port="refa">&nbsp;</td></tr>',
      'key:refa:e -> key2:refa:w [color="' + REF_LINE_COLORS[ARRAY_BGCOLOR]
        + '", style=' + REF_LINE_STYLE + ']\n' ],
    object: [ '<tr><td align="right" port="refo">object reference</td></tr>',
      '<tr><td port="refo">&nbsp;</td></tr>',
      'key:refo:e -> key2:refo:w [color="' + REF_LINE_COLORS[OBJECT_BGCOLOR]
        + '", style=' + REF_LINE_STYLE + ']\n' ],
    service: [ '<tr><td align="right" port="refs">service reference</td></tr>',
      '<tr><td port="refs">&nbsp;</td></tr>',
      'key:refs:e -> key2:refs:w [color="' + REF_LINE_COLORS[SERVICE_BGCOLOR]
        + '", style=' + REF_LINE_STYLE + ']\n' ]
  },
  GV_SCOPE_NODE_PROPERTIES = '/* scopes */\nnode [shape=plaintext]',
  GV_MAIN_SCOPE_NODE       = '\nScope [fillcolor=' + MAIN_SCOPE_BGCOLOR
    + ', color= ' + MAIN_SCOPE_BORDER_COLOR
    + ',shape=box, style=filled, label="Scope"]\n',
  GV_SCOPE_NODE_TEMPLATE   = '\n{name} [label=<<table bgcolor="' + SCOPE_BGCOLOR
    + '" color="' + SCOPE_BORDER_COLOR
    + '" border="0" cellborder="1" cellpadding="2" '
    + 'cellspacing="0">\n<tr><td colspan="2" port="topRow">[ {label} ]</td>'
    + '</tr>\n{rows}</table>>]\n',
  GV_SERVICE_NODE_TEMPLATE   = '\n{name} [label=<<table bgcolor="' + SERVICE_BGCOLOR
    + '" color="' + SCOPE_BORDER_COLOR
    + '" border="0" cellborder="1" cellpadding="2" '
    + 'cellspacing="0">\n<tr><td colspan="2" port="topRow">[ service {label} ]</td>'
    + '</tr>\n{rows}</table>>]\n',
  GV_ARRAY_TABLE_TEMPLATE  = '<table border="0" cellpadding="2" cellspacing="0" '
    + 'cellborder="1" bgcolor="' + ARRAY_BGCOLOR + '" color="'
    + ARRAY_BORDER_COLOR + '"><tr>{cells}</tr></table>',
  GV_OBJECT_TABLE_TEMPLATE = '<table border="0" cellpadding="2" cellspacing="0" '
    + 'cellborder="1" bgcolor="' + OBJECT_BGCOLOR + '" color="'
    + OBJECT_BORDER_COLOR + '">{rows}</table>',
  GV_WATCHERS_TEMPLATE     = '<tr><td>&#36;$watchers:</td><td bgcolor="'
    + WATCHERS_BGCOLOR + '">'
    + '<table border="0" cellpadding="2" cellspacing="0" cellborder="1"'
    + ' bgcolor="' + WATCHERS_BGCOLOR + '" color="' + WATCHERS_BORDER_COLOR + '">'
    + '<tr>{cells}</tr></table></td></tr>',
  GV_EXTRA_CELL_PADDING    = ' cellpadding="4"'  // used to enlarge array and
                                                 // object boxes if there is a diff
  ;
var express   = require('express'),
  router      = express.Router(),
  jsonParser  = require('body-parser').json(),
  glob        = require('glob'),
  fs          = require('fs'),
  execFile    = require('child_process').execFile,
  log         = require('npmlog'),
  assert      = require('assert');

log.level     = 'info';  // use 'verbose' for lots of output
//log.level     = 'verbose';  // use 'verbose' for lots of output
// http://stackoverflow.com/a/4579228/215945
String.prototype.startsWith = function(prefix) {
  return this.lastIndexOf(prefix, 0) === 0;
};
function removeImageAndGraphvisFiles(instanceId) {
  if(instanceId) {
    glob.sync(IMAGES_DIR + '/' + instanceId + '_*' + IMAGE_FILE_SUFFIX)
      .forEach(function(f) { fs.unlinkSync(f); });
    glob.sync(ARTIFACTS_DIR + '/' + instanceId + '_*' + GRAPHVIZ_FILE_SUFFIX)
      .forEach(function(f) { fs.unlinkSync(f); });
  } else {
    glob.sync(IMAGES_DIR + '/*' + IMAGE_FILE_SUFFIX)
      .forEach(function(f) { fs.unlinkSync(f); });
    glob.sync(ARTIFACTS_DIR + '/*' + GRAPHVIZ_FILE_SUFFIX)
      .forEach(function(f) { fs.unlinkSync(f); });
  }
}
function stateFilename(instanceId) {
  return ARTIFACTS_DIR + '/' + instanceId + '_state.json';
}
function saveState(instanceId, scopes, services) {
  try {
    fs.writeFileSync(stateFilename(instanceId), JSON.stringify(
      {scopes: scopes, services: services} ));
  } catch(e) {
    log.error('ss', 'unable to save state to %s: %s', stateFilename(instanceId), e);
  }
}
function readPreviousState(instanceId, previousScopes, previousServices) {
  var previousState;
  try {
    previousState = JSON.parse(fs.readFileSync(stateFilename(instanceId)));
  } catch(e) {
    return false;
  }
  // create maps of previous scopes and servies for easy lookup
  previousState.scopes.forEach(function(scope) {
    previousScopes[scope.$id] = scope;
  });
  if(previousState.services !== null) {
    previousState.services.forEach(function(service) {
      previousServices[service.name] = service;
    });
  }
  return true;
}
function removeStateFiles(instanceId) {
  if(instanceId) {
    glob.sync(stateFilename(instanceId)).forEach(function(f) {
    fs.unlinkSync(f); });
  } else {
    glob.sync(ARTIFACTS_DIR + '/*_state.json').forEach(function(f) {
    fs.unlinkSync(f); });
  }
}
function getType(value) {
  // note, since on the browser side we converted to JSON, we lose
  // type information for Functions, Dates, Errors, and RegExps
  if(value === 'function()')       { return 'function';  }
  if( !(value instanceof Object) ) { return 'primitive'; } // assume primitive
  if(Array.isArray(value))         { return 'array';     }
  return 'object';
}
function generateArray(array, previousArray, portLabel) {
  // previousArray may be null
  var cells       = '',
    arraysDiffer  = false,
    cell, generateResult;
  log.verbose('ga', 'array %j previousArray %j', array, previousArray);
  if(previousArray && (previousArray.length !== array.length) ) {
    arraysDiffer = true;
  }
  for(var i = 0, arrayLen = array.length; i < arrayLen; i++) {
    var arrayItem           = array[i],
      arrayItemType         = getType(arrayItem),
      previousArrayItemType = null,
      extraCellPadding      = '',
      newPortLabel          = portLabel + '/' + i,
      arrayItemBgcolor;
    if( (previousArray) &&
        (i < previousArray.length) ) {
      previousArrayItemType = getType(previousArray[i]);
    }
    log.verbose('ga', ' arrayItemType: %s arrayItem: %j', arrayItemType, arrayItem);
    cell = '<td port="' + newPortLabel + '" bgcolor="';
    switch(arrayItemType) {
    case 'primitive':
      arrayItemBgcolor = PRIMITIVE_BGCOLOR;
      if(previousArray) {
        if( (previousArrayItemType !== 'primitive') ||
            (previousArray[i]      !== arrayItem) ) {
          // different type or different value
          arrayItemBgcolor = DIFF_BGCOLOR;
          arraysDiffer     = true;
        }
      }
      cell += arrayItemBgcolor + '">' + arrayItem;
      break;
    case 'array':
      // nested array
      arrayItemBgcolor = ARRAY_BGCOLOR;
      if(previousArray) {
        if(previousArrayItemType === 'array') {
          generateResult = generateArray(arrayItem, previousArray[i], newPortLabel);
          if(generateResult.arraysDiffer) {
            arrayItemBgcolor = DIFF_BGCOLOR;
            extraCellPadding = GV_EXTRA_CELL_PADDING;
            arraysDiffer     = true;
          }
        } else {  // different type
          generateResult   = generateArray(arrayItem, null, newPortLabel);
          arrayItemBgcolor = DIFF_BGCOLOR;
          extraCellPadding = GV_EXTRA_CELL_PADDING;
          arraysDiffer     = true;
        }
      } else {
        generateResult = generateArray(arrayItem, null, newPortLabel);
      }
      cell += arrayItemBgcolor + '"' + extraCellPadding + '>' + generateResult.gv;
      break;
    case 'object':
      // nested object
      arrayItemBgcolor = OBJECT_BGCOLOR;
      if(previousArray) {
        if(previousArrayItemType === 'object') {
          generateResult = generateObject(arrayItem, previousArray[i],
            newPortLabel);
          if(generateResult.objectsDiffer) {
            arrayItemBgcolor = DIFF_BGCOLOR;
            extraCellPadding = GV_EXTRA_CELL_PADDING;
            arraysDiffer     = true;
          }
        } else {  // different type
          generateResult   = generateObject(arrayItem, null, newPortLabel);
          arrayItemBgcolor = DIFF_BGCOLOR;
          extraCellPadding = GV_EXTRA_CELL_PADDING;
          arraysDiffer     = true;
        }
      } else {
        generateResult = generateObject(arrayItem, null, newPortLabel);
      }
      cell += arrayItemBgcolor + '"' + extraCellPadding + '>' + generateResult.gv;
      break;
    case 'function':
      cell += FUNCTION_BGCOLOR + '">function()';
      break;
    default:
      assert(false, 'generateArray logic error: unknown type');
    }
    // Add a graphviz port to the array element.  An ngrepeat scope may
    // end up pointing to this element, so a "port" would be needed
    // to reference it.
    cell  += '</td>';
    cells += cell;
    log.verbose('ga', ' cell: %s', cell);
  }
  if(cells === '') {
    // empty array, show one empty cell
    cells = '<td></td>';
  }
  log.verbose('ga', ' array cells: %s', cells);
  assert(previousArray !== null || arraysDiffer === false, 'generateArray logic error');
  return { gv:            GV_ARRAY_TABLE_TEMPLATE.replace('{cells}', cells),
           arraysDiffer:  arraysDiffer };
}
function generateObject(object, previousObject, portLabel) {
  // previousObj may be null
  var objectRows  = '',
    objectsDiffer = false,
    generateResult;
  log.verbose('go', 'object %j previousObject', object, previousObject);
  if(previousObject) {
    // check for deleted properties
    objectsDiffer = Object.keys(previousObject).some(function(propertyName) {
      return !(propertyName in object);
    });
  }
  Object.keys(object).sort().forEach(function(propertyName) {
    var propertyValue   = object[propertyName],
      valueType         = getType(propertyValue),
      previousValueType = null,
      newProperty       = false,
      objectRow         = '<tr><td>' + propertyName + ':</td>',
      extraCellPadding  = '',
      newPortLabel      = portLabel + '_' + propertyName,
      valueBgcolor;
    if(previousObject) {
      if(propertyName in previousObject) {
        previousValueType = getType(previousObject[propertyName]);
      } else {
        newProperty   = true;
        // color background of propertyName only
        objectRow     = '<tr><td bgcolor="' + DIFF_BGCOLOR + '">' + propertyName + ':</td>';
        objectsDiffer = true;
      }
    }
    log.verbose('go', ' propertyName: %s valueType: %s propertyValue: %j', propertyName, valueType, propertyValue);
    objectRow += '<td port="' + newPortLabel + '" bgcolor="';
    switch(valueType) {
    case 'primitive':
      valueBgcolor = PRIMITIVE_BGCOLOR;
      if(previousObject && !newProperty) {
        if( (previousValueType   !== 'primitive') ||
            (previousObject[propertyName] !== propertyValue) ) {
          // different type or different value
          valueBgcolor  = DIFF_BGCOLOR;
          objectsDiffer = true;
        }
      }
      objectRow += valueBgcolor + '">' + propertyValue;
      break;
    case 'array':
      // nested array
      valueBgcolor = ARRAY_BGCOLOR;
      if(previousObject) {
        if(previousValueType === 'array') {
          generateResult = generateArray(propertyValue,
            previousObject[propertyName], newPortLabel);
          if(generateResult.arraysDiffer) {
            valueBgcolor     = DIFF_BGCOLOR;
            extraCellPadding = GV_EXTRA_CELL_PADDING;
            objectsDiffer    = true;
          }
        } else {  // different type
          generateResult   = generateArray(propertyValue, null, newPortLabel);
          valueBgcolor     = DIFF_BGCOLOR;
          extraCellPadding = GV_EXTRA_CELL_PADDING;
          objectsDiffer    = true;
        }
      } else {
        generateResult = generateArray(propertyValue, null, newPortLabel);
      }
      objectRow += valueBgcolor + '"' + extraCellPadding + '>' + generateResult.gv;
      break;
    case 'object':
      // nested object
      valueBgcolor = OBJECT_BGCOLOR;
      if(previousObject) {
        if(previousValueType === 'object') {
          generateResult = generateObject(propertyValue, 
            previousObject[propertyName], newPortLabel);
          if(generateResult.objectsDiffer) {
            valueBgcolor     = DIFF_BGCOLOR;
            extraCellPadding = GV_EXTRA_CELL_PADDING;
            objectsDiffer    = true;
          }
        } else {  // different type
          generateResult = generateObject(propertyValue, null, newPortLabel);
          valueBgcolor     = DIFF_BGCOLOR;
          extraCellPadding = GV_EXTRA_CELL_PADDING;
          objectsDiffer    = true;
        }
      } else {
        generateResult = generateObject(propertyValue, null, newPortLabel);
      }
      objectRow += valueBgcolor + '"' + extraCellPadding + '>' + generateResult.gv;
      break;
    case 'function':
      objectRow += FUNCTION_BGCOLOR + '">function()';
      break;
    default:
      assert(false, 'generateObject() logic error: unknown type');
    }
    objectRow += '</td></tr>';
    log.verbose('go', ' objectRow: %s', objectRow);
    objectRows += objectRow;
  });
  if(objectRows === '') {
    // empty object, show one empty cell
    objectRows = '<tr><td></td></tr>';
  }
  log.verbose('go', ' object rows: %s', objectRows);
  assert(previousObject !== null || objectsDiffer === false, 
    'generateObject() logic error');
  return { gv:            GV_OBJECT_TABLE_TEMPLATE.replace('{rows}', objectRows),
           objectsDiffer: objectsDiffer };
}
function mainScopeVisibility(showMainScope, graph, edges) {
  if(showMainScope) {
    graph += GV_MAIN_SCOPE_NODE;
  } else {
    var edgesToScopeNodeCount       = 0,
      rootScopeToScopeNodeEdgeIndex = null;
    for(var i = 0, edgesLen = edges.length; i < edgesLen; i++) {
      var edge = edges[i];
      if(edge.indexOf('-> Scope') !== -1) {
        edgesToScopeNodeCount++;
        if( (edge.indexOf('rootScope:topRow -> Scope') !== -1) ||
            (edge.indexOf('rootScope -> Scope')        !== -1) ) {
          rootScopeToScopeNodeEdgeIndex = i;
        }
      }
    }
    if(edgesToScopeNodeCount === 1) {
      // only rootScope links to Scope, so don't bother showing Scope node
      edges.splice(rootScopeToScopeNodeEdgeIndex, 1);
    } else {
      graph += GV_MAIN_SCOPE_NODE;
    }
  }
  return graph;
}
function generateServiceNodes(services, previousServices, options, nodes) {
  if(services === null) { return; }
  services.forEach(function(service) {
    var rows              = [],
      newService          = false,
      graphvizServiceNode = GV_SERVICE_NODE_TEMPLATE
        .replace('{name}',  service.name)
        .replace('{label}', service.name);
    if(options.diff) {
      if(service.name in previousServices) {
        // check for at least one deleted property
        var previousService = previousServices[service.name].obj;
        for(var propertyName in previousService) {
          if( (previousService.hasOwnProperty(propertyName)) &&
            !(propertyName in service.obj) ) {
            // a property has been deleted;  color top row
            graphvizServiceNode = graphvizServiceNode.replace('colspan="2"',
              'colspan="2" bgcolor="' + DIFF_BGCOLOR + '"');
            break;
          }
        }
      } else {
        // new service??; color top row
        log.warn('gsn', 'new service %s?', service.name);
        newService = true;
        graphvizServiceNode = graphvizServiceNode.replace('colspan="2"',
          'colspan="2" bgcolor="' + NEW_NODE_COLOR + '"');
      }
    }
    Object.keys(service.obj).filter(function(propertyName) {
      return !(/^[$]/.test(propertyName));  // skip if starts with $
    }).sort().forEach(function(propertyName) {
      var propertyValue       = service.obj[propertyName],
        propertyType          = getType(propertyValue),
        previousPropertyValue = null,
        previousPropertyType  = null,
        propertyNameBgcolor   = '',
        propertyValueBgcolor  = '',
        diffValues            = false,
        extraCellPadding      = '',
        portLabel             = 'p' + propertyName,
        generateResult;
      log.verbose('gsn', 'type: %s name: %s propertyValue: %j',
        propertyType, propertyName, propertyValue);
      if( (options.diff)                     &&
          (service.name in previousServices) &&
          (propertyName in previousService) ) {
        previousPropertyValue = previousService[propertyName];
        previousPropertyType  = getType(previousPropertyValue);
      }
      if(options.diff && !newService) {
        if(previousPropertyValue !== null) {
          if(previousPropertyType === propertyType) {
            // same type;  diff the values (a bit later)
            diffValues = true;
          } else {
            // new type for existing property;  highlight value
            propertyValueBgcolor = DIFF_BGCOLOR;
          }
        } else {
          // new property in an existing service;  highlight property name
          propertyNameBgcolor = DIFF_BGCOLOR;
        }
      }
      switch(propertyType) {
      case 'primitive':
        if(diffValues && (previousPropertyValue !== propertyValue) ) {
          propertyValueBgcolor = DIFF_BGCOLOR;
        } else {
          propertyValueBgcolor = PRIMITIVE_BGCOLOR;
        }
        rows.push('<tr>'
          + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
            + '>' + propertyName + ':</td>'
          + '<td port="' + portLabel + '" '
            + 'bgcolor="' + propertyValueBgcolor + '">' + propertyValue + '</td>'
          + '</tr>');
        break;
      case 'array':
        generateResult = generateArray(propertyValue,
          previousPropertyType === 'array'
            ? previousPropertyValue
            : null,
          portLabel);
        if(diffValues && generateResult.arraysDiffer) {
          propertyValueBgcolor = DIFF_BGCOLOR;
          extraCellPadding     = GV_EXTRA_CELL_PADDING;
        } else {
          propertyValueBgcolor = ARRAY_BGCOLOR;
        }
        rows.push('<tr>'
          + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
            + '>' + propertyName + ':</td>'
          + '<td port="'  + portLabel + '" '
            + 'bgcolor="' + propertyValueBgcolor + '"' + extraCellPadding + '>'
            + generateResult.gv + '</td>'
          + '</tr>');
        break;
      case 'object':
        generateResult = generateObject(propertyValue,
          previousPropertyType === 'object'
            ? previousPropertyValue
            : null,
          portLabel);
        if(diffValues && generateResult.objectsDiffer) {
          propertyValueBgcolor = DIFF_BGCOLOR;
          extraCellPadding     = GV_EXTRA_CELL_PADDING;
        } else {
          propertyValueBgcolor = OBJECT_BGCOLOR;
        }
        rows.push('<tr>'
          + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
            + '>' + propertyName + ':</td>'
          + '<td port="' + portLabel + '" '
            + 'bgcolor="' + propertyValueBgcolor + '"' + extraCellPadding + '>'
            + generateResult.gv + '</td>'
          + '</tr>');
        break;
      default:
        assert(false,'generateGraph() logic error: unknown type');
      }
    });
    nodes.push(graphvizServiceNode.replace('{rows}', rows.join('\n')));
  });
}
function generateGraph(scopes, previousScopes, services, previousServices, options) {
  var graph,
    nodes      = [],
    edges      = [],
    scopesById = {},
    keyItems   = {},
    directiveTranscludedScopes = {};
  // Create a map of scopes by ID for faster lookup.
  // Create edges for scope siblings.
  // Create a map of directive transcluded scopes.
  scopes.forEach(function(scope) {
    scopesById[scope.$id] = scope;
    if('$$nextSibling' in scope) {
      keyItems.sibling = true;
      var scope1Name = 'scope' + scope.$id,
          scope2Name = 'scope' + scope.$$nextSibling;
      edges.push(scope1Name + ':topRow -> ' + scope2Name + ' [color='
        + SIBLING_LINE_COLOR + ', style=' + SIBLING_LINE_STYLE + ']');
      if( (scope._proto === 'Scope') && ('$parent' in scope) ) {
        // isolate scope, so $$nextSibling is a transcluded scope
        directiveTranscludedScopes[scope.$$nextSibling] = 1;
      }
    }
  });
  log.verbose('gg', 'directiveTranscludedScopes: %j', directiveTranscludedScopes);
  scopes.forEach(function(scope) {
    var scopeId     = scope.$id,
      scopeName     = 'scope' + scopeId,
      scopeLabel    = 'scope',
      ngrepeatScope = false,
      newScope      = false,
      graphvizScope;
    if(scopeId === rootScopeId) {
      scopeName = 'rootScope';
      graphvizScope = GV_SCOPE_NODE_TEMPLATE.replace('{name}', scopeName)
        .replace('{label}', '$rootScope')
        .replace(SCOPE_BGCOLOR, ROOT_SCOPE_BGCOLOR)
        .replace(SCOPE_BORDER_COLOR, ROOT_SCOPE_BORDER_COLOR);
    } else {
      if( (scope._proto === 'Scope') && ('$parent' in scope) ) {
        // Since it inherits from Scope, it is an isolate scope.
        // Since it also has a parent, it must be a directive scope.
        scopeLabel = 'dir isolate scope';
      } else if(scopeId in directiveTranscludedScopes) {
        scopeLabel = 'transcluded scope';
      } else if('_type' in scope) {
        if(scope._type === 'ngRepeat') {
          ngrepeatScope = true;
          scopeLabel    = scope._type + ' scope';
        } else {
          //TBD this doesn't seem to work properly
          scopeLabel = scope._type + ' scope';
        }
      } else if('_transcluded' in scope) {
        scopeLabel = 'dir transcl scope';
      } else if('_isolate' in scope) {
        scopeLabel = 'dir isolate scope';
      }
      //else if('_transcluder' in scopesById[scope.$parent.replace('scope','')] {
        // Parent scope indicates that it has transcluded children, so
        // for now, guess that this is a transcluded scope.
        // TBD: what if it is a directive with a normal child scope?
        //scopeLabel = 'transcluded scope';
      //}
      else { // always a directive child scope??
             // what about ng-switch, ng-include, etc
        log.verbose('gg', 'assuming dir child scope for %d', scopeId);
        scopeLabel = 'dir child scope';
      }
      graphvizScope = GV_SCOPE_NODE_TEMPLATE
        .replace('{name}',  scopeName)
        .replace('{label}', scopeLabel);
      if(options.diff && !(scopeId in previousScopes)) {
        // new scope; color top row
        newScope = true;
        graphvizScope = graphvizScope.replace('colspan="2"',
          'colspan="2" bgcolor="' + NEW_NODE_COLOR + '"');
      }
    }
    if('$parent' in scope) {
      if(scope.$parent === 'scope' + rootScopeId) {
        edges.push(scopeName + ':topRow -> rootScope [color='
          + PARENT_LINE_COLOR + ']');
      } else {
        edges.push(scopeName + ':topRow -> ' + scope.$parent
          + ' [color=' + PARENT_LINE_COLOR + ']');
      }
    }
    var rows = [];
    rows.push('<tr><td>$id:</td><td bgcolor="' + PRIMITIVE_BGCOLOR + '">'
      + scopeId + '</td></tr>');
    if('_watchers' in scope) {
      var watches;
      scope._watchers.forEach(function(watch) {
        watches += '<td>' + watch + '</td>';
      });
      rows.push(GV_WATCHERS_TEMPLATE.replace('{cells}', watches));
    }
    if(options.diff && (scopeId in previousScopes)) {
      // check for at least one deleted property
      for(var propertyName in previousScopes[scopeId]) {
        if( (previousScopes[scopeId].hasOwnProperty(propertyName)) &&
            (propertyName !== '_watchers')) {
          if(!(propertyName in scope)) {
            // a property has been deleted;  color top row
            graphvizScope = graphvizScope.replace('colspan="2"',
              'colspan="2" bgcolor="' + DIFF_BGCOLOR + '"');
            break;
          }
        }
      }
    }
    Object.keys(scope).filter(function(propertyName) {
      return !(/^[$_]/.test(propertyName));  // skip if starts with $ or _
    }).sort().forEach(function(propertyName) {
      var propertyValue       = scope[propertyName],
        propertyType          = getType(propertyValue),
        previousPropertyValue = null,
        previousPropertyType  = null,
        propertyNameBgcolor   = '',
        propertyValueBgcolor  = '',
        diffValues            = false,
        extraCellPadding      = '',
        portLabel             = 'p' + propertyName,
        generateResult;
      log.verbose('gg', 'type: %s name: %s propertyValue: %j',
        propertyType, propertyName, propertyValue);
      if( (options.diff)              &&
          (scopeId in previousScopes) &&
          (propertyName in previousScopes[scopeId]) ) {
        previousPropertyValue = previousScopes[scopeId][propertyName];
        previousPropertyType  = getType(previousPropertyValue);
      }
      if(options.diff && !newScope) {
        if(previousPropertyValue !== null) {
          if(previousPropertyType === propertyType) {
            // same type;  diff the values (a bit later)
            diffValues = true;
          } else {
            // new type for existing property;  highlight value
            propertyValueBgcolor = DIFF_BGCOLOR;
          }
        } else {
          // new property in an existing scope;  highlight property name
          propertyNameBgcolor = DIFF_BGCOLOR;
        }
      }
      switch(propertyType) {
      case 'primitive':
        if(diffValues && (previousPropertyValue !== propertyValue) ) {
          propertyValueBgcolor = DIFF_BGCOLOR;
        } else {
          propertyValueBgcolor = PRIMITIVE_BGCOLOR;
        }
        if( (typeof propertyValue === 'string') &&
            (propertyValue.startsWith(refPrefix)) ) {
          var thisPort = 'p' + propertyName,
            referencedPort, isolateValue = false;
          // propertyValue contains the reference to the other port
          // e.g., __refo|scope2:myArray/3_someObject
          //       __ref-|scope3:|&
          //       __ref-|scope3:|interpolated value|@
          //       __refs|myService:
          //       __refa|myService:myArray
          var refParts     = propertyValue.replace(refPrefix, '').split('|'),
            referencedNode = refParts[1].split(':')[0];
          switch(refParts[0]) {
          case 'p':  // ref to a primitive
            keyItems.primitive = true;
            break;
          case 'a':  // ref to an array
            propertyValueBgcolor = ARRAY_BGCOLOR;
            keyItems.array = true;
            break;
          case 'o':  // ref to an object
            propertyValueBgcolor = OBJECT_BGCOLOR;
            keyItems.object = true;
            break;
          case '-':  // ref to ??
            propertyValueBgcolor = UNKNOWN_REF_BGCOLOR;
            break;
          case 's':  // ref to a service
            propertyValueBgcolor = SERVICE_BGCOLOR;
            keyItems.service = true;
            break;
          default:
            log.error('gg','unknown ref type %s' % refParts[0]);
            break;
          }
          var lastChar = propertyValue.slice(-1);
          switch(lastChar) {
          case '&':
            isolateValue = '&amp;';
            break;
          case '@':
            isolateValue = '@ ' + refParts[2];
            break;
          case '=':
            isolateValue = '=';
          }
          if(refParts[0] === 's') {
            referencedPort = 'topRow';
          } else {
            referencedPort = 'p' + refParts[1].split(':')[1];
          }
          log.verbose('gg','referencedPort: %s', referencedPort);
          rows.push('<tr>'
            + '<td>' + propertyName + ':</td>'
            + '<td bgcolor="' + propertyValueBgcolor + '" port="' + thisPort + '">'
              + (isolateValue ? isolateValue : '') + '</td>'
            + '</tr>');
          if(referencedPort !== 'p') {
            edges.push(scopeName + ':' + thisPort + ' -> '
              + referencedNode + ':"' + referencedPort + '"'
              + ' [color="' + REF_LINE_COLORS[propertyValueBgcolor]
              + '", style=' + REF_LINE_STYLE
              + ', arrowhead=vee]');
          } else {
            log.verbose('no reference', propertyValue);
          }
        } else {
          rows.push('<tr>'
            + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
              + '>' + propertyName + ':</td>'
            + '<td port="' + portLabel + '" '
              + 'bgcolor="' + propertyValueBgcolor + '">' + propertyValue + '</td>'
            + '</tr>');
        }
        break;
      case 'array':
        generateResult = generateArray(propertyValue,
          previousPropertyType === 'array'
            ? previousPropertyValue
            : null,
          portLabel);
        if(diffValues && generateResult.arraysDiffer) {
          propertyValueBgcolor = DIFF_BGCOLOR;
          extraCellPadding     = GV_EXTRA_CELL_PADDING;
        } else {
          propertyValueBgcolor = ARRAY_BGCOLOR;
        }
        rows.push('<tr>'
          + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
            + '>' + propertyName + ':</td>'
          + '<td port="'  + portLabel + '" '
            + 'bgcolor="' + propertyValueBgcolor + '"' + extraCellPadding + '>'
            + generateResult.gv + '</td>'
          + '</tr>');
        break;
      case 'object':
        generateResult = generateObject(propertyValue,
          previousPropertyType === 'object'
            ? previousPropertyValue
            : null,
          portLabel);
        if(diffValues && generateResult.objectsDiffer) {
          propertyValueBgcolor = DIFF_BGCOLOR;
          extraCellPadding     = GV_EXTRA_CELL_PADDING;
        } else {
          propertyValueBgcolor = OBJECT_BGCOLOR;
        }
        rows.push('<tr>'
          + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
            + '>' + propertyName + ':</td>'
          + '<td port="' + portLabel + '" '
            + 'bgcolor="' + propertyValueBgcolor + '"' + extraCellPadding + '>'
            + generateResult.gv + '</td>'
          + '</tr>');
        break;
      case 'function':
        rows.push('<tr>'
          + '<td' + (propertyNameBgcolor ? ' bgcolor="' + propertyNameBgcolor + '"' : '')
            + '>' + propertyName + ':</td>'
          + '<td bgcolor="' + FUNCTION_BGCOLOR + '">function()</td>'
          + '</tr>');
        break;
      default:
        assert(false,'generateGraph() logic error: unknown type');
      }
    });
    nodes.push(graphvizScope.replace('{rows}', rows.join('\n')));
    if(scope._proto === 'scope' + rootScopeId) {
      edges.push(scopeName + ':topRow -> rootScope'
        + ' [style=' + PROTO_LINE_STYLE + ']');
    } else {
      edges.push(scopeName + ':topRow -> ' + scope._proto
        + ' [style=' + PROTO_LINE_STYLE + ']');
    }
  });
  generateServiceNodes(services, previousServices, options, nodes);
  graph = GV_ENGINE_TEMPLATES[options.renderEngine]
    .replace('{font}',     options.font)
    .replace('{fontSize}', options.fontSize)
    + GV_SCOPE_NODE_PROPERTIES
    + nodes.join('\n');
  graph = mainScopeVisibility(options.showMainScope, graph, edges);
  graph += '\n' + edges.join('\n');
  log.verbose('gg','edges %j', edges);
  if(options.showKey) {
    var key = GV_KEY;
    Object.keys(keyItems).forEach(function(item) {
      key = key.replace('{0}', GV_KEY_ITEMS[item][0] + '{0}')
               .replace('{1}', GV_KEY_ITEMS[item][1] + '{1}')
               .replace('{2}', GV_KEY_ITEMS[item][2] + '{2}');
    });
    graph += '\n\n' + key.replace('{0}','').replace('{1}','').replace('{2}','');
  }
  return graph + '\n}\n';
}
router.post('/reset', jsonParser, function(req, res) {
  var instanceId = req.body.instanceId;
  removeImageAndGraphvisFiles(instanceId);
  removeStateFiles(instanceId);
  res.status(200).send('reset ACK');
});
router.post('/delete_pictures', jsonParser, function(req, res) {
  removeImageAndGraphvisFiles(req.body.instanceId);
  res.status(200).send('delete_pictures ACK');
});
router.post('/reset_all', function(req, res) {
  removeImageAndGraphvisFiles();
  removeStateFiles();
  res.status(200).send('reset_all ACK');
});
router.post('/periscope', jsonParser, function(req, res) {
  log.verbose('post', 'JSON req: %s', JSON.stringify(req.body, null, 4));
  // req.body contains these properties: options object, ref prefix,
  // instance ID, image counter, scopes array, services array
  var options        = req.body.options,
    instanceId       = req.body.instanceId,
    imageCounter     = req.body.imageCounter,
    scopes           = req.body.scopes,
    services         = req.body.services,
    previousScopes   = {},
    previousServices = {};
  rootScopeId = req.body.rootScopeId;
  refPrefix   = req.body.refPrefix;
  if(options.diff) {
    if(!readPreviousState(instanceId, previousScopes, previousServices)) {
      // since we can't determine the previous state, turn diffs off
      options.diff = false;
    }
  }
  log.verbose('post', 'previousScopes %j\n previousServices %j',
    previousScopes, previousServices);
  var graph      = generateGraph(scopes, previousScopes, services,
                     previousServices, options),
    graphvizFile = ARTIFACTS_DIR + '/' + instanceId + '_' + imageCounter
      + GRAPHVIZ_FILE_SUFFIX,
    imageFile    = IMAGES_DIR    + '/' + instanceId + '_' + imageCounter
      + IMAGE_FILE_SUFFIX;
  fs.writeFileSync(graphvizFile, graph);
  log.verbose('gg', 'graph: %s', graph);
  execFile(GRAPHVIZ_PATH + options.renderEngine,
    [graphvizFile, '-Tpng', '-o', imageFile],
    function(error, stdout, stderr) {
      if(stdout.length) {
        log.verbose('post', 'stdout: %s', stdout);
      }
      if(stderr.length) {
        log.verbose('post', 'stderr: %s', stderr);
      }
      if(error !== null) {
        log.error('post', 'execFile error: %s', error);
      } else {
        saveState(instanceId, scopes, services);
        // AJAX call expects to get a string back specifying the image filename
        res.send(imageFile.replace('public/', ''));
      }
  });
});

module.exports = router;
