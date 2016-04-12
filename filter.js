var async = require("async");
var docFilter =  require("./doc-filter");
var fieldFilter =  require("./field-filter");
var predicate = require("./predicate");
var skip = require("./skip");


module.exports = function(Model, mixinOptions) {

    var methodsToSkip = skip.getMethodsToSkip(Model, mixinOptions);


    // Ensure the request object on every type of hook
    Model.beforeRemote('**', function(ctx, modelInstance, next) {
        console.log("method args", ctx.args);
        return next();
        return async.series([
            skip.skipFilter(ctx, methodsToSkip),
            predicate.addPredicateFields(mixinOptions, ctx)
        ], function(err) {
            return (err && err !== true) ? next(err) : next();
        });
    });


    // Run the filter middleware on after every remote request
    Model.afterRemote("**", function (ctx, modelInstance, next) {
        console.log("after remote keys", Object.keys(ctx));
        console.log("method string", ctx.methodString);
        console.log("method keys", Object.keys(ctx.method));
        return next();
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
