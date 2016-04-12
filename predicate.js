var predicates = require("./predicates");
var packageJSON = require("./package");
var utils = require("xloop").utils;


function addPredicateFields(Model, mixinOptions, ctx) {
    return function(finalCb) {

        // Check for valid acceptedRoles and predicate
        if(!Array.isArray(mixinOptions.acceptedRoles) || typeof mixinOptions.predicate !== "string") {
            return finalCb();
        }

        // Does the client request include a filter
        if(!ctx.args.filter) {
            return finalCb();
        }
        var filter = JSON.parse(ctx.args.filter);

        // is the user limiting the fields?
        if(!filter.fields) {
            return finalCb();
        }

        Model = utils.getModelFromRemoteMethod(Model, ctx.method.name);

        // Check for the mixin key in the model's settings
        mixinOptions = Model.definition.settings.mixins[packageJSON.mixinName];
        if (typeof mixinOptions !== "object") {
            return finalCb();
        }

        // Append any required fields to the query
        var predicate = predicates[mixinOptions.predicate];
        if(typeof predicate !== "function"
            || !Array.isArray(mixinOptions.requiredFields)
            || mixinOptions.requiredFields.length < 1) {
            return finalCb();
        }

        if(!Array.isArray(ctx.req.dirtyFields)) {
            ctx.req.dirtyFields = [];
        }

        var requiredField;
        for(var key in mixinOptions.requiredFields) {
            requiredField = mixinOptions.requiredFields[key];


            // Inject field into array
            if(Array.isArray(filter.fields) && filter.fields.length > 0) {

                var queryIndex = filter.fields.indexOf(requiredField);
                if(queryIndex === -1) {
                    filter.fields.push(requiredField);

                    ctx.req.dirtyFields.push(requiredField);
                }

                // Inject field into object
            } else if(typeof filter.fields === "object" && Object.keys(filter.fields).length > 0) {

                // Are we using negative fields and is the our field included
                var firstKey = Object.keys(filter.fields)[0];
                var firstElement = filter.fields[firstKey];
                if(firstElement === false
                    && filter.fields[requiredField] !== undefined) {

                    delete filter.fields[requiredField];
                    ctx.req.dirtyFields.push(requiredField);
                } else if(firstElement === true
                    && !filter.fields[requiredField]) {

                    filter.fields[requiredField] = true;
                    ctx.req.dirtyFields.push(requiredField);
                }
            }
        }

        ctx.args.filter = JSON.stringify(filter);

        return finalCb();
    }
}

function cleanPredicateFields(ctx, modelInstance) {
    return function(finalCb) {

        if (!Array.isArray(ctx.req.dirtyFields) || !ctx.result) {
            return finalCb();
        }

        // Parse filter from query string
        var filter = {};
        if(typeof ctx.args.filter === "string") {
            filter = JSON.parse(ctx.args.filter);
        }

        var answer;
        if (Array.isArray(modelInstance)) {
            answer = [];
            ctx.result.forEach(function (result) {
                var replacement = {};
                for (var key in result["__data"]) {

                    if(isDirty(ctx, filter, key)) {
                        continue;
                    }

                    replacement[key] = result["__data"][key];
                }
                answer.push(replacement);
            });
        } else {
            answer = {};
            for (var key in ctx.result["__data"]) {

                if(isDirty(ctx, filter, key)) {
                    continue;
                }

                answer[key] = ctx.result["__data"][key];
            }
        }
        ctx.result = answer;

        return finalCb();
    }
};

function isDirty(ctx, filter, key) {
    if((Array.isArray(filter.fields) && filter.fields.length > 0)
        && ctx.req.dirtyFields.indexOf(key) !== -1) {
        return true;
    } else if(!Array.isArray(filter.fields)
        && typeof filter.fields === "object"
        && ctx.req.dirtyFields.indexOf(key) !== -1) {
        return true;
    }
    return false;
}


module.exports = {
    addPredicateFields: addPredicateFields,
    cleanPredicateFields: cleanPredicateFields
};