/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";
    
    var EditorManager = brackets.getModule("editor/EditorManager");
        
    /**
     * Returns a copy of arr that is a.) all lowercase, b.) sorted lexigraphically,
     * and c.) has all duplicates removed.
     *
     * @param {!Array.<string>}
     * @return {Array.<string>}
     */
    function _lowerSortUniqStringArray(arr) {
        var i, last = null, lowerArr = [], result = [];
        // fill up the lowerArr array with lowercase versions of the source array
        for (i = 0; i < arr.length; i++) {
            lowerArr.push(arr[i].toLowerCase());
        }
        
        // sort lowerArr alphabetically
        lowerArr.sort();
        
        // copy unique elements to result array
        for (i = 0; i < lowerArr.length; i++) {
            if (lowerArr[i] !== last) {
                result.push(lowerArr[i]);
                last = lowerArr[i];
            }
        }
        
        return result;
    }
    
    function parseCurrentFullEditor() {
        var cm = EditorManager.getCurrentFullEditor()._codeMirror;
        var cursor = {ch: 0, line: 0}, t;
        var isParsingFontList = false;
        
        var fonts = [];
        
        while (cm.getLine(cursor.line) !== undefined) {
            t = cm.getTokenAt(cursor);
            if (t.end < cursor.ch) {
                // We already parsed this token because our cursor is past
                // the token that codemirror gave us. So, we're at end of line.
                cursor.line += 1;
                cursor.ch = 0;
            } else {
                // A new token!
                if (!isParsingFontList &&
                        t.className === "variable" &&
                        t.string.toLowerCase() === "font-family") {
                    isParsingFontList = true;
                } else if (isParsingFontList) {
                    if (t.string === ";") {
                        isParsingFontList = false;
                    } else if (t.className === "number") {
                        fonts.push(t.string);
                    } else if (t.className === "string") {
                        // string token types still have quotes around them, so strip first/last char
                        fonts.push(t.string.substring(1, t.string.length - 1));
                    }
                }
                // Advance to next token (or possibly to the end of the line)
                cursor.ch = t.end + 1;
            }
        }
        
        return _lowerSortUniqStringArray(fonts);
    }
    
    function getFontTokenAtCursor(editor, cursor) {
        var cm = editor._codeMirror;
        var currentToken = cm.getTokenAt(cursor);
        var t, c;
        var result = null;
        
        // Want to fail as fast as possible. First, check if we're inside a rule body
        // If we're in a rule, then "rule" will be on the top of the parse stack. All
        // rules start with a "variable" token, then a ":", then values. We only want
        // autocomplete if we're somewhere after the ":"
        if (currentToken.className !== "variable" &&
                currentToken.state.stack.length > 0 &&
                currentToken.state.stack[currentToken.state.stack.length - 1] === "rule") {
            
            console.log("[ewf] at '" + currentToken.string + "' with type", currentToken.className);

            // We're in a rule body. Step backwards until we find the most recent 
            // "variable" or are no longer in a rule (the latter, stepping out of the rule, 
            // shouldn't happen). This "variable" token will tell us if we're in a font-family
            // rule or not.
            t = currentToken;
            c = {ch: cursor.start, line: cursor.line};
            while (t.className !== "variable" &&
                    currentToken.state.stack.length > 0 &&
                    currentToken.state.stack[currentToken.state.stack.length - 1] === "rule") {
                c.ch = t.start - 1;
                if (c.ch < 0) {
                    // need to go up a line
                    c.line = c.line - 1;
                    if (c.line < 0) {
                        break; // We're at the beginning of the file, so we're done stepping back (shouldn't happen)
                    } else {
                        c.ch = cm.getLine(c.line).length;
                    }
                }
                t = cm.getTokenAt(c);
            }
            
            if (t.className === "variable" && t.string.toLowerCase() === "font-family") {
                result = currentToken;
            }
        }
        return result;
    }
    
    exports.parseCurrentFullEditor = parseCurrentFullEditor;
    exports.getFontTokenAtCursor = getFontTokenAtCursor;
});