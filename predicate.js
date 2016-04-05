var predicates = require("./predicates");


function addPredicateFields(mixinOptions, ctx) {
    return function(finalCb) {

        // Check for valid acceptedRoles and predicate
        if(!Array.isArray(mixinOptions.acceptedRoles) || typeof mixinOptions.predicate !== "string") {
            return finalCb();
        }

        // is the user limiting the fields?
        if(!Array.isArray(ctx.query.fields)) {
            return finalCb();
        }

        // Append any required fields to the query
        var predicate = predicates[mixinOptions.predicate];
        if(typeof predicate === "function" && Array.isArray(mixinOptions.requiredFields)) {

            var requiredField;
            for(var key in mixinOptions.requiredFields) {
                requiredField = mixinOptions.requiredFields[key];
                var queryIndex = ctx.query.fields.indexOf(requiredField);
                if(queryIndex === -1) {
                    ctx.query.fields.push(requiredField);

                    if(!Array.isArray(ctx.req.dirtyFields)) {
                        ctx.req.dirtyFields = [];
                    }
                    ctx.req.dirtyFields.push(requiredField);
                }
            }
        }

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
        && (filter.fields.indexOf(key) === -1 && ctx.req.dirtyFields.indexOf(key) !== -1)) {
        return true;
    } else if((!Array.isArray(filter.fields) && typeof filter.fields === "object" && Object.keys(filter.fields).length > 0)
        && (filter.fields[key] === false || ctx.req.dirtyFields.indexOf(key) !== -1)) {
        return true;
    }

    return false;
}


module.exports = {
    addPredicateFields: addPredicateFields,
    cleanPredicateFields: cleanPredicateFields
};