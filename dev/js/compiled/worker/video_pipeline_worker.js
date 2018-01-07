(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";
var Event_1 = require('./Event');
exports.Event = Event_1.default;

},{"./Event":1}],3:[function(require,module,exports){
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

},{"microevent.ts":2}],4:[function(require,module,exports){
"use strict";
var RpcProvider_1 = require('./RpcProvider');
exports.RpcProvider = RpcProvider_1.default;

},{"./RpcProvider":3}],5:[function(require,module,exports){
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

},{"./PoolMember":6,"microevent.ts":2}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var FrameMergeProcessor = (function () {
    function FrameMergeProcessor() {
        this.emit = new microevent_ts_1.Event();
        this._framesOnHold = new Array(2);
        this._nFramesOnHold = 0;
        this._width = 0;
        this._height = 0;
    }
    FrameMergeProcessor.prototype.init = function (width, height) {
        this.flush();
        this._width = width;
        this._height = height;
    };
    FrameMergeProcessor.prototype.flush = function () {
        for (var i = 0; i < this._nFramesOnHold; i++) {
            this._framesOnHold[i].release();
            this._framesOnHold[i] = null;
        }
        this._nFramesOnHold = 0;
    };
    FrameMergeProcessor.prototype.processSurface = function (wrappedSurface) {
        var surface = wrappedSurface.get();
        if (surface.getHeight() !== this._height || surface.getWidth() !== this._width) {
            throw new Error('surface dimensions do not match');
        }
        this._framesOnHold[this._nFramesOnHold++] = wrappedSurface;
        if (this._nFramesOnHold === 2) {
            this._process();
        }
    };
    FrameMergeProcessor.prototype._process = function () {
        var buffer0 = this._framesOnHold[0].get().getBuffer(), buffer1 = this._framesOnHold[1].get().getBuffer();
        for (var i = 0; i < this._width * this._height; i++) {
            buffer0[i] =
                0xff000000 |
                    ((((buffer0[i] & 0xff0000) + (buffer1[i] & 0xff0000)) >>> 1) & 0xff0000) |
                    ((((buffer0[i] & 0xff00) + (buffer1[i] & 0xff00)) >>> 1) & 0xff00) |
                    ((((buffer0[i] & 0xff) + (buffer1[i] & 0xff)) >>> 1) & 0xff);
        }
        this.emit.dispatch(this._framesOnHold[0]);
        this._framesOnHold[1].release();
        this._nFramesOnHold = 0;
    };
    return FrameMergeProcessor;
}());
exports.default = FrameMergeProcessor;

},{"microevent.ts":2}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var PassthroughProcessor = (function () {
    function PassthroughProcessor() {
        this.emit = new microevent_ts_1.Event();
    }
    PassthroughProcessor.prototype.init = function () { };
    PassthroughProcessor.prototype.flush = function () { };
    PassthroughProcessor.prototype.processSurface = function (surface) {
        this.emit.dispatch(surface);
    };
    return PassthroughProcessor;
}());
exports.default = PassthroughProcessor;

},{"microevent.ts":2}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Config = require("./config");
var PassthroughProcessor_1 = require("./PassthroughProcessor");
var FrameMergeProcessor_1 = require("./FrameMergeProcessor");
var ProcessorFactory = (function () {
    function ProcessorFactory() {
    }
    ProcessorFactory.prototype.create = function (config) {
        switch (config.type) {
            case 0:
                return new PassthroughProcessor_1.default();
            case 1:
                return new FrameMergeProcessor_1.default();
            default:
                throw new Error('cannot happen: invalid processor type');
        }
    };
    return ProcessorFactory;
}());
exports.default = ProcessorFactory;

},{"./FrameMergeProcessor":7,"./PassthroughProcessor":8,"./config":11}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ProcessorFactory_1 = require("./ProcessorFactory");
var ProcessorPipeline = (function () {
    function ProcessorPipeline(config) {
        var _this = this;
        if (!config || config.length === 0) {
            config = [{ type: 0 }];
        }
        var factory = new ProcessorFactory_1.default();
        this._processors = config.map(function (cfg) { return factory.create(cfg); });
        var _loop_1 = function (i) {
            this_1._processors[i - 1].emit.addHandler(function (surface) { return _this._processors[i].processSurface(surface); });
        };
        var this_1 = this;
        for (var i = 1; i < this._processors.length; i++) {
            _loop_1(i);
        }
        this.emit = this._processors[this._processors.length - 1].emit;
    }
    ProcessorPipeline.prototype.init = function (width, height) {
        this._processors.forEach(function (prc) { return prc.init(width, height); });
    };
    ProcessorPipeline.prototype.flush = function () {
        this._processors.forEach(function (prc) { return prc.flush(); });
    };
    ProcessorPipeline.prototype.processSurface = function (surface) {
        this._processors[0].processSurface(surface);
    };
    return ProcessorPipeline;
}());
exports.default = ProcessorPipeline;

},{"./ProcessorFactory":9}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ArrayBufferSurface_1 = require("../../surface/ArrayBufferSurface");
var Pool_1 = require("../../../tools/pool/Pool");
var messages = require("./messages");
var ProcessorPipeline_1 = require("../ProcessorPipeline");
var PipelineHost = (function () {
    function PipelineHost(_rpc) {
        this._rpc = _rpc;
        this._pipeline = null;
        this._surfacePool = new Pool_1.default(function () { return new ArrayBufferSurface_1.default(); });
        this._bufferIds = new WeakMap();
        this._rpc
            .registerRpcHandler(messages.messageIds.configure, this._onConfigure.bind(this))
            .registerRpcHandler(messages.messageIds.flush, this._onFlush.bind(this))
            .registerSignalHandler(messages.messageIds.process, this._onProcess.bind(this));
        this._surfacePool.event.release.addHandler(PipelineHost._onReleaseSurface, this);
    }
    PipelineHost._onReleaseSurface = function (surface, self) {
        var buffer = surface.getUnderlyingBuffer();
        if (!buffer) {
            return;
        }
        if (!self._bufferIds.has(buffer)) {
            throw new Error('double release');
        }
        var id = self._bufferIds.get(buffer);
        self._bufferIds.delete(buffer);
        self._rpc.signal(messages.messageIds.release, {
            id: id,
            buffer: buffer
        }, [buffer]);
    };
    PipelineHost._onEmitSurface = function (managedSurface, self) {
        var buffer = managedSurface.get().getUnderlyingBuffer();
        if (!self._bufferIds.has(buffer)) {
            throw new Error('double release');
        }
        var id = self._bufferIds.get(buffer);
        self._bufferIds.delete(buffer);
        self._rpc.signal(messages.messageIds.emit, {
            id: id,
            buffer: buffer
        }, [buffer]);
        managedSurface.get().resetUnderlyingBuffer();
        managedSurface.release();
    };
    PipelineHost.prototype._onConfigure = function (msg) {
        if (this._pipeline) {
            this._pipeline.flush();
            this._pipeline.emit.removeHandler(PipelineHost._onEmitSurface, this);
        }
        this._pipeline = new ProcessorPipeline_1.default(msg.config);
        this._pipeline.init(msg.width, msg.height);
        this._pipeline.emit.addHandler(PipelineHost._onEmitSurface, this);
    };
    PipelineHost.prototype._onFlush = function (msg) {
        if (this._pipeline) {
            this._pipeline.flush();
        }
    };
    PipelineHost.prototype._onProcess = function (msg) {
        if (!this._pipeline) {
            return;
        }
        this._bufferIds.set(msg.buffer, msg.id);
        var managedSurface = this._surfacePool.get();
        managedSurface.get().replaceUnderlyingBuffer(msg.width, msg.height, msg.buffer);
        this._pipeline.processSurface(managedSurface);
    };
    return PipelineHost;
}());
exports.default = PipelineHost;

},{"../../../tools/pool/Pool":5,"../../surface/ArrayBufferSurface":14,"../ProcessorPipeline":10,"./messages":13}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageIds = {
    configure: 'pipeline/configure',
    flush: 'pipeline/flush',
    process: 'pipeline/process',
    emit: 'pipeline/emit',
    release: 'pipeline/release'
};
Object.freeze(exports.messageIds);

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ArrayBufferSurface = (function () {
    function ArrayBufferSurface() {
        this._height = 0;
        this._width = 0;
        this._buffer = null;
    }
    ArrayBufferSurface.createFromArrayBuffer = function (width, height, buffer) {
        return new ArrayBufferSurface().replaceUnderlyingBuffer(width, height, buffer);
    };
    ArrayBufferSurface.prototype.replaceUnderlyingBuffer = function (width, height, buffer) {
        if (width * height * 4 !== buffer.byteLength) {
            throw new Error('surface size mismatch');
        }
        this._width = width;
        this._height = height;
        this._underlyingBuffer = buffer;
        this._buffer = new Uint32Array(this._underlyingBuffer);
        return this;
    };
    ArrayBufferSurface.prototype.getUnderlyingBuffer = function () {
        return this._underlyingBuffer;
    };
    ArrayBufferSurface.prototype.resetUnderlyingBuffer = function () {
        this._width = this._height = 0;
        this._underlyingBuffer = this._buffer = null;
        return this;
    };
    ArrayBufferSurface.prototype.getWidth = function () {
        return this._width;
    };
    ArrayBufferSurface.prototype.getHeight = function () {
        return this._height;
    };
    ArrayBufferSurface.prototype.getBuffer = function () {
        return this._buffer;
    };
    ArrayBufferSurface.prototype.getByteOrder = function () {
        return 0;
    };
    ArrayBufferSurface.prototype.fill = function (value) {
        for (var i = 0; i < this._buffer.length; i++) {
            this._buffer[i] = value;
        }
        return this;
    };
    return ArrayBufferSurface;
}());
exports.default = ArrayBufferSurface;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rpc_1 = require("../rpc");
var PipelineHost_1 = require("../../../src/video/processing/worker/PipelineHost");
exports.pipelineHost = new PipelineHost_1.default(rpc_1.getRpc());

},{"../../../src/video/processing/worker/PipelineHost":12,"../rpc":16}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var worker_rpc_1 = require("worker-rpc");
var rpcProvider = null, port = null, portPending = null;
function send(message, transfer) {
    if (port) {
        port.postMessage(message, transfer);
    }
    else {
        postMessage(message, transfer);
    }
    if (portPending) {
        port = portPending;
        port.onmessage = function (e) { return rpcProvider.dispatch(e.data); };
    }
    portPending = null;
}
rpcProvider = new worker_rpc_1.RpcProvider(send);
rpcProvider.error.addHandler(function (e) {
    console.log(e ? e.message : 'unknown rpc error');
});
onmessage = function (e) { return port || rpcProvider.dispatch(e.data); };
rpcProvider.registerRpcHandler('/use-port', function (newPort) {
    if (!(port || portPending)) {
        portPending = newPort;
        return Promise.resolve();
    }
    else {
        return Promise.reject('RPC already switched to message port');
    }
});
function getRpc() {
    return rpcProvider;
}
exports.getRpc = getRpc;

},{"worker-rpc":4}]},{},[15])
//# sourceMappingURL=video_pipeline_worker.js.map
