angular.module('compassionIntranet')
.service('taxonomyService', ['COM_CONFIG', function(COM_CONFIG){
    
    /*!
    * Termset utilities
    Inspiration: http://www.habaneroconsulting.com/insights/returning-a-sharepoint-2013-termset-in-a-tree-structure-using-javascript
    */
  
   /**
     * Returns a termset, based on ID
     *
     * @param {masterTermSetId} guid - Termset ID
     */
    this.getTermFromMasterTermsetByGuid = function(masterTermSetId) {
        var deferred = jQuery.Deferred();

        getTermSetAsTree(masterTermSetId, '', function (terms) {
            if (terms != null) {
                deferred.resolve(terms.Nodes);
            }
            else {
                deferred.resolve(null);
            }
        });

        return deferred.promise();
    };

    /**
     * Returns a termset, based on ID
     *
     * @param {string} id - Termset ID
     * @param {object} callback - Callback function to call upon completion and pass termset into
     */
    function finishTermSetGet(termStore, id, callback, ctx) {
        var termSet = termStore.getTermSet(id);
        var terms = termSet.getAllTerms();

        ctx.load(terms, 'Include(Id,IsAvailableForTagging,CustomSortOrder,Name,PathOfTerm,LocalCustomProperties)');
        
        ctx.executeQueryAsync(Function.createDelegate(this, function (sender, args) {
            callback(terms);
        }),

        Function.createDelegate(this, function (sender, args) {
            
            
            console.log(args);
        
        }));
    }
    function getTermSet(id, callback) {
        
        if (false) { }
        else {
            SP.SOD.loadMultiple(['sp.js'], function () {
                // Make sure taxonomy library is registered
                SP.SOD.registerSod('sp.taxonomy.js', SP.Utilities.Utility.getLayoutsPageUrl('sp.taxonomy.js'));

                SP.SOD.loadMultiple(['sp.taxonomy.js'], function () {
                    var ctx = SP.ClientContext.get_current();
                    var taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(ctx);
                    var termStore = null;

                    var useSiteCollectionTermStore = false;
                    if (useSiteCollectionTermStore) {
                        termStore = taxonomySession.getDefaultSiteCollectionTermStore();
                        finishTermSetGet(termStore, id, callback, ctx);
                    }
                    else {    //Term Stores
                        //var termStores = taxonomySession.getDefaultSiteCollectionTermStore();
                        termStore = taxonomySession.getDefaultSiteCollectionTermStore();
                        finishTermSetGet(termStore, id, callback, ctx);
                    }
                });
            });
        }

    };


    /**
     * Returns an array object of terms as a tree
     *
     * @param {string} id - Termset ID
     * @param {object} callback - Callback function to call upon completion and pass termset into
     */
     function getTermSetAsTree(id, filterById, callback) {
        if (false) { }
        else {
            getTermSet(id, function (terms) {
                var outputNode = null;

                var termsEnumerator = terms.getEnumerator(),
                    tree = {
                        term: terms,
                        Nodes: []
                    };

                // Loop through each term
                while (termsEnumerator.moveNext()) {
                    var currentTerm = termsEnumerator.get_current();
                    if (true) {

                        var currentTermPath = currentTerm.get_pathOfTerm().split(';');
                        var Nodes = tree.Nodes;

                        // Loop through each part of the path
                        for (var i = 0; i < currentTermPath.length; i++) {
                            var foundNode = false;

                            for (var j = 0; j < Nodes.length; j++) {
                                if (Nodes[j].name === currentTermPath[i]) {
                                    foundNode = true;
                                    break;
                                }
                            }

                            // Select the node, otherwise create a new one
                            var term = foundNode ? Nodes[j] : { name: currentTermPath[i], Nodes: [],  };

                            // If we're a child element, add the term properties
                            if (i === currentTermPath.length - 1) {
                                term.term = currentTerm;
                                term.Value = currentTerm.get_name().replace('＆','&');
                                term.Key = term.Value;
                                term.NodeGuid = currentTerm.get_id().toString();
                                term.IsAvailableForTagging = currentTerm.get_isAvailableForTagging();
                                term.NewWindow = null;
                                term.Url = null;
                                term.IsValidLink = false;
                                term.IsPopular = false;
                                term.CustomProperties = currentTerm.get_objectData().get_properties()["LocalCustomProperties"];


                            }
                            /* if (term.NodeGuid == filterById){
                                outputNode = term;
                            }*/

                            // If the node did exist, let's look there next iteration
                            if (foundNode) {
                                Nodes = term.Nodes;
                            }
                                // If the segment of path does not exist, create it
                            else {
                                Nodes.push(term);

                                // Reset the children pointer to add there next iteration
                                if (i !== currentTermPath.length - 1) {
                                    Nodes = term.Nodes;
                                }
                            }

                        }
                    }
                }

                tree = sortTermsFromTree(tree);
                if (tree.Nodes.length > 0 && filterById != null && filterById != '') {
                    var parentNode = tree.Nodes[0];

                    for (var i = 0; i < parentNode.Nodes.length; i++) {
                        if (parentNode.Nodes[i].NodeGuid == filterById) {
                            callback(parentNode.Nodes[i]);
                        }
                    }

                    callback(null);
                }
                else {
                    callback(tree);
                }
            });
        }
    };

   
    /**
     * Sort children array of a term tree by a sort order
     *
     * @param {obj} tree The term tree
     * @return {obj} A sorted term tree
     */
    function sortTermsFromTree(tree) {
        // Check to see if the get_customSortOrder function is defined. If the term is actually a term collection,
        // there is nothing to sort.
        if (tree.Nodes.length && tree.term.get_customSortOrder) {
            var sortOrder = null;

            if (tree.term.get_customSortOrder()) {
                sortOrder = tree.term.get_customSortOrder();
            }

            // If not null, the custom sort order is a string of GUIDs, delimited by a :
            if (sortOrder) {
                sortOrder = sortOrder.split(':');

                tree.Nodes.sort(function (a, b) {
                    var indexA = sortOrder.indexOf(a.NodeGuid);
                    var indexB = sortOrder.indexOf(b.NodeGuid);

                    if (indexA > indexB) {
                        return 1;
                    } else if (indexA < indexB) {
                        return -1;
                    }

                    return 0;
                });
            }
                // If null, terms are just sorted alphabetically
            else {
                tree.Nodes.sort(function (a, b) {
                    if (a.Value > b.Value) {
                        return 1;
                    } else if (a.Value < b.Value) {
                        return -1;
                    }

                    return 0;
                });
            }
        }

        for (var i = 0; i < tree.Nodes.length; i++) {
            tree.Nodes[i] = sortTermsFromTree(tree.Nodes[i]);
        }

        return tree;
    };

}]);

module.exports.taxonomyService;

