
var CHILD_COUNT_PREFIX = "__count__";


function getMethodsToSkip(Model, mixinOptions) {

    var methodsToSkip = [];

    // Add root count method
    methodsToSkip.push("count");

    // Add count for each relation
    for(var key in Model.relations) {
        methodsToSkip.push(CHILD_COUNT_PREFIX + key);
    }

    // Add user specified methods
    if(Array.isArray(mixinOptions.skipRemotes)) {
        methodsToSkip = methodsToSkip.concat(mixinOptions.skipRemotes);
    }
    return methodsToSkip;
}


function skipFilter(ctx, methodsToSkip) {
    return function(finalCb) {
        var shouldSkipFilter = (methodsToSkip.indexOf(ctx.method.name) !== -1)
            ? true : undefined;
        return finalCb(shouldSkipFilter);
    }
}

module.exports = {
    getMethodsToSkip: getMethodsToSkip,
    skipFilter: skipFilter
};