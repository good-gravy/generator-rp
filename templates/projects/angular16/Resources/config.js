$pnp.setup({
    defaultCachingStore: "local",
    defaultCachingTimeoutSeconds: 600,
    globalCacheDisable: false
});
// set up static configuration entries
var myApp = angular.module('<%= applicationName %>');
if (document.location.host === '') {
    if (document.location.pathname.toLowerCase().indexOf('') !== -1) {
        myApp.constant('CONFIG', {
            isProduction: true,
            msGraph: {
                appId: '',
                redirectUri: '',
                interactionMode: 'popUp',
                graphEndpoint: 'https://graph.microsoft.com/v1.0/me',
                graphScopes: ['user.read.all']
            },
            yammer: {
                appId: '',
                network: '',
                defaultGroupId: ''
            },
            termSets: {
                
            },
            terms: {
                
            },
            pictureUrl: '/_layouts/15/userphoto.aspx?size=L&accountname=',
            useCaching: false,
            rootWeb: '',
            newsWeb: '',
            searchResultPage: '',
            locationByLatLongUrl: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=',
            delveSearchUrlPrefix: 'https://nam.delve.office.com/?q=',
            delveSearchUrlSuffix: '&searchpage=1&searchview=people&v=search',
            lists: {
                
            },
            storage: [
                { service: 'appService', key: 'CI_USER_APP_KEY', expire: 24, clearCommand: 'clearMyApps' },                
            ],
            contentTypeIds: {
                
            }
        });
    }
    else {
        myApp.constant('CONFIG', {
            isProduction: true,
            msGraph: {
                appId: '',
                redirectUri: '',
                interactionMode: 'popUp',
                graphEndpoint: 'https://graph.microsoft.com/v1.0/me',
                graphScopes: ['user.read.all']
            },
            yammer: {
                appId: '',
                network: '',
                defaultGroupId: ''
            },
            termSets: {
                
            },
            terms: {
                
            },
            pictureUrl: '/_layouts/15/userphoto.aspx?size=L&accountname=',
            useCaching: false,
            rootWeb: '',
            newsWeb: '',
            searchResultPage: '',
            locationByLatLongUrl: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=',
            delveSearchUrlPrefix: 'https://nam.delve.office.com/?q=',
            delveSearchUrlSuffix: '&searchpage=1&searchview=people&v=search',
            lists: {
                
            },
            storage: [
                { service: 'appService', key: 'CI_USER_APP_KEY', expire: 24, clearCommand: 'clearMyApps' },                
            ],
            contentTypeIds: {
                
            }
        });
    }
}
//Dev Tenant
else {
    myApp.constant('CONFIG', {
        isProduction: true,
        msGraph: {
            appId: '',
            redirectUri: '',
            interactionMode: 'popUp',
            graphEndpoint: 'https://graph.microsoft.com/v1.0/me',
            graphScopes: ['user.read.all']
        },
        yammer: {
            appId: '',
            network: '',
            defaultGroupId: ''
        },
        termSets: {
            
        },
        terms: {
            
        },
        pictureUrl: '/_layouts/15/userphoto.aspx?size=L&accountname=',
        useCaching: false,
        rootWeb: '',
        newsWeb: '',
        searchResultPage: '',
        locationByLatLongUrl: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=',
        delveSearchUrlPrefix: 'https://nam.delve.office.com/?q=',
        delveSearchUrlSuffix: '&searchpage=1&searchview=people&v=search',
        lists: {
            
        },
        storage: [
            { service: 'appService', key: 'CI_USER_APP_KEY', expire: 24, clearCommand: 'clearMyApps' },                
        ],
        contentTypeIds: {
            
        }
    });
}