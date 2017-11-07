angular.module('compassionIntranet').service('userProfileService', ['$http', '$q', 'COM_CONFIG', function ($http, $q, COM_CONFIG) {
    return {
        getUserProfile: getUserProfile,
        getUserLocation: getUserLocation,
        getCurrentUserProfile: getCurrentUserProfile,
        getUserDepartment: getUserDepartment,
        getUsersInMyDepartment: getUsersInMyDepartment,
        getUserFromUserInfo: getUserFromUserInfo
    }
    function getUsersInMyDepartment(department) {
        var defer = $q.defer();
        let web = new $pnp.Web(COM_CONFIG.rootWeb);
        web.lists.getByTitle(COM_CONFIG.lists.userInfo).items
            .filter("Department eq '" + department + "'")
            .get()
            .then(function (data) {
                defer.resolve(data);
            });

        return defer.promise;
    }
    function getUserByUserName(userName) {
        var defer = $q.defer();
        $pnp.sp.profiles.getPropertiesFor(userName).then(function (result) {
            if (!COM_CONFIG.isProduction) { console.log("User Profile Service", result); }            
            defer.resolve(result);
        }).catch(function (err) {
            console.log("User Profile Service Error: " + err);
        });
        return defer.promise;
    }
    function getUserFromUserInfo(id) {
        var defer = $q.defer();
        let web = new $pnp.Web(COM_CONFIG.rootWeb);
        web.lists.getByTitle(COM_CONFIG.lists.userInfo).items
            .getById(id)
            .get()
            .then(function (data) {
                defer.resolve(data);
            });

        return defer.promise;
    }
    function getCurrentUserProfile() {
        var defer = $q.defer();
        $pnp.sp.profiles.myProperties.get().then(function (data) {
            defer.resolve(data);
        });
        
        return defer.promise;
    }
    function getUserLocation() {
        var user = "i:0#.f|membership|" + _spPageContextInfo.userLoginName;
        return ($pnp.sp.profiles.getUserProfilePropertyFor(user, "SPS-Location"))
    }
    function getUserDepartment() {
        var user = "i:0#.f|membership|" + _spPageContextInfo.userLoginName;
        return ($pnp.sp.profiles.getUserProfilePropertyFor(user, "Department"))
    }
    function getUserProfile(emailArray) {
        var promiseArray = [];
        for (var i = 0; i < emailArray.length; i++) {
            promiseArray.push($pnp.sp.profiles.getPropertiesFor("i:0#.f|membership|" + emailArray[i]));
        }
        //Since there aree multiple calls we need to push each of them to an array and return that array of promises
        //Promise.all will only resolve when all of the promises in the array are resolved.
        return Promise.all(promiseArray);
    }

}]);