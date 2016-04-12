var async = require("async");
var docFilter =  require("./doc-filter");
var fieldFilter =  require("./field-filter");
var predicate = require("./predicate");
var skip = require("./skip");


module.exports = function(Model, mixinOptions) {

    var methodsToSkip = skip.getMethodsToSkip(Model, mixinOptions);


    // Ensure the request object on every type of hook
    Model.beforeRemote('**', function(ctx, modelInstance, next) {
        return async.series([
            skip.skipFilter(ctx, methodsToSkip),
            predicate.addPredicateFields(Model, mixinOptions, ctx)
        ], function(err) {
            return (err && err !== true) ? next(err) : next();
        });
    });


    // Run the filter middleware on after every remote request
    Model.afterRemote("**", function (ctx, modelInstance, next) {
        return async.series([
            skip.skipFilter(ctx, methodsToSkip),
            docFilter(Model, mixinOptions, ctx, modelInstance),
            fieldFilter(Model, mixinOptions, ctx, modelInstance),
            predicate.cleanPredicateFields(ctx, modelInstance)
        ], function(err) {
            return (err && err !== true) ? next(err) : next();
        });
    });
};
