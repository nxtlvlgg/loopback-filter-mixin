var async = require("async");
var docFilter =  require("./doc-filter");
var fieldFilter =  require("./field-filter");
var predicate = require("./predicate");
var reqCache = require("xloop").reqCache;


module.exports = function(Model, mixinOptions) {

    // Ensure the request object on every type of hook
    Model.beforeRemote('**', function(ctx, modelInstance, next) {
        reqCache.setRequest(ctx);
        next();
    });


    // Make sure that we include the necessary predicate fields to the query
    Model.observe("access", function(ctx, next) {
        ctx.req = reqCache.getRequest();
        async.series([
            predicate.addPredicateFields(mixinOptions, ctx)
        ], next);
    });


    // Do not filter count query
    Model.afterRemote("count", function (ctx, modelInstance, next) {
        ctx.method.skipFilter = true;
        return next();
    });


    // Run the filter middleware on after every remote request
    Model.afterRemote("**", function (ctx, modelInstance, next) {
        async.series([
            docFilter(Model, mixinOptions, ctx, modelInstance),
            fieldFilter(Model, mixinOptions, ctx, modelInstance),
            predicate.cleanPredicateFields(ctx, modelInstance)
        ], next);
    });
};
