var async = require("async");
var packageJSON = require("./package");
var predicates = require("./predicates");


function filterDocs(Model, mixinOptions, ctx, modelInstance) {
    return function(finalCb) {

        // Check if we should skip filtering
        if(ctx.method.skipFilter) {
            return finalCb();
        }

        // See if we're fulfilling a relation request and get the associated model
        var modelName = ctx.methodString.split(".")[0];
        var methodArr = ctx.methodString.split("__");
        if (methodArr.length > 1) {
            var relationName = methodArr[methodArr.length - 1];
            modelName = Model.app.models[modelName].settings.relations[relationName].model;
        }
        ctx.Model = Model.app.models[modelName];

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
                    answer.push(result);
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
        return done(undefined, ctx, answer, finalCb);
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
                return done(noModelErr)
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