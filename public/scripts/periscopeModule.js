'use strict';
// client-side periscope code

// Since Angular 1.0 doesn't support $log.debug, we're going to have to
// work around that.  Set periscopeDebugEnabled to true to enable debug logging
// for all versions of Angular.
var periscopeDebugEnabled = false;
// To find the scopeId associated with an element, select the element with
// the browser's dev tools, then in the console:
// > scopeId($0)
function scopeId(el) {  /* exported scopeId */
  console.log(angular.element(el).scope().$id);
}
angular.module('periscope', [])
.config(['$logProvider', function($logProvider) {
  if(angular.version.major === 1 && angular.version.minor === 0) {
    // no debug option in Angular 1.0, see utils service
  } else {
    $logProvider.debugEnabled(periscopeDebugEnabled);
  }
}])
.constant('refPrefix',     '__ref')
.constant('corsServerUrl', 'http://localhost:3300/')
  // port must match SERVER_PORT in periscope-server.js
.factory('utils', ['$log','$injector', function($log, $injector) {
  // setup logging
  if(angular.version.major === 1 && angular.version.minor === 0) {
    // Angular 1.0 doesn't have a $log.debug() function, so add it
    if(periscopeDebugEnabled) {
      $log.debug = $log.log;
    } else {
      $log.debug = angular.noop;
    }
  }
  var utils = {
  getType: function(value) {
    if(value === null)             { return 'null'; }  // special case
    if(!(value instanceof Object)) {
      // primitive type
      // typeof will return 'undefined', 'boolean', 'number', or 'string'
      return typeof value;
    }
    if(Array.isArray(value))       { return 'array'; }
    if(value instanceof Function)  { return 'function'; }
    if(value instanceof Date)      { return 'date'; }
    if(value instanceof RegExp)    { return 'regexp'; }
    if(value instanceof Error)     { return 'error'; }
    if(!(value instanceof Object)) {
      $log.error('Unknown type for value: ', value, 'typeof:', typeof value);
      return 'unknown';
    }
    return 'object';
  },
  getServices: function() {
    // http://stackoverflow.com/questions/19411502/angular-get-list-of-all-registered-services
    // for now, we only support one Angular app on the page
    // (we should really look for ng:app, x-ng-app, and data-ng-app as well)
    var moduleName = document.querySelector('[ng-app]').getAttribute('ng-app');
    if(!moduleName) {
      $log.warn('Unable to find ng-app attribute -- no services will be shown');
      return null;
    }
    $log.debug('module name:', moduleName);
    var services = [];
    angular.module(moduleName)._invokeQueue.forEach(function(item) {
      if(item[1] === 'factory' || item[1] === 'service' || item[1] === 'provider') {
        var serviceName = item[2][0];
        services.push({name: serviceName, obj: $injector.get(serviceName)});
      }
    });
    $log.debug('services:', services);
    if(services.length > 0) {
      return services;
    }
    return null;
  },
  getScopes: function(root) {  // http://stackoverflow.com/a/21776522/215945
    var scopes = [];
    function traverse(scope) {
      scopes.push(scope);
      if(scope.$$nextSibling) {
        traverse(scope.$$nextSibling);
      }
      if(scope.$$childHead) {
        traverse(scope.$$childHead);
      }
    }
    traverse(root);
    return scopes;
  },
  // alternative for finding all scopes
  // https://github.com/angular/angular.js/blob/37bdcc984a0240cf0ac125613acee12f1cee389d/src/ng/rootScope.js#L371
  // var scopes = [],
  //   target   = $rootScope,
  //   current  = target,
  //   next;
  // do {
  //   scopes.push(current);
  //   if(!(next = (current.$$childHead || (current !== target && current.$$nextSibling)))) {
  //     while(current !== target && !(next = current.$$nextSibling)) {
  //       current = current.$parent;
  //     }
  //   }
  // } while ((current = next));
  };
  return utils;
}])
.factory('periscopeService', ['$rootScope','$log','$injector','utils','refPrefix',
 function($rootScope, $log, $injector, utils, refPrefix) {
  var services = utils.getServices();
  var ANGULAR_PROPERTIES_TO_IGNORE = '$id $parent $root'.split(' '),
    ANGULAR_PROPERTIES_TO_KEEP     =
      ('$pristine $dirty $valid $invalid $submitted $error $viewValue $modelValue '
       + '$name').split(' ');
  var periscopeService = {
  findArrayInArray: function(label, array, arrayToMatch) {
    var newLabel = null;
    for(var i = 0, arrayLen = array.length; i < arrayLen; i++) {
      switch(utils.getType(array[i])) {
      case 'array':
        // array[i] is a nested array
        $log.debug('faa array', array[i]);
        if(arrayToMatch === array[i]) {
          newLabel = label + '/' + i;
        } else {
          // determine if one of the array elements is an array and if it
          // matches arrayToMatch
          newLabel = periscopeService.findArrayInArray(
            label + '/' + i, array[i], arrayToMatch);
        }
        break;
      case 'object':
        // array[i] is a nested object
        $log.debug('faa object', array[i]);
        // determine if one of the object properties is an array and if it
        // matches arrayToMatch
        newLabel = periscopeService.findArrayInObject(
          label + '/' + i, array[i], arrayToMatch);
        break;
      }
      if(newLabel) {
        $log.debug('faa found match!', newLabel);
        break;
      }
    }
    return newLabel;
  },
  findArrayInObject: function(label, object, arrayToMatch) {
    var newLabel = null;
    Object.keys(object).forEach(function(propertyName) {
      if(!newLabel) {
        switch(utils.getType(object[propertyName])) {
        case 'array':
          // object[propertyName] is a nested array
          $log.debug('fao array', object[propertyName]);
          if(arrayToMatch === object[propertyName]) {
            newLabel = label + '_' + propertyName;
          } else {
            // determine if one of the array elements is an array and if it
            // matches arrayToMatch
            newLabel = periscopeService.findArrayInArray(
              label + '_' + propertyName, object[propertyName], arrayToMatch);
          }
          break;
        case 'object':
          // object[propertyName] is a nested object.
          $log.debug('fao object', object[propertyName]);
          // determine if one of the object properties is an array and if it
          // matches arrayToMatch
          newLabel = periscopeService.findArrayInObject(
            label + '_' + propertyName, object[propertyName], arrayToMatch);
          break;
        }
      }
    });
    if(newLabel) { 
      $log.debug('fao found match!', newLabel);
    }
    return newLabel;
  },
  findArray: function(childScope, arrayToMatch) {
    $log.debug('fa looking for', arrayToMatch, 'from scope', childScope.$id);
    var ancestorRef = null;
    while(ancestorRef === null) {
      if(!childScope.hasOwnProperty('$parent')) {
        $log.debug('fa no parent');
        break;
      }
      var parentScope = childScope.$parent;
      if(parentScope.$id === $rootScope.$id) {
        $log.debug('fa reached rootscope');
        break;
      }
      Object.keys(parentScope).filter(function(propertyName) {
        // skip angular properties and 'this
        return (propertyName[0] !== '$') && (propertyName !== 'this');
      }).forEach(function(propertyName) {
        if(!ancestorRef) {
          var label;
          switch(utils.getType(parentScope[propertyName])) {
          case 'array':
            $log.debug('fa', propertyName,'is an array:', parentScope[propertyName]);
            if(arrayToMatch === parentScope[propertyName]) {
              label = propertyName;
            } else {
              // determine if one of the array elements is an array and if it
              // matches arrayToMatch
              label = periscopeService.findArrayInArray(
                propertyName, parentScope[propertyName], arrayToMatch);
            }
            break;
          case 'object':
            $log.debug('fa', propertyName,'is an object:', parentScope[propertyName]);
            // determine if one of the object properties is an array and if it
            // matches arrayToMatch
            label = periscopeService.findArrayInObject(
              propertyName, parentScope[propertyName], arrayToMatch);
            break;
          // ignore other types
          }
          if(label) {
            $log.debug('fa found match!', label);
            ancestorRef = refPrefix + 'a|scope' + parentScope.$id + ':' + label;
          }
        }
      });
      childScope = parentScope;
    }
    if(!ancestorRef) {
      var label = periscopeService.findArrayinServices(arrayToMatch);
      if(label) {
        $log.debug('fa found match!', label);
        ancestorRef = refPrefix + 'a|' + label;
      }
    }
    return ancestorRef;
  },
  findArrayinServices: function(arrayToMatch) {
    if(!services) {
      return null;
    }
    var newLabel = null;
    services.forEach(function(service) {
      if(!newLabel) {
        Object.keys(service.obj).forEach(function(propertyName) {
          if(!newLabel) {
            switch(utils.getType(service.obj[propertyName])) {
            case 'array':
              // service[propertyName] is a nested array
              $log.debug('fas array', service.obj[propertyName]);
              if(arrayToMatch === service.obj[propertyName]) {
                newLabel = service.name + ':' + propertyName;
              } else {
                // determine if one of the array elements is an array and if it
                // matches arrayToMatch
                newLabel = periscopeService.findArrayInArray(
                  service.name + ':' + propertyName, service.obj[propertyName],
                  arrayToMatch);
              }
              break;
            case 'object':
              // service[propertyName] is a nested object.
              $log.debug('fas object', service.obj[propertyName]);
              // determine if one of the object properties is an array and if it
              // matches arrayToMatch
              newLabel = periscopeService.findArrayInObject(
                service.name + ':' + propertyName, service.obj[propertyName],
                arrayToMatch);
              break;
            }
          }
        });
      }
    });
    if(newLabel) { 
      $log.debug('fas found match!', newLabel);
    }
    return newLabel;
  },
  findObjectInServices: function(objectToMatch) {
    if(!services) {
      return null;
    }
    var newLabel = null;
    services.forEach(function(service) {
      if(!newLabel) {
        if(service.obj === objectToMatch) {
          newLabel = service.name;
        } else {
          Object.keys(service.obj).forEach(function(propertyName) {
            if(!newLabel) {
              switch(utils.getType(service.obj[propertyName])) {
              case 'array':
                // service[propertyName] is a nested array
                $log.debug('fos array', service.obj[propertyName]);
                // determine if one of the array elements is an object and if it
                // matches objectToMatch
                newLabel = periscopeService.findObjectInArray(
                  service.name + ':' + propertyName, service.obj[propertyName],
                  objectToMatch);
                break;
              case 'object':
                // service[propertyName] is a nested object.
                $log.debug('fos object', service.obj[propertyName]);
                if(objectToMatch === service.obj[propertyName]) {
                  newLabel = service.name + ':' + propertyName;
                } else {
                  // determine if one of the object properties is an object and if it
                  // matches objectToMatch
                  newLabel = periscopeService.findObjectInObject(
                    service.name + ':' + propertyName, service.obj[propertyName],
                    objectToMatch);
                }
                break;
              }
            }
          });
        }
      }
    });
    if(newLabel) { 
      $log.debug('fos found match!', newLabel);
    }
    return newLabel;
  },
  findObjectInArray: function(label, array, objectToMatch) {
    var newLabel = null;
    for(var i = 0, arrayLen = array.length; i < arrayLen; i++) {
      switch(utils.getType(array[i])) {
      case 'array':
        // array[i] is a nested array
        $log.debug('foa array', array[i]);
        // determine if one of the array elements is an object and if it
        // matches objectToMatch
        newLabel = periscopeService.findObjectInArray(
          label + '/' + i, array[i], objectToMatch);
        break;
      case 'object':
        // array[i] is a nested object
        $log.debug('foa object', array[i]);
        if(objectToMatch === array[i]) {
          newLabel = label + '/' + i;
        } else {
          // determine if one of the object properties is an object and if it
          // matches objectToMatch
          newLabel = periscopeService.findObjectInObject(
            label + '/' + i, array[i], objectToMatch);
        }
        break;
      }
      if(newLabel) {
        $log.debug('foa found match!', newLabel);
        break;
      }
    }
    return newLabel;
  },
  findObjectInObject: function(label, object, objectToMatch) {
    var newLabel = null;
    Object.keys(object).forEach(function(propertyName) {
      if(!newLabel) {
        switch(utils.getType(object[propertyName])) {
        case 'array':
          // object[propertyName] is a nested array
          $log.debug('foo array', object[propertyName]);
          // determine if one of the array elements is an object and if it
          // matches objectToMatch
          newLabel = periscopeService.findObjectInArray(
            label + '_' + propertyName, object[propertyName], objectToMatch);
          break;
        case 'object':
          // object[propertyName] is a nested object.
          $log.debug('foo object', object[propertyName]);
          if(objectToMatch === object[propertyName]) {
            newLabel = label + '_' + propertyName;
          } else {
            // determine if one of the object properties is an object and if it
            // matches objectToMatch
            newLabel = periscopeService.findObjectInObject(
              label + '_' + propertyName, object[propertyName], objectToMatch);
          }
          break;
        }
      }
    });
    if(newLabel) { 
      $log.debug('foo found match!', newLabel);
    }
    return newLabel;
  },
  findObject: function(childScope, objectToMatch) {
    $log.debug('fo looking for', objectToMatch, 'from scope', childScope.$id);
    var ancestorRef = null;
    while(ancestorRef === null) {
      if(!childScope.hasOwnProperty('$parent')) {
        $log.debug('fo no parent');
        break;
      }
      var parentScope = childScope.$parent;
      if(parentScope.$id === $rootScope.$id) {
        $log.debug('fo reached rootscope');
        break;
      }
      Object.keys(parentScope).filter(function(propertyName) {
        // skip angular properties and 'this'
        return (propertyName[0] !== '$') && (propertyName !== 'this');
      }).forEach(function(propertyName) {
        if(!ancestorRef) {
          var label;
          switch(utils.getType(parentScope[propertyName])) {
          case 'array':
            $log.debug('fo', propertyName, 'is an array:', parentScope[propertyName]);
            // determine if one of the array elements is an object and if it
            // matches objectToMatch
            label = periscopeService.findObjectInArray(
              propertyName, parentScope[propertyName], objectToMatch);
            break;
          case 'object':
            $log.debug('fo', propertyName, 'is an object:', parentScope[propertyName]);
            if(objectToMatch === parentScope[propertyName]) {
              label = propertyName;
            } else {
              // determine if one of the object properties is an object and if it
              // matches objectToMatch
              label = periscopeService.findObjectInObject(
                propertyName, parentScope[propertyName], objectToMatch);
            }
            break;
          // ignore other types
          }
          if(label) {
            $log.debug('fo found match!', label);
            ancestorRef = refPrefix + 'o|scope' + parentScope.$id + ':' + label;
          }
        }
      });
      childScope = parentScope;
    }
    if(!ancestorRef) {
      var label = periscopeService.findObjectInServices(objectToMatch);
      if(label) {
        $log.debug('fo found match!', label);
        if(label.indexOf(':') === -1) {
          ancestorRef = refPrefix + 's|' + label + ':';
        } else {
          ancestorRef = refPrefix + 'o|' + label;
        }
      }
    }
    return ancestorRef;
  },
  addArrayValues: function(src, dst) {
    for(var i = 0, arrayLen = src.length; i < arrayLen; i++) {
      var arrayItem   = src[i],
        arrayItemType = utils.getType(arrayItem);
      switch(arrayItemType) {
      case 'undefined':
        $log.debug('aav undefined value');
        // special case, otherwise JSON.stringify() would convert this to null
        dst[i] = '<i>undefined</i>';
        break;
      case 'boolean':
      case 'number':
      case 'string':
        $log.debug('aav primitive value:', arrayItem);
        dst[i] = arrayItem;
        break;
      case 'null':
        $log.debug('aav null value');
        dst[i] = '<i>null</i>';
        break;
      case 'array':
        $log.debug('aav array value:', arrayItem);
        dst[i] = [];
        periscopeService.addArrayValues(arrayItem, dst[i]);
        break;
      case 'object':
        $log.debug('aav object value:', arrayItem);
        dst[i] = {};
        if('$id' in arrayItem) {
          // guard against circular reference
          dst[i].$id = 'scope' + arrayItem.$id;
        }
        periscopeService.addObjectProperties(arrayItem, dst[i], true);
        break;
      case 'function':
        $log.debug('aav function value:', arrayItem);
        dst[i] = 'function()';
        break;
      case 'date':
        $log.debug('aav date value:', arrayItem);
        dst[i] = arrayItem;  
        // JSON.stringify() will turn it into a string
        break;
      case 'regexp':
        $log.debug('aav regexp value:', arrayItem);
        dst[i] = arrayItem.toString();
        break;
      default:
        $log.error('unknown type:',arrayItemType,'for arrayItem:',arrayItem);
      }
    }
  },
  findValueInArray: function(label, array, value) {
    var newLabel = null;
    for(var i = 0, arrayLen = array.length; i < arrayLen; i++) {
      var arrayElementValue = array[i];
      if(arrayElementValue === value) {
        newLabel = label + '/' + i;
      } else {
        switch(utils.getType(arrayElementValue)) {
        case 'array':
          $log.debug('fvia array', arrayElementValue);
          // determine if one of the array elements matches value
          newLabel = periscopeService.findValueInArray(
            label + '/' + i, arrayElementValue, value);
          break;
        case 'object':
          $log.debug('fvia object', arrayElementValue);
          // determine if one of the object properties matches value
          newLabel = periscopeService.findValueInObject(
            label + '/' + i, arrayElementValue, value);
          break;
        }
      }
      if(newLabel) {
        $log.debug('fvia found match!', newLabel);
        break;
      }
    }
    return newLabel;
  },
  findValueInObject: function(label, object, value) {
    var newLabel = null;
    Object.keys(object).forEach(function(propertyName) {
      if(!newLabel) {
        var propertyValue = object[propertyName];
        if(propertyValue === value) {
          newLabel = label + '_' + propertyName;
        } else {
          switch(utils.getType(propertyValue)) {
          case 'array':
            $log.debug('fvio array', propertyValue);
            // determine if one of the array elements matches value
            newLabel = periscopeService.findValueInArray(
              label + '_' + propertyName, propertyValue, value);
            break;
          case 'object':
            $log.debug('fvio object', propertyValue);
            // determine if one of the object properties matches value
            newLabel = periscopeService.findValueInObject(
              label + '_' + propertyName, propertyValue, value);
            break;
          }
        }
      }
    });
    if(newLabel) { 
      $log.debug('fvio found match!', newLabel);
    }
    return newLabel;
  },
  findValue: function(childScope, value) {
    $log.debug('fv looking for',value, 'from scope', childScope.$id);
    var ancestorRef = null;
    while(ancestorRef === null) {
      if(!childScope.hasOwnProperty('$parent')) {
        $log.debug('fv no parent');
        break;
      }
      var parentScope = childScope.$parent;
      if(parentScope.$id === $rootScope.$id) {
        $log.debug('fv reached rootscope');
        break;
      }
      Object.keys(parentScope).filter(function(propertyName) {
        // skip angular properties and 'this'
        return (propertyName[0] !== '$') && (propertyName !== 'this');
      }).forEach(function(propertyName) {
        if(!ancestorRef) {
          var propertyValue = parentScope[propertyName],
            propertyType    = utils.getType(propertyValue),
            label, type;
          if(propertyValue === value) {
            label = propertyName;
            switch(propertyType) {
            case 'array':
              type  = 'a|';
              break;
            case 'object':
              type  = 'o|';
              break;
            default:  // assume primitive ???
              type  = 'p|';
              break;
            }
          } else {
            switch(utils.getType(propertyValue)) {
            case 'array':
              $log.debug('fv', propertyName, 'is an array:', propertyValue);
              // determine if one of the array elements matches value
              label = periscopeService.findValueInArray(
                propertyName, propertyValue, value);
              type = 'a|';
              break;
            case 'object':
              $log.debug('fv', propertyName, 'is an object:', propertyValue);
              // determine if one of the object properties matches value
              label = periscopeService.findValueInObject(
                propertyName, propertyValue, value);
              type = 'o|';
              break;
            }
          }
          if(label) {
            $log.debug('fv found match!', label);
            ancestorRef = refPrefix + type + 'scope' + parentScope.$id + ':' + label;
          }
        }
      });
      childScope = parentScope;
    }
    return ancestorRef;
  },
  addObjectProperties: function(src, dst, showFunctions) {
    $log.debug('adding properties for '
      // JSON.stringify(src) has issues with nested forms
      // + ('$id' in src ? 'scope' + src.$id : JSON.stringify(src)));
      + ('$id' in src ? 'scope' + src.$id : src));
    var dstIsNgrepeatScope = ('$id' in dst) && (dst._type === 'ngRepeat'),
      dstIsIsolateScope    = '_isolate' in dst;
    Object.keys(src).filter(function(propertyName) {
      // skip private Angular properties, 'this', and some other Angular properties
      if( /^\$\$/.test(propertyName) || (propertyName === 'this') ||
          (ANGULAR_PROPERTIES_TO_IGNORE.indexOf(propertyName) !== -1 ) ) {
        return false;
      }
      if(propertyName[0] === '$') {
        // keep some Angular NgModelController and FormController properties
        if(ANGULAR_PROPERTIES_TO_KEEP.indexOf(propertyName) !== -1) {
          return true;
        }
        return false;
      }
      return true;
    }).sort().forEach(function(propertyName) {
      var propertyValue = src[propertyName],
        propertyType    = utils.getType(propertyValue),
        ref             = null,
        isolateType;
      $log.debug('aop propertyName:', propertyName);
      if(dstIsIsolateScope && (propertyName in src.$$isolateBindings) ) {
        $log.debug(' aop', propertyName, 'is an isolate property');
        if(src.$$isolateBindings[propertyName] instanceof Object) {
          isolateType = src.$$isolateBindings[propertyName].mode;
        } else {
          // older Angular versions
          isolateType = src.$$isolateBindings[propertyName].charAt(0);
        }
        if(isolateType === '&') {
          dst[propertyName] = refPrefix + '-|scope' + src.$parent.$id + ':'
            + '|' + isolateType;
        } else {
          // Try to find propertyValue in ancestor scope.
          // For @ bindings, this may not be possible.
          // E.g., consider attr1="hello {{name}}"
          ref = periscopeService.findValue(src, propertyValue);
          if(ref) {
            dst[propertyName] = ref;
          } else {
            if(isolateType === '=') {
              $log.error('unable to find value of isolate property "' + propertyName
                + '" in ancestors');
            }
            dst[propertyName] = refPrefix + '-|scope' + src.$parent.$id + ':';
          }
          if(isolateType === '@') {
            // always include the value for @ bindings, since we may not
            // be able to find a direct ancestor binding
            dst[propertyName] += '|' + propertyValue;
          }
          dst[propertyName] += '|' + isolateType;
        }
      } else {
        switch(propertyType) {
        case 'undefined':
          $log.debug('aop undefined value');
          // special case, otherwise JSON.stringify() would convert this to null
          dst[propertyName] = '<i>undefined</i>';
          break;
        case 'boolean':
        case 'number':
        case 'string':
          $log.debug('aop primitive value:', propertyValue);
          dst[propertyName] = propertyValue;
          break;
        case 'null':
          $log.debug('aop null value');
          dst[propertyName] = '<i>null</i>';
          break;
        case 'array':
          $log.debug('aop array value:', propertyValue);
          // See if a reference to this array is in an ancestor scope.
          // If so, reference it.
          ref = periscopeService.findArray(src, propertyValue);
          if(ref) {
            $log.debug('aop array is a ref to', ref);
            dst[propertyName] = ref;
          } else {
            if(dstIsNgrepeatScope) {
              $log.warn('unable to find ngrepeat array', propertyValue,
                'in ancestors as expected');
            }
            dst[propertyName] = [];
            periscopeService.addArrayValues(propertyValue, dst[propertyName]);
          }
          break;
        case 'object':
          $log.debug('aop object value:', propertyValue);
          if('$id' in propertyValue) {
            // guard against circular reference
            dst[propertyName].$id = 'scope' + propertyValue.$id;
          }
          // See if a reference to this object is in an ancestor scope.
          // If so, reference it.
          ref = periscopeService.findObject(src, propertyValue);
          if(ref) {
            $log.debug('aop object is a ref to', ref);
            dst[propertyName] = ref;
          } else {
            if(dstIsNgrepeatScope) {
              $log.warn('unable to find ngrepeat object', propertyValue,
                'in ancestors as expected');
            }
            dst[propertyName] = {};
            periscopeService.addObjectProperties(propertyValue, dst[propertyName],
              true);
          }
          break;
        case 'function':
          $log.debug('aop function value:', propertyValue);
          if(showFunctions) {
            dst[propertyName] = 'function()';
          }
          // else, ignore function property
          break;
        case 'date':
          $log.debug('aop date value:', propertyValue);
          //TBD if dstIsNgrepeatScope, create link back to RegExp object.
          //For now, just add "ref to" prefix.
          dst[propertyName] = (dstIsNgrepeatScope ? 'ref to ' : '')
            + JSON.stringify(propertyValue);
          break;
        case 'regexp':
          $log.debug('aop regexp value:', propertyValue);
          //TBD if dstIsNgrepeatScope, create link back to Date object.
          //For now, just add "ref to" prefix.
          dst[propertyName] = (dstIsNgrepeatScope ? 'ref to ' : '')
            + propertyValue.toString();
          break;
        default:
          $log.error('unknown type:',propertyType,'for value:',propertyValue);
        }
      }
    });
  }
  };
  return periscopeService;
}])
.directive('periscope', ['$rootScope','$http','$log','periscopeService','refPrefix','utils','corsServerUrl',
 function($rootScope, $http, $log, periscopeService, refPrefix, utils, corsServerUrl) {
  var TEMPLATE = '<div id="periscope"><div>'
      + '<button ng-click="periscope()">{{buttonText}}</button>'
      + '<button ng-click="reset()">reset</button>'
      + '<button ng-click="deletePictures()">del pics</button>'
      + '<button ng-click="hidePicturesBut1()">hide pics-1</button>'
      + '<button ng-click="showAllPictures()">show all pics</button>'
      + '<button ng-click="resetAll()">reset all</button>'
      + '<br><input type="checkbox" ng-model="diff">diff '
      + '<input type="checkbox" ng-model="showSiblings">sibs '
      + '<input type="checkbox" ng-model="showKey">key '
      + '<input type="checkbox" ng-model="showWatchers">$$watchers '
      + '<input type="checkbox" ng-model="showFunctions">fns '
      + '<input type="checkbox" ng-model="showMainScope">Scope'
      + '<br><select ng-model="font" ng-options="font for font in fonts"></select>'
      + '<select ng-model="fontSize" ng-options="size for size in fontSizes"></select>'
      + '<select ng-model="renderEngine" '
      +   'ng-options="engine for engine in renderEngines"></select>'
      + '<input type="checkbox" ng-model="corsServer">CORS&nbsp;server</div>'
      + '<div ng-repeat="imageUrl in images" id="periscope-images">'
      + '<img ng-src="{{imageUrl}}">'
      + '</div></div>',
    FONTS = ['sans', 'Consolas', 'Arial', 'Arial Narrow', 'Helvetica Narrow',
      'Lucida Sans Typewriter', 'Lucida Sans Unicode', 'MS Reference Sans Serif',
      'Tahoma', 'Trebuchet MS', 'Verdana'],
      // 'DejaVu Sans Mono', 'Univers'
    RENDER_ENGINES = ['dot', 'neato', 'fdp', 'sfdp', 'circo'],
    FONT_SIZES     = [9, 10, 11],
    INSTANCE_ID    = Date.now(),
    imageCounter   = 0;
  return {
    scope:      {},
    template:   TEMPLATE,
    controller: function($scope) {
      $scope.buttonText     = 'Peri$scope';
      $scope.diff           = true;
      $scope.showWatchers   = false;
      $scope.showFunctions  = false;
      $scope.showSiblings   = true;
      $scope.showKey        = false;
      $scope.showMainScope  = false;
      $scope.renderEngines  = RENDER_ENGINES;
      $scope.renderEngine   = RENDER_ENGINES[0];
      $scope.fonts          = FONTS;
      $scope.font           = FONTS[0];
      $scope.fontSizes      = FONT_SIZES;
      $scope.fontSize       = FONT_SIZES[0];
      $scope.corsServer     = false;
      $scope.savedImages    = [];
      $scope.images         = [];
      $scope.periscope = function() {
        var scopes = utils.getScopes($rootScope).filter(function(scope) {
          if( (scope.$id === $scope.$id) ||
              (scope.$parent !== null && scope.$parent.$id === $scope.$id) ) {
            // don't include this isolate scope or any of its children
            $log.debug('skipping peri$scope\'s isolate scope or one of its',
              'descendants:', scope);
            return false;
          }
          return true;
        });
        // always log the scopes, to make it easy to view them in the console
        $log.log('scopes:', scopes);
        var transcludeElements = document.querySelectorAll('[ng-transclude]'),
          controllerElements   = document.querySelectorAll('[ng-controller]'),
          controllerScopes   = {},
          scopeTranscluders  = {},
          transcludedScopes  = {};
        $log.debug('transclude elements:', transcludeElements);
        $log.debug('controller elements:', controllerElements);
        angular.forEach(controllerElements, function(el) {
          var ctrl = angular.element(el).controller(),
            scope  = angular.element(el).scope();
          controllerScopes[scope.$id] = Object.getPrototypeOf(ctrl).constructor.name;
        });
        angular.forEach(transcludeElements, function(el) {
          var scope = angular.element(el).scope();
          $log.debug('transclude scope:', scope);
          // scope is actually the parent of the transcluded scope
          $log.debug(el, scope);
          scopeTranscluders[scope.$id] = 1;
          if(scope.$$nextSibling !== null) {
            transcludedScopes[scope.$$nextSibling.$id] = 1;
          }
        });
        $log.debug('ctrl scopes:', controllerScopes);
        $log.debug('transcluders:', scopeTranscluders);
        var scopesToJsonify = [];  // periscope representations of scopes
        scopes.forEach(function(scope) {
          var dstScope = {};
          // add special properties first
          dstScope.$id = scope.$id;
          if(scope.$parent !== null) {
            dstScope.$parent = 'scope' + scope.$parent.$id;
          }
          if('$id' in Object.getPrototypeOf(scope)) {
            // guard against circular reference
            dstScope._proto = "scope" + Object.getPrototypeOf(scope).$id;
          } else {
            // rootScope or isolate scope
            dstScope._proto = 'Scope';
            if(Object.getPrototypeOf(scope) !== Object.getPrototypeOf($rootScope)) {
              $log.warn('expected prototype to be the same as $rootScope\'s for',
                scope, 'but it is', Object.getPrototypeOf(scope));
            }
            if(angular.version.major === 1 && angular.version.minor === 0) {
              // in 1.0, the object doesn't seem to have a name
            } else {
              // in later releases, the object is named "Scope"
              if(scope.constructor.name !== 'Scope') {
                $log.warn('expected constructor name of "Scope" for', scope);
              }
            }
          }
          if(scope.$id in scopeTranscluders) {
            dstScope._transcluder = true;
          }
          if(scope.$id in transcludedScopes) {
            dstScope._transcluded = true;
          }
          if(scope.hasOwnProperty('$$transcluded') &&
             scope.$$transcluded) {
            dstScope._transcluded = true;
          }
          if(scope.$id in controllerScopes) {
            if(scope.hasOwnProperty('$index')) {
              dstScope._type = 'ngRepeat';
            } else {
              dstScope._type = controllerScopes[scope.$id];
            }
          } else {
            if(scope.hasOwnProperty('$index')) {
              dstScope._type = 'ngRepeat';
            } else if(scope.hasOwnProperty('$$isolateBindings')) {
              dstScope._isolate = true;
            }
            //else {
            //  dstScope._type = 'none';
            //}
          }
          if(scope.$$nextSibling !== null) {
            if(scope.$$nextSibling.$id !== $scope.$id) {
              dstScope.$$nextSibling = scope.$$nextSibling.$id;
            }
          }
          if( ($scope.showWatchers)                &&
              (scope.hasOwnProperty('$$watchers')) &&
              (scope.$$watchers !== null) ) {
            dstScope._watchers = [];
            var watchersLen = scope.$$watchers.length;
            for(var i=0; i < watchersLen; i++) {
              var watcher = scope.$$watchers[i];
              $log.debug('watcher:',watcher);
              if(typeof(watcher.exp) === 'string') {
                dstScope._watchers.push(watcher.exp);
              } else {  // watcher.exp is a function
                if(watcher.exp.name !== '') {
                    dstScope._watchers.push(watcher.exp.name + '()');
                //} else if(watcher.exp.hasOwnProperty('exp')) {
                //  dstScope._watchers.push(watcher.exp.exp);
                //}
                } else {
                  dstScope._watchers.push('function()');
                }
              }
            }
          }
          periscopeService.addObjectProperties(scope, dstScope, $scope.showFunctions);
          scopesToJsonify.push(dstScope);
        });
        $log.debug(scopesToJsonify);
        // JSON.stringify() note:
        // If undefined, a function, or a symbol is encountered during conversion
        // it is either omitted (when it is found in an object)
        // or censored to null (when it is found in an array).
        // So some scope values (especially in nested data structures) may be
        // lost in the JSON conversion.
        var json = JSON.stringify({
          rootScopeId:     $rootScope.$id,
          refPrefix:       refPrefix,
          instanceId:      INSTANCE_ID,
          imageCounter:    ++imageCounter,
          scopes:          scopesToJsonify,
          services:        utils.getServices(),
          options: {
            diff:          $scope.diff,
            showKey:       $scope.showKey,
            showSiblings:  $scope.showSiblings,
            renderEngine:  $scope.renderEngine,
            showMainScope: $scope.showMainScope,
            font:          $scope.font,
            fontSize:      $scope.fontSize
          }
        });
        $log.debug('json to send:',json);
        $scope.buttonText = 'graphing...';
        var periscopeServerUrl = $scope.corsServer
          ? corsServerUrl
          : '/';
        $http.post(periscopeServerUrl + 'periscope', json)
        //$http.post('/periscope', json)
        .success(function(data) {
          $scope.buttonText = 'Peri$scope';
          data = data.replace(/\s/, '');
          $log.debug('image file:',data);
          $scope.images.push(data);
        })
        .error(function(data, status) {
          $scope.buttonText = 'Peri$scope';
          $log.error('http error:', status, data);
        });
      };
      function sendMsg(msg, json) {
        $scope.images.length      = 0;
        $scope.savedImages.length = 0;
        // don't reset imageCounter, otherwise the browser may return
        // a cached image
        var periscopeServerUrl = $scope.corsServer
          ? corsServerUrl
          : '/';
        $http.post(periscopeServerUrl + msg, json)
        .error(function(data, status) {
          $log.error('http post error:', status, data);
        });
      }
      $scope.reset = function() { 
        sendMsg('reset', JSON.stringify(
          { instanceId: INSTANCE_ID} ));
      };
      $scope.deletePictures = function() {
        sendMsg('delete_pictures', JSON.stringify(
          { instanceId: INSTANCE_ID} ));
      };
      $scope.hidePicturesBut1 = function() {
        if($scope.savedImages.length) {
          $scope.savedImages.push.apply($scope.savedImages, $scope.images.slice(0, -1));
        } else {
          $scope.savedImages = $scope.images.slice(0, -1);
        }
        $scope.images = $scope.images.slice(-1);
      };
      $scope.showAllPictures = function() {
        if($scope.savedImages.length) {
          $scope.savedImages.push.apply($scope.savedImages, $scope.images);
          $scope.images             = $scope.savedImages.slice(0);
          $scope.savedImages.length = 0;
        }
      };
      $scope.resetAll = function() {
        sendMsg('reset_all');
      };
    }
  };
}]);
