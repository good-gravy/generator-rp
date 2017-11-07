angular.module('compassionIntranet').service('storage', ['common', function (common) {
    var version = 4;
    function set(key, value, expirationDuration, storageType) {
        var expire;
        if (key != 'v') {
            key = key;
            expire = (expirationDuration === 0 ? 0 : moment().add(expirationDuration, 'hours'));
        }
        try {
            if (!expirationDuration) {
                if (storageType == 'session') {
                    $pnp.storage.session.put(key, value);
                } else {
                    $pnp.storage.local.put(key, value);
                }                
            } else {
                if (storageType == 'session') {
                    $pnp.storage.session.put(key, value, expire);
                } else {
                    $pnp.storage.local.put(key, value, expire);
                }
            }
        } catch (e) {
            throw new Error('Storage set error for key: ' + key);
        }
    }    
    function get(key, storageType) {
        try {
            var item;
            if (storageType == 'session') {
                item = $pnp.storage.session.get(key);
            } else {
                item = $pnp.storage.local.get(key);
            }            
            return item;
        } catch (e) {
            throw new Error('Storage get error for key: ' + key);
        }
        return null;
    }
    function remove(key) {
        $pnp.storage.local.delete(key);
        $pnp.storage.session.delete(key);
    }
    function clearAll() {
        localStorage.clear();
    }
   
    /* Clear storage in old format */
    if (get('v') !== version) {
        localStorage.clear();
        set('v', version);
    }

    return {
        get: get,
        set: set,
        remove: remove,
        clearAll: clearAll
    };

}]);