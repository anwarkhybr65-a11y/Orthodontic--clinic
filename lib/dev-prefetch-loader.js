// Next.js skips prefetching in development, so every click waits on a fresh
// server render. These checks are compile-time constants; rewriting them lets
// the app warm a page before the click. Production builds do not use this loader.
module.exports = function enableDevPrefetch(source) {
  return source
    .replace(
      "if (process.env.NODE_ENV === 'development') {\n        return null;\n    }",
      "if (false) {\n        return null;\n    }",
    )
    .replace("if (!prefetchEnabled || process.env.NODE_ENV === 'development')", "if (!prefetchEnabled)")
    .replace("if (process.env.NODE_ENV !== 'development' && location)", "if (location)");
};
