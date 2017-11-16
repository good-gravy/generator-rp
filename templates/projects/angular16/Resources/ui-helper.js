'use strict';
var myApp = angular.module('<%= applicationName %>'),
    controllerName = 'uiHelper';

myApp.controller(controllerName, ['$scope', 'storage', 'CONFIG', function ($scope, storage, COM_CONFIG) {
    var userDisplayName = _spPageContextInfo.userDisplayName,
    userId = _spPageContextInfo.userId;
    var userFirstName = getFirstName(userDisplayName);
    var userLastName = getLastName(userDisplayName);
    var toolBarStatusCacheKey = 'toolbarStatus';
    //Setup Responsive Variables
    var isMobile = "",
    isTablet = "",
    isDesktop = "";

    var ctrl = this;
    

    $scope.init = function () {
                
    };
    
    //check window size and setup functions
    function processWindowSize() {
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE");

        if (msie > 0)  // If Internet Explorer
        {
            var width = window.innerWidth;
        }
        else  // If another browser
        {
            var width = $(window).width();
        }

        if (width >= 991) {
            isMobile = false;
            isTablet = false;
            isDesktop = true;
        } else if (width >= 768) {
            isTablet = true;
        } else {
            isMobile = true;
            isTablet = false;
            isDesktop = false;
        }

        //setup functions that need to be ran on resize
        rightRailHeight();
    }//processWindowSize
}]);