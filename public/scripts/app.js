'use strict';
angular.module('myApp', ['periscope'])
.controller('Ctrl1', ['$scope', function($scope) {
  $scope.framework = 'Angular v1.4';
}]);
