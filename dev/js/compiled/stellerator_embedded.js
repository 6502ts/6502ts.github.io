(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.$6502 = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Mutex = /** @class */ (function () {
    function Mutex() {
        this._queue = [];
        this._pending = false;
    }
    Mutex.prototype.isLocked = function () {
        return this._pending;
    };
    Mutex.prototype.acquire = function () {
        var _this = this;
        var ticket = new Promise(function (resolve) { return _this._queue.push(resolve); });
        if (!this._pending) {
            this._dispatchNext();
        }
        return ticket;
    };
    Mutex.prototype.runExclusive = function (callback) {
        return this
            .acquire()
            .then(function (release) {
            var result;
            try {
                result = callback();
            }
            catch (e) {
                release();
                throw (e);
            }
            return Promise
                .resolve(result)
                .then(function (x) { return (release(), x); }, function (e) {
                release();
                throw e;
            });
        });
    };
    Mutex.prototype._dispatchNext = function () {
        if (this._queue.length > 0) {
            this._pending = true;
            this._queue.shift()(this._dispatchNext.bind(this));
        }
        else {
            this._pending = false;
        }
    };
    return Mutex;
}());
exports.default = Mutex;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Mutex_1 = require("./Mutex");
exports.Mutex = Mutex_1.default;

},{"./Mutex":1}],3:[function(require,module,exports){
"use strict";
var factories = [];
factories[0] = function () {
    return function dispatcher0() { };
};
factories[1] = function (callback, context) {
    if (typeof (context) === 'undefined')
        return callback;
    return function dispatcher1(payload) {
        callback(payload, context);
    };
};
function getFactory(handlerCount) {
    if (!factories[handlerCount])
        factories[handlerCount] = compileFactory(handlerCount);
    return factories[handlerCount];
}
function compileFactory(handlerCount) {
    var src = 'return function dispatcher' + handlerCount + '(payload) {\n';
    var argsHandlers = [], argsContexts = [];
    for (var i = 0; i < handlerCount; i++) {
        argsHandlers.push('cb' + i);
        argsContexts.push('ctx' + i);
        src += '    cb' + i + '(payload, ctx' + i + ');\n';
    }
    src += '};';
    return new (Function.bind.apply(Function, [void 0].concat(argsHandlers.concat(argsContexts), [src])))();
}
var Event = (function () {
    function Event() {
        this.hasHandlers = false;
        this._handlers = [];
        this._contexts = [];
        this._createDispatcher();
    }
    Event.prototype.addHandler = function (handler, context) {
        if (!this.isHandlerAttached(handler, context)) {
            this._handlers.push(handler);
            this._contexts.push(context);
            this._createDispatcher();
            this._updateHasHandlers();
        }
        return this;
    };
    Event.prototype.removeHandler = function (handler, context) {
        var idx = this._getHandlerIndex(handler, context);
        if (typeof (idx) !== 'undefined') {
            this._handlers.splice(idx, 1);
            this._contexts.splice(idx, 1);
            this._createDispatcher();
            this._updateHasHandlers();
        }
        return this;
    };
    Event.prototype.isHandlerAttached = function (handler, context) {
        return typeof (this._getHandlerIndex(handler, context)) !== 'undefined';
    };
    Event.prototype._updateHasHandlers = function () {
        this.hasHandlers = !!this._handlers.length;
    };
    Event.prototype._getHandlerIndex = function (handler, context) {
        var handlerCount = this._handlers.length;
        var idx;
        for (idx = 0; idx < handlerCount; idx++) {
            if (this._handlers[idx] === handler && this._contexts[idx] === context)
                break;
        }
        return idx < handlerCount ? idx : undefined;
    };
    Event.prototype._createDispatcher = function () {
        this.dispatch = getFactory(this._handlers.length).apply(this, this._handlers.concat(this._contexts));
    };
    return Event;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Event;

},{}],4:[function(require,module,exports){
"use strict";
var Event_1 = require('./Event');
exports.Event = Event_1.default;

},{"./Event":3}],5:[function(require,module,exports){
/*!
* screenfull
* v3.3.2 - 2017-10-27
* (c) Sindre Sorhus; MIT License
*/
(function () {
	'use strict';

	var document = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : {};
	var isCommonjs = typeof module !== 'undefined' && module.exports;
	var keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element;

	var fn = (function () {
		var val;

		var fnMap = [
			[
				'requestFullscreen',
				'exitFullscreen',
				'fullscreenElement',
				'fullscreenEnabled',
				'fullscreenchange',
				'fullscreenerror'
			],
			// New WebKit
			[
				'webkitRequestFullscreen',
				'webkitExitFullscreen',
				'webkitFullscreenElement',
				'webkitFullscreenEnabled',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			// Old WebKit (Safari 5.1)
			[
				'webkitRequestFullScreen',
				'webkitCancelFullScreen',
				'webkitCurrentFullScreenElement',
				'webkitCancelFullScreen',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			[
				'mozRequestFullScreen',
				'mozCancelFullScreen',
				'mozFullScreenElement',
				'mozFullScreenEnabled',
				'mozfullscreenchange',
				'mozfullscreenerror'
			],
			[
				'msRequestFullscreen',
				'msExitFullscreen',
				'msFullscreenElement',
				'msFullscreenEnabled',
				'MSFullscreenChange',
				'MSFullscreenError'
			]
		];

		var i = 0;
		var l = fnMap.length;
		var ret = {};

		for (; i < l; i++) {
			val = fnMap[i];
			if (val && val[1] in document) {
				for (i = 0; i < val.length; i++) {
					ret[fnMap[0][i]] = val[i];
				}
				return ret;
			}
		}

		return false;
	})();

	var eventNameMap = {
		change: fn.fullscreenchange,
		error: fn.fullscreenerror
	};

	var screenfull = {
		request: function (elem) {
			var request = fn.requestFullscreen;

			elem = elem || document.documentElement;

			// Work around Safari 5.1 bug: reports support for
			// keyboard in fullscreen even though it doesn't.
			// Browser sniffing, since the alternative with
			// setTimeout is even worse.
			if (/ Version\/5\.1(?:\.\d+)? Safari\//.test(navigator.userAgent)) {
				elem[request]();
			} else {
				elem[request](keyboardAllowed && Element.ALLOW_KEYBOARD_INPUT);
			}
		},
		exit: function () {
			document[fn.exitFullscreen]();
		},
		toggle: function (elem) {
			if (this.isFullscreen) {
				this.exit();
			} else {
				this.request(elem);
			}
		},
		onchange: function (callback) {
			this.on('change', callback);
		},
		onerror: function (callback) {
			this.on('error', callback);
		},
		on: function (event, callback) {
			var eventName = eventNameMap[event];
			if (eventName) {
				document.addEventListener(eventName, callback, false);
			}
		},
		off: function (event, callback) {
			var eventName = eventNameMap[event];
			if (eventName) {
				document.removeEventListener(eventName, callback, false);
			}
		},
		raw: fn
	};

	if (!fn) {
		if (isCommonjs) {
			module.exports = false;
		} else {
			window.screenfull = false;
		}

		return;
	}

	Object.defineProperties(screenfull, {
		isFullscreen: {
			get: function () {
				return Boolean(document[fn.fullscreenElement]);
			}
		},
		element: {
			enumerable: true,
			get: function () {
				return document[fn.fullscreenElement];
			}
		},
		enabled: {
			enumerable: true,
			get: function () {
				// Coerce to boolean in case of old WebKit
				return Boolean(document[fn.fullscreenEnabled]);
			}
		}
	});

	if (isCommonjs) {
		module.exports = screenfull;
	} else {
		window.screenfull = screenfull;
	}
})();

},{}],6:[function(require,module,exports){
(function (global){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

    __extends = function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
                t[p[i]] = s[p[i]];
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [0, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function (m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    };

    __values = function (o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { if (o[n]) i[n] = function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; }; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator];
        return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
"use strict";
var microevent_ts_1 = require('microevent.ts');
var MSG_RESOLVE_TRANSACTION = "resolve_transaction", MSG_REJECT_TRANSACTION = "reject_transaction", MSG_ERROR = "error";
var RpcProvider = (function () {
    function RpcProvider(_dispatch, _rpcTimeout) {
        if (_rpcTimeout === void 0) { _rpcTimeout = 0; }
        this._dispatch = _dispatch;
        this._rpcTimeout = _rpcTimeout;
        this.error = new microevent_ts_1.Event();
        this._rpcHandlers = {};
        this._signalHandlers = {};
        this._pendingTransactions = {};
        this._nextTransactionId = 0;
    }
    RpcProvider.prototype.dispatch = function (payload) {
        var message = payload;
        switch (message.type) {
            case RpcProvider.MessageType.signal:
                return this._handleSignal(message);
            case RpcProvider.MessageType.rpc:
                return this._handeRpc(message);
            case RpcProvider.MessageType.internal:
                return this._handleInternal(message);
            default:
                this._raiseError("invalid message type " + message.type);
        }
    };
    RpcProvider.prototype.rpc = function (id, payload, transfer) {
        var _this = this;
        var transactionId = this._nextTransactionId++;
        this._dispatch({
            type: RpcProvider.MessageType.rpc,
            transactionId: transactionId,
            id: id,
            payload: payload
        }, transfer ? transfer : undefined);
        return new Promise(function (resolve, reject) {
            var transaction = _this._pendingTransactions[transactionId] = {
                id: transactionId,
                resolve: resolve,
                reject: reject
            };
            if (_this._rpcTimeout > 0) {
                _this._pendingTransactions[transactionId].timeoutHandle =
                    setTimeout(function () { return _this._transactionTimeout(transaction); }, _this._rpcTimeout);
            }
        });
    };
    ;
    RpcProvider.prototype.signal = function (id, payload, transfer) {
        this._dispatch({
            type: RpcProvider.MessageType.signal,
            id: id,
            payload: payload,
        }, transfer ? transfer : undefined);
        return this;
    };
    RpcProvider.prototype.registerRpcHandler = function (id, handler) {
        if (this._rpcHandlers[id]) {
            throw new Error("rpc handler for " + id + " already registered");
        }
        this._rpcHandlers[id] = handler;
        return this;
    };
    ;
    RpcProvider.prototype.registerSignalHandler = function (id, handler) {
        if (!this._signalHandlers[id]) {
            this._signalHandlers[id] = [];
        }
        this._signalHandlers[id].push(handler);
        return this;
    };
    RpcProvider.prototype.deregisterRpcHandler = function (id, handler) {
        if (this._rpcHandlers[id]) {
            delete this._rpcHandlers[id];
        }
        return this;
    };
    ;
    RpcProvider.prototype.deregisterSignalHandler = function (id, handler) {
        if (this._signalHandlers[id]) {
            this._signalHandlers[id] = this._signalHandlers[id].filter(function (h) { return handler !== h; });
        }
        return this;
    };
    RpcProvider.prototype._raiseError = function (error) {
        this.error.dispatch(new Error(error));
        this._dispatch({
            type: RpcProvider.MessageType.internal,
            id: MSG_ERROR,
            payload: error
        });
    };
    RpcProvider.prototype._handleSignal = function (message) {
        if (!this._signalHandlers[message.id]) {
            return this._raiseError("invalid signal " + message.id);
        }
        this._signalHandlers[message.id].forEach(function (handler) { return handler(message.payload); });
    };
    RpcProvider.prototype._handeRpc = function (message) {
        var _this = this;
        if (!this._rpcHandlers[message.id]) {
            return this._raiseError("invalid rpc " + message.id);
        }
        Promise.resolve(this._rpcHandlers[message.id](message.payload))
            .then(function (result) { return _this._dispatch({
            type: RpcProvider.MessageType.internal,
            id: MSG_RESOLVE_TRANSACTION,
            transactionId: message.transactionId,
            payload: result
        }); }, function (reason) { return _this._dispatch({
            type: RpcProvider.MessageType.internal,
            id: MSG_REJECT_TRANSACTION,
            transactionId: message.transactionId,
            payload: reason
        }); });
    };
    RpcProvider.prototype._handleInternal = function (message) {
        switch (message.id) {
            case MSG_RESOLVE_TRANSACTION:
                if (!this._pendingTransactions[message.transactionId]) {
                    return this._raiseError("no pending transaction with id " + message.transactionId);
                }
                this._pendingTransactions[message.transactionId].resolve(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_REJECT_TRANSACTION:
                if (!this._pendingTransactions[message.transactionId]) {
                    return this._raiseError("no pending transaction with id " + message.transactionId);
                }
                this._pendingTransactions[message.transactionId].reject(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_ERROR:
                this.error.dispatch(new Error("remote error: " + message.payload));
                break;
            default:
                this._raiseError("unhandled internal message " + message.id);
                break;
        }
    };
    RpcProvider.prototype._transactionTimeout = function (transaction) {
        transaction.reject('transaction timed out');
        this._raiseError("transaction " + transaction.id + " timed out");
        delete this._pendingTransactions[transaction.id];
        return;
    };
    RpcProvider.prototype._clearTransaction = function (transaction) {
        if (typeof (transaction.timeoutHandle) !== 'undefined') {
            clearTimeout(transaction.timeoutHandle);
        }
        delete this._pendingTransactions[transaction.id];
    };
    return RpcProvider;
}());
var RpcProvider;
(function (RpcProvider) {
    (function (MessageType) {
        MessageType[MessageType["signal"] = 0] = "signal";
        MessageType[MessageType["rpc"] = 1] = "rpc";
        MessageType[MessageType["internal"] = 2] = "internal";
    })(RpcProvider.MessageType || (RpcProvider.MessageType = {}));
    var MessageType = RpcProvider.MessageType;
    ;
})(RpcProvider || (RpcProvider = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RpcProvider;

},{"microevent.ts":4}],8:[function(require,module,exports){
"use strict";
var RpcProvider_1 = require('./RpcProvider');
exports.RpcProvider = RpcProvider_1.default;

},{"./RpcProvider":7}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Switch_1 = require("./Switch");
var DigitalJoystick = (function () {
    function DigitalJoystick() {
        this._left = new Switch_1.default();
        this._right = new Switch_1.default();
        this._up = new Switch_1.default();
        this._down = new Switch_1.default();
        this._fire = new Switch_1.default();
    }
    DigitalJoystick.prototype.getLeft = function () {
        return this._left;
    };
    DigitalJoystick.prototype.getRight = function () {
        return this._right;
    };
    DigitalJoystick.prototype.getUp = function () {
        return this._up;
    };
    DigitalJoystick.prototype.getDown = function () {
        return this._down;
    };
    DigitalJoystick.prototype.getFire = function () {
        return this._fire;
    };
    return DigitalJoystick;
}());
exports.default = DigitalJoystick;

},{"./Switch":11}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var Switch_1 = require("./Switch");
var Paddle = (function () {
    function Paddle() {
        this.valueChanged = new microevent_ts_1.Event();
        this._fireSwitch = new Switch_1.default();
        this._value = 0.5;
    }
    Paddle.prototype.setValue = function (value) {
        this._value = value;
        this.valueChanged.dispatch(value);
    };
    Paddle.prototype.getValue = function () {
        return this._value;
    };
    Paddle.prototype.getFire = function () {
        return this._fireSwitch;
    };
    return Paddle;
}());
exports.default = Paddle;

},{"./Switch":11,"microevent.ts":4}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var Switch = (function () {
    function Switch(_state) {
        if (_state === void 0) { _state = false; }
        this._state = _state;
        this.stateChanged = new microevent_ts_1.Event();
        this.beforeRead = new microevent_ts_1.Event();
    }
    Switch.prototype.read = function () {
        this.beforeRead.dispatch(this);
        return this._state;
    };
    Switch.prototype.peek = function () {
        return this._state;
    };
    Switch.prototype.toggle = function (state) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        this.stateChanged.dispatch(state);
    };
    return Switch;
}());
exports.default = Switch;

},{"microevent.ts":4}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Config;
(function (Config) {
    function create(config) {
        if (config === void 0) { config = {}; }
        return tslib_1.__assign({ tvMode: 0, enableAudio: true, randomSeed: -1, emulatePaddles: true, frameStart: -1, pcmAudio: false }, config);
    }
    Config.create = create;
    function getClockHz(config) {
        switch (config.tvMode) {
            case 0:
                return 262 * 228 * 60;
            case 1:
            case 2:
                return 312 * 228 * 50;
        }
    }
    Config.getClockHz = getClockHz;
})(Config || (Config = {}));
exports.default = Config;

},{"tslib":6}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Switch_1 = require("../io/Switch");
var ControlPanel = (function () {
    function ControlPanel() {
        this._selectSwitch = new Switch_1.default();
        this._resetButton = new Switch_1.default();
        this._colorSwitch = new Switch_1.default();
        this._difficutlyP0 = new Switch_1.default();
        this._difficutlyP1 = new Switch_1.default();
    }
    ControlPanel.prototype.getSelectSwitch = function () {
        return this._selectSwitch;
    };
    ControlPanel.prototype.getResetButton = function () {
        return this._resetButton;
    };
    ControlPanel.prototype.getColorSwitch = function () {
        return this._colorSwitch;
    };
    ControlPanel.prototype.getDifficultySwitchP0 = function () {
        return this._difficutlyP0;
    };
    ControlPanel.prototype.getDifficultySwitchP1 = function () {
        return this._difficutlyP1;
    };
    return ControlPanel;
}());
exports.default = ControlPanel;

},{"../io/Switch":11}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CartridgeInfo;
(function (CartridgeInfo) {
    var CartridgeType;
    (function (CartridgeType) {
        CartridgeType["vanilla_2k"] = "vanilla_2k";
        CartridgeType["vanilla_4k"] = "vanilla_4k";
        CartridgeType["bankswitch_8k_F8"] = "bankswitch_8k_F8";
        CartridgeType["bankswitch_8k_E0"] = "bankswitch_8k_E0";
        CartridgeType["bankswitch_8k_3F"] = "bankswitch_8k_3F";
        CartridgeType["bankswitch_8k_FE"] = "bankswitch_8k_FE";
        CartridgeType["bankswitch_8k_UA"] = "bankswitch_8k_UA";
        CartridgeType["bankswitch_8k_DPC"] = "bankswitch_8k_DPC";
        CartridgeType["bankswitch_8k_econobanking"] = "bankswitch_8k_econobanking";
        CartridgeType["bankswitch_12k_FA"] = "bankswitch_12k_FA";
        CartridgeType["bankswitch_16k_F6"] = "bankswitch_16k_F6";
        CartridgeType["bankswitch_16k_E7"] = "bankswitch_16k_E7";
        CartridgeType["bankswitch_FA2"] = "bankswitch_FA2";
        CartridgeType["bankswitch_32k_F4"] = "bankswitch_32k_F4";
        CartridgeType["bankswitch_64k_F0"] = "bankswitch_64k_F0";
        CartridgeType["bankswitch_64k_EF"] = "bankswitch_64k_EF";
        CartridgeType["bankswitch_3E"] = "bankswitch_3E";
        CartridgeType["bankswitch_supercharger"] = "bankswitch_supercharger";
        CartridgeType["bankswitch_dpc_plus"] = "bankswitch_dpc_plus";
        CartridgeType["bankswitch_cdf"] = "bankswitch_cdf";
        CartridgeType["unknown"] = "unknown";
    })(CartridgeType = CartridgeInfo.CartridgeType || (CartridgeInfo.CartridgeType = {}));
    function getAllTypes() {
        return [
            CartridgeType.vanilla_2k,
            CartridgeType.vanilla_4k,
            CartridgeType.bankswitch_8k_F8,
            CartridgeType.bankswitch_8k_E0,
            CartridgeType.bankswitch_8k_3F,
            CartridgeType.bankswitch_8k_FE,
            CartridgeType.bankswitch_8k_UA,
            CartridgeType.bankswitch_8k_econobanking,
            CartridgeType.bankswitch_12k_FA,
            CartridgeType.bankswitch_8k_DPC,
            CartridgeType.bankswitch_16k_F6,
            CartridgeType.bankswitch_16k_E7,
            CartridgeType.bankswitch_FA2,
            CartridgeType.bankswitch_32k_F4,
            CartridgeType.bankswitch_3E,
            CartridgeType.bankswitch_64k_F0,
            CartridgeType.bankswitch_64k_EF,
            CartridgeType.bankswitch_supercharger,
            CartridgeType.bankswitch_dpc_plus,
            CartridgeType.bankswitch_cdf,
            CartridgeType.unknown
        ];
    }
    CartridgeInfo.getAllTypes = getAllTypes;
    function describeCartridgeType(cartridgeType) {
        switch (cartridgeType) {
            case CartridgeType.vanilla_2k:
                return 'plain 2k';
            case CartridgeType.vanilla_4k:
                return 'plain 4k';
            case CartridgeType.bankswitch_8k_F8:
                return 'bankswitched 8k, F8 (Atari) scheme';
            case CartridgeType.bankswitch_8k_E0:
                return 'bankswitched 8k, E0 (Parker Bros.) scheme';
            case CartridgeType.bankswitch_8k_3F:
                return 'bankswitched 8k, 3F (Tigervision) scheme';
            case CartridgeType.bankswitch_8k_FE:
                return 'bankswitched 8k, FE (Activision) scheme';
            case CartridgeType.bankswitch_8k_UA:
                return 'bankswitched 8k, UA (Pleiades) scheme';
            case CartridgeType.bankswitch_12k_FA:
                return 'bankswitched 12k, FA (CBS) scheme';
            case CartridgeType.bankswitch_8k_DPC:
                return 'bankswitched 8k + DPC';
            case CartridgeType.bankswitch_8k_econobanking:
                return 'bankswitched 8k, econobanking scheme';
            case CartridgeType.bankswitch_16k_F6:
                return 'bankswitched 16k, F6 (Atari) scheme';
            case CartridgeType.bankswitch_16k_E7:
                return 'bankswitched 16k, E7 (M-Network) scheme';
            case CartridgeType.bankswitch_FA2:
                return 'bankswitched 28k/29k, FA2 (modified CBS) scheme';
            case CartridgeType.bankswitch_32k_F4:
                return 'bankswitched 32k, F4 (Atari) scheme';
            case CartridgeType.bankswitch_3E:
                return 'bankswitched 3E (Tigervision + RAM) scheme';
            case CartridgeType.bankswitch_64k_F0:
                return 'bankswitched 64k, F0 (Megaboy) scheme';
            case CartridgeType.bankswitch_64k_EF:
                return 'bankswitched 64k, EFSC (Homestar Runner) scheme';
            case CartridgeType.bankswitch_supercharger:
                return 'bankswitched supercharger';
            case CartridgeType.bankswitch_dpc_plus:
                return 'bankswitched DPC+';
            case CartridgeType.bankswitch_cdf:
                return 'bankswitched CDF';
            case CartridgeType.unknown:
                return 'unknown';
        }
    }
    CartridgeInfo.describeCartridgeType = describeCartridgeType;
})(CartridgeInfo || (CartridgeInfo = {}));
exports.default = CartridgeInfo;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Config_1 = require("../Config");
var AudioOutputBuffer_1 = require("../../../tools/AudioOutputBuffer");
var base64_1 = require("../../../tools/base64");
var FREQUENCY_DIVISIORS = base64_1.decode('AQEPAQEBAQEBAQEBAwMDAQ==');
var POLY0 = new Int8Array([1]);
var POLY1 = new Int8Array([1, 1]);
var POLY2 = new Int8Array([16, 15]);
var POLY4 = base64_1.decode('AQICAQEBBAM=');
var POLY5 = base64_1.decode('AQIBAQICBQQCAQMBAQEBBA==');
var POLY9 = base64_1.decode('AQQBAwIEAQIDAgEBAQEBAQIEAgEEAQECAgEDAgEDAQEBBAEBAQECAQECBgECAgECAQIBAQIBBg' +
    'IBAgIBAQEBAgICAgcCAwICAQEBAwIBAQIBAQcBAQMBAQIDAwEBAQICAQECAgQDBQEDAQEFAgEB' +
    'AQIBAgEDAQIFAQECAQEBBQEBAQEBAQEBBgEBAQIBAQEBBAIBAQMBAwYDAgMBAQIBAgQBAQEDAQ' +
    'EBAQMBAgEEAgIDBAEBBAECAQICAgEBBAMBBAQJBQQBBQMBAQMCAgIBBQECAQEBAgMBAgEBAwQC' +
    'BQICAQIDAQEBAQECAQMDAwIBAgEBAQEBAwMBAgIDAQMBCA==');
var POLY68 = base64_1.decode('BQYEBQoFAwcECgYDBgQJBg==');
var POLY465 = base64_1.decode('AgMCAQQBBgoCBAIBAQQFCQMDBAEBAQgFBQUEAQEBCAQCCAMDAQEHBAIHBQEDAQcEAQQIAgEDBA' +
    'cBAwcDAgEGBgICBAUDAgYGAQMDAgUDBwMEAwICAgUJAwEFAwECAgsFAQUDAQECDAUBAgUCAQEM' +
    'BgECBQECAQoGAwICBAECBgo=');
var POLYS = [
    POLY0,
    POLY4,
    POLY4,
    POLY465,
    POLY1,
    POLY1,
    POLY2,
    POLY5,
    POLY9,
    POLY5,
    POLY2,
    POLY0,
    POLY1,
    POLY1,
    POLY2,
    POLY68
];
var ToneGenerator = (function () {
    function ToneGenerator(_config) {
        this._config = _config;
    }
    ToneGenerator.prototype.setConfig = function (config) {
        this._config = config;
    };
    ToneGenerator.prototype.getKey = function (tone, frequency) {
        if (POLYS[tone] === POLY1 && FREQUENCY_DIVISIORS[tone] * (frequency + 1) === 1) {
            return 0;
        }
        return (tone << 5) | frequency;
    };
    ToneGenerator.prototype.getBuffer = function (key) {
        var tone = (key >>> 5) & 0x0f, frequency = key & 0x1f;
        var poly = POLYS[tone];
        var length = 0;
        for (var i = 0; i < poly.length; i++) {
            length += poly[i];
        }
        length = length * FREQUENCY_DIVISIORS[tone] * (frequency + 1);
        var content = new Float32Array(length);
        var sampleRate = Config_1.default.getClockHz(this._config) / 114;
        var f = 0;
        var count = 0;
        var offset = 0;
        var state = true;
        for (var i = 0; i < length; i++) {
            f++;
            if (f === FREQUENCY_DIVISIORS[tone] * (frequency + 1)) {
                f = 0;
                count++;
                if (count === poly[offset]) {
                    offset++;
                    count = 0;
                    if (poly.length === offset) {
                        offset = 0;
                    }
                }
                state = !(offset & 0x01);
            }
            content[i] = state ? 1 : -1;
        }
        return new AudioOutputBuffer_1.default(content, sampleRate);
    };
    return ToneGenerator;
}());
exports.default = ToneGenerator;

},{"../../../tools/AudioOutputBuffer":16,"../../../tools/base64":18,"../Config":12}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AudioOutputBuffer = (function () {
    function AudioOutputBuffer(_content, _sampleRate) {
        this._content = _content;
        this._sampleRate = _sampleRate;
    }
    AudioOutputBuffer.prototype.getLength = function () {
        return this._content.length;
    };
    AudioOutputBuffer.prototype.getContent = function () {
        return this._content;
    };
    AudioOutputBuffer.prototype.getSampleRate = function () {
        return this._sampleRate;
    };
    AudioOutputBuffer.prototype.replaceUnderlyingBuffer = function (buffer) {
        this._content = buffer;
    };
    return AudioOutputBuffer;
}());
exports.default = AudioOutputBuffer;

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RingBuffer = (function () {
    function RingBuffer(_capacity) {
        this._capacity = _capacity;
        this._size = 0;
        this._index = 0;
        this._buffer = new Array(this._capacity);
        for (var i = 0; i < this._capacity; i++) {
            this._buffer[i] = null;
        }
    }
    RingBuffer.prototype.size = function () {
        return this._size;
    };
    RingBuffer.prototype.pop = function () {
        if (this._size === 0) {
            return undefined;
        }
        var item = this._buffer[this._index];
        this._buffer[this._index] = null;
        this._index = (this._index + 1) % this._capacity;
        this._size--;
        return item;
    };
    RingBuffer.prototype.push = function (item) {
        if (this._size === this._capacity) {
            this.pop();
        }
        this._buffer[(this._index + this._size++) % this._capacity] = item;
        return this;
    };
    RingBuffer.prototype.forEach = function (fn) {
        for (var i = 0; i < this._size; i++) {
            fn(this._buffer[(this._index + i) % this._capacity]);
        }
        return this;
    };
    RingBuffer.prototype.clear = function () {
        for (var i = 0; i < this._capacity; i++) {
            this._buffer[i] = null;
        }
        this._size = 0;
        this._index = 0;
        return this;
    };
    return RingBuffer;
}());
exports.default = RingBuffer;

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var encodingsString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', encodings = new Uint8Array(256);
var __init;
(function (__init) {
    var i;
    for (i = 0; i < 256; i++) {
        encodings[i] = 255;
    }
    for (i = 0; i < 64; i++) {
        encodings[encodingsString.charCodeAt(i)] = i;
    }
    encodings['='.charCodeAt(0)] = 0;
})(__init = exports.__init || (exports.__init = {}));
function decodeChar(data, idx) {
    var value = encodings[data.charCodeAt(idx)];
    if (value > 63) {
        throw new Error('invalid base64 character "' + data[idx] + '" at index ' + idx);
    }
    return value;
}
function decodeNibble(data, idx) {
    return ((decodeChar(data, idx) << 18) +
        (decodeChar(data, idx + 1) << 12) +
        (decodeChar(data, idx + 2) << 6) +
        decodeChar(data, idx + 3));
}
function getPadding(data) {
    var padding = 0, idx = data.length - 1;
    while (idx >= 0 && data[idx--] === '=') {
        padding++;
    }
    return padding;
}
function decode(data) {
    if (data.length % 4 !== 0) {
        throw new Error('invalid base64 data --- char count mismatch');
    }
    var nibbles = data.length / 4, decodedSize = nibbles * 3 - getPadding(data), decoded = new Uint8Array(decodedSize);
    var idx = 0;
    for (var i = 0; i < nibbles; i++) {
        var nibble = decodeNibble(data, i * 4);
        for (var j = 0; j < 3 && idx < decodedSize; j++) {
            decoded[idx++] = (nibble >>> (8 * (2 - j))) & 0xff;
        }
    }
    return decoded;
}
exports.decode = decode;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var PoolMember_1 = require("./PoolMember");
var Pool = (function () {
    function Pool(_factory) {
        this._factory = _factory;
        this.event = {
            release: new microevent_ts_1.Event(),
            dispose: new microevent_ts_1.Event()
        };
        this._pool = [];
        this._poolSize = 0;
    }
    Pool.prototype.get = function () {
        var _this = this;
        var member;
        if (this._poolSize === 0) {
            var newItem = this._factory();
            member = new PoolMember_1.default(newItem, function (victim) { return _this._releaseMember(victim); }, function (victim) { return _this._disposeMember(victim); });
        }
        else {
            member = this._pool[--this._poolSize];
            member._isAvailable = false;
        }
        return member;
    };
    Pool.prototype._releaseMember = function (victim) {
        if (victim._isAvailable) {
            throw new Error('Trying to release an already released pool member');
        }
        if (victim._isDisposed) {
            throw new Error('Trying to release an already disposed pool member');
        }
        var position = this._poolSize++;
        this._pool[position] = victim;
        victim._isAvailable = true;
        victim._poolPosition = position;
        this.event.release.dispatch(victim.get());
    };
    Pool.prototype._disposeMember = function (victim) {
        if (victim._isDisposed) {
            throw new Error('Trying to dispose of an already disposed pool member');
        }
        if (victim._isAvailable) {
            if (this._poolSize > 1) {
                this._pool[victim._poolPosition] = this._pool[this._poolSize - 1];
            }
            this._poolSize--;
        }
        victim._isDisposed = true;
        this.event.dispose.dispatch(victim.get());
    };
    return Pool;
}());
exports.default = Pool;

},{"./PoolMember":20,"microevent.ts":4}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PoolMember = (function () {
    function PoolMember(_value, _releaseCB, _disposeCB) {
        this._value = _value;
        this._releaseCB = _releaseCB;
        this._disposeCB = _disposeCB;
        this._isAvailable = false;
        this._isDisposed = false;
    }
    PoolMember.prototype.adopt = function (target) {
        this._value = target;
    };
    PoolMember.prototype.get = function () {
        return this._value;
    };
    PoolMember.prototype.release = function () {
        this._releaseCB(this);
    };
    PoolMember.prototype.dispose = function () {
        this._disposeCB(this);
    };
    return PoolMember;
}());
exports.default = PoolMember;

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var screenfull = require("screenfull");
var FullscreenVideoDriver = (function () {
    function FullscreenVideoDriver(_videoDriver) {
        this._videoDriver = _videoDriver;
        this._resizeListener = this._adjustSizeForFullscreen.bind(this);
        this._changeListener = this._onChange.bind(this);
        this._engaged = false;
    }
    FullscreenVideoDriver.prototype.engage = function () {
        if (this._engaged) {
            return;
        }
        this._engaged = true;
        screenfull.on('change', this._changeListener);
        screenfull.request(this._videoDriver.getCanvas());
    };
    FullscreenVideoDriver.prototype.disengage = function () {
        if (!this._engaged) {
            return;
        }
        screenfull.exit();
    };
    FullscreenVideoDriver.prototype.toggle = function () {
        if (this._engaged) {
            this.disengage();
        }
        else {
            this.engage();
        }
    };
    FullscreenVideoDriver.prototype.isEngaged = function () {
        return this._engaged;
    };
    FullscreenVideoDriver.prototype._onChange = function () {
        if (screenfull.isFullscreen) {
            window.addEventListener('resize', this._resizeListener);
            this._adjustSizeForFullscreen();
        }
        else {
            this._resetSize();
            window.removeEventListener('resize', this._resizeListener);
            screenfull.off('change', this._changeListener);
            this._engaged = false;
        }
    };
    FullscreenVideoDriver.prototype._resetSize = function () {
        var _this = this;
        var element = this._videoDriver.getCanvas();
        element.style.width = '';
        element.style.height = '';
        setTimeout(function () { return _this._videoDriver.resize(); }, 0);
    };
    FullscreenVideoDriver.prototype._adjustSizeForFullscreen = function () {
        var element = this._videoDriver.getCanvas();
        this._videoDriver.resize(window.innerWidth, window.innerHeight);
        element.style.width = window.innerWidth + 'px';
        element.style.height = window.innerHeight + 'px';
    };
    return FullscreenVideoDriver;
}());
exports.default = FullscreenVideoDriver;

},{"screenfull":5}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var MIN_POLL_INTERVAL = 50;
var standardMappings = (_a = {},
    _a["up"] = [12],
    _a["down"] = [13],
    _a["left"] = [14],
    _a["right"] = [15],
    _a["fire"] = [0, 1, 2, 3, 10, 11],
    _a["select"] = [8],
    _a["start"] = [9],
    _a);
var GamepadDriver = (function () {
    function GamepadDriver() {
        var _this = this;
        this._onGamepadConnect = function () { return _this._probeGamepads(); };
        this._onGamepadDisconnect = function () { return _this._probeGamepads(); };
        this.gamepadCountChanged = new microevent_ts_1.Event();
        this._bound = false;
        this._gamepadCount = 0;
        this._lastPoll = 0;
        this._joysticks = null;
        this._start = null;
        this._select = null;
        this._joysticksShadow = null;
        this._startShadow = null;
        this._selectShadow = null;
    }
    GamepadDriver.prototype.init = function () {
        if (!navigator.getGamepads) {
            throw new Error("gamepad API not available");
        }
        this._probeGamepads();
        window.addEventListener('gamepadconnected', this._onGamepadConnect);
        window.addEventListener('gamepaddisconnected', this._onGamepadDisconnect);
    };
    GamepadDriver.prototype.deinit = function () {
        this.unbind();
        window.removeEventListener('gamepadconnected', this._onGamepadConnect);
        window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnect);
    };
    GamepadDriver.prototype.bind = function (_a) {
        var _this = this;
        var _b = _a.joysticks, joysticks = _b === void 0 ? null : _b, _c = _a.start, start = _c === void 0 ? null : _c, _d = _a.select, select = _d === void 0 ? null : _d;
        if (this._bound) {
            return;
        }
        this._joysticks = joysticks || [];
        this._start = start;
        this._select = select;
        this._bound = true;
        this._joysticksShadow = this._joysticks.map(function (x) { return createShadowJoystick(); });
        this._startShadow = this._start ? new ShadowSwitch() : null;
        this._selectShadow = this._select ? new ShadowSwitch() : null;
        this._controlledSwitches().forEach(function (swtch) {
            return swtch.beforeRead.addHandler(GamepadDriver._onBeforeSwitchRead, _this);
        });
        this._initShadows();
    };
    GamepadDriver.prototype.unbind = function () {
        var _this = this;
        if (!this._bound) {
            return;
        }
        this._controlledSwitches().forEach(function (swtch) {
            return swtch.beforeRead.removeHandler(GamepadDriver._onBeforeSwitchRead, _this);
        });
        this._joysticks = this._start = this._select = null;
        this._bound = false;
    };
    GamepadDriver.prototype.getGamepadCount = function () {
        return this._gamepadCount;
    };
    GamepadDriver._onBeforeSwitchRead = function (swtch, self) {
        var now = Date.now();
        if (self._gamepadCount === 0 || now - self._lastPoll < MIN_POLL_INTERVAL) {
            return;
        }
        self._lastPoll = now;
        var gamepadCount = 0, joystickIndex = 0, start = false, select = false;
        var gamepads = navigator.getGamepads();
        for (var i = 0; i < gamepads.length; i++) {
            var gamepad = gamepads[i];
            if (!gamepad) {
                continue;
            }
            gamepadCount++;
            self._updateJoystickState(gamepad, joystickIndex++);
            start = start || self._readState(standardMappings["start"], gamepad);
            select = select || self._readState(standardMappings["select"], gamepad);
        }
        if (gamepadCount > 0) {
            if (self._start) {
                self._startShadow.toggle(start);
            }
            if (self._select) {
                self._selectShadow.toggle(select);
            }
        }
        self._syncShadows();
    };
    GamepadDriver.prototype._controlledSwitches = function () {
        var switches = [];
        try {
            for (var _a = tslib_1.__values(this._joysticks), _b = _a.next(); !_b.done; _b = _a.next()) {
                var joystick = _b.value;
                switches.push(joystick.getLeft(), joystick.getRight(), joystick.getUp(), joystick.getDown(), joystick.getFire());
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (this._select) {
            switches.push(this._select);
        }
        if (this._start) {
            switches.push(this._start);
        }
        return switches;
        var e_1, _c;
    };
    GamepadDriver.prototype._readState = function (mapping, gamepad) {
        var state = false;
        for (var i = 0; i < mapping.length; i++) {
            var button = gamepad.buttons[mapping[i]];
            state = state || (typeof button === 'object' ? button.pressed : button >= 0.5);
        }
        return state;
    };
    GamepadDriver.prototype._updateJoystickState = function (gamepad, joystickIndex) {
        if (!this._joysticks || joystickIndex >= this._joysticks.length) {
            return;
        }
        var joystick = this._joysticksShadow[joystickIndex];
        joystick["left"].toggle(this._readState(standardMappings["left"], gamepad));
        joystick["right"].toggle(this._readState(standardMappings["right"], gamepad));
        joystick["up"].toggle(this._readState(standardMappings["up"], gamepad));
        joystick["down"].toggle(this._readState(standardMappings["down"], gamepad));
        joystick["fire"].toggle(this._readState(standardMappings["fire"], gamepad));
        if (gamepad.axes[0] < -0.5 || gamepad.axes[2] < -0.5) {
            joystick["left"].toggle(true);
        }
        if (gamepad.axes[0] > 0.5 || gamepad.axes[2] > 0.5) {
            joystick["right"].toggle(true);
        }
        if (gamepad.axes[1] < -0.5 || gamepad.axes[3] < -0.5) {
            joystick["up"].toggle(true);
        }
        if (gamepad.axes[1] > 0.5 || gamepad.axes[3] > 0.5) {
            joystick["down"].toggle(true);
        }
    };
    GamepadDriver.prototype._initShadows = function () {
        if (this._joysticks) {
            for (var i = 0; i < this._joysticks.length; i++) {
                var original = this._joysticks[i], shadow = this._joysticksShadow[i];
                shadow["left"].setState(original.getLeft().peek());
                shadow["right"].setState(original.getRight().peek());
                shadow["up"].setState(original.getUp().peek());
                shadow["down"].setState(original.getDown().peek());
                shadow["fire"].setState(original.getFire().peek());
            }
        }
        if (this._start) {
            this._startShadow.setState(this._start.peek());
        }
        if (this._select) {
            this._selectShadow.setState(this._select.peek());
        }
    };
    GamepadDriver.prototype._syncShadows = function () {
        if (this._joysticks) {
            for (var i = 0; i < this._joysticks.length; i++) {
                var original = this._joysticks[i], shadow = this._joysticksShadow[i];
                shadow["left"].sync(original.getLeft());
                shadow["right"].sync(original.getRight());
                shadow["up"].sync(original.getUp());
                shadow["down"].sync(original.getDown());
                shadow["fire"].sync(original.getFire());
            }
        }
        if (this._start) {
            this._startShadow.sync(this._start);
        }
        if (this._select) {
            this._selectShadow.sync(this._select);
        }
    };
    GamepadDriver.prototype._probeGamepads = function () {
        var cnt = 0;
        var gamepads = navigator.getGamepads();
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                cnt++;
            }
        }
        if (cnt !== this._gamepadCount) {
            this._gamepadCount = cnt;
            this.gamepadCountChanged.dispatch(this._gamepadCount);
        }
    };
    return GamepadDriver;
}());
exports.default = GamepadDriver;
var ShadowSwitch = (function () {
    function ShadowSwitch() {
        this._state = false;
        this._dirty = false;
    }
    ShadowSwitch.prototype.toggle = function (state) {
        if (state === this._state) {
            return;
        }
        this._state = state;
        this._dirty = true;
    };
    ShadowSwitch.prototype.setState = function (state) {
        this._state = state;
        this._dirty = false;
    };
    ShadowSwitch.prototype.sync = function (swtch) {
        if (this._dirty) {
            swtch.toggle(this._state);
            this._dirty = false;
        }
    };
    return ShadowSwitch;
}());
function createShadowJoystick() {
    return _a = {},
        _a["left"] = new ShadowSwitch(),
        _a["right"] = new ShadowSwitch(),
        _a["up"] = new ShadowSwitch(),
        _a["down"] = new ShadowSwitch(),
        _a["fire"] = new ShadowSwitch(),
        _a;
    var _a;
}
var _a;

},{"microevent.ts":4,"tslib":6}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MouseAsPaddleDriver = (function () {
    function MouseAsPaddleDriver() {
        this._x = -1;
        this._listener = this._onDocumentMouseMove.bind(this);
    }
    MouseAsPaddleDriver.prototype.bind = function (paddle) {
        if (this._paddle) {
            return;
        }
        this._paddle = paddle;
        this._x = -1;
        document.addEventListener('mousemove', this._listener);
    };
    MouseAsPaddleDriver.prototype.unbind = function () {
        if (!this._paddle) {
            return;
        }
        document.removeEventListener('mousemove', this._listener);
        this._paddle = null;
    };
    MouseAsPaddleDriver.prototype._onDocumentMouseMove = function (e) {
        if (this._x >= 0) {
            var dx = e.screenX - this._x;
            var value = this._paddle.getValue();
            value += -dx / window.innerWidth / 0.9;
            if (value < 0) {
                value = 0;
            }
            if (value > 1) {
                value = 1;
            }
            this._paddle.setValue(value);
        }
        this._x = e.screenX;
    };
    return MouseAsPaddleDriver;
}());
exports.default = MouseAsPaddleDriver;

},{}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var SMOOTHING_PROPS = [
    'imageSmoothingEnabled',
    'mozImageSmoothingEnabled',
    'webkitImageSmoothingEnabled',
    'msImageSmoothingEnabled'
];
var INITIAL_RENDER_CANVAS_SIZE = 100;
var SimpleCanvasVideo = (function () {
    function SimpleCanvasVideo(_canvas, _aspect) {
        if (_aspect === void 0) { _aspect = 4 / 3; }
        this._canvas = _canvas;
        this._aspect = _aspect;
        this._syncRendering = true;
        this._animationFrameHandle = 0;
        this._pendingFrame = null;
        this._video = null;
        this._interpolate = true;
        this._context = this._canvas.getContext('2d');
        this._renderCanvas = document.createElement('canvas');
        this._renderCanvas.width = this._renderCanvas.height = INITIAL_RENDER_CANVAS_SIZE;
        this._renderContext = this._renderCanvas.getContext('2d');
    }
    SimpleCanvasVideo.prototype.resize = function (width, height) {
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            width = this._canvas.clientWidth;
            height = this._canvas.clientHeight;
        }
        var pixelRatio = window.devicePixelRatio || 1;
        this._canvas.width = width * pixelRatio;
        this._canvas.height = height * pixelRatio;
        this._clearCanvas();
        this._recalculateBlittingMetrics();
        this._applyInterpolationSettings();
        if (this._video) {
            this._blitToCanvas();
        }
        return this;
    };
    SimpleCanvasVideo.prototype.init = function () {
        this.enableInterpolation(true);
        this._clearRenderCanvas();
        this.resize();
        return this;
    };
    SimpleCanvasVideo.prototype.close = function () {
        return this;
    };
    SimpleCanvasVideo.prototype.enableSyncRendering = function (syncRendering) {
        if (syncRendering === this._syncRendering) {
            return this;
        }
        this._cancelPendingFrame();
        this._syncRendering = syncRendering;
        return this;
    };
    SimpleCanvasVideo.prototype.syncRenderingEnabled = function () {
        return this._syncRendering;
    };
    SimpleCanvasVideo.prototype.bind = function (video) {
        if (this._video) {
            return this;
        }
        this._video = video;
        this._videoWidth = this._renderCanvas.width = this._video.getWidth();
        this._videoHeight = this._renderCanvas.height = this._video.getHeight();
        this.resize();
        this._clearRenderCanvas();
        this._video.newFrame.addHandler(SimpleCanvasVideo._frameHandler, this);
        return this;
    };
    SimpleCanvasVideo.prototype.unbind = function () {
        if (!this._video) {
            return this;
        }
        this._video.newFrame.removeHandler(SimpleCanvasVideo._frameHandler, this);
        this._video = null;
        this._cancelPendingFrame();
        this._clearCanvas();
        return this;
    };
    SimpleCanvasVideo.prototype.enableInterpolation = function (enable) {
        if (this._interpolate === enable) {
            return this;
        }
        this._interpolate = enable;
        this._applyInterpolationSettings();
        return this;
    };
    SimpleCanvasVideo.prototype.interpolationEnabled = function () {
        return this._interpolate;
    };
    SimpleCanvasVideo.prototype.getCanvas = function () {
        return this._canvas;
    };
    SimpleCanvasVideo._frameHandler = function (imageDataPoolMember, self) {
        if (self._pendingFrame) {
            self._pendingFrame.release();
        }
        self._pendingFrame = imageDataPoolMember;
        if (self._syncRendering) {
            if (!self._animationFrameHandle) {
                self._scheduleDraw();
            }
        }
        else {
            self._draw();
        }
    };
    SimpleCanvasVideo.prototype._clearCanvas = function () {
        this._context.fillStyle = 'solid black';
        this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
    };
    SimpleCanvasVideo.prototype._clearRenderCanvas = function () {
        this._renderContext.fillStyle = 'solid black';
        this._renderContext.fillRect(0, 0, this._renderCanvas.width, this._renderCanvas.height);
    };
    SimpleCanvasVideo.prototype._draw = function () {
        this._blitToRenderCanvas();
        this._blitToCanvas();
        this._pendingFrame.release();
        this._pendingFrame = null;
    };
    SimpleCanvasVideo.prototype._blitToRenderCanvas = function () {
        this._renderContext.putImageData(this._pendingFrame.get(), 0, 0);
    };
    SimpleCanvasVideo.prototype._blitToCanvas = function () {
        this._context.drawImage(this._renderCanvas, 0, 0, this._videoWidth, this._videoHeight, this._renderX, this._renderY, this._renderWidth, this._renderHeight);
    };
    SimpleCanvasVideo.prototype._scheduleDraw = function () {
        var _this = this;
        if (!this._animationFrameHandle) {
            this._animationFrameHandle = requestAnimationFrame(function () {
                _this._draw();
                _this._animationFrameHandle = 0;
            });
        }
    };
    SimpleCanvasVideo.prototype._cancelPendingFrame = function () {
        if (this._animationFrameHandle) {
            cancelAnimationFrame(this._animationFrameHandle);
            this._animationFrameHandle = 0;
        }
        if (this._pendingFrame) {
            this._pendingFrame.release();
            this._pendingFrame = null;
        }
    };
    SimpleCanvasVideo.prototype._recalculateBlittingMetrics = function () {
        var targetWidth = this._canvas.width, targetHeight = this._canvas.height;
        if (this._aspect * targetHeight <= targetWidth) {
            this._renderHeight = targetHeight;
            this._renderWidth = this._aspect * targetHeight;
            this._renderY = 0;
            this._renderX = Math.floor((targetWidth - this._renderWidth) / 2);
        }
        else {
            this._renderHeight = targetWidth / this._aspect;
            this._renderWidth = targetWidth;
            this._renderY = Math.floor((targetHeight - this._renderHeight) / 2);
            this._renderX = 0;
        }
    };
    SimpleCanvasVideo.prototype._applyInterpolationSettings = function () {
        try {
            for (var SMOOTHING_PROPS_1 = tslib_1.__values(SMOOTHING_PROPS), SMOOTHING_PROPS_1_1 = SMOOTHING_PROPS_1.next(); !SMOOTHING_PROPS_1_1.done; SMOOTHING_PROPS_1_1 = SMOOTHING_PROPS_1.next()) {
                var prop = SMOOTHING_PROPS_1_1.value;
                this._context[prop] = this._interpolate;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (SMOOTHING_PROPS_1_1 && !SMOOTHING_PROPS_1_1.done && (_a = SMOOTHING_PROPS_1.return)) _a.call(SMOOTHING_PROPS_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var e_1, _a;
    };
    return SimpleCanvasVideo;
}());
exports.default = SimpleCanvasVideo;

},{"tslib":6}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var async_mutex_1 = require("async-mutex");
var WaveformChannel_1 = require("./audio/WaveformChannel");
var PCMChannel_1 = require("./audio/PCMChannel");
var WebAudioDriver = (function () {
    function WebAudioDriver(waveformChannels, pcmChannels, fragmentSize) {
        if (waveformChannels === void 0) { waveformChannels = 0; }
        if (pcmChannels === void 0) { pcmChannels = 0; }
        this._context = null;
        this._merger = null;
        this._waveformChannels = null;
        this._pcmChannels = null;
        this._channels = null;
        this._cache = new Map();
        this._mutex = new async_mutex_1.Mutex();
        this._isBound = false;
        this._waveformChannels = new Array(waveformChannels);
        this._pcmChannels = new Array(pcmChannels);
        for (var i = 0; i < waveformChannels; i++) {
            this._waveformChannels[i] = new WaveformChannel_1.default(this._cache);
        }
        for (var i = 0; i < pcmChannels; i++) {
            this._pcmChannels[i] = new PCMChannel_1.default(fragmentSize);
        }
        this._channels = tslib_1.__spread(this._waveformChannels, this._pcmChannels);
    }
    WebAudioDriver.prototype.init = function () {
        var _this = this;
        var ctor = window.AudioContext || window.webkitAudioContext;
        if (!ctor) {
            throw new Error("web audio is not supported by runtime");
        }
        this._context = new ctor();
        try {
            this._context.destination.channelCount = 1;
        }
        catch (e) {
            console.warn('audio driver: failed to set channel count');
        }
        this._merger = this._context.createChannelMerger(this._channels.length);
        this._merger.connect(this._context.destination);
        this._channels.forEach(function (channel) { return channel.init(_this._context, _this._merger); });
    };
    WebAudioDriver.prototype.bind = function (waveformSources, pcmSources) {
        if (waveformSources === void 0) { waveformSources = []; }
        if (pcmSources === void 0) { pcmSources = []; }
        if (this._isBound) {
            return;
        }
        if (waveformSources.length !== this._waveformChannels.length) {
            throw new Error("invalid number of waveform sources: expected " + this._waveformChannels.length + ", got " + waveformSources.length);
        }
        if (pcmSources.length !== this._pcmChannels.length) {
            throw new Error("invalid number of waveform sources: expected " + this._pcmChannels.length + ", got " + pcmSources.length);
        }
        this._waveformChannels.forEach(function (channel, i) { return channel.bind(waveformSources[i]); });
        this._pcmChannels.forEach(function (channel, i) { return channel.bind(pcmSources[i]); });
        this._isBound = true;
        this.resume();
    };
    WebAudioDriver.prototype.unbind = function () {
        if (!this._isBound) {
            return;
        }
        this._channels.forEach(function (channel) { return channel.unbind(); });
        this._isBound = false;
        this.pause();
    };
    WebAudioDriver.prototype.setMasterVolume = function (channel, volume) {
        this._channels[channel].setMasterVolume(volume);
    };
    WebAudioDriver.prototype.pause = function () {
        var _this = this;
        return this._mutex.runExclusive(function () {
            return new Promise(function (resolve) {
                _this._context.suspend().then(resolve, resolve);
                setTimeout(resolve, 200);
            });
        });
    };
    WebAudioDriver.prototype.resume = function () {
        var _this = this;
        return this._mutex.runExclusive(function () {
            return new Promise(function (resolve) {
                _this._context.resume().then(resolve, resolve);
                setTimeout(resolve, 200);
            });
        });
    };
    WebAudioDriver.prototype.close = function () {
        var _this = this;
        this._mutex.runExclusive(function () { return _this._context.close(); });
    };
    return WebAudioDriver;
}());
exports.default = WebAudioDriver;

},{"./audio/PCMChannel":27,"./audio/WaveformChannel":28,"async-mutex":2,"tslib":6}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LinearReasmpler = (function () {
    function LinearReasmpler() {
        this._buffer = new Float32Array(2);
        this._fractionalIndex = 0;
        this._needsData = false;
        this._ratio = 0;
        this.reset(1, 1);
    }
    LinearReasmpler.prototype.reset = function (sourceRate, targetRate) {
        this._ratio = sourceRate / targetRate;
        this._needsData = false;
        this._fractionalIndex = 0;
        for (var i = 0; i < 2; i++) {
            this._buffer[i] = 0;
        }
    };
    LinearReasmpler.prototype.get = function () {
        var x = (1 - this._fractionalIndex) * this._buffer[0] + this._fractionalIndex * this._buffer[1];
        this._fractionalIndex += this._ratio;
        if (this._fractionalIndex > 1) {
            this._fractionalIndex -= 1;
            this._needsData = true;
        }
        return x;
    };
    LinearReasmpler.prototype.push = function (sample) {
        this._buffer[0] = this._buffer[1];
        this._buffer[1] = sample;
        this._needsData = false;
    };
    LinearReasmpler.prototype.needsData = function () {
        return this._needsData;
    };
    return LinearReasmpler;
}());
exports.default = LinearReasmpler;

},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RingBuffer_1 = require("../../../tools/RingBuffer");
var LinearResampler_1 = require("./LinearResampler");
var PCMChannel = (function () {
    function PCMChannel(_hostFragmentSize) {
        if (_hostFragmentSize === void 0) { _hostFragmentSize = 1024; }
        this._hostFragmentSize = _hostFragmentSize;
        this._outputSampleRate = 0;
        this._bufferSize = 0;
        this._volume = 1;
        this._gain = null;
        this._processor = null;
        this._bufferUnderrun = false;
        this._fragmentRing = null;
        this._fragmentSize = 0;
        this._inputSampleRate = 0;
        this._fragmentIndex = 0;
        this._currentFragment = null;
        this._lastFragment = null;
        this._resampler = new LinearResampler_1.default();
    }
    PCMChannel.prototype.init = function (context, target) {
        var _this = this;
        this._outputSampleRate = context.sampleRate;
        this._gain = context.createGain();
        this._gain.gain.value = this._volume;
        this._gain.connect(target);
        this._processor = context.createScriptProcessor(this._hostFragmentSize, 1, 1);
        this._bufferSize = this._processor.bufferSize;
        this._processor.connect(this._gain);
        this._processor.onaudioprocess = function (e) { return _this._processAudio(e); };
        var buffer = context.createBuffer(1, 1, context.sampleRate);
        buffer.getChannelData(0).set([0]);
    };
    PCMChannel.prototype.bind = function (audio) {
        this.unbind();
        this._audio = audio;
        this._fragmentSize = audio.getFrameSize();
        this._inputSampleRate = audio.getSampleRate();
        this._fragmentIndex = 0;
        this._lastFragment = null;
        this._bufferUnderrun = true;
        this._fragmentRing = new RingBuffer_1.default(Math.ceil(4 * this._bufferSize / this._outputSampleRate / this._fragmentSize * this._inputSampleRate));
        this._audio.newFrame.addHandler(PCMChannel._onNewFragment, this);
        this._resampler.reset(this._inputSampleRate, this._outputSampleRate);
    };
    PCMChannel.prototype.unbind = function () {
        if (!this._audio) {
            return;
        }
        this._audio.newFrame.removeHandler(PCMChannel._onNewFragment, this);
        if (this._lastFragment) {
            this._lastFragment.release();
            this._lastFragment = null;
        }
        if (this._currentFragment) {
            this._currentFragment.release();
            this._currentFragment = null;
        }
        if (this._fragmentRing) {
            this._fragmentRing.forEach(function (b) { return b.release(); });
            this._fragmentRing.clear();
            this._fragmentRing = null;
        }
    };
    PCMChannel.prototype.setMasterVolume = function (volume) {
        this._volume = volume;
    };
    PCMChannel._onNewFragment = function (fragment, self) {
        self._fragmentRing.push(fragment);
        if (!self._currentFragment) {
            self._currentFragment = self._fragmentRing.pop();
            self._fragmentIndex = 0;
        }
    };
    PCMChannel.prototype._processAudio = function (e) {
        var _this = this;
        if (!this._audio) {
            return;
        }
        var outputBuffer = e.outputBuffer.getChannelData(0);
        var bufferIndex = 0;
        var fillBuffer = function (until) {
            var previousFragmentBuffer = _this._lastFragment && _this._lastFragment.get();
            while (bufferIndex < until) {
                if (_this._resampler.needsData()) {
                    _this._resampler.push((_this._audio && _this._audio.isPaused()) || !previousFragmentBuffer
                        ? 0
                        : previousFragmentBuffer[_this._fragmentIndex++] * _this._volume);
                    if (_this._fragmentIndex >= _this._fragmentSize) {
                        _this._fragmentIndex = 0;
                    }
                }
                outputBuffer[bufferIndex++] = _this._resampler.get();
            }
        };
        if (this._currentFragment && this._bufferUnderrun) {
            fillBuffer(this._bufferSize >>> 1);
            this._bufferUnderrun = false;
        }
        var fragmentBuffer = this._currentFragment && this._currentFragment.get();
        while (bufferIndex < this._bufferSize && this._currentFragment) {
            if (this._resampler.needsData()) {
                this._resampler.push(fragmentBuffer[this._fragmentIndex++] * this._volume);
                if (this._fragmentIndex >= this._fragmentSize) {
                    this._fragmentIndex = 0;
                    if (this._lastFragment) {
                        this._lastFragment.release();
                    }
                    this._lastFragment = this._currentFragment;
                    this._currentFragment = this._fragmentRing.pop();
                    fragmentBuffer = this._currentFragment && this._currentFragment.get();
                }
            }
            outputBuffer[bufferIndex++] = this._resampler.get();
        }
        if (bufferIndex < this._bufferSize) {
            this._bufferUnderrun = true;
        }
        fillBuffer(this._bufferSize);
    };
    return PCMChannel;
}());
exports.default = PCMChannel;

},{"../../../tools/RingBuffer":17,"./LinearResampler":26}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WaveformChannel = (function () {
    function WaveformChannel(_cache) {
        this._cache = _cache;
        this._context = null;
        this._source = null;
        this._gain = null;
        this._audio = null;
        this._volume = 0;
        this._masterVolume = 1;
    }
    WaveformChannel.prototype.init = function (context, target) {
        this._context = context;
        this._gain = this._context.createGain();
        this._gain.connect(target);
    };
    WaveformChannel.prototype.bind = function (target) {
        if (this._audio) {
            return;
        }
        this._audio = target;
        this._volume = this._audio.getVolume();
        this._updateGain();
        this._audio.volumeChanged.addHandler(WaveformChannel._onVolumeChanged, this);
        this._audio.bufferChanged.addHandler(WaveformChannel._onBufferChanged, this);
        this._audio.stop.addHandler(WaveformChannel._onStop, this);
    };
    WaveformChannel.prototype.unbind = function () {
        if (!this._audio) {
            return;
        }
        this._audio.volumeChanged.removeHandler(WaveformChannel._onVolumeChanged, this);
        this._audio.bufferChanged.removeHandler(WaveformChannel._onBufferChanged, this);
        this._audio.stop.removeHandler(WaveformChannel._onStop, this);
        if (this._source) {
            this._source.stop();
            this._source = null;
        }
        this._audio = null;
    };
    WaveformChannel.prototype.setMasterVolume = function (volume) {
        this._masterVolume = volume;
        this._updateGain();
    };
    WaveformChannel._onVolumeChanged = function (volume, self) {
        self._volume = volume;
        self._updateGain();
    };
    WaveformChannel._onBufferChanged = function (key, self) {
        if (!self._cache.has(key)) {
            var sampleBuffer = self._audio.getBuffer(key), audioBuffer = self._context.createBuffer(1, sampleBuffer.getLength(), sampleBuffer.getSampleRate());
            audioBuffer.getChannelData(0).set(sampleBuffer.getContent());
            self._cache.set(key, audioBuffer);
        }
        var buffer = self._cache.get(key), source = self._context.createBufferSource();
        if (self._source) {
            self._source.stop();
        }
        source.loop = true;
        source.buffer = buffer;
        source.connect(self._gain);
        source.start();
        self._source = source;
    };
    WaveformChannel._onStop = function (payload, self) {
        if (self._source) {
            self._source.stop();
            self._source = null;
        }
    };
    WaveformChannel.prototype._updateGain = function () {
        this._gain.gain.value = this._volume * this._masterVolume;
    };
    return WaveformChannel;
}());
exports.default = WaveformChannel;

},{}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var shader_1 = require("./shader");
var CONTEXT_IDS = ['webgl', 'experimental-webgl'];
var WebglVideoDriver = (function () {
    function WebglVideoDriver(_canvas, config) {
        if (config === void 0) { config = {}; }
        this._canvas = _canvas;
        this._gl = null;
        this._program = null;
        this._vertexBuffer = null;
        this._textureCoordinateBuffer = null;
        this._currentFrameIndex = 0;
        this._frameCount = 0;
        this._gamma = 1;
        this._aspect = 4 / 3;
        this._povEmulation = true;
        this._animationFrameHandle = 0;
        this._syncRendering = true;
        this._video = null;
        this._interpolation = true;
        if (typeof config.aspect !== 'undefined') {
            this._aspect = config.aspect;
        }
        if (typeof config.gamma !== 'undefined') {
            this._gamma = config.gamma;
        }
        if (typeof config.povEmulation !== 'undefined') {
            this._povEmulation = config.povEmulation;
        }
        try {
            for (var CONTEXT_IDS_1 = tslib_1.__values(CONTEXT_IDS), CONTEXT_IDS_1_1 = CONTEXT_IDS_1.next(); !CONTEXT_IDS_1_1.done; CONTEXT_IDS_1_1 = CONTEXT_IDS_1.next()) {
                var contextId = CONTEXT_IDS_1_1.value;
                if (this._gl) {
                    break;
                }
                this._gl = this._canvas.getContext(contextId, {
                    alpha: false
                });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (CONTEXT_IDS_1_1 && !CONTEXT_IDS_1_1.done && (_a = CONTEXT_IDS_1.return)) _a.call(CONTEXT_IDS_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (!this._gl) {
            throw new Error('unable to acquire WebGL context');
        }
        this._createTextureArrays();
        var e_1, _a;
    }
    WebglVideoDriver.prototype.init = function () {
        this._gl.clearColor(0, 0, 0, 1);
        this._createProgram();
        this._createBuffers();
        this.resize();
        this._allocateTextures();
        this._configureTextures();
        this._setupAttribs();
        this.enableInterpolation(true);
        return this;
    };
    WebglVideoDriver.prototype.close = function () {
        var _this = this;
        if (this._program) {
            this._gl.deleteProgram(this._program);
        }
        if (this._vertexShader) {
            this._gl.deleteShader(this._vertexShader);
        }
        if (this._fragmentShader) {
            this._gl.deleteShader(this._fragmentShader);
        }
        if (this._textures) {
            this._textures.forEach(function (t) { return t && _this._gl.deleteTexture(t); });
        }
        if (this._imageData) {
            this._imageData.forEach(function (i) { return i && i.release(); });
        }
        if (this._vertexBuffer) {
            this._gl.deleteBuffer(this._vertexBuffer);
        }
        if (this._textureCoordinateBuffer) {
            this._gl.deleteBuffer(this._textureCoordinateBuffer);
        }
        return this;
    };
    WebglVideoDriver.prototype.resize = function (width, height) {
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            width = this._canvas.clientWidth;
            height = this._canvas.clientHeight;
        }
        var pixelRatio = window.devicePixelRatio || 1;
        this._canvas.width = width * pixelRatio;
        this._canvas.height = height * pixelRatio;
        this._gl.viewport(0, 0, width * pixelRatio, height * pixelRatio);
        this._recalculateVertexBuffer();
        if (this._video) {
            this._draw();
        }
        return this;
    };
    WebglVideoDriver.prototype.getCanvas = function () {
        return this._canvas;
    };
    WebglVideoDriver.prototype.bind = function (video) {
        if (this._video) {
            return this;
        }
        this.resize();
        this._video = video;
        this._video.newFrame.addHandler(WebglVideoDriver._frameHandler, this);
        return this;
    };
    WebglVideoDriver.prototype.unbind = function () {
        this._cancelDraw();
        if (!this._video) {
            return this;
        }
        this._video.newFrame.removeHandler(WebglVideoDriver._frameHandler, this);
        this._video = null;
        return this;
    };
    WebglVideoDriver.prototype.enableInterpolation = function (enabled) {
        if (enabled === this._interpolation) {
            return this;
        }
        this._interpolation = enabled;
        this._configureTextures();
        return this;
    };
    WebglVideoDriver.prototype.interpolationEnabled = function () {
        return this._interpolation;
    };
    WebglVideoDriver.prototype.enableSyncRendering = function (syncRendering) {
        if (syncRendering === this._syncRendering) {
            return this;
        }
        if (!syncRendering) {
            this._cancelDraw();
        }
        this._syncRendering = syncRendering;
        return this;
    };
    WebglVideoDriver.prototype.syncRenderingEnabled = function () {
        return this._syncRendering;
    };
    WebglVideoDriver.prototype.setGamma = function (gamma) {
        this._gamma = gamma;
        return this;
    };
    WebglVideoDriver.prototype.getGamma = function () {
        return this._gamma;
    };
    WebglVideoDriver.prototype.enablePovEmulation = function (emulatePov) {
        if (emulatePov === this._povEmulation) {
            return this;
        }
        this._povEmulation = emulatePov;
        this._reinit();
    };
    WebglVideoDriver.prototype.povEmulationEnabled = function () {
        return this._povEmulation;
    };
    WebglVideoDriver._frameHandler = function (imageDataPoolMember, self) {
        var oldImageData = self._imageData[self._currentFrameIndex];
        self._imageData[self._currentFrameIndex] = imageDataPoolMember;
        self._imageDataGeneration[self._currentFrameIndex]++;
        self._currentFrameIndex = (self._currentFrameIndex + 1) % self._numberOfFramesToCompose;
        if (self._frameCount < self._numberOfFramesToCompose) {
            self._frameCount++;
        }
        else {
            if (self._syncRendering) {
                self._scheduleDraw();
            }
            else {
                self._draw();
            }
            oldImageData.release();
        }
    };
    WebglVideoDriver.prototype._createTextureArrays = function () {
        var _this = this;
        this._numberOfFramesToCompose = this._povEmulation ? 3 : 1;
        if (this._textures) {
            this._textures.forEach(function (t) { return t && _this._gl.deleteTexture(t); });
        }
        if (this._imageData) {
            this._imageData.forEach(function (i) { return i && i.release(); });
        }
        this._textures = new Array(this._numberOfFramesToCompose);
        this._imageData = new Array(this._numberOfFramesToCompose);
        this._imageDataGeneration = new Array(this._numberOfFramesToCompose);
        this._textureGeneration = new Array(this._numberOfFramesToCompose);
        for (var i = 0; i < this._numberOfFramesToCompose; i++) {
            this._imageDataGeneration[i] = 0;
            this._textureGeneration[i] = -1;
        }
    };
    WebglVideoDriver.prototype._reinit = function () {
        this._createTextureArrays();
        this._createProgram();
        this._allocateTextures();
        this._configureTextures();
        this._setupAttribs();
        this._frameCount = 0;
        this._currentFrameIndex = 0;
    };
    WebglVideoDriver.prototype._scheduleDraw = function () {
        var _this = this;
        if (this._animationFrameHandle) {
            return;
        }
        this._animationFrameHandle = requestAnimationFrame(function () { return (_this._draw(), (_this._animationFrameHandle = 0)); });
    };
    WebglVideoDriver.prototype._cancelDraw = function () {
        if (this._animationFrameHandle === 0) {
            return;
        }
        cancelAnimationFrame(this._animationFrameHandle);
        this._animationFrameHandle = 0;
    };
    WebglVideoDriver.prototype._draw = function () {
        if (this._frameCount < this._numberOfFramesToCompose) {
            return;
        }
        var gl = this._gl;
        for (var i = 0; i < this._numberOfFramesToCompose; i++) {
            var frameIndex = (this._currentFrameIndex - i - 1 + this._numberOfFramesToCompose) % this._numberOfFramesToCompose;
            if (this._textureGeneration[frameIndex] !== this._imageDataGeneration[frameIndex]) {
                gl.activeTexture(gl["TEXTURE" + frameIndex]);
                gl.bindTexture(gl.TEXTURE_2D, this._textures[frameIndex]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._imageData[frameIndex].get());
                this._textureGeneration[frameIndex] = this._imageDataGeneration[frameIndex];
            }
        }
        for (var i = 0; i < this._numberOfFramesToCompose; i++) {
            gl.uniform1i(this._getUniformLocation("u_Sampler" + i), (this._currentFrameIndex + this._numberOfFramesToCompose - i - 1) % this._numberOfFramesToCompose);
        }
        gl.uniform1f(this._getUniformLocation('u_Gamma'), this._gamma);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    WebglVideoDriver.prototype._createProgram = function () {
        var gl = this._gl, vertexShader = gl.createShader(gl.VERTEX_SHADER), fragmentShader = gl.createShader(gl.FRAGMENT_SHADER), program = gl.createProgram();
        gl.shaderSource(vertexShader, shader_1.vertexShader);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error("failed to compile vertex shader: " + gl.getShaderInfoLog(vertexShader));
        }
        gl.shaderSource(fragmentShader, this._povEmulation ? shader_1.fragmentShaderPov : shader_1.fragmentShaderPlain);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error("failed to compile fragment shader: " + gl.getShaderInfoLog(fragmentShader));
        }
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("failed to link program: " + gl.getProgramInfoLog(program));
        }
        gl.useProgram(program);
        if (this._program) {
            gl.deleteProgram(this._program);
        }
        if (this._vertexShader) {
            gl.deleteShader(this._vertexShader);
        }
        if (this._fragmentShader) {
            gl.deleteShader(this._fragmentShader);
        }
        this._program = program;
        this._vertexShader = vertexShader;
        this._fragmentShader = fragmentShader;
    };
    WebglVideoDriver.prototype._allocateTextures = function () {
        for (var i = 0; i < this._numberOfFramesToCompose; i++) {
            this._allocateTexture(i);
        }
    };
    WebglVideoDriver.prototype._configureTextures = function () {
        for (var i = 0; i < this._numberOfFramesToCompose; i++) {
            this._configureTexture(i);
        }
    };
    WebglVideoDriver.prototype._allocateTexture = function (index) {
        var gl = this._gl, texture = gl.createTexture();
        gl.activeTexture(gl["TEXTURE" + index]);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this._textures[index] = texture;
    };
    WebglVideoDriver.prototype._configureTexture = function (index) {
        var gl = this._gl;
        gl.activeTexture(gl["TEXTURE" + index]);
        gl.bindTexture(gl.TEXTURE_2D, this._textures[index]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._interpolation ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._interpolation ? gl.LINEAR : gl.NEAREST);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    };
    WebglVideoDriver.prototype._createBuffers = function () {
        var gl = this._gl, vertexBuffer = gl.createBuffer(), textureCoordinateBuffer = gl.createBuffer();
        var textureCoordinateData = [1, 1, 0, 1, 1, 0, 0, 0];
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinateBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinateData), gl.STATIC_DRAW);
        this._vertexBuffer = vertexBuffer;
        this._textureCoordinateBuffer = textureCoordinateBuffer;
    };
    WebglVideoDriver.prototype._recalculateVertexBuffer = function () {
        var gl = this._gl, targetWidth = this._canvas.width, targetHeight = this._canvas.height, scaleX = targetWidth > 0 ? 2 / targetWidth : 1, scaleY = targetHeight > 0 ? 2 / targetHeight : 1;
        var width, height, west, north;
        if (this._aspect * targetHeight <= targetWidth) {
            height = 2;
            width = this._aspect * targetHeight * scaleX;
            north = 1;
            west = Math.floor(-this._aspect * targetHeight) / 2 * scaleX;
        }
        else {
            height = targetWidth / this._aspect * scaleY;
            width = 2;
            north = Math.floor(targetWidth / this._aspect) / 2 * scaleY;
            west = -1;
        }
        var vertexData = [west + width, north, west, north, west + width, north - height, west, north - height];
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
    };
    WebglVideoDriver.prototype._getAttribLocation = function (name) {
        var gl = this._gl, location = gl.getAttribLocation(this._program, name);
        if (location < 0) {
            throw new Error("unable to locate attribute " + name);
        }
        return location;
    };
    WebglVideoDriver.prototype._getUniformLocation = function (name) {
        var gl = this._gl, location = gl.getUniformLocation(this._program, name);
        if (location < 0) {
            throw new Error("unable to locate uniform " + name);
        }
        return location;
    };
    WebglVideoDriver.prototype._setupAttribs = function () {
        var gl = this._gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.enableVertexAttribArray(this._getAttribLocation('a_VertexPosition'));
        gl.vertexAttribPointer(this._getAttribLocation('a_VertexPosition'), 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordinateBuffer);
        gl.enableVertexAttribArray(this._getAttribLocation('a_TextureCoordinate'));
        gl.vertexAttribPointer(this._getAttribLocation('a_TextureCoordinate'), 2, gl.FLOAT, false, 0, 0);
    };
    return WebglVideoDriver;
}());
exports.default = WebglVideoDriver;

},{"./shader":30,"tslib":6}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vertexShader = "\n    attribute vec2 a_VertexPosition;\n    attribute vec2 a_TextureCoordinate;\n\n    varying vec2 v_TextureCoordinate;\n\n    void main() {\n        v_TextureCoordinate = a_TextureCoordinate;\n        gl_Position = vec4(a_VertexPosition, 0, 1);\n    }\n";
exports.fragmentShaderPlain = "\n    precision mediump float;\n\n    varying vec2 v_TextureCoordinate;\n\n    uniform sampler2D u_Sampler0;\n    uniform float u_Gamma;\n\n    void main() {\n        vec4 texel = texture2D(u_Sampler0, v_TextureCoordinate);\n\n        gl_FragColor = vec4(pow(texel.rgb, vec3(u_Gamma)), 1.);\n    }\n";
exports.fragmentShaderPov = "\n    precision mediump float;\n\n    varying vec2 v_TextureCoordinate;\n\n    uniform sampler2D u_Sampler0, u_Sampler1, u_Sampler2;\n    uniform float u_Gamma;\n\n    void main() {\n        vec4 compositedTexel =\n            0.4 * texture2D(u_Sampler0, v_TextureCoordinate) +\n            0.4 * texture2D(u_Sampler1, v_TextureCoordinate) +\n            0.2 * texture2D(u_Sampler2, v_TextureCoordinate);\n\n        gl_FragColor = vec4(pow(compositedTexel.rgb, vec3(u_Gamma)), 1.);\n    }\n";

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SwitchProxy_1 = require("./SwitchProxy");
var ControlPanelProxy = (function () {
    function ControlPanelProxy() {
        this._reset = new SwitchProxy_1.default();
        this._select = new SwitchProxy_1.default();
        this._difficultyPlayer1 = new SwitchProxy_1.default();
        this._difficultyPlayer2 = new SwitchProxy_1.default();
        this._color = new SwitchProxy_1.default();
        this._boundControlPanel = null;
    }
    ControlPanelProxy.prototype.bind = function (controlPanel) {
        this.unbind();
        this._boundControlPanel = controlPanel;
        this._reset.bind(this._boundControlPanel.getResetButton());
        this._select.bind(this._boundControlPanel.getSelectSwitch());
        this._difficultyPlayer1.bind(this._boundControlPanel.getDifficultySwitchP0());
        this._difficultyPlayer2.bind(this._boundControlPanel.getDifficultySwitchP1());
        this._color.bind(this._boundControlPanel.getColorSwitch());
        this._difficultyPlayer1.toggle(true);
        this._difficultyPlayer2.toggle(true);
    };
    ControlPanelProxy.prototype.unbind = function () {
        if (!this._boundControlPanel) {
            return;
        }
        this._reset.unbind();
        this._select.unbind();
        this._difficultyPlayer1.unbind();
        this._difficultyPlayer2.unbind();
        this._color.unbind();
        this._boundControlPanel = null;
    };
    ControlPanelProxy.prototype.reset = function () {
        return this._reset;
    };
    ControlPanelProxy.prototype.select = function () {
        return this._select;
    };
    ControlPanelProxy.prototype.difficultyPlayer1 = function () {
        return this._difficultyPlayer1;
    };
    ControlPanelProxy.prototype.difficultyPlayer2 = function () {
        return this._difficultyPlayer2;
    };
    ControlPanelProxy.prototype.color = function () {
        return this._color;
    };
    return ControlPanelProxy;
}());
exports.default = ControlPanelProxy;

},{"./SwitchProxy":33}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var async_mutex_1 = require("async-mutex");
var microevent_ts_1 = require("microevent.ts");
var EmulationServiceInterface_1 = require("../../stella/service/EmulationServiceInterface");
var EmulationService_1 = require("../../stella/service/worker/EmulationService");
var DriverManager_1 = require("../../stella/service/DriverManager");
var SimpleCanvasVideo_1 = require("../../driver/SimpleCanvasVideo");
var WebglVideo_1 = require("../../driver/webgl/WebglVideo");
var WebAudio_1 = require("../../stella/driver/WebAudio");
var KeyboardIO_1 = require("../../stella/driver/KeyboardIO");
var MouseAsPaddle_1 = require("../../driver/MouseAsPaddle");
var Gamepad_1 = require("../../driver/Gamepad");
var FullscreenVideo_1 = require("../../driver/FullscreenVideo");
var CartridgeInfo_1 = require("../../../machine/stella/cartridge/CartridgeInfo");
var Config_1 = require("../../../machine/stella/Config");
var base64_1 = require("../../../tools/base64");
var ControlPanelProxy_1 = require("./ControlPanelProxy");
var Stellerator = (function () {
    function Stellerator(canvasElt, workerUrl, config) {
        if (config === void 0) { config = {}; }
        var _this = this;
        this._config = null;
        this._emulationService = null;
        this._serviceInitialized = null;
        this._videoDriver = null;
        this._webglVideo = null;
        this._fullscreenVideo = null;
        this._audioDriver = null;
        this._keyboardIO = null;
        this._paddle = null;
        this._gamepad = null;
        this._controlPanel = new ControlPanelProxy_1.default();
        this._state = Stellerator.State.stopped;
        this._driverManager = new DriverManager_1.default();
        this._mutex = new async_mutex_1.Mutex();
        this._canvasElt = canvasElt;
        this._config = tslib_1.__assign({ smoothScaling: true, simulatePov: true, gamma: 1, audio: true, volume: 1, enableKeyboard: true, keyboardTarget: document, fullscreenViaKeyboard: true, paddleViaMouse: true, pauseViaKeyboard: true, enableGamepad: true, resetViaKeyboard: true }, config);
        this._emulationService = new EmulationService_1.default(workerUrl);
        this.frequencyUpdate = this._emulationService.frequencyUpdate;
        var stateChange = new microevent_ts_1.Event();
        this._emulationService.stateChanged.addHandler(function (newState) { return stateChange.dispatch(_this._mapState(newState)); });
        this.stateChange = stateChange;
        this._createDrivers();
        this._driverManager.addDriver(this._controlPanel, function (context) {
            return _this._controlPanel.bind(context.getControlPanel());
        });
        this._driverManager.bind(this._emulationService);
        this._serviceInitialized = this._emulationService.init().then(undefined, function (e) {
            console.log(e);
            throw e;
        });
    }
    Stellerator.prototype.setGamma = function (gamma) {
        if (this._webglVideo) {
            this._webglVideo.setGamma(gamma);
        }
        return this;
    };
    Stellerator.prototype.getGamma = function () {
        return this._webglVideo ? this._webglVideo.getGamma() : 1;
    };
    Stellerator.prototype.enablePovSimulation = function (povEnabled) {
        if (this._webglVideo) {
            this._webglVideo.enablePovEmulation(povEnabled);
        }
        return this;
    };
    Stellerator.prototype.isPovSimulationEnabled = function () {
        return this._webglVideo ? this._webglVideo.povEmulationEnabled() : false;
    };
    Stellerator.prototype.enableSmoothScaling = function (smoothScalingEnabled) {
        this._videoDriver.enableInterpolation(smoothScalingEnabled);
        return this;
    };
    Stellerator.prototype.smoothScalingEnabled = function () {
        return this._videoDriver.interpolationEnabled();
    };
    Stellerator.prototype.toggleFullscreen = function (fullscreen) {
        if (typeof fullscreen === 'undefined') {
            this._fullscreenVideo.toggle();
        }
        else {
            fullscreen ? this._fullscreenVideo.engage() : this._fullscreenVideo.disengage();
        }
        return this;
    };
    Stellerator.prototype.isFullscreen = function () {
        return this._fullscreenVideo.isEngaged();
    };
    Stellerator.prototype.setVolume = function (volume) {
        if (this._audioDriver) {
            this._audioDriver.setMasterVolume(Math.max(Math.min(volume, 1), 0));
        }
        return this;
    };
    Stellerator.prototype.audioEnabled = function () {
        return !!this._audioDriver;
    };
    Stellerator.prototype.getVolume = function () {
        return this._audioDriver ? this._audioDriver.getMasterVolume() : 0;
    };
    Stellerator.prototype.resize = function () {
        this._videoDriver.resize();
        return this;
    };
    Stellerator.prototype.getState = function () {
        return this._state;
    };
    Stellerator.prototype.getControlPanel = function () {
        return this._controlPanel;
    };
    Stellerator.prototype.start = function (cartridge, tvMode, config) {
        var _this = this;
        if (config === void 0) { config = {}; }
        return this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var stellaConfig, _a, _b;
            return tslib_1.__generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (typeof cartridge === 'string') {
                            cartridge = base64_1.decode(cartridge);
                        }
                        stellaConfig = Config_1.default.create({
                            tvMode: this._convertTvMode(tvMode),
                            pcmAudio: true
                        });
                        if (typeof config.randomSeed !== 'undefined' && config.randomSeed > 0) {
                            stellaConfig.randomSeed = config.randomSeed;
                        }
                        if (typeof config.emulatePaddles !== 'undefined') {
                            stellaConfig.emulatePaddles = config.emulatePaddles;
                        }
                        if (typeof config.frameStart !== 'undefined') {
                            stellaConfig.frameStart = config.frameStart;
                        }
                        return [4, this._serviceInitialized];
                    case 1:
                        _c.sent();
                        _a = this;
                        _b = this._mapState;
                        return [4, this._emulationService.start(cartridge, stellaConfig, config.cartridgeType)];
                    case 2: return [2, (_a._state = _b.apply(this, [_c.sent()]))];
                }
            });
        }); });
    };
    Stellerator.prototype.run = function (cartridge, tvMode, config) {
        if (config === void 0) { config = {}; }
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.start(cartridge, tvMode, config)];
                    case 1:
                        if ((_a.sent()) === Stellerator.State.paused) {
                            return [2, this.resume()];
                        }
                        return [2];
                }
            });
        });
    };
    Stellerator.prototype.pause = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._serviceInitialized];
                    case 1:
                        _a.sent();
                        return [2, this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { var _a, _b; return tslib_1.__generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = this;
                                        _b = this._mapState;
                                        return [4, this._emulationService.pause()];
                                    case 1: return [2, (_a._state = _b.apply(this, [_c.sent()]))];
                                }
                            }); }); })];
                }
            });
        });
    };
    Stellerator.prototype.resume = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._serviceInitialized];
                    case 1:
                        _a.sent();
                        return [2, this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { var _a, _b; return tslib_1.__generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = this;
                                        _b = this._mapState;
                                        return [4, this._emulationService.resume()];
                                    case 1: return [2, (_a._state = _b.apply(this, [_c.sent()]))];
                                }
                            }); }); })];
                }
            });
        });
    };
    Stellerator.prototype.stop = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._serviceInitialized];
                    case 1:
                        _a.sent();
                        return [2, this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { var _a, _b; return tslib_1.__generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = this;
                                        _b = this._mapState;
                                        return [4, this._emulationService.stop()];
                                    case 1: return [2, (_a._state = _b.apply(this, [_c.sent()]))];
                                }
                            }); }); })];
                }
            });
        });
    };
    Stellerator.prototype.reset = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._serviceInitialized];
                    case 1:
                        _a.sent();
                        return [2, this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { var _a, _b; return tslib_1.__generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = this;
                                        _b = this._mapState;
                                        return [4, this._emulationService.reset()];
                                    case 1: return [2, (_a._state = _b.apply(this, [_c.sent()]))];
                                }
                            }); }); })];
                }
            });
        });
    };
    Stellerator.prototype.lastError = function () {
        return this._emulationService.getLastError();
    };
    Stellerator.prototype._convertTvMode = function (tvMode) {
        switch (tvMode) {
            case Stellerator.TvMode.ntsc:
                return 0;
            case Stellerator.TvMode.pal:
                return 1;
            case Stellerator.TvMode.secam:
                return 2;
            default:
                throw new Error("invalid TV mode '" + tvMode + "'");
        }
    };
    Stellerator.prototype._createDrivers = function () {
        var _this = this;
        try {
            this._webglVideo = this._videoDriver = new WebglVideo_1.default(this._canvasElt, {
                povEmulation: this._config.simulatePov,
                gamma: this._config.gamma
            }).init();
        }
        catch (e) {
            this._webglVideo = null;
            this._videoDriver = new SimpleCanvasVideo_1.default(this._canvasElt).init();
        }
        this._videoDriver.enableInterpolation(this._config.smoothScaling);
        this._driverManager.addDriver(this._videoDriver, function (context) { return _this._videoDriver.bind(context.getVideo()); });
        this._fullscreenVideo = new FullscreenVideo_1.default(this._videoDriver);
        if (this._config.audio) {
            try {
                this._audioDriver = new WebAudio_1.default();
                this._audioDriver.init();
                this._audioDriver.setMasterVolume(this._config.volume);
                this._driverManager.addDriver(this._audioDriver, function (context) {
                    return _this._audioDriver.bind(true, [context.getPCMChannel()]);
                });
            }
            catch (e) {
                console.error("failed to initialize audio: " + (e && e.message));
            }
        }
        if (this._config.enableKeyboard) {
            this._keyboardIO = new KeyboardIO_1.default(this._config.keyboardTarget);
            this._driverManager.addDriver(this._keyboardIO, function (context) {
                return _this._keyboardIO.bind(context.getJoystick(0), context.getJoystick(1), context.getControlPanel());
            });
            if (this._config.fullscreenViaKeyboard) {
                this._keyboardIO.toggleFullscreen.addHandler(function () { return _this._fullscreenVideo.toggle(); });
            }
            if (this._config.pauseViaKeyboard) {
                this._keyboardIO.togglePause.addHandler(function () {
                    switch (_this._emulationService.getState()) {
                        case EmulationServiceInterface_1.default.State.paused:
                            _this.resume();
                            break;
                        case EmulationServiceInterface_1.default.State.running:
                            _this.pause();
                            break;
                    }
                });
            }
        }
        if (this._config.resetViaKeyboard) {
            this._keyboardIO.hardReset.addHandler(function () { return _this.reset(); });
        }
        if (this._config.enableGamepad) {
            this._gamepad = new Gamepad_1.default();
            this._gamepad.init();
            this._driverManager.addDriver(this._gamepad, function (context) {
                return _this._gamepad.bind({
                    joysticks: [context.getJoystick(0), context.getJoystick(1)],
                    start: context.getControlPanel().getResetButton(),
                    select: context.getControlPanel().getSelectSwitch()
                });
            });
        }
        if (this._config.paddleViaMouse) {
            this._paddle = new MouseAsPaddle_1.default();
            this._driverManager.addDriver(this._paddle, function (context) { return _this._paddle.bind(context.getPaddle(0)); });
        }
    };
    Stellerator.prototype._mapState = function (state) {
        switch (state) {
            case EmulationServiceInterface_1.default.State.stopped:
                return Stellerator.State.stopped;
            case EmulationServiceInterface_1.default.State.running:
                return Stellerator.State.running;
            case EmulationServiceInterface_1.default.State.paused:
                return Stellerator.State.paused;
            case EmulationServiceInterface_1.default.State.error:
                return Stellerator.State.error;
            default:
                throw new Error('cannot happen');
        }
    };
    return Stellerator;
}());
exports.default = Stellerator;
(function (Stellerator) {
    var TvMode;
    (function (TvMode) {
        TvMode["ntsc"] = "ntsc";
        TvMode["pal"] = "pal";
        TvMode["secam"] = "secam";
    })(TvMode = Stellerator.TvMode || (Stellerator.TvMode = {}));
    Stellerator.CartridgeType = CartridgeInfo_1.default.CartridgeType;
    Stellerator.describeCartridgeType = CartridgeInfo_1.default.describeCartridgeType;
    Stellerator.allCartridgeTypes = CartridgeInfo_1.default.getAllTypes;
    var State;
    (function (State) {
        State["running"] = "running";
        State["paused"] = "paused";
        State["stopped"] = "stopped";
        State["error"] = "error";
    })(State = Stellerator.State || (Stellerator.State = {}));
})(Stellerator || (Stellerator = {}));
exports.default = Stellerator;

},{"../../../machine/stella/Config":12,"../../../machine/stella/cartridge/CartridgeInfo":14,"../../../tools/base64":18,"../../driver/FullscreenVideo":21,"../../driver/Gamepad":22,"../../driver/MouseAsPaddle":23,"../../driver/SimpleCanvasVideo":24,"../../driver/webgl/WebglVideo":29,"../../stella/driver/KeyboardIO":35,"../../stella/driver/WebAudio":36,"../../stella/service/DriverManager":37,"../../stella/service/EmulationServiceInterface":38,"../../stella/service/worker/EmulationService":41,"./ControlPanelProxy":31,"async-mutex":2,"microevent.ts":4,"tslib":6}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var SwitchProxy = (function () {
    function SwitchProxy() {
        this.stateChange = new microevent_ts_1.Event();
        this._state = false;
        this._boundSwitch = null;
    }
    SwitchProxy.prototype.bind = function (swtch) {
        this.unbind();
        this._boundSwitch = swtch;
        this._boundSwitch.toggle(this._state);
        this._boundSwitch.stateChanged.addHandler(SwitchProxy._onBoundStateChange, this);
        this._setState(this._boundSwitch.read());
    };
    SwitchProxy.prototype.unbind = function () {
        if (!this._boundSwitch) {
            return;
        }
        this._boundSwitch.stateChanged.removeHandler(SwitchProxy._onBoundStateChange, this);
        this._boundSwitch = null;
    };
    SwitchProxy.prototype.toggle = function (state) {
        if (this._boundSwitch) {
            this._boundSwitch.toggle(state);
        }
        else {
            this._setState(state);
        }
        return this;
    };
    SwitchProxy.prototype.read = function () {
        return this._state;
    };
    SwitchProxy._onBoundStateChange = function (newState, self) {
        self._setState(newState);
    };
    SwitchProxy.prototype._setState = function (newState) {
        if (newState !== this._state) {
            this._state = newState;
            this.stateChange.dispatch(this._state);
        }
    };
    return SwitchProxy;
}());
exports.default = SwitchProxy;

},{"microevent.ts":4}],34:[function(require,module,exports){
"use strict";
var Stellerator_1 = require("./Stellerator");
module.exports = {
    Stellerator: Stellerator_1.default
};

},{"./Stellerator":32}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
function mkSwitch(swtch) {
    return {
        type: 0,
        swtch: swtch
    };
}
function mkTrigger(event) {
    return {
        type: 1,
        trigger: event
    };
}
var KeyboardIO = (function () {
    function KeyboardIO(_target, mappings) {
        if (mappings === void 0) { mappings = KeyboardIO.defaultMappings; }
        this._target = _target;
        this.toggleFullscreen = new microevent_ts_1.Event();
        this.hardReset = new microevent_ts_1.Event();
        this.togglePause = new microevent_ts_1.Event();
        this._keydownListener = null;
        this._keyupListener = null;
        this._joystick0 = null;
        this._joystick1 = null;
        this._controlPanel = null;
        this._dispatchTable = {};
        this._compiledMappings = new Map();
        this._compileMappings(mappings);
    }
    KeyboardIO.prototype.bind = function (joystick0, joystick1, controlPanel) {
        var _this = this;
        if (this._joystick0) {
            return;
        }
        this._joystick0 = joystick0;
        this._joystick1 = joystick1;
        this._controlPanel = controlPanel;
        this._updateActionTable();
        this._keydownListener = function (e) {
            if (!_this._compiledMappings.has(e.keyCode)) {
                return;
            }
            var modifiers = (e.shiftKey ? 4 : 0) |
                (e.ctrlKey ? 1 : 0) |
                (e.altKey ? 2 : 0);
            if (!_this._compiledMappings.get(e.keyCode).has(modifiers)) {
                return;
            }
            var action = _this._compiledMappings.get(e.keyCode).get(modifiers);
            if (typeof action !== 'undefined') {
                e.preventDefault();
                var dispatch = _this._dispatchTable[action];
                switch (dispatch.type) {
                    case 0:
                        dispatch.swtch.toggle(true);
                        break;
                    case 1:
                        dispatch.trigger.dispatch(undefined);
                        break;
                    default:
                }
            }
        };
        this._keyupListener = function (e) {
            if (!_this._compiledMappings.has(e.keyCode)) {
                return;
            }
            try {
                for (var _a = tslib_1.__values(_this._compiledMappings.get(e.keyCode).values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var action = _b.value;
                    e.preventDefault();
                    var dispatch = _this._dispatchTable[action];
                    switch (dispatch.type) {
                        case 0:
                            dispatch.swtch.toggle(false);
                            break;
                        default:
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var e_1, _c;
        };
        this._target.addEventListener('keydown', this._keydownListener);
        this._target.addEventListener('keyup', this._keyupListener);
    };
    KeyboardIO.prototype.unbind = function () {
        if (!this._joystick0) {
            return;
        }
        this._target.removeEventListener('keydown', this._keydownListener);
        this._target.removeEventListener('keyup', this._keyupListener);
        this._joystick0 = this._joystick1 = this._controlPanel = null;
        this._keydownListener = this._keyupListener = null;
    };
    KeyboardIO.prototype._updateActionTable = function () {
        this._dispatchTable[12] = mkTrigger(this.toggleFullscreen);
        this._dispatchTable[13] = mkTrigger(this.hardReset);
        this._dispatchTable[14] = mkTrigger(this.togglePause);
        this._dispatchTable[0] = mkSwitch(this._controlPanel.getSelectSwitch());
        this._dispatchTable[1] = mkSwitch(this._controlPanel.getResetButton());
        this._dispatchTable[2] = mkSwitch(this._joystick0.getLeft());
        this._dispatchTable[3] = mkSwitch(this._joystick0.getRight());
        this._dispatchTable[4] = mkSwitch(this._joystick0.getUp());
        this._dispatchTable[5] = mkSwitch(this._joystick0.getDown());
        this._dispatchTable[10] = mkSwitch(this._joystick0.getFire());
        this._dispatchTable[6] = mkSwitch(this._joystick1.getLeft());
        this._dispatchTable[7] = mkSwitch(this._joystick1.getRight());
        this._dispatchTable[8] = mkSwitch(this._joystick1.getUp());
        this._dispatchTable[9] = mkSwitch(this._joystick1.getDown());
        this._dispatchTable[11] = mkSwitch(this._joystick1.getFire());
    };
    KeyboardIO.prototype._compileMappings = function (mappings) {
        var _this = this;
        var compileMapping = function (action, keycode, modifiers) {
            if ((modifiers & ~(4 | 1 | 2)) !== 0) {
                throw new Error("invalid modifier set " + modifiers);
            }
            if (!_this._compiledMappings.has(keycode)) {
                _this._compiledMappings.set(keycode, new Map());
            }
            _this._compiledMappings.get(keycode).set(modifiers, action);
        };
        mappings.forEach(function (mapping) {
            var action = mapping.action, specs = Array.isArray(mapping.spec) ? mapping.spec : [mapping.spec];
            specs.forEach(function (spec) {
                return compileMapping(action, typeof spec === 'object' ? spec.keycode : spec, typeof spec === 'object' ? spec.modifiers : 0);
            });
        });
    };
    return KeyboardIO;
}());
exports.default = KeyboardIO;
(function (KeyboardIO) {
    KeyboardIO.defaultMappings = [
        {
            action: 0,
            spec: {
                keycode: 32,
                modifiers: 4
            }
        },
        {
            action: 1,
            spec: {
                keycode: 13,
                modifiers: 4
            }
        },
        {
            action: 2,
            spec: [
                65,
                37
            ]
        },
        {
            action: 3,
            spec: [
                68,
                39
            ]
        },
        {
            action: 4,
            spec: [
                87,
                38
            ]
        },
        {
            action: 5,
            spec: [
                83,
                40
            ]
        },
        {
            action: 10,
            spec: [
                32,
                86
            ]
        },
        {
            action: 6,
            spec: 74
        },
        {
            action: 7,
            spec: 76
        },
        {
            action: 8,
            spec: 73
        },
        {
            action: 9,
            spec: 75
        },
        {
            action: 11,
            spec: 66
        },
        {
            action: 12,
            spec: 13
        },
        {
            action: 13,
            spec: {
                keycode: 82,
                modifiers: 4
            }
        },
        {
            action: 14,
            spec: 80
        }
    ];
})(KeyboardIO || (KeyboardIO = {}));
exports.default = KeyboardIO;

},{"microevent.ts":4,"tslib":6}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var WebAudio_1 = require("../../driver/WebAudio");
var WebAudioDriver = (function () {
    function WebAudioDriver(_fragmentSize) {
        this._fragmentSize = _fragmentSize;
        this._pcmAudio = false;
        this._volume = 1;
    }
    WebAudioDriver.prototype.init = function () { };
    WebAudioDriver.prototype.bind = function (pcmAudio, channels) {
        if (this._channels) {
            return;
        }
        this._channels = tslib_1.__spread(channels);
        if (!this._driver || this._pcmAudio !== pcmAudio) {
            if (this._driver) {
                this._driver.close();
            }
            this._driver = pcmAudio
                ? new WebAudio_1.default(0, this._channels.length, this._fragmentSize)
                : new WebAudio_1.default(this._channels.length, 0, this._fragmentSize);
            this._driver.init();
        }
        if (pcmAudio) {
            this._driver.bind([], this._channels);
        }
        else {
            this._driver.bind(this._channels, []);
        }
        for (var i = 0; i < this._channels.length; i++) {
            this._driver.setMasterVolume(i, this._volume);
        }
        this._pcmAudio = pcmAudio;
    };
    WebAudioDriver.prototype.unbind = function () {
        if (!this._channels) {
            return;
        }
        this._driver.unbind();
        this._channels = null;
    };
    WebAudioDriver.prototype.setMasterVolume = function (volume) {
        this._volume = volume;
        if (this._channels) {
            for (var i = 0; i < this._channels.length; i++) {
                this._driver.setMasterVolume(i, this._volume);
            }
        }
    };
    WebAudioDriver.prototype.getMasterVolume = function () {
        return this._volume;
    };
    WebAudioDriver.prototype.pause = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._driver) return [3, 2];
                        return [4, this._driver.pause()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2];
                }
            });
        });
    };
    WebAudioDriver.prototype.resume = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._driver) return [3, 2];
                        return [4, this._driver.resume()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2];
                }
            });
        });
    };
    return WebAudioDriver;
}());
exports.default = WebAudioDriver;

},{"../../driver/WebAudio":25,"tslib":6}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EmulationServiceInterface_1 = require("./EmulationServiceInterface");
var DriverManager = (function () {
    function DriverManager() {
        this._drivers = new Map();
        this._driversBound = false;
    }
    DriverManager.prototype.bind = function (emulationService) {
        if (this._driversBound) {
            return this;
        }
        this._emulationService = emulationService;
        if (this._shouldBindDrivers()) {
            this._bindDrivers();
        }
        this._emulationService.stateChanged.addHandler(DriverManager._onEmuStateChange, this);
        return this;
    };
    DriverManager.prototype.unbind = function () {
        if (!this._emulationService) {
            return this;
        }
        this._unbindDrivers();
        this._emulationService.stateChanged.removeHandler(DriverManager._onEmuStateChange, this);
        this._emulationService = null;
        return this;
    };
    DriverManager.prototype.addDriver = function (driver, binder) {
        this._drivers.set(driver, new DriverManager.DriverContext(driver, binder));
        if (this._driversBound) {
            binder(this._emulationService.getEmulationContext(), driver);
        }
        return this;
    };
    DriverManager.prototype.removeDriver = function (driver) {
        if (!this._drivers.get(driver)) {
            return this;
        }
        driver.unbind();
        this._drivers.delete(driver);
        return this;
    };
    DriverManager._onEmuStateChange = function (newState, self) {
        if (self._shouldBindDrivers(newState)) {
            self._bindDrivers();
        }
        else {
            self._unbindDrivers();
        }
    };
    DriverManager.prototype._shouldBindDrivers = function (state) {
        if (state === void 0) { state = this._emulationService ? this._emulationService.getState() : undefined; }
        return (this._emulationService &&
            (state === EmulationServiceInterface_1.default.State.running || state === EmulationServiceInterface_1.default.State.paused));
    };
    DriverManager.prototype._bindDrivers = function () {
        var _this = this;
        if (this._driversBound) {
            return;
        }
        this._drivers.forEach(function (driverContext) {
            return driverContext.binder(_this._emulationService.getEmulationContext(), driverContext.driver);
        });
        this._driversBound = true;
    };
    DriverManager.prototype._unbindDrivers = function () {
        if (!this._driversBound) {
            return;
        }
        this._drivers.forEach(function (driverContext) { return driverContext.driver.unbind(); });
        this._driversBound = false;
    };
    return DriverManager;
}());
exports.default = DriverManager;
(function (DriverManager) {
    var DriverContext = (function () {
        function DriverContext(driver, binder) {
            this.driver = driver;
            this.binder = binder;
        }
        return DriverContext;
    }());
    DriverManager.DriverContext = DriverContext;
})(DriverManager || (DriverManager = {}));
exports.default = DriverManager;

},{"./EmulationServiceInterface":38}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EmulationServiceInterface;
(function (EmulationServiceInterface) {
    var State;
    (function (State) {
        State[State["stopped"] = 0] = "stopped";
        State[State["running"] = 1] = "running";
        State[State["paused"] = 2] = "paused";
        State[State["error"] = 3] = "error";
    })(State = EmulationServiceInterface.State || (EmulationServiceInterface.State = {}));
})(EmulationServiceInterface || (EmulationServiceInterface = {}));
exports.default = EmulationServiceInterface;

},{}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DigitalJoystick_1 = require("../../../../machine/io/DigitalJoystick");
var ControlPanel_1 = require("../../../../machine/stella/ControlPanel");
var Paddle_1 = require("../../../../machine/io/Paddle");
var messages_1 = require("./messages");
var ControlProxy = (function () {
    function ControlProxy(_rpc) {
        this._rpc = _rpc;
        this._joysticks = new Array(2);
        this._paddles = new Array(4);
        this._controlPanel = new ControlPanel_1.default();
        for (var i = 0; i < 2; i++) {
            this._joysticks[i] = new DigitalJoystick_1.default();
        }
        for (var i = 0; i < 4; i++) {
            this._paddles[i] = new Paddle_1.default();
        }
    }
    ControlProxy.prototype.sendUpdate = function () {
        this._rpc.signal(messages_1.SIGNAL_TYPE.controlStateUpdate, {
            joystickState: this._joysticks.map(ControlProxy._joystickState),
            paddleState: this._paddles.map(ControlProxy._paddleState),
            controlPanelState: ControlProxy._controlPanelState(this._controlPanel)
        });
    };
    ControlProxy.prototype.getJoystick = function (i) {
        if (i < 0 || i > 1) {
            throw new Error("invalid joystick index " + i);
        }
        return this._joysticks[i];
    };
    ControlProxy.prototype.getControlPanel = function () {
        return this._controlPanel;
    };
    ControlProxy.prototype.getPaddle = function (i) {
        if (i < 0 || i > 3) {
            throw new Error("invalid paddle index " + i);
        }
        return this._paddles[i];
    };
    ControlProxy._joystickState = function (joystick) {
        return {
            up: joystick.getUp().read(),
            down: joystick.getDown().read(),
            left: joystick.getLeft().read(),
            right: joystick.getRight().read(),
            fire: joystick.getFire().read()
        };
    };
    ControlProxy._paddleState = function (paddle) {
        return {
            value: paddle.getValue(),
            fire: paddle.getFire().read()
        };
    };
    ControlProxy._controlPanelState = function (controlPanel) {
        return {
            difficulty0: controlPanel.getDifficultySwitchP0().read(),
            difficulty1: controlPanel.getDifficultySwitchP1().read(),
            select: controlPanel.getSelectSwitch().read(),
            reset: controlPanel.getResetButton().read(),
            color: controlPanel.getColorSwitch().read()
        };
    };
    return ControlProxy;
}());
exports.default = ControlProxy;

},{"../../../../machine/io/DigitalJoystick":9,"../../../../machine/io/Paddle":10,"../../../../machine/stella/ControlPanel":13,"./messages":45}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EmulationContext = (function () {
    function EmulationContext(_videoProxy, _controlProxy, _waveformChannels, _pcmChannel) {
        this._videoProxy = _videoProxy;
        this._controlProxy = _controlProxy;
        this._waveformChannels = _waveformChannels;
        this._pcmChannel = _pcmChannel;
        this._config = null;
        if (this._waveformChannels.length !== 2) {
            throw new Error("invalid channel count " + this._waveformChannels.length);
        }
    }
    EmulationContext.prototype.setConfig = function (config) {
        this._config = config;
    };
    EmulationContext.prototype.getConfig = function () {
        return this._config;
    };
    EmulationContext.prototype.getVideo = function () {
        return this._videoProxy;
    };
    EmulationContext.prototype.getJoystick = function (i) {
        return this._controlProxy.getJoystick(i);
    };
    EmulationContext.prototype.getControlPanel = function () {
        return this._controlProxy.getControlPanel();
    };
    EmulationContext.prototype.getPaddle = function (i) {
        return this._controlProxy.getPaddle(i);
    };
    EmulationContext.prototype.getWaveformChannels = function () {
        return this._waveformChannels;
    };
    EmulationContext.prototype.getPCMChannel = function () {
        return this._pcmChannel;
    };
    EmulationContext.prototype.getVideoProxy = function () {
        return this._videoProxy;
    };
    return EmulationContext;
}());
exports.default = EmulationContext;

},{}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var worker_rpc_1 = require("worker-rpc");
var EmulationServiceInterface_1 = require("../EmulationServiceInterface");
var EmulationContext_1 = require("./EmulationContext");
var VideoProxy_1 = require("./VideoProxy");
var ControlProxy_1 = require("./ControlProxy");
var WaveformAudioProxy_1 = require("./WaveformAudioProxy");
var PCMAudioProxy_1 = require("./PCMAudioProxy");
var async_mutex_1 = require("async-mutex");
var messages_1 = require("./messages");
var CONTROL_PROXY_UPDATE_INTERVAL = 25;
var EmulationService = (function () {
    function EmulationService(_stellaWorkerUri, _videoWorkerUri) {
        this._stellaWorkerUri = _stellaWorkerUri;
        this._videoWorkerUri = _videoWorkerUri;
        this.stateChanged = new microevent_ts_1.Event();
        this.frequencyUpdate = new microevent_ts_1.Event();
        this._rateLimitEnforced = true;
        this._mutex = new async_mutex_1.Mutex();
        this._worker = null;
        this._rpc = null;
        this._state = EmulationServiceInterface_1.default.State.stopped;
        this._lastError = null;
        this._emulationContext = null;
        this._frequency = 0;
        this._waveformChannels = new Array(2);
        this._pcmChannel = null;
        this._controlProxy = null;
        this._controlProxyUpdateHandle = null;
        this._proxyState = 0;
        this._saveConfig = null;
    }
    EmulationService.prototype.init = function () {
        var _this = this;
        this._worker = new Worker(this._stellaWorkerUri);
        this._rpc = new worker_rpc_1.RpcProvider(function (message, transfer) { return _this._worker.postMessage(message, transfer); });
        this._pcmChannel = new PCMAudioProxy_1.default(0, this._rpc).init();
        for (var i = 0; i < 2; i++) {
            this._waveformChannels[i] = new WaveformAudioProxy_1.default(i, this._rpc).init();
        }
        var videoProxy = new VideoProxy_1.default(this._rpc), controlProxy = new ControlProxy_1.default(this._rpc);
        videoProxy.init();
        this._emulationContext = new EmulationContext_1.default(videoProxy, controlProxy, this._waveformChannels, this._pcmChannel);
        this._worker.onmessage = function (messageEvent) { return _this._rpc.dispatch(messageEvent.data); };
        this._rpc
            .registerSignalHandler(messages_1.SIGNAL_TYPE.emulationFrequencyUpdate, this._onFrequencyUpdate.bind(this))
            .registerSignalHandler(messages_1.SIGNAL_TYPE.emulationError, this._onEmulationError.bind(this));
        this._controlProxy = controlProxy;
        return this._startVideoProcessingPipeline().then(function () { return _this.setRateLimit(_this._rateLimitEnforced); });
    };
    EmulationService.prototype.start = function (buffer, config, cartridgeType, videoProcessing) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.stop()];
                    case 1:
                        _a.sent();
                        return [2, this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var state;
                                return tslib_1.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4, this._rpc.rpc(messages_1.RPC_TYPE.emulationStart, {
                                                buffer: buffer,
                                                config: config,
                                                cartridgeType: cartridgeType,
                                                videoProcessing: videoProcessing
                                            })];
                                        case 1:
                                            state = _a.sent();
                                            if (!(state === EmulationServiceInterface_1.default.State.paused)) return [3, 3];
                                            this._saveConfig = config;
                                            this._emulationContext.setConfig(config);
                                            return [4, this._startProxies(config)];
                                        case 2:
                                            _a.sent();
                                            return [3, 4];
                                        case 3:
                                            this._saveConfig = null;
                                            _a.label = 4;
                                        case 4: return [2, this._applyState(state)];
                                    }
                                });
                            }); })];
                }
            });
        });
    };
    EmulationService.prototype.pause = function () {
        var _this = this;
        return this._mutex.runExclusive(function () {
            return _this._rpc.rpc(messages_1.RPC_TYPE.emulationPause).then(function (state) {
                _this._pauseProxies();
                return _this._applyState(state);
            });
        });
    };
    EmulationService.prototype.stop = function () {
        var _this = this;
        return this._mutex.runExclusive(function () {
            return _this._rpc.rpc(messages_1.RPC_TYPE.emulationStop).then(function (state) {
                _this._stopProxies();
                return _this._applyState(state);
            });
        });
    };
    EmulationService.prototype.reset = function () {
        var _this = this;
        return this._mutex.runExclusive(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var state;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._rpc.rpc(messages_1.RPC_TYPE.emulationReset)];
                    case 1:
                        state = _a.sent();
                        if (!(this._state === EmulationServiceInterface_1.default.State.error &&
                            (state === EmulationServiceInterface_1.default.State.running ||
                                state === EmulationServiceInterface_1.default.State.paused) &&
                            this._saveConfig)) return [3, 3];
                        return [4, this._startProxies(this._saveConfig)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2, this._applyState(state)];
                }
            });
        }); });
    };
    EmulationService.prototype.resume = function () {
        var _this = this;
        return this._mutex.runExclusive(function () {
            return _this._rpc.rpc(messages_1.RPC_TYPE.emulationResume).then(function (state) {
                _this._resumeProxies();
                return _this._applyState(state);
            });
        });
    };
    EmulationService.prototype.setRateLimit = function (enforce) {
        this._rateLimitEnforced = enforce;
        return this._rpc.rpc(messages_1.RPC_TYPE.emulationSetRateLimit, enforce);
    };
    EmulationService.prototype.getFrequency = function () {
        return this._frequency;
    };
    EmulationService.prototype.getRateLimit = function () {
        return this._rateLimitEnforced;
    };
    EmulationService.prototype.getState = function () {
        return this._state;
    };
    EmulationService.prototype.getLastError = function () {
        return this._lastError;
    };
    EmulationService.prototype.getEmulationContext = function () {
        switch (this._state) {
            case EmulationServiceInterface_1.default.State.running:
            case EmulationServiceInterface_1.default.State.paused:
                return this._emulationContext;
            default:
                return null;
        }
    };
    EmulationService.prototype._fetchLastError = function () {
        return this._rpc
            .rpc(messages_1.RPC_TYPE.emulationFetchLastError)
            .then(function (message) { return (message ? new Error(message) : null); });
    };
    EmulationService.prototype._applyState = function (state) {
        var _this = this;
        if (state === EmulationServiceInterface_1.default.State.error) {
            return this._fetchLastError().then(function (error) {
                _this._state = state;
                _this._lastError = error;
                _this._stopProxies();
                _this.stateChanged.dispatch(state);
                return state;
            });
        }
        else {
            this._state = state;
            this.stateChanged.dispatch(state);
            return state;
        }
    };
    EmulationService.prototype._onFrequencyUpdate = function (message) {
        this._frequency = message;
        this.frequencyUpdate.dispatch(this._frequency);
    };
    EmulationService.prototype._onEmulationError = function (message) {
        this._lastError = new Error(message || '');
        this._stopProxies();
        this._state = EmulationServiceInterface_1.default.State.error;
        this.stateChanged.dispatch(this._state);
    };
    EmulationService.prototype._startProxies = function (config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var i;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._emulationContext.getVideoProxy().start()];
                    case 1:
                        _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < this._waveformChannels.length)) return [3, 5];
                        return [4, this._waveformChannels[i].start(config)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3, 2];
                    case 5: return [4, this._pcmChannel.start()];
                    case 6:
                        _a.sent();
                        this._startControlUpdates();
                        this._proxyState = 1;
                        return [2];
                }
            });
        });
    };
    EmulationService.prototype._stopProxies = function () {
        if (this._proxyState === 0) {
            return;
        }
        this._emulationContext.getVideoProxy().stop();
        this._pcmChannel.stop();
        this._stopControlUpdates();
        this._proxyState = 0;
    };
    EmulationService.prototype._pauseProxies = function () {
        if (this._proxyState !== 1) {
            return;
        }
        this._stopControlUpdates();
        this._proxyState = 2;
    };
    EmulationService.prototype._resumeProxies = function () {
        if (this._proxyState !== 2) {
            return;
        }
        this._startControlUpdates();
        this._proxyState = 1;
    };
    EmulationService.prototype._startControlUpdates = function () {
        var _this = this;
        if (this._controlProxyUpdateHandle === null) {
            this._controlProxyUpdateHandle = setInterval(function () { return _this._controlProxy.sendUpdate(); }, CONTROL_PROXY_UPDATE_INTERVAL);
        }
    };
    EmulationService.prototype._stopControlUpdates = function () {
        if (this._controlProxyUpdateHandle !== null) {
            clearInterval(this._controlProxyUpdateHandle);
            this._controlProxyUpdateHandle = null;
        }
    };
    EmulationService.prototype._startVideoProcessingPipeline = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var channel, worker_1, rpc_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        channel = null;
                        if (!this._videoWorkerUri) return [3, 2];
                        channel = new MessageChannel();
                        worker_1 = new Worker(this._videoWorkerUri), rpc_1 = new worker_rpc_1.RpcProvider(function (payload, transfer) { return worker_1.postMessage(payload, transfer); });
                        worker_1.onmessage = function (e) { return rpc_1.dispatch(e.data); };
                        return [4, rpc_1.rpc('/use-port', channel.port1, [channel.port1])];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4, this._rpc.rpc(messages_1.RPC_TYPE.setup, {
                            videoProcessorPort: channel && channel.port2
                        }, channel ? [channel.port2] : [])];
                    case 3:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    return EmulationService;
}());
exports.default = EmulationService;

},{"../EmulationServiceInterface":38,"./ControlProxy":39,"./EmulationContext":40,"./PCMAudioProxy":42,"./VideoProxy":43,"./WaveformAudioProxy":44,"./messages":45,"async-mutex":2,"microevent.ts":4,"tslib":6,"worker-rpc":8}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var Pool_1 = require("../../../../tools/pool/Pool");
var messages_1 = require("./messages");
var PCMAudioProxy = (function () {
    function PCMAudioProxy(_index, _rpc) {
        this._index = _index;
        this._rpc = _rpc;
        this.newFrame = new microevent_ts_1.Event();
        this.togglePause = new microevent_ts_1.Event();
        this._sampleRate = 0;
        this._frameSize = 0;
        this._paused = false;
        this._framePool = new Pool_1.default(function () { return null; });
        this._frameMap = new WeakMap();
        this._enabled = false;
        this._signalReturnFrame = '';
        this._framePool.event.release.addHandler(PCMAudioProxy._onReleaseFragment, this);
        this._signalReturnFrame = messages_1.SIGNAL_TYPE.pcmAudioReturnFrame(this._index);
    }
    PCMAudioProxy.prototype.init = function () {
        this._rpc
            .registerSignalHandler(messages_1.SIGNAL_TYPE.pcmAudioNewFrame(this._index), this._onNewFrame.bind(this))
            .registerSignalHandler(messages_1.SIGNAL_TYPE.pcmAudioTogglePause(this._index), this._onTogglePause.bind(this));
        return this;
    };
    PCMAudioProxy.prototype.start = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var params;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._enabled) {
                            return [2];
                        }
                        return [4, this._rpc.rpc(messages_1.RPC_TYPE.getPCMAudioParameters(this._index))];
                    case 1:
                        params = _a.sent();
                        this._sampleRate = params.sampleRate;
                        this._frameSize = params.frameSize;
                        this._paused = params.paused;
                        this._enabled = true;
                        return [2];
                }
            });
        });
    };
    PCMAudioProxy.prototype.stop = function () {
        this._enabled = false;
    };
    PCMAudioProxy.prototype.isPaused = function () {
        return this._paused;
    };
    PCMAudioProxy.prototype.getSampleRate = function () {
        return this._sampleRate;
    };
    PCMAudioProxy.prototype.getFrameSize = function () {
        return this._frameSize;
    };
    PCMAudioProxy._onReleaseFragment = function (frame, self) {
        if (!self._frameMap.has(frame)) {
            return;
        }
        self._rpc.signal(self._signalReturnFrame, {
            id: self._frameMap.get(frame),
            buffer: frame.buffer
        }, [frame.buffer]);
    };
    PCMAudioProxy.prototype._onNewFrame = function (msg) {
        if (!this._enabled) {
            return;
        }
        var frame = this._framePool.get(), data = new Float32Array(msg.buffer);
        frame.adopt(data);
        this._frameMap.set(data, msg.id);
        this.newFrame.dispatch(frame);
    };
    PCMAudioProxy.prototype._onTogglePause = function (msg) {
        if (msg.paused === this._paused) {
            return;
        }
        this._paused = msg.paused;
        this.togglePause.dispatch(this._paused);
    };
    return PCMAudioProxy;
}());
exports.default = PCMAudioProxy;

},{"../../../../tools/pool/Pool":19,"./messages":45,"microevent.ts":4,"tslib":6}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var messages_1 = require("./messages");
var VideoProxy = (function () {
    function VideoProxy(_rpc) {
        this._rpc = _rpc;
        this.newFrame = new microevent_ts_1.Event();
        this._active = false;
        this._width = 0;
        this._height = 0;
        this._ids = null;
    }
    VideoProxy.prototype.init = function () {
        this._rpc.registerSignalHandler(messages_1.SIGNAL_TYPE.videoNewFrame, this._onNewFrame.bind(this));
    };
    VideoProxy.prototype.start = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var videoParameters;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._active) {
                            this.stop();
                        }
                        return [4, this._rpc.rpc(messages_1.RPC_TYPE.getVideoParameters)];
                    case 1:
                        videoParameters = _a.sent();
                        this._active = true;
                        this._width = videoParameters.width;
                        this._height = videoParameters.height;
                        this._ids = new Set();
                        return [2];
                }
            });
        });
    };
    VideoProxy.prototype.stop = function () {
        this._active = false;
        this._ids = null;
    };
    VideoProxy.prototype.getWidth = function () {
        return this._width;
    };
    VideoProxy.prototype.getHeight = function () {
        return this._height;
    };
    VideoProxy.prototype._onNewFrame = function (message) {
        var _this = this;
        if (!this._active) {
            console.warn('video proxy deactivated: ignoring frame');
            return;
        }
        if (this._width !== message.width || this._height !== message.height) {
            console.warn("surface dimensions do not match; ignoring frame");
            return;
        }
        this._ids.add(message.id);
        var imageData = new ImageData(new Uint8ClampedArray(message.buffer), message.width, message.height);
        this.newFrame.dispatch({
            get: function () { return imageData; },
            release: function () {
                if (_this._active && _this._ids.has(message.id)) {
                    _this._rpc.signal(messages_1.SIGNAL_TYPE.videoReturnSurface, {
                        id: message.id,
                        buffer: message.buffer
                    }, [message.buffer]);
                }
            },
            dispose: function () { return undefined; },
            adopt: function () {
                throw new Error('adopt is not implemented');
            }
        });
    };
    return VideoProxy;
}());
exports.default = VideoProxy;

},{"./messages":45,"microevent.ts":4,"tslib":6}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var ToneGenerator_1 = require("../../../../machine/stella/tia/ToneGenerator");
var messages_1 = require("./messages");
var WaveformAudioProxy = (function () {
    function WaveformAudioProxy(_index, _rpc) {
        this._index = _index;
        this._rpc = _rpc;
        this.bufferChanged = new microevent_ts_1.Event();
        this.volumeChanged = new microevent_ts_1.Event();
        this.stop = new microevent_ts_1.Event();
        this._toneGenerator = new ToneGenerator_1.default();
        this._volume = 0;
    }
    WaveformAudioProxy.prototype.init = function () {
        this._rpc
            .registerSignalHandler(messages_1.SIGNAL_TYPE.waveformAudioBufferChange, this._onBufferChangeSignal.bind(this))
            .registerSignalHandler(messages_1.SIGNAL_TYPE.waveformAudioVolumeChange, this._onVolumeChangeSignal.bind(this))
            .registerSignalHandler(messages_1.SIGNAL_TYPE.audioStop, this._onStopSignal.bind(this));
        return this;
    };
    WaveformAudioProxy.prototype.start = function (config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var parameters;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this._rpc.rpc(messages_1.RPC_TYPE.getWaveformAudioParameters(this._index))];
                    case 1:
                        parameters = _a.sent();
                        this._toneGenerator.setConfig(config);
                        this.setVolume(parameters.volume);
                        return [2];
                }
            });
        });
    };
    WaveformAudioProxy.prototype.setVolume = function (value) {
        this._volume = value;
        return this;
    };
    WaveformAudioProxy.prototype.getVolume = function () {
        return this._volume;
    };
    WaveformAudioProxy.prototype.getBuffer = function (key) {
        return this._toneGenerator.getBuffer(key);
    };
    WaveformAudioProxy.prototype._onVolumeChangeSignal = function (message) {
        if (message.index === this._index) {
            this._volume = message.value;
            this.volumeChanged.dispatch(this._volume);
        }
    };
    WaveformAudioProxy.prototype._onBufferChangeSignal = function (message) {
        if (message.index === this._index) {
            this.bufferChanged.dispatch(message.key);
        }
    };
    WaveformAudioProxy.prototype._onStopSignal = function (index) {
        if (index === this._index) {
            this.stop.dispatch(undefined);
        }
    };
    return WaveformAudioProxy;
}());
exports.default = WaveformAudioProxy;

},{"../../../../machine/stella/tia/ToneGenerator":15,"./messages":45,"microevent.ts":4,"tslib":6}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPC_TYPE = {
    emulationPause: 'emulation/pause',
    emulationReset: 'emulation/reset',
    emulationResume: 'emulation/resume',
    emulationSetRateLimit: 'emulation/setRateLimit',
    emulationStart: 'emulation/start',
    emulationStop: 'emulation/stop',
    emulationFetchLastError: 'emulation/fetchLastError',
    getVideoParameters: 'video/getParameters',
    getWaveformAudioParameters: function (index) { return "audio/waveform/getParameters/" + index; },
    getPCMAudioParameters: function (index) { return "audio/pcm/getParameters/" + index; },
    setup: '/setup'
};
Object.freeze(exports.RPC_TYPE);
exports.SIGNAL_TYPE = {
    emulationError: 'emulation/error',
    emulationFrequencyUpdate: 'emulation/frequencyUpdate',
    videoNewFrame: 'video/newFrame',
    videoReturnSurface: 'video/returnSurface',
    controlStateUpdate: 'control/stateUpdate',
    waveformAudioVolumeChange: 'audio/waveform/volumeChange',
    waveformAudioBufferChange: 'audio/waveform/bufferChange',
    pcmAudioNewFrame: function (index) { return "audio/pcm/newFrame/" + index; },
    pcmAudioTogglePause: function (index) { return "audio/pcm/togglePause/" + index; },
    pcmAudioReturnFrame: function (index) { return "audio/pcm/returnFrame/" + index; },
    audioStop: 'audio/stop'
};
Object.freeze(exports.SIGNAL_TYPE);

},{}]},{},[34])(34)
});
//# sourceMappingURL=stellerator_embedded.js.map
