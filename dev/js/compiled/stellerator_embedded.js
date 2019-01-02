(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.$6502 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
* v3.3.3 - 2018-09-04
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
				elem[request](keyboardAllowed ? Element.ALLOW_KEYBOARD_INPUT : {});
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
var __importStar;
var __importDefault;
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
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
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
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result["default"] = mod;
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
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
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
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
var Instruction_1 = require("./Instruction");
var CpuInterface_1 = require("./CpuInterface");
var ops = require("./ops");
function opBoot(state, bus) {
    state.p = bus.readWord(0xfffc);
}
exports.opBoot = opBoot;
function dispatchInterrupt(state, bus, vector) {
    var nextOpAddr = state.p;
    if (state.nmi) {
        vector = 0xfffa;
    }
    state.nmi = state.irq = false;
    bus.write(state.s + 0x0100, (nextOpAddr >>> 8) & 0xff);
    state.s = (state.s + 0xff) & 0xff;
    bus.write(state.s + 0x0100, nextOpAddr & 0xff);
    state.s = (state.s + 0xff) & 0xff;
    bus.write(state.s + 0x0100, state.flags & ~16);
    state.s = (state.s + 0xff) & 0xff;
    state.flags |= 4;
    state.p = bus.readWord(vector);
}
function opIrq(state, bus) {
    dispatchInterrupt(state, bus, 0xfffe);
}
exports.opIrq = opIrq;
function opNmi(state, bus) {
    dispatchInterrupt(state, bus, 0xfffa);
}
exports.opNmi = opNmi;
var BatchedAccessCpu = (function () {
    function BatchedAccessCpu(_bus, _rng) {
        this._bus = _bus;
        this._rng = _rng;
        this.executionState = 0;
        this.state = new CpuInterface_1.default.State();
        this._opCycles = 0;
        this._instructionCallback = null;
        this._invalidInstructionCallback = null;
        this._interruptPending = false;
        this._nmiPending = false;
        this._interuptCheck = 0;
        this._halted = false;
        this._operand = 0;
        this._lastInstructionPointer = 0;
        this._currentAddressingMode = 12;
        this._dereference = false;
        this.reset();
    }
    BatchedAccessCpu.prototype.setInterrupt = function (irq) {
        this._interruptPending = irq;
        return this;
    };
    BatchedAccessCpu.prototype.isInterrupt = function () {
        return this._interruptPending;
    };
    BatchedAccessCpu.prototype.nmi = function () {
        this._nmiPending = true;
        return this;
    };
    BatchedAccessCpu.prototype.halt = function () {
        this._halted = true;
        return this;
    };
    BatchedAccessCpu.prototype.resume = function () {
        this._halted = false;
        return this;
    };
    BatchedAccessCpu.prototype.isHalt = function () {
        return this._halted;
    };
    BatchedAccessCpu.prototype.setInvalidInstructionCallback = function (callback) {
        this._invalidInstructionCallback = callback;
        return this;
    };
    BatchedAccessCpu.prototype.getInvalidInstructionCallback = function () {
        return this._invalidInstructionCallback;
    };
    BatchedAccessCpu.prototype.getLastInstructionPointer = function () {
        return this._lastInstructionPointer;
    };
    BatchedAccessCpu.prototype.reset = function () {
        this.state.a = this._rng ? this._rng.int(0xff) : 0;
        this.state.x = this._rng ? this._rng.int(0xff) : 0;
        this.state.y = this._rng ? this._rng.int(0xff) : 0;
        this.state.s = 0xfd;
        this.state.p = this._rng ? this._rng.int(0xffff) : 0;
        this.state.flags =
            (this._rng ? this._rng.int(0xff) : 0) | 4 | 32 | 16;
        this.state.irq = false;
        this.state.nmi = false;
        this.executionState = 0;
        this._opCycles = 7;
        this._interruptPending = false;
        this._nmiPending = false;
        this._instructionCallback = opBoot;
        return this;
    };
    BatchedAccessCpu.prototype.cycle = function () {
        if (this._halted) {
            return this;
        }
        switch (this.executionState) {
            case 0:
            case 2:
                if (--this._opCycles === 0) {
                    if (this._dereference) {
                        this._operand = this._bus.read(this._operand);
                    }
                    if (this._interuptCheck === 1) {
                        this._checkForInterrupts();
                    }
                    this._instructionCallback(this.state, this._bus, this._operand, this._currentAddressingMode);
                    this.executionState = 1;
                    if (this._interuptCheck === 0) {
                        this._checkForInterrupts();
                    }
                }
                break;
            case 1:
                if (this.state.nmi) {
                    this._instructionCallback = opNmi;
                    this._opCycles = 6;
                    this.state.nmi = this.state.irq = false;
                    this._interuptCheck = 1;
                    this.executionState = 2;
                    return this;
                }
                if (this.state.irq) {
                    this._instructionCallback = opIrq;
                    this._opCycles = 6;
                    this.state.nmi = this.state.irq = false;
                    this._interuptCheck = 1;
                    this.executionState = 2;
                    return this;
                }
                this._fetch();
                break;
        }
        return this;
    };
    BatchedAccessCpu.prototype._fetch = function () {
        var instruction = Instruction_1.default.opcodes[this._bus.read(this.state.p)];
        var addressingMode = instruction.addressingMode, dereference = false, slowIndexedAccess = false;
        this._lastInstructionPointer = this.state.p;
        this._currentAddressingMode = addressingMode;
        this._interuptCheck = 0;
        switch (instruction.operation) {
            case 0:
                this._opCycles = 0;
                this._instructionCallback = ops.opAdc;
                dereference = true;
                break;
            case 1:
                this._opCycles = 0;
                this._instructionCallback = ops.opAnd;
                dereference = true;
                break;
            case 2:
                if (addressingMode === 0) {
                    this._opCycles = 1;
                    this._instructionCallback = ops.opAslAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = ops.opAslMem;
                    slowIndexedAccess = true;
                }
                break;
            case 3:
                if (this.state.flags & 1) {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                break;
            case 4:
                if (this.state.flags & 1) {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                break;
            case 5:
                if (this.state.flags & 2) {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                break;
            case 6:
                this._opCycles = 0;
                this._instructionCallback = ops.opBit;
                dereference = true;
                break;
            case 7:
                if (this.state.flags & 128) {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                break;
            case 8:
                if (this.state.flags & 2) {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                break;
            case 9:
                if (this.state.flags & 128) {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                break;
            case 11:
                if (this.state.flags & 64) {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                break;
            case 12:
                if (this.state.flags & 64) {
                    this._instructionCallback = ops.opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0;
                    this._instructionCallback = ops.opNop;
                    this.state.p = (this.state.p + 1) & 0xffff;
                    this._opCycles = 1;
                }
                break;
            case 10:
                this._opCycles = 6;
                this._instructionCallback = ops.opBrk;
                this._interuptCheck = 1;
                break;
            case 13:
                this._opCycles = 1;
                this._instructionCallback = ops.opClc;
                break;
            case 14:
                this._opCycles = 1;
                this._instructionCallback = ops.opCld;
                break;
            case 15:
                this._opCycles = 1;
                this._instructionCallback = ops.opCli;
                this._interuptCheck = 1;
                break;
            case 16:
                this._opCycles = 1;
                this._instructionCallback = ops.opClv;
                break;
            case 17:
                this._opCycles = 0;
                this._instructionCallback = ops.opCmp;
                dereference = true;
                break;
            case 18:
                this._opCycles = 0;
                this._instructionCallback = ops.opCpx;
                dereference = true;
                break;
            case 19:
                this._opCycles = 0;
                this._instructionCallback = ops.opCpy;
                dereference = true;
                break;
            case 20:
                this._opCycles = 3;
                this._instructionCallback = ops.opDec;
                slowIndexedAccess = true;
                break;
            case 21:
                this._opCycles = 1;
                this._instructionCallback = ops.opDex;
                break;
            case 22:
                this._opCycles = 1;
                this._instructionCallback = ops.opDey;
                break;
            case 23:
                this._opCycles = 0;
                this._instructionCallback = ops.opEor;
                dereference = true;
                break;
            case 24:
                this._opCycles = 3;
                this._instructionCallback = ops.opInc;
                slowIndexedAccess = true;
                break;
            case 25:
                this._opCycles = 1;
                this._instructionCallback = ops.opInx;
                break;
            case 26:
                this._opCycles = 1;
                this._instructionCallback = ops.opIny;
                break;
            case 27:
                this._opCycles = 0;
                this._instructionCallback = ops.opJmp;
                break;
            case 28:
                this._opCycles = 5;
                this._instructionCallback = ops.opJsr;
                break;
            case 29:
                this._opCycles = addressingMode === 1 ? 0 : 1;
                this._instructionCallback = ops.opLda;
                break;
            case 30:
                this._opCycles = addressingMode === 1 ? 0 : 1;
                this._instructionCallback = ops.opLdx;
                break;
            case 31:
                this._opCycles = addressingMode === 1 ? 0 : 1;
                this._instructionCallback = ops.opLdy;
                break;
            case 32:
                if (addressingMode === 0) {
                    this._opCycles = 1;
                    this._instructionCallback = ops.opLsrAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = ops.opLsrMem;
                    slowIndexedAccess = true;
                }
                break;
            case 33:
                this._opCycles = 1;
                this._instructionCallback = ops.opNop;
                break;
            case 56:
            case 57:
                this._opCycles = 0;
                dereference = true;
                this._instructionCallback = ops.opNop;
                break;
            case 34:
                this._opCycles = 0;
                this._instructionCallback = ops.opOra;
                dereference = true;
                break;
            case 36:
                this._opCycles = 2;
                this._instructionCallback = ops.opPhp;
                break;
            case 35:
                this._opCycles = 2;
                this._instructionCallback = ops.opPha;
                break;
            case 37:
                this._opCycles = 3;
                this._instructionCallback = ops.opPla;
                break;
            case 38:
                this._opCycles = 3;
                this._instructionCallback = ops.opPlp;
                this._interuptCheck = 1;
                break;
            case 39:
                if (addressingMode === 0) {
                    this._opCycles = 1;
                    this._instructionCallback = ops.opRolAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = ops.opRolMem;
                    slowIndexedAccess = true;
                }
                break;
            case 40:
                if (addressingMode === 0) {
                    this._opCycles = 1;
                    this._instructionCallback = ops.opRorAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = ops.opRorMem;
                    slowIndexedAccess = true;
                }
                break;
            case 41:
                this._opCycles = 5;
                this._instructionCallback = ops.opRti;
                break;
            case 42:
                this._opCycles = 5;
                this._instructionCallback = ops.opRts;
                break;
            case 43:
                this._opCycles = 0;
                this._instructionCallback = ops.opSbc;
                dereference = true;
                break;
            case 44:
                this._opCycles = 1;
                this._instructionCallback = ops.opSec;
                break;
            case 45:
                this._opCycles = 1;
                this._instructionCallback = ops.opSed;
                break;
            case 46:
                this._opCycles = 1;
                this._instructionCallback = ops.opSei;
                this._interuptCheck = 1;
                break;
            case 47:
                this._opCycles = 1;
                this._instructionCallback = ops.opSta;
                slowIndexedAccess = true;
                break;
            case 48:
                this._opCycles = 1;
                this._instructionCallback = ops.opStx;
                slowIndexedAccess = true;
                break;
            case 49:
                this._opCycles = 1;
                this._instructionCallback = ops.opSty;
                slowIndexedAccess = true;
                break;
            case 50:
                this._opCycles = 1;
                this._instructionCallback = ops.opTax;
                break;
            case 51:
                this._opCycles = 1;
                this._instructionCallback = ops.opTay;
                break;
            case 52:
                this._opCycles = 1;
                this._instructionCallback = ops.opTsx;
                break;
            case 53:
                this._opCycles = 1;
                this._instructionCallback = ops.opTxa;
                break;
            case 54:
                this._opCycles = 1;
                this._instructionCallback = ops.opTxs;
                break;
            case 55:
                this._opCycles = 1;
                this._instructionCallback = ops.opTya;
                break;
            case 62:
                this._opCycles = 0;
                this._instructionCallback = ops.opArr;
                break;
            case 58:
                this._opCycles = 0;
                this._instructionCallback = ops.opAlr;
                break;
            case 59:
                this._opCycles = 0;
                this._instructionCallback = ops.opAxs;
                break;
            case 60:
                this._opCycles = 3;
                this._instructionCallback = ops.opDcp;
                slowIndexedAccess = true;
                break;
            case 61:
                this._opCycles = 0;
                this._instructionCallback = ops.opLax;
                dereference = true;
                break;
            case 63:
                this._opCycles = 3;
                this._instructionCallback = ops.opSlo;
                slowIndexedAccess = true;
                dereference = false;
                break;
            case 64:
                this._opCycles = 1;
                this._instructionCallback = ops.opAax;
                break;
            case 65:
                this._opCycles = 0;
                this._instructionCallback = ops.opLar;
                dereference = true;
                break;
            case 66:
                this._opCycles = 3;
                this._instructionCallback = ops.opIsc;
                slowIndexedAccess = true;
                break;
            case 67:
                this._opCycles = 0;
                this._instructionCallback = ops.opAac;
                break;
            case 68:
                this._opCycles = 0;
                this._instructionCallback = ops.opAtx;
                break;
            case 69:
                this._opCycles = 3;
                dereference = false;
                slowIndexedAccess = true;
                this._instructionCallback = ops.opRra;
                break;
            case 70:
                this._opCycles = 3;
                dereference = false;
                slowIndexedAccess = true;
                this._instructionCallback = ops.opRla;
                break;
            default:
                if (this._invalidInstructionCallback) {
                    this._invalidInstructionCallback(this);
                }
                return;
        }
        this.state.p = (this.state.p + 1) & 0xffff;
        var value, base;
        switch (addressingMode) {
            case 1:
                this._operand = this._bus.read(this.state.p);
                dereference = false;
                this.state.p = (this.state.p + 1) & 0xffff;
                this._opCycles++;
                break;
            case 2:
                this._operand = this._bus.read(this.state.p);
                this.state.p = (this.state.p + 1) & 0xffff;
                this._opCycles++;
                break;
            case 3:
                this._operand = this._bus.readWord(this.state.p);
                this.state.p = (this.state.p + 2) & 0xffff;
                this._opCycles += 2;
                break;
            case 4:
                value = this._bus.readWord(this.state.p);
                if ((value & 0xff) === 0xff) {
                    this._operand = this._bus.read(value) + (this._bus.read(value & 0xff00) << 8);
                }
                else {
                    this._operand = this._bus.readWord(value);
                }
                this.state.p = (this.state.p + 2) & 0xffff;
                this._opCycles += 4;
                break;
            case 5:
                value = this._bus.read(this.state.p);
                value = value & 0x80 ? -(~(value - 1) & 0xff) : value;
                this._operand = (this.state.p + value + 0x10001) & 0xffff;
                this.state.p = (this.state.p + 1) & 0xffff;
                this._opCycles += (this._operand & 0xff00) !== (this.state.p & 0xff00) ? 3 : 2;
                break;
            case 6:
                base = this._bus.read(this.state.p);
                this._bus.read(base);
                this._operand = (base + this.state.x) & 0xff;
                this.state.p = (this.state.p + 1) & 0xffff;
                this._opCycles += 2;
                break;
            case 7:
                value = this._bus.readWord(this.state.p);
                this._operand = (value + this.state.x) & 0xffff;
                if ((this._operand & 0xff00) !== (value & 0xff00)) {
                    this._bus.read((value & 0xff00) | (this._operand & 0xff));
                }
                this._opCycles += slowIndexedAccess || (this._operand & 0xff00) !== (value & 0xff00) ? 3 : 2;
                this.state.p = (this.state.p + 2) & 0xffff;
                break;
            case 9:
                base = this._bus.read(this.state.p);
                this._bus.read(base);
                this._operand = (base + this.state.y) & 0xff;
                this.state.p = (this.state.p + 1) & 0xffff;
                this._opCycles += 2;
                break;
            case 10:
                value = this._bus.readWord(this.state.p);
                this._operand = (value + this.state.y) & 0xffff;
                if ((this._operand & 0xff00) !== (value & 0xff00)) {
                    this._bus.read((value & 0xff00) | (this._operand & 0xff));
                }
                this._opCycles += slowIndexedAccess || (this._operand & 0xff00) !== (value & 0xff00) ? 3 : 2;
                this.state.p = (this.state.p + 2) & 0xffff;
                break;
            case 8:
                base = this._bus.read(this.state.p);
                this._bus.read(base);
                value = (base + this.state.x) & 0xff;
                if (value === 0xff) {
                    this._operand = this._bus.read(0xff) + (this._bus.read(0x00) << 8);
                }
                else {
                    this._operand = this._bus.readWord(value);
                }
                this._opCycles += 4;
                this.state.p = (this.state.p + 1) & 0xffff;
                break;
            case 11:
                value = this._bus.read(this.state.p);
                if (value === 0xff) {
                    value = this._bus.read(0xff) + (this._bus.read(0x00) << 8);
                }
                else {
                    value = this._bus.readWord(value);
                }
                this._operand = (value + this.state.y) & 0xffff;
                if ((this._operand & 0xff00) !== (value & 0xff00)) {
                    this._bus.read((value & 0xff00) | (this._operand & 0xff));
                }
                this._opCycles += slowIndexedAccess || (value & 0xff00) !== (this._operand & 0xff00) ? 4 : 3;
                this.state.p = (this.state.p + 1) & 0xffff;
                break;
        }
        this._dereference = dereference;
        if (dereference) {
            this._opCycles++;
        }
        this.executionState = 2;
    };
    BatchedAccessCpu.prototype._checkForInterrupts = function () {
        if (this._nmiPending) {
            this.state.irq = false;
            this.state.nmi = true;
            this._nmiPending = false;
        }
        if (this._interruptPending && !this.state.nmi && !(this.state.flags & 4)) {
            this.state.irq = true;
        }
    };
    return BatchedAccessCpu;
}());
exports.default = BatchedAccessCpu;

},{"./CpuInterface":10,"./Instruction":12,"./ops":14}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CpuInterface;
(function (CpuInterface) {
    var State = (function () {
        function State() {
            this.a = 0;
            this.x = 0;
            this.y = 0;
            this.s = 0;
            this.p = 0;
            this.flags = 0;
            this.irq = false;
            this.nmi = false;
        }
        return State;
    }());
    CpuInterface.State = State;
})(CpuInterface || (CpuInterface = {}));
exports.default = CpuInterface;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var StateMachineCpu_1 = require("./StateMachineCpu");
var BatchedAccessCpu_1 = require("./BatchedAccessCpu");
var Factory = (function () {
    function Factory(_type) {
        this._type = _type;
    }
    Factory.prototype.create = function (bus, rng) {
        switch (this._type) {
            case Factory.Type.stateMachine:
                return new StateMachineCpu_1.default(bus, rng);
            case Factory.Type.batchedAccess:
                return new BatchedAccessCpu_1.default(bus, rng);
            default:
                throw new Error('invalid CPU type');
        }
    };
    return Factory;
}());
(function (Factory) {
    var Type;
    (function (Type) {
        Type[Type["stateMachine"] = 0] = "stateMachine";
        Type[Type["batchedAccess"] = 1] = "batchedAccess";
    })(Type = Factory.Type || (Factory.Type = {}));
})(Factory || (Factory = {}));
exports.default = Factory;

},{"./BatchedAccessCpu":9,"./StateMachineCpu":13}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Instruction = (function () {
    function Instruction(operation, addressingMode, effectiveAddressingMode) {
        if (effectiveAddressingMode === void 0) { effectiveAddressingMode = addressingMode; }
        this.operation = operation;
        this.addressingMode = addressingMode;
        this.effectiveAddressingMode = effectiveAddressingMode;
    }
    Instruction.prototype.getSize = function () {
        switch (this.effectiveAddressingMode) {
            case 1:
            case 2:
            case 6:
            case 9:
            case 8:
            case 11:
            case 5:
                return 2;
            case 3:
            case 7:
            case 10:
            case 4:
                return 3;
            default:
                return 1;
        }
    };
    return Instruction;
}());
exports.default = Instruction;
(function (Instruction) {
    var OperationMap;
    (function (OperationMap) {
        OperationMap[OperationMap["adc"] = 0] = "adc";
        OperationMap[OperationMap["and"] = 1] = "and";
        OperationMap[OperationMap["asl"] = 2] = "asl";
        OperationMap[OperationMap["bcc"] = 3] = "bcc";
        OperationMap[OperationMap["bcs"] = 4] = "bcs";
        OperationMap[OperationMap["beq"] = 5] = "beq";
        OperationMap[OperationMap["bit"] = 6] = "bit";
        OperationMap[OperationMap["bmi"] = 7] = "bmi";
        OperationMap[OperationMap["bne"] = 8] = "bne";
        OperationMap[OperationMap["bpl"] = 9] = "bpl";
        OperationMap[OperationMap["brk"] = 10] = "brk";
        OperationMap[OperationMap["bvc"] = 11] = "bvc";
        OperationMap[OperationMap["bvs"] = 12] = "bvs";
        OperationMap[OperationMap["clc"] = 13] = "clc";
        OperationMap[OperationMap["cld"] = 14] = "cld";
        OperationMap[OperationMap["cli"] = 15] = "cli";
        OperationMap[OperationMap["clv"] = 16] = "clv";
        OperationMap[OperationMap["cmp"] = 17] = "cmp";
        OperationMap[OperationMap["cpx"] = 18] = "cpx";
        OperationMap[OperationMap["cpy"] = 19] = "cpy";
        OperationMap[OperationMap["dec"] = 20] = "dec";
        OperationMap[OperationMap["dex"] = 21] = "dex";
        OperationMap[OperationMap["dey"] = 22] = "dey";
        OperationMap[OperationMap["eor"] = 23] = "eor";
        OperationMap[OperationMap["inc"] = 24] = "inc";
        OperationMap[OperationMap["inx"] = 25] = "inx";
        OperationMap[OperationMap["iny"] = 26] = "iny";
        OperationMap[OperationMap["jmp"] = 27] = "jmp";
        OperationMap[OperationMap["jsr"] = 28] = "jsr";
        OperationMap[OperationMap["lda"] = 29] = "lda";
        OperationMap[OperationMap["ldx"] = 30] = "ldx";
        OperationMap[OperationMap["ldy"] = 31] = "ldy";
        OperationMap[OperationMap["lsr"] = 32] = "lsr";
        OperationMap[OperationMap["nop"] = 33] = "nop";
        OperationMap[OperationMap["ora"] = 34] = "ora";
        OperationMap[OperationMap["pha"] = 35] = "pha";
        OperationMap[OperationMap["php"] = 36] = "php";
        OperationMap[OperationMap["pla"] = 37] = "pla";
        OperationMap[OperationMap["plp"] = 38] = "plp";
        OperationMap[OperationMap["rol"] = 39] = "rol";
        OperationMap[OperationMap["ror"] = 40] = "ror";
        OperationMap[OperationMap["rti"] = 41] = "rti";
        OperationMap[OperationMap["rts"] = 42] = "rts";
        OperationMap[OperationMap["sbc"] = 43] = "sbc";
        OperationMap[OperationMap["sec"] = 44] = "sec";
        OperationMap[OperationMap["sed"] = 45] = "sed";
        OperationMap[OperationMap["sei"] = 46] = "sei";
        OperationMap[OperationMap["sta"] = 47] = "sta";
        OperationMap[OperationMap["stx"] = 48] = "stx";
        OperationMap[OperationMap["sty"] = 49] = "sty";
        OperationMap[OperationMap["tax"] = 50] = "tax";
        OperationMap[OperationMap["tay"] = 51] = "tay";
        OperationMap[OperationMap["tsx"] = 52] = "tsx";
        OperationMap[OperationMap["txa"] = 53] = "txa";
        OperationMap[OperationMap["txs"] = 54] = "txs";
        OperationMap[OperationMap["tya"] = 55] = "tya";
        OperationMap[OperationMap["dop"] = 56] = "dop";
        OperationMap[OperationMap["top"] = 57] = "top";
        OperationMap[OperationMap["alr"] = 58] = "alr";
        OperationMap[OperationMap["axs"] = 59] = "axs";
        OperationMap[OperationMap["dcp"] = 60] = "dcp";
        OperationMap[OperationMap["lax"] = 61] = "lax";
        OperationMap[OperationMap["arr"] = 62] = "arr";
        OperationMap[OperationMap["slo"] = 63] = "slo";
        OperationMap[OperationMap["aax"] = 64] = "aax";
        OperationMap[OperationMap["lar"] = 65] = "lar";
        OperationMap[OperationMap["isc"] = 66] = "isc";
        OperationMap[OperationMap["aac"] = 67] = "aac";
        OperationMap[OperationMap["atx"] = 68] = "atx";
        OperationMap[OperationMap["rra"] = 69] = "rra";
        OperationMap[OperationMap["rla"] = 70] = "rla";
        OperationMap[OperationMap["invalid"] = 71] = "invalid";
    })(OperationMap = Instruction.OperationMap || (Instruction.OperationMap = {}));
    Instruction.opcodes = new Array(256);
})(Instruction || (Instruction = {}));
exports.default = Instruction;
(function (Instruction) {
    var __init;
    (function (__init) {
        for (var i = 0; i < 256; i++) {
            Instruction.opcodes[i] = new Instruction(71, 12);
        }
        var operation, addressingMode, opcode;
        for (var i = 0; i < 8; i++) {
            switch (i) {
                case 0:
                    operation = 34;
                    break;
                case 1:
                    operation = 1;
                    break;
                case 2:
                    operation = 23;
                    break;
                case 3:
                    operation = 0;
                    break;
                case 4:
                    operation = 47;
                    break;
                case 5:
                    operation = 29;
                    break;
                case 6:
                    operation = 17;
                    break;
                case 7:
                    operation = 43;
                    break;
            }
            for (var j = 0; j < 8; j++) {
                switch (j) {
                    case 0:
                        addressingMode = 8;
                        break;
                    case 1:
                        addressingMode = 2;
                        break;
                    case 2:
                        addressingMode = 1;
                        break;
                    case 3:
                        addressingMode = 3;
                        break;
                    case 4:
                        addressingMode = 11;
                        break;
                    case 5:
                        addressingMode = 6;
                        break;
                    case 6:
                        addressingMode = 10;
                        break;
                    case 7:
                        addressingMode = 7;
                        break;
                }
                if (operation === 47 && addressingMode === 1) {
                    addressingMode = 12;
                }
                if (operation !== 71 && addressingMode !== 12) {
                    opcode = (i << 5) | (j << 2) | 1;
                    Instruction.opcodes[opcode] = new Instruction(operation, addressingMode);
                }
            }
        }
        function set(_opcode, _operation, _addressingMode, _effectiveAdressingMode) {
            if (Instruction.opcodes[_opcode].operation !== 71) {
                throw new Error('entry for opcode ' + _opcode + ' already exists');
            }
            Instruction.opcodes[_opcode] = new Instruction(_operation, _addressingMode, _effectiveAdressingMode);
        }
        set(0x06, 2, 2);
        set(0x0a, 2, 0);
        set(0x0e, 2, 3);
        set(0x16, 2, 6);
        set(0x1e, 2, 7);
        set(0x26, 39, 2);
        set(0x2a, 39, 0);
        set(0x2e, 39, 3);
        set(0x36, 39, 6);
        set(0x3e, 39, 7);
        set(0x46, 32, 2);
        set(0x4a, 32, 0);
        set(0x4e, 32, 3);
        set(0x56, 32, 6);
        set(0x5e, 32, 7);
        set(0x66, 40, 2);
        set(0x6a, 40, 0);
        set(0x6e, 40, 3);
        set(0x76, 40, 6);
        set(0x7e, 40, 7);
        set(0x86, 48, 2);
        set(0x8e, 48, 3);
        set(0x96, 48, 9);
        set(0xa2, 30, 1);
        set(0xa6, 30, 2);
        set(0xae, 30, 3);
        set(0xb6, 30, 9);
        set(0xbe, 30, 10);
        set(0xc6, 20, 2);
        set(0xce, 20, 3);
        set(0xd6, 20, 6);
        set(0xde, 20, 7);
        set(0xe6, 24, 2);
        set(0xee, 24, 3);
        set(0xf6, 24, 6);
        set(0xfe, 24, 7);
        set(0x24, 6, 2);
        set(0x2c, 6, 3);
        set(0x4c, 27, 3);
        set(0x6c, 27, 4);
        set(0x84, 49, 2);
        set(0x8c, 49, 3);
        set(0x94, 49, 6);
        set(0xa0, 31, 1);
        set(0xa4, 31, 2);
        set(0xac, 31, 3);
        set(0xb4, 31, 6);
        set(0xbc, 31, 7);
        set(0xc0, 19, 1);
        set(0xc4, 19, 2);
        set(0xcc, 19, 3);
        set(0xe0, 18, 1);
        set(0xe4, 18, 2);
        set(0xec, 18, 3);
        set(0x10, 9, 5);
        set(0x30, 7, 5);
        set(0x50, 11, 5);
        set(0x70, 12, 5);
        set(0x90, 3, 5);
        set(0xb0, 4, 5);
        set(0xd0, 8, 5);
        set(0xf0, 5, 5);
        set(0x00, 10, 0);
        set(0x20, 28, 0, 3);
        set(0x40, 41, 0);
        set(0x60, 42, 0);
        set(0x08, 36, 0);
        set(0x28, 38, 0);
        set(0x48, 35, 0);
        set(0x68, 37, 0);
        set(0x88, 22, 0);
        set(0xa8, 51, 0);
        set(0xc8, 26, 0);
        set(0xe8, 25, 0);
        set(0x18, 13, 0);
        set(0x38, 44, 0);
        set(0x58, 15, 0);
        set(0x78, 46, 0);
        set(0x98, 55, 0);
        set(0xb8, 16, 0);
        set(0xd8, 14, 0);
        set(0xf8, 45, 0);
        set(0x8a, 53, 0);
        set(0x9a, 54, 0);
        set(0xaa, 50, 0);
        set(0xba, 52, 0);
        set(0xca, 21, 0);
        set(0xea, 33, 0);
        set(0x1a, 33, 0);
        set(0x3a, 33, 0);
        set(0x5a, 33, 0);
        set(0x7a, 33, 0);
        set(0xda, 33, 0);
        set(0xfa, 33, 0);
        set(0x04, 56, 2);
        set(0x14, 56, 6);
        set(0x34, 56, 6);
        set(0x44, 56, 2);
        set(0x54, 56, 6);
        set(0x64, 56, 2);
        set(0x74, 56, 6);
        set(0x80, 56, 1);
        set(0x82, 56, 1);
        set(0x89, 56, 1);
        set(0xc2, 56, 1);
        set(0xd4, 56, 6);
        set(0xe2, 56, 1);
        set(0xf4, 56, 6);
        set(0x0c, 57, 3);
        set(0x1c, 57, 7);
        set(0x3c, 57, 7);
        set(0x5c, 57, 7);
        set(0x7c, 57, 7);
        set(0xdc, 57, 7);
        set(0xfc, 57, 7);
        set(0xeb, 43, 1);
        set(0x4b, 58, 1);
        set(0xcb, 59, 1);
        set(0xc7, 60, 2);
        set(0xd7, 60, 6);
        set(0xcf, 60, 3);
        set(0xdf, 60, 7);
        set(0xdb, 60, 10);
        set(0xc3, 60, 8);
        set(0xd3, 60, 11);
        set(0xa7, 61, 2);
        set(0xb7, 61, 9);
        set(0xaf, 61, 3);
        set(0xbf, 61, 10);
        set(0xa3, 61, 8);
        set(0xb3, 61, 11);
        set(0x6b, 62, 1);
        set(0x07, 63, 2);
        set(0x17, 63, 6);
        set(0x0f, 63, 3);
        set(0x1f, 63, 7);
        set(0x1b, 63, 10);
        set(0x03, 63, 8);
        set(0x13, 63, 11);
        set(0x87, 64, 2);
        set(0x97, 64, 9);
        set(0x83, 64, 8);
        set(0x8f, 64, 3);
        set(0xbb, 65, 10);
        set(0xe7, 66, 2);
        set(0xf7, 66, 6);
        set(0xef, 66, 3);
        set(0xff, 66, 7);
        set(0xfb, 66, 10);
        set(0xe3, 66, 8);
        set(0xf3, 66, 11);
        set(0x0b, 67, 1);
        set(0x2b, 67, 1);
        set(0xab, 68, 1);
        set(0x67, 69, 2);
        set(0x77, 69, 6);
        set(0x6f, 69, 3);
        set(0x7f, 69, 7);
        set(0x7b, 69, 10);
        set(0x63, 69, 8);
        set(0x73, 69, 11);
        set(0x27, 70, 2);
        set(0x37, 70, 6);
        set(0x2f, 70, 3);
        set(0x3f, 70, 7);
        set(0x3b, 70, 10);
        set(0x23, 70, 8);
        set(0x33, 70, 11);
    })(__init = Instruction.__init || (Instruction.__init = {}));
})(Instruction || (Instruction = {}));
exports.default = Instruction;

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CpuInterface_1 = require("./CpuInterface");
var vector_1 = require("./statemachine/vector");
var Compiler_1 = require("./statemachine/Compiler");
var StateMachineCpu = (function () {
    function StateMachineCpu(_bus, _rng) {
        this._bus = _bus;
        this._rng = _rng;
        this.executionState = 0;
        this.state = new CpuInterface_1.default.State();
        this._invalidInstructionCallback = null;
        this._interruptPending = false;
        this._nmiPending = false;
        this._halt = false;
        this._pollInterruptsAfterLastInstruction = false;
        this._lastInstructionPointer = 0;
        this._operations = new Array(255);
        this._opBoot = vector_1.boot(this.state);
        this._opIrq = vector_1.irq(this.state);
        this._opNmi = vector_1.nmi(this.state);
        var compiler = new Compiler_1.default(this.state);
        for (var op = 0; op < 256; op++) {
            this._operations[op] = compiler.compile(op);
        }
        this.reset();
    }
    StateMachineCpu.prototype.reset = function () {
        this.state.a = this._rng ? this._rng.int(0xff) : 0;
        this.state.x = this._rng ? this._rng.int(0xff) : 0;
        this.state.y = this._rng ? this._rng.int(0xff) : 0;
        this.state.s = 0xfd;
        this.state.p = this._rng ? this._rng.int(0xffff) : 0;
        this.state.flags =
            (this._rng ? this._rng.int(0xff) : 0) | 4 | 32 | 16;
        this.state.irq = false;
        this.state.nmi = false;
        this.executionState = 0;
        this._interruptPending = false;
        this._nmiPending = false;
        this._halt = false;
        this._lastResult = this._opBoot.reset(undefined);
        this._lastInstructionPointer = 0;
        return this;
    };
    StateMachineCpu.prototype.setInterrupt = function (i) {
        this._interruptPending = i;
        return this;
    };
    StateMachineCpu.prototype.isInterrupt = function () {
        return this._interruptPending;
    };
    StateMachineCpu.prototype.nmi = function () {
        this._nmiPending = true;
        return this;
    };
    StateMachineCpu.prototype.halt = function () {
        this._halt = true;
        return this;
    };
    StateMachineCpu.prototype.resume = function () {
        this._halt = false;
        return this;
    };
    StateMachineCpu.prototype.isHalt = function () {
        return this._halt;
    };
    StateMachineCpu.prototype.setInvalidInstructionCallback = function (callback) {
        this._invalidInstructionCallback = callback;
        return this;
    };
    StateMachineCpu.prototype.getInvalidInstructionCallback = function () {
        return this._invalidInstructionCallback;
    };
    StateMachineCpu.prototype.getLastInstructionPointer = function () {
        return this._lastInstructionPointer;
    };
    StateMachineCpu.prototype.cycle = function () {
        if (this._halt && (!this._lastResult || this._lastResult.cycleType === 0)) {
            return this;
        }
        if (this.executionState === 1) {
            this._fetch();
            return this;
        }
        var value;
        switch (this._lastResult.cycleType) {
            case 0:
                value = this._bus.read(this._lastResult.address);
                break;
            case 1:
                value = this._lastResult.value;
                this._bus.write(this._lastResult.address, value);
                break;
            default:
                throw new Error('invalid cycle type');
        }
        if (this._lastResult.pollInterrupts) {
            this._pollInterrupts();
            this._lastResult.pollInterrupts = false;
            this._pollInterruptsAfterLastInstruction = false;
        }
        this._lastResult = this._lastResult.nextStep(value);
        if (this._lastResult === null) {
            this.executionState = 1;
        }
        return this;
    };
    StateMachineCpu.prototype._fetch = function () {
        if (this._pollInterruptsAfterLastInstruction) {
            this._pollInterrupts();
        }
        this._lastInstructionPointer = this.state.p;
        var operation;
        var opcode = this._bus.read(this.state.p);
        if (this.state.nmi) {
            operation = this._opNmi;
            this._pollInterruptsAfterLastInstruction = false;
        }
        else if (this.state.irq) {
            operation = this._opIrq;
            this._pollInterruptsAfterLastInstruction = false;
        }
        else {
            operation = this._operations[opcode];
            this.state.p = (this.state.p + 1) & 0xffff;
            this._pollInterruptsAfterLastInstruction = true;
        }
        if (!operation) {
            if (this._invalidInstructionCallback) {
                this._invalidInstructionCallback(this);
            }
            return;
        }
        this.executionState = 2;
        this._lastResult = operation.reset(undefined);
    };
    StateMachineCpu.prototype._pollInterrupts = function () {
        this.state.irq = false;
        if (this._nmiPending) {
            this.state.nmi = true;
            this._nmiPending = false;
            return;
        }
        if (this._interruptPending && !this.state.nmi && !(this.state.flags & 4)) {
            this.state.irq = true;
        }
    };
    return StateMachineCpu;
}());
exports.default = StateMachineCpu;

},{"./CpuInterface":10,"./statemachine/Compiler":15,"./statemachine/vector":39}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function restoreFlagsFromStack(state, bus) {
    state.s = (state.s + 0x01) & 0xff;
    state.flags = (bus.read(0x0100 + state.s) | 32) & ~16;
}
function setFlagsNZ(state, operand) {
    state.flags =
        (state.flags & ~(128 | 2)) |
            (operand & 0x80) |
            (operand ? 0 : 2);
}
function opAdc(state, bus, operand) {
    if (state.flags & 8) {
        var d0 = (operand & 0x0f) + (state.a & 0x0f) + (state.flags & 1), d1 = (operand >>> 4) + (state.a >>> 4) + (d0 > 9 ? 1 : 0);
        state.a = d0 % 10 | (d1 % 10 << 4);
        state.flags =
            (state.flags & ~(128 | 2 | 1)) |
                (state.a & 0x80) |
                (state.a ? 0 : 2) |
                (d1 > 9 ? 1 : 0);
    }
    else {
        var sum = state.a + operand + (state.flags & 1), result = sum & 0xff;
        state.flags =
            (state.flags &
                ~(128 | 2 | 1 | 64)) |
                (result & 0x80) |
                (result ? 0 : 2) |
                (sum >>> 8) |
                ((~(operand ^ state.a) & (result ^ operand) & 0x80) >>> 1);
        state.a = result;
    }
}
exports.opAdc = opAdc;
function opAnd(state, bus, operand) {
    state.a &= operand;
    setFlagsNZ(state, state.a);
}
exports.opAnd = opAnd;
function opAslAcc(state) {
    var old = state.a;
    state.a = (state.a << 1) & 0xff;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old >>> 7);
}
exports.opAslAcc = opAslAcc;
function opAslMem(state, bus, operand) {
    var old = bus.read(operand), value = (old << 1) & 0xff;
    bus.write(operand, value);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (value & 0x80) |
            (value ? 0 : 2) |
            (old >>> 7);
}
exports.opAslMem = opAslMem;
function opBit(state, bus, operand) {
    state.flags =
        (state.flags & ~(128 | 64 | 2)) |
            (operand & (128 | 64)) |
            (operand & state.a ? 0 : 2);
}
exports.opBit = opBit;
function opBrk(state, bus) {
    var nextOpAddr = (state.p + 1) & 0xffff;
    var vector = 0xfffe;
    if (state.nmi) {
        vector = 0xfffa;
        state.nmi = false;
    }
    state.nmi = state.irq = false;
    bus.write(state.s + 0x0100, (nextOpAddr >>> 8) & 0xff);
    state.s = (state.s + 0xff) & 0xff;
    bus.write(state.s + 0x0100, nextOpAddr & 0xff);
    state.s = (state.s + 0xff) & 0xff;
    bus.write(state.s + 0x0100, state.flags | 16);
    state.s = (state.s + 0xff) & 0xff;
    state.flags |= 4;
    state.p = bus.readWord(vector);
}
exports.opBrk = opBrk;
function opClc(state) {
    state.flags &= ~1;
}
exports.opClc = opClc;
function opCld(state) {
    state.flags &= ~8;
}
exports.opCld = opCld;
function opCli(state) {
    state.flags &= ~4;
}
exports.opCli = opCli;
function opClv(state) {
    state.flags &= ~64;
}
exports.opClv = opClv;
function opCmp(state, bus, operand) {
    var diff = state.a + (~operand & 0xff) + 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (diff & 0x80) |
            (diff & 0xff ? 0 : 2) |
            (diff >>> 8);
}
exports.opCmp = opCmp;
function opCpx(state, bus, operand) {
    var diff = state.x + (~operand & 0xff) + 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (diff & 0x80) |
            (diff & 0xff ? 0 : 2) |
            (diff >>> 8);
}
exports.opCpx = opCpx;
function opCpy(state, bus, operand) {
    var diff = state.y + (~operand & 0xff) + 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (diff & 0x80) |
            (diff & 0xff ? 0 : 2) |
            (diff >>> 8);
}
exports.opCpy = opCpy;
function opDec(state, bus, operand) {
    var value = (bus.read(operand) + 0xff) & 0xff;
    bus.write(operand, value);
    setFlagsNZ(state, value);
}
exports.opDec = opDec;
function opDex(state) {
    state.x = (state.x + 0xff) & 0xff;
    setFlagsNZ(state, state.x);
}
exports.opDex = opDex;
function opEor(state, bus, operand) {
    state.a = state.a ^ operand;
    setFlagsNZ(state, state.a);
}
exports.opEor = opEor;
function opDey(state) {
    state.y = (state.y + 0xff) & 0xff;
    setFlagsNZ(state, state.y);
}
exports.opDey = opDey;
function opInc(state, bus, operand) {
    var value = (bus.read(operand) + 1) & 0xff;
    bus.write(operand, value);
    setFlagsNZ(state, value);
}
exports.opInc = opInc;
function opInx(state) {
    state.x = (state.x + 0x01) & 0xff;
    setFlagsNZ(state, state.x);
}
exports.opInx = opInx;
function opIny(state) {
    state.y = (state.y + 0x01) & 0xff;
    setFlagsNZ(state, state.y);
}
exports.opIny = opIny;
function opJmp(state, bus, operand) {
    state.p = operand;
}
exports.opJmp = opJmp;
function opJsr(state, bus, operand) {
    var returnPtr = (state.p + 1) & 0xffff, addrLo = bus.read(state.p);
    bus.read(0x0100 + state.s);
    bus.write(0x0100 + state.s, returnPtr >>> 8);
    state.s = (state.s + 0xff) & 0xff;
    bus.write(0x0100 + state.s, returnPtr & 0xff);
    state.s = (state.s + 0xff) & 0xff;
    state.p = addrLo | (bus.read((state.p + 1) & 0xffff) << 8);
}
exports.opJsr = opJsr;
function opLda(state, bus, operand, addressingMode) {
    state.a = addressingMode === 1 ? operand : bus.read(operand);
    setFlagsNZ(state, state.a);
}
exports.opLda = opLda;
function opLdx(state, bus, operand, addressingMode) {
    state.x = addressingMode === 1 ? operand : bus.read(operand);
    setFlagsNZ(state, state.x);
}
exports.opLdx = opLdx;
function opLdy(state, bus, operand, addressingMode) {
    state.y = addressingMode === 1 ? operand : bus.read(operand);
    setFlagsNZ(state, state.y);
}
exports.opLdy = opLdy;
function opLsrAcc(state) {
    var old = state.a;
    state.a = state.a >>> 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old & 1);
}
exports.opLsrAcc = opLsrAcc;
function opLsrMem(state, bus, operand) {
    var old = bus.read(operand), value = old >>> 1;
    bus.write(operand, value);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (value & 0x80) |
            (value ? 0 : 2) |
            (old & 1);
}
exports.opLsrMem = opLsrMem;
function opNop() { }
exports.opNop = opNop;
function opOra(state, bus, operand) {
    state.a |= operand;
    setFlagsNZ(state, state.a);
}
exports.opOra = opOra;
function opPhp(state, bus) {
    bus.write(0x0100 + state.s, state.flags | 16);
    state.s = (state.s + 0xff) & 0xff;
}
exports.opPhp = opPhp;
function opPlp(state, bus) {
    restoreFlagsFromStack(state, bus);
}
exports.opPlp = opPlp;
function opPha(state, bus) {
    bus.write(0x0100 + state.s, state.a);
    state.s = (state.s + 0xff) & 0xff;
}
exports.opPha = opPha;
function opPla(state, bus) {
    state.s = (state.s + 0x01) & 0xff;
    state.a = bus.read(0x0100 + state.s);
    setFlagsNZ(state, state.a);
}
exports.opPla = opPla;
function opRolAcc(state) {
    var old = state.a;
    state.a = ((state.a << 1) & 0xff) | (state.flags & 1);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old >>> 7);
}
exports.opRolAcc = opRolAcc;
function opRolMem(state, bus, operand) {
    var old = bus.read(operand), value = ((old << 1) & 0xff) | (state.flags & 1);
    bus.write(operand, value);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (value & 0x80) |
            (value ? 0 : 2) |
            (old >>> 7);
}
exports.opRolMem = opRolMem;
function opRorAcc(state) {
    var old = state.a;
    state.a = (state.a >>> 1) | ((state.flags & 1) << 7);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old & 1);
}
exports.opRorAcc = opRorAcc;
function opRorMem(state, bus, operand) {
    var old = bus.read(operand), value = (old >>> 1) | ((state.flags & 1) << 7);
    bus.write(operand, value);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (value & 0x80) |
            (value ? 0 : 2) |
            (old & 1);
}
exports.opRorMem = opRorMem;
function opRti(state, bus) {
    var returnPtr;
    restoreFlagsFromStack(state, bus);
    state.s = (state.s + 1) & 0xff;
    returnPtr = bus.read(0x0100 + state.s);
    state.s = (state.s + 1) & 0xff;
    returnPtr |= bus.read(0x0100 + state.s) << 8;
    state.p = returnPtr;
}
exports.opRti = opRti;
function opRts(state, bus) {
    var returnPtr;
    bus.read(0x0100 + state.s);
    state.s = (state.s + 1) & 0xff;
    returnPtr = bus.read(0x0100 + state.s);
    state.s = (state.s + 1) & 0xff;
    returnPtr += bus.read(0x0100 + state.s) << 8;
    state.p = (returnPtr + 1) & 0xffff;
}
exports.opRts = opRts;
function opSbc(state, bus, operand) {
    if (state.flags & 8) {
        var d0 = (state.a & 0x0f) - (operand & 0x0f) - (~state.flags & 1), d1 = (state.a >>> 4) - (operand >>> 4) - (d0 < 0 ? 1 : 0);
        state.a = (d0 < 0 ? 10 + d0 : d0) | ((d1 < 0 ? 10 + d1 : d1) << 4);
        state.flags =
            (state.flags & ~(128 | 2 | 1)) |
                (state.a & 0x80) |
                (state.a ? 0 : 2) |
                (d1 < 0 ? 0 : 1);
    }
    else {
        operand = ~operand & 0xff;
        var sum = state.a + operand + (state.flags & 1), result = sum & 0xff;
        state.flags =
            (state.flags &
                ~(128 | 2 | 1 | 64)) |
                (result & 0x80) |
                (result ? 0 : 2) |
                (sum >>> 8) |
                ((~(operand ^ state.a) & (result ^ operand) & 0x80) >>> 1);
        state.a = result;
    }
}
exports.opSbc = opSbc;
function opSec(state) {
    state.flags |= 1;
}
exports.opSec = opSec;
function opSed(state) {
    state.flags |= 8;
}
exports.opSed = opSed;
function opSei(state) {
    state.flags |= 4;
}
exports.opSei = opSei;
function opSta(state, bus, operand) {
    bus.write(operand, state.a);
}
exports.opSta = opSta;
function opStx(state, bus, operand) {
    bus.write(operand, state.x);
}
exports.opStx = opStx;
function opSty(state, bus, operand) {
    bus.write(operand, state.y);
}
exports.opSty = opSty;
function opTax(state) {
    state.x = state.a;
    setFlagsNZ(state, state.a);
}
exports.opTax = opTax;
function opTay(state) {
    state.y = state.a;
    setFlagsNZ(state, state.a);
}
exports.opTay = opTay;
function opTsx(state) {
    state.x = state.s;
    setFlagsNZ(state, state.x);
}
exports.opTsx = opTsx;
function opTxa(state) {
    state.a = state.x;
    setFlagsNZ(state, state.a);
}
exports.opTxa = opTxa;
function opTxs(state) {
    state.s = state.x;
}
exports.opTxs = opTxs;
function opTya(state) {
    state.a = state.y;
    setFlagsNZ(state, state.a);
}
exports.opTya = opTya;
function opAlr(state, bus, operand) {
    var i = state.a & operand;
    state.a = i >>> 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (i & 1);
}
exports.opAlr = opAlr;
function opAxs(state, bus, operand) {
    var value = (state.a & state.x) + (~operand & 0xff) + 1;
    state.x = value & 0xff;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.x & 0x80) |
            (state.x & 0xff ? 0 : 2) |
            (value >>> 8);
}
exports.opAxs = opAxs;
function opDcp(state, bus, operand) {
    var value = (bus.read(operand) + 0xff) & 0xff;
    bus.write(operand, value);
    var diff = state.a + (~value & 0xff) + 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (diff & 0x80) |
            (diff & 0xff ? 0 : 2) |
            (diff >>> 8);
}
exports.opDcp = opDcp;
function opLax(state, bus, operand) {
    state.a = operand;
    state.x = operand;
    setFlagsNZ(state, operand);
}
exports.opLax = opLax;
function opArr(state, bus, operand) {
    state.a = ((state.a & operand) >>> 1) | (state.flags & 1 ? 0x80 : 0);
    state.flags =
        (state.flags & ~(1 | 128 | 2 | 64)) |
            ((state.a & 0x40) >>> 6) |
            (state.a ? 0 : 2) |
            (state.a & 0x80) |
            ((state.a & 0x40) ^ ((state.a & 0x20) << 1));
}
exports.opArr = opArr;
function opSlo(state, bus, operand) {
    var value = bus.read(operand);
    state.flags = (state.flags & ~1) | (value >>> 7);
    value = (value << 1) & 0xff;
    bus.write(operand, value);
    state.a = state.a | value;
    setFlagsNZ(state, state.a);
}
exports.opSlo = opSlo;
function opAax(state, bus, operand) {
    var value = state.x & state.a;
    bus.write(operand, value);
    setFlagsNZ(state, value);
}
exports.opAax = opAax;
function opLar(state, bus, operand) {
    state.s = state.a = state.x = state.s & operand;
    setFlagsNZ(state, state.a);
}
exports.opLar = opLar;
function opIsc(state, bus, operand) {
    var value = (bus.read(operand) + 1) & 0xff;
    bus.write(operand, value);
    opSbc(state, bus, value);
}
exports.opIsc = opIsc;
function opAac(state, bus, operand) {
    state.a &= operand;
    setFlagsNZ(state, state.a);
    state.flags = (state.flags & ~1) | ((state.a & 0x80) >>> 7);
}
exports.opAac = opAac;
function opAtx(state, bus, operand) {
    state.a &= operand;
    state.x = state.a;
    setFlagsNZ(state, state.a);
}
exports.opAtx = opAtx;
function opRra(state, bus, operand) {
    var old = bus.read(operand), value = (old >>> 1) | ((state.flags & 1) << 7);
    bus.write(operand, value);
    state.flags = (state.flags & ~1) | (old & 1);
    opAdc(state, bus, value);
}
exports.opRra = opRra;
function opRla(state, bus, operand) {
    var old = bus.read(operand), value = ((old << 1) & 0xff) | (state.flags & 1);
    bus.write(operand, value);
    state.flags = (state.flags & ~1) | (old >>> 7);
    opAnd(state, bus, value);
}
exports.opRla = opRla;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Instruction_1 = require("../Instruction");
var addressing_1 = require("./addressing");
var instruction_1 = require("./instruction");
var ops = require("./ops");
var indirect_1 = require("./addressing/indirect");
var vector_1 = require("./vector");
var Compiler = (function () {
    function Compiler(_state) {
        this._state = _state;
    }
    Compiler.prototype.compile = function (op) {
        var instruction = Instruction_1.default.opcodes[op];
        switch (instruction.operation) {
            case 0:
                return this._createAddressing(instruction.addressingMode, ops.adc, {
                    deref: true
                });
            case 1:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.a = state.a & operand); }); }, {
                    deref: true
                });
            case 2:
                return instruction.addressingMode === 0
                    ? instruction_1.nullaryOneCycle(this._state, ops.aslImmediate)
                    : this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.aslRmw).reset, { writeOp: true });
            case 6:
                return this._createAddressing(instruction.addressingMode, ops.bit, {
                    deref: true
                });
            case 10:
                return vector_1.brk(this._state);
            case 17:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return (ops.cmp(o, s, function (state) { return state.a; }), null); }, {
                    deref: true
                });
            case 18:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return (ops.cmp(o, s, function (state) { return state.x; }), null); }, {
                    deref: true
                });
            case 19:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return (ops.cmp(o, s, function (state) { return state.y; }), null); }, {
                    deref: true
                });
            case 20:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, function (s, o) { return ops.genRmw(s, o, function (x) { return (x - 1) & 0xff; }); }).reset, {
                    writeOp: true
                });
            case 21:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.x = (state.x - 1) & 0xff); }); });
            case 22:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.y = (state.y - 1) & 0xff); }); });
            case 24:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, function (s, o) { return ops.genRmw(s, o, function (x) { return (x + 1) & 0xff; }); }).reset, {
                    writeOp: true
                });
            case 25:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.x = (state.x + 1) & 0xff); }); });
            case 26:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.y = (state.y + 1) & 0xff); }); });
            case 23:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.a = state.a ^ operand); }); }, {
                    deref: true
                });
            case 27:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ((s.p = o), null); });
            case 28:
                return instruction_1.jsr(this._state);
            case 29:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.a = operand); }); }, {
                    deref: true
                });
            case 30:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.x = operand); }); }, {
                    deref: true
                });
            case 31:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.y = operand); }); }, {
                    deref: true
                });
            case 32:
                return instruction.addressingMode === 0
                    ? instruction_1.nullaryOneCycle(this._state, ops.lsrImmediate)
                    : this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.lsrRmw).reset, { writeOp: true });
            case 33:
                return instruction_1.nullaryOneCycle(this._state, function () { return undefined; });
            case 34:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.a |= operand); }); }, { deref: true });
            case 35:
                return instruction_1.push(this._state, function (s) { return s.a; });
            case 36:
                return instruction_1.push(this._state, function (s) { return s.flags | 16; });
            case 37:
                return instruction_1.pull(this._state, function (s, o) { return ops.genNullary(s, function (state) { return (state.a = o); }); });
            case 38:
                return instruction_1.pull(this._state, function (s, o) { return (s.flags = (o | 32) & ~16); });
            case 39:
                return instruction.addressingMode === 0
                    ? instruction_1.nullaryOneCycle(this._state, ops.rolImmediate)
                    : this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.rolRmw).reset, { writeOp: true });
            case 40:
                return instruction.addressingMode === 0
                    ? instruction_1.nullaryOneCycle(this._state, ops.rorImmediate)
                    : this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.rorRmw).reset, { writeOp: true });
            case 41:
                return instruction_1.rti(this._state);
            case 42:
                return instruction_1.rts(this._state);
            case 43:
                return this._createAddressing(instruction.addressingMode, ops.sbc, {
                    deref: true
                });
            case 48:
                return this._createAddressing(instruction.addressingMode, instruction_1.write(this._state, function (s) { return s.x; }).reset, {
                    writeOp: true
                });
            case 49:
                return this._createAddressing(instruction.addressingMode, instruction_1.write(this._state, function (s) { return s.y; }).reset, {
                    writeOp: true
                });
            case 50:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.x = state.a); }); });
            case 51:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.y = state.a); }); });
            case 52:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.x = state.s); }); });
            case 53:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.a = state.x); }); });
            case 54:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.s = s.x); });
            case 55:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return ops.genNullary(s, function (state) { return (state.a = state.y); }); });
            case 3:
                return instruction_1.branch(this._state, function (flags) { return (flags & 1) === 0; });
            case 4:
                return instruction_1.branch(this._state, function (flags) { return (flags & 1) > 0; });
            case 8:
                return instruction_1.branch(this._state, function (flags) { return (flags & 2) === 0; });
            case 5:
                return instruction_1.branch(this._state, function (flags) { return (flags & 2) > 0; });
            case 9:
                return instruction_1.branch(this._state, function (flags) { return (flags & 128) === 0; });
            case 7:
                return instruction_1.branch(this._state, function (flags) { return (flags & 128) > 0; });
            case 11:
                return instruction_1.branch(this._state, function (flags) { return (flags & 64) === 0; });
            case 12:
                return instruction_1.branch(this._state, function (flags) { return (flags & 64) > 0; });
            case 44:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags |= 1); });
            case 45:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags |= 8); });
            case 46:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags |= 4); });
            case 47:
                return this._createAddressing(instruction.addressingMode, instruction_1.write(this._state, function (s) { return s.a; }).reset, {
                    writeOp: true
                });
            case 13:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags &= ~1); });
            case 14:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags &= ~8); });
            case 15:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags &= ~4); });
            case 16:
                return instruction_1.nullaryOneCycle(this._state, function (s) { return (s.flags &= ~64); });
            case 56:
            case 57:
                return this._createAddressing(instruction.addressingMode, function () { return null; }, { deref: true });
            case 67:
                return this._createAddressing(instruction.addressingMode, ops.aac);
            case 64:
                return this._createAddressing(instruction.addressingMode, instruction_1.write(this._state, ops.aax).reset, {
                    writeOp: true
                });
            case 58:
                return this._createAddressing(instruction.addressingMode, ops.alr, {
                    deref: true
                });
            case 62:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return (ops.arr(o, s), null); }, {
                    deref: true
                });
            case 59:
                return this._createAddressing(instruction.addressingMode, ops.axs, {
                    deref: true
                });
            case 68:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.x = state.a = state.a & operand); }); }, {
                    deref: true
                });
            case 60:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.dcp).reset, {
                    writeOp: true
                });
            case 66:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.isc).reset, {
                    writeOp: true
                });
            case 61:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.a = state.x = operand); }); }, {
                    deref: true
                });
            case 65:
                return this._createAddressing(instruction.addressingMode, function (o, s) { return ops.genUnary(o, s, function (operand, state) { return (state.s = state.x = state.a = state.s & operand); }); }, { deref: true });
            case 70:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.rla).reset, {
                    writeOp: true
                });
            case 69:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.rra).reset, {
                    writeOp: true
                });
            case 63:
                return this._createAddressing(instruction.addressingMode, instruction_1.readModifyWrite(this._state, ops.slo).reset, {
                    writeOp: true
                });
            default:
                return null;
        }
    };
    Compiler.prototype._createAddressing = function (addressingMode, next, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.deref, deref = _c === void 0 ? false : _c, _d = _b.writeOp, writeOp = _d === void 0 ? false : _d;
        if (deref && addressingMode !== 1) {
            next = addressing_1.dereference(this._state, next).reset;
        }
        switch (addressingMode) {
            case 1:
                return addressing_1.immediate(this._state, next);
            case 2:
                return addressing_1.zeroPage(this._state, next);
            case 3:
                return addressing_1.absolute(this._state, next);
            case 6:
                return addressing_1.zeroPageX(this._state, next);
            case 9:
                return addressing_1.zeroPageY(this._state, next);
            case 7:
                return addressing_1.absoluteX(this._state, next, writeOp);
            case 10:
                return addressing_1.absoluteY(this._state, next, writeOp);
            case 8:
                return addressing_1.indexedIndirectX(this._state, next);
            case 11:
                return addressing_1.indirectIndexedY(this._state, next, writeOp);
            case 4:
                return indirect_1.indirect(this._state, next);
            default:
                throw new Error("invalid addressing mode " + addressingMode);
        }
    };
    return Compiler;
}());
exports.default = Compiler;

},{"../Instruction":12,"./addressing":21,"./addressing/indirect":23,"./instruction":28,"./ops":37,"./vector":39}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ResultImpl = (function () {
    function ResultImpl() {
        this.cycleType = 0;
        this.address = 0;
        this.value = 0;
        this.pollInterrupts = false;
        this.nextStep = null;
    }
    ResultImpl.prototype.read = function (nextStep, address) {
        this.cycleType = 0;
        this.address = address;
        this.nextStep = nextStep;
        return this;
    };
    ResultImpl.prototype.write = function (nextStep, address, value) {
        this.cycleType = 1;
        this.address = address;
        this.value = value;
        this.nextStep = nextStep;
        return this;
    };
    ResultImpl.prototype.poll = function (poll) {
        this.pollInterrupts = poll;
        return this;
    };
    return ResultImpl;
}());
exports.default = ResultImpl;

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Absolute = (function () {
    function Absolute(state, next) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchLo, _this._state.p); };
        this._fetchLo = function (value) {
            _this._operand = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._fetchHi, _this._state.p);
        };
        this._fetchHi = function (value) {
            _this._operand |= value << 8;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._next = next;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Absolute.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Absolute.prototype, "_fetchLo", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Absolute.prototype, "_fetchHi", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Absolute.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Absolute.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Absolute.prototype, "_next", void 0);
    return Absolute;
}());
exports.absolute = function (state, next) { return new Absolute(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var AbsoluteIndexed = (function () {
    function AbsoluteIndexed(state, indexExtractor, next, writeOp) {
        if (next === void 0) { next = function () { return null; }; }
        if (writeOp === void 0) { writeOp = false; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchLo, _this._state.p); };
        this._fetchLo = function (value) {
            _this._operand = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._fetchHi, _this._state.p);
        };
        this._fetchHi = function (value) {
            _this._operand |= value << 8;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            var index = _this._indexExtractor(_this._state);
            _this._carry = (_this._operand & 0xff) + index > 0xff;
            _this._operand = (_this._operand & 0xff00) | ((_this._operand + index) & 0xff);
            return _this._carry || _this._writeOp
                ? _this._result.read(_this._dereferenceAndCarry, _this._operand)
                : _this._next(_this._operand, _this._state);
        };
        this._dereferenceAndCarry = function (value) {
            if (_this._carry) {
                _this._operand = (_this._operand + 0x0100) & 0xffff;
            }
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._carry = false;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._indexExtractor = indexExtractor;
        this._next = next;
        this._writeOp = writeOp;
        decorators_1.freezeImmutables(this);
    }
    AbsoluteIndexed.absoluteX = function (state, next, writeOp) {
        return new AbsoluteIndexed(state, function (s) { return s.x; }, next, writeOp);
    };
    AbsoluteIndexed.absoluteY = function (state, next, writeOp) {
        return new AbsoluteIndexed(state, function (s) { return s.y; }, next, writeOp);
    };
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_fetchLo", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_fetchHi", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_dereferenceAndCarry", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_indexExtractor", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_next", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed.prototype, "_writeOp", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed, "absoluteX", null);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], AbsoluteIndexed, "absoluteY", null);
    return AbsoluteIndexed;
}());
exports.absoluteX = function (state, next, writeOp) {
    return AbsoluteIndexed.absoluteX(state, next, writeOp);
};
exports.absoluteY = function (state, next, writeOp) {
    return AbsoluteIndexed.absoluteY(state, next, writeOp);
};

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Dereference = (function () {
    function Dereference(state, next) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function (operand) { return _this._result.read(_this._dereference, operand); };
        this._dereference = function (value) { return _this._next(value, _this._state); };
        this._result = new ResultImpl_1.default();
        this._next = next;
        this._state = state;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Dereference.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Dereference.prototype, "_dereference", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Dereference.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Dereference.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Dereference.prototype, "_next", void 0);
    return Dereference;
}());
exports.dereference = function (state, next) { return new Dereference(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Immediate = (function () {
    function Immediate(state, next) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchOperand, _this._state.p); };
        this._fetchOperand = function (value) {
            _this._operand = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._next = next;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Immediate.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Immediate.prototype, "_fetchOperand", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Immediate.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Immediate.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Immediate.prototype, "_next", void 0);
    return Immediate;
}());
exports.immediate = function (state, next) { return new Immediate(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var absolute_1 = require("./absolute");
exports.absolute = absolute_1.absolute;
var absoluteIndexed_1 = require("./absoluteIndexed");
exports.absoluteX = absoluteIndexed_1.absoluteX;
exports.absoluteY = absoluteIndexed_1.absoluteY;
var dereference_1 = require("./dereference");
exports.dereference = dereference_1.dereference;
var immediate_1 = require("./immediate");
exports.immediate = immediate_1.immediate;
var indexedIndirectX_1 = require("./indexedIndirectX");
exports.indexedIndirectX = indexedIndirectX_1.indexedIndirectX;
var indirectIndexedY_1 = require("./indirectIndexedY");
exports.indirectIndexedY = indirectIndexedY_1.indirectIndexedY;
var zeroPage_1 = require("./zeroPage");
exports.zeroPage = zeroPage_1.zeroPage;
var zeroPageIndexed_1 = require("./zeroPageIndexed");
exports.zeroPageX = zeroPageIndexed_1.zeroPageX;
exports.zeroPageY = zeroPageIndexed_1.zeroPageY;

},{"./absolute":17,"./absoluteIndexed":18,"./dereference":19,"./immediate":20,"./indexedIndirectX":22,"./indirectIndexedY":24,"./zeroPage":25,"./zeroPageIndexed":26}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var IndexedIndirectX = (function () {
    function IndexedIndirectX(state, next) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchAddress, _this._state.p); };
        this._fetchAddress = function (value) {
            _this._address = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._addIndex, _this._address);
        };
        this._addIndex = function (value) {
            _this._address = (_this._address + _this._state.x) & 0xff;
            return _this._result.read(_this._fetchLo, _this._address);
        };
        this._fetchLo = function (value) {
            _this._operand = value;
            _this._address = (_this._address + 1) & 0xff;
            return _this._result.read(_this._fetchHi, _this._address);
        };
        this._fetchHi = function (value) {
            _this._operand |= value << 8;
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._address = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._next = next;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_fetchAddress", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_addIndex", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_fetchLo", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_fetchHi", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectX.prototype, "_next", void 0);
    return IndexedIndirectX;
}());
exports.indexedIndirectX = function (state, next) { return new IndexedIndirectX(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Indirect = (function () {
    function Indirect(state, next) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchAddressLo, _this._state.p); };
        this._fetchAddressLo = function (value) {
            _this._address = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._fetchAddressHi, _this._state.p);
        };
        this._fetchAddressHi = function (value) {
            _this._address |= value << 8;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._fetchLo, _this._address);
        };
        this._fetchLo = function (value) {
            _this._operand = value;
            if ((_this._address & 0xff) === 0xff) {
                _this._address &= 0xff00;
            }
            else {
                _this._address = (_this._address + 1) & 0xffff;
            }
            return _this._result.read(_this._fetchHi, _this._address);
        };
        this._fetchHi = function (value) {
            _this._operand |= value << 8;
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._address = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._next = next;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_fetchAddressLo", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_fetchAddressHi", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_fetchLo", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_fetchHi", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Indirect.prototype, "_next", void 0);
    return Indirect;
}());
exports.indirect = function (state, next) { return new Indirect(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var IndexedIndirectY = (function () {
    function IndexedIndirectY(state, next, writeOp) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchAddress, _this._state.p); };
        this._fetchAddress = function (value) {
            _this._address = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._fetchLo, _this._address);
        };
        this._fetchLo = function (value) {
            _this._operand = value;
            _this._address = (_this._address + 1) & 0xff;
            return _this._result.read(_this._fetchHi, _this._address);
        };
        this._fetchHi = function (value) {
            _this._operand |= value << 8;
            _this._carry = (_this._operand & 0xff) + _this._state.y > 0xff;
            _this._operand = (_this._operand & 0xff00) | ((_this._operand + _this._state.y) & 0xff);
            return _this._carry || _this._writeOp
                ? _this._result.read(_this._dereferenceAndCarry, _this._operand)
                : _this._next(_this._operand, _this._state);
        };
        this._dereferenceAndCarry = function (value) {
            if (_this._carry) {
                _this._operand = (_this._operand + 0x0100) & 0xffff;
            }
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._address = 0;
        this._carry = false;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._next = next;
        this._writeOp = writeOp;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_fetchAddress", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_fetchLo", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_fetchHi", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_dereferenceAndCarry", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_next", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], IndexedIndirectY.prototype, "_writeOp", void 0);
    return IndexedIndirectY;
}());
exports.indirectIndexedY = function (state, next, writeOp) {
    return new IndexedIndirectY(state, next, writeOp);
};

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var ZeroPage = (function () {
    function ZeroPage(state, next) {
        if (next === void 0) { next = function () { return null; }; }
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchAddress, _this._state.p); };
        this._fetchAddress = function (value) {
            _this._operand = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._next = next;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPage.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPage.prototype, "_fetchAddress", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPage.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPage.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPage.prototype, "_next", void 0);
    return ZeroPage;
}());
exports.zeroPage = function (state, next) { return new ZeroPage(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var ZeroPageIndexed = (function () {
    function ZeroPageIndexed(state, indexExtractor, next) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchAddress, _this._state.p); };
        this._fetchAddress = function (value) {
            _this._operand = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._addIndex, _this._operand);
        };
        this._addIndex = function (value) {
            _this._operand = (_this._operand + _this._indexExtractor(_this._state)) & 0xff;
            return _this._next(_this._operand, _this._state);
        };
        this._operand = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._indexExtractor = indexExtractor;
        this._next = next;
        decorators_1.freezeImmutables(this);
    }
    ZeroPageIndexed.zeroPageX = function (state, next) {
        if (next === void 0) { next = function () { return null; }; }
        return new ZeroPageIndexed(state, function (s) { return s.x; }, next);
    };
    ZeroPageIndexed.zeroPageY = function (state, next) {
        if (next === void 0) { next = function () { return null; }; }
        return new ZeroPageIndexed(state, function (s) { return s.y; }, next);
    };
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "_fetchAddress", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "_addIndex", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "_next", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ZeroPageIndexed.prototype, "_indexExtractor", void 0);
    return ZeroPageIndexed;
}());
exports.zeroPageX = function (state, next) { return ZeroPageIndexed.zeroPageX(state, next); };
exports.zeroPageY = function (state, next) { return ZeroPageIndexed.zeroPageY(state, next); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Branch = (function () {
    function Branch(state, predicate) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchTarget, _this._state.p).poll(true); };
        this._fetchTarget = function (value) {
            _this._operand = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._predicate(_this._state.flags) ? _this._result.read(_this._firstDummyRead, _this._state.p) : null;
        };
        this._firstDummyRead = function (value) {
            _this._target = (_this._state.p + (_this._operand & 0x80 ? _this._operand - 256 : _this._operand)) & 0xffff;
            if ((_this._target & 0xff00) === (_this._state.p & 0xff00)) {
                _this._state.p = _this._target;
                return null;
            }
            return _this._result.read(_this._secondDummyRead, (_this._state.p & 0xff00) | (_this._target & 0x00ff)).poll(true);
        };
        this._secondDummyRead = function (value) {
            _this._state.p = _this._target;
            return null;
        };
        this._target = 0;
        this._operand = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._predicate = predicate;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "_fetchTarget", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "_firstDummyRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "_secondDummyRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Branch.prototype, "_predicate", void 0);
    return Branch;
}());
exports.branch = function (state, predicate) { return new Branch(state, predicate); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var branch_1 = require("./branch");
exports.branch = branch_1.branch;
var jsr_1 = require("./jsr");
exports.jsr = jsr_1.jsr;
var readModifyWrite_1 = require("./readModifyWrite");
exports.readModifyWrite = readModifyWrite_1.readModifyWrite;
var rts_1 = require("./rts");
exports.rts = rts_1.rts;
var nullaryOneCycle_1 = require("./nullaryOneCycle");
exports.nullaryOneCycle = nullaryOneCycle_1.nullaryOneCycle;
var pull_1 = require("./pull");
exports.pull = pull_1.pull;
var push_1 = require("./push");
exports.push = push_1.push;
var rti_1 = require("./rti");
exports.rti = rti_1.rti;
var write_1 = require("./write");
exports.write = write_1.write;

},{"./branch":27,"./jsr":29,"./nullaryOneCycle":30,"./pull":31,"./push":32,"./readModifyWrite":33,"./rti":34,"./rts":35,"./write":36}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Jsr = (function () {
    function Jsr(state) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._fetchPcl, _this._state.p); };
        this._fetchPcl = function (value) {
            _this._addressLo = value;
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return _this._result.read(_this._dummyStackRead, 0x0100 + _this._state.s);
        };
        this._dummyStackRead = function () {
            return _this._result.write(_this._pushPch, 0x0100 + _this._state.s, _this._state.p >>> 8);
        };
        this._pushPch = function () {
            _this._state.s = (_this._state.s - 1) & 0xff;
            return _this._result.write(_this._pushPcl, 0x0100 + _this._state.s, _this._state.p & 0xff);
        };
        this._pushPcl = function () {
            _this._state.s = (_this._state.s - 1) & 0xff;
            return _this._result.read(_this._fetchPch, _this._state.p);
        };
        this._fetchPch = function (value) {
            _this._state.p = _this._addressLo | (value << 8);
            return null;
        };
        this._addressLo = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_fetchPcl", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_dummyStackRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_pushPch", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_pushPcl", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_fetchPch", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Jsr.prototype, "_state", void 0);
    return Jsr;
}());
exports.jsr = function (state) { return new Jsr(state); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var NullaryOneCycle = (function () {
    function NullaryOneCycle(state, operation) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._executeOperation, _this._state.p).poll(true); };
        this._executeOperation = function () {
            _this._operation(_this._state);
            return null;
        };
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._operation = operation;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], NullaryOneCycle.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], NullaryOneCycle.prototype, "_executeOperation", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], NullaryOneCycle.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], NullaryOneCycle.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], NullaryOneCycle.prototype, "_operation", void 0);
    return NullaryOneCycle;
}());
exports.nullaryOneCycle = function (state, operation) {
    return new NullaryOneCycle(state, operation);
};

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var decorators_1 = require("../../../../tools/decorators");
var ResultImpl_1 = require("../ResultImpl");
var Pull = (function () {
    function Pull(state, operation) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._dummyRead, _this._state.p).poll(true); };
        this._dummyRead = function () {
            return _this._result.read(_this._incrementS, 0x0100 + _this._state.s);
        };
        this._incrementS = function () {
            _this._state.s = (_this._state.s + 1) & 0xff;
            return _this._result.read(_this._pull, 0x0100 + _this._state.s);
        };
        this._pull = function (value) { return (_this._operation(_this._state, value), null); };
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._operation = operation;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "_dummyRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "_incrementS", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "_pull", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Pull.prototype, "_operation", void 0);
    return Pull;
}());
exports.pull = function (state, operation) { return new Pull(state, operation); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var decorators_1 = require("../../../../tools/decorators");
var ResultImpl_1 = require("../ResultImpl");
var Push = (function () {
    function Push(state, operation) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._dummyRead, _this._state.p); };
        this._dummyRead = function () {
            return _this._result.write(_this._push, 0x0100 + _this._state.s, _this._operation(_this._state));
        };
        this._push = function () {
            _this._state.s = (_this._state.s - 1) & 0xff;
            return null;
        };
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._operation = operation;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Push.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Push.prototype, "_dummyRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Push.prototype, "_push", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Push.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Push.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Push.prototype, "_operation", void 0);
    return Push;
}());
exports.push = function (state, operation) { return new Push(state, operation); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var ReadModifyWrite = (function () {
    function ReadModifyWrite(state, operation) {
        var _this = this;
        this.reset = function (address) {
            _this._address = address;
            return _this._result.read(_this._read, address);
        };
        this._read = function (value) {
            _this._operand = value;
            return _this._result.write(_this._dummyWrite, _this._address, _this._operand);
        };
        this._dummyWrite = function (value) {
            return _this._result.write(_this._write, _this._address, _this._operation(_this._operand, _this._state));
        };
        this._write = function () { return null; };
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._operation = operation;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "_read", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "_dummyWrite", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "_write", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], ReadModifyWrite.prototype, "_operation", void 0);
    return ReadModifyWrite;
}());
exports.readModifyWrite = function (state, operation) {
    return new ReadModifyWrite(state, operation);
};

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Rti = (function () {
    function Rti(state) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._dummyOperandRead, _this._state.p); };
        this._dummyOperandRead = function () {
            return _this._result.read(_this._dummyStackRead, 0x0100 + _this._state.s);
        };
        this._dummyStackRead = function () {
            _this._state.s = (_this._state.s + 1) & 0xff;
            return _this._result.read(_this._popP, 0x0100 + _this._state.s);
        };
        this._popP = function (value) {
            _this._state.flags = (value | 32) & ~16;
            _this._state.s = (_this._state.s + 1) & 0xff;
            return _this._result.read(_this._popPcl, 0x0100 + _this._state.s);
        };
        this._popPcl = function (value) {
            _this._state.p = (_this._state.p & 0xff00) | value;
            _this._state.s = (_this._state.s + 1) & 0xff;
            return _this._result.read(_this._popPch, 0x0100 + _this._state.s);
        };
        this._popPch = function (value) {
            _this._state.p = (_this._state.p & 0xff) | (value << 8);
            return null;
        };
        this._result = new ResultImpl_1.default();
        this._state = state;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_dummyOperandRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_dummyStackRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_popP", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_popPcl", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_popPch", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rti.prototype, "_state", void 0);
    return Rti;
}());
exports.rti = function (state) { return new Rti(state); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Rts = (function () {
    function Rts(state) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._dummyOperandRead, _this._state.p); };
        this._dummyOperandRead = function () {
            return _this._result.read(_this._dummyStackRead, 0x0100 + _this._state.s);
        };
        this._dummyStackRead = function () {
            _this._state.s = (_this._state.s + 1) & 0xff;
            return _this._result.read(_this._popPcl, 0x0100 + _this._state.s);
        };
        this._popPcl = function (value) {
            _this._state.p = (_this._state.p & 0xff00) | value;
            _this._state.s = (_this._state.s + 1) & 0xff;
            return _this._result.read(_this._popPch, 0x0100 + _this._state.s);
        };
        this._popPch = function (value) {
            _this._state.p = (_this._state.p & 0xff) | (value << 8);
            return _this._result.read(_this._incrementP, _this._state.p);
        };
        this._incrementP = function () {
            _this._state.p = (_this._state.p + 1) & 0xffff;
            return null;
        };
        this._result = new ResultImpl_1.default();
        this._state = state;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_dummyOperandRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_dummyStackRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_popPcl", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_popPch", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_incrementP", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Rts.prototype, "_state", void 0);
    return Rts;
}());
exports.rts = function (state) { return new Rts(state); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Write = (function () {
    function Write(state, operation) {
        var _this = this;
        this.reset = function (operand) {
            return _this._result.write(function () { return null; }, operand, _this._operation(_this._state));
        };
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._operation = operation;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Write.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Write.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Write.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Write.prototype, "_operation", void 0);
    return Write;
}());
exports.write = function (state, operation) { return new Write(state, operation); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function setFlagsNZ(operand, state) {
    state.flags =
        (state.flags & ~(128 | 2)) |
            (operand & 0x80) |
            (operand ? 0 : 2);
}
function genRmw(operand, state, operation) {
    var result = operation(operand);
    setFlagsNZ(result, state);
    return result;
}
exports.genRmw = genRmw;
function genNullary(state, operation) {
    setFlagsNZ(operation(state), state);
}
exports.genNullary = genNullary;
function genUnary(operand, state, operation) {
    setFlagsNZ(operation(operand, state), state);
    return null;
}
exports.genUnary = genUnary;
function adc(operand, state) {
    if (state.flags & 8) {
        var d0 = (operand & 0x0f) + (state.a & 0x0f) + (state.flags & 1), d1 = (operand >>> 4) + (state.a >>> 4) + (d0 > 9 ? 1 : 0);
        state.a = d0 % 10 | (d1 % 10 << 4);
        state.flags =
            (state.flags & ~(128 | 2 | 1)) |
                (state.a & 0x80) |
                (state.a ? 0 : 2) |
                (d1 > 9 ? 1 : 0);
    }
    else {
        var sum = state.a + operand + (state.flags & 1), result = sum & 0xff;
        state.flags =
            (state.flags &
                ~(128 | 2 | 1 | 64)) |
                (result & 0x80) |
                (result ? 0 : 2) |
                (sum >>> 8) |
                ((~(operand ^ state.a) & (result ^ operand) & 0x80) >>> 1);
        state.a = result;
    }
    return null;
}
exports.adc = adc;
function aslImmediate(state) {
    var old = state.a;
    state.a = (state.a << 1) & 0xff;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old >>> 7);
}
exports.aslImmediate = aslImmediate;
function aslRmw(operand, state) {
    var result = (operand << 1) & 0xff;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (result & 0x80) |
            (result ? 0 : 2) |
            (operand >>> 7);
    return result;
}
exports.aslRmw = aslRmw;
function bit(operand, state) {
    state.flags =
        (state.flags & ~(128 | 64 | 2)) |
            (operand & (128 | 64)) |
            (operand & state.a ? 0 : 2);
    return null;
}
exports.bit = bit;
function cmp(operand, state, getRegister) {
    var diff = getRegister(state) + (~operand & 0xff) + 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (diff & 0x80) |
            (diff & 0xff ? 0 : 2) |
            (diff >>> 8);
}
exports.cmp = cmp;
function sbc(operand, state) {
    if (state.flags & 8) {
        var d0 = (state.a & 0x0f) - (operand & 0x0f) - (~state.flags & 1), d1 = (state.a >>> 4) - (operand >>> 4) - (d0 < 0 ? 1 : 0);
        state.a = (d0 < 0 ? 10 + d0 : d0) | ((d1 < 0 ? 10 + d1 : d1) << 4);
        state.flags =
            (state.flags & ~(128 | 2 | 1)) |
                (state.a & 0x80) |
                (state.a ? 0 : 2) |
                (d1 < 0 ? 0 : 1);
    }
    else {
        operand = ~operand & 0xff;
        var sum = state.a + operand + (state.flags & 1), result = sum & 0xff;
        state.flags =
            (state.flags &
                ~(128 | 2 | 1 | 64)) |
                (result & 0x80) |
                (result ? 0 : 2) |
                (sum >>> 8) |
                ((~(operand ^ state.a) & (result ^ operand) & 0x80) >>> 1);
        state.a = result;
    }
    return null;
}
exports.sbc = sbc;
function lsrImmediate(state) {
    var old = state.a;
    state.a = state.a >>> 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old & 1);
}
exports.lsrImmediate = lsrImmediate;
function lsrRmw(operand, state) {
    var result = operand >>> 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (result & 0x80) |
            (result ? 0 : 2) |
            (operand & 1);
    return result;
}
exports.lsrRmw = lsrRmw;
function rolImmediate(state) {
    var old = state.a;
    state.a = ((state.a << 1) & 0xff) | (state.flags & 1);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old >>> 7);
}
exports.rolImmediate = rolImmediate;
function rolRmw(operand, state) {
    var result = ((operand << 1) & 0xff) | (state.flags & 1);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (result & 0x80) |
            (result ? 0 : 2) |
            (operand >>> 7);
    return result;
}
exports.rolRmw = rolRmw;
function rorImmediate(state) {
    var old = state.a;
    state.a = (state.a >>> 1) | ((state.flags & 1) << 7);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (old & 1);
}
exports.rorImmediate = rorImmediate;
function rorRmw(operand, state) {
    var result = (operand >>> 1) | ((state.flags & 1) << 7);
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (result & 0x80) |
            (result ? 0 : 2) |
            (operand & 1);
    return result;
}
exports.rorRmw = rorRmw;
function arr(operand, state) {
    state.a = ((state.a & operand) >>> 1) | (state.flags & 1 ? 0x80 : 0);
    state.flags =
        (state.flags & ~(1 | 128 | 2 | 64)) |
            ((state.a & 0x40) >>> 6) |
            (state.a ? 0 : 2) |
            (state.a & 0x80) |
            ((state.a & 0x40) ^ ((state.a & 0x20) << 1));
}
exports.arr = arr;
function alr(operand, state) {
    var i = state.a & operand;
    state.a = i >>> 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2) |
            (i & 1);
    return null;
}
exports.alr = alr;
function dcp(operand, state) {
    var result = (operand + 0xff) & 0xff;
    var diff = state.a + (~result & 0xff) + 1;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (diff & 0x80) |
            (diff & 0xff ? 0 : 2) |
            (diff >>> 8);
    return result;
}
exports.dcp = dcp;
function axs(operand, state) {
    var value = (state.a & state.x) + (~operand & 0xff) + 1;
    state.x = value & 0xff;
    state.flags =
        (state.flags & ~(128 | 2 | 1)) |
            (state.x & 0x80) |
            (state.x & 0xff ? 0 : 2) |
            (value >>> 8);
    return null;
}
exports.axs = axs;
function rra(operand, state) {
    var result = (operand >>> 1) | ((state.flags & 1) << 7);
    state.flags = (state.flags & ~1) | (operand & 1);
    adc(result, state);
    return result;
}
exports.rra = rra;
function rla(operand, state) {
    var result = ((operand << 1) & 0xff) | (state.flags & 1);
    state.flags = (state.flags & ~1) | (operand >>> 7);
    setFlagsNZ((state.a &= result), state);
    return result;
}
exports.rla = rla;
function slo(operand, state) {
    state.flags = (state.flags & ~1) | (operand >>> 7);
    var result = (operand << 1) & 0xff;
    state.a = state.a | result;
    setFlagsNZ(state.a, state);
    return result;
}
exports.slo = slo;
function aax(state) {
    var result = state.a & state.x;
    setFlagsNZ(result, state);
    return result;
}
exports.aax = aax;
function isc(operand, state) {
    var result = (operand + 1) & 0xff;
    sbc(result, state);
    return result;
}
exports.isc = isc;
function aac(operand, state) {
    state.a &= operand;
    setFlagsNZ(state.a, state);
    state.flags = (state.flags & ~1) | ((state.a & 0x80) >>> 7);
    return null;
}
exports.aac = aac;

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Boot = (function () {
    function Boot(state) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._pre1Step, 0xff); };
        this._pre1Step = function () { return _this._result.read(_this._pre2Step, 0x0ff); };
        this._pre2Step = function () { return _this._result.read(_this._stack1Step, 0x0100); };
        this._stack1Step = function () { return _this._result.read(_this._stack2Step, 0x01ff); };
        this._stack2Step = function () {
            _this._state.s = 0xfd;
            return _this._result.read(_this._stack3Step, 0x01fe);
        };
        this._stack3Step = function () { return _this._result.read(_this._readTargetLoStep, 0xfffc); };
        this._readTargetLoStep = function (operand) {
            _this._targetAddress = operand;
            return _this._result.read(_this._readTargetHiStep, 0xfffd);
        };
        this._readTargetHiStep = function (operand) {
            _this._targetAddress |= operand << 8;
            _this._state.p = _this._targetAddress;
            return null;
        };
        this._targetAddress = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_pre1Step", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_pre2Step", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_stack1Step", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_stack2Step", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_stack3Step", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_readTargetLoStep", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_readTargetHiStep", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Boot.prototype, "_state", void 0);
    return Boot;
}());
exports.boot = function (state) { return new Boot(state); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var boot_1 = require("./boot");
exports.boot = boot_1.boot;
var interrupt_1 = require("./interrupt");
exports.brk = interrupt_1.brk;
exports.nmi = interrupt_1.nmi;
exports.irq = interrupt_1.irq;

},{"./boot":38,"./interrupt":40}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ResultImpl_1 = require("../ResultImpl");
var decorators_1 = require("../../../../tools/decorators");
var Interrupt = (function () {
    function Interrupt(state, defaultVector, isBrk) {
        var _this = this;
        this.reset = function () { return _this._result.read(_this._dummyRead, _this._state.p); };
        this._dummyRead = function () {
            if (_this._isBrk) {
                _this._state.p = (_this._state.p + 1) & 0xffff;
            }
            return _this._result.write(_this._pushPch, 0x0100 + _this._state.s, _this._state.p >>> 8);
        };
        this._pushPch = function () {
            _this._state.s = (_this._state.s - 1) & 0xff;
            return _this._result.write(_this._pushPcl, 0x0100 + _this._state.s, _this._state.p & 0xff).poll(true);
        };
        this._pushPcl = function () {
            _this._state.s = (_this._state.s - 1) & 0xff;
            _this._vector = _this._state.nmi ? 0xfffa : _this._defaultVector;
            return _this._result.write(_this._pushFlags, 0x0100 + _this._state.s, _this._isBrk ? _this._state.flags | 16 : _this._state.flags & ~16);
        };
        this._pushFlags = function () {
            _this._state.s = (_this._state.s - 1) & 0xff;
            return _this._result.read(_this._fetchPcl, _this._vector);
        };
        this._fetchPcl = function (value) {
            _this._state.flags |= 4;
            _this._state.p = value;
            return _this._result.read(_this._fetchPch, ++_this._vector);
        };
        this._fetchPch = function (value) {
            _this._state.p = _this._state.p | (value << 8);
            _this._state.nmi = _this._state.irq = false;
            return null;
        };
        this._vector = 0;
        this._result = new ResultImpl_1.default();
        this._state = state;
        this._defaultVector = defaultVector;
        this._isBrk = isBrk;
        decorators_1.freezeImmutables(this);
    }
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "reset", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_dummyRead", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_pushPch", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_pushPcl", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_pushFlags", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_fetchPcl", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_fetchPch", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_result", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_state", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_defaultVector", void 0);
    tslib_1.__decorate([
        decorators_1.Immutable
    ], Interrupt.prototype, "_isBrk", void 0);
    return Interrupt;
}());
exports.brk = function (state) { return new Interrupt(state, 0xfffe, true); };
exports.irq = function (state) { return new Interrupt(state, 0xfffe, false); };
exports.nmi = function (state) { return new Interrupt(state, 0xfffa, false); };

},{"../../../../tools/decorators":51,"../ResultImpl":16,"tslib":6}],41:[function(require,module,exports){
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

},{"./Switch":43}],42:[function(require,module,exports){
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

},{"./Switch":43,"microevent.ts":4}],43:[function(require,module,exports){
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

},{"microevent.ts":4}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Factory_1 = require("../cpu/Factory");
var Config;
(function (Config) {
    function create(config) {
        if (config === void 0) { config = {}; }
        return tslib_1.__assign({ tvMode: 0, enableAudio: true, randomSeed: -1, emulatePaddles: true, frameStart: -1, pcmAudio: false, cpuType: Factory_1.default.Type.stateMachine }, config);
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

},{"../cpu/Factory":11,"tslib":6}],45:[function(require,module,exports){
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

},{"../io/Switch":43}],46:[function(require,module,exports){
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

},{}],47:[function(require,module,exports){
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

},{"../../../tools/AudioOutputBuffer":48,"../../../tools/base64":50,"../Config":44}],48:[function(require,module,exports){
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

},{}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var immutables = Symbol('immutable properties');
function freezeImmutables(target) {
    var e_1, _a;
    var immutableProperties = target[immutables];
    if (!immutableProperties) {
        return;
    }
    try {
        for (var immutableProperties_1 = tslib_1.__values(immutableProperties), immutableProperties_1_1 = immutableProperties_1.next(); !immutableProperties_1_1.done; immutableProperties_1_1 = immutableProperties_1.next()) {
            var prop = immutableProperties_1_1.value;
            Object.defineProperty(target, prop, { writable: false, configurable: false });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (immutableProperties_1_1 && !immutableProperties_1_1.done && (_a = immutableProperties_1.return)) _a.call(immutableProperties_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
exports.freezeImmutables = freezeImmutables;
function Immutable(target, prop) {
    if (!target[immutables]) {
        Object.defineProperty(target, immutables, { value: [], writable: false, enumerable: false });
    }
    target[immutables].push(prop);
}
exports.Immutable = Immutable;

},{"tslib":6}],52:[function(require,module,exports){
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

},{"./PoolMember":53,"microevent.ts":4}],53:[function(require,module,exports){
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

},{}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var screenfull = require("screenfull");
var noFullscrenApi = !!navigator.platform.match(/iPhone|iPad|iPod/);
var FullscreenVideoDriver = (function () {
    function FullscreenVideoDriver(_videoDriver, _zIndex, _fullscreenClass) {
        if (_zIndex === void 0) { _zIndex = 100000; }
        if (_fullscreenClass === void 0) { _fullscreenClass = 'stellerator-fullscreen'; }
        var _this = this;
        this._videoDriver = _videoDriver;
        this._zIndex = _zIndex;
        this._fullscreenClass = _fullscreenClass;
        this._resizeListener = function () {
            if (_this._resizeHandle) {
                return;
            }
            _this._resizeHandle = setTimeout(function () {
                _this._resizeHandle = null;
                _this._adjustSizeForFullscreen();
            }, 100);
        };
        this._resizeHandle = null;
        this._changeListener = this._onChange.bind(this);
        this._engaged = false;
    }
    FullscreenVideoDriver.prototype.engage = function () {
        if (this._engaged) {
            return;
        }
        this._engaged = true;
        if (noFullscrenApi || !screenfull) {
            this._adjustSizeForFullscreen();
            window.addEventListener('resize', this._resizeListener);
            this._engaged = true;
        }
        else {
            screenfull.on('change', this._changeListener);
            screenfull.request(this._videoDriver.getCanvas());
        }
    };
    FullscreenVideoDriver.prototype.disengage = function () {
        if (!this._engaged) {
            return;
        }
        if (noFullscrenApi || !screenfull) {
            this._resetSize();
            window.removeEventListener('resize', this._resizeListener);
            this._engaged = false;
        }
        else {
            screenfull.exit();
        }
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
        if (!screenfull) {
            return;
        }
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
        if (this._resizeHandle) {
            clearTimeout(this._resizeHandle);
            this._resizeHandle = null;
        }
        element.style.width = '';
        element.style.height = '';
        element.style.maxWidth = '';
        element.style.maxHeight = '';
        if (noFullscrenApi) {
            element.style.position = '';
            element.style.top = '';
            element.style.left = '';
            element.style.zIndex = '';
        }
        document.body.classList.remove(this._fullscreenClass);
        setTimeout(function () { return _this._videoDriver.resize(); }, 0);
    };
    FullscreenVideoDriver.prototype._adjustSizeForFullscreen = function () {
        var element = this._videoDriver.getCanvas();
        this._videoDriver.resize(window.innerWidth, window.innerHeight);
        element.style.width = window.innerWidth + 'px';
        element.style.height = window.innerHeight + 'px';
        element.style.maxWidth = window.innerWidth + 'px';
        element.style.maxHeight = window.innerHeight + 'px';
        if (noFullscrenApi) {
            element.style.position = 'fixed';
            element.style.top = '0';
            element.style.left = '0';
            element.style.zIndex = '' + this._zIndex;
        }
        document.body.classList.add(this._fullscreenClass);
    };
    return FullscreenVideoDriver;
}());
exports.default = FullscreenVideoDriver;

},{"screenfull":5}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var ShadowSwitch_1 = require("./gamepad/ShadowSwitch");
var defaultMapping_1 = require("./gamepad/defaultMapping");
var MIN_POLL_INTERVAL = 50;
exports.joystickTargets = [
    "left",
    "right",
    "up",
    "down",
    "fire",
    "start",
    "select",
    "pause"
];
exports.auxTargets = ["start", "select", "pause"];
function readButton(button) {
    return typeof button === 'object' ? button.pressed : button > 0.5;
}
var GamepadDriver = (function () {
    function GamepadDriver() {
        var _this = this;
        this._onGamepadConnect = function () { return _this.probeGamepads(); };
        this._onGamepadDisconnect = function () { return _this.probeGamepads(); };
        this.gamepadCountChanged = new microevent_ts_1.Event();
        this._shadows = null;
        this._mappings = new Map();
        this._mappingStates = new WeakMap();
        this._mappingTargets = new WeakMap();
        this._bound = false;
        this._joysticks = [];
        this._auxSwitches = {};
        this._gamepadCount = 0;
        this._lastPoll = 0;
        this.setMapping(defaultMapping_1.defaultMapping);
    }
    GamepadDriver.prototype.init = function () {
        if (!navigator.getGamepads) {
            throw new Error("gamepad API not available");
        }
        this.probeGamepads();
        window.addEventListener('gamepadconnected', this._onGamepadConnect);
        window.addEventListener('gamepaddisconnected', this._onGamepadDisconnect);
    };
    GamepadDriver.prototype.deinit = function () {
        this.unbind();
        window.removeEventListener('gamepadconnected', this._onGamepadConnect);
        window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnect);
    };
    GamepadDriver.prototype.bind = function (joysticks, auxSwitches) {
        var _this = this;
        if (joysticks === void 0) { joysticks = []; }
        if (auxSwitches === void 0) { auxSwitches = {}; }
        if (this._bound) {
            return;
        }
        this._bound = true;
        this._joysticks = joysticks;
        this._auxSwitches = auxSwitches;
        this._bound = true;
        this._shadows = new WeakMap();
        this._controlledSwitches().forEach(function (swtch) {
            var shadow = new ShadowSwitch_1.default();
            _this._shadows.set(swtch, shadow);
            shadow.setState(swtch.read());
            swtch.beforeRead.addHandler(GamepadDriver._onBeforeSwitchRead, _this);
        });
    };
    GamepadDriver.prototype.unbind = function () {
        var _this = this;
        if (!this._bound) {
            return;
        }
        this._controlledSwitches().forEach(function (swtch) {
            return swtch.beforeRead.removeHandler(GamepadDriver._onBeforeSwitchRead, _this);
        });
        this._shadows = null;
        this._auxSwitches = {};
        this._joysticks = [];
        this._bound = false;
    };
    GamepadDriver.prototype.getGamepadCount = function () {
        return this._gamepadCount;
    };
    GamepadDriver.prototype.setMapping = function (mapping, id) {
        var e_1, _a;
        if (typeof id !== 'undefined') {
            this._mappings.set(id, mapping);
        }
        var states = new Map();
        var targets = [];
        try {
            for (var mapping_1 = tslib_1.__values(mapping), mapping_1_1 = mapping_1.next(); !mapping_1_1.done; mapping_1_1 = mapping_1.next()) {
                var m = mapping_1_1.value;
                if (targets.indexOf(m.target)) {
                    targets.push(m.target);
                    states.set(m.target, false);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (mapping_1_1 && !mapping_1_1.done && (_a = mapping_1.return)) _a.call(mapping_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this._mappingStates.set(mapping, states);
        this._mappingTargets.set(mapping, targets);
    };
    GamepadDriver.prototype.clearMapping = function (id) {
        this._mappings.delete(id);
    };
    GamepadDriver.prototype.poll = function () {
        this._readGamepads();
    };
    GamepadDriver._onBeforeSwitchRead = function (swtch, self) {
        self.poll();
    };
    GamepadDriver.prototype.probeGamepads = function () {
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
    GamepadDriver.prototype._getSwitchForTarget = function (target, joystick) {
        if (joystick === void 0) { joystick = null; }
        if (this._auxSwitches[target]) {
            return this._auxSwitches[target];
        }
        if (!joystick) {
            return null;
        }
        switch (target) {
            case "up":
                return joystick.getUp();
            case "down":
                return joystick.getDown();
            case "left":
                return joystick.getLeft();
            case "right":
                return joystick.getRight();
            case "fire":
                return joystick.getFire();
            default:
                return null;
        }
    };
    GamepadDriver.prototype._controlledSwitches = function () {
        var _this = this;
        var e_2, _a;
        var switches = tslib_1.__spread(Object.keys(this._auxSwitches).map(function (target) { return _this._auxSwitches[target]; }));
        try {
            for (var _b = tslib_1.__values(this._joysticks), _c = _b.next(); !_c.done; _c = _b.next()) {
                var joystick = _c.value;
                switches.push(joystick.getLeft(), joystick.getRight(), joystick.getUp(), joystick.getDown(), joystick.getFire());
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return switches;
    };
    GamepadDriver.prototype._readGamepads = function () {
        var e_3, _a, e_4, _b, e_5, _c;
        var now = Date.now();
        if (this._gamepadCount === 0 || now - this._lastPoll < MIN_POLL_INTERVAL) {
            return;
        }
        this._lastPoll = now;
        var gamepads = navigator.getGamepads();
        var joystickIndex = 0;
        for (var i = 0; i < gamepads.length; i++) {
            var gamepad = gamepads[i];
            if (!gamepad) {
                continue;
            }
            var mapping = this._mappings.get(gamepad.id) || defaultMapping_1.defaultMapping;
            var states = this._mappingStates.get(mapping);
            var targets = this._mappingTargets.get(mapping);
            try {
                for (var targets_1 = tslib_1.__values(targets), targets_1_1 = targets_1.next(); !targets_1_1.done; targets_1_1 = targets_1.next()) {
                    var target = targets_1_1.value;
                    states.set(target, false);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (targets_1_1 && !targets_1_1.done && (_a = targets_1.return)) _a.call(targets_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                for (var mapping_2 = tslib_1.__values(mapping), mapping_2_1 = mapping_2.next(); !mapping_2_1.done; mapping_2_1 = mapping_2.next()) {
                    var mappingEntry = mapping_2_1.value;
                    switch (mappingEntry.type) {
                        case "button":
                            var button = gamepad.buttons[mappingEntry.index];
                            if (typeof button !== 'undefined' && readButton(button)) {
                                states.set(mappingEntry.target, true);
                            }
                            break;
                        case "axis":
                            var axis = gamepad.axes[mappingEntry.index];
                            if (typeof axis !== 'undefined' &&
                                (mappingEntry.sign === "positive" ? axis > 0.5 : axis < -0.5)) {
                                states.set(mappingEntry.target, true);
                            }
                            break;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (mapping_2_1 && !mapping_2_1.done && (_b = mapping_2.return)) _b.call(mapping_2);
                }
                finally { if (e_4) throw e_4.error; }
            }
            try {
                for (var targets_2 = tslib_1.__values(targets), targets_2_1 = targets_2.next(); !targets_2_1.done; targets_2_1 = targets_2.next()) {
                    var target = targets_2_1.value;
                    var swtch = this._getSwitchForTarget(target, this._joysticks[joystickIndex]);
                    if (!swtch) {
                        continue;
                    }
                    var shadow = this._shadows.get(swtch);
                    shadow.toggle(states.get(target));
                    shadow.sync(swtch);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (targets_2_1 && !targets_2_1.done && (_c = targets_2.return)) _c.call(targets_2);
                }
                finally { if (e_5) throw e_5.error; }
            }
            joystickIndex++;
        }
    };
    return GamepadDriver;
}());
exports.default = GamepadDriver;

},{"./gamepad/ShadowSwitch":63,"./gamepad/defaultMapping":64,"microevent.ts":4,"tslib":6}],56:[function(require,module,exports){
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

},{}],57:[function(require,module,exports){
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
        if (this._video) {
            var w = this._video.getWidth(), h = this._video.getHeight();
            if (height * this._aspect <= width) {
                if (height >= 3 * h && height * this._aspect >= 3 * w) {
                    pixelRatio = 1;
                }
            }
            else {
                if (width >= 3 * w && width / this._aspect >= 3 * h) {
                    pixelRatio = 1;
                }
            }
        }
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
        var e_1, _a;
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
    };
    return SimpleCanvasVideo;
}());
exports.default = SimpleCanvasVideo;

},{"tslib":6}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var async_mutex_1 = require("async-mutex");
var WaveformChannel_1 = require("./audio/WaveformChannel");
var PCMChannel_1 = require("./audio/PCMChannel");
var audioNeedsInteraction = !!navigator.platform.match(/iPhone|iPad|iPod/) || !!window.safari;
var INTERACTION_EVENTS = ['touchstart', 'click', 'keydown'];
var audioContextCtor = window.AudioContext || window.webkitAudioContext;
var PreallocatedContext = (function () {
    function PreallocatedContext() {
        var _this = this;
        this._interactionListener = function () {
            var context = _this.context;
            _this.interactionRequired = false;
            INTERACTION_EVENTS.forEach(function (event) { return document.removeEventListener(event, _this._interactionListener); });
            _this.mutex.runExclusive(function () {
                context.resume();
                return new Promise(function (r) {
                    return setTimeout(function () {
                        context.suspend();
                        r();
                    }, 100);
                });
            });
        };
        this.mutex = new async_mutex_1.Mutex();
        this.context = null;
        this.interactionRequired = true;
        if (!audioContextCtor) {
            return;
        }
        this.context = new audioContextCtor();
        try {
            this.context.destination.channelCount = 1;
        }
        catch (e) {
            console.warn('audio driver: failed to set channel count');
        }
        INTERACTION_EVENTS.forEach(function (event) { return document.addEventListener(event, _this._interactionListener); });
    }
    PreallocatedContext.prototype.stopListening = function () {
        var _this = this;
        INTERACTION_EVENTS.forEach(function (event) { return document.removeEventListener(event, _this._interactionListener); });
    };
    return PreallocatedContext;
}());
var preallocatedContext = audioNeedsInteraction ? new PreallocatedContext() : null;
var WebAudioDriver = (function () {
    function WebAudioDriver(waveformChannels, pcmChannels, fragmentSize) {
        if (waveformChannels === void 0) { waveformChannels = 0; }
        if (pcmChannels === void 0) { pcmChannels = 0; }
        var _this = this;
        this._touchListener = function () {
            INTERACTION_EVENTS.forEach(function (event) { return document.removeEventListener(event, _this._touchListener, true); });
            if (!_this._context) {
                return;
            }
            _this._context.resume();
            setTimeout(function () {
                _this._mutex.runExclusive(function () { return (_this._suspended ? _this._context.suspend() : _this._context.resume()); });
            }, 10);
        };
        this._context = null;
        this._merger = null;
        this._waveformChannels = null;
        this._pcmChannels = null;
        this._channels = null;
        this._cache = new Map();
        this._mutex = new async_mutex_1.Mutex();
        this._suspended = true;
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
        if (preallocatedContext) {
            var p = preallocatedContext;
            preallocatedContext = new PreallocatedContext();
            this._context = p.context;
            p.stopListening();
            this._mutex = p.mutex;
            if (p.interactionRequired) {
                INTERACTION_EVENTS.forEach(function (event) { return document.addEventListener(event, _this._touchListener, true); });
            }
        }
        else {
            if (!audioContextCtor) {
                throw new Error("web audio is not supported by runtime");
            }
            this._context = new audioContextCtor();
            try {
                this._context.destination.channelCount = 1;
            }
            catch (e) {
                console.warn('audio driver: failed to set channel count');
            }
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
            _this._suspended = true;
            return new Promise(function (resolve) {
                _this._context.suspend().then(resolve, resolve);
                setTimeout(resolve, 200);
            });
        });
    };
    WebAudioDriver.prototype.resume = function () {
        var _this = this;
        return this._mutex.runExclusive(function () {
            _this._suspended = false;
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

},{"./audio/PCMChannel":60,"./audio/WaveformChannel":61,"async-mutex":2,"tslib":6}],59:[function(require,module,exports){
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

},{}],60:[function(require,module,exports){
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

},{"../../../tools/RingBuffer":49,"./LinearResampler":59}],61:[function(require,module,exports){
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

},{}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function button(index, target) {
    return {
        type: "button",
        index: index,
        target: target
    };
}
exports.button = button;
function axis(index, sign, target) {
    return {
        type: "axis",
        index: index,
        sign: sign,
        target: target
    };
}
exports.axis = axis;

},{}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = ShadowSwitch;

},{}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Mapping_1 = require("./Mapping");
exports.defaultMapping = tslib_1.__spread([
    Mapping_1.button(12, "up"),
    Mapping_1.button(13, "down"),
    Mapping_1.button(14, "left"),
    Mapping_1.button(15, "right"),
    Mapping_1.button(8, "select"),
    Mapping_1.button(9, "start")
], [0, 1, 2, 3, 10, 11].map(function (i) { return Mapping_1.button(i, "fire"); }), [4, 5, 6, 7].map(function (i) { return Mapping_1.button(i, "pause"); }), [
    Mapping_1.axis(0, "negative", "left"),
    Mapping_1.axis(0, "positive", "right"),
    Mapping_1.axis(1, "negative", "up"),
    Mapping_1.axis(1, "positive", "down"),
    Mapping_1.axis(2, "negative", "left"),
    Mapping_1.axis(2, "positive", "right"),
    Mapping_1.axis(3, "negative", "up"),
    Mapping_1.axis(3, "positive", "down")
]);
exports.default = exports.defaultMapping;

},{"./Mapping":62,"tslib":6}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var shader_1 = require("./shader");
var CONTEXT_IDS = ['webgl', 'experimental-webgl'];
var WebglVideoDriver = (function () {
    function WebglVideoDriver(_canvas, config) {
        var e_1, _a;
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
        if (this._video) {
            var w = this._video.getWidth(), h = this._video.getHeight();
            if (height * this._aspect <= width) {
                if (height >= 3 * h && height * this._aspect >= 3 * w) {
                    pixelRatio = 1;
                }
            }
            else {
                if (width >= 3 * w && width / this._aspect >= 3 * h) {
                    pixelRatio = 1;
                }
            }
        }
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

},{"./shader":66,"tslib":6}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vertexShader = "\n    attribute vec2 a_VertexPosition;\n    attribute vec2 a_TextureCoordinate;\n\n    varying vec2 v_TextureCoordinate;\n\n    void main() {\n        v_TextureCoordinate = a_TextureCoordinate;\n        gl_Position = vec4(a_VertexPosition, 0, 1);\n    }\n";
exports.fragmentShaderPlain = "\n    precision mediump float;\n\n    varying vec2 v_TextureCoordinate;\n\n    uniform sampler2D u_Sampler0;\n    uniform float u_Gamma;\n\n    void main() {\n        vec4 texel = texture2D(u_Sampler0, v_TextureCoordinate);\n\n        gl_FragColor = vec4(pow(texel.rgb, vec3(u_Gamma)), 1.);\n    }\n";
exports.fragmentShaderPov = "\n    precision mediump float;\n\n    varying vec2 v_TextureCoordinate;\n\n    uniform sampler2D u_Sampler0, u_Sampler1, u_Sampler2;\n    uniform float u_Gamma;\n\n    void main() {\n        vec4 compositedTexel =\n            0.4 * texture2D(u_Sampler0, v_TextureCoordinate) +\n            0.4 * texture2D(u_Sampler1, v_TextureCoordinate) +\n            0.2 * texture2D(u_Sampler2, v_TextureCoordinate);\n\n        gl_FragColor = vec4(pow(compositedTexel.rgb, vec3(u_Gamma)), 1.);\n    }\n";

},{}],67:[function(require,module,exports){
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

},{"./SwitchProxy":69}],68:[function(require,module,exports){
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
var TouchIO_1 = require("../../stella/driver/TouchIO");
var MouseAsPaddle_1 = require("../../driver/MouseAsPaddle");
var Gamepad_1 = require("../../driver/Gamepad");
var FullscreenVideo_1 = require("../../driver/FullscreenVideo");
var CartridgeInfo_1 = require("../../../machine/stella/cartridge/CartridgeInfo");
var Config_1 = require("../../../machine/stella/Config");
var base64_1 = require("../../../tools/base64");
var ControlPanelProxy_1 = require("./ControlPanelProxy");
var Factory_1 = require("../../../machine/cpu/Factory");
function cpuType(config) {
    if (config === void 0) { config = Stellerator.CpuAccuracy.cycle; }
    switch (config) {
        case Stellerator.CpuAccuracy.cycle:
            return Factory_1.default.Type.stateMachine;
        case Stellerator.CpuAccuracy.instruction:
            return Factory_1.default.Type.batchedAccess;
        default:
            throw new Error("invalid CPU Accuracy: " + config);
    }
}
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
        this._touchIO = null;
        this._paddle = null;
        this._gamepad = null;
        this._controlPanel = new ControlPanelProxy_1.default();
        this._state = Stellerator.State.stopped;
        this._driverManager = new DriverManager_1.default();
        this._mutex = new async_mutex_1.Mutex();
        this._canvasElt = canvasElt;
        this._config = tslib_1.__assign({ smoothScaling: true, simulatePov: true, gamma: 1, audio: true, volume: 0.5, enableKeyboard: true, enableTouch: true, touchLeftHanded: false, touchJoystickSensitivity: 15, keyboardTarget: document, fullscreenViaKeyboard: true, paddleViaMouse: true, pauseViaKeyboard: true, pauseViaTouch: true, fullscreenViaTouch: true, enableGamepad: true, resetViaKeyboard: true }, config);
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
                        stellaConfig.cpuType = cpuType(config.cpuAccuracy);
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
        var pauseHandler = function () {
            switch (_this._emulationService.getState()) {
                case EmulationServiceInterface_1.default.State.paused:
                    _this.resume();
                    break;
                case EmulationServiceInterface_1.default.State.running:
                    _this.pause();
                    break;
            }
        };
        if (this._config.enableKeyboard) {
            this._keyboardIO = new KeyboardIO_1.default(this._config.keyboardTarget);
            this._driverManager.addDriver(this._keyboardIO, function (context) {
                return _this._keyboardIO.bind(context.getJoystick(0), context.getJoystick(1), context.getControlPanel());
            });
            if (this._config.fullscreenViaKeyboard) {
                this._keyboardIO.toggleFullscreen.addHandler(function () { return _this._fullscreenVideo.toggle(); });
            }
            if (this._config.pauseViaKeyboard) {
                this._keyboardIO.togglePause.addHandler(pauseHandler);
            }
        }
        if (this._config.resetViaKeyboard) {
            this._keyboardIO.hardReset.addHandler(function () { return _this.reset(); });
        }
        if (this._config.enableTouch) {
            this._touchIO = new TouchIO_1.default(this._canvasElt, this._config.touchJoystickSensitivity, this._config.touchLeftHanded);
            this._driverManager.addDriver(this._touchIO, function (context) {
                return _this._touchIO.bind(context.getJoystick(0), context.getControlPanel());
            });
            if (this._config.pauseViaTouch) {
                this._touchIO.togglePause.addHandler(pauseHandler);
            }
            if (this._config.fullscreenViaTouch) {
                this._touchIO.toggleFullscreen.addHandler(function () { return _this._fullscreenVideo.toggle(); });
            }
        }
        if (this._config.enableGamepad) {
            this._gamepad = new Gamepad_1.default();
            this._gamepad.init();
            this._driverManager.addDriver(this._gamepad, function (context) {
                var _a;
                return _this._gamepad.bind([context.getJoystick(0), context.getJoystick(1)], (_a = {},
                    _a["start"] = context.getControlPanel().getResetButton(),
                    _a["start"] = context.getControlPanel().getSelectSwitch(),
                    _a));
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
    var CpuAccuracy;
    (function (CpuAccuracy) {
        CpuAccuracy["cycle"] = "cycle";
        CpuAccuracy["instruction"] = "instruction";
    })(CpuAccuracy = Stellerator.CpuAccuracy || (Stellerator.CpuAccuracy = {}));
})(Stellerator || (Stellerator = {}));
exports.default = Stellerator;

},{"../../../machine/cpu/Factory":11,"../../../machine/stella/Config":44,"../../../machine/stella/cartridge/CartridgeInfo":46,"../../../tools/base64":50,"../../driver/FullscreenVideo":54,"../../driver/Gamepad":55,"../../driver/MouseAsPaddle":56,"../../driver/SimpleCanvasVideo":57,"../../driver/webgl/WebglVideo":65,"../../stella/driver/KeyboardIO":71,"../../stella/driver/TouchIO":72,"../../stella/driver/WebAudio":73,"../../stella/service/DriverManager":75,"../../stella/service/EmulationServiceInterface":76,"../../stella/service/worker/EmulationService":79,"./ControlPanelProxy":67,"async-mutex":2,"microevent.ts":4,"tslib":6}],69:[function(require,module,exports){
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

},{"microevent.ts":4}],70:[function(require,module,exports){
"use strict";
var Stellerator_1 = require("./Stellerator");
module.exports = {
    Stellerator: Stellerator_1.default
};

},{"./Stellerator":68}],71:[function(require,module,exports){
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
            var e_1, _a;
            if (!_this._compiledMappings.has(e.keyCode)) {
                return;
            }
            try {
                for (var _b = tslib_1.__values(_this._compiledMappings.get(e.keyCode).values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var action = _c.value;
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
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
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

},{"microevent.ts":4,"tslib":6}],72:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var DoubleTapDetector_1 = require("./touch/DoubleTapDetector");
var TouchIO = (function () {
    function TouchIO(_canvas, _joystickSensitivity, _leftHanded) {
        if (_joystickSensitivity === void 0) { _joystickSensitivity = 15; }
        if (_leftHanded === void 0) { _leftHanded = false; }
        var _this = this;
        this._canvas = _canvas;
        this._joystickSensitivity = _joystickSensitivity;
        this._leftHanded = _leftHanded;
        this._onTouchStart = function (e) {
            var cancel = false;
            for (var i = 0; i < e.changedTouches.length; i++) {
                var normalizedTouch = new NormalizedTouch(e.changedTouches.item(i), _this._canvas), id = normalizedTouch.touch.identifier;
                if (_this._leftHanded ? normalizedTouch.x > 0.5 : normalizedTouch.x <= 0.5) {
                    if (normalizedTouch.y <= 0.5) {
                        normalizedTouch.type = "alt";
                    }
                    else {
                        normalizedTouch.type = _this._isAlt ? "pause" : "fire";
                    }
                }
                else {
                    if (normalizedTouch.y <= 0.5) {
                        normalizedTouch.type = _this._isAlt ? "select" : "joystick";
                    }
                    else {
                        normalizedTouch.type = _this._isAlt ? "reset" : "joystick";
                    }
                }
                if (_this._pendingTouches.has(id) || _this._pendingTouches.has(normalizedTouch.type)) {
                    continue;
                }
                _this._pendingTouches.set(id, normalizedTouch);
                _this._pendingTouches.set(normalizedTouch.type, normalizedTouch);
                switch (normalizedTouch.type) {
                    case "alt":
                        _this._isAlt = true;
                        _this._fullscreenDoubleTapDetector.startTouch();
                        break;
                    case "fire":
                        _this._joystick.getFire().toggle(true);
                        break;
                    case "pause":
                        _this.togglePause.dispatch(undefined);
                        _this._fullscreenDoubleTapDetector.cancelTouch();
                        break;
                    case "select":
                        _this._select.toggle(true);
                        _this._fullscreenDoubleTapDetector.cancelTouch();
                        break;
                    case "reset":
                        _this._reset.toggle(true);
                        _this._fullscreenDoubleTapDetector.cancelTouch();
                        break;
                    case "joystick":
                        break;
                    default:
                        throw new Error('invalid touch type');
                }
                if (_this._cancelEvent(normalizedTouch) || _this._fullscreenDoubleTapDetector.isDispatching()) {
                    cancel = true;
                }
            }
            if (cancel) {
                e.preventDefault();
            }
        };
        this._onTouchEnd = function (e) {
            var cancel = false;
            for (var i = 0; i < e.changedTouches.length; i++) {
                var normalizedTouch = _this._pendingTouches.get(e.changedTouches.item(i).identifier);
                if (!normalizedTouch) {
                    continue;
                }
                if (_this._cancelEvent(normalizedTouch) || _this._fullscreenDoubleTapDetector.isDispatching()) {
                    cancel = true;
                }
                switch (normalizedTouch.type) {
                    case "alt":
                        _this._isAlt = false;
                        _this._fullscreenDoubleTapDetector.endTouch();
                        break;
                    case "fire":
                        _this._joystick.getFire().toggle(false);
                        break;
                    case "select":
                        _this._select.toggle(false);
                        break;
                    case "reset":
                        _this._reset.toggle(false);
                        break;
                    case "joystick":
                        _this._joystick.getDown().toggle(false);
                        _this._joystick.getUp().toggle(false);
                        _this._joystick.getLeft().toggle(false);
                        _this._joystick.getRight().toggle(false);
                        break;
                    case "pause":
                        break;
                    default:
                        throw new Error('invalid touch type');
                }
                _this._pendingTouches.delete(normalizedTouch.type);
                _this._pendingTouches.delete(normalizedTouch.touch.identifier);
            }
            if (cancel) {
                e.preventDefault();
            }
        };
        this._onTouchMove = function (e) {
            var cancel = false;
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches.item(i), normalizedTouch = _this._pendingTouches.get(touch.identifier);
                if (!normalizedTouch) {
                    continue;
                }
                if (_this._cancelEvent(normalizedTouch)) {
                    cancel = true;
                }
                if (normalizedTouch.type !== "joystick") {
                    continue;
                }
                var deltaX = touch.clientX - normalizedTouch.touch.clientX, deltaY = touch.clientY - normalizedTouch.touch.clientY, abs = Math.sqrt(deltaX * deltaX + deltaY * deltaY), sin = Math.abs(deltaY / abs), cos = Math.abs(deltaX / abs), trigger = abs > _this._joystickSensitivity;
                _this._joystick.getLeft().toggle(trigger && deltaX < 0 && cos > 0.5);
                _this._joystick.getRight().toggle(trigger && deltaX > 0 && cos > 0.5);
                _this._joystick.getUp().toggle(trigger && deltaY < 0 && sin > 0.5);
                _this._joystick.getDown().toggle(trigger && deltaY > 0 && sin > 0.5);
            }
            if (cancel) {
                e.preventDefault();
            }
        };
        this.togglePause = new microevent_ts_1.Event();
        this._fullscreenDoubleTapDetector = new DoubleTapDetector_1.default();
        this._bound = false;
        this._joystick = null;
        this._select = null;
        this._reset = null;
        this._isAlt = false;
        this._pendingTouches = new Map();
        this.toggleFullscreen = this._fullscreenDoubleTapDetector.trigger;
    }
    TouchIO.prototype.bind = function (joystick, controlPanel) {
        if (this._bound) {
            return;
        }
        this._bound = true;
        this._joystick = joystick;
        this._select = controlPanel.getSelectSwitch();
        this._reset = controlPanel.getResetButton();
        this._bindListeners();
    };
    TouchIO.prototype.unbind = function () {
        if (!this._bound) {
            return;
        }
        this._unbindListeners();
        (this._bound = false), (this._joystick = this._reset = this._select = null);
    };
    TouchIO.prototype._bindListeners = function () {
        this._canvas.addEventListener('touchstart', this._onTouchStart);
        this._canvas.addEventListener('touchend', this._onTouchEnd);
        this._canvas.addEventListener('touchmove', this._onTouchMove);
    };
    TouchIO.prototype._unbindListeners = function () {
        this._canvas.removeEventListener('touchstart', this._onTouchStart);
        this._canvas.removeEventListener('touchend', this._onTouchEnd);
        this._canvas.removeEventListener('touchmove', this._onTouchMove);
    };
    TouchIO.prototype._cancelEvent = function (touch) {
        return touch.type !== "alt";
    };
    return TouchIO;
}());
var NormalizedTouch = (function () {
    function NormalizedTouch(touch, canvas) {
        this.touch = touch;
        this.type = "unknown";
        var boundingRect = canvas.getBoundingClientRect();
        this.x = (touch.clientX - boundingRect.left) / boundingRect.width;
        this.y = (touch.clientY - boundingRect.top) / boundingRect.height;
    }
    return NormalizedTouch;
}());
exports.default = TouchIO;

},{"./touch/DoubleTapDetector":74,"microevent.ts":4}],73:[function(require,module,exports){
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

},{"../../driver/WebAudio":58,"tslib":6}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var DoubleTapDetector = (function () {
    function DoubleTapDetector(_maxTapLength, _timeout) {
        if (_maxTapLength === void 0) { _maxTapLength = 500; }
        if (_timeout === void 0) { _timeout = 200; }
        this._maxTapLength = _maxTapLength;
        this._timeout = _timeout;
        this.trigger = new microevent_ts_1.Event();
        this._dispatch = false;
        this._touching = false;
        this._lastTouchEligible = false;
        this._lastTouchStart = 0;
        this._lastTouchEnd = 0;
    }
    DoubleTapDetector.prototype.startTouch = function () {
        this._lastTouchStart = Date.now();
        if (this._touching) {
            return;
        }
        this._touching = true;
        this._dispatch = this._lastTouchEligible && this._lastTouchStart - this._lastTouchEnd < this._timeout;
    };
    DoubleTapDetector.prototype.endTouch = function () {
        this._lastTouchEnd = Date.now();
        if (this._dispatch) {
            this._dispatch = false;
            this.trigger.dispatch(undefined);
        }
        if (!this._touching) {
            return;
        }
        this._touching = false;
        this._lastTouchEligible = this._lastTouchStart - this._lastTouchEnd < this._maxTapLength;
    };
    DoubleTapDetector.prototype.cancelTouch = function () {
        this.endTouch();
        this._lastTouchEligible = false;
    };
    DoubleTapDetector.prototype.isDispatching = function () {
        return this._dispatch;
    };
    return DoubleTapDetector;
}());
exports.default = DoubleTapDetector;

},{"microevent.ts":4}],75:[function(require,module,exports){
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

},{"./EmulationServiceInterface":76}],76:[function(require,module,exports){
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

},{}],77:[function(require,module,exports){
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

},{"../../../../machine/io/DigitalJoystick":41,"../../../../machine/io/Paddle":42,"../../../../machine/stella/ControlPanel":45,"./messages":83}],78:[function(require,module,exports){
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

},{}],79:[function(require,module,exports){
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

},{"../EmulationServiceInterface":76,"./ControlProxy":77,"./EmulationContext":78,"./PCMAudioProxy":80,"./VideoProxy":81,"./WaveformAudioProxy":82,"./messages":83,"async-mutex":2,"microevent.ts":4,"tslib":6,"worker-rpc":8}],80:[function(require,module,exports){
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

},{"../../../../tools/pool/Pool":52,"./messages":83,"microevent.ts":4,"tslib":6}],81:[function(require,module,exports){
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

},{"./messages":83,"microevent.ts":4,"tslib":6}],82:[function(require,module,exports){
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

},{"../../../../machine/stella/tia/ToneGenerator":47,"./messages":83,"microevent.ts":4,"tslib":6}],83:[function(require,module,exports){
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

},{}]},{},[70])(70)
});
//# sourceMappingURL=stellerator_embedded.js.map
