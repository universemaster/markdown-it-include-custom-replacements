/*! markdown-it-include-custom-replacements 2.0.0 https://github.com//camelaissani/markdown-it-include-custom-replacements @license MIT */

(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  const path = require('path');

  const fs = require('fs');

  const INCLUDE_RE = /!{3}\s*include(.+?)!{3}/i;
  const BRACES_RE = /\((.+?)\)/i;

  const include_plugin = (md, options) => {
    const defaultOptions = {
      root: '.',
      getRootDir: (pluginOptions
      /*, state, startLine, endLine*/
      ) => pluginOptions.root,
      includeRe: INCLUDE_RE,
      throwError: true,
      bracesAreOptional: false,
      notFoundMessage: 'File \'{{FILE}}\' not found.',
      circularMessage: 'Circular reference between \'{{FILE}}\' and \'{{PARENT}}\'.'
    };

    if (typeof options === 'string') {
      options = _extends({}, defaultOptions, {
        root: options
      });
    } else {
      options = _extends({}, defaultOptions, options);
    }

    const _replaceIncludeByContent = (src, rootdir, parentFilePath, filesProcessed) => {
      filesProcessed = filesProcessed ? filesProcessed.slice() : []; // making a copy

      let cap, filePath, mdSrc, errorMessage; // store parent file path to check circular references

      if (parentFilePath) {
        filesProcessed.push(parentFilePath);
      }

      while (cap = options.includeRe.exec(src)) {
        let includePath = cap[1].trim();
        const sansBracesMatch = BRACES_RE.exec(includePath);

        if (!sansBracesMatch && !options.bracesAreOptional) {
          errorMessage = `INCLUDE statement '${src.trim()}' MUST have '()' braces around the include path ('${includePath}')`;
        } else if (sansBracesMatch) {
          includePath = sansBracesMatch[1].trim();
        } else if (!/^\s/.test(cap[1])) {
          // path SHOULD have been preceeded by at least ONE whitespace character!

          /* eslint max-len: "off" */
          errorMessage = `INCLUDE statement '${src.trim()}': when not using braces around the path ('${includePath}'), it MUST be preceeded by at least one whitespace character to separate the include keyword and the include path.`;
        }

        if (!errorMessage) {
          filePath = path.resolve(rootdir, includePath); // check if child file exists or if there is a circular reference

          if (!fs.existsSync(filePath)) {
            // child file does not exist
            errorMessage = options.notFoundMessage.replace('{{FILE}}', filePath);
          } else if (filesProcessed.indexOf(filePath) !== -1) {
            // reference would be circular
            errorMessage = options.circularMessage.replace('{{FILE}}', filePath).replace('{{PARENT}}', parentFilePath);
          }
        } // check if there were any errors


        if (errorMessage) {
          if (options.throwError) {
            throw new Error(errorMessage);
          }

          mdSrc = `\n\n# INCLUDE ERROR: ${errorMessage}\n\n`;
        } else {
          // get content of child file
          mdSrc = fs.readFileSync(filePath, 'utf8'); // check if child file also has includes

          mdSrc = _replaceIncludeByContent(mdSrc, path.dirname(filePath), filePath, filesProcessed); // remove one trailing newline, if it exists: that way, the included content does NOT
          // automatically terminate the paragraph it is in due to the writer of the included
          // part having terminated the content with a newline.
          // However, when that snippet writer terminated with TWO (or more) newlines, these, minus one,
          // will be merged with the newline after the #include statement, resulting in a 2-NL paragraph
          // termination.

          const len = mdSrc.length;

          if (mdSrc[len - 1] === '\n') {
            mdSrc = mdSrc.substring(0, len - 1);
          } // To workaround a bug https://github.com/mjbvz/markdown-it-katex/issues/3
          // relating to list continuation
          // after a kaTex display equation, we need to remove
          // any line break before display equations.
          // However, we need to not touch lines that begin immediately with $$.


          mdSrc = mdSrc.replaceAll(/\n(\s+\$\$)/gm, '$1') // We'll also put a space before differentials that end integrals.  I don't want to cluster my tex source with this nonsense.
          .replaceAll(/(∫.+?)( d)(a|A|s|t|x|y|u|v|V|z|θ)/gm, '$1\\,d$3').replaceAll(/\\textbf\{([^}]{2,})\}/gm, '\\style{font-weight:bold;}{\\text{$1}}'); // Regex to find all differential d's.   \bd[^o]\b
          // The idea is that we could make them \mathrm but since opinions on the correct typography differ, I won't do this here.
        } // replace include by file content


        src = src.slice(0, cap.index) + mdSrc + src.slice(cap.index + cap[0].length, src.length);
      }

      return src;
    };

    const _includeFileParts = (state, startLine, endLine
    /*, silent*/
    ) => {
      state.src = _replaceIncludeByContent(state.src, options.getRootDir(options, state, startLine, endLine));
    };

    md.core.ruler.before('normalize', 'include', _includeFileParts);
  };

  module.exports = include_plugin;

})));
//# sourceMappingURL=markdownItInclude.umd.js.map
