//import pnp from "sp-pnp-js";

angular.module('compassionIntranet')
    .service('yammerApiService', function ($q, $interval, $timeout, COM_CONFIG) {
        var ctrl = this;
        ctrl.authToken = null;
        ctrl.requestQueue = {
            items: [],
            slowRequests: false
        }
        ctrl.numOfRequests = 0;


        ctrl.newObject = function (a) {
            let array = [];
            let ob;
            a.forEach(function (x) {
                ob = {
                    Path: x.Path,
                    SiteTitle: x.SiteTitle,
                    Title: x.Title,
                    Modified: new Date(x.Write)
                }
                array.push(ob);
            });
            return array;
        }

        ctrl.ensureConnection = function () {
            var deferred = $q.defer();
            // var yam = window.yam || null;
            if (yam !== null) {
                yam.getLoginStatus(function (response) {
                    if (response.authResponse) {
                        yam.platform.setAuthToken(response.access_token.token);
                        deferred.resolve();
                    } else {
                        console.log("Not logged in. Pulling token from User Profile");

                        var loginName = "i:0#.f|membership|" + _spPageContextInfo.userLoginName;

                        $pnp.sp.profiles.getUserProfilePropertyFor(loginName).then(function (authToken) {
                            if (authToken) {
                                localStorage.removeItem("yammer_token");
                                localStorage.setItem("yammer_token", authToken);
                                yam.platform.setAuthToken(authToken, function (response) {});
                            }
                            deferred.resolve();
                        }, function (err) {
                            console.log("Could not retrieve token from User Profile.  Error data", err);
                            deferred.reject(err);
                        });
                    }
                });
            } else {
                console.log("Yam undefined");
                deferred.reject();
            }
            return deferred.promise;
        }

        ctrl.getOpenGraphObjectFull = function (openGraphObjectId) {
            var def = $q.defer();
            var me = this;
            var endpoint = "messages/open_graph_objects/" + openGraphObjectId + ".json";

            var getData = function () {
                var getDataDeferred = $q.defer();
                me.queueThrottledRequest({
                    url: endpoint,
                    method: 'GET',
                    data: {},
                    success: function (response) {
                        getDataDeferred.resolve(response);
                    },
                    error: function (response) {
                        console.log("Error in getOpenGraphObjectFull", response);
                    }
                });

                return getDataDeferred.promise;
            }


            var cacheObj = $pnp.storage.local;
            let expireMe = $pnp.util.dateAdd(new Date(), "minute", 5);

            cacheObj.getOrPut("yammer_cache/" + endpoint, getData, expireMe).then(function (data) {
                def.resolve(data);
            });

            return def.promise;
        }

        ctrl.getOpenGraphObjectRecursive = function (openGraphObjectId, olderThanMessageId, messages) {
            var def = $q.defer();
            var me = this;
            me.getOpenGraphObject(openGraphObjectId, olderThanMessageId).then(function (data) {
                if (data.messages.length > 0) {
                    messages.push(data.messages);
                    var lastMessage = data.messages[data.messages.length - 1];
                    me.getOpenGraphObjectRecursive(openGraphObjectId, lastMessage.id, messages).then(function (x) {
                        def.resolve(messages);
                    });
                } else {
                    def.resolve(messages);
                }
            });

            return def.promise;
        };

        ctrl.getOpenGraphObject = function (openGraphObjectId, olderThanMessageId) {
            var def = $q.defer();
            var me = this;
            var olderThanMessageIdQueryString = "";

            if (olderThanMessageId != null) {
                olderThanMessageIdQueryString = "&older_than=" + olderThanMessageId;
            }
            var endpoint = "messages/open_graph_objects/" + openGraphObjectId + ".json?threaded=extended" + olderThanMessageIdQueryString;

            var getData = function () {
                var getDataDeferred = $q.defer();
                var requestObj = {
                    url: endpoint,
                    method: "GET",
                    data: {},
                    success: function (data) {
                        getDataDeferred.resolve(data)
                    },
                    error: function (err) {
                        console.log("getOpenGraphObject", err);
                        getDataDeferred.reject(err);
                    }
                }

                me.queueThrottledRequest(requestObj);
                return getDataDeferred.promise;
            }

            var cacheObj = $pnp.storage.local;
            let expireMe = $pnp.util.dateAdd((new Date()), "minute", 5);

            getData().then(function (data) {
                def.resolve(data);
            });

            return def.promise;
        }


        ctrl.getOpenGraphItemByUrl = function (url) {
            var def = $q.defer();
            var me = this;
            var endpoint = "open_graph_objects.json";

            var getData = function () {
                var getDataDeferred = $q.defer();
                yam.platform.request({
                    url: endpoint,
                    method: "GET",
                    data: {
                        'url': url
                    },
                    success: function (data) {
                        getDataDeferred.resolve(data);
                    },
                    error: function (err) {
                        if (err.status == 404) {
                            getDataDeferred.resolve(null);
                        } else {
                            console.warn(err);
                            def.reject(err);
                        }
                    }
                });

                return getDataDeferred.promise;
            }

            var cacheObj = $pnp.storage.local;
            let expireMe = $pnp.util.dateAdd((new Date()), "minute", 5);
            me.ensureConnection().then(function (response) {
                /*
                cacheObj.getOrPut("yammer_cache/" + endpoint, getData, expireMe).then(function (data) {
                    def.resolve(data);
                });
                */
                getData().then(function (data) {
                    def.resolve(data);
                });
            });
            


            return def.promise;
        }

        ctrl.queueThrottledRequest = function (options) {
            if (document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/"
                || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/pages/default.aspx" 
                || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/news/pages/default.aspx" 
                || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/news/" ){
                this.requestQueue.items.push(options)
            }
            else {
                yam.platform.request(options);
            }
        }

        ctrl.processThrottledRequests = function () {
            var me = this;
            var slowSpeed = 1200;
            var fastSpeed = 300;
            var requestDelay = fastSpeed;
            var interval;// = Math.floor(Math.random() * 1200) + 500;
            //if (me.numOfRequests > 10){
                
            if (document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/"
                || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/pages/default.aspx" 
                || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/news/pages/default.aspx" 
                || document.location.href.toLocaleLowerCase() === COM_CONFIG.rootWeb + "/news/" ) {
                interval = 300;
                $interval(function () {
                    if (me.requestQueue.items.length > 0) {
                        var item = me.requestQueue.items.shift();
                        if (item) {
                            console.log("processThrottledRequests: Processing item", item)
                            yam.platform.request(item);
                        }
                    }
                }, interval);
            }
            else {
                console.log("Not throttling Yammer requests for this page");
            }
            
        }

        ctrl.getYammerGroupsForUser = function () {
            var def = $q.defer();
            var me = this;
            // var yam = window.yam || null;
            if (yam !== null) {
                me.ensureConnection().then(function (response) {
                    //me.makeRequest("https://api.yammer.com/api/v1/users/current.json?include_group_memberships=true", "GET", {}, 

                    yam.platform.request({
                        url: "https://api.yammer.com/api/v1/groups.json?mine=1",
                        method: "GET",
                        data: {},
                        success: function (data) {
                            console.log("Yammer Groups", data);
                            var groups = data;

                            groups = groups.sort(function (x, y) {
                                return new Date(x.stats.last_message_at) < new Date(y.stats.last_message_at);
                            });

                            groups = groups.slice(0, 3);
                            groups.map(function (item) {
                                item.Modified = new Date(item.stats.last_message_at);
                                if (item.Modified.getYear() == 69) {
                                    item.Modified = "No Yammer Posts";
                                } else {
                                    item.Modified = (item.Modified).format('MMMM D, YYYY');
                                }

                            });

                            def.resolve(groups);
                        },
                        error: function (err) {
                            console.warn(err);
                            def.reject();
                        }
                    });
                }, function () {
                    console.log("Not logged in. Trying again");
                    //setTimeout(me.getYammerGroupsForUser(), 1200);
                }).catch(function (err) {
                    console.log("Yammer not logged in.")
                    def.reject(err);
                });
            }
            return def.promise;
        }
        ctrl.getLikeCountForMessage = function (location) {
            var def = $q.defer();
            var me = this;
            if (yam !== null) {
                try {
                    me.ensureConnection().then(function (response) {
                        ctrl.getOpenGraphItemByUrl(location).then(function (response) {
                            if (response == null) {
                                def.resolve(0);
                                return def.promise;
                            }
                            ctrl.getOpenGraphObject(response.id).then(function (data) {
                                var likeCount = 0;
                                for (var i = 0; i < data.messages.length; i++) {
                                    var message = data.messages[i];
                                    likeCount = likeCount + message.liked_by.count;
                                }
                                def.resolve(likeCount);
                            });
                        });
                    });
                }
                catch(err) {
                    def.resolve(0);
                }
            }
            return def.promise;
        }
        ctrl.getLikesByThreadId = function (threadId) {
            var me = this;
            var def = $.Deferred();
            var url = "messages/in_thread/" + threadId + ".json?threaded=extended";
            var totalLikes = 0;
            me.ensureConnection().then(function (response) {
                yam.platform.request({
                    url: url,
                    method: "GET",
                    data: {},
                    success: function (data) {
                        var likeCount = 0;
                        for (var i = 0; i < data.messages.length; i++) {
                            var message = data.messages[i];
                            likeCount = likeCount + message.liked_by.count;
                        }
                        def.resolve(likeCount);
                    },
                    error: function (msgErr) {
                        console.log("getLikestByThreadId - no messages.");
                        def.reject();
                    }
                });
            });
            return def.promise();
        }
        ctrl.getMessagesForGroup = function (groupId) {
            var def = $q.defer();
            var me = this;
            if (yam !== null) {
                me.ensureConnection().then(function (response) {
                    yam.platform.request({
                        url: "https://www.yammer.com/api/v1/messages/in_group/" + groupId + ".json",
                        method: "GET",
                        data: {},
                        success: function (data) {
                            console.log("Yammer Groups", data);
                            var groups = data;

                            groups = groups.sort(function (x, y) {
                                return new Date(x.stats.last_message_at) < new Date(y.stats.last_message_at);
                            });

                            groups = groups.slice(0, 3);
                            groups.map(function (item) {
                                item.Modified = new Date(item.stats.last_message_at);
                                if (item.Modified.getYear() == 69) {
                                    item.Modified = "No Yammer Posts";
                                } else {
                                    item.Modified = (item.Modified).format('MMMM D, YYYY');
                                }

                            });

                            def.resolve(groups);
                        },
                        error: function (err) {
                            console.warn(err);
                            def.reject();
                        }
                    });
                }, function () {
                    console.log("Not logged in. Trying again");
                    //setTimeout(me.getYammerGroupsForUser(), 1200);
                }).catch(function (err) {
                    console.log("Yammer not logged in.")
                    def.reject(err);
                });
            }
            return def.promise;
        }
        ctrl.formatUrl = function (url) {
            if (url.startsWith("http") == false) {
                if (url.endsWith("/")) {
                    url = url.substring(0, url.length - 1);
                }

                if (url.startsWith("/") == false) {
                    url = "/" + url;
                }

                var rex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
                var fullUrl = location.href;
                var rootWeb = fullUrl.match(rex)[0]
                url = rootWeb + url
            }
            return url;
        }

        ctrl.isGraphObjectCreatedForUrl = function (url, getCommentsAndLikes) {
            var defer = $q.defer();
            var me = this;
            me.ensureConnection().then(function (response) {
                me.getOpenGraphItemByUrl(url).then(function (data) {
                    if (getCommentsAndLikes) {
                        var opengraphId = data.id;

                        var messages = [];
                        var likes = 0;

                        me.getOpenGraphObjectRecursive(opengraphId, null, []).then(function (pages) {
                            //me.getOpenGraphObjectFull(opengraphId).then(function (pages) {

                            var returnObj = {
                                likeCount: 0,
                                commentCount: 0
                            };


                            if (pages.length > 0){
                                for (var i = 0; i < pages.length; i++) {
                                    var page = pages[i];
                                    returnObj.commentCount += page.length;
                                }

                                // check if the first comment is a dummy comment inserted by the system
                                if (pages[0][0].body.rich == ""){
                                    // subtract 1 from the comment count because the first comment is the "dummy comment" inserted by the page
                                    returnObj.commentCount = returnObj.commentCount - 1;
                                }        
                            }
                            else {
                                returnObj.commentCount = 0;
                            }

                            defer.resolve(returnObj);
                        });
                    } else {
                        defer.resolve(data);
                    }
                }, function (errorData) {
                    if (errorData.statusText === "Not Found") {
                        defer.resolve(errorData.statusText);
                    } else {
                        console.log("Yammer error", errorData);
                        defer.reject();
                    }
                });
            }, function (errorData) {
                if (errorData.statusText === "Not Found") {
                    defer.resolve(errorData.statusText);
                } else {
                    console.log("Yammer error", errorData);
                    defer.reject();
                }
            });

            return defer.promise;
        }

        ctrl.createGraphObject = function (url, title, defaultGroupId) {
            var defer = $q.defer();
            var endpoint = 'https://api.yammer.com/api/v1/messages.json';

            if (angular.isDefined(defaultGroupId) == false){
                defaultGroupId = COM_CONFIG.yammer.defaultGroupId;
            }

            var obj = {
                og_url: url,
                og_title: title,
                group_id: defaultGroupId
            };
            yam.platform.request({
                url: endpoint,
                method: 'POST',
                data: obj,
                success: function (response) {
                    defer.resolve(response);
                },
                error: function (errorResponse) {
                    defer.resolve("Error creating Yammer converstion.  Contact IT Support");
                }
            });
            return defer.promise;
        }

        // initialize throttle requests
        ctrl.processThrottledRequests();
    });