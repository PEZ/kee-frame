/* @preserve
 *
 * delayed-scroll-restoration-polyfill 0.1.0
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013-2017 Petka Antonov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

if (window.history.pushState) {

    // Calculating width of browser's scrollbar
    var getScrollbarWidth = function getScrollbarWidth() {
        var outer = document.createElement("div");
        outer.style.visibility = "hidden";
        outer.style.width = "100px";
        outer.style.msOverflowStyle = "scrollbar";

        document.body.appendChild(outer);

        var widthNoScroll = outer.offsetWidth;
        // force scrollbars
        outer.style.overflow = "scroll";

        // add innerdiv
        var inner = document.createElement("div");
        inner.style.width = "100%";
        outer.appendChild(inner);

        var widthWithScroll = inner.offsetWidth;

        // remove divs
        outer.parentNode.removeChild(outer);

        return widthNoScroll - widthWithScroll;
    };

    var SCROLL_RESTORATION_TIMEOUT_MS = 3000;
    var TRY_TO_SCROLL_INTERVAL_MS = 50;

    var originalPushState = window.history.pushState;
    var originalReplaceState = window.history.replaceState;

    // Store current scroll position in current state when navigating away.
    window.history.pushState = function () {
        var newStateOfCurrentPage = Object.assign({}, window.history.state, {
            __scrollX: window.scrollX,
            __scrollY: window.scrollY
        });
        originalReplaceState.call(window.history, newStateOfCurrentPage, '');

        originalPushState.apply(window.history, arguments);
    };

    // Make sure we don't throw away scroll position when calling "replaceState".
    window.history.replaceState = function (state) {
        var newState = Object.assign({}, {
            __scrollX: window.history.state && window.history.state.__scrollX,
            __scrollY: window.history.state && window.history.state.__scrollY
        }, state);

        for (var _len = arguments.length, otherArgs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            otherArgs[_key - 1] = arguments[_key];
        }

        originalReplaceState.apply(window.history, [newState].concat(otherArgs));
    };

    var timeoutHandle = null;
    var scrollBarWidth = null;

    // Try to scroll to the scrollTarget, but only if we can actually scroll
    // there. Otherwise keep trying until we time out, then scroll as far as
    // we can.
    var tryToScrollTo = function tryToScrollTo(scrollTarget) {
        // Stop any previous calls to "tryToScrollTo".
        clearTimeout(timeoutHandle);

        var body = document.body;
        var html = document.documentElement;
        if (!scrollBarWidth) {
            scrollBarWidth = getScrollbarWidth();
        }

        // From http://stackoverflow.com/a/1147768
        var documentWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
        var documentHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

        if (documentWidth + scrollBarWidth - window.innerWidth >= scrollTarget.x && documentHeight + scrollBarWidth - window.innerHeight >= scrollTarget.y || Date.now() > scrollTarget.latestTimeToTry) {
            window.scrollTo(scrollTarget.x, scrollTarget.y);
        } else {
            timeoutHandle = setTimeout(function () {
                return tryToScrollTo(scrollTarget);
            }, TRY_TO_SCROLL_INTERVAL_MS);
        }
    };

    // Try scrolling to the previous scroll position on popstate
    var onPopState = function onPopState() {
        var state = window.history.state;

        if (state && Number.isFinite(state.__scrollX) && Number.isFinite(state.__scrollY)) {
            setTimeout(function () {
                return tryToScrollTo({
                    x: state.__scrollX,
                    y: state.__scrollY,
                    latestTimeToTry: Date.now() + SCROLL_RESTORATION_TIMEOUT_MS
                });
            });
        }
    };

    window.addEventListener('popstate', onPopState, true);
}