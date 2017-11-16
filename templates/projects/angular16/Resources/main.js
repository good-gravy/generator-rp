var app = angular.module('<%= applicationName %>', []).config(function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
        // Allow same origin resource loads.
        'self',
        // Allow loading from our assets domain. **.
        'https://api.rss2json.com/**',
        'https://api.ipify.org/**',
        'https://api.yammer.com/**'
    ]);

});

require("../main/config.js");
require('../main/common.js');

// Services


// System Components

require('../main/modal.js');
require('../main/ui-helper.js');

// Components


