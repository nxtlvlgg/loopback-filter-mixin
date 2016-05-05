var async = require("async");
var packageJSON = require("./package");
var predicates = require("./predicates");
var utils = require("xloop").utils;


function filterDocs(Model, mixinOptions, ctx, modelInstance) {
    return function(finalCb) {

        ctx.Model = utils.getModelFromRemoteMethod(Model, ctx.method.name);

        // Check for the mixin key in the model's settings
        mixinOptions = ctx.Model.definition.settings.mixins[packageJSON.mixinName];
        if (typeof mixinOptions !== "object") {
            return finalCb();
        }

        // Check for valid acceptedRoles and predicate
        if(!Array.isArray(mixinOptions.acceptedRoles) || typeof mixinOptions.predicate !== "string") {
            return finalCb();
        }

        // Check if we have any data to filter
        if (!ctx.result) {
            return finalCb();
        }

        // Handle arrays of results
        if (Array.isArray(modelInstance)) {
            return filterResults(ctx, mixinOptions, finalCb);
            // Handle a single result
        } else {
            return filterResult(ctx, mixinOptions, finalCb);
        }
    }
}

function filterResults(ctx, mixinOptions, finalCb) {
    var answer = [];

    async.each(ctx.result, function(result, resultCb) {

        // Handle predicate
        var predicate = predicates[mixinOptions.predicate];
        if (typeof predicate === "function" && !predicate(result)) {
            answer = ctx.result;
            return resultCb();
        }

        // Check for userId
        var userId;
        if(!ctx.req || !ctx.req.accessToken || !ctx.req.accessToken.userId) {
            return resultCb();
        }
        userId = ctx.req.accessToken.userId;

        var User = ctx.Model.app.models.user;
        return User.isInRoles(userId,
            mixinOptions.acceptedRoles,
            ctx.req,
            {modelClass: ctx.Model.definition.name, modelId: result.id},
            function (err, isInRoles) {
                if(err) return resultCb(err);
                if(!isInRoles.none) {
                    // don't allow duplicate results for double matches
                    if (answer.indexOf(result) === -1) {
                        answer.push(result);
                    }
                }
                return resultCb();
            }
        );
    }, function(err) {
        return done(err, ctx, answer, finalCb);
    });
}

function filterResult(ctx, mixinOptions, finalCb) {
    var answer = {};

    // Handle predicate
    var predicate = predicates[mixinOptions.predicate];
    if (typeof predicate === "function" && !predicate(ctx.result)) {
        answer = ctx.result;
        return done(undefined, ctx, answer, finalCb);
    }

    // Check for userId
    var userId;
    if(!ctx.req || !ctx.req.accessToken || !ctx.req.accessToken.userId) {
        var noModelErr = new Error('unable to find model');
        noModelErr.statusCode = 404;
        noModelErr.code = 'MODEL_NOT_FOUND';
        return done(noModelErr, ctx, answer, finalCb);
    }
    userId = ctx.req.accessToken.userId;

    var User = ctx.Model.app.models.user;
    return User.isInRoles(userId,
        mixinOptions.acceptedRoles,
        ctx.req,
        {modelClass: ctx.Model.definition.name, modelId: ctx.result.id},
        function (err, isInRoles) {
            if(err) return finalCb(err);
            else if(isInRoles.none) {
                var noModelErr = new Error('unable to find model');
                noModelErr.statusCode = 404;
                noModelErr.code = 'MODEL_NOT_FOUND';
                return done(noModelErr, undefined, undefined, finalCb);
            }

            answer = ctx.result;
            return done(undefined, ctx, answer, finalCb);
        }
    );
}

function done(err, ctx, answer, finalCb) {
    if(err) return finalCb(err);

    ctx.result = answer;
    return finalCb();
}





module.exports = filterDocs