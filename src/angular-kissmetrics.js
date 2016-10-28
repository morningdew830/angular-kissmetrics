(function (window, angular, undefined) {
  'use strict';

  angular
    .module('bl.lib.kissmetrics', [])
    .provider('$analytics', ['$window', '$document', '$timeout', function ($window, $document, $timeout) {
      var application = 'Core'; // default value
      $window._kmq = $window._kmq || [];

      function loadVendor (url) {
        $timeout(function () {
          var s = $document.createElement('script'),
            f = $document.getElementsByTagName('script')[0];
          s.type = 'text/javascript';s.async = true;s.src = url;
          f.parentNode.insertBefore(s, f);
        }, 1, false);
      }

      function registerEventTrack(action, properties) {
        properties['Application'] = application;
        $window._kmq.push(['record', action, properties]);
      }

      function registerSetUsername(uuid) {
        $window._kmq.push(['identify', uuid]);
      }

      function registerSetUserProperties (properties) {
        $window._kmq.push(['set', properties]);
      }

      return {
        $get: function () {
          return $window._kmq;
        },
        setKey: function (apiKey) {
          loadVendor('//i.kissmetrics.com/i.js');
          loadVendor('//doug1izaerwt3.cloudfront.net/' + apiKey + '.1.js');
        },
        setAppName: function (appName) {
          application = appName;
        },
        eventTrack: registerEventTrack,
        setUsername: registerSetUsername,
        setUserProperties: registerSetUserProperties
      };
    }])

    .directive('analyticsOn', ['$analytics', function ($analytics) {
      function isCommand(element) {
        return ['a:','button:','button:button','button:submit','input:button','input:submit'].indexOf(
            element.tagName.toLowerCase()+':'+(element.type||'')) >= 0;
      }

      function inferEventType(element) {
        if (isCommand(element)) {
          return 'click';
        }
        return 'click';
      }

      function inferEventName(element) {
        if (isCommand(element)) {
          return element.innerText || element.value;
        }
        return element.id || element.name || element.tagName;
      }

      function isProperty(name) {
        return name.substr(0, 9) === 'analytics' &&
          ['On', 'Event', 'If', 'Properties', 'EventType'].indexOf(name.substr(9)) === -1;
      }

      function propertyName(name) {
        var s = name.slice(9); // slice off the 'analytics' prefix
        if (typeof s !== 'undefined' && s!==null && s.length > 0) {
          return s.substring(0, 1).toLowerCase() + s.substring(1);
        }
        else {
          return s;
        }
      }

      return {
        restrict: 'A',
        link: function ($scope, $element, $attrs) {
          var eventType = $attrs.analyticsOn || inferEventType($element[0]);
          var trackingData = {};

          angular.forEach($attrs.$attr, function(attr, name) {
            if (isProperty(name)) {
              trackingData[propertyName(name)] = $attrs[name];
              $attrs.$observe(name, function(value){
                trackingData[propertyName(name)] = value;
              });
            }
          });

          angular.element($element[0]).bind(eventType, function ($event) {
            var eventName = $attrs.analyticsEvent || inferEventName($element[0]);
            trackingData.eventType = $event.type;

            if($attrs.analyticsIf){
              if(! $scope.$eval($attrs.analyticsIf)){
                return; // Cancel this event if we don't pass the analytics-if condition
              }
            }
            // Allow components to pass through an expression that gets merged on to the event properties
            // eg. analytics-properites='myComponentScope.someConfigExpression.$analyticsProperties'
            if($attrs.analyticsProperties){
              angular.extend(trackingData, $scope.$eval($attrs.analyticsProperties));
            }
            $analytics.eventTrack(eventName, trackingData);
          });
        }
      };
    }]);
})(window, window.angular);