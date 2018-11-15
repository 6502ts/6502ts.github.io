require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],6:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":3,"ieee754":7}],7:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
"use strict";
var Event_1 = require('./Event');
exports.Event = Event_1.default;

},{"./Event":9}],11:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":12}],12:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
// A library of seedable RNGs implemented in Javascript.
//
// Usage:
//
// var seedrandom = require('seedrandom');
// var random = seedrandom(1); // or any seed.
// var x = random();       // 0 <= x < 1.  Every bit is random.
// var x = random.quick(); // 0 <= x < 1.  32 bits of randomness.

// alea, a 53-bit multiply-with-carry generator by Johannes Baagøe.
// Period: ~2^116
// Reported to pass all BigCrush tests.
var alea = require('./lib/alea');

// xor128, a pure xor-shift generator by George Marsaglia.
// Period: 2^128-1.
// Reported to fail: MatrixRank and LinearComp.
var xor128 = require('./lib/xor128');

// xorwow, George Marsaglia's 160-bit xor-shift combined plus weyl.
// Period: 2^192-2^32
// Reported to fail: CollisionOver, SimpPoker, and LinearComp.
var xorwow = require('./lib/xorwow');

// xorshift7, by François Panneton and Pierre L'ecuyer, takes
// a different approach: it adds robustness by allowing more shifts
// than Marsaglia's original three.  It is a 7-shift generator
// with 256 bits, that passes BigCrush with no systmatic failures.
// Period 2^256-1.
// No systematic BigCrush failures reported.
var xorshift7 = require('./lib/xorshift7');

// xor4096, by Richard Brent, is a 4096-bit xor-shift with a
// very long period that also adds a Weyl generator. It also passes
// BigCrush with no systematic failures.  Its long period may
// be useful if you have many generators and need to avoid
// collisions.
// Period: 2^4128-2^32.
// No systematic BigCrush failures reported.
var xor4096 = require('./lib/xor4096');

// Tyche-i, by Samuel Neves and Filipe Araujo, is a bit-shifting random
// number generator derived from ChaCha, a modern stream cipher.
// https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf
// Period: ~2^127
// No systematic BigCrush failures reported.
var tychei = require('./lib/tychei');

// The original ARC4-based prng included in this library.
// Period: ~2^1600
var sr = require('./seedrandom');

sr.alea = alea;
sr.xor128 = xor128;
sr.xorwow = xorwow;
sr.xorshift7 = xorshift7;
sr.xor4096 = xor4096;
sr.tychei = tychei;

module.exports = sr;

},{"./lib/alea":15,"./lib/tychei":16,"./lib/xor128":17,"./lib/xor4096":18,"./lib/xorshift7":19,"./lib/xorwow":20,"./seedrandom":21}],15:[function(require,module,exports){
// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.



(function(global, module, define) {

function Alea(seed) {
  var me = this, mash = Mash();

  me.next = function() {
    var t = 2091639 * me.s0 + me.c * 2.3283064365386963e-10; // 2^-32
    me.s0 = me.s1;
    me.s1 = me.s2;
    return me.s2 = t - (me.c = t | 0);
  };

  // Apply the seeding algorithm from Baagoe.
  me.c = 1;
  me.s0 = mash(' ');
  me.s1 = mash(' ');
  me.s2 = mash(' ');
  me.s0 -= mash(seed);
  if (me.s0 < 0) { me.s0 += 1; }
  me.s1 -= mash(seed);
  if (me.s1 < 0) { me.s1 += 1; }
  me.s2 -= mash(seed);
  if (me.s2 < 0) { me.s2 += 1; }
  mash = null;
}

function copy(f, t) {
  t.c = f.c;
  t.s0 = f.s0;
  t.s1 = f.s1;
  t.s2 = f.s2;
  return t;
}

function impl(seed, opts) {
  var xg = new Alea(seed),
      state = opts && opts.state,
      prng = xg.next;
  prng.int32 = function() { return (xg.next() * 0x100000000) | 0; }
  prng.double = function() {
    return prng() + (prng() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
  };
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  return mash;
}


if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.alea = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],16:[function(require,module,exports){
// A Javascript implementaion of the "Tyche-i" prng algorithm by
// Samuel Neves and Filipe Araujo.
// See https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var b = me.b, c = me.c, d = me.d, a = me.a;
    b = (b << 25) ^ (b >>> 7) ^ c;
    c = (c - d) | 0;
    d = (d << 24) ^ (d >>> 8) ^ a;
    a = (a - b) | 0;
    me.b = b = (b << 20) ^ (b >>> 12) ^ c;
    me.c = c = (c - d) | 0;
    me.d = (d << 16) ^ (c >>> 16) ^ a;
    return me.a = (a - b) | 0;
  };

  /* The following is non-inverted tyche, which has better internal
   * bit diffusion, but which is about 25% slower than tyche-i in JS.
  me.next = function() {
    var a = me.a, b = me.b, c = me.c, d = me.d;
    a = (me.a + me.b | 0) >>> 0;
    d = me.d ^ a; d = d << 16 ^ d >>> 16;
    c = me.c + d | 0;
    b = me.b ^ c; b = b << 12 ^ d >>> 20;
    me.a = a = a + b | 0;
    d = d ^ a; me.d = d = d << 8 ^ d >>> 24;
    me.c = c = c + d | 0;
    b = b ^ c;
    return me.b = (b << 7 ^ b >>> 25);
  }
  */

  me.a = 0;
  me.b = 0;
  me.c = 2654435769 | 0;
  me.d = 1367130551;

  if (seed === Math.floor(seed)) {
    // Integer seed.
    me.a = (seed / 0x100000000) | 0;
    me.b = seed | 0;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 20; k++) {
    me.b ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.a = f.a;
  t.b = f.b;
  t.c = f.c;
  t.d = f.d;
  return t;
};

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.tychei = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],17:[function(require,module,exports){
// A Javascript implementaion of the "xor128" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;

  // Set up generator function.
  me.next = function() {
    var t = me.x ^ (me.x << 11);
    me.x = me.y;
    me.y = me.z;
    me.z = me.w;
    return me.w ^= (me.w >>> 19) ^ t ^ (t >>> 8);
  };

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor128 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],18:[function(require,module,exports){
// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1004.3115v1.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 2.1 times slower than
// Javascript's built-in Math.random().

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function copy(f, t) {
  t.i = f.i;
  t.w = f.w;
  t.X = f.X.slice();
  return t;
};

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.X) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor4096 = impl;
}

})(
  this,                                     // window object or global
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);

},{}],19:[function(require,module,exports){
// A Javascript implementaion of the "xorshift7" algorithm by
// François Panneton and Pierre L'ecuyer:
// "On the Xorgshift Random Number Generators"
// http://saluc.engr.uconn.edu/refs/crypto/rng/panneton05onthexorshift.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    // Update xor generator.
    var X = me.x, i = me.i, t, v, w;
    t = X[i]; t ^= (t >>> 7); v = t ^ (t << 24);
    t = X[(i + 1) & 7]; v ^= t ^ (t >>> 10);
    t = X[(i + 3) & 7]; v ^= t ^ (t >>> 3);
    t = X[(i + 4) & 7]; v ^= t ^ (t << 7);
    t = X[(i + 7) & 7]; t = t ^ (t << 13); v ^= t ^ (t << 9);
    X[i] = v;
    me.i = (i + 1) & 7;
    return v;
  };

  function init(me, seed) {
    var j, w, X = [];

    if (seed === (seed | 0)) {
      // Seed state array using a 32-bit integer.
      w = X[0] = seed;
    } else {
      // Seed state using a string.
      seed = '' + seed;
      for (j = 0; j < seed.length; ++j) {
        X[j & 7] = (X[j & 7] << 15) ^
            (seed.charCodeAt(j) + X[(j + 1) & 7] << 13);
      }
    }
    // Enforce an array length of 8, not all zeroes.
    while (X.length < 8) X.push(0);
    for (j = 0; j < 8 && X[j] === 0; ++j);
    if (j == 8) w = X[7] = -1; else w = X[j];

    me.x = X;
    me.i = 0;

    // Discard an initial 256 values.
    for (j = 256; j > 0; --j) {
      me.next();
    }
  }

  init(me, seed);
}

function copy(f, t) {
  t.x = f.x.slice();
  t.i = f.i;
  return t;
}

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.x) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorshift7 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);


},{}],20:[function(require,module,exports){
// A Javascript implementaion of the "xorwow" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var t = (me.x ^ (me.x >>> 2));
    me.x = me.y; me.y = me.z; me.z = me.w; me.w = me.v;
    return (me.d = (me.d + 362437 | 0)) +
       (me.v = (me.v ^ (me.v << 4)) ^ (t ^ (t << 1))) | 0;
  };

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;
  me.v = 0;

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    if (k == strseed.length) {
      me.d = me.x << 10 ^ me.x >>> 4;
    }
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  t.v = f.v;
  t.d = f.d;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorwow = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],21:[function(require,module,exports){
/*
Copyright 2014 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

(function (pool, math) {
//
// The following constants are related to IEEE 754 limits.
//

// Detect the global object, even if operating in strict mode.
// http://stackoverflow.com/a/14387057/265298
var global = (0, eval)('this'),
    width = 256,        // each RC4 output is 0 <= x < 256
    chunks = 6,         // at least six RC4 outputs for each double
    digits = 52,        // there are 52 significant digits in a double
    rngname = 'random', // rngname: name for Math.random and Math.seedrandom
    startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,
    nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
function seedrandom(seed, options, callback) {
  var key = [];
  options = (options == true) ? { entropy: true } : (options || {});

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    options.entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  var prng = function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  prng.int32 = function() { return arc4.g(4) | 0; }
  prng.quick = function() { return arc4.g(4) / 0x100000000; }
  prng.double = prng;

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (options.pass || callback ||
      function(prng, seed, is_math_call, state) {
        if (state) {
          // Load the arc4 state from the given state if it has an S array.
          if (state.S) { copy(state, arc4); }
          // Only provide the .state method if requested via options.state.
          prng.state = function() { return copy(arc4, {}); }
        }

        // If called as a method of Math (Math.seedrandom()), mutate
        // Math.random because that is how seedrandom.js has worked since v1.0.
        if (is_math_call) { math[rngname] = prng; return seed; }

        // Otherwise, it is a newer calling convention, so return the
        // prng directly.
        else return prng;
      })(
  prng,
  shortseed,
  'global' in options ? options.global : (this == math),
  options.state);
}
math['seed' + rngname] = seedrandom;

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability, the function call below automatically
    // discards an initial batch of values.  This is called RC4-drop[256].
    // See http://google.com/search?q=rsa+fluhrer+response&btnI
  })(width);
}

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
function copy(f, t) {
  t.i = f.i;
  t.j = f.j;
  t.S = f.S.slice();
  return t;
};

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
function autoseed() {
  try {
    var out;
    if (nodecrypto && (out = nodecrypto.randomBytes)) {
      // The use of 'out' to remember randomBytes makes tight minified code.
      out = out(width);
    } else {
      out = new Uint8Array(width);
      (global.crypto || global.msCrypto).getRandomValues(out);
    }
    return tostring(out);
  } catch (e) {
    var browser = global.navigator,
        plugins = browser && browser.plugins;
    return [+new Date, global, plugins, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//
if ((typeof module) == 'object' && module.exports) {
  module.exports = seedrandom;
  // When in node.js, try using crypto package for autoseeding.
  try {
    nodecrypto = require('crypto');
  } catch (ex) {}
} else if ((typeof define) == 'function' && define.amd) {
  define(function() { return seedrandom; });
}

// End anonymous scope, and pass initial values.
})(
  [],     // pool: entropy pool starts empty
  Math    // math: package containing random, pow, and seedrandom
);

},{"crypto":4}],22:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.immediate = factory());
}(this, (function () { 'use strict';

var context = (function () {
  /* eslint no-eval: 0 */
  return this || (1, eval)('this');
})();

// @see http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/
var useNative = (function () {
  return !(context.navigator && /Trident|Edge/.test(context.navigator.userAgent));
})();

var nextId = 1;
var lock = false;
var TASKS = {};

function wrap(handler) {
  var args = Array.prototype.slice.call(arguments, 1);
  var len = args.length;

  return !len ? function () {
    return handler.call(undefined);
  } : len === 1 ? function () {
    return handler.call(undefined, args[0]);
  } : len === 2 ? function () {
    return handler.call(undefined, args[0], args[1]);
  } : len === 3 ? function () {
    return handler.call(undefined, args[0], args[1], args[2]);
  } : function () {
    return handler.apply(undefined, args);
  };
}

function create(args) {
  TASKS[nextId] = wrap.apply(undefined, args);
  return nextId++;
}

function clear(handleId) {
  delete TASKS[handleId];
}

function run(handleId) {
  if (lock) {
    context.setTimeout(wrap(run, handleId), 0);
  } else {
    var task = TASKS[handleId];

    if (task) {
      lock = true;

      try {
        task();
      } finally {
        clear(handleId);
        lock = false;
      }
    }
  }
}

function init() {
  var polifill = function polifill() {
    var handleId = create(arguments);
    context.setTimeout(wrap(run, handleId), 0);
    return handleId;
  };

  polifill.usePolifill = 'setTimeout';

  return polifill;
}

function canUse() {
  return 'setTimeout' in context;
}

var setTimeoutPolifill = Object.freeze({
	init: init,
	canUse: canUse
});

function init$1() {
  var polifill = function polifill() {
    var handleId = create(arguments);
    context.process.nextTick(wrap(run, handleId));
    return handleId;
  };

  polifill.usePolifill = 'nextTick';

  return polifill;
}

// Don't get fooled by e.g. browserify environments.
// For Node.js before 0.9
function canUse$1() {
  return Object.prototype.toString.call(context.process) === '[object process]';
}

var nextTickPolifill = Object.freeze({
	init: init$1,
	canUse: canUse$1
});

function init$2() {
  var messagePrefix = 'setImmediate$' + Math.random() + '$';

  var onGlobalMessage = function onGlobalMessage(event) {
    if (event.source === context && typeof event.data === 'string' && event.data.indexOf(messagePrefix) === 0) {

      run(Number(event.data.slice(messagePrefix.length)));
    }
  };

  if (context.addEventListener) {
    context.addEventListener('message', onGlobalMessage, false);
  } else {
    context.attachEvent('onmessage', onGlobalMessage);
  }

  var polifill = function polifill() {
    var handleId = create(arguments);
    context.postMessage(messagePrefix + handleId, '*');
    return handleId;
  };

  polifill.usePolifill = 'postMessage';

  return polifill;
}

// For non-IE10 modern browsers
function canUse$2() {
  if (context.importScripts || !context.postMessage) {
    return false;
  }

  if (context.navigator && /Chrome/.test(context.navigator.userAgent)) {
    //skip this method due to heavy minor GC on heavy use.
    return false;
  }

  var asynch = true;
  var oldOnMessage = context.onmessage;
  context.onmessage = function () {
    asynch = false;
  };

  context.postMessage('', '*');
  context.onmessage = oldOnMessage;
  return asynch;
}

var postMessagePolifill = Object.freeze({
	init: init$2,
	canUse: canUse$2
});

function init$3() {
  var channel = new context.MessageChannel();

  channel.port1.onmessage = function (event) {
    run(Number(event.data));
  };

  var polifill = function polifill() {
    var handleId = create(arguments);
    channel.port2.postMessage(handleId);
    return handleId;
  };

  polifill.usePolifill = 'messageChannel';

  return polifill;
}

// For web workers, where supported
function canUse$3() {
  return Boolean(context.MessageChannel);
}

var messageChannelPolifill = Object.freeze({
	init: init$3,
	canUse: canUse$3
});

function init$4() {
  var html = context.document.documentElement;

  var polifill = function polifill() {
    var handleId = create(arguments);
    var script = context.document.createElement('script');

    script.onreadystatechange = function () {
      run(handleId);
      script.onreadystatechange = null;
      html.removeChild(script);
      script = null;
    };

    html.appendChild(script);
    return handleId;
  };

  polifill.usePolifill = 'readyStateChange';

  return polifill;
}

// For IE 6–8
function canUse$4() {
  return context.document && 'onreadystatechange' in context.document.createElement('script');
}

var readyStateChangePolifill = Object.freeze({
	init: init$4,
	canUse: canUse$4
});

var POLIFILLS = [nextTickPolifill, postMessagePolifill, messageChannelPolifill, readyStateChangePolifill];

var setImmediate = useNative ? context.setImmediate || context.msSetImmediate || usePolifill(POLIFILLS, setTimeoutPolifill) : init();

var clearImmediate = useNative ? context.clearImmediate || context.msClearImmediate || clear : clear;

function polifill() {
  if (context.setImmediate !== setImmediate) {
    context.setImmediate = setImmediate;
    context.msSetImmediate = setImmediate;
    context.clearImmediate = clearImmediate;
    context.msClearImmediate = clearImmediate;
  }
}

function usePolifill(list, def) {
  for (var i = 0; i < list.length; i++) {
    var _polifill = list[i];
    if (_polifill.canUse()) {
      return _polifill.init();
    }
  }

  return def.init();
}

var index = {
  setImmediate: setImmediate,
  clearImmediate: clearImmediate,
  polifill: polifill
};

return index;

})));


},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var nativeThumbulator = require("./native/thumbulator");
var Thumbulator = (function () {
    function Thumbulator(bus, options) {
        if (options === void 0) { options = {}; }
        this._module = null;
        this._options = null;
        this._options = tslib_1.__assign({ stopAddress: 0 }, options);
        this._module = nativeThumbulator(this._getApi(bus, this._options));
        this.enableDebug(false);
    }
    Thumbulator.prototype.init = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                this._module._set_stop_address(this._options.stopAddress);
                return [2];
            });
        });
    };
    Thumbulator.prototype.ping = function () {
        return this._module.ccall('ping', 'string', [], []);
    };
    Thumbulator.prototype.run = function (cycles) {
        return this._module._run(cycles);
    };
    Thumbulator.prototype.abort = function () {
        this._module._abort_run();
    };
    Thumbulator.prototype.enableDebug = function (enable) {
        this._module._enable_debug(enable ? 1 : 0);
    };
    Thumbulator.prototype.reset = function () {
        this._module._reset();
    };
    Thumbulator.prototype.readRegister = function (register) {
        if (register < 0 || register > 15) {
            throw new Error("illegal thumb register " + register);
        }
        return this._module._read_register(register);
    };
    Thumbulator.prototype.writeRegister = function (register, value) {
        if (register < 0 || register > 15) {
            throw new Error("illegal thumb register " + register);
        }
        this._module._write_register(register, value);
    };
    Thumbulator.prototype._getApi = function (bus, options) {
        var printer = options.printer || (function (data) { return console.log('thumbulator: ' + data); });
        return {
            print: printer,
            printErr: printer,
            trapOnInstructionFetch: options.trapOnInstructionFetch || (function () { return 0; }),
            trapOnBx32: options.trapOnBx32 || (function () { return 3; }),
            busRead16: bus.read16,
            busRead32: bus.read32 || (function (address) { return (bus.read16(address) & 0xffff) | (bus.read16(address + 2) << 16); }),
            busWrite16: bus.write16,
            busWrite32: bus.write32 ||
                (function (address, value) { return (bus.write16(address, value & 0xffff), bus.write16(address + 2, value >>> 16)); })
        };
    };
    return Thumbulator;
}());
exports.default = Thumbulator;

},{"./native/thumbulator":24,"tslib":25}],24:[function(require,module,exports){
(function (process){
var Module = function(Module) {
  Module = Module || {};
  var Module = Module;

var Module;if(!Module)Module=(typeof Module!=="undefined"?Module:null)||{};var moduleOverrides={};for(var key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_IS_SHELL=false;if(Module["ENVIRONMENT"]){if(Module["ENVIRONMENT"]==="WEB"){ENVIRONMENT_IS_WEB=true}else if(Module["ENVIRONMENT"]==="WORKER"){ENVIRONMENT_IS_WORKER=true}else if(Module["ENVIRONMENT"]==="NODE"){ENVIRONMENT_IS_NODE=true}else if(Module["ENVIRONMENT"]==="SHELL"){ENVIRONMENT_IS_SHELL=true}else{throw new Error("The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.")}}else{ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_IS_NODE=typeof process==="object"&&typeof require==="function"&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER;ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER}if(ENVIRONMENT_IS_NODE){if(!Module["print"])Module["print"]=console.log;if(!Module["printErr"])Module["printErr"]=console.warn;var nodeFS;var nodePath;Module["read"]=function shell_read(filename,binary){if(!nodeFS)nodeFS=require("fs");if(!nodePath)nodePath=require("path");filename=nodePath["normalize"](filename);var ret=nodeFS["readFileSync"](filename);return binary?ret:ret.toString()};Module["readBinary"]=function readBinary(filename){var ret=Module["read"](filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}assert(ret.buffer);return ret};Module["load"]=function load(f){globalEval(read(f))};if(!Module["thisProgram"]){if(process["argv"].length>1){Module["thisProgram"]=process["argv"][1].replace(/\\/g,"/")}else{Module["thisProgram"]="unknown-program"}}Module["arguments"]=process["argv"].slice(2);Module["inspect"]=(function(){return"[Emscripten Module object]"})}else if(ENVIRONMENT_IS_SHELL){if(!Module["print"])Module["print"]=print;if(typeof printErr!="undefined")Module["printErr"]=printErr;if(typeof read!="undefined"){Module["read"]=read}else{Module["read"]=function shell_read(){throw"no read() available"}}Module["readBinary"]=function readBinary(f){if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}var data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){Module["arguments"]=scriptArgs}else if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof quit==="function"){Module["quit"]=(function(status,toThrow){quit(status)})}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){Module["read"]=function shell_read(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};if(ENVIRONMENT_IS_WORKER){Module["readBinary"]=function readBinary(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}Module["readAsync"]=function readAsync(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response)}else{onerror()}};xhr.onerror=onerror;xhr.send(null)};if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof console!=="undefined"){if(!Module["print"])Module["print"]=function shell_print(x){console.log(x)};if(!Module["printErr"])Module["printErr"]=function shell_printErr(x){console.warn(x)}}else{var TRY_USE_DUMP=false;if(!Module["print"])Module["print"]=TRY_USE_DUMP&&typeof dump!=="undefined"?(function(x){dump(x)}):(function(x){})}if(ENVIRONMENT_IS_WORKER){Module["load"]=importScripts}if(typeof Module["setWindowTitle"]==="undefined"){Module["setWindowTitle"]=(function(title){document.title=title})}}else{throw"Unknown runtime environment. Where are we?"}function globalEval(x){eval.call(null,x)}if(!Module["load"]&&Module["read"]){Module["load"]=function load(f){globalEval(Module["read"](f))}}if(!Module["print"]){Module["print"]=(function(){})}if(!Module["printErr"]){Module["printErr"]=Module["print"]}if(!Module["arguments"]){Module["arguments"]=[]}if(!Module["thisProgram"]){Module["thisProgram"]="./this.program"}if(!Module["quit"]){Module["quit"]=(function(status,toThrow){throw toThrow})}Module.print=Module["print"];Module.printErr=Module["printErr"];Module["preRun"]=[];Module["postRun"]=[];for(var key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}moduleOverrides=undefined;var Runtime={setTempRet0:(function(value){tempRet0=value;return value}),getTempRet0:(function(){return tempRet0}),stackSave:(function(){return STACKTOP}),stackRestore:(function(stackTop){STACKTOP=stackTop}),getNativeTypeSize:(function(type){switch(type){case"i1":case"i8":return 1;case"i16":return 2;case"i32":return 4;case"i64":return 8;case"float":return 4;case"double":return 8;default:{if(type[type.length-1]==="*"){return Runtime.QUANTUM_SIZE}else if(type[0]==="i"){var bits=parseInt(type.substr(1));assert(bits%8===0);return bits/8}else{return 0}}}}),getNativeFieldSize:(function(type){return Math.max(Runtime.getNativeTypeSize(type),Runtime.QUANTUM_SIZE)}),STACK_ALIGN:16,prepVararg:(function(ptr,type){if(type==="double"||type==="i64"){if(ptr&7){assert((ptr&7)===4);ptr+=4}}else{assert((ptr&3)===0)}return ptr}),getAlignSize:(function(type,size,vararg){if(!vararg&&(type=="i64"||type=="double"))return 8;if(!type)return Math.min(size,8);return Math.min(size||(type?Runtime.getNativeFieldSize(type):0),Runtime.QUANTUM_SIZE)}),dynCall:(function(sig,ptr,args){if(args&&args.length){return Module["dynCall_"+sig].apply(null,[ptr].concat(args))}else{return Module["dynCall_"+sig].call(null,ptr)}}),functionPointers:[],addFunction:(function(func){for(var i=0;i<Runtime.functionPointers.length;i++){if(!Runtime.functionPointers[i]){Runtime.functionPointers[i]=func;return 2*(1+i)}}throw"Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."}),removeFunction:(function(index){Runtime.functionPointers[(index-2)/2]=null}),warnOnce:(function(text){if(!Runtime.warnOnce.shown)Runtime.warnOnce.shown={};if(!Runtime.warnOnce.shown[text]){Runtime.warnOnce.shown[text]=1;Module.printErr(text)}}),funcWrappers:{},getFuncWrapper:(function(func,sig){if(!func)return;assert(sig);if(!Runtime.funcWrappers[sig]){Runtime.funcWrappers[sig]={}}var sigCache=Runtime.funcWrappers[sig];if(!sigCache[func]){if(sig.length===1){sigCache[func]=function dynCall_wrapper(){return Runtime.dynCall(sig,func)}}else if(sig.length===2){sigCache[func]=function dynCall_wrapper(arg){return Runtime.dynCall(sig,func,[arg])}}else{sigCache[func]=function dynCall_wrapper(){return Runtime.dynCall(sig,func,Array.prototype.slice.call(arguments))}}}return sigCache[func]}),getCompilerSetting:(function(name){throw"You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"}),stackAlloc:(function(size){var ret=STACKTOP;STACKTOP=STACKTOP+size|0;STACKTOP=STACKTOP+15&-16;return ret}),staticAlloc:(function(size){var ret=STATICTOP;STATICTOP=STATICTOP+size|0;STATICTOP=STATICTOP+15&-16;return ret}),dynamicAlloc:(function(size){var ret=HEAP32[DYNAMICTOP_PTR>>2];var end=(ret+size+15|0)&-16;HEAP32[DYNAMICTOP_PTR>>2]=end;if(end>=TOTAL_MEMORY){var success=enlargeMemory();if(!success){HEAP32[DYNAMICTOP_PTR>>2]=ret;return 0}}return ret}),alignMemory:(function(size,quantum){var ret=size=Math.ceil(size/(quantum?quantum:16))*(quantum?quantum:16);return ret}),makeBigInt:(function(low,high,unsigned){var ret=unsigned?+(low>>>0)+ +(high>>>0)*+4294967296:+(low>>>0)+ +(high|0)*+4294967296;return ret}),GLOBAL_BASE:8,QUANTUM_SIZE:4,__dummy__:0};Module["Runtime"]=Runtime;var ABORT=0;var EXITSTATUS=0;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}function getCFunc(ident){var func=Module["_"+ident];if(!func){try{func=eval("_"+ident)}catch(e){}}assert(func,"Cannot call unknown function "+ident+" (perhaps LLVM optimizations or closure removed it?)");return func}var cwrap,ccall;((function(){var JSfuncs={"stackSave":(function(){Runtime.stackSave()}),"stackRestore":(function(){Runtime.stackRestore()}),"arrayToC":(function(arr){var ret=Runtime.stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}),"stringToC":(function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){var len=(str.length<<2)+1;ret=Runtime.stackAlloc(len);stringToUTF8(str,ret,len)}return ret})};var toC={"string":JSfuncs["stringToC"],"array":JSfuncs["arrayToC"]};ccall=function ccallFunc(ident,returnType,argTypes,args,opts){var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=Runtime.stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func.apply(null,cArgs);if(returnType==="string")ret=Pointer_stringify(ret);if(stack!==0){if(opts&&opts.async){EmterpreterAsync.asyncFinalizers.push((function(){Runtime.stackRestore(stack)}));return}Runtime.stackRestore(stack)}return ret};var sourceRegex=/^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;function parseJSFunc(jsfunc){var parsed=jsfunc.toString().match(sourceRegex).slice(1);return{arguments:parsed[0],body:parsed[1],returnValue:parsed[2]}}var JSsource=null;function ensureJSsource(){if(!JSsource){JSsource={};for(var fun in JSfuncs){if(JSfuncs.hasOwnProperty(fun)){JSsource[fun]=parseJSFunc(JSfuncs[fun])}}}}cwrap=function cwrap(ident,returnType,argTypes){argTypes=argTypes||[];var cfunc=getCFunc(ident);var numericArgs=argTypes.every((function(type){return type==="number"}));var numericRet=returnType!=="string";if(numericRet&&numericArgs){return cfunc}var argNames=argTypes.map((function(x,i){return"$"+i}));var funcstr="(function("+argNames.join(",")+") {";var nargs=argTypes.length;if(!numericArgs){ensureJSsource();funcstr+="var stack = "+JSsource["stackSave"].body+";";for(var i=0;i<nargs;i++){var arg=argNames[i],type=argTypes[i];if(type==="number")continue;var convertCode=JSsource[type+"ToC"];funcstr+="var "+convertCode.arguments+" = "+arg+";";funcstr+=convertCode.body+";";funcstr+=arg+"=("+convertCode.returnValue+");"}}var cfuncname=parseJSFunc((function(){return cfunc})).returnValue;funcstr+="var ret = "+cfuncname+"("+argNames.join(",")+");";if(!numericRet){var strgfy=parseJSFunc((function(){return Pointer_stringify})).returnValue;funcstr+="ret = "+strgfy+"(ret);"}if(!numericArgs){ensureJSsource();funcstr+=JSsource["stackRestore"].body.replace("()","(stack)")+";"}funcstr+="return ret})";return eval(funcstr)}}))();Module["ccall"]=ccall;Module["cwrap"]=cwrap;function setValue(ptr,value,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":HEAP8[ptr>>0]=value;break;case"i8":HEAP8[ptr>>0]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":tempI64=[value>>>0,(tempDouble=value,+Math_abs(tempDouble)>=+1?tempDouble>+0?(Math_min(+Math_floor(tempDouble/+4294967296),+4294967295)|0)>>>0:~~+Math_ceil((tempDouble- +(~~tempDouble>>>0))/+4294967296)>>>0:0)],HEAP32[ptr>>2]=tempI64[0],HEAP32[ptr+4>>2]=tempI64[1];break;case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;default:abort("invalid type for setValue: "+type)}}Module["setValue"]=setValue;function getValue(ptr,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":return HEAP8[ptr>>0];case"i8":return HEAP8[ptr>>0];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":return HEAP32[ptr>>2];case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];default:abort("invalid type for setValue: "+type)}return null}Module["getValue"]=getValue;var ALLOC_NORMAL=0;var ALLOC_STACK=1;var ALLOC_STATIC=2;var ALLOC_DYNAMIC=3;var ALLOC_NONE=4;Module["ALLOC_NORMAL"]=ALLOC_NORMAL;Module["ALLOC_STACK"]=ALLOC_STACK;Module["ALLOC_STATIC"]=ALLOC_STATIC;Module["ALLOC_DYNAMIC"]=ALLOC_DYNAMIC;Module["ALLOC_NONE"]=ALLOC_NONE;function allocate(slab,types,allocator,ptr){var zeroinit,size;if(typeof slab==="number"){zeroinit=true;size=slab}else{zeroinit=false;size=slab.length}var singleType=typeof types==="string"?types:null;var ret;if(allocator==ALLOC_NONE){ret=ptr}else{ret=[typeof _malloc==="function"?_malloc:Runtime.staticAlloc,Runtime.stackAlloc,Runtime.staticAlloc,Runtime.dynamicAlloc][allocator===undefined?ALLOC_STATIC:allocator](Math.max(size,singleType?1:types.length))}if(zeroinit){var ptr=ret,stop;assert((ret&3)==0);stop=ret+(size&~3);for(;ptr<stop;ptr+=4){HEAP32[ptr>>2]=0}stop=ret+size;while(ptr<stop){HEAP8[ptr++>>0]=0}return ret}if(singleType==="i8"){if(slab.subarray||slab.slice){HEAPU8.set(slab,ret)}else{HEAPU8.set(new Uint8Array(slab),ret)}return ret}var i=0,type,typeSize,previousType;while(i<size){var curr=slab[i];if(typeof curr==="function"){curr=Runtime.getFunctionIndex(curr)}type=singleType||types[i];if(type===0){i++;continue}if(type=="i64")type="i32";setValue(ret+i,curr,type);if(previousType!==type){typeSize=Runtime.getNativeTypeSize(type);previousType=type}i+=typeSize}return ret}Module["allocate"]=allocate;function getMemory(size){if(!staticSealed)return Runtime.staticAlloc(size);if(!runtimeInitialized)return Runtime.dynamicAlloc(size);return _malloc(size)}Module["getMemory"]=getMemory;function Pointer_stringify(ptr,length){if(length===0||!ptr)return"";var hasUtf=0;var t;var i=0;while(1){t=HEAPU8[ptr+i>>0];hasUtf|=t;if(t==0&&!length)break;i++;if(length&&i==length)break}if(!length)length=i;var ret="";if(hasUtf<128){var MAX_CHUNK=1024;var curr;while(length>0){curr=String.fromCharCode.apply(String,HEAPU8.subarray(ptr,ptr+Math.min(length,MAX_CHUNK)));ret=ret?ret+curr:curr;ptr+=MAX_CHUNK;length-=MAX_CHUNK}return ret}return Module["UTF8ToString"](ptr)}Module["Pointer_stringify"]=Pointer_stringify;function AsciiToString(ptr){var str="";while(1){var ch=HEAP8[ptr++>>0];if(!ch)return str;str+=String.fromCharCode(ch)}}Module["AsciiToString"]=AsciiToString;function stringToAscii(str,outPtr){return writeAsciiToMemory(str,outPtr,false)}Module["stringToAscii"]=stringToAscii;var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(u8Array,idx){var endPtr=idx;while(u8Array[endPtr])++endPtr;if(endPtr-idx>16&&u8Array.subarray&&UTF8Decoder){return UTF8Decoder.decode(u8Array.subarray(idx,endPtr))}else{var u0,u1,u2,u3,u4,u5;var str="";while(1){u0=u8Array[idx++];if(!u0)return str;if(!(u0&128)){str+=String.fromCharCode(u0);continue}u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u3=u8Array[idx++]&63;if((u0&248)==240){u0=(u0&7)<<18|u1<<12|u2<<6|u3}else{u4=u8Array[idx++]&63;if((u0&252)==248){u0=(u0&3)<<24|u1<<18|u2<<12|u3<<6|u4}else{u5=u8Array[idx++]&63;u0=(u0&1)<<30|u1<<24|u2<<18|u3<<12|u4<<6|u5}}}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}}Module["UTF8ArrayToString"]=UTF8ArrayToString;function UTF8ToString(ptr){return UTF8ArrayToString(HEAPU8,ptr)}Module["UTF8ToString"]=UTF8ToString;function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=2097151){if(outIdx+3>=endIdx)break;outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=67108863){if(outIdx+4>=endIdx)break;outU8Array[outIdx++]=248|u>>24;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else{if(outIdx+5>=endIdx)break;outU8Array[outIdx++]=252|u>>30;outU8Array[outIdx++]=128|u>>24&63;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}}outU8Array[outIdx]=0;return outIdx-startIdx}Module["stringToUTF8Array"]=stringToUTF8Array;function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}Module["stringToUTF8"]=stringToUTF8;function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){++len}else if(u<=2047){len+=2}else if(u<=65535){len+=3}else if(u<=2097151){len+=4}else if(u<=67108863){len+=5}else{len+=6}}return len}Module["lengthBytesUTF8"]=lengthBytesUTF8;var UTF16Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function demangle(func){var __cxa_demangle_func=Module["___cxa_demangle"]||Module["__cxa_demangle"];if(__cxa_demangle_func){try{var s=func.substr(1);var len=lengthBytesUTF8(s)+1;var buf=_malloc(len);stringToUTF8(s,buf,len);var status=_malloc(4);var ret=__cxa_demangle_func(buf,0,0,status);if(getValue(status,"i32")===0&&ret){return Pointer_stringify(ret)}}catch(e){}finally{if(buf)_free(buf);if(status)_free(status);if(ret)_free(ret)}return func}Runtime.warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");return func}function demangleAll(text){var regex=/__Z[\w\d_]+/g;return text.replace(regex,(function(x){var y=demangle(x);return x===y?x:x+" ["+y+"]"}))}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e}if(!err.stack){return"(no stack trace available)"}}return err.stack.toString()}function stackTrace(){var js=jsStackTrace();if(Module["extraStackTrace"])js+="\n"+Module["extraStackTrace"]();return demangleAll(js)}Module["stackTrace"]=stackTrace;var HEAP,buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferViews(){Module["HEAP8"]=HEAP8=new Int8Array(buffer);Module["HEAP16"]=HEAP16=new Int16Array(buffer);Module["HEAP32"]=HEAP32=new Int32Array(buffer);Module["HEAPU8"]=HEAPU8=new Uint8Array(buffer);Module["HEAPU16"]=HEAPU16=new Uint16Array(buffer);Module["HEAPU32"]=HEAPU32=new Uint32Array(buffer);Module["HEAPF32"]=HEAPF32=new Float32Array(buffer);Module["HEAPF64"]=HEAPF64=new Float64Array(buffer)}var STATIC_BASE,STATICTOP,staticSealed;var STACK_BASE,STACKTOP,STACK_MAX;var DYNAMIC_BASE,DYNAMICTOP_PTR;STATIC_BASE=STATICTOP=STACK_BASE=STACKTOP=STACK_MAX=DYNAMIC_BASE=DYNAMICTOP_PTR=0;staticSealed=false;function abortOnCannotGrowMemory(){abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value "+TOTAL_MEMORY+", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")}function enlargeMemory(){abortOnCannotGrowMemory()}var TOTAL_STACK=Module["TOTAL_STACK"]||10240;var TOTAL_MEMORY=Module["TOTAL_MEMORY"]||16777216;if(TOTAL_MEMORY<TOTAL_STACK)Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was "+TOTAL_MEMORY+"! (TOTAL_STACK="+TOTAL_STACK+")");if(Module["buffer"]){buffer=Module["buffer"]}else{{buffer=new ArrayBuffer(TOTAL_MEMORY)}}updateGlobalBufferViews();function getTotalMemory(){return TOTAL_MEMORY}HEAP32[0]=1668509029;HEAP16[1]=25459;if(HEAPU8[2]!==115||HEAPU8[3]!==99)throw"Runtime error: expected the system to be little-endian!";Module["HEAP"]=HEAP;Module["buffer"]=buffer;Module["HEAP8"]=HEAP8;Module["HEAP16"]=HEAP16;Module["HEAP32"]=HEAP32;Module["HEAPU8"]=HEAPU8;Module["HEAPU16"]=HEAPU16;Module["HEAPU32"]=HEAPU32;Module["HEAPF32"]=HEAPF32;Module["HEAPF64"]=HEAPF64;function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Module["dynCall_v"](func)}else{Module["dynCall_vi"](func,callback.arg)}}else{func(callback.arg===undefined?null:callback.arg)}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATEXIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function ensureInitRuntime(){if(runtimeInitialized)return;runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){callRuntimeCallbacks(__ATEXIT__);runtimeExited=true}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}Module["addOnPreRun"]=addOnPreRun;function addOnInit(cb){__ATINIT__.unshift(cb)}Module["addOnInit"]=addOnInit;function addOnPreMain(cb){__ATMAIN__.unshift(cb)}Module["addOnPreMain"]=addOnPreMain;function addOnExit(cb){__ATEXIT__.unshift(cb)}Module["addOnExit"]=addOnExit;function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}Module["addOnPostRun"]=addOnPostRun;function intArrayFromString(stringy,dontAddNull,length){var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array}Module["intArrayFromString"]=intArrayFromString;function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")}Module["intArrayToString"]=intArrayToString;function writeStringToMemory(string,buffer,dontAddNull){Runtime.warnOnce("writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!");var lastChar,end;if(dontAddNull){end=buffer+lengthBytesUTF8(string);lastChar=HEAP8[end]}stringToUTF8(string,buffer,Infinity);if(dontAddNull)HEAP8[end]=lastChar}Module["writeStringToMemory"]=writeStringToMemory;function writeArrayToMemory(array,buffer){HEAP8.set(array,buffer)}Module["writeArrayToMemory"]=writeArrayToMemory;function writeAsciiToMemory(str,buffer,dontAddNull){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i)}if(!dontAddNull)HEAP8[buffer>>0]=0}Module["writeAsciiToMemory"]=writeAsciiToMemory;if(!Math["imul"]||Math["imul"](4294967295,5)!==-5)Math["imul"]=function imul(a,b){var ah=a>>>16;var al=a&65535;var bh=b>>>16;var bl=b&65535;return al*bl+(ah*bl+al*bh<<16)|0};Math.imul=Math["imul"];if(!Math["clz32"])Math["clz32"]=(function(x){x=x>>>0;for(var i=0;i<32;i++){if(x&1<<31-i)return i}return 32});Math.clz32=Math["clz32"];if(!Math["trunc"])Math["trunc"]=(function(x){return x<0?Math.ceil(x):Math.floor(x)});Math.trunc=Math["trunc"];var Math_abs=Math.abs;var Math_cos=Math.cos;var Math_sin=Math.sin;var Math_tan=Math.tan;var Math_acos=Math.acos;var Math_asin=Math.asin;var Math_atan=Math.atan;var Math_atan2=Math.atan2;var Math_exp=Math.exp;var Math_log=Math.log;var Math_sqrt=Math.sqrt;var Math_ceil=Math.ceil;var Math_floor=Math.floor;var Math_pow=Math.pow;var Math_imul=Math.imul;var Math_fround=Math.fround;var Math_round=Math.round;var Math_min=Math.min;var Math_clz32=Math.clz32;var Math_trunc=Math.trunc;var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}}Module["addRunDependency"]=addRunDependency;function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["removeRunDependency"]=removeRunDependency;Module["preloadedImages"]={};Module["preloadedAudios"]={};var ASM_CONSTS=[(function($0){return Module.trapOnInstructionFetch($0)}),(function($0){return Module.busRead32($0)}),(function($0,$1){Module.busWrite32($0,$1)}),(function($0){return Module.busRead16($0)}),(function($0,$1){return Module.trapOnBx32($0,$1)}),(function($0,$1){Module.busWrite16($0,$1)})];function _emscripten_asm_const_ii(code,a0){return ASM_CONSTS[code](a0)}function _emscripten_asm_const_iii(code,a0,a1){return ASM_CONSTS[code](a0,a1)}STATIC_BASE=Runtime.GLOBAL_BASE;STATICTOP=STATIC_BASE+5312;__ATINIT__.push();allocate([12,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,189,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,156,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,116,104,117,109,98,117,108,97,116,111,114,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,98,117,115,82,101,97,100,49,54,40,36,48,41,59,32,125,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,98,117,115,82,101,97,100,51,50,40,36,48,41,59,32,125,0,123,32,77,111,100,117,108,101,46,98,117,115,87,114,105,116,101,49,54,40,36,48,44,32,36,49,41,59,32,125,0,123,32,77,111,100,117,108,101,46,98,117,115,87,114,105,116,101,51,50,40,36,48,44,32,36,49,41,59,32,125,0,112,99,32,104,97,115,32,108,115,98,105,116,32,115,101,116,32,48,120,37,48,56,88,10,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,116,114,97,112,79,110,73,110,115,116,114,117,99,116,105,111,110,70,101,116,99,104,40,36,48,41,59,32,125,0,45,45,45,32,48,120,37,48,56,88,58,32,48,120,37,48,52,88,32,0,97,100,99,32,114,37,117,44,114,37,117,10,0,97,100,100,115,32,114,37,117,44,114,37,117,44,35,48,120,37,88,10,0,97,100,100,115,32,114,37,117,44,35,48,120,37,48,50,88,10,0,97,100,100,115,32,114,37,117,44,114,37,117,44,114,37,117,10,0,97,100,100,32,114,37,117,44,114,37,117,10,0,97,100,100,32,112,99,44,46,46,46,32,112,114,111,100,117,99,101,100,32,97,110,32,97,114,109,32,97,100,100,114,101,115,115,32,48,120,37,48,56,88,32,48,120,37,48,56,88,10,0,97,100,100,32,114,37,117,44,80,67,44,35,48,120,37,48,50,88,10,0,97,100,100,32,114,37,117,44,83,80,44,35,48,120,37,48,50,88,10,0,97,100,100,32,83,80,44,35,48,120,37,48,50,88,10,0,97,110,100,115,32,114,37,117,44,114,37,117,10,0,97,115,114,115,32,114,37,117,44,114,37,117,44,35,48,120,37,88,10,0,97,115,114,115,32,114,37,117,44,114,37,117,10,0,98,101,113,32,48,120,37,48,56,88,10,0,98,110,101,32,48,120,37,48,56,88,10,0,98,99,115,32,48,120,37,48,56,88,10,0,98,99,99,32,48,120,37,48,56,88,10,0,98,109,105,32,48,120,37,48,56,88,10,0,98,112,108,32,48,120,37,48,56,88,10,0,98,118,115,32,48,120,37,48,56,88,10,0,98,118,99,32,48,120,37,48,56,88,10,0,98,104,105,32,48,120,37,48,56,88,10,0,98,108,115,32,48,120,37,48,56,88,10,0,98,103,101,32,48,120,37,48,56,88,10,0,98,108,116,32,48,120,37,48,56,88,10,0,98,103,116,32,48,120,37,48,56,88,10,0,98,108,101,32,48,120,37,48,56,88,10,0,66,32,48,120,37,48,56,88,10,0,98,105,99,115,32,114,37,117,44,114,37,117,10,0,98,107,112,116,32,48,120,37,48,50,88,10,0,98,108,32,48,120,37,48,56,88,10,0,98,108,120,32,114,37,117,10,0,99,97,110,110,111,116,32,98,114,97,110,99,104,32,116,111,32,97,114,109,32,48,120,37,48,56,88,32,48,120,37,48,52,88,10,0,98,120,32,114,37,117,10,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,116,114,97,112,79,110,66,120,51,50,40,36,48,44,32,36,49,41,59,32,125,0,99,109,110,115,32,114,37,117,44,114,37,117,10,0,99,109,112,32,114,37,117,44,35,48,120,37,48,50,88,10,0,99,109,112,115,32,114,37,117,44,114,37,117,10,0,99,112,115,32,84,79,68,79,10,0,99,112,121,32,114,37,117,44,114,37,117,10,0,101,111,114,115,32,114,37,117,44,114,37,117,10,0,108,100,109,105,97,32,114,37,117,33,44,123,0,114,37,117,0,125,10,0,108,100,114,32,114,37,117,44,91,114,37,117,44,35,48,120,37,88,93,10,0,108,100,114,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,108,100,114,32,114,37,117,44,91,80,67,43,35,48,120,37,88,93,32,0,59,64,32,48,120,37,88,10,0,108,100,114,32,114,37,117,44,91,83,80,43,35,48,120,37,88,93,10,0,108,100,114,98,32,114,37,117,44,91,114,37,117,44,35,48,120,37,88,93,10,0,108,100,114,98,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,108,100,114,104,32,114,37,117,44,91,114,37,117,44,35,48,120,37,88,93,10,0,108,100,114,104,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,108,100,114,115,98,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,108,100,114,115,104,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,108,115,108,115,32,114,37,117,44,114,37,117,44,35,48,120,37,88,10,0,108,115,108,115,32,114,37,117,44,114,37,117,10,0,108,115,114,115,32,114,37,117,44,114,37,117,44,35,48,120,37,88,10,0,108,115,114,115,32,114,37,117,44,114,37,117,10,0,109,111,118,115,32,114,37,117,44,35,48,120,37,48,50,88,10,0,109,111,118,115,32,114,37,117,44,114,37,117,10,0,109,111,118,32,114,37,117,44,114,37,117,10,0,109,117,108,115,32,114,37,117,44,114,37,117,10,0,109,118,110,115,32,114,37,117,44,114,37,117,10,0,110,101,103,115,32,114,37,117,44,114,37,117,10,0,111,114,114,115,32,114,37,117,44,114,37,117,10,0,112,111,112,32,123,0,112,99,0,112,111,112,32,123,114,99,125,32,119,105,116,104,32,97,110,32,65,82,77,32,97,100,100,114,101,115,115,32,112,99,32,48,120,37,48,56,88,32,112,111,112,112,101,100,32,48,120,37,48,56,88,10,0,112,117,115,104,32,123,0,108,114,0,112,117,115,104,32,123,108,114,125,32,119,105,116,104,32,97,110,32,65,82,77,32,97,100,100,114,101,115,115,32,112,99,32,48,120,37,48,56,88,32,112,111,112,112,101,100,32,48,120,37,48,56,88,10,0,114,101,118,32,114,37,117,44,114,37,117,10,0,114,101,118,49,54,32,114,37,117,44,114,37,117,10,0,114,101,118,115,104,32,114,37,117,44,114,37,117,10,0,114,111,114,115,32,114,37,117,44,114,37,117,10,0,115,98,99,32,114,37,117,44,114,37,117,10,0,115,101,116,101,110,100,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,10,0,115,116,109,105,97,32,114,37,117,33,44,123,0,115,116,114,32,114,37,117,44,91,114,37,117,44,35,48,120,37,88,93,10,0,115,116,114,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,115,116,114,32,114,37,117,44,91,83,80,44,35,48,120,37,88,93,10,0,115,116,114,98,32,114,37,117,44,91,114,37,117,44,35,48,120,37,88,93,10,0,115,116,114,98,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,115,116,114,104,32,114,37,117,44,91,114,37,117,44,35,48,120,37,88,93,10,0,115,116,114,104,32,114,37,117,44,91,114,37,117,44,114,37,117,93,10,0,115,117,98,115,32,114,37,117,44,114,37,117,44,35,48,120,37,88,10,0,115,117,98,115,32,114,37,117,44,35,48,120,37,48,50,88,10,0,115,117,98,115,32,114,37,117,44,114,37,117,44,114,37,117,10,0,115,117,98,32,83,80,44,35,48,120,37,48,50,88,10,0,115,119,105,32,48,120,37,48,50,88,10,0,10,10,115,119,105,32,48,120,37,48,50,88,10,0,115,120,116,98,32,114,37,117,44,114,37,117,10,0,115,120,116,104,32,114,37,117,44,114,37,117,10,0,116,115,116,32,114,37,117,44,114,37,117,10,0,117,120,116,98,32,114,37,117,44,114,37,117,10,0,117,120,116,104,32,114,37,117,44,114,37,117,10,0,105,110,118,97,108,105,100,32,105,110,115,116,114,117,99,116,105,111,110,32,48,120,37,48,56,88,32,48,120,37,48,52,88,10,0,17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,45,43,32,32,32,48,88,48,120,0,40,110,117,108,108,41,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,105,110,102,0,73,78,70,0,110,97,110,0,78,65,78,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,46,0,84,33,34,25,13,1,2,3,17,75,28,12,16,4,11,29,18,30,39,104,110,111,112,113,98,32,5,6,15,19,20,21,26,8,22,7,40,36,23,24,9,10,14,27,31,37,35,131,130,125,38,42,43,60,61,62,63,67,71,74,77,88,89,90,91,92,93,94,95,96,97,99,100,101,102,103,105,106,107,108,114,115,116,121,122,123,124,0,73,108,108,101,103,97,108,32,98,121,116,101,32,115,101,113,117,101,110,99,101,0,68,111,109,97,105,110,32,101,114,114,111,114,0,82,101,115,117,108,116,32,110,111,116,32,114,101,112,114,101,115,101,110,116,97,98,108,101,0,78,111,116,32,97,32,116,116,121,0,80,101,114,109,105,115,115,105,111,110,32,100,101,110,105,101,100,0,79,112,101,114,97,116,105,111,110,32,110,111,116,32,112,101,114,109,105,116,116,101,100,0,78,111,32,115,117,99,104,32,102,105,108,101,32,111,114,32,100,105,114,101,99,116,111,114,121,0,78,111,32,115,117,99,104,32,112,114,111,99,101,115,115,0,70,105,108,101,32,101,120,105,115,116,115,0,86,97,108,117,101,32,116,111,111,32,108,97,114,103,101,32,102,111,114,32,100,97,116,97,32,116,121,112,101,0,78,111,32,115,112,97,99,101,32,108,101,102,116,32,111,110,32,100,101,118,105,99,101,0,79,117,116,32,111,102,32,109,101,109,111,114,121,0,82,101,115,111,117,114,99,101,32,98,117,115,121,0,73,110,116,101,114,114,117,112,116,101,100,32,115,121,115,116,101,109,32,99,97,108,108,0,82,101,115,111,117,114,99,101,32,116,101,109,112,111,114,97,114,105,108,121,32,117,110,97,118,97,105,108,97,98,108,101,0,73,110,118,97,108,105,100,32,115,101,101,107,0,67,114,111,115,115,45,100,101,118,105,99,101,32,108,105,110,107,0,82,101,97,100,45,111,110,108,121,32,102,105,108,101,32,115,121,115,116,101,109,0,68,105,114,101,99,116,111,114,121,32,110,111,116,32,101,109,112,116,121,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,112,101,101,114,0,79,112,101,114,97,116,105,111,110,32,116,105,109,101,100,32,111,117,116,0,67,111,110,110,101,99,116,105,111,110,32,114,101,102,117,115,101,100,0,72,111,115,116,32,105,115,32,100,111,119,110,0,72,111,115,116,32,105,115,32,117,110,114,101,97,99,104,97,98,108,101,0,65,100,100,114,101,115,115,32,105,110,32,117,115,101,0,66,114,111,107,101,110,32,112,105,112,101,0,73,47,79,32,101,114,114,111,114,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,32,111,114,32,97,100,100,114,101,115,115,0,66,108,111,99,107,32,100,101,118,105,99,101,32,114,101,113,117,105,114,101,100,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,0,78,111,116,32,97,32,100,105,114,101,99,116,111,114,121,0,73,115,32,97,32,100,105,114,101,99,116,111,114,121,0,84,101,120,116,32,102,105,108,101,32,98,117,115,121,0,69,120,101,99,32,102,111,114,109,97,116,32,101,114,114,111,114,0,73,110,118,97,108,105,100,32,97,114,103,117,109,101,110,116,0,65,114,103,117,109,101,110,116,32,108,105,115,116,32,116,111,111,32,108,111,110,103,0,83,121,109,98,111,108,105,99,32,108,105,110,107,32,108,111,111,112,0,70,105,108,101,110,97,109,101,32,116,111,111,32,108,111,110,103,0,84,111,111,32,109,97,110,121,32,111,112,101,110,32,102,105,108,101,115,32,105,110,32,115,121,115,116,101,109,0,78,111,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,115,32,97,118,97,105,108,97,98,108,101,0,66,97,100,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,0,78,111,32,99,104,105,108,100,32,112,114,111,99,101,115,115,0,66,97,100,32,97,100,100,114,101,115,115,0,70,105,108,101,32,116,111,111,32,108,97,114,103,101,0,84,111,111,32,109,97,110,121,32,108,105,110,107,115,0,78,111,32,108,111,99,107,115,32,97,118,97,105,108,97,98,108,101,0,82,101,115,111,117,114,99,101,32,100,101,97,100,108,111,99,107,32,119,111,117,108,100,32,111,99,99,117,114,0,83,116,97,116,101,32,110,111,116,32,114,101,99,111,118,101,114,97,98,108,101,0,80,114,101,118,105,111,117,115,32,111,119,110,101,114,32,100,105,101,100,0,79,112,101,114,97,116,105,111,110,32,99,97,110,99,101,108,101,100,0,70,117,110,99,116,105,111,110,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,0,78,111,32,109,101,115,115,97,103,101,32,111,102,32,100,101,115,105,114,101,100,32,116,121,112,101,0,73,100,101,110,116,105,102,105,101,114,32,114,101,109,111,118,101,100,0,68,101,118,105,99,101,32,110,111,116,32,97,32,115,116,114,101,97,109,0,78,111,32,100,97,116,97,32,97,118,97,105,108,97,98,108,101,0,68,101,118,105,99,101,32,116,105,109,101,111,117,116,0,79,117,116,32,111,102,32,115,116,114,101,97,109,115,32,114,101,115,111,117,114,99,101,115,0,76,105,110,107,32,104,97,115,32,98,101,101,110,32,115,101,118,101,114,101,100,0,80,114,111,116,111,99,111,108,32,101,114,114,111,114,0,66,97,100,32,109,101,115,115,97,103,101,0,70,105,108,101,32,100,101,115,99,114,105,112,116,111,114,32,105,110,32,98,97,100,32,115,116,97,116,101,0,78,111,116,32,97,32,115,111,99,107,101,116,0,68,101,115,116,105,110,97,116,105,111,110,32,97,100,100,114,101,115,115,32,114,101,113,117,105,114,101,100,0,77,101,115,115,97,103,101,32,116,111,111,32,108,97,114,103,101,0,80,114,111,116,111,99,111,108,32,119,114,111,110,103,32,116,121,112,101,32,102,111,114,32,115,111,99,107,101,116,0,80,114,111,116,111,99,111,108,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,80,114,111,116,111,99,111,108,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,83,111,99,107,101,116,32,116,121,112,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,78,111,116,32,115,117,112,112,111,114,116,101,100,0,80,114,111,116,111,99,111,108,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,65,100,100,114,101,115,115,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,98,121,32,112,114,111,116,111,99,111,108,0,65,100,100,114,101,115,115,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,78,101,116,119,111,114,107,32,105,115,32,100,111,119,110,0,78,101,116,119,111,114,107,32,117,110,114,101,97,99,104,97,98,108,101,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,110,101,116,119,111,114,107,0,67,111,110,110,101,99,116,105,111,110,32,97,98,111,114,116,101,100,0,78,111,32,98,117,102,102,101,114,32,115,112,97,99,101,32,97,118,97,105,108,97,98,108,101,0,83,111,99,107,101,116,32,105,115,32,99,111,110,110,101,99,116,101,100,0,83,111,99,107,101,116,32,110,111,116,32,99,111,110,110,101,99,116,101,100,0,67,97,110,110,111,116,32,115,101,110,100,32,97,102,116,101,114,32,115,111,99,107,101,116,32,115,104,117,116,100,111,119,110,0,79,112,101,114,97,116,105,111,110,32,97,108,114,101,97,100,121,32,105,110,32,112,114,111,103,114,101,115,115,0,79,112,101,114,97,116,105,111,110,32,105,110,32,112,114,111,103,114,101,115,115,0,83,116,97,108,101,32,102,105,108,101,32,104,97,110,100,108,101,0,82,101,109,111,116,101,32,73,47,79,32,101,114,114,111,114,0,81,117,111,116,97,32,101,120,99,101,101,100,101,100,0,78,111,32,109,101,100,105,117,109,32,102,111,117,110,100,0,87,114,111,110,103,32,109,101,100,105,117,109,32,116,121,112,101,0,78,111,32,101,114,114,111,114,32,105,110,102,111,114,109,97,116,105,111,110,0,0],"i8",ALLOC_NONE,Runtime.GLOBAL_BASE);var tempDoublePtr=STATICTOP;STATICTOP+=16;function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest);return dest}var SYSCALLS={varargs:0,get:(function(varargs){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret}),getStr:(function(){var ret=Pointer_stringify(SYSCALLS.get());return ret}),get64:(function(){var low=SYSCALLS.get(),high=SYSCALLS.get();if(low>=0)assert(high===0);else assert(high===-1);return low}),getZero:(function(){assert(SYSCALLS.get()===0)})};function ___syscall6(which,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD();FS.close(stream);return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}var cttz_i8=allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0],"i8",ALLOC_STATIC);function ___setErrNo(value){if(Module["___errno_location"])HEAP32[Module["___errno_location"]()>>2]=value;return value}function __exit(status){Module["exit"](status)}function _exit(status){__exit(status)}function ___syscall140(which,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(),offset_high=SYSCALLS.get(),offset_low=SYSCALLS.get(),result=SYSCALLS.get(),whence=SYSCALLS.get();var offset=offset_low;FS.llseek(stream,offset,whence);HEAP32[result>>2]=stream.position;if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}function ___syscall146(which,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.get(),iov=SYSCALLS.get(),iovcnt=SYSCALLS.get();var ret=0;if(!___syscall146.buffer){___syscall146.buffers=[null,[],[]];___syscall146.printChar=(function(stream,curr){var buffer=___syscall146.buffers[stream];assert(buffer);if(curr===0||curr===10){(stream===1?Module["print"]:Module["printErr"])(UTF8ArrayToString(buffer,0));buffer.length=0}else{buffer.push(curr)}})}for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];for(var j=0;j<len;j++){___syscall146.printChar(stream,HEAPU8[ptr+j])}ret+=len}return ret}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}__ATEXIT__.push((function(){var fflush=Module["_fflush"];if(fflush)fflush(0);var printChar=___syscall146.printChar;if(!printChar)return;var buffers=___syscall146.buffers;if(buffers[1].length)printChar(1,10);if(buffers[2].length)printChar(2,10)}));DYNAMICTOP_PTR=allocate(1,"i32",ALLOC_STATIC);STACK_BASE=STACKTOP=Runtime.alignMemory(STATICTOP);STACK_MAX=STACK_BASE+TOTAL_STACK;DYNAMIC_BASE=Runtime.alignMemory(STACK_MAX);HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;staticSealed=true;function invoke_ii(index,a1){try{return Module["dynCall_ii"](index,a1)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_iiii(index,a1,a2,a3){try{return Module["dynCall_iiii"](index,a1,a2,a3)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}Module.asmGlobalArg={"Math":Math,"Int8Array":Int8Array,"Int16Array":Int16Array,"Int32Array":Int32Array,"Uint8Array":Uint8Array,"Uint16Array":Uint16Array,"Uint32Array":Uint32Array,"Float32Array":Float32Array,"Float64Array":Float64Array,"NaN":NaN,"Infinity":Infinity};Module.asmLibraryArg={"abort":abort,"assert":assert,"enlargeMemory":enlargeMemory,"getTotalMemory":getTotalMemory,"abortOnCannotGrowMemory":abortOnCannotGrowMemory,"invoke_ii":invoke_ii,"invoke_iiii":invoke_iiii,"_emscripten_asm_const_ii":_emscripten_asm_const_ii,"___syscall6":___syscall6,"___setErrNo":___setErrNo,"___syscall146":___syscall146,"_emscripten_memcpy_big":_emscripten_memcpy_big,"___syscall140":___syscall140,"_exit":_exit,"__exit":__exit,"_emscripten_asm_const_iii":_emscripten_asm_const_iii,"DYNAMICTOP_PTR":DYNAMICTOP_PTR,"tempDoublePtr":tempDoublePtr,"ABORT":ABORT,"STACKTOP":STACKTOP,"STACK_MAX":STACK_MAX,"cttz_i8":cttz_i8};// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer) {
"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.DYNAMICTOP_PTR|0;var j=env.tempDoublePtr|0;var k=env.ABORT|0;var l=env.STACKTOP|0;var m=env.STACK_MAX|0;var n=env.cttz_i8|0;var o=0;var p=0;var q=0;var r=0;var s=global.NaN,t=global.Infinity;var u=0,v=0,w=0,x=0,y=0.0;var z=0;var A=global.Math.floor;var B=global.Math.abs;var C=global.Math.sqrt;var D=global.Math.pow;var E=global.Math.cos;var F=global.Math.sin;var G=global.Math.tan;var H=global.Math.acos;var I=global.Math.asin;var J=global.Math.atan;var K=global.Math.atan2;var L=global.Math.exp;var M=global.Math.log;var N=global.Math.ceil;var O=global.Math.imul;var P=global.Math.min;var Q=global.Math.max;var R=global.Math.clz32;var S=env.abort;var T=env.assert;var U=env.enlargeMemory;var V=env.getTotalMemory;var W=env.abortOnCannotGrowMemory;var X=env.invoke_ii;var Y=env.invoke_iiii;var Z=env._emscripten_asm_const_ii;var _=env.___syscall6;var $=env.___setErrNo;var aa=env.___syscall146;var ba=env._emscripten_memcpy_big;var ca=env.___syscall140;var da=env._exit;var ea=env.__exit;var fa=env._emscripten_asm_const_iii;var ga=0.0;
// EMSCRIPTEN_START_FUNCS
function ja(a){a=a|0;var b=0;b=l;l=l+a|0;l=l+15&-16;return b|0}function ka(){return l|0}function la(a){a=a|0;l=a}function ma(a,b){a=a|0;b=b|0;l=a;m=b}function na(a,b){a=a|0;b=b|0;if(!o){o=a;p=b}}function oa(a){a=a|0;z=a}function pa(){return z|0}function qa(a){a=a|0;c[1162]=a;return}function ra(){return 380}function sa(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;c[1163]=0;if(!a){f=0;return f|0}else{b=0;d=0}while(1){g=ya()|0;d=(g|0)==0?d:g;e=(c[1163]|0)!=0;b=b+1|0;if(e|(g|0)==0^1)break;if(b>>>0>=a>>>0){b=0;f=5;break}}if((f|0)==5)return b|0;g=e?10:d;return g|0}function ta(){c[1163]=1;return}function ua(b){b=b|0;a[5300]=b;return}function va(a){a=a|0;var b=0,d=0;d=l;l=l+16|0;b=c[4668+((a&15)<<2)>>2]|0;if((a&15|0)!=15){l=d;return b|0}if(b&1|0){a=c[2]|0;c[d>>2]=b;Va(a,520,d)|0}b=b&-2;l=d;return b|0}function wa(a,b){a=a|0;b=b|0;c[4668+((a&15)<<2)>>2]=(a&15|0)==15?b&-2:b;return}function xa(){c[1164]=4;c[1165]=0;c[1166]=0;c[1183]=0;c[1184]=0;return 0}function ya(){var b=0,d=0,e=0,f=0,h=0,i=0,j=0,k=0,m=0,n=0;n=l;l=l+4848|0;d=c[1182]|0;if(d&1|0){m=c[2]|0;c[n>>2]=d;Va(m,520,n)|0}b=c[1162]|0;if(!b){b=Z(0,(d&-2)+-2|0)|0;if(b|0){m=b;l=n;return m|0}}else if(((d&-2)+-2|0)==(b|0)){m=20;l=n;return m|0}if((d&-2)>>>0>4026531839&(c[1183]|0)!=0){c[1183]=0;m=c[1180]|0;c[1167]=Z(1,m|0)|0;c[1168]=Z(1,m+4|0)|0;c[1169]=Z(1,m+8|0)|0;c[1170]=Z(1,m+12|0)|0;c[1179]=Z(1,m+16|0)|0;c[1181]=Z(1,m+20|0)|0;e=Z(1,m+24|0)|0;c[1184]=Z(1,m+28|0)|0;c[1180]=m+32}else e=d&-2;b=c[1164]|0;do if(b&1){d=c[1166]|0;if(!d){c[1166]=c[1165];c[1164]=b|65536;b=b|65536;break}else{c[1166]=d+-1;break}}while(0);if((b&3|0)==3)if((b&65536|0)!=0&(c[1183]|0)==0){f=c[1180]|0;d=c[1184]|0;a:do if((f+-4&-268435456|0)==-536870912)switch((f+536813548|0)>>>2|f+536813548<<30|0){case 0:{c[1164]=d&65543;if((b&1|0)!=0|(d&1|0)==0)break a;c[1166]=c[1165];break a}case 1:{c[1165]=d&16777215;break a}case 2:{c[1166]=d&16777215;break a}case 3:break a;default:break a}else fa(2,f+-4|0,d|0)|0;while(0);b:do if((f+-8&-268435456|0)==-536870912)switch((f+536813544|0)>>>2|f+536813544<<30|0){case 0:{m=c[1164]|0;c[1164]=e&65543;if((e&1|0)==0|(m&1|0)!=0)break b;c[1166]=c[1165];break b}case 1:{c[1165]=e&16777215;break b}case 2:{c[1166]=e&16777215;break b}case 3:break b;default:break b}else fa(2,f+-8|0,e|0)|0;while(0);b=c[1181]|0;c:do if((f+-12&-268435456|0)==-536870912)switch((f+536813540|0)>>>2|f+536813540<<30|0){case 0:{m=c[1164]|0;c[1164]=b&65543;if((b&1|0)==0|(m&1|0)!=0)break c;c[1166]=c[1165];break c}case 1:{c[1165]=b&16777215;break c}case 2:{c[1166]=b&16777215;break c}case 3:break c;default:break c}else fa(2,f+-12|0,b|0)|0;while(0);b=c[1179]|0;d:do if((f+-16&-268435456|0)==-536870912)switch((f+536813536|0)>>>2|f+536813536<<30|0){case 0:{m=c[1164]|0;c[1164]=b&65543;if((b&1|0)==0|(m&1|0)!=0)break d;c[1166]=c[1165];break d}case 1:{c[1165]=b&16777215;break d}case 2:{c[1166]=b&16777215;break d}case 3:break d;default:break d}else fa(2,f+-16|0,b|0)|0;while(0);b=c[1170]|0;e:do if((f+-20&-268435456|0)==-536870912)switch((f+536813532|0)>>>2|f+536813532<<30|0){case 0:{m=c[1164]|0;c[1164]=b&65543;if((b&1|0)==0|(m&1|0)!=0)break e;c[1166]=c[1165];break e}case 1:{c[1165]=b&16777215;break e}case 2:{c[1166]=b&16777215;break e}case 3:break e;default:break e}else fa(2,f+-20|0,b|0)|0;while(0);b=c[1169]|0;f:do if((f+-24&-268435456|0)==-536870912)switch((f+536813528|0)>>>2|f+536813528<<30|0){case 0:{m=c[1164]|0;c[1164]=b&65543;if((b&1|0)==0|(m&1|0)!=0)break f;c[1166]=c[1165];break f}case 1:{c[1165]=b&16777215;break f}case 2:{c[1166]=b&16777215;break f}case 3:break f;default:break f}else fa(2,f+-24|0,b|0)|0;while(0);b=c[1168]|0;g:do if((f+-28&-268435456|0)==-536870912)switch((f+536813524|0)>>>2|f+536813524<<30|0){case 0:{m=c[1164]|0;c[1164]=b&65543;if((b&1|0)==0|(m&1|0)!=0)break g;c[1166]=c[1165];break g}case 1:{c[1165]=b&16777215;break g}case 2:{c[1166]=b&16777215;break g}case 3:break g;default:break g}else fa(2,f+-28|0,b|0)|0;while(0);b=c[1167]|0;h:do if((f+-32&-268435456|0)==-536870912)switch((f+536813520|0)>>>2|f+536813520<<30|0){case 0:{m=c[1164]|0;c[1164]=b&65543;if((b&1|0)==0|(m&1|0)!=0)break h;c[1166]=c[1165];break h}case 1:{c[1165]=b&16777215;break h}case 2:{c[1166]=b&16777215;break h}case 3:break h;default:break h}else fa(2,f+-32|0,b|0)|0;while(0);c[1180]=f+-32;e=(Z(1,60)|0)+2|0;c[1181]=-7;c[1183]=1}h=e+-2|0;m=Z(3,h|0)|0;i=e+2|0;c[1182]=i&-2;if(a[5300]|0){f=c[2]|0;c[n+8>>2]=h;c[n+8+4>>2]=m;Va(f,591,n+8|0)|0}if((m&65472|0)==16704){if(a[5300]|0){k=c[2]|0;c[n+16>>2]=m&7;c[n+16+4>>2]=m>>>3&7;Va(k,611,n+16|0)|0}d=c[4668+((m&7)<<2)>>2]|0;e=c[4668+((m>>>3&7)<<2)>>2]|0;k=c[1184]|0;c[4668+((m&7)<<2)>>2]=e+d+(k>>>29&1);b=(e+d+(k>>>29&1)|0)<0?k|-2147483648:k&2147483647;b=(e+d+(k>>>29&1)|0)==0?b|1073741824:b&-1073741825;c[1184]=b;if(!(b&536870912)){m=((e>>>31)+(d>>>31)+(((e&2147483647)+(d&2147483647)|0)>>>31)&2|0)==0?b&-536870913:b|536870912;c[1184]=(((e&2147483647)+(d&2147483647)|0)>>>31|0)==(((e>>>31)+(d>>>31)+(((e&2147483647)+(d&2147483647)|0)>>>31)|0)>>>1&1|0)?m&-268435457:m|268435456;m=0;l=n;return m|0}else{m=(((e>>>31)+(d>>>31)+(((e&2147483647)+(d&2147483647)+1|0)>>>31)|0)&2|0)==0?b&-536870913:b|536870912;c[1184]=(((e&2147483647)+(d&2147483647)+1|0)>>>31|0)==(((e>>>31)+(d>>>31)+(((e&2147483647)+(d&2147483647)+1|0)>>>31)|0)>>>1&1|0)?m&-268435457:m|268435456;m=0;l=n;return m|0}}if((m&65024|0)==7168)if(m>>>6&7|0){if(a[5300]|0){k=c[2]|0;c[n+24>>2]=m&7;c[n+24+4>>2]=m>>>3&7;c[n+24+8>>2]=m>>>6&7;Va(k,624,n+24|0)|0}j=c[4668+((m>>>3&7)<<2)>>2]|0;c[4668+((m&7)<<2)>>2]=j+(m>>>6&7);k=c[1184]|0;k=(j+(m>>>6&7)|0)<0?k|-2147483648:k&2147483647;k=(j+(m>>>6&7)|0)==0?k|1073741824:k&-1073741825;k=((((j&2147483647)+(m>>>6&7)|0)>>>31)+(j>>>31)&2|0)==0?k&-536870913:k|536870912;c[1184]=(((j&2147483647)+(m>>>6&7)|0)>>>31|0)==(((((j&2147483647)+(m>>>6&7)|0)>>>31)+(j>>>31)|0)>>>1|0)?k&-268435457:k|268435456;m=0;l=n;return m|0}if((m&63488|0)==12288){if(a[5300]|0){k=c[2]|0;c[n+40>>2]=m>>>8&7;c[n+40+4>>2]=m&255;Va(k,644,n+40|0)|0}j=c[4668+((m>>>8&7)<<2)>>2]|0;c[4668+((m>>>8&7)<<2)>>2]=j+(m&255);k=c[1184]|0;k=(j+(m&255)|0)<0?k|-2147483648:k&2147483647;k=(j+(m&255)|0)==0?k|1073741824:k&-1073741825;k=((((j&2147483647)+(m&255)|0)>>>31)+(j>>>31)&2|0)==0?k&-536870913:k|536870912;c[1184]=(((j&2147483647)+(m&255)|0)>>>31|0)==(((((j&2147483647)+(m&255)|0)>>>31)+(j>>>31)|0)>>>1|0)?k&-268435457:k|268435456;m=0;l=n;return m|0}if((m&65024|0)==6144){if(a[5300]|0){k=c[2]|0;c[n+48>>2]=m&7;c[n+48+4>>2]=m>>>3&7;c[n+48+8>>2]=m>>>6&7;Va(k,662,n+48|0)|0}k=c[4668+((m>>>3&7)<<2)>>2]|0;j=c[4668+((m>>>6&7)<<2)>>2]|0;c[4668+((m&7)<<2)>>2]=j+k;m=c[1184]|0;m=(j+k|0)<0?m|-2147483648:m&2147483647;m=(j+k|0)==0?m|1073741824:m&-1073741825;m=((j>>>31)+(k>>>31)+(((j&2147483647)+(k&2147483647)|0)>>>31)&2|0)==0?m&-536870913:m|536870912;c[1184]=(((j&2147483647)+(k&2147483647)|0)>>>31|0)==(((j>>>31)+(k>>>31)+(((j&2147483647)+(k&2147483647)|0)>>>31)|0)>>>1&1|0)?m&-268435457:m|268435456;m=0;l=n;return m|0}if((m&65280|0)==17408){if(a[5300]|0){k=c[2]|0;c[n+64>>2]=m>>>4&8|m&7;c[n+64+4>>2]=m>>>3&15;Va(k,680,n+64|0)|0}b=c[4668+((m>>>4&8|m&7)<<2)>>2]|0;if((m>>>4&8|m&7|0)==15){if(b&1|0){k=c[2]|0;c[n+72>>2]=b;Va(k,520,n+72|0)|0}b=b&-2}d=c[4668+((m>>>3&15)<<2)>>2]|0;if((m>>>3&15|0)==15){if(d&1|0){k=c[2]|0;c[n+80>>2]=d;Va(k,520,n+80|0)|0}d=d&-2}b=d+b|0;do if((m>>>4&8|m&7|0)==15)if(!(b&1)){k=c[2]|0;c[n+88>>2]=i;c[n+88+4>>2]=b;Va(k,693,n+88|0)|0;da(1)}else{j=b+2&-2;break}else j=b;while(0);c[4668+((m>>>4&8|m&7)<<2)>>2]=(m>>>4&8|m&7|0)==15?j&-2:j;m=0;l=n;return m|0}b=1;d=(m&63488)<<16>>16;if(b)switch(d|0){case -24576:{if(a[5300]|0){k=c[2]|0;c[n+96>>2]=m>>>8&7;c[n+96+4>>2]=m<<2&1020;Va(k,743,n+96|0)|0}b=c[1182]|0;if(b&1|0){k=c[2]|0;c[n+104>>2]=b;Va(k,520,n+104|0)|0}c[4668+((m>>>8&7)<<2)>>2]=(b&-4)+(m<<2&1020);m=0;l=n;return m|0}case -22528:{if(a[5300]|0){k=c[2]|0;c[n+112>>2]=m>>>8&7;c[n+112+4>>2]=m<<2&1020;Va(k,763,n+112|0)|0}c[4668+((m>>>8&7)<<2)>>2]=(c[1180]|0)+(m<<2&1020);m=0;l=n;return m|0}default:b=1}if(b)switch(d|0){default:{if((m&65408|0)==45056){if(a[5300]|0){k=c[2]|0;c[n+120>>2]=m<<2&508;Va(k,783,n+120|0)|0}c[1180]=(c[1180]|0)+(m<<2&508);m=0;l=n;return m|0}if((m&65472|0)==16384){if(a[5300]|0){k=c[2]|0;c[n+128>>2]=m&7;c[n+128+4>>2]=m>>>3&7;Va(k,799,n+128|0)|0}k=c[4668+((m>>>3&7)<<2)>>2]&c[4668+((m&7)<<2)>>2];c[4668+((m&7)<<2)>>2]=k;m=c[1184]|0;m=(k|0)<0?m|-2147483648:m&2147483647;c[1184]=(k|0)==0?m|1073741824:m&-1073741825;m=0;l=n;return m|0}if((m&63488|0)==4096){if(a[5300]|0){k=c[2]|0;c[n+136>>2]=m&7;c[n+136+4>>2]=m>>>3&7;c[n+136+8>>2]=m>>>6&31;Va(k,813,n+136|0)|0}b=c[4668+((m>>>3&7)<<2)>>2]|0;do if(!(m>>>6&31)){e=c[1184]|0;if((b|0)<0){c[1184]=e|536870912;d=-1;b=e|536870912;break}else{c[1184]=e&-536870913;d=0;b=e&-536870913;break}}else{k=c[1184]|0;k=b&1<<(m>>>6&31)+-1|0?k|536870912:k&-536870913;c[1184]=k;d=((b|0)<0?-1<<32-(m>>>6&31):0)|b>>>(m>>>6&31);b=k}while(0);c[4668+((m&7)<<2)>>2]=d;m=(d|0)<0?b|-2147483648:b&2147483647;c[1184]=(d|0)==0?m|1073741824:m&-1073741825;m=0;l=n;return m|0}if((m&65472|0)==16640){if(a[5300]|0){k=c[2]|0;c[n+152>>2]=m&7;c[n+152+4>>2]=m>>>3&7;Va(k,833,n+152|0)|0}d=c[4668+((m&7)<<2)>>2]|0;b=c[4668+((m>>>3&7)<<2)>>2]&255;do if(!b)b=c[1184]|0;else{if(b>>>0<32){k=c[1184]|0;k=1<<b+-1&d|0?k|536870912:k&-536870913;c[1184]=k;d=((d|0)<0?-1<<32-b:0)|d>>>b;b=k;break}b=c[1184]|0;if((d|0)<0){c[1184]=b|536870912;d=-1;b=b|536870912;break}else{c[1184]=b&-536870913;d=0;b=b&-536870913;break}}while(0);c[4668+((m&7)<<2)>>2]=d;m=(d|0)<0?b|-2147483648:b&2147483647;c[1184]=(d|0)==0?m|1073741824:m&-1073741825;m=0;l=n;return m|0}i:do if((m&61440|0)==53248){d=(((m&128|0)==0?m&255:m|-256)<<1)+i|0;do switch(m>>>8&15){case 0:{if(a[5300]|0){m=c[2]|0;c[n+160>>2]=d+-1;Va(m,847,n+160|0)|0}if(!(c[1184]&1073741824)){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 1:{if(a[5300]|0){m=c[2]|0;c[n+168>>2]=d+-1;Va(m,859,n+168|0)|0}if(c[1184]&1073741824|0){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 2:{if(a[5300]|0){m=c[2]|0;c[n+176>>2]=d+-1;Va(m,871,n+176|0)|0}if(!(c[1184]&536870912)){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 3:{if(a[5300]|0){m=c[2]|0;c[n+184>>2]=d+-1;Va(m,883,n+184|0)|0}if(c[1184]&536870912|0){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 4:{if(a[5300]|0){m=c[2]|0;c[n+192>>2]=d+-1;Va(m,895,n+192|0)|0}if((c[1184]|0)>=0){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 5:{if(a[5300]|0){m=c[2]|0;c[n+200>>2]=d+-1;Va(m,907,n+200|0)|0}if((c[1184]|0)<0){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 6:{if(a[5300]|0){m=c[2]|0;c[n+208>>2]=d+-1;Va(m,919,n+208|0)|0}if(!(c[1184]&268435456)){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 7:{if(a[5300]|0){m=c[2]|0;c[n+216>>2]=d+-1;Va(m,931,n+216|0)|0}if(c[1184]&268435456|0){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 8:{if(a[5300]|0){m=c[2]|0;c[n+224>>2]=d+-1;Va(m,943,n+224|0)|0}if((c[1184]&1610612736|0)!=536870912){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 9:{if(a[5300]|0){m=c[2]|0;c[n+232>>2]=d+-1;Va(m,955,n+232|0)|0}if((c[1184]&1610612736|0)==536870912){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 10:{if(a[5300]|0){m=c[2]|0;c[n+240>>2]=d+-1;Va(m,967,n+240|0)|0}b=c[1184]&-1879048192;j:do if((b|0)<0){switch(b|0){case -1879048192:break j;default:k=0}l=n;return k|0}else{switch(b|0){case 0:break j;default:k=0}l=n;return k|0}while(0);c[1182]=d+2&-2;m=0;l=n;return m|0}case 11:{if(a[5300]|0){m=c[2]|0;c[n+248>>2]=d+-1;Va(m,979,n+248|0)|0}m=c[1184]|0;if(!((m&268435456|0?((m|0)<0?0:(m&268435456)>>>28):(m|0)<0?1:(m&268435456)>>>28)|0)){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 12:{if(a[5300]|0){m=c[2]|0;c[n+256>>2]=d+-1;Va(m,991,n+256|0)|0}m=c[1184]|0;if(m&1073741824|0?1:(((m&-1879048192|0)==0?((m&-1879048192|0)==-1879048192?2:1):(m&-1879048192|0)==-1879048192&1)|0)==0){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}case 13:{if(a[5300]|0){m=c[2]|0;c[n+264>>2]=d+-1;Va(m,1003,n+264|0)|0}m=c[1184]|0;if(((m&268435456|0?((m|0)<0?0:(m&268435456)>>>28):(m|0)<0?1:(m&268435456)>>>28)|0)==(0-(m>>>30&1)|0)){m=0;l=n;return m|0}c[1182]=d+2&-2;m=0;l=n;return m|0}default:break i}while(0)}while(0);if((m&63488|0)==57344){b=(((m&1024|0)==0?m&2047:m|-2048)<<1)+i|0;if(a[5300]|0){m=c[2]|0;c[n+272>>2]=b+-1;Va(m,1015,n+272|0)|0}c[1182]=b+2&-2;m=0;l=n;return m|0}if((m&65472|0)==17280){if(a[5300]|0){k=c[2]|0;c[n+280>>2]=m&7;c[n+280+4>>2]=m>>>3&7;Va(k,1025,n+280|0)|0}k=c[4668+((m&7)<<2)>>2]&~c[4668+((m>>>3&7)<<2)>>2];c[4668+((m&7)<<2)>>2]=k;m=c[1184]|0;m=(k|0)<0?m|-2147483648:m&2147483647;c[1184]=(k|0)==0?m|1073741824:m&-1073741825;m=0;l=n;return m|0}if((m&65280|0)==48640){k=c[2]|0;c[n+288>>2]=m&255;Va(k,1039,n+288|0)|0;m=1;l=n;return m|0}k:do if((m&57344|0)==57344){if((m&6144)<4096){switch(m&6144){case 2048:break;default:break k}b=(c[1181]|0)+(m<<1&4094)&-4|2;if(a[5300]|0){m=c[2]|0;c[n+304>>2]=b+-3;Va(m,1052,n+304|0)|0}c[1181]=e|1;c[1182]=b;m=0;l=n;return m|0}switch(m&6144){case 4096:{if(a[5300]|0)ob(10,c[2]|0)|0;c[1181]=(((m&1024|0)==0?m&2047:m|1046528)<<12)+i;m=0;l=n;return m|0}case 6144:{b=(c[1181]|0)+(m<<1&4094)|0;if(a[5300]|0){m=c[2]|0;c[n+296>>2]=b+-1;Va(m,1052,n+296|0)|0}c[1181]=e|1;c[1182]=b+2&-2;m=0;l=n;return m|0}default:break k}}while(0);b=(a[5300]|0)!=0;d=1;f=(m&65415)<<16>>16;if(d)switch(f|0){case 18304:{if(b){k=c[2]|0;c[n+312>>2]=m>>>3&15;Va(k,1063,n+312|0)|0}b=c[4668+((m>>>3&15)<<2)>>2]|0;if((m>>>3&15|0)==15){if(b&1|0){k=c[2]|0;c[n+320>>2]=b;Va(k,520,n+320|0)|0}b=b&-2}b=b+2|0;if(!(b&1)){k=c[2]|0;c[n+328>>2]=i;c[n+328+4>>2]=m;Va(k,1072,n+328|0)|0;m=2;l=n;return m|0}else{c[1181]=e|1;c[1182]=b&-2;m=0;l=n;return m|0}}case 18176:{if(b){k=c[2]|0;c[n+336>>2]=m>>>3&15;Va(k,1108,n+336|0)|0}b=c[4668+((m>>>3&15)<<2)>>2]|0;if((m>>>3&15|0)==15){if(b&1|0){m=c[2]|0;c[n+344>>2]=b;Va(m,520,n+344|0)|0}b=b&-2}b=b+2|0;if(b&1|0){c[1182]=b&-2;m=0;l=n;return m|0}b=fa(4,h|0,b|0)|0;if(b|0){m=b;l=n;return m|0}c[1182]=(c[1181]|0)+2&-2;m=0;l=n;return m|0}default:d=1}if(d)switch(f|0){default:{if((m&65472|0)==17088){if(b){k=c[2]|0;c[n+352>>2]=m&7;c[n+352+4>>2]=m>>>3&7;Va(k,1154,n+352|0)|0}k=c[4668+((m&7)<<2)>>2]|0;j=c[4668+((m>>>3&7)<<2)>>2]|0;m=c[1184]|0;m=(j+k|0)<0?m|-2147483648:m&2147483647;m=(j+k|0)==0?m|1073741824:m&-1073741825;m=((j>>>31)+(k>>>31)+(((j&2147483647)+(k&2147483647)|0)>>>31)&2|0)==0?m&-536870913:m|536870912;c[1184]=(((j&2147483647)+(k&2147483647)|0)>>>31|0)==(((j>>>31)+(k>>>31)+(((j&2147483647)+(k&2147483647)|0)>>>31)|0)>>>1&1|0)?m&-268435457:m|268435456;m=0;l=n;return m|0}if((m&63488|0)==10240){if(b){k=c[2]|0;c[n+360>>2]=m>>>8&7;c[n+360+4>>2]=m&255;Va(k,1168,n+360|0)|0}j=c[4668+((m>>>8&7)<<2)>>2]|0;k=c[1184]|0;k=(j-(m&255)|0)<0?k|-2147483648:k&2147483647;k=(j-(m&255)|0)==0?k|1073741824:k&-1073741825;k=(((j>>>31)+1+((-2147483648-(m&255)+(j&2147483647)|0)>>>31)|0)&2|0)==0?k&-536870913:k|536870912;c[1184]=((-2147483648-(m&255)+(j&2147483647)|0)>>>31|0)==(((j>>>31)+1+((-2147483648-(m&255)+(j&2147483647)|0)>>>31)|0)>>>1&1|0)?k&-268435457:k|268435456;m=0;l=n;return m|0}if((m&65472|0)==17024){if(b){k=c[2]|0;c[n+368>>2]=m&7;c[n+368+4>>2]=m>>>3&7;Va(k,1185,n+368|0)|0}j=c[4668+((m&7)<<2)>>2]|0;k=c[4668+((m>>>3&7)<<2)>>2]|0;m=c[1184]|0;m=(j-k|0)<0?m|-2147483648:m&2147483647;m=(j-k|0)==0?m|1073741824:m&-1073741825;m=(((~k>>>31)+(j>>>31)+(((j&2147483647)+1+(~k&2147483647)|0)>>>31)|0)&2|0)==0?m&-536870913:m|536870912;c[1184]=(((j&2147483647)+1+(~k&2147483647)|0)>>>31|0)==(((~k>>>31)+(j>>>31)+(((j&2147483647)+1+(~k&2147483647)|0)>>>31)|0)>>>1&1|0)?m&-268435457:m|268435456;m=0;l=n;return m|0}if((m&65280|0)==17664){if(b){k=c[2]|0;c[n+376>>2]=m>>>4&8|m&7;c[n+376+4>>2]=m>>>3&15;Va(k,1185,n+376|0)|0}b=c[4668+((m>>>4&8|m&7)<<2)>>2]|0;if((m>>>4&8|m&7|0)==15){if(b&1|0){k=c[2]|0;c[n+384>>2]=b;Va(k,520,n+384|0)|0}d=b&-2}else d=b;b=c[4668+((m>>>3&15)<<2)>>2]|0;if((m>>>3&15|0)==15){if(b&1|0){m=c[2]|0;c[n+392>>2]=b;Va(m,520,n+392|0)|0}b=b&-2}k=d-b|0;m=c[1184]|0;m=(k|0)<0?m|-2147483648:m&2147483647;m=(k|0)==0?m|1073741824:m&-1073741825;k=~b;j=((d&2147483647)+1+(k&2147483647)|0)>>>31;k=(k>>>31)+(d>>>31)+j|0;m=(k&2|0)==0?m&-536870913:m|536870912;c[1184]=(j|0)==(k>>>1&1|0)?m&-268435457:m|268435456;m=0;l=n;return m|0}if((m&65512|0)==46688&b)La(1199,9,1,c[2]|0)|0;b=1;d=(m&65472)<<16>>16;if(b)switch(d|0){case 17920:{if(a[5300]|0){k=c[2]|0;c[n+400>>2]=m&7;c[n+400+4>>2]=m>>>3&7;Va(k,1209,n+400|0)|0}c[4668+((m&7)<<2)>>2]=c[4668+((m>>>3&7)<<2)>>2];m=0;l=n;return m|0}case 16448:{if(a[5300]|0){k=c[2]|0;c[n+408>>2]=m&7;c[n+408+4>>2]=m>>>3&7;Va(k,1222,n+408|0)|0}k=c[4668+((m>>>3&7)<<2)>>2]^c[4668+((m&7)<<2)>>2];c[4668+((m&7)<<2)>>2]=k;m=c[1184]|0;m=(k|0)<0?m|-2147483648:m&2147483647;c[1184]=(k|0)==0?m|1073741824:m&-1073741825;m=0;l=n;return m|0}default:b=1}if(b)switch(d|0){default:{l:do if((m&63488)<<16>>16<26624){switch((m&63488)<<16>>16){case -14336:break;default:break l}if(!(a[5300]|0))d=m&1;else{d=c[2]|0;c[n+416>>2]=m>>>8&7;Va(d,1236,n+416|0)|0;if(!(m&1))b=0;else{c[n+424>>2]=0;Va(d,1249,n+424|0)|0;b=1}if(m&2){if(b|0)ob(44,d)|0;c[n+1176>>2]=1;Va(d,1249,n+1176|0)|0;b=b+1|0}if(m&4){if(b|0)ob(44,d)|0;c[n+1184>>2]=2;Va(d,1249,n+1184|0)|0;b=b+1|0}if(m&8){if(b|0)ob(44,d)|0;c[n+1192>>2]=3;Va(d,1249,n+1192|0)|0;b=b+1|0}if(m&16){if(b|0)ob(44,d)|0;c[n+1200>>2]=4;Va(d,1249,n+1200|0)|0;b=b+1|0}if(m&32){if(b|0)ob(44,d)|0;c[n+1208>>2]=5;Va(d,1249,n+1208|0)|0;b=b+1|0}if(m&64){if(b|0)ob(44,d)|0;c[n+1216>>2]=6;Va(d,1249,n+1216|0)|0;b=b+1|0}if(m&128|0){if(b|0)ob(44,d)|0;c[n+1224>>2]=7;Va(d,1249,n+1224|0)|0}La(1253,2,1,d)|0;d=m&1}b=c[4668+((m>>>8&7)<<2)>>2]|0;if(d){c[1167]=Z(1,b|0)|0;b=b+4|0}if(m&2){c[1168]=Z(1,b|0)|0;b=b+4|0}if(m&4){c[1169]=Z(1,b|0)|0;b=b+4|0}if(m&8){c[1170]=Z(1,b|0)|0;b=b+4|0}if(m&16){c[1171]=Z(1,b|0)|0;b=b+4|0}if(m&32){c[1172]=Z(1,b|0)|0;b=b+4|0}if(m&64){c[1173]=Z(1,b|0)|0;b=b+4|0}if(m&128){c[1174]=Z(1,b|0)|0;b=b+4|0}if(1<<(m>>>8&7)&m|0){m=0;l=n;return m|0}c[4668+((m>>>8&7)<<2)>>2]=b;m=0;l=n;return m|0}else{switch((m&63488)<<16>>16){case 26624:break;default:break l}if(a[5300]|0){k=c[2]|0;c[n+432>>2]=m&7;c[n+432+4>>2]=m>>>3&7;c[n+432+8>>2]=m>>>4&124;Va(k,1256,n+432|0)|0}c[4668+((m&7)<<2)>>2]=Z(1,(c[4668+((m>>>3&7)<<2)>>2]|0)+(m>>>4&124)|0)|0;m=0;l=n;return m|0}while(0);if((m&65024|0)==22528){if(a[5300]|0){k=c[2]|0;c[n+448>>2]=m&7;c[n+448+4>>2]=m>>>3&7;c[n+448+8>>2]=m>>>6&7;Va(k,1277,n+448|0)|0}c[4668+((m&7)<<2)>>2]=Z(1,(c[4668+((m>>>6&7)<<2)>>2]|0)+(c[4668+((m>>>3&7)<<2)>>2]|0)|0)|0;m=0;l=n;return m|0}m:do if((m&63488)<<16>>16<18432){switch((m&63488)<<16>>16){case -26624:break;default:break m}if(a[5300]|0){k=c[2]|0;c[n+488>>2]=m>>>8&7;c[n+488+4>>2]=m<<2&1020;Va(k,1325,n+488|0)|0}c[4668+((m>>>8&7)<<2)>>2]=Z(1,(c[1180]|0)+(m<<2&1020)|0)|0;m=0;l=n;return m|0}else{if((m&63488)<<16>>16>=30720){switch((m&63488)<<16>>16){case 30720:break;default:break m}if(a[5300]|0){k=c[2]|0;c[n+496>>2]=m&7;c[n+496+4>>2]=m>>>3&7;c[n+496+8>>2]=m>>>6&31;Va(k,1345,n+496|0)|0}j=c[4668+((m>>>3&7)<<2)>>2]|0;k=Z(3,j+(m>>>6&31)&-2|0)|0;c[4668+((m&7)<<2)>>2]=((j+(m>>>6)&1|0)==0?k:k>>>8)&255;m=0;l=n;return m|0}switch((m&63488)<<16>>16){case 18432:break;default:break m}if(a[5300]|0){k=c[2]|0;c[n+464>>2]=m>>>8&7;c[n+464+4>>2]=m<<2&1020;Va(k,1296,n+464|0)|0}b=c[1182]|0;if(b&1|0){k=c[2]|0;c[n+472>>2]=b;Va(k,520,n+472|0)|0}if(a[5300]|0){k=c[2]|0;c[n+480>>2]=(b&-4)+(m<<2&1020);Va(k,1316,n+480|0)|0}c[4668+((m>>>8&7)<<2)>>2]=Z(1,(b&-4)+(m<<2&1020)|0)|0;m=0;l=n;return m|0}while(0);c[n+1368>>2]=k;c[n+3472>>2]=h;c[n+3496>>2]=m;c[n+3504>>2]=i;c[n+4792>>2]=0;c[n+4796>>2]=0;Gb(n);x=c[n+4792>>2]|0;u=c[n+4796>>2]|0;y=+g[n+4796>>2];c[n+4792>>2]=0;c[n+4796>>2]=0;if((x|0)==6)return u|0}}}}}}return 0}function za(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0;p=l;l=l+16|0;do if(a>>>0<245){n=a>>>0<11?16:a+11&-8;k=c[1185]|0;if(k>>>(n>>>3)&3|0){a=4780+((k>>>(n>>>3)&1^1)+(n>>>3)<<1<<2)|0;b=c[a+8>>2]|0;d=c[b+8>>2]|0;if((a|0)==(d|0))c[1185]=k&~(1<<(k>>>(n>>>3)&1^1)+(n>>>3));else{c[d+12>>2]=a;c[a+8>>2]=d}o=(k>>>(n>>>3)&1^1)+(n>>>3)<<3;c[b+4>>2]=o|3;c[b+o+4>>2]=c[b+o+4>>2]|1;o=b+8|0;l=p;return o|0}m=c[1187]|0;if(n>>>0>m>>>0){if(k>>>(n>>>3)|0){a=k>>>(n>>>3)<<(n>>>3)&(2<<(n>>>3)|0-(2<<(n>>>3)));f=((a&0-a)+-1|0)>>>(((a&0-a)+-1|0)>>>12&16);e=f>>>(f>>>5&8)>>>(f>>>(f>>>5&8)>>>2&4);e=(f>>>5&8|((a&0-a)+-1|0)>>>12&16|f>>>(f>>>5&8)>>>2&4|e>>>1&2|e>>>(e>>>1&2)>>>1&1)+(e>>>(e>>>1&2)>>>(e>>>(e>>>1&2)>>>1&1))|0;f=c[4780+(e<<1<<2)+8>>2]|0;a=c[f+8>>2]|0;if((4780+(e<<1<<2)|0)==(a|0)){c[1185]=k&~(1<<e);a=k&~(1<<e)}else{c[a+12>>2]=4780+(e<<1<<2);c[4780+(e<<1<<2)+8>>2]=a;a=k}c[f+4>>2]=n|3;c[f+n+4>>2]=(e<<3)-n|1;c[f+n+((e<<3)-n)>>2]=(e<<3)-n;if(m|0){d=c[1190]|0;if(!(a&1<<(m>>>3))){c[1185]=a|1<<(m>>>3);a=4780+(m>>>3<<1<<2)|0;b=4780+(m>>>3<<1<<2)+8|0}else{a=c[4780+(m>>>3<<1<<2)+8>>2]|0;b=4780+(m>>>3<<1<<2)+8|0}c[b>>2]=d;c[a+12>>2]=d;c[d+8>>2]=a;c[d+12>>2]=4780+(m>>>3<<1<<2)}c[1187]=(e<<3)-n;c[1190]=f+n;o=f+8|0;l=p;return o|0}j=c[1186]|0;if(j){b=((j&0-j)+-1|0)>>>(((j&0-j)+-1|0)>>>12&16);a=b>>>(b>>>5&8)>>>(b>>>(b>>>5&8)>>>2&4);a=c[5044+((b>>>5&8|((j&0-j)+-1|0)>>>12&16|b>>>(b>>>5&8)>>>2&4|a>>>1&2|a>>>(a>>>1&2)>>>1&1)+(a>>>(a>>>1&2)>>>(a>>>(a>>>1&2)>>>1&1))<<2)>>2]|0;b=(c[a+4>>2]&-8)-n|0;d=c[a+16+(((c[a+16>>2]|0)==0&1)<<2)>>2]|0;if(!d){i=a;g=b}else{do{h=(c[d+4>>2]&-8)-n|0;i=h>>>0<b>>>0;b=i?h:b;a=i?d:a;d=c[d+16+(((c[d+16>>2]|0)==0&1)<<2)>>2]|0}while((d|0)!=0);i=a;g=b}h=i+n|0;if(i>>>0<h>>>0){f=c[i+24>>2]|0;a=c[i+12>>2]|0;do if((a|0)==(i|0)){b=i+20|0;a=c[b>>2]|0;if(!a){b=i+16|0;a=c[b>>2]|0;if(!a){b=0;break}}while(1){d=a+20|0;e=c[d>>2]|0;if(e|0){a=e;b=d;continue}d=a+16|0;e=c[d>>2]|0;if(!e)break;else{a=e;b=d}}c[b>>2]=0;b=a}else{b=c[i+8>>2]|0;c[b+12>>2]=a;c[a+8>>2]=b;b=a}while(0);do if(f|0){a=c[i+28>>2]|0;if((i|0)==(c[5044+(a<<2)>>2]|0)){c[5044+(a<<2)>>2]=b;if(!b){c[1186]=j&~(1<<a);break}}else{c[f+16+(((c[f+16>>2]|0)!=(i|0)&1)<<2)>>2]=b;if(!b)break}c[b+24>>2]=f;a=c[i+16>>2]|0;if(a|0){c[b+16>>2]=a;c[a+24>>2]=b}a=c[i+20>>2]|0;if(a|0){c[b+20>>2]=a;c[a+24>>2]=b}}while(0);if(g>>>0<16){o=g+n|0;c[i+4>>2]=o|3;o=i+o+4|0;c[o>>2]=c[o>>2]|1}else{c[i+4>>2]=n|3;c[h+4>>2]=g|1;c[h+g>>2]=g;if(m|0){d=c[1190]|0;if(!(k&1<<(m>>>3))){c[1185]=k|1<<(m>>>3);a=4780+(m>>>3<<1<<2)|0;b=4780+(m>>>3<<1<<2)+8|0}else{a=c[4780+(m>>>3<<1<<2)+8>>2]|0;b=4780+(m>>>3<<1<<2)+8|0}c[b>>2]=d;c[a+12>>2]=d;c[d+8>>2]=a;c[d+12>>2]=4780+(m>>>3<<1<<2)}c[1187]=g;c[1190]=h}o=i+8|0;l=p;return o|0}}}}else if(a>>>0>4294967231)n=-1;else{n=a+11&-8;j=c[1186]|0;if(j){if(!((a+11|0)>>>8))h=0;else if(n>>>0>16777215)h=31;else{h=(a+11|0)>>>8<<((((a+11|0)>>>8)+1048320|0)>>>16&8);h=14-((h+520192|0)>>>16&4|(((a+11|0)>>>8)+1048320|0)>>>16&8|((h<<((h+520192|0)>>>16&4))+245760|0)>>>16&2)+(h<<((h+520192|0)>>>16&4)<<(((h<<((h+520192|0)>>>16&4))+245760|0)>>>16&2)>>>15)|0;h=n>>>(h+7|0)&1|h<<1}b=c[5044+(h<<2)>>2]|0;a:do if(!b){b=0;a=0;d=0-n|0;o=57}else{a=0;d=0-n|0;g=n<<((h|0)==31?0:25-(h>>>1)|0);f=0;while(1){e=(c[b+4>>2]&-8)-n|0;if(e>>>0<d>>>0)if(!e){a=b;d=0;e=b;o=61;break a}else{a=b;d=e}e=c[b+20>>2]|0;b=c[b+16+(g>>>31<<2)>>2]|0;f=(e|0)==0|(e|0)==(b|0)?f:e;e=(b|0)==0;if(e){b=f;o=57;break}else g=g<<((e^1)&1)}}while(0);if((o|0)==57){if((b|0)==0&(a|0)==0){a=2<<h;if(!(j&(a|0-a)))break;k=(j&(a|0-a)&0-(j&(a|0-a)))+-1|0;m=k>>>(k>>>12&16)>>>(k>>>(k>>>12&16)>>>5&8);b=m>>>(m>>>2&4)>>>(m>>>(m>>>2&4)>>>1&2);a=0;b=c[5044+((k>>>(k>>>12&16)>>>5&8|k>>>12&16|m>>>2&4|m>>>(m>>>2&4)>>>1&2|b>>>1&1)+(b>>>(b>>>1&1))<<2)>>2]|0}if(!b){i=a;g=d}else{e=b;o=61}}if((o|0)==61)while(1){o=0;b=(c[e+4>>2]&-8)-n|0;m=b>>>0<d>>>0;b=m?b:d;a=m?e:a;e=c[e+16+(((c[e+16>>2]|0)==0&1)<<2)>>2]|0;if(!e){i=a;g=b;break}else{d=b;o=61}}if(i)if(g>>>0<((c[1187]|0)-n|0)>>>0){h=i+n|0;if(i>>>0>=h>>>0){o=0;l=p;return o|0}f=c[i+24>>2]|0;a=c[i+12>>2]|0;do if((a|0)==(i|0)){b=i+20|0;a=c[b>>2]|0;if(!a){b=i+16|0;a=c[b>>2]|0;if(!a){a=0;break}}while(1){d=a+20|0;e=c[d>>2]|0;if(e|0){a=e;b=d;continue}d=a+16|0;e=c[d>>2]|0;if(!e)break;else{a=e;b=d}}c[b>>2]=0}else{o=c[i+8>>2]|0;c[o+12>>2]=a;c[a+8>>2]=o}while(0);do if(!f)e=j;else{b=c[i+28>>2]|0;if((i|0)==(c[5044+(b<<2)>>2]|0)){c[5044+(b<<2)>>2]=a;if(!a){c[1186]=j&~(1<<b);e=j&~(1<<b);break}}else{c[f+16+(((c[f+16>>2]|0)!=(i|0)&1)<<2)>>2]=a;if(!a){e=j;break}}c[a+24>>2]=f;b=c[i+16>>2]|0;if(b|0){c[a+16>>2]=b;c[b+24>>2]=a}b=c[i+20>>2]|0;if(!b)e=j;else{c[a+20>>2]=b;c[b+24>>2]=a;e=j}}while(0);do if(g>>>0<16){o=g+n|0;c[i+4>>2]=o|3;o=i+o+4|0;c[o>>2]=c[o>>2]|1}else{c[i+4>>2]=n|3;c[h+4>>2]=g|1;c[h+g>>2]=g;d=g>>>3;if(g>>>0<256){a=c[1185]|0;if(!(a&1<<d)){c[1185]=a|1<<d;a=4780+(d<<1<<2)|0;b=4780+(d<<1<<2)+8|0}else{a=c[4780+(d<<1<<2)+8>>2]|0;b=4780+(d<<1<<2)+8|0}c[b>>2]=h;c[a+12>>2]=h;c[h+8>>2]=a;c[h+12>>2]=4780+(d<<1<<2);break}a=g>>>8;if(!a)a=0;else if(g>>>0>16777215)a=31;else{o=a<<((a+1048320|0)>>>16&8)<<(((a<<((a+1048320|0)>>>16&8))+520192|0)>>>16&4);a=14-(((a<<((a+1048320|0)>>>16&8))+520192|0)>>>16&4|(a+1048320|0)>>>16&8|(o+245760|0)>>>16&2)+(o<<((o+245760|0)>>>16&2)>>>15)|0;a=g>>>(a+7|0)&1|a<<1}d=5044+(a<<2)|0;c[h+28>>2]=a;c[h+16+4>>2]=0;c[h+16>>2]=0;b=1<<a;if(!(e&b)){c[1186]=e|b;c[d>>2]=h;c[h+24>>2]=d;c[h+12>>2]=h;c[h+8>>2]=h;break}b=g<<((a|0)==31?0:25-(a>>>1)|0);d=c[d>>2]|0;while(1){if((c[d+4>>2]&-8|0)==(g|0)){o=97;break}e=d+16+(b>>>31<<2)|0;a=c[e>>2]|0;if(!a){o=96;break}else{b=b<<1;d=a}}if((o|0)==96){c[e>>2]=h;c[h+24>>2]=d;c[h+12>>2]=h;c[h+8>>2]=h;break}else if((o|0)==97){n=d+8|0;o=c[n>>2]|0;c[o+12>>2]=h;c[n>>2]=h;c[h+8>>2]=o;c[h+12>>2]=d;c[h+24>>2]=0;break}}while(0);o=i+8|0;l=p;return o|0}}}while(0);d=c[1187]|0;if(d>>>0>=n>>>0){a=d-n|0;b=c[1190]|0;if(a>>>0>15){o=b+n|0;c[1190]=o;c[1187]=a;c[o+4>>2]=a|1;c[o+a>>2]=a;c[b+4>>2]=n|3}else{c[1187]=0;c[1190]=0;c[b+4>>2]=d|3;c[b+d+4>>2]=c[b+d+4>>2]|1}o=b+8|0;l=p;return o|0}g=c[1188]|0;if(g>>>0>n>>>0){k=g-n|0;c[1188]=k;o=c[1191]|0;m=o+n|0;c[1191]=m;c[m+4>>2]=k|1;c[o+4>>2]=n|3;o=o+8|0;l=p;return o|0}if(!(c[1303]|0)){c[1305]=4096;c[1304]=4096;c[1306]=-1;c[1307]=-1;c[1308]=0;c[1296]=0;c[p>>2]=p&-16^1431655768;c[1303]=p&-16^1431655768;a=4096}else a=c[1305]|0;h=n+48|0;i=n+47|0;k=a+i|0;j=0-a|0;if((k&j)>>>0<=n>>>0){o=0;l=p;return o|0}a=c[1295]|0;if(a|0){m=c[1293]|0;if((m+(k&j)|0)>>>0<=m>>>0?1:(m+(k&j)|0)>>>0>a>>>0){o=0;l=p;return o|0}}b:do if(!(c[1296]&4)){d=c[1191]|0;c:do if(!d)o=118;else{a=5188;while(1){b=c[a>>2]|0;if(b>>>0<=d>>>0){f=a+4|0;if((b+(c[f>>2]|0)|0)>>>0>d>>>0)break}a=c[a+8>>2]|0;if(!a){o=118;break c}}if((k-g&j)>>>0<2147483647){e=zb(k-g&j|0)|0;if((e|0)==((c[a>>2]|0)+(c[f>>2]|0)|0))if((e|0)==(-1|0))a=k-g&j;else{g=k-g&j;o=135;break b}else{d=k-g&j;o=126}}else a=0}while(0);do if((o|0)==118){f=zb(0)|0;if((f|0)==(-1|0))a=0;else{d=c[1304]|0;d=((d+-1&f|0)==0?0:(d+-1+f&0-d)-f|0)+(k&j)|0;a=c[1293]|0;if(d>>>0>n>>>0&d>>>0<2147483647){b=c[1295]|0;if(b|0)if((d+a|0)>>>0<=a>>>0|(d+a|0)>>>0>b>>>0){a=0;break}e=zb(d|0)|0;if((e|0)==(f|0)){g=d;e=f;o=135;break b}else o=126}else a=0}}while(0);do if((o|0)==126){b=0-d|0;if(!(h>>>0>d>>>0&(d>>>0<2147483647&(e|0)!=(-1|0))))if((e|0)==(-1|0)){a=0;break}else{g=d;o=135;break b}a=c[1305]|0;a=i-d+a&0-a;if(a>>>0>=2147483647){g=d;o=135;break b}if((zb(a|0)|0)==(-1|0)){zb(b|0)|0;a=0;break}else{g=a+d|0;o=135;break b}}while(0);c[1296]=c[1296]|4;o=133}else{a=0;o=133}while(0);if((o|0)==133)if((k&j)>>>0<2147483647){e=zb(k&j|0)|0;b=zb(0)|0;d=(b-e|0)>>>0>(n+40|0)>>>0;if(!((e|0)==(-1|0)|d^1|e>>>0<b>>>0&((e|0)!=(-1|0)&(b|0)!=(-1|0))^1)){g=d?b-e|0:a;o=135}}if((o|0)==135){a=(c[1293]|0)+g|0;c[1293]=a;if(a>>>0>(c[1294]|0)>>>0)c[1294]=a;h=c[1191]|0;do if(!h){o=c[1189]|0;if((o|0)==0|e>>>0<o>>>0)c[1189]=e;c[1297]=e;c[1298]=g;c[1300]=0;c[1194]=c[1303];c[1193]=-1;a=0;do{o=4780+(a<<1<<2)|0;c[o+12>>2]=o;c[o+8>>2]=o;a=a+1|0}while((a|0)!=32);o=e+8|0;o=(o&7|0)==0?0:0-o&7;m=e+o|0;o=g+-40-o|0;c[1191]=m;c[1188]=o;c[m+4>>2]=o|1;c[m+o+4>>2]=40;c[1192]=c[1307]}else{a=5188;do{b=c[a>>2]|0;d=a+4|0;f=c[d>>2]|0;if((e|0)==(b+f|0)){o=145;break}a=c[a+8>>2]|0}while((a|0)!=0);if((o|0)==145)if(!(c[a+12>>2]&8))if(h>>>0<e>>>0&h>>>0>=b>>>0){c[d>>2]=f+g;m=(h+8&7|0)==0?0:0-(h+8)&7;o=(c[1188]|0)+(g-m)|0;c[1191]=h+m;c[1188]=o;c[h+m+4>>2]=o|1;c[h+m+o+4>>2]=40;c[1192]=c[1307];break}if(e>>>0<(c[1189]|0)>>>0)c[1189]=e;b=e+g|0;a=5188;do{if((c[a>>2]|0)==(b|0)){o=153;break}a=c[a+8>>2]|0}while((a|0)!=0);if((o|0)==153)if(!(c[a+12>>2]&8)){c[a>>2]=e;k=a+4|0;c[k>>2]=(c[k>>2]|0)+g;k=e+8|0;k=e+((k&7|0)==0?0:0-k&7)|0;a=b+((b+8&7|0)==0?0:0-(b+8)&7)|0;j=k+n|0;i=a-k-n|0;c[k+4>>2]=n|3;do if((a|0)==(h|0)){o=(c[1188]|0)+i|0;c[1188]=o;c[1191]=j;c[j+4>>2]=o|1}else{if((a|0)==(c[1190]|0)){o=(c[1187]|0)+i|0;c[1187]=o;c[1190]=j;c[j+4>>2]=o|1;c[j+o>>2]=o;break}h=c[a+4>>2]|0;if((h&3|0)==1){d:do if(h>>>0<256){b=c[a+8>>2]|0;d=c[a+12>>2]|0;if((d|0)==(b|0)){c[1185]=c[1185]&~(1<<(h>>>3));break}else{c[b+12>>2]=d;c[d+8>>2]=b;break}}else{g=c[a+24>>2]|0;b=c[a+12>>2]|0;do if((b|0)==(a|0)){b=c[a+16+4>>2]|0;if(!b){b=c[a+16>>2]|0;if(!b){b=0;break}else f=a+16|0}else f=a+16+4|0;while(1){d=b+20|0;e=c[d>>2]|0;if(e|0){b=e;f=d;continue}d=b+16|0;e=c[d>>2]|0;if(!e)break;else{b=e;f=d}}c[f>>2]=0}else{o=c[a+8>>2]|0;c[o+12>>2]=b;c[b+8>>2]=o}while(0);if(!g)break;d=c[a+28>>2]|0;do if((a|0)==(c[5044+(d<<2)>>2]|0)){c[5044+(d<<2)>>2]=b;if(b|0)break;c[1186]=c[1186]&~(1<<d);break d}else{c[g+16+(((c[g+16>>2]|0)!=(a|0)&1)<<2)>>2]=b;if(!b)break d}while(0);c[b+24>>2]=g;d=c[a+16>>2]|0;if(d|0){c[b+16>>2]=d;c[d+24>>2]=b}d=c[a+16+4>>2]|0;if(!d)break;c[b+20>>2]=d;c[d+24>>2]=b}while(0);a=a+(h&-8)|0;f=(h&-8)+i|0}else f=i;d=a+4|0;c[d>>2]=c[d>>2]&-2;c[j+4>>2]=f|1;c[j+f>>2]=f;d=f>>>3;if(f>>>0<256){a=c[1185]|0;if(!(a&1<<d)){c[1185]=a|1<<d;a=4780+(d<<1<<2)|0;b=4780+(d<<1<<2)+8|0}else{a=c[4780+(d<<1<<2)+8>>2]|0;b=4780+(d<<1<<2)+8|0}c[b>>2]=j;c[a+12>>2]=j;c[j+8>>2]=a;c[j+12>>2]=4780+(d<<1<<2);break}a=f>>>8;do if(!a)a=0;else{if(f>>>0>16777215){a=31;break}o=a<<((a+1048320|0)>>>16&8)<<(((a<<((a+1048320|0)>>>16&8))+520192|0)>>>16&4);a=14-(((a<<((a+1048320|0)>>>16&8))+520192|0)>>>16&4|(a+1048320|0)>>>16&8|(o+245760|0)>>>16&2)+(o<<((o+245760|0)>>>16&2)>>>15)|0;a=f>>>(a+7|0)&1|a<<1}while(0);e=5044+(a<<2)|0;c[j+28>>2]=a;c[j+16+4>>2]=0;c[j+16>>2]=0;b=c[1186]|0;d=1<<a;if(!(b&d)){c[1186]=b|d;c[e>>2]=j;c[j+24>>2]=e;c[j+12>>2]=j;c[j+8>>2]=j;break}b=f<<((a|0)==31?0:25-(a>>>1)|0);d=c[e>>2]|0;while(1){if((c[d+4>>2]&-8|0)==(f|0)){o=194;break}e=d+16+(b>>>31<<2)|0;a=c[e>>2]|0;if(!a){o=193;break}else{b=b<<1;d=a}}if((o|0)==193){c[e>>2]=j;c[j+24>>2]=d;c[j+12>>2]=j;c[j+8>>2]=j;break}else if((o|0)==194){n=d+8|0;o=c[n>>2]|0;c[o+12>>2]=j;c[n>>2]=j;c[j+8>>2]=o;c[j+12>>2]=d;c[j+24>>2]=0;break}}while(0);o=k+8|0;l=p;return o|0}b=5188;while(1){a=c[b>>2]|0;if(a>>>0<=h>>>0){d=a+(c[b+4>>2]|0)|0;if(d>>>0>h>>>0)break}b=c[b+8>>2]|0}f=d+-47+((d+-47+8&7|0)==0?0:0-(d+-47+8)&7)|0;f=f>>>0<(h+16|0)>>>0?h:f;a=e+8|0;a=(a&7|0)==0?0:0-a&7;o=e+a|0;a=g+-40-a|0;c[1191]=o;c[1188]=a;c[o+4>>2]=a|1;c[o+a+4>>2]=40;c[1192]=c[1307];c[f+4>>2]=27;c[f+8>>2]=c[1297];c[f+8+4>>2]=c[1298];c[f+8+8>>2]=c[1299];c[f+8+12>>2]=c[1300];c[1297]=e;c[1298]=g;c[1300]=0;c[1299]=f+8;a=f+24|0;do{o=a;a=a+4|0;c[a>>2]=7}while((o+8|0)>>>0<d>>>0);if((f|0)!=(h|0)){c[f+4>>2]=c[f+4>>2]&-2;c[h+4>>2]=f-h|1;c[f>>2]=f-h;if((f-h|0)>>>0<256){d=4780+((f-h|0)>>>3<<1<<2)|0;a=c[1185]|0;if(!(a&1<<((f-h|0)>>>3))){c[1185]=a|1<<((f-h|0)>>>3);a=d;b=d+8|0}else{a=c[d+8>>2]|0;b=d+8|0}c[b>>2]=h;c[a+12>>2]=h;c[h+8>>2]=a;c[h+12>>2]=d;break}if(!((f-h|0)>>>8))a=0;else if((f-h|0)>>>0>16777215)a=31;else{a=(f-h|0)>>>8<<((((f-h|0)>>>8)+1048320|0)>>>16&8);a=14-((a+520192|0)>>>16&4|(((f-h|0)>>>8)+1048320|0)>>>16&8|((a<<((a+520192|0)>>>16&4))+245760|0)>>>16&2)+(a<<((a+520192|0)>>>16&4)<<(((a<<((a+520192|0)>>>16&4))+245760|0)>>>16&2)>>>15)|0;a=(f-h|0)>>>(a+7|0)&1|a<<1}e=5044+(a<<2)|0;c[h+28>>2]=a;c[h+20>>2]=0;c[h+16>>2]=0;b=c[1186]|0;d=1<<a;if(!(b&d)){c[1186]=b|d;c[e>>2]=h;c[h+24>>2]=e;c[h+12>>2]=h;c[h+8>>2]=h;break}b=f-h<<((a|0)==31?0:25-(a>>>1)|0);d=c[e>>2]|0;while(1){if((c[d+4>>2]&-8|0)==(f-h|0)){o=216;break}e=d+16+(b>>>31<<2)|0;a=c[e>>2]|0;if(!a){o=215;break}else{b=b<<1;d=a}}if((o|0)==215){c[e>>2]=h;c[h+24>>2]=d;c[h+12>>2]=h;c[h+8>>2]=h;break}else if((o|0)==216){m=d+8|0;o=c[m>>2]|0;c[o+12>>2]=h;c[m>>2]=h;c[h+8>>2]=o;c[h+12>>2]=d;c[h+24>>2]=0;break}}}while(0);a=c[1188]|0;if(a>>>0>n>>>0){k=a-n|0;c[1188]=k;o=c[1191]|0;m=o+n|0;c[1191]=m;c[m+4>>2]=k|1;c[o+4>>2]=n|3;o=o+8|0;l=p;return o|0}}c[(Ga()|0)>>2]=12;o=0;l=p;return o|0}function Aa(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0;if(!a)return;b=c[1189]|0;d=c[a+-4>>2]|0;j=a+-8+(d&-8)|0;do if(!(d&1)){e=c[a+-8>>2]|0;if(!(d&3))return;h=a+-8+(0-e)|0;g=e+(d&-8)|0;if(h>>>0<b>>>0)return;if((h|0)==(c[1190]|0)){a=c[j+4>>2]|0;if((a&3|0)!=3){i=h;b=g;break}c[1187]=g;c[j+4>>2]=a&-2;c[h+4>>2]=g|1;c[h+g>>2]=g;return}if(e>>>0<256){a=c[h+8>>2]|0;b=c[h+12>>2]|0;if((b|0)==(a|0)){c[1185]=c[1185]&~(1<<(e>>>3));i=h;b=g;break}else{c[a+12>>2]=b;c[b+8>>2]=a;i=h;b=g;break}}f=c[h+24>>2]|0;a=c[h+12>>2]|0;do if((a|0)==(h|0)){a=c[h+16+4>>2]|0;if(!a){a=c[h+16>>2]|0;if(!a){a=0;break}else e=h+16|0}else e=h+16+4|0;while(1){b=a+20|0;d=c[b>>2]|0;if(d|0){a=d;e=b;continue}b=a+16|0;d=c[b>>2]|0;if(!d)break;else{a=d;e=b}}c[e>>2]=0}else{i=c[h+8>>2]|0;c[i+12>>2]=a;c[a+8>>2]=i}while(0);if(!f){i=h;b=g}else{b=c[h+28>>2]|0;if((h|0)==(c[5044+(b<<2)>>2]|0)){c[5044+(b<<2)>>2]=a;if(!a){c[1186]=c[1186]&~(1<<b);i=h;b=g;break}}else{c[f+16+(((c[f+16>>2]|0)!=(h|0)&1)<<2)>>2]=a;if(!a){i=h;b=g;break}}c[a+24>>2]=f;b=c[h+16>>2]|0;if(b|0){c[a+16>>2]=b;c[b+24>>2]=a}b=c[h+16+4>>2]|0;if(!b){i=h;b=g}else{c[a+20>>2]=b;c[b+24>>2]=a;i=h;b=g}}}else{i=a+-8|0;b=d&-8;h=a+-8|0}while(0);if(h>>>0>=j>>>0)return;d=c[j+4>>2]|0;if(!(d&1))return;if(!(d&2)){a=c[1190]|0;if((j|0)==(c[1191]|0)){j=(c[1188]|0)+b|0;c[1188]=j;c[1191]=i;c[i+4>>2]=j|1;if((i|0)!=(a|0))return;c[1190]=0;c[1187]=0;return}if((j|0)==(a|0)){j=(c[1187]|0)+b|0;c[1187]=j;c[1190]=h;c[i+4>>2]=j|1;c[h+j>>2]=j;return}f=(d&-8)+b|0;do if(d>>>0<256){b=c[j+8>>2]|0;a=c[j+12>>2]|0;if((a|0)==(b|0)){c[1185]=c[1185]&~(1<<(d>>>3));break}else{c[b+12>>2]=a;c[a+8>>2]=b;break}}else{g=c[j+24>>2]|0;a=c[j+12>>2]|0;do if((a|0)==(j|0)){a=c[j+16+4>>2]|0;if(!a){a=c[j+16>>2]|0;if(!a){b=0;break}else e=j+16|0}else e=j+16+4|0;while(1){b=a+20|0;d=c[b>>2]|0;if(d|0){a=d;e=b;continue}b=a+16|0;d=c[b>>2]|0;if(!d)break;else{a=d;e=b}}c[e>>2]=0;b=a}else{b=c[j+8>>2]|0;c[b+12>>2]=a;c[a+8>>2]=b;b=a}while(0);if(g|0){a=c[j+28>>2]|0;if((j|0)==(c[5044+(a<<2)>>2]|0)){c[5044+(a<<2)>>2]=b;if(!b){c[1186]=c[1186]&~(1<<a);break}}else{c[g+16+(((c[g+16>>2]|0)!=(j|0)&1)<<2)>>2]=b;if(!b)break}c[b+24>>2]=g;a=c[j+16>>2]|0;if(a|0){c[b+16>>2]=a;c[a+24>>2]=b}a=c[j+16+4>>2]|0;if(a|0){c[b+20>>2]=a;c[a+24>>2]=b}}}while(0);c[i+4>>2]=f|1;c[h+f>>2]=f;if((i|0)==(c[1190]|0)){c[1187]=f;return}}else{c[j+4>>2]=d&-2;c[i+4>>2]=b|1;c[h+b>>2]=b;f=b}d=f>>>3;if(f>>>0<256){a=c[1185]|0;if(!(a&1<<d)){c[1185]=a|1<<d;a=4780+(d<<1<<2)|0;b=4780+(d<<1<<2)+8|0}else{a=c[4780+(d<<1<<2)+8>>2]|0;b=4780+(d<<1<<2)+8|0}c[b>>2]=i;c[a+12>>2]=i;c[i+8>>2]=a;c[i+12>>2]=4780+(d<<1<<2);return}a=f>>>8;if(!a)a=0;else if(f>>>0>16777215)a=31;else{j=a<<((a+1048320|0)>>>16&8)<<(((a<<((a+1048320|0)>>>16&8))+520192|0)>>>16&4);a=14-(((a<<((a+1048320|0)>>>16&8))+520192|0)>>>16&4|(a+1048320|0)>>>16&8|(j+245760|0)>>>16&2)+(j<<((j+245760|0)>>>16&2)>>>15)|0;a=f>>>(a+7|0)&1|a<<1}e=5044+(a<<2)|0;c[i+28>>2]=a;c[i+20>>2]=0;c[i+16>>2]=0;b=c[1186]|0;d=1<<a;do if(!(b&d)){c[1186]=b|d;c[e>>2]=i;c[i+24>>2]=e;c[i+12>>2]=i;c[i+8>>2]=i}else{b=f<<((a|0)==31?0:25-(a>>>1)|0);d=c[e>>2]|0;while(1){if((c[d+4>>2]&-8|0)==(f|0)){a=73;break}e=d+16+(b>>>31<<2)|0;a=c[e>>2]|0;if(!a){a=72;break}else{b=b<<1;d=a}}if((a|0)==72){c[e>>2]=i;c[i+24>>2]=d;c[i+12>>2]=i;c[i+8>>2]=i;break}else if((a|0)==73){h=d+8|0;j=c[h>>2]|0;c[j+12>>2]=i;c[h>>2]=i;c[i+8>>2]=j;c[i+12>>2]=d;c[i+24>>2]=0;break}}while(0);j=(c[1193]|0)+-1|0;c[1193]=j;if(!j)a=5196;else return;while(1){a=c[a>>2]|0;if(!a)break;else a=a+8|0}c[1193]=-1;return}function Ba(){return 5236}function Ca(a){a=a|0;var b=0;b=l;l=l+16|0;c[b>>2]=Ja(c[a+60>>2]|0)|0;a=Fa(_(6,b|0)|0)|0;l=b;return a|0}function Da(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;i=l;l=l+48|0;e=c[a+28>>2]|0;c[i+32>>2]=e;e=(c[a+20>>2]|0)-e|0;c[i+32+4>>2]=e;c[i+32+8>>2]=b;c[i+32+12>>2]=d;c[i>>2]=c[a+60>>2];c[i+4>>2]=i+32;c[i+8>>2]=2;f=Fa(aa(146,i|0)|0)|0;a:do if((e+d|0)==(f|0))h=3;else{b=2;g=e+d|0;e=i+32|0;while(1){if((f|0)<0)break;g=g-f|0;j=c[e+4>>2]|0;k=f>>>0>j>>>0;e=k?e+8|0:e;b=(k<<31>>31)+b|0;j=f-(k?j:0)|0;c[e>>2]=(c[e>>2]|0)+j;c[e+4>>2]=(c[e+4>>2]|0)-j;c[i+16>>2]=c[a+60>>2];c[i+16+4>>2]=e;c[i+16+8>>2]=b;f=Fa(aa(146,i+16|0)|0)|0;if((g|0)==(f|0)){h=3;break a}}c[a+16>>2]=0;c[a+28>>2]=0;c[a+20>>2]=0;c[a>>2]=c[a>>2]|32;if((b|0)==2)d=0;else d=d-(c[e+4>>2]|0)|0}while(0);if((h|0)==3){k=c[a+44>>2]|0;c[a+16>>2]=k+(c[a+48>>2]|0);c[a+28>>2]=k;c[a+20>>2]=k}l=i;return d|0}function Ea(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=l;l=l+32|0;c[e>>2]=c[a+60>>2];c[e+4>>2]=0;c[e+8>>2]=b;c[e+12>>2]=e+20;c[e+16>>2]=d;if((Fa(ca(140,e|0)|0)|0)<0){c[e+20>>2]=-1;a=-1}else a=c[e+20>>2]|0;l=e;return a|0}function Fa(a){a=a|0;if(a>>>0>4294963200){c[(Ga()|0)>>2]=0-a;a=-1}return a|0}function Ga(){return (Ha()|0)+64|0}function Ha(){return Ia()|0}function Ia(){return 136}function Ja(a){a=a|0;return a|0}function Ka(b,c){b=b|0;c=c|0;var d=0,e=0;d=a[b>>0]|0;e=a[c>>0]|0;if(d<<24>>24==0?1:d<<24>>24!=e<<24>>24)b=e;else{do{b=b+1|0;c=c+1|0;d=a[b>>0]|0;e=a[c>>0]|0}while(!(d<<24>>24==0?1:d<<24>>24!=e<<24>>24));b=e}return (d&255)-(b&255)|0}function La(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=O(d,b)|0;d=(b|0)==0?0:d;if((c[e+76>>2]|0)>-1){g=(Na(e)|0)==0;a=Qa(a,f,e)|0;if(!g)Ma(e)}else a=Qa(a,f,e)|0;if((a|0)!=(f|0))d=(a>>>0)/(b>>>0)|0;return d|0}function Ma(a){a=a|0;return}function Na(a){a=a|0;return 0}function Oa(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,i=0;i=l;l=l+16|0;a[i>>0]=e;f=c[b+16>>2]|0;if(!f)if(!(Pa(b)|0)){g=c[b+16>>2]|0;h=4}else f=-1;else{g=f;h=4}do if((h|0)==4){f=c[b+20>>2]|0;if(f>>>0<g>>>0)if((e&255|0)!=(a[b+75>>0]|0)){c[b+20>>2]=f+1;a[f>>0]=e;f=e&255;break}if((ia[c[b+36>>2]&3](b,i,1)|0)==1)f=d[i>>0]|0;else f=-1}while(0);l=i;return f|0}function Pa(b){b=b|0;var d=0;d=a[b+74>>0]|0;a[b+74>>0]=d+255|d;d=c[b>>2]|0;if(!(d&8)){c[b+8>>2]=0;c[b+4>>2]=0;d=c[b+44>>2]|0;c[b+28>>2]=d;c[b+20>>2]=d;c[b+16>>2]=d+(c[b+48>>2]|0);b=0}else{c[b>>2]=d|32;b=-1}return b|0}function Qa(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=c[e+16>>2]|0;if(!f)if(!(Pa(e)|0)){g=c[e+16>>2]|0;h=5}else f=0;else{g=f;h=5}a:do if((h|0)==5){f=c[e+20>>2]|0;if((g-f|0)>>>0<d>>>0){f=ia[c[e+36>>2]&3](e,b,d)|0;break}b:do if((a[e+75>>0]|0)>-1){h=d;while(1){if(!h){i=0;g=b;break b}g=h+-1|0;if((a[b+g>>0]|0)==10)break;else h=g}f=ia[c[e+36>>2]&3](e,b,h)|0;if(f>>>0<h>>>0)break a;i=h;g=b+h|0;d=d-h|0;f=c[e+20>>2]|0}else{i=0;g=b}while(0);vb(f|0,g|0,d|0)|0;c[e+20>>2]=(c[e+20>>2]|0)+d;f=i+d|0}while(0);return f|0}function Ra(a,b){a=a|0;b=b|0;if(!b)b=0;else b=Sa(c[b>>2]|0,c[b+4>>2]|0,a)|0;return (b|0?b:a)|0}function Sa(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;n=(c[b>>2]|0)+1794895138|0;f=Ta(c[b+8>>2]|0,n)|0;k=Ta(c[b+12>>2]|0,n)|0;m=Ta(c[b+16>>2]|0,n)|0;a:do if(f>>>0<d>>>2>>>0)if(k>>>0<(d-(f<<2)|0)>>>0&m>>>0<(d-(f<<2)|0)>>>0)if(!((m|k)&3)){j=0;while(1){i=f>>>1;l=j+i|0;g=Ta(c[b+((l<<1)+(k>>>2)<<2)>>2]|0,n)|0;h=Ta(c[b+((l<<1)+(k>>>2)+1<<2)>>2]|0,n)|0;if(!(h>>>0<d>>>0&g>>>0<(d-h|0)>>>0)){f=0;break a}if(a[b+(h+g)>>0]|0){f=0;break a}g=Ka(e,b+h|0)|0;if(!g)break;if((f|0)==1){f=0;break a}else{j=(g|0)<0?j:l;f=(g|0)<0?i:f-i|0}}g=Ta(c[b+((l<<1)+(m>>>2)<<2)>>2]|0,n)|0;f=Ta(c[b+((l<<1)+(m>>>2)+1<<2)>>2]|0,n)|0;if(f>>>0<d>>>0&g>>>0<(d-f|0)>>>0)f=(a[b+(f+g)>>0]|0)==0?b+f|0:0;else f=0}else f=0;else f=0;else f=0;while(0);return f|0}function Ta(a,b){a=a|0;b=b|0;var c=0;c=Bb(a|0)|0;return ((b|0)==0?a:c)|0}function Ua(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;a:do if((e|0)!=0&(b&3|0)!=0){f=b;b=e;while(1){if((a[f>>0]|0)==(d&255)<<24>>24){g=6;break a}f=f+1|0;e=b+-1|0;if((e|0)!=0&(f&3|0)!=0)b=e;else{b=e;e=(e|0)!=0;g=5;break}}}else{f=b;b=e;e=(e|0)!=0;g=5}while(0);if((g|0)==5)if(e)g=6;else b=0;b:do if((g|0)==6)if((a[f>>0]|0)!=(d&255)<<24>>24){e=O(d&255,16843009)|0;c:do if(b>>>0>3)while(1){h=c[f>>2]^e;if((h&-2139062144^-2139062144)&h+-16843009|0)break;f=f+4|0;b=b+-4|0;if(b>>>0<=3){g=11;break c}}else g=11;while(0);if((g|0)==11)if(!b){b=0;break}while(1){if((a[f>>0]|0)==(d&255)<<24>>24)break b;f=f+1|0;b=b+-1|0;if(!b){b=0;break}}}while(0);return (b|0?f:0)|0}function Va(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=l;l=l+16|0;c[e>>2]=d;d=Wa(a,b,e)|0;l=e;return d|0}function Wa(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;i=l;l=l+224|0;f=i+80|0;g=f+40|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(g|0));c[i+120>>2]=c[e>>2];if((Xa(0,d,i+120|0,i,i+80|0)|0)<0)e=-1;else{if((c[b+76>>2]|0)>-1)h=Na(b)|0;else h=0;g=c[b>>2]|0;if((a[b+74>>0]|0)<1)c[b>>2]=g&-33;if(!(c[b+48>>2]|0)){f=c[b+44>>2]|0;c[b+44>>2]=i+136;c[b+28>>2]=i+136;c[b+20>>2]=i+136;c[b+48>>2]=80;c[b+16>>2]=i+136+80;e=Xa(b,d,i+120|0,i,i+80|0)|0;if(f){ia[c[b+36>>2]&3](b,0,0)|0;e=(c[b+20>>2]|0)==0?-1:e;c[b+44>>2]=f;c[b+48>>2]=0;c[b+16>>2]=0;c[b+28>>2]=0;c[b+20>>2]=0}}else e=Xa(b,d,i+120|0,i,i+80|0)|0;f=c[b>>2]|0;c[b>>2]=f|g&32;if(h|0)Ma(b);e=(f&32|0)==0?e:-1}l=i;return e|0}function Xa(d,e,f,g,i){d=d|0;e=e|0;f=f|0;g=g|0;i=i|0;var j=0,k=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;x=l;l=l+64|0;c[x+16>>2]=e;w=x+24+40|0;k=0;j=0;p=0;a:while(1){do if((j|0)>-1)if((k|0)>(2147483647-j|0)){c[(Ga()|0)>>2]=75;j=-1;break}else{j=k+j|0;break}while(0);k=a[e>>0]|0;if(!(k<<24>>24)){v=87;break}else m=e;b:while(1){switch(k<<24>>24){case 37:{k=m;v=9;break b}case 0:{k=m;break b}default:{}}u=m+1|0;c[x+16>>2]=u;k=a[u>>0]|0;m=u}c:do if((v|0)==9)while(1){v=0;if((a[m+1>>0]|0)!=37)break c;k=k+1|0;m=m+2|0;c[x+16>>2]=m;if((a[m>>0]|0)==37)v=9;else break}while(0);k=k-e|0;if(d|0)Ya(d,e,k);if(k|0){e=m;continue}n=m+1|0;k=(a[n>>0]|0)+-48|0;if(k>>>0<10){u=(a[m+2>>0]|0)==36;s=u?k:-1;p=u?1:p;n=u?m+3|0:n}else s=-1;c[x+16>>2]=n;k=a[n>>0]|0;d:do if(((k<<24>>24)+-32|0)>>>0<32){m=0;q=k;o=(k<<24>>24)+-32|0;while(1){k=1<<o;if(!(k&75913)){k=q;break d}m=k|m;n=n+1|0;c[x+16>>2]=n;k=a[n>>0]|0;o=(k<<24>>24)+-32|0;if(o>>>0>=32)break;else q=k}}else m=0;while(0);if(k<<24>>24==42){o=n+1|0;k=(a[o>>0]|0)+-48|0;if(k>>>0<10)if((a[n+2>>0]|0)==36){c[i+(k<<2)>>2]=10;k=c[g+((a[o>>0]|0)+-48<<3)>>2]|0;p=1;n=n+3|0}else v=23;else v=23;if((v|0)==23){v=0;if(p|0){j=-1;break}if(d|0){p=(c[f>>2]|0)+(4-1)&~(4-1);k=c[p>>2]|0;c[f>>2]=p+4;p=0;n=o}else{k=0;p=0;n=o}}c[x+16>>2]=n;t=(k|0)<0;k=t?0-k|0:k;t=t?m|8192:m}else{k=Za(x+16|0)|0;if((k|0)<0){j=-1;break}t=m;n=c[x+16>>2]|0}do if((a[n>>0]|0)==46){if((a[n+1>>0]|0)!=42){c[x+16>>2]=n+1;m=Za(x+16|0)|0;n=c[x+16>>2]|0;break}o=n+2|0;m=(a[o>>0]|0)+-48|0;if(m>>>0<10)if((a[n+3>>0]|0)==36){c[i+(m<<2)>>2]=10;m=c[g+((a[o>>0]|0)+-48<<3)>>2]|0;n=n+4|0;c[x+16>>2]=n;break}if(p|0){j=-1;break a}if(d|0){u=(c[f>>2]|0)+(4-1)&~(4-1);m=c[u>>2]|0;c[f>>2]=u+4}else m=0;c[x+16>>2]=o;n=o}else m=-1;while(0);r=0;while(1){if(((a[n>>0]|0)+-65|0)>>>0>57){j=-1;break a}u=n+1|0;c[x+16>>2]=u;o=a[(a[n>>0]|0)+-65+(2221+(r*58|0))>>0]|0;if(((o&255)+-1|0)>>>0<8){r=o&255;n=u}else break}if(!(o<<24>>24)){j=-1;break}q=(s|0)>-1;do if(o<<24>>24==19)if(q){j=-1;break a}else v=49;else{if(q){c[i+(s<<2)>>2]=o&255;s=g+(s<<3)|0;v=c[s+4>>2]|0;c[x>>2]=c[s>>2];c[x+4>>2]=v;v=49;break}if(!d){j=0;break a}_a(x,o&255,f)}while(0);if((v|0)==49){v=0;if(!d){k=0;e=u;continue}}n=a[n>>0]|0;n=(r|0)!=0&(n&15|0)==3?n&-33:n;s=t&-65537;t=(t&8192|0)==0?t:s;e:do switch(n|0){case 110:switch((r&255)<<24>>24){case 0:{c[c[x>>2]>>2]=j;k=0;e=u;continue a}case 1:{c[c[x>>2]>>2]=j;k=0;e=u;continue a}case 2:{k=c[x>>2]|0;c[k>>2]=j;c[k+4>>2]=((j|0)<0)<<31>>31;k=0;e=u;continue a}case 3:{b[c[x>>2]>>1]=j;k=0;e=u;continue a}case 4:{a[c[x>>2]>>0]=j;k=0;e=u;continue a}case 6:{c[c[x>>2]>>2]=j;k=0;e=u;continue a}case 7:{k=c[x>>2]|0;c[k>>2]=j;c[k+4>>2]=((j|0)<0)<<31>>31;k=0;e=u;continue a}default:{k=0;e=u;continue a}}case 112:{n=120;m=m>>>0>8?m:8;e=t|8;v=61;break}case 88:case 120:{e=t;v=61;break}case 111:{e=c[x>>2]|0;n=c[x+4>>2]|0;s=ab(e,n,w)|0;r=s;o=0;q=2685;m=(t&8|0)==0|(m|0)>(w-s|0)?m:w-s+1|0;s=t;v=67;break}case 105:case 100:{e=c[x>>2]|0;n=c[x+4>>2]|0;if((n|0)<0){e=qb(0,0,e|0,n|0)|0;n=z;c[x>>2]=e;c[x+4>>2]=n;o=1;q=2685;v=66;break e}else{o=(t&2049|0)!=0&1;q=(t&2048|0)==0?((t&1|0)==0?2685:2687):2686;v=66;break e}}case 117:{o=0;q=2685;e=c[x>>2]|0;n=c[x+4>>2]|0;v=66;break}case 99:{a[x+24+39>>0]=c[x>>2];e=x+24+39|0;o=0;q=2685;r=w;n=1;m=s;break}case 109:{n=cb(c[(Ga()|0)>>2]|0)|0;v=71;break}case 115:{n=c[x>>2]|0;n=n|0?n:2695;v=71;break}case 67:{c[x+8>>2]=c[x>>2];c[x+8+4>>2]=0;c[x>>2]=x+8;r=-1;n=x+8|0;v=75;break}case 83:{e=c[x>>2]|0;if(!m){db(d,32,k,0,t);e=0;v=84}else{r=m;n=e;v=75}break}case 65:case 71:case 70:case 69:case 97:case 103:case 102:case 101:{k=fb(d,+h[x>>3],k,m,t,n)|0;e=u;continue a}default:{o=0;q=2685;r=w;n=m;m=t}}while(0);f:do if((v|0)==61){y=c[x>>2]|0;t=c[x+4>>2]|0;r=$a(y,t,w,n&32)|0;q=(e&8|0)==0|(y|0)==0&(t|0)==0;o=q?0:2;q=q?2685:2685+(n>>4)|0;s=e;e=y;n=t;v=67}else if((v|0)==66){r=bb(e,n,w)|0;s=t;v=67}else if((v|0)==71){v=0;y=Ua(n,0,m)|0;e=n;o=0;q=2685;r=(y|0)==0?n+m|0:y;n=(y|0)==0?m:y-n|0;m=s}else if((v|0)==75){v=0;q=n;e=0;m=0;while(1){o=c[q>>2]|0;if(!o)break;m=eb(x+20|0,o)|0;if((m|0)<0|m>>>0>(r-e|0)>>>0)break;e=m+e|0;if(r>>>0>e>>>0)q=q+4|0;else break}if((m|0)<0){j=-1;break a}db(d,32,k,e,t);if(!e){e=0;v=84}else{o=0;while(1){m=c[n>>2]|0;if(!m){v=84;break f}m=eb(x+20|0,m)|0;o=m+o|0;if((o|0)>(e|0)){v=84;break f}Ya(d,x+20|0,m);if(o>>>0>=e>>>0){v=84;break}else n=n+4|0}}}while(0);if((v|0)==67){v=0;n=(e|0)!=0|(n|0)!=0;y=(m|0)!=0|n;n=((n^1)&1)+(w-r)|0;e=y?r:w;r=w;n=y?((m|0)>(n|0)?m:n):m;m=(m|0)>-1?s&-65537:s}else if((v|0)==84){v=0;db(d,32,k,e,t^8192);k=(k|0)>(e|0)?k:e;e=u;continue}t=r-e|0;s=(n|0)<(t|0)?t:n;y=s+o|0;k=(k|0)<(y|0)?y:k;db(d,32,k,y,m);Ya(d,q,o);db(d,48,k,y,m^65536);db(d,48,s,t,0);Ya(d,e,t);db(d,32,k,y,m^8192);e=u}g:do if((v|0)==87)if(!d)if(!p)j=0;else{j=1;while(1){e=c[i+(j<<2)>>2]|0;if(!e)break;_a(g+(j<<3)|0,e,f);j=j+1|0;if((j|0)>=10){j=1;break g}}while(1){if(c[i+(j<<2)>>2]|0){j=-1;break g}j=j+1|0;if((j|0)>=10){j=1;break}}}while(0);l=x;return j|0}function Ya(a,b,d){a=a|0;b=b|0;d=d|0;if(!(c[a>>2]&32))Qa(b,d,a)|0;return}function Za(b){b=b|0;var d=0,e=0,f=0;e=c[b>>2]|0;f=(a[e>>0]|0)+-48|0;if(f>>>0<10){d=0;do{d=f+(d*10|0)|0;e=e+1|0;c[b>>2]=e;f=(a[e>>0]|0)+-48|0}while(f>>>0<10)}else d=0;return d|0}function _a(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0.0;a:do if(b>>>0<=20)do switch(b|0){case 9:{e=(c[d>>2]|0)+(4-1)&~(4-1);b=c[e>>2]|0;c[d>>2]=e+4;c[a>>2]=b;break a}case 10:{b=(c[d>>2]|0)+(4-1)&~(4-1);e=c[b>>2]|0;c[d>>2]=b+4;c[a>>2]=e;c[a+4>>2]=((e|0)<0)<<31>>31;break a}case 11:{b=(c[d>>2]|0)+(4-1)&~(4-1);e=c[b>>2]|0;c[d>>2]=b+4;c[a>>2]=e;c[a+4>>2]=0;break a}case 12:{f=(c[d>>2]|0)+(8-1)&~(8-1);b=c[f>>2]|0;e=c[f+4>>2]|0;c[d>>2]=f+8;c[a>>2]=b;c[a+4>>2]=e;break a}case 13:{e=(c[d>>2]|0)+(4-1)&~(4-1);f=c[e>>2]|0;c[d>>2]=e+4;c[a>>2]=(f&65535)<<16>>16;c[a+4>>2]=(((f&65535)<<16>>16|0)<0)<<31>>31;break a}case 14:{e=(c[d>>2]|0)+(4-1)&~(4-1);f=c[e>>2]|0;c[d>>2]=e+4;c[a>>2]=f&65535;c[a+4>>2]=0;break a}case 15:{e=(c[d>>2]|0)+(4-1)&~(4-1);f=c[e>>2]|0;c[d>>2]=e+4;c[a>>2]=(f&255)<<24>>24;c[a+4>>2]=(((f&255)<<24>>24|0)<0)<<31>>31;break a}case 16:{e=(c[d>>2]|0)+(4-1)&~(4-1);f=c[e>>2]|0;c[d>>2]=e+4;c[a>>2]=f&255;c[a+4>>2]=0;break a}case 17:{f=(c[d>>2]|0)+(8-1)&~(8-1);g=+h[f>>3];c[d>>2]=f+8;h[a>>3]=g;break a}case 18:{f=(c[d>>2]|0)+(8-1)&~(8-1);g=+h[f>>3];c[d>>2]=f+8;h[a>>3]=g;break a}default:break a}while(0);while(0);return}function $a(b,c,e,f){b=b|0;c=c|0;e=e|0;f=f|0;if(!((b|0)==0&(c|0)==0))do{e=e+-1|0;a[e>>0]=d[2737+(b&15)>>0]|0|f;b=tb(b|0,c|0,4)|0;c=z}while(!((b|0)==0&(c|0)==0));return e|0}function ab(b,c,d){b=b|0;c=c|0;d=d|0;if(!((b|0)==0&(c|0)==0))do{d=d+-1|0;a[d>>0]=b&7|48;b=tb(b|0,c|0,3)|0;c=z}while(!((b|0)==0&(c|0)==0));return d|0}function bb(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if(c>>>0>0|(c|0)==0&b>>>0>4294967295){while(1){e=Ab(b|0,c|0,10,0)|0;d=d+-1|0;a[d>>0]=e&255|48;e=b;b=yb(b|0,c|0,10,0)|0;if(!(c>>>0>9|(c|0)==9&e>>>0>4294967295))break;else c=z}c=b}else c=b;if(c)while(1){d=d+-1|0;a[d>>0]=(c>>>0)%10|0|48;if(c>>>0<10)break;else c=(c>>>0)/10|0}return d|0}function cb(a){a=a|0;return mb(a,c[(lb()|0)+188>>2]|0)|0}function db(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0;f=l;l=l+256|0;if((c|0)>(d|0)&(e&73728|0)==0){sb(f|0,b|0,((c-d|0)>>>0<256?c-d|0:256)|0)|0;if((c-d|0)>>>0>255){b=c-d|0;do{Ya(a,f,256);b=b+-256|0}while(b>>>0>255);b=c-d&255}else b=c-d|0;Ya(a,f,b)}l=f;return}function eb(a,b){a=a|0;b=b|0;if(!a)a=0;else a=jb(a,b,0)|0;return a|0}function fb(b,e,f,g,h,i){b=b|0;e=+e;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,m=0,n=0,o=0,p=0.0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,A=0,B=0,C=0;C=l;l=l+560|0;B=C+524|0;c[C>>2]=0;A=C+512+12|0;gb(e)|0;if((z|0)<0){e=-e;x=1;w=2702}else{x=(h&2049|0)!=0&1;w=(h&2048|0)==0?((h&1|0)==0?2703:2708):2705}gb(e)|0;y=z&2146435072;do if(y>>>0<2146435072|(y|0)==2146435072&0<0){p=+hb(e,C)*2.0;if(p!=0.0)c[C>>2]=(c[C>>2]|0)+-1;if((i|32|0)==97){o=(i&32|0)==0?w:w+9|0;n=x|2;do if(g>>>0>11|(12-g|0)==0)e=p;else{e=8.0;j=12-g|0;do{j=j+-1|0;e=e*16.0}while((j|0)!=0);if((a[o>>0]|0)==45){e=-(e+(-p-e));break}else{e=p+e-e;break}}while(0);k=c[C>>2]|0;j=(k|0)<0?0-k|0:k;j=bb(j,((j|0)<0)<<31>>31,A)|0;if((j|0)==(A|0)){a[C+512+11>>0]=48;j=C+512+11|0}a[j+-1>>0]=(k>>31&2)+43;m=j+-2|0;a[m>>0]=i+15;j=C+524|0;do{y=~~e;k=j+1|0;a[j>>0]=d[2737+y>>0]|i&32;e=(e-+(y|0))*16.0;if((k-B|0)==1)if((h&8|0)==0&((g|0)<1&e==0.0))j=k;else{a[k>>0]=46;j=j+2|0}else j=k}while(e!=0.0);B=j-B|0;j=(g|0)!=0&(B+-2|0)<(g|0)?g+2|0:B;db(b,32,f,A-m+n+j|0,h);Ya(b,o,n);db(b,48,f,A-m+n+j|0,h^65536);Ya(b,C+524|0,B);db(b,48,j-B|0,0,0);Ya(b,m,A-m|0);db(b,32,f,A-m+n+j|0,h^8192);j=A-m+n+j|0;break}k=(g|0)<0?6:g;if(p!=0.0){n=(c[C>>2]|0)+-28|0;c[C>>2]=n;e=p*268435456.0}else{e=p;n=c[C>>2]|0}y=(n|0)<0?C+8|0:C+8+288|0;j=y;do{v=~~e>>>0;c[j>>2]=v;j=j+4|0;e=(e-+(v>>>0))*1.0e9}while(e!=0.0);if((n|0)>0){m=y;do{g=(n|0)<29?n:29;n=j+-4|0;if(n>>>0>=m>>>0){o=0;do{u=ub(c[n>>2]|0,0,g|0)|0;u=rb(u|0,z|0,o|0,0)|0;v=z;t=Ab(u|0,v|0,1e9,0)|0;c[n>>2]=t;o=yb(u|0,v|0,1e9,0)|0;n=n+-4|0}while(n>>>0>=m>>>0);if(o){m=m+-4|0;c[m>>2]=o}}while(1){if(j>>>0<=m>>>0)break;n=j+-4|0;if(!(c[n>>2]|0))j=n;else break}n=(c[C>>2]|0)-g|0;c[C>>2]=n}while((n|0)>0)}else m=y;if((n|0)<0)do{g=0-n|0;g=(g|0)<9?g:9;if(m>>>0<j>>>0){o=0;n=m;do{v=c[n>>2]|0;c[n>>2]=(v>>>g)+o;o=O(v&(1<<g)+-1,1e9>>>g)|0;n=n+4|0}while(n>>>0<j>>>0);m=(c[m>>2]|0)==0?m+4|0:m;if(o){c[j>>2]=o;j=j+4|0}}else m=(c[m>>2]|0)==0?m+4|0:m;n=(i|32|0)==102?y:m;j=(j-n>>2|0)>(((k+25|0)/9|0)+1|0)?n+(((k+25|0)/9|0)+1<<2)|0:j;n=(c[C>>2]|0)+g|0;c[C>>2]=n}while((n|0)<0);if(m>>>0<j>>>0){n=(y-m>>2)*9|0;g=c[m>>2]|0;if(g>>>0<10)s=n;else{o=10;do{o=o*10|0;n=n+1|0}while(g>>>0>=o>>>0);s=n}}else s=0;o=k-((i|32|0)!=102?s:0)+(((k|0)!=0&(i|32|0)==103)<<31>>31)|0;if((o|0)<(((j-y>>2)*9|0)+-9|0)){n=y+4+(((o+9216|0)/9|0)+-1024<<2)|0;if((((o+9216|0)%9|0)+1|0)<9){g=((o+9216|0)%9|0)+1|0;o=10;do{o=o*10|0;g=g+1|0}while((g|0)!=9)}else o=10;q=c[n>>2]|0;r=(q>>>0)%(o>>>0)|0;g=(n+4|0)==(j|0);if(g&(r|0)==0)o=s;else{p=(((q>>>0)/(o>>>0)|0)&1|0)==0?9007199254740992.0:9007199254740994.0;v=(o|0)/2|0;e=r>>>0<v>>>0?.5:g&(r|0)==(v|0)?1.0:1.5;if(x){v=(a[w>>0]|0)==45;e=v?-e:e;p=v?-p:p}c[n>>2]=q-r;if(p+e!=p){v=q-r+o|0;c[n>>2]=v;if(v>>>0>999999999)while(1){o=n+-4|0;c[n>>2]=0;if(o>>>0<m>>>0){m=m+-4|0;c[m>>2]=0}v=(c[o>>2]|0)+1|0;c[o>>2]=v;if(v>>>0>999999999)n=o;else{n=o;break}}o=(y-m>>2)*9|0;q=c[m>>2]|0;if(q>>>0>=10){g=10;do{g=g*10|0;o=o+1|0}while(q>>>0>=g>>>0)}}else o=s}u=n+4|0;j=j>>>0>u>>>0?u:j;u=m}else{o=s;u=m}v=j;while(1){if(v>>>0<=u>>>0){t=0;break}j=v+-4|0;if(!(c[j>>2]|0))v=j;else{t=1;break}}q=0-o|0;do if((i|32|0)==103){if((o|0)>-5?((((k|0)!=0^1)&1)+k|0)>(o|0):0){g=i+-1|0;k=(((k|0)!=0^1)&1)+k+-1-o|0}else{g=i+-2|0;k=(((k|0)!=0^1)&1)+k+-1|0}if(!(h&8)){if(t){n=c[v+-4>>2]|0;if(!n)j=9;else if(!((n>>>0)%10|0)){j=0;m=10;do{m=m*10|0;j=j+1|0}while(!((n>>>0)%(m>>>0)|0|0))}else j=0}else j=9;m=((v-y>>2)*9|0)+-9|0;if((g|32|0)==102){n=m-j|0;n=(n|0)>0?n:0;k=(k|0)<(n|0)?k:n;n=0;break}else{n=m+o-j|0;n=(n|0)>0?n:0;k=(k|0)<(n|0)?k:n;n=0;break}}else n=h&8}else{g=i;n=h&8}while(0);s=k|n;m=(g|32|0)==102;if(m){r=0;j=(o|0)>0?o:0}else{j=(o|0)<0?q:o;j=bb(j,((j|0)<0)<<31>>31,A)|0;if((A-j|0)<2)do{j=j+-1|0;a[j>>0]=48}while((A-j|0)<2);a[j+-1>>0]=(o>>31&2)+43;j=j+-2|0;a[j>>0]=g;r=j;j=A-j|0}j=x+1+k+((s|0)!=0&1)+j|0;db(b,32,f,j,h);Ya(b,w,x);db(b,48,f,j,h^65536);if(m){o=u>>>0>y>>>0?y:u;n=o;do{m=bb(c[n>>2]|0,0,C+524+9|0)|0;if((n|0)==(o|0)){if((m|0)==(C+524+9|0)){a[C+524+8>>0]=48;m=C+524+8|0}}else if(m>>>0>(C+524|0)>>>0){sb(C+524|0,48,m-B|0)|0;do m=m+-1|0;while(m>>>0>(C+524|0)>>>0)}Ya(b,m,C+524+9-m|0);n=n+4|0}while(n>>>0<=y>>>0);if(s|0)Ya(b,2753,1);if(n>>>0<v>>>0&(k|0)>0)while(1){m=bb(c[n>>2]|0,0,C+524+9|0)|0;if(m>>>0>(C+524|0)>>>0){sb(C+524|0,48,m-B|0)|0;do m=m+-1|0;while(m>>>0>(C+524|0)>>>0)}Ya(b,m,(k|0)<9?k:9);n=n+4|0;m=k+-9|0;if(!(n>>>0<v>>>0&(k|0)>9)){k=m;break}else k=m}db(b,48,k+9|0,9,0)}else{q=t?v:u+4|0;if((k|0)>-1){g=(n|0)==0;o=u;do{m=bb(c[o>>2]|0,0,C+524+9|0)|0;if((m|0)==(C+524+9|0)){a[C+524+8>>0]=48;m=C+524+8|0}do if((o|0)==(u|0)){n=m+1|0;Ya(b,m,1);if(g&(k|0)<1){m=n;break}Ya(b,2753,1);m=n}else{if(m>>>0<=(C+524|0)>>>0)break;sb(C+524|0,48,m+(0-B)|0)|0;do m=m+-1|0;while(m>>>0>(C+524|0)>>>0)}while(0);y=C+524+9-m|0;Ya(b,m,(k|0)>(y|0)?y:k);k=k-y|0;o=o+4|0}while(o>>>0<q>>>0&(k|0)>-1)}db(b,48,k+18|0,18,0);Ya(b,r,A-r|0)}db(b,32,f,j,h^8192)}else{j=x+3|0;db(b,32,f,j,h&-65537);Ya(b,w,x);Ya(b,e!=e|0.0!=0.0?(i&32|0?2729:2733):i&32|0?2721:2725,3);db(b,32,f,j,h^8192)}while(0);l=C;return ((j|0)<(f|0)?f:j)|0}function gb(a){a=+a;var b=0;h[j>>3]=a;b=c[j>>2]|0;z=c[j+4>>2]|0;return b|0}function hb(a,b){a=+a;b=b|0;return +(+ib(a,b))}function ib(a,b){a=+a;b=b|0;var d=0,e=0,f=0;h[j>>3]=a;d=c[j>>2]|0;e=c[j+4>>2]|0;f=tb(d|0,e|0,52)|0;switch(f&2047){case 0:{if(a!=0.0){a=+ib(a*18446744073709551616.0,b);d=(c[b>>2]|0)+-64|0}else d=0;c[b>>2]=d;break}case 2047:break;default:{c[b>>2]=(f&2047)+-1022;c[j>>2]=d;c[j+4>>2]=e&-2146435073|1071644672;a=+h[j>>3]}}return +a}function jb(b,d,e){b=b|0;d=d|0;e=e|0;do if(!b)b=1;else{if(d>>>0<128){a[b>>0]=d;b=1;break}if(!(c[c[(kb()|0)+188>>2]>>2]|0))if((d&-128|0)==57216){a[b>>0]=d;b=1;break}else{c[(Ga()|0)>>2]=84;b=-1;break}if(d>>>0<2048){a[b>>0]=d>>>6|192;a[b+1>>0]=d&63|128;b=2;break}if(d>>>0<55296|(d&-8192|0)==57344){a[b>>0]=d>>>12|224;a[b+1>>0]=d>>>6&63|128;a[b+2>>0]=d&63|128;b=3;break}if((d+-65536|0)>>>0<1048576){a[b>>0]=d>>>18|240;a[b+1>>0]=d>>>12&63|128;a[b+2>>0]=d>>>6&63|128;a[b+3>>0]=d&63|128;b=4;break}else{c[(Ga()|0)>>2]=84;b=-1;break}}while(0);return b|0}function kb(){return Ia()|0}function lb(){return Ia()|0}function mb(b,e){b=b|0;e=e|0;var f=0,g=0;g=0;while(1){if((d[2755+g>>0]|0)==(b|0)){b=2;break}f=g+1|0;if((f|0)==87){f=2843;g=87;b=5;break}else g=f}if((b|0)==2)if(!g)f=2843;else{f=2843;b=5}if((b|0)==5)while(1){do{b=f;f=f+1|0}while((a[b>>0]|0)!=0);g=g+-1|0;if(!g)break;else b=5}return nb(f,c[e+20>>2]|0)|0}function nb(a,b){a=a|0;b=b|0;return Ra(a,b)|0}function ob(b,d){b=b|0;d=d|0;var e=0,f=0;if((c[d+76>>2]|0)<0)f=3;else if(!(Na(d)|0))f=3;else{if((b&255|0)==(a[d+75>>0]|0))f=10;else{e=c[d+20>>2]|0;if(e>>>0<(c[d+16>>2]|0)>>>0){c[d+20>>2]=e+1;a[e>>0]=b;e=b&255}else f=10}if((f|0)==10)e=Oa(d,b)|0;Ma(d)}do if((f|0)==3){if((b&255|0)!=(a[d+75>>0]|0)){e=c[d+20>>2]|0;if(e>>>0<(c[d+16>>2]|0)>>>0){c[d+20>>2]=e+1;a[e>>0]=b;e=b&255;break}}e=Oa(d,b)|0}while(0);return e|0}function pb(){}function qb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=b-d-(c>>>0>a>>>0|0)>>>0;return (z=d,a-c>>>0|0)|0}function rb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return (z=b+d+(a+c>>>0>>>0<a>>>0|0)>>>0,a+c>>>0|0)|0}function sb(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0;f=b+e|0;d=d&255;if((e|0)>=67){while(b&3){a[b>>0]=d;b=b+1|0}g=d|d<<8|d<<16|d<<24;while((b|0)<=((f&-4)-64|0)){c[b>>2]=g;c[b+4>>2]=g;c[b+8>>2]=g;c[b+12>>2]=g;c[b+16>>2]=g;c[b+20>>2]=g;c[b+24>>2]=g;c[b+28>>2]=g;c[b+32>>2]=g;c[b+36>>2]=g;c[b+40>>2]=g;c[b+44>>2]=g;c[b+48>>2]=g;c[b+52>>2]=g;c[b+56>>2]=g;c[b+60>>2]=g;b=b+64|0}while((b|0)<(f&-4|0)){c[b>>2]=g;b=b+4|0}}while((b|0)<(f|0)){a[b>>0]=d;b=b+1|0}return f-e|0}function tb(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){z=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}z=0;return b>>>c-32|0}function ub(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){z=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}z=a<<c-32;return 0}function vb(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((e|0)>=8192)return ba(b|0,d|0,e|0)|0;h=b|0;g=b+e|0;if((b&3)==(d&3)){while(b&3){if(!e)return h|0;a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}e=g&-4|0;f=e-64|0;while((b|0)<=(f|0)){c[b>>2]=c[d>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2];c[b+12>>2]=c[d+12>>2];c[b+16>>2]=c[d+16>>2];c[b+20>>2]=c[d+20>>2];c[b+24>>2]=c[d+24>>2];c[b+28>>2]=c[d+28>>2];c[b+32>>2]=c[d+32>>2];c[b+36>>2]=c[d+36>>2];c[b+40>>2]=c[d+40>>2];c[b+44>>2]=c[d+44>>2];c[b+48>>2]=c[d+48>>2];c[b+52>>2]=c[d+52>>2];c[b+56>>2]=c[d+56>>2];c[b+60>>2]=c[d+60>>2];b=b+64|0;d=d+64|0}while((b|0)<(e|0)){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0}}else{e=g-4|0;while((b|0)<(e|0)){a[b>>0]=a[d>>0]|0;a[b+1>>0]=a[d+1>>0]|0;a[b+2>>0]=a[d+2>>0]|0;a[b+3>>0]=a[d+3>>0]|0;b=b+4|0;d=d+4|0}}while((b|0)<(g|0)){a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0}return h|0}function wb(b){b=b|0;var c=0;c=a[n+(b&255)>>0]|0;if((c|0)<8)return c|0;c=a[n+(b>>8&255)>>0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>16&255)>>0]|0;if((c|0)<8)return c+16|0;return (a[n+(b>>>24)>>0]|0)+24|0}function xb(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;if(!b)if(!e){if(f|0){c[f>>2]=(a>>>0)%(d>>>0);c[f+4>>2]=0}e=0;f=(a>>>0)/(d>>>0)>>>0;return (z=e,f)|0}else{if(!f){e=0;f=0;return (z=e,f)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;e=0;f=0;return (z=e,f)|0}do if(!d){if(!e){if(f|0){c[f>>2]=(b>>>0)%(d>>>0);c[f+4>>2]=0}e=0;f=(b>>>0)/(d>>>0)>>>0;return (z=e,f)|0}if(!a){if(f|0){c[f>>2]=0;c[f+4>>2]=(b>>>0)%(e>>>0)}d=0;f=(b>>>0)/(e>>>0)>>>0;return (z=d,f)|0}if(!(e-1&e)){if(f|0){c[f>>2]=a|0;c[f+4>>2]=e-1&b|b&0}d=0;f=b>>>((wb(e|0)|0)>>>0);return (z=d,f)|0}h=(R(e|0)|0)-(R(b|0)|0)|0;if(h>>>0<=30){n=h+1|0;i=b<<31-h|a>>>((h+1|0)>>>0);m=b>>>((h+1|0)>>>0);g=0;h=a<<31-h;break}if(!f){e=0;f=0;return (z=e,f)|0}c[f>>2]=a|0;c[f+4>>2]=b|b&0;e=0;f=0;return (z=e,f)|0}else{if(e|0){h=(R(e|0)|0)-(R(b|0)|0)|0;if(h>>>0<=31){n=h+1|0;i=a>>>((h+1|0)>>>0)&h-31>>31|b<<31-h;m=b>>>((h+1|0)>>>0)&h-31>>31;g=0;h=a<<31-h;break}if(!f){e=0;f=0;return (z=e,f)|0}c[f>>2]=a|0;c[f+4>>2]=b|b&0;e=0;f=0;return (z=e,f)|0}if(d-1&d|0){h=(R(d|0)|0)+33-(R(b|0)|0)|0;n=h;i=32-h-1>>31&b>>>((h-32|0)>>>0)|(b<<32-h|a>>>(h>>>0))&h-32>>31;m=h-32>>31&b>>>(h>>>0);g=a<<64-h&32-h>>31;h=(b<<64-h|a>>>((h-32|0)>>>0))&32-h>>31|a<<32-h&h-33>>31;break}if(f|0){c[f>>2]=d-1&a;c[f+4>>2]=0}if((d|0)==1){e=b|b&0;f=a|0|0;return (z=e,f)|0}else{f=wb(d|0)|0;e=b>>>(f>>>0)|0;f=b<<32-f|a>>>(f>>>0)|0;return (z=e,f)|0}}while(0);if(!n){j=h;b=m;a=0;h=0}else{k=rb(d|0|0,e|e&0|0,-1,-1)|0;l=z;j=h;b=m;a=n;h=0;do{p=j;j=g>>>31|j<<1;g=h|g<<1;p=i<<1|p>>>31|0;o=i>>>31|b<<1|0;qb(k|0,l|0,p|0,o|0)|0;n=z;m=n>>31|((n|0)<0?-1:0)<<1;h=m&1;i=qb(p|0,o|0,m&(d|0)|0,(((n|0)<0?-1:0)>>31|((n|0)<0?-1:0)<<1)&(e|e&0)|0)|0;b=z;a=a-1|0}while((a|0)!=0);a=0}if(f|0){c[f>>2]=i;c[f+4>>2]=b}o=(g|0)>>>31|j<<1|(0<<1|g>>>31)&0|a;p=(g<<1|0>>>31)&-2|h;return (z=o,p)|0}function yb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return xb(a,b,c,d,0)|0}function zb(a){a=a|0;var b=0,d=0;d=a+15&-16|0;b=c[i>>2]|0;a=b+d|0;if((d|0)>0&(a|0)<(b|0)|(a|0)<0){W()|0;$(12);return -1}c[i>>2]=a;if((a|0)>(V()|0))if(!(U()|0)){c[i>>2]=b;$(12);return -1}return b|0}function Ab(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=l;l=l+16|0;xb(a,b,d,e,f|0)|0;l=f;return (z=c[f+4>>2]|0,c[f>>2]|0)|0}function Bb(a){a=a|0;return (a&255)<<24|(a>>8&255)<<16|(a>>16&255)<<8|a>>>24|0}function Cb(a,b){a=a|0;b=b|0;return ha[a&1](b|0)|0}function Db(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return ia[a&3](b|0,c|0,d|0)|0}function Eb(a){a=a|0;S(0);return 0}function Fb(a,b,c){a=a|0;b=b|0;c=c|0;S(1);return 0}function Gb(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0;f=c[b+1368>>2]|0;g=c[b+3472>>2]|0;p=c[b+3496>>2]|0;o=c[b+3504>>2]|0;a:{if((p&65024|0)==23552){if(a[5300]|0){o=c[2]|0;c[b+512>>2]=p&7;c[b+512+4>>2]=p>>>3&7;c[b+512+8>>2]=p>>>6&7;Va(o,1367,b+512|0)|0}o=(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0;f=Z(3,o&-2|0)|0;c[4668+((p&7)<<2)>>2]=((o&1|0)==0?f:f>>>8)&255;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&63488|0)==34816){if(a[5300]|0){o=c[2]|0;c[b+528>>2]=p&7;c[b+528+4>>2]=p>>>3&7;c[b+528+8>>2]=p>>>5&62;Va(o,1387,b+528|0)|0}c[4668+((p&7)<<2)>>2]=(Z(3,(c[4668+((p>>>3&7)<<2)>>2]|0)+(p>>>5&62)|0)|0)&65535;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}d=1;e=(p&65024)<<16>>16;if(d)switch(e|0){case 23040:{if(a[5300]|0){o=c[2]|0;c[b+544>>2]=p&7;c[b+544+4>>2]=p>>>3&7;c[b+544+8>>2]=p>>>6&7;Va(o,1409,b+544|0)|0}c[4668+((p&7)<<2)>>2]=(Z(3,(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0)|0)&65535;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 22016:{if(a[5300]|0){o=c[2]|0;c[b+560>>2]=p&7;c[b+560+4>>2]=p>>>3&7;c[b+560+8>>2]=p>>>6&7;Va(o,1429,b+560|0)|0}o=(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0;f=Z(3,o&-2|0)|0;f=(o&1|0)==0?f:f>>>8;c[4668+((p&7)<<2)>>2]=(f&128|0)==0?f&255:f|-256;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 24064:{if(a[5300]|0){o=c[2]|0;c[b+576>>2]=p&7;c[b+576+4>>2]=p>>>3&7;c[b+576+8>>2]=p>>>6&7;Va(o,1450,b+576|0)|0}f=Z(3,(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0)|0;c[4668+((p&7)<<2)>>2]=(f&32768|0)==0?f&65535:f|-65536;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:d=1}if(d)switch(e|0){default:{if(!(p&63488)){if(a[5300]|0){o=c[2]|0;c[b+592>>2]=p&7;c[b+592+4>>2]=p>>>3&7;c[b+592+8>>2]=p>>>6&31;Va(o,1471,b+592|0)|0}d=c[4668+((p>>>3&7)<<2)>>2]|0;if(!(p>>>6&31))e=c[1184]|0;else{e=c[1184]|0;e=d&1<<32-(p>>>6&31)|0?e|536870912:e&-536870913;c[1184]=e;d=d<<(p>>>6&31)}c[4668+((p&7)<<2)>>2]=d;f=(d|0)<0?e|-2147483648:e&2147483647;c[1184]=(d|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65472|0)==16512){if(a[5300]|0){o=c[2]|0;c[b+608>>2]=p&7;c[b+608+4>>2]=p>>>3&7;Va(o,1491,b+608|0)|0}d=c[4668+((p&7)<<2)>>2]|0;e=c[4668+((p>>>3&7)<<2)>>2]&255;do if(!e)e=c[1184]|0;else{if(e>>>0<32){o=c[1184]|0;o=1<<32-e&d|0?o|536870912:o&-536870913;c[1184]=o;d=d<<e;e=o;break}if((e|0)==32){e=c[1184]|0;e=d&1|0?e|536870912:e&-536870913;c[1184]=e;d=0;break}else{e=c[1184]&-536870913;c[1184]=e;d=0;break}}while(0);c[4668+((p&7)<<2)>>2]=d;f=(d|0)<0?e|-2147483648:e&2147483647;c[1184]=(d|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&63488|0)==2048){if(a[5300]|0){o=c[2]|0;c[b+616>>2]=p&7;c[b+616+4>>2]=p>>>3&7;c[b+616+8>>2]=p>>>6&31;Va(o,1505,b+616|0)|0}d=c[4668+((p>>>3&7)<<2)>>2]|0;if(!(p>>>6&31)){e=c[1184]|0;e=(d|0)<0?e|536870912:e&-536870913;c[1184]=e;d=0}else{e=c[1184]|0;e=d&1<<(p>>>6&31)+-1|0?e|536870912:e&-536870913;c[1184]=e;d=d>>>(p>>>6&31)}c[4668+((p&7)<<2)>>2]=d;f=(d|0)<0?e|-2147483648:e&2147483647;c[1184]=(d|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65472|0)==16576){if(a[5300]|0){o=c[2]|0;c[b+632>>2]=p&7;c[b+632+4>>2]=p>>>3&7;Va(o,1525,b+632|0)|0}d=c[4668+((p&7)<<2)>>2]|0;e=c[4668+((p>>>3&7)<<2)>>2]&255;do if(!e)e=c[1184]|0;else{if(e>>>0<32){o=c[1184]|0;o=1<<e+-1&d|0?o|536870912:o&-536870913;c[1184]=o;d=d>>>e;e=o;break}if((e|0)==32){e=c[1184]|0;e=(d|0)<0?e|536870912:e&-536870913;c[1184]=e;d=0;break}else{e=c[1184]&-536870913;c[1184]=e;d=0;break}}while(0);c[4668+((p&7)<<2)>>2]=d;f=(d|0)<0?e|-2147483648:e&2147483647;c[1184]=(d|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&63488|0)==8192){if(a[5300]|0){o=c[2]|0;c[b+640>>2]=p>>>8&7;c[b+640+4>>2]=p&255;Va(o,1539,b+640|0)|0}c[4668+((p>>>8&7)<<2)>>2]=p&255;f=c[1184]&1073741823;c[1184]=(p&255|0)==0?f|1073741824:f;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65472|0)==7168){if(a[5300]|0){o=c[2]|0;c[b+648>>2]=p&7;c[b+648+4>>2]=p>>>3&7;Va(o,1557,b+648|0)|0}o=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=o;f=c[1184]|0;f=(o|0)<0?f|-2147483648:f&2147483647;c[1184]=((o|0)==0?f|1073741824:f&-1879048193)&-805306369;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65280|0)==17920){if(a[5300]|0){o=c[2]|0;c[b+656>>2]=p>>>4&8|p&7;c[b+656+4>>2]=p>>>3&15;Va(o,1571,b+656|0)|0}d=c[4668+((p>>>3&15)<<2)>>2]|0;if((p>>>3&15|0)==15){if(d&1|0){o=c[2]|0;c[b+664>>2]=d;Va(o,520,b+664|0)|0}d=d&-2}c[4668+((p>>>4&8|p&7)<<2)>>2]=(p>>>4&8|p&7|0)==15?((p>>>4&8|p&7|0)==15?d+2|0:d)&-2:d;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}d=1;e=((p&65472)+-16960|0)>>>6&67108863|0;if(d)switch(e|0){case 4:{if(a[5300]|0){o=c[2]|0;c[b+672>>2]=p&7;c[b+672+4>>2]=p>>>3&7;Va(o,1584,b+672|0)|0}o=O(c[4668+((p>>>3&7)<<2)>>2]|0,c[4668+((p&7)<<2)>>2]|0)|0;c[4668+((p&7)<<2)>>2]=o;f=c[1184]|0;f=(o|0)<0?f|-2147483648:f&2147483647;c[1184]=(o|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 6:{if(a[5300]|0){o=c[2]|0;c[b+680>>2]=p&7;c[b+680+4>>2]=p>>>3&7;Va(o,1598,b+680|0)|0}o=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=~o;f=c[1184]|0;f=(o|0)>-1?f|-2147483648:f&2147483647;c[1184]=(o|0)==-1?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 0:{if(a[5300]|0){o=c[2]|0;c[b+688>>2]=p&7;c[b+688+4>>2]=p>>>3&7;Va(o,1612,b+688|0)|0}o=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=0-o;f=c[1184]|0;f=(0-o|0)<0?f|-2147483648:f&2147483647;f=(o|0)==0?f|1073741824:f&-1073741825;f=(((((~o&2147483647)+1|0)>>>31)+(~o>>>31)|0)&2|0)==0?f&-536870913:f|536870912;c[1184]=(((~o&2147483647)+1|0)>>>31|0)==(((((~o&2147483647)+1|0)>>>31)+(~o>>>31)|0)>>>1|0)?f&-268435457:f|268435456;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 3:{if(a[5300]|0){o=c[2]|0;c[b+696>>2]=p&7;c[b+696+4>>2]=p>>>3&7;Va(o,1626,b+696|0)|0}o=c[4668+((p>>>3&7)<<2)>>2]|c[4668+((p&7)<<2)>>2];c[4668+((p&7)<<2)>>2]=o;f=c[1184]|0;f=(o|0)<0?f|-2147483648:f&2147483647;c[1184]=(o|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:d=1}if(d)switch(e|0){default:{d=1;e=(p&65024)<<16>>16;if(d)switch(e|0){case -17408:{if(!(a[5300]|0))e=p&1;else{e=c[2]|0;La(1640,5,1,e)|0;if(!(p&1))d=0;else{c[b+704>>2]=0;Va(e,1249,b+704|0)|0;d=1}if(p&2){if(d|0)ob(44,e)|0;c[b+1064>>2]=1;Va(e,1249,b+1064|0)|0;d=d+1|0}if(p&4){if(d|0)ob(44,e)|0;c[b+1072>>2]=2;Va(e,1249,b+1072|0)|0;d=d+1|0}if(p&8){if(d|0)ob(44,e)|0;c[b+1080>>2]=3;Va(e,1249,b+1080|0)|0;d=d+1|0}if(p&16){if(d|0)ob(44,e)|0;c[b+1088>>2]=4;Va(e,1249,b+1088|0)|0;d=d+1|0}if(p&32){if(d|0)ob(44,e)|0;c[b+1096>>2]=5;Va(e,1249,b+1096|0)|0;d=d+1|0}if(p&64){if(d|0)ob(44,e)|0;c[b+1104>>2]=6;Va(e,1249,b+1104|0)|0;d=d+1|0}if(p&128){if(d|0)ob(44,e)|0;c[b+1112>>2]=7;Va(e,1249,b+1112|0)|0;d=d+1|0}if(p&256|0){if(d|0)ob(44,e)|0;La(1646,2,1,e)|0}La(1253,2,1,e)|0;e=p&1}d=c[1180]|0;if(e){c[1167]=Z(1,d|0)|0;d=d+4|0}if(p&2){c[1168]=Z(1,d|0)|0;d=d+4|0}if(p&4){c[1169]=Z(1,d|0)|0;d=d+4|0}if(p&8){c[1170]=Z(1,d|0)|0;d=d+4|0}if(p&16){c[1171]=Z(1,d|0)|0;d=d+4|0}if(p&32){c[1172]=Z(1,d|0)|0;d=d+4|0}if(p&64){c[1173]=Z(1,d|0)|0;d=d+4|0}if(p&128){c[1174]=Z(1,d|0)|0;d=d+4|0}if(p&256){e=Z(1,d|0)|0;if(!(e&1)){p=c[2]|0;c[b+712>>2]=o;c[b+712+4>>2]=e;Va(p,1649,b+712|0)|0;e=e&-2}c[1182]=e+2&-2;d=d+4|0}c[1180]=d;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case -19456:{n=c[2]|0;if(!(a[5300]|0)){d=p&2;e=p&4;f=p&8;g=p&16;h=p&32;i=p&64;j=p&128;m=p&256;k=p&1}else{La(1703,6,1,n)|0;if(!(p&1))d=0;else{c[b+720>>2]=0;Va(n,1249,b+720|0)|0;d=1}if(p&2){if(d|0)ob(44,n)|0;c[b+1120>>2]=1;Va(n,1249,b+1120|0)|0;d=d+1|0}if(p&4){if(d|0)ob(44,n)|0;c[b+1128>>2]=2;Va(n,1249,b+1128|0)|0;d=d+1|0}if(p&8){if(d|0)ob(44,n)|0;c[b+1136>>2]=3;Va(n,1249,b+1136|0)|0;d=d+1|0}if(p&16){if(d|0)ob(44,n)|0;c[b+1144>>2]=4;Va(n,1249,b+1144|0)|0;d=d+1|0}if(p&32){if(d|0)ob(44,n)|0;c[b+1152>>2]=5;Va(n,1249,b+1152|0)|0;d=d+1|0}if(p&64){if(d|0)ob(44,n)|0;c[b+1160>>2]=6;Va(n,1249,b+1160|0)|0;d=d+1|0}if(p&128){if(d|0)ob(44,n)|0;c[b+1168>>2]=7;Va(n,1249,b+1168|0)|0;d=d+1|0}if(p&256|0){if(d|0)ob(44,n)|0;La(1710,2,1,n)|0}La(1253,2,1,n)|0;d=p&2;e=p&4;f=p&8;g=p&16;h=p&32;i=p&64;j=p&128;m=p&256;k=p&1}h=(c[1180]|0)-((j>>>7)+((i>>>6)+((h>>>5)+((g>>>4)+((f>>>3)+((e>>>2)+((d>>>1)+k))))))+(m>>>8)<<2)|0;d=h;f=0;g=1;while(1){if(!(g&p))e=d;else{e=c[4668+(f<<2)>>2]|0;b:do if((d&-268435456|0)==-536870912){k=d+536813552|0;switch(k>>>2|k<<30|0){case 0:{k=c[1164]|0;c[1164]=e&65543;if((e&1|0)==0|(k&1|0)!=0)break b;c[1166]=c[1165];break b}case 1:{c[1165]=e&16777215;break b}case 2:{c[1166]=e&16777215;break b}case 3:break b;default:break b}}else fa(2,d|0,e|0)|0;while(0);e=d+4|0}f=f+1|0;if((f|0)==8)break;else{d=e;g=g<<1&254}}do if(m|0){d=c[1181]|0;c:do if((e&-268435456|0)==-536870912){p=e+536813552|0;switch(p>>>2|p<<30|0){case 0:{p=c[1164]|0;c[1164]=d&65543;if((d&1|0)==0|(p&1|0)!=0)break c;c[1166]=c[1165];break c}case 1:{c[1165]=d&16777215;break c}case 2:{c[1166]=d&16777215;break c}case 3:break c;default:break c}}else fa(2,e|0,d|0)|0;while(0);if(d&1|0)break;c[b+728>>2]=o;c[b+728+4>>2]=d;Va(n,1713,b+728|0)|0}while(0);c[1180]=h;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:d=1}if(d)switch(e|0){default:{d:do if((p&65472)<<16>>16<-17728)switch((p&65472)<<16>>16){case -17920:{if(a[5300]|0){o=c[2]|0;c[b+736>>2]=p&7;c[b+736+4>>2]=p>>>3&7;Va(o,1768,b+736|0)|0}c[4668+((p&7)<<2)>>2]=Bb(c[4668+((p>>>3&7)<<2)>>2]|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case -17856:{if(a[5300]|0){o=c[2]|0;c[b+744>>2]=p&7;c[b+744+4>>2]=p>>>3&7;Va(o,1781,b+744|0)|0}f=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=f<<8&65280|f>>>8&255|f>>>16<<24|f>>>24<<16;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:break d}else{if((p&65472)<<16>>16<16768){switch((p&65472)<<16>>16){case -17728:break;default:break d}if(a[5300]|0){o=c[2]|0;c[b+752>>2]=p&7;c[b+752+4>>2]=p>>>3&7;Va(o,1796,b+752|0)|0}f=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=(f<<8&32768|0)==0?f<<8&65280|f>>>8&255:f<<8&65280|f>>>8&255|-65536;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}switch((p&65472)<<16>>16){case 16832:break;case 16768:{if(a[5300]|0){o=c[2]|0;c[b+768>>2]=p&7;c[b+768+4>>2]=p>>>3&7;Va(o,1825,b+768|0)|0}e=c[4668+((p&7)<<2)>>2]|0;f=c[4668+((p>>>3&7)<<2)>>2]|0;o=c[1184]|0;c[4668+((p&7)<<2)>>2]=e-f+-1+(o>>>29&1);d=(e-f+-1+(o>>>29&1)|0)<0?o|-2147483648:o&2147483647;d=(e-f+-1+(o>>>29&1)|0)==0?d|1073741824:d&-1073741825;c[1184]=d;if(!(d&536870912)){p=(((~f>>>31)+(e>>>31)+(((~f&2147483647)+(e&2147483647)|0)>>>31)|0)&2|0)==0?d&-536870913:d|536870912;c[1184]=(((~f&2147483647)+(e&2147483647)|0)>>>31|0)==(((~f>>>31)+(e>>>31)+(((~f&2147483647)+(e&2147483647)|0)>>>31)|0)>>>1&1|0)?p&-268435457:p|268435456;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}else{p=(((~f>>>31)+(e>>>31)+(((~f&2147483647)+(e&2147483647)+1|0)>>>31)|0)&2|0)==0?d&-536870913:d|536870912;c[1184]=(((~f&2147483647)+(e&2147483647)+1|0)>>>31|0)==(((~f>>>31)+(e>>>31)+(((~f&2147483647)+(e&2147483647)+1|0)>>>31)|0)>>>1&1|0)?p&-268435457:p|268435456;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}default:break d}if(a[5300]|0){o=c[2]|0;c[b+760>>2]=p&7;c[b+760+4>>2]=p>>>3&7;Va(o,1811,b+760|0)|0}d=c[4668+((p&7)<<2)>>2]|0;e=c[4668+((p>>>3&7)<<2)>>2]|0;do if(!(e&255))e=c[1184]|0;else if(!(e&31)){e=c[1184]|0;e=(d|0)<0?e|536870912:e&-536870913;c[1184]=e;break}else{o=c[1184]|0;o=1<<(e&31)+-1&d|0?o|536870912:o&-536870913;c[1184]=o;d=d<<32-(e&31)|d>>>(e&31);e=o;break}while(0);c[4668+((p&7)<<2)>>2]=d;f=(d|0)<0?e|-2147483648:e&2147483647;c[1184]=(d|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}while(0);if((p&65527|0)==46672){La(1838,23,1,c[2]|0)|0;f=1;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}e:do if((p&63488)<<16>>16<24576){switch((p&63488)<<16>>16){case -16384:break;default:break e}if(a[5300]|0){e=c[2]|0;c[b+776>>2]=p>>>8&7;Va(e,1862,b+776|0)|0;if(!(p&1))d=0;else{c[b+784>>2]=0;Va(e,1249,b+784|0)|0;d=1}if(p&2){if(d|0)ob(44,e)|0;c[b+1008>>2]=1;Va(e,1249,b+1008|0)|0;d=d+1|0}if(p&4){if(d|0)ob(44,e)|0;c[b+1016>>2]=2;Va(e,1249,b+1016|0)|0;d=d+1|0}if(p&8){if(d|0)ob(44,e)|0;c[b+1024>>2]=3;Va(e,1249,b+1024|0)|0;d=d+1|0}if(p&16){if(d|0)ob(44,e)|0;c[b+1032>>2]=4;Va(e,1249,b+1032|0)|0;d=d+1|0}if(p&32){if(d|0)ob(44,e)|0;c[b+1040>>2]=5;Va(e,1249,b+1040|0)|0;d=d+1|0}if(p&64){if(d|0)ob(44,e)|0;c[b+1048>>2]=6;Va(e,1249,b+1048|0)|0;d=d+1|0}if(p&128|0){if(d|0)ob(44,e)|0;c[b+1056>>2]=7;Va(e,1249,b+1056|0)|0}La(1253,2,1,e)|0}f=1;g=0;d=c[4668+((p>>>8&7)<<2)>>2]|0;while(1){if(f&p){e=c[4668+(g<<2)>>2]|0;f:do if((d&-268435456|0)==-536870912){o=d+536813552|0;switch(o>>>2|o<<30|0){case 0:{o=c[1164]|0;c[1164]=e&65543;if((e&1|0)==0|(o&1|0)!=0)break f;c[1166]=c[1165];break f}case 1:{c[1165]=e&16777215;break f}case 2:{c[1166]=e&16777215;break f}case 3:break f;default:break f}}else fa(2,d|0,e|0)|0;while(0);d=d+4|0}g=g+1|0;if((g|0)==8)break;else f=f<<1&254}c[4668+((p>>>8&7)<<2)>>2]=d;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}else{switch((p&63488)<<16>>16){case 24576:break;default:break e}if(a[5300]|0){o=c[2]|0;c[b+792>>2]=p&7;c[b+792+4>>2]=p>>>3&7;c[b+792+8>>2]=p>>>4&124;Va(o,1875,b+792|0)|0}e=(c[4668+((p>>>3&7)<<2)>>2]|0)+(p>>>4&124)|0;d=c[4668+((p&7)<<2)>>2]|0;if((e&-268435456|0)!=-536870912){fa(2,e|0,d|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}switch((e+536813552|0)>>>2|e+536813552<<30|0){case 0:{p=c[1164]|0;c[1164]=d&65543;if((d&1|0)==0|(p&1|0)!=0){f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}c[1166]=c[1165];f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 1:{c[1165]=d&16777215;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 2:{c[1166]=d&16777215;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 3:{f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:{f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}}while(0);if((p&65024|0)==20480){if(a[5300]|0){o=c[2]|0;c[b+808>>2]=p&7;c[b+808+4>>2]=p>>>3&7;c[b+808+8>>2]=p>>>6&7;Va(o,1896,b+808|0)|0}e=(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0;d=c[4668+((p&7)<<2)>>2]|0;if((e&-268435456|0)!=-536870912){fa(2,e|0,d|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}switch((e+536813552|0)>>>2|e+536813552<<30|0){case 0:{p=c[1164]|0;c[1164]=d&65543;if((d&1|0)==0|(p&1|0)!=0){f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}c[1166]=c[1165];f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 1:{c[1165]=d&16777215;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 2:{c[1166]=d&16777215;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 3:{f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:{f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}}g:do if((p&63488)<<16>>16<28672){switch((p&63488)<<16>>16){case -28672:break;default:break g}if(a[5300]|0){o=c[2]|0;c[b+824>>2]=p>>>8&7;c[b+824+4>>2]=p<<2&1020;Va(o,1915,b+824|0)|0}e=(c[1180]|0)+(p<<2&1020)|0;d=c[4668+((p>>>8&7)<<2)>>2]|0;if((e&-268435456|0)!=-536870912){fa(2,e|0,d|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}switch((e+536813552|0)>>>2|e+536813552<<30|0){case 0:{p=c[1164]|0;c[1164]=d&65543;if((d&1|0)==0|(p&1|0)!=0){f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}c[1166]=c[1165];f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 1:{c[1165]=d&16777215;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 2:{c[1166]=d&16777215;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case 3:{f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:{f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}}else{switch((p&63488)<<16>>16){case 28672:break;default:break g}if(a[5300]|0){o=c[2]|0;c[b+832>>2]=p&7;c[b+832+4>>2]=p>>>3&7;c[b+832+8>>2]=p>>>6&31;Va(o,1935,b+832|0)|0}f=c[4668+((p>>>3&7)<<2)>>2]|0;d=c[4668+((p&7)<<2)>>2]|0;e=Z(3,f+(p>>>6&31)&-2|0)|0;if(!(f+(p>>>6)&1))d=e&65280|d&255;else d=e&255|d<<8;fa(5,f+(p>>>6&31)&-2|0,d&65535|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}while(0);if((p&65024|0)==21504){if(a[5300]|0){o=c[2]|0;c[b+848>>2]=p&7;c[b+848+4>>2]=p>>>3&7;c[b+848+8>>2]=p>>>6&7;Va(o,1957,b+848|0)|0}f=(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0;d=c[4668+((p&7)<<2)>>2]|0;e=Z(3,f&-2|0)|0;if(!(f&1))d=e&65280|d&255;else d=e&255|d<<8;fa(5,f&-2|0,d&65535|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&63488|0)==32768){if(a[5300]|0){o=c[2]|0;c[b+864>>2]=p&7;c[b+864+4>>2]=p>>>3&7;c[b+864+8>>2]=p>>>5&62;Va(o,1977,b+864|0)|0}fa(5,(c[4668+((p>>>3&7)<<2)>>2]|0)+(p>>>5&62)|0,c[4668+((p&7)<<2)>>2]&65535|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}h:do if((p&65024)<<16>>16<20992){switch((p&65024)<<16>>16){case 7680:break;default:break h}if(a[5300]|0){o=c[2]|0;c[b+896>>2]=p&7;c[b+896+4>>2]=p>>>3&7;c[b+896+8>>2]=p>>>6&7;Va(o,2019,b+896|0)|0}o=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=o-(p>>>6&7);f=c[1184]|0;f=(o-(p>>>6&7)|0)<0?f|-2147483648:f&2147483647;f=(o-(p>>>6&7)|0)==0?f|1073741824:f&-1073741825;f=(((o>>>31)+1+((((p>>>6|2147483640)^7)+1+(o&2147483647)|0)>>>31)|0)&2|0)==0?f&-536870913:f|536870912;c[1184]=((((p>>>6|2147483640)^7)+1+(o&2147483647)|0)>>>31|0)==(((o>>>31)+1+((((p>>>6|2147483640)^7)+1+(o&2147483647)|0)>>>31)|0)>>>1&1|0)?f&-268435457:f|268435456;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}else{switch((p&65024)<<16>>16){case 20992:break;default:break h}if(a[5300]|0){o=c[2]|0;c[b+880>>2]=p&7;c[b+880+4>>2]=p>>>3&7;c[b+880+8>>2]=p>>>6&7;Va(o,1999,b+880|0)|0}fa(5,(c[4668+((p>>>6&7)<<2)>>2]|0)+(c[4668+((p>>>3&7)<<2)>>2]|0)|0,c[4668+((p&7)<<2)>>2]&65535|0)|0;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}while(0);if((p&63488|0)==14336){if(a[5300]|0){o=c[2]|0;c[b+912>>2]=p>>>8&7;c[b+912+4>>2]=p&255;Va(o,2039,b+912|0)|0}o=c[4668+((p>>>8&7)<<2)>>2]|0;c[4668+((p>>>8&7)<<2)>>2]=o-(p&255);f=c[1184]|0;f=(o-(p&255)|0)<0?f|-2147483648:f&2147483647;f=(o-(p&255)|0)==0?f|1073741824:f&-1073741825;f=(((o>>>31)+1+((-2147483648-(p&255)+(o&2147483647)|0)>>>31)|0)&2|0)==0?f&-536870913:f|536870912;c[1184]=((-2147483648-(p&255)+(o&2147483647)|0)>>>31|0)==(((o>>>31)+1+((-2147483648-(p&255)+(o&2147483647)|0)>>>31)|0)>>>1&1|0)?f&-268435457:f|268435456;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65024|0)==6656){if(a[5300]|0){o=c[2]|0;c[b+920>>2]=p&7;c[b+920+4>>2]=p>>>3&7;c[b+920+8>>2]=p>>>6&7;Va(o,2057,b+920|0)|0}n=c[4668+((p>>>3&7)<<2)>>2]|0;o=c[4668+((p>>>6&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=n-o;f=c[1184]|0;f=(n-o|0)<0?f|-2147483648:f&2147483647;f=(n-o|0)==0?f|1073741824:f&-1073741825;f=(((~o>>>31)+(n>>>31)+(((n&2147483647)+1+(~o&2147483647)|0)>>>31)|0)&2|0)==0?f&-536870913:f|536870912;c[1184]=(((n&2147483647)+1+(~o&2147483647)|0)>>>31|0)==(((~o>>>31)+(n>>>31)+(((n&2147483647)+1+(~o&2147483647)|0)>>>31)|0)>>>1&1|0)?f&-268435457:f|268435456;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65408|0)==45184){if(a[5300]|0){o=c[2]|0;c[b+936>>2]=p<<2&508;Va(o,2075,b+936|0)|0}c[1180]=(c[1180]|0)-(p<<2&508);f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65280|0)==57088){if(a[5300]|0){o=c[2]|0;c[b+944>>2]=p&255;Va(o,2091,b+944|0)|0}if((p&255|0)==204){c[1167]=c[1184];f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}else{f=c[2]|0;c[b+952>>2]=p&255;Va(f,2103,b+952|0)|0;f=1;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}i:do if((p&65472)<<16>>16<-19840)switch((p&65472)<<16>>16){case -19904:{if(a[5300]|0){o=c[2]|0;c[b+960>>2]=p&7;c[b+960+4>>2]=p>>>3&7;Va(o,2117,b+960|0)|0}f=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=(f&128|0)==0?f&255:f|-256;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}case -19968:{if(a[5300]|0){o=c[2]|0;c[b+968>>2]=p&7;c[b+968+4>>2]=p>>>3&7;Va(o,2131,b+968|0)|0}f=c[4668+((p>>>3&7)<<2)>>2]|0;c[4668+((p&7)<<2)>>2]=(f&32768|0)==0?f&65535:f|-65536;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}default:break i}else{if((p&65472)<<16>>16<-19776){switch((p&65472)<<16>>16){case -19840:break;default:break i}if(a[5300]|0){o=c[2]|0;c[b+992>>2]=p&7;c[b+992+4>>2]=p>>>3&7;Va(o,2172,b+992|0)|0}c[4668+((p&7)<<2)>>2]=c[4668+((p>>>3&7)<<2)>>2]&65535;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}if((p&65472)<<16>>16<16896){switch((p&65472)<<16>>16){case -19776:break;default:break i}if(a[5300]|0){o=c[2]|0;c[b+984>>2]=p&7;c[b+984+4>>2]=p>>>3&7;Va(o,2158,b+984|0)|0}c[4668+((p&7)<<2)>>2]=c[4668+((p>>>3&7)<<2)>>2]&255;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}else{switch((p&65472)<<16>>16){case 16896:break;default:break i}if(a[5300]|0){o=c[2]|0;c[b+976>>2]=p&7;c[b+976+4>>2]=p>>>3&7;Va(o,2145,b+976|0)|0}p=c[4668+((p>>>3&7)<<2)>>2]&c[4668+((p&7)<<2)>>2];f=c[1184]|0;f=(p|0)<0?f|-2147483648:f&2147483647;c[1184]=(p|0)==0?f|1073741824:f&-1073741825;f=0;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}while(0);f=c[2]|0;c[b+1e3>>2]=g;c[b+1e3+4>>2]=p;Va(f,2186,b+1e3|0)|0;f=1;l=b;c[b+4792>>2]=6;c[b+4796>>2]=f|0;break a}}}}}}}c[b+1368>>2]=f}

// EMSCRIPTEN_END_FUNCS
var ha=[Eb,Ca];var ia=[Fb,Da,Ea,Fb];return{_llvm_bswap_i32:Bb,_enable_debug:ua,stackSave:ka,_i64Subtract:qb,___udivdi3:yb,setThrew:na,_bitshift64Lshr:tb,_read_register:va,_bitshift64Shl:ub,_memset:sb,_sbrk:zb,_memcpy:vb,stackAlloc:ja,___uremdi3:Ab,_run:sa,_abort_run:ta,setTempRet0:oa,_i64Add:rb,dynCall_iiii:Db,dynCall_ii:Cb,_ping:ra,_emscripten_get_global_libc:Ba,_free:Aa,___errno_location:Ga,_set_stop_address:qa,runPostSets:pb,getTempRet0:pa,_write_register:wa,stackRestore:la,_malloc:za,establishStackSpace:ma,_reset:xa}})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg,Module.asmLibraryArg,buffer);var _enable_debug=Module["_enable_debug"]=asm["_enable_debug"];var stackSave=Module["stackSave"]=asm["stackSave"];var _i64Subtract=Module["_i64Subtract"]=asm["_i64Subtract"];var ___udivdi3=Module["___udivdi3"]=asm["___udivdi3"];var getTempRet0=Module["getTempRet0"]=asm["getTempRet0"];var _bitshift64Lshr=Module["_bitshift64Lshr"]=asm["_bitshift64Lshr"];var _read_register=Module["_read_register"]=asm["_read_register"];var _bitshift64Shl=Module["_bitshift64Shl"]=asm["_bitshift64Shl"];var _memset=Module["_memset"]=asm["_memset"];var _sbrk=Module["_sbrk"]=asm["_sbrk"];var _memcpy=Module["_memcpy"]=asm["_memcpy"];var ___errno_location=Module["___errno_location"]=asm["___errno_location"];var ___uremdi3=Module["___uremdi3"]=asm["___uremdi3"];var stackAlloc=Module["stackAlloc"]=asm["stackAlloc"];var _run=Module["_run"]=asm["_run"];var _abort_run=Module["_abort_run"]=asm["_abort_run"];var setTempRet0=Module["setTempRet0"]=asm["setTempRet0"];var _i64Add=Module["_i64Add"]=asm["_i64Add"];var _ping=Module["_ping"]=asm["_ping"];var _emscripten_get_global_libc=Module["_emscripten_get_global_libc"]=asm["_emscripten_get_global_libc"];var _set_stop_address=Module["_set_stop_address"]=asm["_set_stop_address"];var _llvm_bswap_i32=Module["_llvm_bswap_i32"]=asm["_llvm_bswap_i32"];var _free=Module["_free"]=asm["_free"];var runPostSets=Module["runPostSets"]=asm["runPostSets"];var setThrew=Module["setThrew"]=asm["setThrew"];var establishStackSpace=Module["establishStackSpace"]=asm["establishStackSpace"];var _write_register=Module["_write_register"]=asm["_write_register"];var stackRestore=Module["stackRestore"]=asm["stackRestore"];var _malloc=Module["_malloc"]=asm["_malloc"];var _reset=Module["_reset"]=asm["_reset"];var dynCall_ii=Module["dynCall_ii"]=asm["dynCall_ii"];var dynCall_iiii=Module["dynCall_iiii"]=asm["dynCall_iiii"];Runtime.stackAlloc=Module["stackAlloc"];Runtime.stackSave=Module["stackSave"];Runtime.stackRestore=Module["stackRestore"];Runtime.establishStackSpace=Module["establishStackSpace"];Runtime.setTempRet0=Module["setTempRet0"];Runtime.getTempRet0=Module["getTempRet0"];Module["asm"]=asm;Module["then"]=(function(func){if(Module["calledRun"]){func(Module)}else{var old=Module["onRuntimeInitialized"];Module["onRuntimeInitialized"]=(function(){if(old)old();func(Module)})}return Module});function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}ExitStatus.prototype=new Error;ExitStatus.prototype.constructor=ExitStatus;var initialStackTop;var preloadStartTime=null;var calledMain=false;dependenciesFulfilled=function runCaller(){if(!Module["calledRun"])run();if(!Module["calledRun"])dependenciesFulfilled=runCaller};Module["callMain"]=Module.callMain=function callMain(args){args=args||[];ensureInitRuntime();var argc=args.length+1;function pad(){for(var i=0;i<4-1;i++){argv.push(0)}}var argv=[allocate(intArrayFromString(Module["thisProgram"]),"i8",ALLOC_NORMAL)];pad();for(var i=0;i<argc-1;i=i+1){argv.push(allocate(intArrayFromString(args[i]),"i8",ALLOC_NORMAL));pad()}argv.push(0);argv=allocate(argv,"i32",ALLOC_NORMAL);try{var ret=Module["_main"](argc,argv,0);exit(ret,true)}catch(e){if(e instanceof ExitStatus){return}else if(e=="SimulateInfiniteLoop"){Module["noExitRuntime"]=true;return}else{var toLog=e;if(e&&typeof e==="object"&&e.stack){toLog=[e,e.stack]}Module.printErr("exception thrown: "+toLog);Module["quit"](1,e)}}finally{calledMain=true}};function run(args){args=args||Module["arguments"];if(preloadStartTime===null)preloadStartTime=Date.now();if(runDependencies>0){return}preRun();if(runDependencies>0)return;if(Module["calledRun"])return;function doRun(){if(Module["calledRun"])return;Module["calledRun"]=true;if(ABORT)return;ensureInitRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();if(Module["_main"]&&shouldRunNow)Module["callMain"](args);postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout((function(){setTimeout((function(){Module["setStatus"]("")}),1);doRun()}),1)}else{doRun()}}Module["run"]=Module.run=run;function exit(status,implicit){if(implicit&&Module["noExitRuntime"]){return}if(Module["noExitRuntime"]){}else{ABORT=true;EXITSTATUS=status;STACKTOP=initialStackTop;exitRuntime();if(Module["onExit"])Module["onExit"](status)}if(ENVIRONMENT_IS_NODE){process["exit"](status)}Module["quit"](status,new ExitStatus(status))}Module["exit"]=Module.exit=exit;var abortDecorators=[];function abort(what){if(Module["onAbort"]){Module["onAbort"](what)}if(what!==undefined){Module.print(what);Module.printErr(what);what=JSON.stringify(what)}else{what=""}ABORT=true;EXITSTATUS=1;var extra="\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";var output="abort("+what+") at "+stackTrace()+extra;if(abortDecorators){abortDecorators.forEach((function(decorator){output=decorator(output,what)}))}throw output}Module["abort"]=Module.abort=abort;if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}var shouldRunNow=false;if(Module["noInitialRun"]){shouldRunNow=false}Module["noExitRuntime"]=true;run()





  return Module;
};
if (typeof module === "object" && module.exports) {
  module['exports'] = Module;
};
module.exports = Module;

}).call(this,require('_process'))

},{"_process":12,"fs":5,"path":11}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],27:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":26,"_process":12,"inherits":8}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var AbstractCLI = (function () {
    function AbstractCLI() {
        this.events = {
            outputAvailable: new microevent_ts_1.Event(),
            quit: new microevent_ts_1.Event(),
            promptChanged: new microevent_ts_1.Event(),
            prompt: new microevent_ts_1.Event(),
            availableCommandsChanged: new microevent_ts_1.Event()
        };
    }
    return AbstractCLI;
}());
exports.default = AbstractCLI;

},{"microevent.ts":10}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var CommandInterpreter = (function () {
    function CommandInterpreter(commandTable) {
        this._commandTable = {};
        this._aliasTable = {};
        if (typeof commandTable !== 'undefined') {
            this.registerCommands(commandTable);
        }
    }
    CommandInterpreter.prototype.registerCommands = function (commandTable) {
        var _this = this;
        Object.keys(commandTable).forEach(function (command) { return (_this._commandTable[command] = commandTable[command]); });
    };
    CommandInterpreter.prototype.execute = function (cmd) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var components, commandName;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = cmd.replace(/;.*/, '');
                        if (cmd.match(/^\s*$/)) {
                            return [2, ''];
                        }
                        components = cmd.split(/\s+/).filter(function (value) { return !!value; }), commandName = components.shift();
                        return [4, this._locateCommand(commandName).call(this, components, cmd)];
                    case 1: return [2, _a.sent()];
                }
            });
        });
    };
    CommandInterpreter.prototype.getCommands = function () {
        return Object.keys(this._commandTable);
    };
    CommandInterpreter.prototype._locateCommand = function (name) {
        if (this._commandTable[name]) {
            return this._commandTable[name];
        }
        if (this._aliasTable[name]) {
            return this._aliasTable[name];
        }
        var candidates = Object.keys(this._commandTable).filter(function (candidate) { return candidate.indexOf(name) === 0; });
        var nCandidates = candidates.length;
        if (nCandidates > 1) {
            throw new Error('ambiguous command ' + name + ', candidates are ' + candidates.join(', ').replace(/, $/, ''));
        }
        if (nCandidates === 0) {
            throw new Error('invalid command ' + name);
        }
        return (this._aliasTable[name] = this._commandTable[candidates[0]]);
    };
    return CommandInterpreter;
}());
exports.default = CommandInterpreter;

},{"tslib":25}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pathlib = require("path");
var Completer = (function () {
    function Completer(_availableCommands, _fsProvider) {
        this._availableCommands = _availableCommands;
        this._fsProvider = _fsProvider;
    }
    Completer.prototype.complete = function (cmd) {
        var chunks = cmd.split(/\s+/);
        if (chunks.length > 0 && chunks[0] === '') {
            chunks.shift();
        }
        switch (chunks.length) {
            case 0:
                return new Completer.CompletionResult(this._availableCommands, cmd);
            case 1:
                return new Completer.CompletionResult(this._availableCommands.filter(function (candidate) { return candidate.search(chunks[0]) === 0; }), chunks[0]);
            default:
                var path = chunks[chunks.length - 1];
                return new Completer.CompletionResult(this._completePath(path), path);
        }
    };
    Completer.prototype._completePath = function (path) {
        var dirname = pathlib.dirname(path), basename = pathlib.basename(path), directory;
        if (!this._fsProvider) {
            return [];
        }
        if ((path && path[path.length - 1] === pathlib.sep) || path[path.length - 1] === '/') {
            dirname = path;
            basename = '';
        }
        try {
            directory = this._fsProvider.readDirSync(dirname);
            return this._appendSlashesToDirectories(directory
                .filter(function (candidate) { return candidate.search(basename) === 0; })
                .map(function (entry) { return pathlib.join(dirname, entry); }));
        }
        catch (e) { }
        return [];
    };
    Completer.prototype._appendSlashesToDirectories = function (paths) {
        var _this = this;
        return paths.map(function (path) {
            try {
                return _this._fsProvider.getTypeSync(path) === 0
                    ? pathlib.join(path, pathlib.sep)
                    : path;
            }
            catch (e) {
                return path;
            }
        });
    };
    return Completer;
}());
exports.default = Completer;
(function (Completer) {
    var CompletionResult = (function () {
        function CompletionResult(candidates, match) {
            this.candidates = candidates;
            this.match = match;
        }
        return CompletionResult;
    }());
    Completer.CompletionResult = CompletionResult;
})(Completer || (Completer = {}));
exports.default = Completer;

},{"path":11}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var path = require("path");
var Debugger_1 = require("../machine/Debugger");
var DebuggerFrontend_1 = require("./DebuggerFrontend");
var CommandInterpreter_1 = require("./CommandInterpreter");
var AbstractCLI_1 = require("./AbstractCLI");
var Board_1 = require("../machine/vanilla/Board");
var DebuggerCLI = (function (_super) {
    tslib_1.__extends(DebuggerCLI, _super);
    function DebuggerCLI(_fsProvider) {
        var _this = _super.call(this) || this;
        _this._fsProvider = _fsProvider;
        _this._output = '';
        _this._allowQuit = true;
        var dbg = new Debugger_1.default(), commandInterpreter = new CommandInterpreter_1.default(), debuggerFrontend = new DebuggerFrontend_1.default(dbg, _this._fsProvider, commandInterpreter);
        _this._debugger = dbg;
        _this._commandInterpreter = commandInterpreter;
        _this._extendCommandInterpreter();
        _this._debuggerFrontend = debuggerFrontend;
        return _this;
    }
    DebuggerCLI.prototype.runDebuggerScript = function (filename) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var e_1, _a, _b, _c, line, e_1_1, e_2;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this._fsProvider.pushd(path.dirname(filename));
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 10, , 11]);
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 7, 8, 9]);
                        _b = tslib_1.__values(this._fsProvider.readTextFileSync(path.basename(filename)).split('\n')), _c = _b.next();
                        _d.label = 3;
                    case 3:
                        if (!!_c.done) return [3, 6];
                        line = _c.value;
                        return [4, this.pushInput(line)];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _c = _b.next();
                        return [3, 3];
                    case 6: return [3, 9];
                    case 7:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3, 9];
                    case 8:
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7];
                    case 9: return [3, 11];
                    case 10:
                        e_2 = _d.sent();
                        this._fsProvider.popd();
                        throw e_2;
                    case 11:
                        this._fsProvider.popd();
                        return [2];
                }
            });
        });
    };
    DebuggerCLI.prototype.startup = function () {
        this._initialize();
        this._prompt();
    };
    DebuggerCLI.prototype.shutdown = function () { };
    DebuggerCLI.prototype.pushInput = function (input) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, e_3;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = this._outputLine;
                        return [4, this._getCommandInterpreter().execute(input)];
                    case 1:
                        _a.apply(this, [_b.sent()]);
                        return [3, 3];
                    case 2:
                        e_3 = _b.sent();
                        this._outputLine('ERROR: ' + e_3.message);
                        return [3, 3];
                    case 3: return [2];
                }
            });
        });
    };
    DebuggerCLI.prototype.interrupt = function () {
        this._quit();
    };
    DebuggerCLI.prototype.outputAvailable = function () {
        return !!this._output;
    };
    DebuggerCLI.prototype.readOutput = function () {
        var output = this._output;
        this._output = '';
        return output;
    };
    DebuggerCLI.prototype.availableCommands = function () {
        return this._getCommandInterpreter().getCommands();
    };
    DebuggerCLI.prototype.getPrompt = function () {
        return '> ';
    };
    DebuggerCLI.prototype.getFilesystemProvider = function () {
        return this._fsProvider;
    };
    DebuggerCLI.prototype.allowQuit = function (allowQuit) {
        this._allowQuit = allowQuit;
    };
    DebuggerCLI.prototype._initialize = function () {
        this._initializeHardware();
        this._debugger.attach(this._board);
    };
    DebuggerCLI.prototype._initializeHardware = function () {
        this._board = new Board_1.default();
    };
    DebuggerCLI.prototype._extendCommandInterpreter = function () {
        var _this = this;
        this._commandInterpreter.registerCommands({
            quit: function () {
                _this._quit();
                return 'bye';
            },
            'run-script': function (args) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!args.length) {
                                throw new Error('filename required');
                            }
                            return [4, this.runDebuggerScript(args[0])];
                        case 1:
                            _a.sent();
                            return [2, 'script executed'];
                    }
                });
            }); }
        });
    };
    DebuggerCLI.prototype._prompt = function () {
        this.events.prompt.dispatch(undefined);
    };
    DebuggerCLI.prototype._quit = function () {
        if (this._allowQuit) {
            this.events.quit.dispatch(undefined);
        }
    };
    DebuggerCLI.prototype._outputLine = function (line) {
        this._output += line + '\n';
        this.events.outputAvailable.dispatch(undefined);
    };
    DebuggerCLI.prototype._getCommandInterpreter = function () {
        return this._commandInterpreter;
    };
    return DebuggerCLI;
}(AbstractCLI_1.default));
exports.default = DebuggerCLI;

},{"../machine/Debugger":39,"../machine/vanilla/Board":126,"./AbstractCLI":28,"./CommandInterpreter":29,"./DebuggerFrontend":32,"path":11,"tslib":25}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var hex = require("../tools/hex");
var util = require("util");
function decodeNumber(value) {
    try {
        return hex.decode(value);
    }
    catch (e) {
        if (!value.match(/^-?\d+$/)) {
            throw new TypeError('number expected, got ' + value);
        }
        return Number(value);
    }
}
var DebuggerFrontend = (function () {
    function DebuggerFrontend(_debugger, _fileSystemProvider, _commandInterpreter) {
        var _this = this;
        this._debugger = _debugger;
        this._fileSystemProvider = _fileSystemProvider;
        this._commandInterpreter = _commandInterpreter;
        this._commandInterpreter.registerCommands({
            disassemble: this._disassemble.bind(this),
            dump: this._dump.bind(this),
            load: this._load.bind(this),
            hex2dec: this._hex2dec.bind(this),
            dec2hex: this._dec2hex.bind(this),
            state: this._state.bind(this),
            boot: this._boot.bind(this),
            stack: this._stack.bind(this),
            step: this._step.bind(this),
            'step-clock': this._stepClock.bind(this),
            reset: function () { return _this._reset(false); },
            'reset-hard': function () { return _this._reset(true); },
            'break-on': this._enableBreakpoints.bind(this),
            'break-off': this._disableBreakpoints.bind(this),
            break: this._setBreakpoint.bind(this),
            'break-clear': this._clearBreakpoint.bind(this),
            'break-dump': this._showBreakpoints.bind(this),
            'break-clear-all': this._clearAllBreakpoints.bind(this),
            'trace-on': this._enableTrace.bind(this),
            'trace-off': this._disableTrace.bind(this),
            trace: this._trace.bind(this)
        });
    }
    DebuggerFrontend.prototype.describeTrap = function (trap) {
        if (typeof trap === 'undefined') {
            trap = this._debugger.getLastTrap();
        }
        if (!trap) {
            return '';
        }
        var message = trap.message ? trap.message : 'unknown';
        switch (trap.reason) {
            case 0:
                return util.format('CPU TRAP: %s', message);
            case 2:
                return util.format('DEBUGGER TRAP: %s', message);
            default:
                return util.format('UNKNOWN TRAP: %s', message);
        }
    };
    DebuggerFrontend.prototype._disassemble = function (args) {
        switch (args.length) {
            case 0:
                return this._debugger.disassemble(1);
            case 1:
                return this._debugger.disassemble(decodeNumber(args[0]));
            default:
                return this._debugger.disassembleAt(decodeNumber(args[0]), decodeNumber(args[1]));
        }
    };
    DebuggerFrontend.prototype._dump = function (args) {
        if (args.length < 1) {
            throw new Error('at least one argument expected');
        }
        return this._debugger.dumpAt(Math.abs(decodeNumber(args[0])), Math.abs(args.length > 1 ? decodeNumber(args[1]) : 1));
    };
    DebuggerFrontend.prototype._load = function (args) {
        if (args.length < 2) {
            throw new Error('at least two arguments. expected');
        }
        var file = args[0], base = Math.abs(decodeNumber(args[1])) % 0x10000, buffer = this._fileSystemProvider.readBinaryFileSync(file), offset = args.length > 2 ? Math.min(Math.abs(decodeNumber(args[2])), buffer.length - 1) : 0, count = args.length > 3 ? Math.min(Math.abs(decodeNumber(args[3])), buffer.length) : buffer.length;
        this._debugger.loadBlock(buffer, base, offset, offset + count - 1);
        return 'successfully loaded ' + count + ' bytes at ' + hex.encode(base, 4);
    };
    DebuggerFrontend.prototype._hex2dec = function (args) {
        return args.map(function (value) { return hex.decode(value); }).join(' ');
    };
    DebuggerFrontend.prototype._dec2hex = function (args) {
        return args.map(function (value) { return String(hex.encode(Number(value))); }).join(' ');
    };
    DebuggerFrontend.prototype._state = function () {
        return this._debugger.dumpState();
    };
    DebuggerFrontend.prototype._boot = function () {
        var board = this._debugger.getBoard();
        var cycles = 0;
        var clockHandler = function (clock) { return (cycles += clock); };
        board.cpuClock.addHandler(clockHandler);
        var exception;
        try {
            this._debugger.getBoard().boot();
        }
        catch (e) {
            exception = e || new Error('unknown exception during boot');
        }
        board.cpuClock.removeHandler(clockHandler);
        if (exception) {
            throw exception;
        }
        return util.format('Boot successful in %s cycles', cycles);
    };
    DebuggerFrontend.prototype._reset = function (hard) {
        this._debugger.getBoard().reset(hard);
        return 'reset successful';
    };
    DebuggerFrontend.prototype._step = function (args) {
        var timestamp = Date.now(), instructionCount = args.length > 0 ? decodeNumber(args[0]) : 1, _a = this._debugger.step(instructionCount), cycles = _a.cycles, cpuCycles = _a.cpuCycles, trap = this._debugger.getLastTrap();
        return util.format('Used %s cycles (CPU: %s) in %s milliseconds, now at\n%s\n%s\n', cycles, cpuCycles, Date.now() - timestamp, this._debugger.disassemble(1), this.describeTrap(trap));
    };
    DebuggerFrontend.prototype._stack = function () {
        return this._debugger.dumpStack();
    };
    DebuggerFrontend.prototype._enableBreakpoints = function () {
        this._debugger.setBreakpointsEnabled(true);
        return 'Breakpoints enabled';
    };
    DebuggerFrontend.prototype._disableBreakpoints = function () {
        this._debugger.setBreakpointsEnabled(false);
        return 'Breakpoints disabled';
    };
    DebuggerFrontend.prototype._setBreakpoint = function (args) {
        if (args.length < 1) {
            throw new Error('at least one argument expected');
        }
        var name = args.length > 1 ? args[1] : '-', address = decodeNumber(args[0]);
        this._debugger.setBreakpoint(address, name);
        return 'Breakpoint "' + name + '" at ' + hex.encode(address, 4);
    };
    DebuggerFrontend.prototype._clearBreakpoint = function (args) {
        if (args.length < 1) {
            throw new Error('argument expected');
        }
        var address = decodeNumber(args[0]);
        this._debugger.clearBreakpoint(address);
        return 'Cleared breakpoint at ' + hex.encode(address, 4);
    };
    DebuggerFrontend.prototype._showBreakpoints = function () {
        return this._debugger.dumpBreakpoints();
    };
    DebuggerFrontend.prototype._clearAllBreakpoints = function () {
        this._debugger.clearAllBreakpoints();
        return 'All breakpoints cleared';
    };
    DebuggerFrontend.prototype._enableTrace = function () {
        this._debugger.setTraceEnabled(true);
        return 'Tracing enabled';
    };
    DebuggerFrontend.prototype._disableTrace = function () {
        this._debugger.setTraceEnabled(false);
        return 'Tracing disabled';
    };
    DebuggerFrontend.prototype._trace = function (args) {
        return this._debugger.trace(args.length > 0 ? decodeNumber(args[0]) : 10);
    };
    DebuggerFrontend.prototype._stepClock = function (args) {
        var requestedCycles = args.length > 0 ? decodeNumber(args[0]) : 1, timestamp = Date.now();
        var cycles = this._debugger.stepClock(requestedCycles);
        var time = Date.now() - timestamp, trap = this._debugger.getLastTrap();
        return ("clock stepped " + cycles + " cycles in " + time + " msec; " +
            ("now at " + this._debugger.disassemble(1) + "\n" + (trap ? this.describeTrap(trap) : '')));
    };
    return DebuggerFrontend;
}());
exports.default = DebuggerFrontend;

},{"../tools/hex":134,"util":27}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Completer_1 = require("./Completer");
var JqtermCLIRunner = (function () {
    function JqtermCLIRunner(_cli, terminalElt, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this._cli = _cli;
        this._updateCompleter();
        this._terminal = terminalElt.terminal(function (input, terminal) { return _this._cli.pushInput(input); }, {
            greetings: 'Ready.',
            completion: this._getCompletionHandler(),
            exit: false,
            clear: false
        });
        this._cli.events.outputAvailable.addHandler(this._onCLIOutputAvailable, this);
        this._cli.events.promptChanged.addHandler(this._onCLIPromptChanged, this);
        this._cli.events.availableCommandsChanged.addHandler(this._updateCompleter.bind(this));
        if (options.interruptButton) {
            options.interruptButton.mousedown(function () { return _this._cli.interrupt(); });
        }
        if (options.clearButton) {
            options.clearButton.mousedown(function () { return _this._terminal.clear(); });
        }
    }
    JqtermCLIRunner.prototype.startup = function () {
        this._cli.startup();
        this._terminal.set_prompt(this._cli.getPrompt());
    };
    JqtermCLIRunner.prototype._updateCompleter = function () {
        this._completer = new Completer_1.default(this._cli.availableCommands(), this._cli.getFilesystemProvider());
    };
    JqtermCLIRunner.prototype._onCLIOutputAvailable = function (payload, ctx) {
        ctx._terminal.echo(ctx._cli.readOutput());
    };
    JqtermCLIRunner.prototype._onCLIPromptChanged = function (payload, ctx) {
        ctx._terminal.set_prompt(ctx._cli.getPrompt());
    };
    JqtermCLIRunner.prototype._getCompletionHandler = function () {
        var me = this;
        return function (cmd, handler) {
            handler(me._completer.complete(this.get_command()).candidates);
        };
    };
    return JqtermCLIRunner;
}());
exports.default = JqtermCLIRunner;

},{"./Completer":30}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CotrolPanelManagementProvider = (function () {
    function CotrolPanelManagementProvider(_controlPanel) {
        var _this = this;
        this._controlPanel = _controlPanel;
        this._commands = {
            'switch-color': this._changeColorSwitch.bind(this),
            'switch-difficulty-player-0': function (args) {
                return _this._changeDifficultySwitch(_this._controlPanel.getDifficultySwitchP0(), 0, args);
            },
            'switch-difficulty-player-1': function (args) {
                return _this._changeDifficultySwitch(_this._controlPanel.getDifficultySwitchP1(), 1, args);
            }
        };
    }
    CotrolPanelManagementProvider.prototype.getCommands = function () {
        return this._commands;
    };
    CotrolPanelManagementProvider.prototype._changeColorSwitch = function (args) {
        var swtch = this._controlPanel.getColorSwitch();
        if (args && args.length > 0) {
            switch (args[0].toLowerCase()) {
                case '1':
                case 'on':
                case 'bw':
                    swtch.toggle(true);
                    break;
                case '0':
                case 'off':
                case 'color':
                    swtch.toggle(false);
                    break;
                default:
                    throw new Error("invalid switch state '" + args[0] + "'");
            }
        }
        return "color switch: " + (swtch.read() ? 'BW' : 'color');
    };
    CotrolPanelManagementProvider.prototype._changeDifficultySwitch = function (swtch, playerId, args) {
        if (args && args.length > 0) {
            switch (args[0].toLowerCase()) {
                case '1':
                case 'on':
                case 'b':
                case 'amateur':
                    swtch.toggle(true);
                    break;
                case '0':
                case 'off':
                case 'a':
                case 'pro':
                    swtch.toggle(false);
                    break;
                default:
                    throw new Error("invalid switch state '" + args[0] + "'");
            }
        }
        return "player " + playerId + " difficulty switch: " + (swtch.read() ? 'amateur' : 'pro');
    };
    return CotrolPanelManagementProvider;
}());
exports.default = CotrolPanelManagementProvider;

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var DebuggerCLI_1 = require("../DebuggerCLI");
var Board_1 = require("../../machine/stella/Board");
var Config_1 = require("../../machine/stella/Config");
var CartridgeFactory_1 = require("../../machine/stella/cartridge/CartridgeFactory");
var CartridgeInfo_1 = require("../../machine/stella/cartridge/CartridgeInfo");
var CommandInterpreter_1 = require("../CommandInterpreter");
var ImmedateScheduler_1 = require("../../tools/scheduler/ImmedateScheduler");
var ConstantTimeslice_1 = require("../../tools/scheduler/limiting/ConstantTimeslice");
var ConstantCycles_1 = require("../../tools/scheduler/limiting/ConstantCycles");
var PeriodicScheduler_1 = require("../../tools/scheduler/PeriodicScheduler");
var ClockProbe_1 = require("../../tools/ClockProbe");
var SystemConfigSetupProvider_1 = require("./SystemConfigSetupProvider");
var ControlPanelManagementProvider_1 = require("./ControlPanelManagementProvider");
var CLOCK_PROBE_INTERVAL = 1000;
var StellaCLI = (function (_super) {
    tslib_1.__extends(StellaCLI, _super);
    function StellaCLI(fsProvider, _cartridgeFile) {
        var _this = _super.call(this, fsProvider) || this;
        _this._cartridgeFile = _cartridgeFile;
        _this.hardwareInitialized = new microevent_ts_1.Event();
        _this._stellaConfig = Config_1.default.create();
        _this._limitingScheduler = null;
        _this._nonLimitingScheduler = new ImmedateScheduler_1.default();
        _this._state = 0;
        _this._runMode = 0;
        _this.events.stateChanged = new microevent_ts_1.Event();
        var systemConfigSetupProvider = new SystemConfigSetupProvider_1.default(_this._stellaConfig);
        _this._commandInterpreter.registerCommands({
            run: function () { return (_this._setState(2), 'running...'); }
        });
        _this._runModeCommandInterpreter = new CommandInterpreter_1.default({
            stop: function () { return (_this._setState(1), 'stopped, entered debugger'); }
        });
        _this._setupModeCommandInterpreter = new CommandInterpreter_1.default({
            'load-cartridge': _this._executeLoadCartridge.bind(_this)
        });
        _this._setupModeCommandInterpreter.registerCommands(systemConfigSetupProvider.getCommands());
        var runModeCommands = {
            'set-speed-limited': function () { return (_this._setRunMode(0), 'speed limiting on'); },
            'set-speed-unlimited': function () { return (_this._setRunMode(1), 'speed limiting off'); }
        };
        _this._commandInterpreter.registerCommands(runModeCommands);
        _this._runModeCommandInterpreter.registerCommands(runModeCommands);
        return _this;
    }
    StellaCLI.prototype.getPrompt = function () {
        var frequency = this._clockProbe ? this._clockProbe.getFrequency() : 0, prefix = frequency > 0 ? (frequency / 1000000).toFixed(2) + " MHz " : '';
        switch (this._state) {
            case 0:
                return "[setup] > ";
            case 1:
                return prefix + "[debug] > ";
            case 2:
                return prefix + "[run] > ";
            default:
                throw new Error('invalid run state');
        }
    };
    StellaCLI.prototype.interrupt = function () {
        switch (this._state) {
            case 1:
                return this._quit();
            case 2:
                return this._setState(1);
        }
    };
    StellaCLI.prototype.getBoard = function () {
        return this._board;
    };
    StellaCLI.prototype.getState = function () {
        return this._state;
    };
    StellaCLI.prototype.loadCartridgeFromBuffer = function (buffer, name) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var factory, _a, e_1;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        factory = new CartridgeFactory_1.default();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = this;
                        return [4, factory.createCartridge(buffer)];
                    case 2:
                        _a._cartridge = _b.sent();
                        this._initializeHardware();
                        this._setState(1);
                        this._cartridgeFile = name;
                        this._outputLine("successfully loaded " + name);
                        this._outputLine("format: " + CartridgeInfo_1.default.describeCartridgeType(this._cartridge.getType()));
                        return [3, 4];
                    case 3:
                        e_1 = _b.sent();
                        this._outputLine(e_1.message);
                        return [3, 4];
                    case 4: return [2];
                }
            });
        });
    };
    StellaCLI.prototype._getCommandInterpreter = function () {
        switch (this._state) {
            case 0:
                return this._setupModeCommandInterpreter;
            case 1:
                return _super.prototype._getCommandInterpreter.call(this);
            case 2:
                return this._runModeCommandInterpreter;
            default:
                throw new Error('invalid run state');
        }
    };
    StellaCLI.prototype._executeLoadCartridge = function (args) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var file, e_2;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (args.length === 0) {
                            return [2, 'ERROR: filename required'];
                        }
                        file = args[0];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4, this._loadCartridge(file)];
                    case 2:
                        _a.sent();
                        this._cartridgeFile = file;
                        this._initializeHardware();
                        this._setState(1);
                        return [3, 4];
                    case 3:
                        e_2 = _a.sent();
                        return [2, e_2.message];
                    case 4: return [2, "succesfully loaded " + file + "\nformat: " + CartridgeInfo_1.default.describeCartridgeType(this._cartridge.getType())];
                }
            });
        });
    };
    StellaCLI.prototype._loadCartridge = function (file) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var fileBuffer, factory, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        fileBuffer = this._fsProvider.readBinaryFileSync(file), factory = new CartridgeFactory_1.default();
                        _a = this;
                        return [4, factory.createCartridge(fileBuffer)];
                    case 1:
                        _a._cartridge = _b.sent();
                        return [2];
                }
            });
        });
    };
    StellaCLI.prototype._initialize = function () {
        if (this._cartridgeFile) {
            try {
                this._loadCartridge(this._cartridgeFile);
                this._initializeHardware();
                this._setState(1);
            }
            catch (e) {
                this._outputLine(e.message);
            }
        }
        this._prompt();
    };
    StellaCLI.prototype._initializeHardware = function () {
        var _this = this;
        var board = new Board_1.default(this._stellaConfig, this._cartridge);
        this._board = board;
        var clockProbe = new ClockProbe_1.default(new PeriodicScheduler_1.default(CLOCK_PROBE_INTERVAL));
        clockProbe.attach(this._board.clock);
        clockProbe.frequencyUpdate.addHandler(function () { return _this.events.promptChanged.dispatch(undefined); });
        this._debugger.attach(this._board);
        this._board.trap.addHandler(this._onTrap, this);
        this._clockProbe = clockProbe;
        var controlPanel = this._board.getControlPanel(), controlPanelManagementProvider = new ControlPanelManagementProvider_1.default(controlPanel);
        this._commandInterpreter.registerCommands(controlPanelManagementProvider.getCommands());
        this._runModeCommandInterpreter.registerCommands(controlPanelManagementProvider.getCommands());
        controlPanel.getDifficultySwitchP0().toggle(true);
        controlPanel.getDifficultySwitchP0().toggle(true);
        this._limitingScheduler = this._stellaConfig.pcmAudio
            ? new ConstantTimeslice_1.default()
            : new ConstantCycles_1.default();
        this.hardwareInitialized.dispatch(undefined);
    };
    StellaCLI.prototype._setState = function (state) {
        if (state === this._state) {
            return;
        }
        this._state = state;
        this.events.availableCommandsChanged.dispatch(undefined);
        this.events.promptChanged.dispatch(undefined);
        switch (state) {
            case 1:
                this._board.suspend();
                this._clockProbe.stop();
                this._board.getTimer().stop();
                break;
            case 2:
                this._board.resume();
                this._clockProbe.start();
                this._board.getTimer().start(this._getScheduler());
                break;
        }
        this.events.stateChanged.dispatch(state);
    };
    StellaCLI.prototype._setRunMode = function (runMode) {
        if (runMode === this._runMode) {
            return;
        }
        this._runMode = runMode;
        if (this._state === 2) {
            var timer = this._board.getTimer();
            timer.stop();
            timer.start(this._getScheduler());
        }
    };
    StellaCLI.prototype._getScheduler = function () {
        switch (this._runMode) {
            case 0:
                return this._limitingScheduler;
            case 1:
                return this._nonLimitingScheduler;
            default:
                throw new Error('invalid run mode');
        }
    };
    StellaCLI.prototype._onTrap = function (trap, ctx) {
        if (ctx._state === 2) {
            ctx._setState(1);
            ctx._outputLine(ctx._debuggerFrontend.describeTrap(trap));
        }
    };
    return StellaCLI;
}(DebuggerCLI_1.default));
exports.default = StellaCLI;

},{"../../machine/stella/Board":77,"../../machine/stella/Config":79,"../../machine/stella/cartridge/CartridgeFactory":102,"../../machine/stella/cartridge/CartridgeInfo":103,"../../tools/ClockProbe":129,"../../tools/scheduler/ImmedateScheduler":141,"../../tools/scheduler/PeriodicScheduler":142,"../../tools/scheduler/limiting/ConstantCycles":144,"../../tools/scheduler/limiting/ConstantTimeslice":145,"../CommandInterpreter":29,"../DebuggerCLI":31,"./ControlPanelManagementProvider":34,"./SystemConfigSetupProvider":36,"microevent.ts":10,"tslib":25}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Factory_1 = require("../../machine/cpu/Factory");
var SystemConfigSetupProvider = (function () {
    function SystemConfigSetupProvider(_config) {
        this._config = _config;
        this._commands = {
            'tv-mode': this._setupVideo.bind(this),
            audio: this._setupAudio.bind(this),
            paddles: this._setupPaddles.bind(this),
            seed: this._setRandomSeed.bind(this),
            pcm: this._setupPcmAUdio.bind(this),
            'high-precision-cpu': this._setHighPrecisionCpu.bind(this)
        };
    }
    SystemConfigSetupProvider.prototype.getCommands = function () {
        return this._commands;
    };
    SystemConfigSetupProvider.prototype._setupVideo = function (args) {
        if (!args || args.length === 0) {
            return "current TV mode: " + this._humanReadableTvMode(this._config.tvMode);
        }
        switch (args[0].toLowerCase()) {
            case 'ntsc':
                this._config.tvMode = 0;
                break;
            case 'pal':
                this._config.tvMode = 1;
                break;
            case 'secam':
                this._config.tvMode = 2;
                break;
            default:
                throw new Error("invalid TV mode \"" + args[0] + "\"");
        }
        return "switched TV mode to " + this._humanReadableTvMode(this._config.tvMode);
    };
    SystemConfigSetupProvider.prototype._setupAudio = function (args) {
        if (args && args.length !== 0) {
            this._config.enableAudio = this._isArgTruthy(args[0]);
        }
        return "audio " + (this._config.enableAudio ? 'enabled' : 'disabled');
    };
    SystemConfigSetupProvider.prototype._setupPaddles = function (args) {
        if (args && args.length !== 0) {
            this._config.emulatePaddles = this._isArgTruthy(args[0]);
        }
        return "paddle emulation: " + (this._config.emulatePaddles ? 'enabled' : 'disabled');
    };
    SystemConfigSetupProvider.prototype._setHighPrecisionCpu = function (args) {
        if (args && args.length !== 0) {
            this._config.cpuType = this._isArgTruthy(args[0]) ? Factory_1.default.Type.stateMachine : Factory_1.default.Type.batchedAccess;
        }
        return "using high precision CPU: " + (this._config.cpuType === Factory_1.default.Type.stateMachine ? 'yes' : 'no');
    };
    SystemConfigSetupProvider.prototype._setRandomSeed = function (args) {
        if (args && args.length !== 0) {
            this._config.randomSeed = parseInt(args[0], 10);
        }
        return "random seed: " + this._config.randomSeed;
    };
    SystemConfigSetupProvider.prototype._humanReadableTvMode = function (mode) {
        switch (mode) {
            case 0:
                return 'NTSC';
            case 1:
                return 'PAL';
            case 2:
                return 'SECAM';
            default:
                throw new Error("invalid TV mode " + mode);
        }
    };
    SystemConfigSetupProvider.prototype._setupPcmAUdio = function (args) {
        if (args && args.length !== 0) {
            this._config.pcmAudio = this._isArgTruthy(args[0]);
        }
        return "PCM audio emulation: " + (this._config.emulatePaddles ? 'enabled' : 'disabled');
    };
    SystemConfigSetupProvider.prototype._isArgTruthy = function (arg) {
        var normalizedArg = arg.toLocaleLowerCase();
        return normalizedArg === 'yes' || normalizedArg === 'true' || normalizedArg === '1';
    };
    return SystemConfigSetupProvider;
}());
exports.default = SystemConfigSetupProvider;

},{"../../machine/cpu/Factory":44}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pathlib = require("path");
var AbstractFileSystemProvider = (function () {
    function AbstractFileSystemProvider() {
        this._directoryStack = [];
        this._cwd = '/';
    }
    AbstractFileSystemProvider.prototype.pushd = function (path) {
        this._directoryStack.unshift(this._cwd);
        if (typeof path !== 'undefined') {
            this.chdir(path);
        }
    };
    AbstractFileSystemProvider.prototype.popd = function () {
        if (this._directoryStack.length === 0) {
            return undefined;
        }
        var targetDir = this._directoryStack.shift();
        this.chdir(targetDir);
        return targetDir;
    };
    AbstractFileSystemProvider.prototype.cwd = function () {
        return this._cwd;
    };
    AbstractFileSystemProvider.prototype.chdir = function (path) {
        this._cwd = this._resolvePath(path);
    };
    AbstractFileSystemProvider.prototype._resolvePath = function (path) {
        return pathlib.resolve(this._cwd, path);
    };
    return AbstractFileSystemProvider;
}());
exports.default = AbstractFileSystemProvider;

},{"path":11}],38:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var util = require("util");
var AbstractFileSystemProvider_1 = require("./AbstractFileSystemProvider");
var PrepackagedFilesystemProvider = (function (_super) {
    tslib_1.__extends(PrepackagedFilesystemProvider, _super);
    function PrepackagedFilesystemProvider(_blob) {
        var _this = _super.call(this) || this;
        _this._blob = _blob;
        _this._cwd = '/';
        return _this;
    }
    PrepackagedFilesystemProvider.prototype.readBinaryFileSync = function (name) {
        name = this._resolvePath(name);
        var content = this._lookup(name);
        if (typeof content === 'undefined') {
            throw new Error(util.format('%s not part of file bundle', name));
        }
        if (!Buffer.isBuffer(content)) {
            throw new Error(util.format('%s is a directory, not a file', name));
        }
        return content;
    };
    PrepackagedFilesystemProvider.prototype.readTextFileSync = function (name) {
        var buffer = this.readBinaryFileSync(name);
        return buffer.toString();
    };
    PrepackagedFilesystemProvider.prototype.readDirSync = function (name) {
        name = this._resolvePath(name);
        var content = this._lookup(name);
        if (typeof content === 'undefined') {
            throw new Error(util.format('%s not part of file bundle', name));
        }
        if (typeof content === 'string' || Buffer.isBuffer(content)) {
            throw new Error(util.format('%s is a file, not a directory', name));
        }
        return Object.keys(content);
    };
    PrepackagedFilesystemProvider.prototype.getTypeSync = function (name) {
        name = this._resolvePath(name);
        var content = this._lookup(name);
        if (typeof content === 'undefined') {
            throw new Error(util.format('%s not part of file bundle', name));
        }
        if (Buffer.isBuffer(content)) {
            return 1;
        }
        else {
            return 0;
        }
    };
    PrepackagedFilesystemProvider.prototype._lookup = function (path) {
        var atoms = path.split('/'), natoms = atoms.length;
        var i, scope = this._blob;
        var name = atoms[natoms - 1];
        for (i = 0; i < natoms - 1; i++) {
            if (atoms[i] === '') {
                continue;
            }
            else if (scope.hasOwnProperty(atoms[i])) {
                scope = scope[atoms[i]];
            }
            else {
                return undefined;
            }
        }
        if (name && typeof scope[name] === 'string') {
            scope[name] = Buffer.from(scope[name], 'base64');
        }
        return name ? scope[name] : scope;
    };
    return PrepackagedFilesystemProvider;
}(AbstractFileSystemProvider_1.default));
exports.default = PrepackagedFilesystemProvider;

}).call(this,require("buffer").Buffer)

},{"./AbstractFileSystemProvider":37,"buffer":6,"tslib":25,"util":27}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Instruction_1 = require("./cpu/Instruction");
var Disassembler_1 = require("./cpu/Disassembler");
var hex = require("../tools/hex");
var binary = require("../tools/binary");
var util = require("util");
var Debugger = (function () {
    function Debugger(_traceSize, _stepMaxCycles) {
        if (_traceSize === void 0) { _traceSize = 2048; }
        if (_stepMaxCycles === void 0) { _stepMaxCycles = 10000000; }
        this._traceSize = _traceSize;
        this._stepMaxCycles = _stepMaxCycles;
        this._breakpoints = new Uint8Array(0x10000);
        this._breakpointDescriptions = new Array(0x10000);
        this._breakpointsEnabled = false;
        this._traceEnabled = false;
        this._trace = new Uint16Array(this._traceSize);
        this._traceLength = 0;
        this._traceIndex = 0;
    }
    Debugger.prototype.attach = function (board) {
        this._board = board;
        this._bus = this._board.getBus();
        this._cpu = this._board.getCpu();
        this._disassembler = new Disassembler_1.default(this._bus);
        this._board.trap.addHandler(this._trapHandler, this);
        this._traceLength = 0;
        this._traceIndex = 0;
        return this;
    };
    Debugger.prototype.detach = function () {
        if (!this._board) {
            return this;
        }
        this._board.cpuClock.removeHandler(this._cpuClockHandler);
        this._board.trap.removeHandler(this._trapHandler);
        return this;
    };
    Debugger.prototype.clearAllBreakpoints = function () {
        for (var i = 0; i < 0x10000; i++) {
            this._breakpoints[i] = 0;
        }
        return this;
    };
    Debugger.prototype.setBreakpoint = function (address, description) {
        if (description === void 0) { description = '-'; }
        address %= 0x10000;
        this._breakpoints[address] = 1;
        this._breakpointDescriptions[address] = description;
        return this;
    };
    Debugger.prototype.clearBreakpoint = function (address) {
        this._breakpoints[address % 0x10000] = 0;
        return this;
    };
    Debugger.prototype.dumpBreakpoints = function () {
        var result = '';
        for (var address = 0; address < 0x10000; address++) {
            if (this._breakpoints[address]) {
                result += hex.encode(address, 4) + ': ' + this._breakpointDescriptions[address] + '\n';
            }
        }
        return result.replace(/\n$/, '');
    };
    Debugger.prototype.loadBlock = function (block, at, from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = block.length - 1; }
        for (var i = 0; i <= to - from; i++) {
            this._poke(at + i, block[i]);
        }
    };
    Debugger.prototype.disassembleAt = function (start, length) {
        var i = 0, result = '', instruction, address;
        while (i < length) {
            address = (start + i) % 0x10000;
            instruction = Instruction_1.default.opcodes[this._peek(address)];
            result +=
                (this._breakpoints[address] ? '(B) ' : '    ') +
                    hex.encode(address, 4) +
                    ':   ' +
                    this._disassembler.disassembleAt(address) +
                    '\n';
            i += instruction.getSize();
        }
        return result.replace(/\n$/, '');
    };
    Debugger.prototype.disassemble = function (length) {
        return this.disassembleAt(this._cpu.state.p, length);
    };
    Debugger.prototype.trace = function (length) {
        if (length === void 0) { length = this._traceSize; }
        var result = '';
        length = Math.min(length, this._traceLength);
        for (var i = 0; i < length; i++) {
            result +=
                this.disassembleAt(this._trace[(this._traceSize + this._traceIndex - length + i) % this._traceSize], 1) + '\n';
        }
        return result + this.disassemble(1);
    };
    Debugger.prototype.dumpAt = function (start, length) {
        var result = '', address;
        for (var i = 0; i < length; i++) {
            address = (start + i) % 0x10000;
            result += hex.encode(address, 4) + ':   ' + hex.encode(this._peek(address), 2) + '\n';
        }
        return result.replace(/\n$/, '');
    };
    Debugger.prototype.dumpState = function () {
        var state = this._cpu.state;
        switch (this._cpu.executionState) {
            case 0:
        }
        var result = '' +
            'A = ' +
            hex.encode(state.a, 2) +
            '   ' +
            'X = ' +
            hex.encode(state.x, 2) +
            '   ' +
            'Y = ' +
            hex.encode(state.y, 2) +
            '   ' +
            'S = ' +
            hex.encode(state.s, 2) +
            '   ' +
            'P = ' +
            hex.encode(state.p, 4) +
            '\n' +
            'flags = ' +
            binary.encode(state.flags, 8) +
            '\n' +
            'state: ' +
            this._humanReadableExecutionState();
        var boardState = this._board.getBoardStateDebug();
        if (boardState) {
            result += '\n' + '\n' + boardState;
        }
        return result;
    };
    Debugger.prototype.dumpStack = function () {
        return this.dumpAt(0x0100 + this._cpu.state.s, 0x100 - this._cpu.state.s);
    };
    Debugger.prototype.step = function (instructions) {
        var instruction = 0, cycles = 0, lastExecutionState = this._cpu.executionState, cpuCycles = 0;
        var timer = this._board.getTimer();
        var cpuClockHandler = function (c) { return (cpuCycles += c); };
        this._board.cpuClock.addHandler(cpuClockHandler);
        this._lastTrap = undefined;
        this._board.resume();
        while (instruction < instructions && !this._lastTrap && cycles < this._stepMaxCycles) {
            timer.tick(1);
            cycles++;
            if (lastExecutionState !== this._cpu.executionState) {
                lastExecutionState = this._cpu.executionState;
                if (lastExecutionState === 1) {
                    instruction++;
                }
            }
        }
        this._board.cpuClock.removeHandler(cpuClockHandler);
        this._board.suspend();
        return { cycles: cycles, cpuCycles: cpuCycles };
    };
    Debugger.prototype.stepClock = function (cycles) {
        this._lastTrap = undefined;
        this._board.resume();
        var usedCycles = this._board.getTimer().tick(cycles);
        this._board.suspend();
        return usedCycles;
    };
    Debugger.prototype.setBreakpointsEnabled = function (breakpointsEnabled) {
        this._breakpointsEnabled = breakpointsEnabled;
        this._attachToCpuIfNecessary();
        return this;
    };
    Debugger.prototype.setTraceEnabled = function (traceEnabled) {
        this._traceEnabled = traceEnabled;
        this._attachToCpuIfNecessary();
        return this;
    };
    Debugger.prototype.getBoard = function () {
        return this._board;
    };
    Debugger.prototype.getLastTrap = function () {
        return this._lastTrap;
    };
    Debugger.prototype._humanReadableExecutionState = function () {
        if (this._cpu.isHalt()) {
            return 'halted';
        }
        switch (this._cpu.executionState) {
            case 0:
                return 'boot';
            case 1:
                return 'fetch';
            case 2:
                return 'execute';
        }
    };
    Debugger.prototype._attachToCpuIfNecessary = function () {
        if (this._traceEnabled || this._breakpointsEnabled) {
            this._lastInstructionPointer = this._cpu.getLastInstructionPointer() || 0;
            this._board.cpuClock.addHandler(this._cpuClockHandler, this);
            this._board.setClockMode(0);
        }
        else {
            this._board.cpuClock.removeHandler(this._cpuClockHandler, this);
            this._board.setClockMode(1);
        }
    };
    Debugger.prototype._cpuClockHandler = function (clocks, ctx) {
        var lastInstructionPointer = ctx._cpu.getLastInstructionPointer();
        if (ctx._cpu.executionState !== 1 ||
            lastInstructionPointer === ctx._lastInstructionPointer) {
            return;
        }
        ctx._lastInstructionPointer = lastInstructionPointer;
        if (ctx._traceEnabled) {
            ctx._trace[ctx._traceIndex] = lastInstructionPointer;
            ctx._traceIndex = (ctx._traceIndex + 1) % ctx._traceSize;
            if (ctx._traceLength < ctx._traceSize) {
                ctx._traceLength++;
            }
        }
        if (ctx._breakpointsEnabled && ctx._breakpoints[ctx._cpu.state.p]) {
            ctx._board.triggerTrap(2, util.format('breakpoint "%s" at %s', ctx._breakpointDescriptions[ctx._cpu.state.p] || '', hex.encode(ctx._cpu.state.p)));
        }
    };
    Debugger.prototype._trapHandler = function (trap, dbg) {
        dbg._lastTrap = trap;
    };
    Debugger.prototype._peek = function (address) {
        return this._bus.peek(address % 0x10000);
    };
    Debugger.prototype._poke = function (address, value) {
        this._bus.poke(address % 0x10000, value & 0xff);
    };
    return Debugger;
}());
exports.default = Debugger;

},{"../tools/binary":132,"../tools/hex":134,"./cpu/Disassembler":43,"./cpu/Instruction":45,"util":27}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BoardInterface;
(function (BoardInterface) {
    var TrapPayload = (function () {
        function TrapPayload(reason, board, message) {
            this.reason = reason;
            this.board = board;
            this.message = message;
        }
        return TrapPayload;
    }());
    BoardInterface.TrapPayload = TrapPayload;
})(BoardInterface || (BoardInterface = {}));
exports.default = BoardInterface;

},{}],41:[function(require,module,exports){
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

},{"./CpuInterface":42,"./Instruction":45,"./ops":47}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Instruction_1 = require("./Instruction");
var hex = require("../../tools/hex");
var Disassembler = (function () {
    function Disassembler(_bus) {
        this._bus = _bus;
    }
    Disassembler.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    Disassembler.prototype.getBus = function () {
        return this._bus;
    };
    Disassembler.prototype.disassembleAt = function (address) {
        var _this = this;
        var instruction = Instruction_1.default.opcodes[this._peek(address)], operation = Instruction_1.default.OperationMap[instruction.operation].toUpperCase();
        var read8 = function (a) {
            if (a === void 0) { a = address + 1; }
            return hex.encode(_this._peek(a), 2);
        };
        var read16 = function (a) {
            if (a === void 0) { a = address + 1; }
            return hex.encode(_this._peek(a) + (_this._peek(a + 1) << 8), 4);
        };
        var decodeSint8 = function (value) { return (value & 0x80 ? -(~(value - 1) & 0xff) : value); };
        switch (instruction.effectiveAddressingMode) {
            case 0:
                return operation;
            case 1:
                return operation + ' #' + read8();
            case 2:
                return operation + ' ' + read8();
            case 3:
                return operation + ' ' + read16();
            case 4:
                return operation + ' (' + read16() + ')';
            case 5:
                var distance = decodeSint8(this._peek(address + 1));
                return (operation +
                    ' ' +
                    hex.encode(distance, 2) +
                    ' ; -> ' +
                    hex.encode((0x10002 + address + distance) % 0x10000, 4));
            case 6:
                return operation + ' ' + read8() + ',X';
            case 7:
                return operation + ' ' + read16() + ',X';
            case 8:
                return operation + ' (' + read8() + ',X)';
            case 9:
                return operation + ' ' + read8() + ',Y';
            case 10:
                return operation + ' ' + read16() + ',Y';
            case 11:
                return operation + ' (' + read8() + '),Y';
            default:
                return 'INVALID';
        }
    };
    Disassembler.prototype._peek = function (address) {
        return this._bus.peek(address % 0x10000);
    };
    return Disassembler;
}());
exports.default = Disassembler;

},{"../../tools/hex":134,"./Instruction":45}],44:[function(require,module,exports){
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

},{"./BatchedAccessCpu":41,"./StateMachineCpu":46}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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

},{"./CpuInterface":42,"./statemachine/Compiler":48,"./statemachine/vector":72}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
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

},{"../Instruction":45,"./addressing":54,"./addressing/indirect":56,"./instruction":61,"./ops":70,"./vector":72}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],51:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],52:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],53:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],54:[function(require,module,exports){
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

},{"./absolute":50,"./absoluteIndexed":51,"./dereference":52,"./immediate":53,"./indexedIndirectX":55,"./indirectIndexedY":57,"./zeroPage":58,"./zeroPageIndexed":59}],55:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],56:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],57:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],58:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],59:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],60:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],61:[function(require,module,exports){
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

},{"./branch":60,"./jsr":62,"./nullaryOneCycle":63,"./pull":64,"./push":65,"./readModifyWrite":66,"./rti":67,"./rts":68,"./write":69}],62:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],63:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],64:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],65:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],66:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],67:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],68:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],69:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],70:[function(require,module,exports){
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

},{}],71:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],72:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var boot_1 = require("./boot");
exports.boot = boot_1.boot;
var interrupt_1 = require("./interrupt");
exports.brk = interrupt_1.brk;
exports.nmi = interrupt_1.nmi;
exports.irq = interrupt_1.irq;

},{"./boot":71,"./interrupt":73}],73:[function(require,module,exports){
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

},{"../../../../tools/decorators":133,"../ResultImpl":49,"tslib":25}],74:[function(require,module,exports){
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

},{"./Switch":76}],75:[function(require,module,exports){
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

},{"./Switch":76,"microevent.ts":10}],76:[function(require,module,exports){
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

},{"microevent.ts":10}],77:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var BoardInterface_1 = require("../board/BoardInterface");
var Bus_1 = require("./Bus");
var Pia_1 = require("./Pia");
var Tia_1 = require("./tia/Tia");
var Config_1 = require("./Config");
var ControlPanel_1 = require("./ControlPanel");
var DigitalJoystick_1 = require("../io/DigitalJoystick");
var Paddle_1 = require("../io/Paddle");
var factory_1 = require("../../tools/rng/factory");
var Factory_1 = require("../cpu/Factory");
var Board = (function () {
    function Board(_config, cartridge, cpuFactory) {
        var _this = this;
        this._config = _config;
        this.trap = new microevent_ts_1.Event();
        this.clock = new microevent_ts_1.Event();
        this.cpuClock = new microevent_ts_1.Event();
        this._clockMode = 1;
        this._cpuCycles = 0;
        this._trap = false;
        this._audioEnabled = true;
        this._suspended = true;
        this._subClock = 0;
        this._clockHz = 0;
        this._sliceSize = 0;
        this._timer = {
            tick: function (clocks) { return _this._tick(clocks); },
            start: function (scheduler) { return _this._start(scheduler); },
            stop: function () { return _this._stop(); },
            isRunning: function () { return !!_this._runTask; }
        };
        this._rng = factory_1.createRng(_config.randomSeed < 0 ? Math.random() : _config.randomSeed);
        cartridge.randomize(this._rng);
        var bus = new Bus_1.default();
        if (typeof cpuFactory === 'undefined') {
            cpuFactory = function (_bus, rng) { return new Factory_1.default(_config.cpuType).create(_bus, rng); };
        }
        var controlPanel = new ControlPanel_1.default(), joystick0 = new DigitalJoystick_1.default(), joystick1 = new DigitalJoystick_1.default(), paddles = new Array(4);
        for (var i = 0; i < 4; i++) {
            paddles[i] = new Paddle_1.default();
        }
        var cpu = cpuFactory(bus, this._rng);
        var pia = new Pia_1.default(controlPanel, joystick0, joystick1, this._rng);
        var tia = new Tia_1.default(_config, joystick0, joystick1, paddles);
        cpu.setInvalidInstructionCallback(function () { return _this._onInvalidInstruction(); });
        tia.setCpu(cpu)
            .setBus(bus)
            .setCpuTimeProvider(function () { return _this.getCpuTime(); });
        cartridge
            .setCpu(cpu)
            .setBus(bus)
            .setCpuTimeProvider(function () { return _this.getCpuTime(); })
            .setRng(this._rng);
        pia.setBus(bus);
        bus.setTia(tia)
            .setPia(pia)
            .setCartridge(cartridge);
        this._bus = bus;
        this._cpu = cpu;
        this._tia = tia;
        this._pia = pia;
        this._cartridge = cartridge;
        this._controlPanel = controlPanel;
        this._joystick0 = joystick0;
        this._joystick1 = joystick1;
        this._paddles = paddles;
        this._bus.event.trap.addHandler(function (payload) {
            return _this.triggerTrap(1, payload.message);
        });
        this._clockHz = Config_1.default.getClockHz(_config);
        this._sliceSize = 228 * (_config.tvMode === 0 ? 262 : 312);
        this.reset();
    }
    Board.prototype.getCpu = function () {
        return this._cpu;
    };
    Board.prototype.getBus = function () {
        return this._bus;
    };
    Board.prototype.getVideoOutput = function () {
        return this._tia;
    };
    Board.prototype.getWaveformChannels = function () {
        var _this = this;
        return [0, 1].map(function (i) { return _this._tia.getWaveformChannel(i); });
    };
    Board.prototype.getPCMChannel = function () {
        return this._tia.getPCMChannel();
    };
    Board.prototype.getTimer = function () {
        return this._timer;
    };
    Board.prototype.getConfig = function () {
        return this._config;
    };
    Board.prototype.reset = function () {
        this._cpu.reset();
        this._tia.reset();
        this._pia.reset();
        this._cartridge.reset();
        this._controlPanel.getResetButton().toggle(false);
        this._controlPanel.getSelectSwitch().toggle(false);
        this._controlPanel.getColorSwitch().toggle(false);
        this._controlPanel.getDifficultySwitchP0().toggle(true);
        this._controlPanel.getDifficultySwitchP1().toggle(true);
        this._subClock = 0;
        this._cpuCycles = 0;
        return this;
    };
    Board.prototype.boot = function () {
        var cycles = 0, cpuCycles = 0;
        this.reset();
        if (this._cpu.executionState !== 0) {
            throw new Error('Already booted!');
        }
        while (this._cpu.executionState !== 1) {
            this._cycle();
            cycles++;
            if (this._subClock === 0) {
                cpuCycles++;
            }
        }
        this.cpuClock.dispatch(cpuCycles);
        this.clock.dispatch(cycles);
        return this;
    };
    Board.prototype.suspend = function () {
        this._suspended = true;
        this._updateAudioState();
    };
    Board.prototype.resume = function () {
        this._suspended = false;
        this._updateAudioState();
    };
    Board.prototype.setAudioEnabled = function (state) {
        this._audioEnabled = state;
        this._updateAudioState();
    };
    Board.prototype.triggerTrap = function (reason, message) {
        this._stop();
        this._trap = true;
        if (this.trap.hasHandlers) {
            this.trap.dispatch(new BoardInterface_1.default.TrapPayload(reason, this, message));
        }
        else {
            throw new Error(message);
        }
        return this;
    };
    Board.prototype.getControlPanel = function () {
        return this._controlPanel;
    };
    Board.prototype.getJoystick0 = function () {
        return this._joystick0;
    };
    Board.prototype.getJoystick1 = function () {
        return this._joystick1;
    };
    Board.prototype.getBoardStateDebug = function () {
        var sep = '============';
        return ('TIA:\n' +
            sep +
            '\n' +
            this._tia.getDebugState() +
            '\n' +
            "\n" +
            "PIA:\n" +
            (sep + "\n") +
            (this._pia.getDebugState() + "\n"));
    };
    Board.prototype.setClockMode = function (clockMode) {
        this._clockMode = clockMode;
        return this;
    };
    Board.prototype.getClockMode = function () {
        return this._clockMode;
    };
    Board.prototype.getPaddle = function (idx) {
        return this._paddles[idx];
    };
    Board.prototype.getCpuTime = function () {
        return (this._cpuCycles / Config_1.default.getClockHz(this._config)) * 3;
    };
    Board._executeSlice = function (board, _timeSlice) {
        var slice = _timeSlice ? Math.round((_timeSlice * board._clockHz) / 1000) : board._sliceSize;
        return (board._tick(slice) / board._clockHz) * 1000;
    };
    Board.prototype._updateAudioState = function () {
        this._tia.setAudioEnabled(this._audioEnabled && !this._suspended);
    };
    Board.prototype._cycle = function () {
        this._tia.cycle();
        if (this._subClock++ >= 2) {
            this._pia.cycle();
            this._cpu.cycle();
            this._subClock = 0;
        }
    };
    Board.prototype._tick = function (requestedCycles) {
        var i = 0, cycles = 0, cpuCycles = 0, lastExecutionState = this._cpu.executionState;
        this._trap = false;
        while (i++ < requestedCycles && !this._trap) {
            this._cycle();
            cycles++;
            if (this._subClock === 0) {
                cpuCycles++;
                this._cpuCycles++;
            }
            if (lastExecutionState !== this._cpu.executionState) {
                lastExecutionState = this._cpu.executionState;
                if (this._cpu.executionState === 1) {
                    this._cartridge.notifyCpuCycleComplete();
                    if (this._clockMode === 0 &&
                        cpuCycles > 0 &&
                        this.cpuClock.hasHandlers) {
                        this.cpuClock.dispatch(cpuCycles);
                        cpuCycles = 0;
                    }
                }
            }
        }
        if (cpuCycles > 0 && this.cpuClock.hasHandlers) {
            this.cpuClock.dispatch(cpuCycles);
        }
        if (cycles > 0 && this.clock.hasHandlers) {
            this.clock.dispatch(cycles);
        }
        return cycles;
    };
    Board.prototype._start = function (scheduler) {
        if (this._runTask) {
            return;
        }
        this._runTask = scheduler.start(Board._executeSlice, this, 1000 / (this._config.tvMode === 0 ? 60 : 50));
    };
    Board.prototype._stop = function () {
        if (!this._runTask) {
            return;
        }
        this._runTask.stop();
        this._runTask = undefined;
    };
    Board.prototype._onInvalidInstruction = function () {
        this.triggerTrap(0, 'invalid instruction');
    };
    return Board;
}());
exports.default = Board;

},{"../../tools/rng/factory":140,"../board/BoardInterface":40,"../cpu/Factory":44,"../io/DigitalJoystick":74,"../io/Paddle":75,"./Bus":78,"./Config":79,"./ControlPanel":80,"./Pia":81,"./tia/Tia":121,"microevent.ts":10}],78:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var Bus = (function () {
    function Bus() {
        this.event = {
            trap: new microevent_ts_1.Event(),
            read: new microevent_ts_1.Event(),
            write: new microevent_ts_1.Event()
        };
        this._tia = null;
        this._pia = null;
        this._cartridge = null;
        this._lastDataBusValue = 0;
        this._lastAddressBusValue = 0;
    }
    Bus.prototype.setTia = function (tia) {
        var _this = this;
        tia.trap.addHandler(function (payload) {
            return _this.triggerTrap(0, 'TIA: ' + (payload.message || ''));
        });
        this._tia = tia;
        return this;
    };
    Bus.prototype.setPia = function (pia) {
        var _this = this;
        pia.trap.addHandler(function (payload) {
            return _this.triggerTrap(1, 'PIA: ' + (payload.message || ''));
        });
        this._pia = pia;
        return this;
    };
    Bus.prototype.setCartridge = function (cartridge) {
        var _this = this;
        cartridge.trap.addHandler(function (payload) {
            return _this.triggerTrap(2, 'CARTRIDGE: ' + (payload.message || ''));
        });
        this._cartridge = cartridge;
        return this;
    };
    Bus.prototype.readWord = function (address) {
        return this.read(address) | (this.read((address + 1) & 0xffff) << 8);
    };
    Bus.prototype.read = function (address) {
        this._lastAddressBusValue = address;
        address &= 0x1fff;
        if (address & 0x1000) {
            this._lastDataBusValue = this._cartridge.read(address);
            this.event.read.dispatch(2);
        }
        else if (address & 0x80) {
            this._lastDataBusValue = this._pia.read(address);
            this.event.read.dispatch(1);
        }
        else {
            this._lastDataBusValue = this._tia.read(address);
            this.event.read.dispatch(0);
        }
        return this._lastDataBusValue;
    };
    Bus.prototype.write = function (address, value) {
        this._lastDataBusValue = value;
        this._lastAddressBusValue = address;
        address &= 0x1fff;
        if (address & 0x1000) {
            this._cartridge.write(address, value);
            this.event.write.dispatch(2);
        }
        else if (address & 0x80) {
            this._pia.write(address, value);
            this.event.write.dispatch(1);
        }
        else {
            this._tia.write(address, value);
            this.event.write.dispatch(0);
        }
    };
    Bus.prototype.peek = function (address) {
        address &= 0x1fff;
        if (address & 0x1000) {
            return this._cartridge.peek(address);
        }
        else if (address & 0x80) {
            return this._pia.peek(address);
        }
        else {
            return this._tia.peek(address);
        }
    };
    Bus.prototype.poke = function (address, value) { };
    Bus.prototype.getLastDataBusValue = function () {
        return this._lastDataBusValue;
    };
    Bus.prototype.getLastAddresBusValue = function () {
        return this._lastAddressBusValue;
    };
    Bus.prototype.triggerTrap = function (reason, message) {
        if (this.event.trap.hasHandlers) {
            this.event.trap.dispatch(new Bus.TrapPayload(reason, this, message));
        }
        else {
            throw new Error(message);
        }
    };
    return Bus;
}());
exports.default = Bus;
(function (Bus) {
    var TrapPayload = (function () {
        function TrapPayload(reason, bus, message) {
            this.reason = reason;
            this.bus = bus;
            this.message = message;
        }
        return TrapPayload;
    }());
    Bus.TrapPayload = TrapPayload;
})(Bus || (Bus = {}));
exports.default = Bus;

},{"microevent.ts":10}],79:[function(require,module,exports){
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

},{"../cpu/Factory":44,"tslib":25}],80:[function(require,module,exports){
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

},{"../io/Switch":76}],81:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var Pia = (function () {
    function Pia(_controlPanel, _joystick0, _joystick1, _rng) {
        this._controlPanel = _controlPanel;
        this._joystick0 = _joystick0;
        this._joystick1 = _joystick1;
        this._rng = _rng;
        this.trap = new microevent_ts_1.Event();
        this.ram = new Uint8Array(128);
        this._bus = null;
        this._timerValue = 255;
        this._subTimer = 0;
        this._timerDivide = 1024;
        this._interruptFlag = 0;
        this._timerWrapped = false;
        this._flagSetDuringThisCycle = false;
        this.reset();
    }
    Pia.prototype.reset = function () {
        for (var i = 0; i < 128; i++) {
            this.ram[i] = this._rng ? this._rng.int(0xff) : 0;
        }
        this._interruptFlag = 0;
        this._flagSetDuringThisCycle = false;
        this._timerDivide = 1024;
        this._subTimer = 0;
        this._rng.int(0xff);
        this._timerValue = 0;
        this._timerWrapped = false;
    };
    Pia.prototype.read = function (address) {
        if (address & 0x0200) {
            if (address & 0x0004) {
                return this._readTimer(address);
            }
            else {
                return this._readIo(address);
            }
        }
        else {
            return this.ram[address & 0x7f];
        }
    };
    Pia.prototype.peek = function (address) {
        if (address & 0x0200) {
            if (address & 0x0004) {
                return this._peekTimer(address);
            }
            else {
                return this._readIo(address);
            }
        }
        else {
            return this.ram[address & 0x7f];
        }
    };
    Pia.prototype.write = function (address, value) {
        if (address & 0x0200) {
            if (address & 0x0004) {
                return this._writeTimer(address, value);
            }
            else {
                return this._writeIo(address, value);
            }
        }
        else {
            this.ram[address & 0x7f] = value;
        }
    };
    Pia.prototype.cycle = function () {
        this._cycleTimer();
    };
    Pia.prototype.getDebugState = function () {
        return "divider: " + this._timerDivide + " raw timer: INTIM: " + this._timerValue;
    };
    Pia.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    Pia.prototype._writeIo = function (address, value) { };
    Pia.prototype._writeTimer = function (address, value) {
        this._interruptFlag = 0;
        switch (address & 0x0297) {
            case 663:
                return this._setTimer(1024, value);
            case 662:
                return this._setTimer(64, value);
            case 661:
                return this._setTimer(8, value);
            case 660:
                return this._setTimer(1, value);
        }
    };
    Pia.prototype._setTimer = function (divide, value) {
        this._timerDivide = divide;
        this._timerValue = value;
        this._subTimer = 0;
        this._timerWrapped = false;
    };
    Pia.prototype._readIo = function (address) {
        switch (address & 0x0283) {
            case 640:
                return ((this._joystick1.getUp().read() ? 0 : 0x01) |
                    (this._joystick1.getDown().read() ? 0 : 0x02) |
                    (this._joystick1.getLeft().read() ? 0 : 0x04) |
                    (this._joystick1.getRight().read() ? 0 : 0x08) |
                    (this._joystick0.getUp().read() ? 0 : 0x10) |
                    (this._joystick0.getDown().read() ? 0 : 0x20) |
                    (this._joystick0.getLeft().read() ? 0 : 0x40) |
                    (this._joystick0.getRight().read() ? 0 : 0x80));
            case 642:
                return ((this._controlPanel.getResetButton().read() ? 0 : 0x01) |
                    (this._controlPanel.getSelectSwitch().read() ? 0 : 0x02) |
                    (this._controlPanel.getColorSwitch().read() ? 0 : 0x08) |
                    (this._controlPanel.getDifficultySwitchP0().read() ? 0 : 0x40) |
                    (this._controlPanel.getDifficultySwitchP1().read() ? 0 : 0x80));
        }
        return this._bus.getLastDataBusValue();
    };
    Pia.prototype._readTimer = function (address) {
        if (address & 0x01) {
            var flag = this._interruptFlag;
            return flag & 0x80;
        }
        else {
            if (!this._flagSetDuringThisCycle) {
                this._interruptFlag = 0;
                this._timerWrapped = false;
            }
            return this._timerValue;
        }
    };
    Pia.prototype._peekTimer = function (address) {
        return address & 0x01 ? this._interruptFlag & 0x80 : this._timerValue;
    };
    Pia.prototype._cycleTimer = function () {
        this._flagSetDuringThisCycle = false;
        if (this._timerWrapped) {
            this._timerValue = (this._timerValue + 0xff) & 0xff;
        }
        else if (this._subTimer === 0 && --this._timerValue < 0) {
            this._timerValue = 0xff;
            this._flagSetDuringThisCycle = true;
            this._interruptFlag = 0xff;
            this._timerWrapped = true;
        }
        if (++this._subTimer === this._timerDivide) {
            this._subTimer = 0;
        }
    };
    return Pia;
}());
exports.default = Pia;
(function (Pia) {
    var TrapPayload = (function () {
        function TrapPayload(reason, pia, message) {
            this.reason = reason;
            this.pia = pia;
            this.message = message;
        }
        return TrapPayload;
    }());
    Pia.TrapPayload = TrapPayload;
})(Pia || (Pia = {}));
exports.default = Pia;

},{"microevent.ts":10}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var microevent_ts_1 = require("microevent.ts");
var CartridgeInterface_1 = require("./CartridgeInterface");
var CartridgeInfo_1 = require("./CartridgeInfo");
var AbstractCartridge = (function () {
    function AbstractCartridge() {
        this.trap = new microevent_ts_1.Event();
    }
    AbstractCartridge.prototype.init = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () { return tslib_1.__generator(this, function (_a) {
            return [2];
        }); });
    };
    AbstractCartridge.prototype.reset = function () { };
    AbstractCartridge.prototype.read = function (address) {
        return 0;
    };
    AbstractCartridge.prototype.peek = function (address) {
        return this.read(address);
    };
    AbstractCartridge.prototype.write = function (address, value) { };
    AbstractCartridge.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.unknown;
    };
    AbstractCartridge.prototype.setCpu = function (cpu) {
        return this;
    };
    AbstractCartridge.prototype.setBus = function (bus) {
        return this;
    };
    AbstractCartridge.prototype.setRng = function (rng) {
        return this;
    };
    AbstractCartridge.prototype.setCpuTimeProvider = function (provider) {
        return this;
    };
    AbstractCartridge.prototype.notifyCpuCycleComplete = function () { };
    AbstractCartridge.prototype.randomize = function (rng) { };
    AbstractCartridge.prototype.triggerTrap = function (reason, message) {
        if (this.trap.hasHandlers) {
            this.trap.dispatch(new CartridgeInterface_1.default.TrapPayload(reason, this, message));
        }
        else {
            throw new Error(message);
        }
    };
    return AbstractCartridge;
}());
exports.default = AbstractCartridge;

},{"./CartridgeInfo":103,"./CartridgeInterface":104,"microevent.ts":10,"tslib":25}],83:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var Cartridge8040 = (function (_super) {
    tslib_1.__extends(Cartridge8040, _super);
    function Cartridge8040(buffer) {
        var _this = _super.call(this) || this;
        _this._bank = null;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        _this._bus = null;
        if (buffer.length !== 0x2000) {
            throw new Error("buffer is not an 8k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
        }
        _this.reset();
        return _this;
    }
    Cartridge8040.matchesBuffer = function (buffer) {
        var e_1, _a;
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0xad, 0x00, 0x08],
            [0xad, 0x40, 0x08],
            [0x2c, 0x00, 0x08],
            [0x0c, 0x00, 0x08, 0x4c],
            [0x0c, 0xff, 0x0f, 0x4c]
        ]);
        try {
            for (var signatureCounts_1 = tslib_1.__values(signatureCounts), signatureCounts_1_1 = signatureCounts_1.next(); !signatureCounts_1_1.done; signatureCounts_1_1 = signatureCounts_1.next()) {
                var count = signatureCounts_1_1.value;
                if (count >= 2) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (signatureCounts_1_1 && !signatureCounts_1_1.done && (_a = signatureCounts_1.return)) _a.call(signatureCounts_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    };
    Cartridge8040.prototype.reset = function () {
        this._bank = this._bank0;
    };
    Cartridge8040.prototype.read = function (address) {
        return this.peek(address);
    };
    Cartridge8040.prototype.peek = function (address) {
        address &= 0x0fff;
        return this._bank[address];
    };
    Cartridge8040.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_econobanking;
    };
    Cartridge8040.prototype.setBus = function (bus) {
        this._bus = bus;
        this._bus.event.read.addHandler(this._onBusAccess, this);
        this._bus.event.write.addHandler(this._onBusAccess, this);
        return this;
    };
    Cartridge8040.prototype._onBusAccess = function (accessType, self) {
        var address = self._bus.getLastAddresBusValue() & 0x1840;
        switch (address) {
            case 0x0800:
                self._bank = self._bank0;
                break;
            case 0x0840:
                self._bank = self._bank1;
                break;
        }
    };
    return Cartridge8040;
}(AbstractCartridge_1.default));
exports.default = Cartridge8040;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],84:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var Cartridge2k = (function (_super) {
    tslib_1.__extends(Cartridge2k, _super);
    function Cartridge2k(buffer) {
        var _this = _super.call(this) || this;
        _this._rom = new Uint8Array(0x0800);
        if (buffer.length > 0x0800) {
            throw new Error("buffer is not a 2k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < buffer.length && i < 0x0800; i++) {
            _this._rom[0x07ff - i] = buffer[buffer.length - 1 - i];
        }
        return _this;
    }
    Cartridge2k.prototype.read = function (address) {
        return this._rom[address & 0x07ff];
    };
    Cartridge2k.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.vanilla_2k;
    };
    return Cartridge2k;
}(AbstractCartridge_1.default));
exports.default = Cartridge2k;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],85:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var cartridgeUtil = require("./util");
var CartridgeInfo_1 = require("./CartridgeInfo");
var Cartridge3E = (function (_super) {
    tslib_1.__extends(Cartridge3E, _super);
    function Cartridge3E(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = null;
        _this._ramSelect = false;
        _this._ramBanks = new Array(0x0100);
        _this._bus = null;
        if ((buffer.length & 0x07ff) !== 0) {
            throw new Error("buffer length " + buffer.length + " is not a multiple of 2k");
        }
        var bankCount = buffer.length >>> 11;
        if (bankCount < 2) {
            throw new Error('image must have at least 2k');
        }
        _this._banks = new Array(bankCount);
        for (var i = 0; i < bankCount; i++) {
            _this._banks[i] = new Uint8Array(0x0800);
        }
        for (var i = 0; i <= 0xff; i++) {
            _this._ramBanks[i] = new Uint8Array(0x0400);
        }
        _this._ramBank = _this._ramBanks[0];
        _this._bank1 = _this._banks[bankCount - 1];
        _this._bank0 = _this._banks[0];
        for (var i = 0; i < 0x0800; i++) {
            for (var j = 0; j < bankCount; j++) {
                _this._banks[j][i] = buffer[0x0800 * j + i];
            }
        }
        return _this;
    }
    Cartridge3E.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [[0x85, 0x3e, 0xa9, 0x00]]);
        return signatureCounts[0] >= 1;
    };
    Cartridge3E.prototype.reset = function () {
        this._bank0 = this._banks[0];
    };
    Cartridge3E.prototype.randomize = function (rng) {
        for (var i = 0; i < this._ramBanks.length; i++) {
            for (var j = 0; j < 0x0400; j++) {
                this._ramBanks[i][j] = rng.int(0xff);
            }
        }
    };
    Cartridge3E.prototype.setBus = function (bus) {
        this._bus = bus;
        this._bus.event.read.addHandler(Cartridge3E._onBusAccess, this);
        this._bus.event.write.addHandler(Cartridge3E._onBusAccess, this);
        return this;
    };
    Cartridge3E.prototype.read = function (address) {
        address &= 0x0fff;
        if (this._ramSelect) {
            if (address < 0x0400) {
                return this._ramBank[address];
            }
            if (address < 0x0800) {
                return (this._ramBank[address & 0x03ff] = this._bus.getLastDataBusValue());
            }
            return this._bank1[address & 0x07ff];
        }
        return address < 0x0800 ? this._bank0[address] : this._bank1[address & 0x07ff];
    };
    Cartridge3E.prototype.peek = function (address) {
        address &= 0x0fff;
        if (this._ramSelect) {
            if (address < 0x0400) {
                return this._ramBank[address];
            }
            if (address < 0x0800) {
                return this._bus.getLastDataBusValue();
            }
            return this._bank1[address & 0x07ff];
        }
        return address < 0x0800 ? this._bank0[address] : this._bank1[address & 0x07ff];
    };
    Cartridge3E.prototype.write = function (address, value) {
        if (!this._ramSelect) {
            return;
        }
        address &= 0x0fff;
        if (address >= 0x0400 && address < 0x0800) {
            this._ramBank[address & 0x03ff] = value;
        }
    };
    Cartridge3E.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_3E;
    };
    Cartridge3E._onBusAccess = function (accessType, self) {
        switch (self._bus.getLastAddresBusValue()) {
            case 0x003f:
                self._ramSelect = false;
                self._bank0 = self._banks[self._bus.getLastDataBusValue() % self._banks.length];
                break;
            case 0x003e:
                self._ramSelect = true;
                self._ramBank = self._ramBanks[self._bus.getLastDataBusValue() % 32];
                break;
        }
    };
    return Cartridge3E;
}(AbstractCartridge_1.default));
exports.default = Cartridge3E;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],86:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var cartridgeUtil = require("./util");
var CartridgeInfo_1 = require("./CartridgeInfo");
var Cartridge3F = (function (_super) {
    tslib_1.__extends(Cartridge3F, _super);
    function Cartridge3F(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = new Array(4);
        _this._bus = null;
        if (buffer.length !== 0x2000) {
            throw new Error("buffer is not an 8k cartridge image: invalid length " + buffer.length);
        }
        for (var i = 0; i < 4; i++) {
            _this._banks[i] = new Uint8Array(0x0800);
        }
        _this._bank1 = _this._banks[3];
        _this._bank0 = _this._banks[0];
        for (var i = 0; i < 0x0800; i++) {
            for (var j = 0; j < 4; j++) {
                _this._banks[j][i] = buffer[0x0800 * j + i];
            }
        }
        return _this;
    }
    Cartridge3F.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [[0x85, 0x3f]]);
        return signatureCounts[0] >= 2;
    };
    Cartridge3F.prototype.reset = function () {
        this._bank0 = this._banks[0];
    };
    Cartridge3F.prototype.setBus = function (bus) {
        this._bus = bus;
        this._bus.event.read.addHandler(Cartridge3F._onBusAccess, this);
        this._bus.event.write.addHandler(Cartridge3F._onBusAccess, this);
        return this;
    };
    Cartridge3F.prototype.read = function (address) {
        address &= 0x0fff;
        return address < 0x0800 ? this._bank0[address] : this._bank1[address & 0x07ff];
    };
    Cartridge3F.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_3F;
    };
    Cartridge3F._onBusAccess = function (accessType, self) {
        if (self._bus.getLastAddresBusValue() === 0x003f) {
            self._bank0 = self._banks[self._bus.getLastDataBusValue() & 0x03];
        }
    };
    return Cartridge3F;
}(AbstractCartridge_1.default));
exports.default = Cartridge3F;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],87:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var Cartridge4k = (function (_super) {
    tslib_1.__extends(Cartridge4k, _super);
    function Cartridge4k(buffer) {
        var _this = _super.call(this) || this;
        _this._rom = new Uint8Array(0x1000);
        if (buffer.length !== 0x1000) {
            console.warn("buffer has invalid size for 4K image: " + buffer.length + " bytes");
        }
        var len = Math.min(0x1000, buffer.length);
        for (var i = 0; i < 0x1000 && i < buffer.length; i++) {
            _this._rom[0x0fff - i] = buffer[len - 1 - i];
        }
        return _this;
    }
    Cartridge4k.prototype.read = function (address) {
        return this._rom[address & 0x0fff];
    };
    Cartridge4k.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.vanilla_4k;
    };
    return Cartridge4k;
}(AbstractCartridge_1.default));
exports.default = Cartridge4k;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],88:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Soc_1 = require("./harmony/Soc");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var DSPointerBase = new Uint16Array([0x06e0, 0x00a0]);
var DSIncrementBase = new Uint16Array([0x0768, 0x0128]);
var WaveformBase = new Uint16Array([0x07f0, 0x01b0]);
var CartridgeCDF = (function (_super) {
    tslib_1.__extends(CartridgeCDF, _super);
    function CartridgeCDF(buffer) {
        var _this = _super.call(this) || this;
        _this._handleBxCDF0 = function (address) {
            var thumbulator = _this._soc.getThumbulator(), r2 = thumbulator.readRegister(2), r3 = thumbulator.readRegister(3);
            switch (address) {
                case 0x000006e2:
                    _this._musicStreams[r2 % 3].frequency = r3;
                    return 0;
                case 0x000006e6:
                    _this._musicStreams[r2 % 3].counter = 0;
                    return 0;
                case 0x000006ea:
                    thumbulator.writeRegister(2, _this._musicStreams[r2 % 3].counter);
                    return 0;
                case 0x000006ee:
                    _this._musicStreams[r2 % 3].waveformSize = r3;
                    return 0;
            }
            return 3;
        };
        _this._handleBxCDF1 = function (address) {
            var thumbulator = _this._soc.getThumbulator(), r2 = thumbulator.readRegister(2), r3 = thumbulator.readRegister(3);
            switch (address) {
                case 0x00000752:
                    _this._musicStreams[r2 % 3].frequency = r3;
                    return 0;
                case 0x00000756:
                    _this._musicStreams[r2 % 3].counter = 0;
                    return 0;
                case 0x0000075a:
                    thumbulator.writeRegister(2, _this._musicStreams[r2 % 3].counter);
                    return 0;
                case 0x0000075e:
                    _this._musicStreams[r2 % 3].waveformSize = r3;
                    return 0;
            }
            return 3;
        };
        _this._version = 1;
        _this._banks = new Array(7);
        _this._currentBank = null;
        _this._rom = null;
        _this._ram = null;
        _this._displayRam = null;
        _this._musicStreams = new Array(3);
        _this._clockAccumulator = 0;
        _this._lastCpuTime = 0;
        _this._soc = null;
        _this._fastFetch = false;
        _this._digitalAudio = false;
        _this._fastJumpCountdown = 0;
        _this._fastFetchPending = false;
        _this._jmpOperandAddress = 0;
        _this._ldaOperandAddress = 0;
        _this._bus = null;
        _this._cpuTimeProvider = null;
        _this._version = CartridgeCDF.getVersion(buffer);
        if (buffer.length !== 0x8000) {
            throw new Error("not a CDF image: invalid lenght " + buffer.length);
        }
        if (_this._version < 0) {
            throw new Error('not a CDF image: missing signature');
        }
        _this._soc = new Soc_1.default(_this._version > 0 ? _this._handleBxCDF1 : _this._handleBxCDF0);
        _this._soc.trap.addHandler(function (message) { return _this.triggerTrap(2, message); });
        _this._rom = _this._soc.getRom();
        for (var i = 0; i < 0x8000; i++) {
            _this._rom[i] = buffer[i];
        }
        for (var i = 0; i < 7; i++) {
            _this._banks[i] = new Uint8Array(_this._rom.buffer, 0x1000 * (i + 1), 0x1000);
        }
        _this._ram = _this._soc.getRam();
        _this._displayRam = new Uint8Array(_this._soc.getRam().buffer, 0x0800, 0x1000);
        for (var i = 0; i < 3; i++) {
            _this._musicStreams[i] = new MusicStream();
        }
        _this.reset();
        return _this;
    }
    CartridgeCDF.getVersion = function (buffer) {
        var sig = 'CDF'.split('').map(function (x) { return x.charCodeAt(0); }), startAddress = cartridgeUtil.searchForSignature(buffer, tslib_1.__spread(sig, [-1], sig, [-1], sig));
        if (startAddress < 0) {
            return -1;
        }
        return buffer[startAddress + 3] > 0 ? 1 : 0;
    };
    CartridgeCDF.matchesBuffer = function (buffer) {
        return CartridgeCDF.getVersion(buffer) >= 0;
    };
    CartridgeCDF.prototype.init = function () {
        return this._soc.init();
    };
    CartridgeCDF.prototype.reset = function () {
        for (var i = 0; i < 0x0200; i++) {
            this._soc.setRam32(i << 2, this._soc.getRom32(i << 2));
        }
        this._fastFetch = false;
        this._digitalAudio = false;
        this._fastJumpCountdown = 0;
        this._fastFetchPending = false;
        this._jmpOperandAddress = 0;
        this._ldaOperandAddress = 0;
        this._currentBank = this._banks[6];
        for (var i = 0; i < 3; i++) {
            this._musicStreams[i].reset();
        }
        this._lastCpuTime = 0;
        this._clockAccumulator = 0;
    };
    CartridgeCDF.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_cdf;
    };
    CartridgeCDF.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeCDF.prototype.setCpuTimeProvider = function (provider) {
        this._cpuTimeProvider = provider;
        return this;
    };
    CartridgeCDF.prototype.read = function (address) {
        return this._access(address, this._bus.getLastDataBusValue());
    };
    CartridgeCDF.prototype.peek = function (address) {
        return this._currentBank[address & 0x0fff];
    };
    CartridgeCDF.prototype.write = function (address, value) {
        this._access(address, value);
    };
    CartridgeCDF.prototype._access = function (address, value) {
        address &= 0x0fff;
        var romValue = this._currentBank[address];
        if (this._fastJumpCountdown-- > 0 && address === this._jmpOperandAddress) {
            this._jmpOperandAddress++;
            return this._datastreamReadWithIncrement(33, 0x0100);
        }
        if (this._fastFetch &&
            romValue === 0x4c &&
            this._currentBank[(address + 1) & 0x0fff] === 0 &&
            this._currentBank[(address + 2) & 0x0fff] === 0) {
            this._fastJumpCountdown = 2;
            this._jmpOperandAddress = (address + 1) & 0x0fff;
            return romValue;
        }
        this._fastJumpCountdown = 0;
        if (this._fastFetch && this._fastFetchPending && this._ldaOperandAddress === address && romValue <= 0x22) {
            this._fastFetchPending = false;
            if (romValue === 34) {
                this._clockMusicStreams();
                if (this._digitalAudio) {
                    var counter = this._musicStreams[0].counter, sampleAddress = this._soc.getRam32(WaveformBase[this._version]) + (counter >>> 21);
                    var sample = 0;
                    if (sampleAddress < 0x8000) {
                        sample = this._rom[sampleAddress];
                    }
                    if (sampleAddress > 0x40000000 && sampleAddress < 0x40002000) {
                        sample = this._ram[sampleAddress - 0x40000000];
                    }
                    if ((counter & 0x100000) === 0) {
                        sample >>>= 4;
                    }
                    return sample & 0x0f;
                }
                else {
                    var acc = 0;
                    for (var i = 0; i < 3; i++) {
                        acc += this._displayRam[(this._getWaveform(i) +
                            (this._musicStreams[i].counter >>> this._musicStreams[i].waveformSize)) &
                            0x0fff];
                    }
                    return acc;
                }
            }
            return this._datastreamRead(romValue);
        }
        this._fastFetchPending = false;
        if (address >= 0x0ff0) {
            switch (address) {
                case 0x0ff0:
                    this._datastreamWriteWithIncrement(32, value, 0x0100);
                    break;
                case 0x0ff1: {
                    var pointer = this._getDatastreamPointer(32);
                    pointer <<= 8;
                    pointer &= 0xf0000000;
                    pointer |= value << 20;
                    this._setDatastreamPointer(32, pointer);
                    break;
                }
                case 0x0ff2:
                    this._fastFetch = (value & 0x0f) === 0;
                    this._digitalAudio = (value & 0xf0) === 0;
                    break;
                case 0x0ff3:
                    switch (value) {
                        case 254:
                        case 255:
                            this._soc.run(0x080b);
                            break;
                    }
                    break;
            }
            if (address > 0x0ff4 && address < 0x0ffc) {
                this._currentBank = this._banks[address - 0x0ff5];
            }
        }
        if (this._fastFetch && romValue === 0xa9) {
            this._fastFetchPending = true;
            this._ldaOperandAddress = (address + 1) & 0x0fff;
        }
        return romValue;
    };
    CartridgeCDF.prototype._clockMusicStreams = function () {
        var cpuTime = this._cpuTimeProvider();
        this._clockAccumulator += (cpuTime - this._lastCpuTime) * 20000;
        this._lastCpuTime = cpuTime;
        var clocks = Math.floor(this._clockAccumulator);
        this._clockAccumulator -= clocks;
        if (clocks === 0) {
            return;
        }
        for (var i = 0; i < 3; i++) {
            this._musicStreams[i].increment(clocks);
        }
    };
    CartridgeCDF.prototype._getDatastreamPointer = function (stream) {
        return this._soc.getRam32(DSPointerBase[this._version] + 4 * stream);
    };
    CartridgeCDF.prototype._setDatastreamPointer = function (stream, value) {
        this._soc.setRam32(DSPointerBase[this._version] + 4 * stream, value);
    };
    CartridgeCDF.prototype._getDatastreamIncrement = function (stream) {
        return this._soc.getRam32(DSIncrementBase[this._version] + 4 * stream);
    };
    CartridgeCDF.prototype._datastreamRead = function (stream) {
        var pointer = this._getDatastreamPointer(stream), value = this._displayRam[pointer >>> 20];
        this._setDatastreamPointer(stream, (pointer + (this._getDatastreamIncrement(stream) << 12)) | 0);
        return value;
    };
    CartridgeCDF.prototype._datastreamReadWithIncrement = function (stream, increment) {
        var pointer = this._getDatastreamPointer(stream), value = this._displayRam[pointer >>> 20];
        this._setDatastreamPointer(stream, (pointer + (increment << 12)) | 0);
        return value;
    };
    CartridgeCDF.prototype._datastreamWriteWithIncrement = function (stream, value, increment) {
        var pointer = this._getDatastreamPointer(stream);
        this._displayRam[pointer >>> 20] = value;
        this._setDatastreamPointer(stream, (pointer + (increment << 12)) | 0);
    };
    CartridgeCDF.prototype._getWaveform = function (index) {
        var value = this._soc.getRam32(WaveformBase[this._version] + 4 * index);
        return (value - 0x40000000 - 0x0800) & 0x0fff;
    };
    return CartridgeCDF;
}(AbstractCartridge_1.default));
exports.default = CartridgeCDF;
var MusicStream = (function () {
    function MusicStream() {
        this.counter = 0;
        this.frequency = 0;
        this.waveformSize = 27;
    }
    MusicStream.prototype.reset = function () {
        this.counter = this.frequency = 0;
        this.waveformSize = 27;
    };
    MusicStream.prototype.increment = function (clocks) {
        this.counter = (this.counter + clocks * this.frequency) | 0;
    };
    return MusicStream;
}());

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./harmony/Soc":107,"./util":110,"tslib":25}],89:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var mixerTable = new Uint8Array([0x0, 0x4, 0x5, 0x9, 0x6, 0xa, 0xb, 0xf]);
var CartridgeDPC = (function (_super) {
    tslib_1.__extends(CartridgeDPC, _super);
    function CartridgeDPC(buffer) {
        var _this = _super.call(this) || this;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        _this._fetcherData = new Uint8Array(0x0800);
        _this._fetchers = new Array(8);
        _this._rng = 1;
        _this._cpuTimeProvider = null;
        _this._lastCpuTime = 0;
        _this._clockAccumulator = 0;
        if (buffer.length < 0x2800) {
            throw new Error("buffer is not a DPC image: too small " + buffer.length);
        }
        for (var i = 0; i < 8; i++) {
            _this._fetchers[i] = new Fetcher();
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
        }
        for (var i = 0; i < 0x0800; i++) {
            _this._fetcherData[i] = buffer[0x2000 + i];
        }
        _this.reset();
        return _this;
    }
    CartridgeDPC.prototype.reset = function () {
        this._bank = this._bank1;
        this._rng = 1;
        this._fetchers.forEach(function (fetcher) { return fetcher.reset(); });
        this._lastCpuTime = 0;
        this._clockAccumulator = 0;
    };
    CartridgeDPC.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_DPC;
    };
    CartridgeDPC.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeDPC.prototype.setCpuTimeProvider = function (provider) {
        this._cpuTimeProvider = provider;
        return this;
    };
    CartridgeDPC.prototype.read = function (address) {
        return this._access(address, this._bus.getLastDataBusValue());
    };
    CartridgeDPC.prototype.peek = function (address) {
        return this._bank[address & 0x0fff];
    };
    CartridgeDPC.prototype.write = function (address, value) {
        this._access(address, value);
    };
    CartridgeDPC.prototype._access = function (address, value) {
        address &= 0x0fff;
        if (address > 0x7f) {
            switch (address) {
                case 0x0ff8:
                    this._bank = this._bank0;
                    break;
                case 0x0ff9:
                    this._bank = this._bank1;
                    break;
                default:
                    break;
            }
            return this._bank[address];
        }
        if (address < 0x08) {
            if (address & 0x04) {
                this._clockMusicFetchers();
                return mixerTable[(this._fetchers[5].mask & 0x4) | (this._fetchers[6].mask & 0x2) | (this._fetchers[7].mask & 0x1)];
            }
            else {
                return this._randomNext();
            }
        }
        if (address < 0x40) {
            var fetcher = this._fetchers[(address - 8) & 0x07], mask = fetcher.mask;
            var fetchedData = this._fetcherData[0x07ff - fetcher.pointer];
            fetcher.next();
            switch ((address - 8) >>> 3) {
                case 0:
                    return fetchedData;
                case 1:
                    return fetchedData & mask;
                case 2:
                    fetchedData &= mask;
                    return ((fetchedData << 4) | (fetchedData >>> 4)) & 0xff;
                case 3:
                    fetchedData &= mask;
                    return (((fetchedData & 0x01) << 7) |
                        ((fetchedData & 0x02) << 5) |
                        ((fetchedData & 0x04) << 3) |
                        ((fetchedData & 0x08) << 1) |
                        ((fetchedData & 0x10) >>> 1) |
                        ((fetchedData & 0x20) >>> 3) |
                        ((fetchedData & 0x40) >>> 5) |
                        ((fetchedData & 0x80) >>> 7));
                case 4:
                    return (fetchedData & mask) >>> 1;
                case 5:
                    return (fetchedData << 1) & mask;
                case 6:
                    return mask;
            }
        }
        if (address < 0x60) {
            var fetcher = this._fetchers[(address - 0x40) & 0x07];
            switch ((address - 0x40) >>> 3) {
                case 0:
                    this._clockMusicFetchers();
                    fetcher.setStart(value);
                    break;
                case 1:
                    this._clockMusicFetchers();
                    fetcher.setEnd(value);
                    break;
                case 2:
                    fetcher.setLow(value);
                    break;
                case 3:
                    fetcher.setHigh(value);
                    if (address > 0x5c) {
                        fetcher.setMusicMode(value);
                    }
                    break;
            }
            return this._bank[address];
        }
        if (address >= 0x70 && address < 0x78) {
            this._rng = 1;
            return this._bank[address];
        }
        return this._bank[address];
    };
    CartridgeDPC.prototype._randomNext = function () {
        var oldRng = this._rng;
        this._rng =
            ((this._rng << 1) |
                (~((this._rng >>> 7) ^ (this._rng >>> 5) ^ ((this._rng >>> 4) ^ (this._rng >>> 3))) & 0x01)) &
                0xff;
        return oldRng;
    };
    CartridgeDPC.prototype._clockMusicFetchers = function () {
        var cpuTime = this._cpuTimeProvider();
        this._clockAccumulator += (cpuTime - this._lastCpuTime) * 20000;
        this._lastCpuTime = cpuTime;
        var clocks = Math.floor(this._clockAccumulator);
        this._clockAccumulator -= clocks;
        if (clocks === 0) {
            return;
        }
        for (var i = 5; i < 8; i++) {
            this._fetchers[i].forwardClock(clocks);
        }
    };
    return CartridgeDPC;
}(AbstractCartridge_1.default));
exports.default = CartridgeDPC;
var Fetcher = (function () {
    function Fetcher() {
        this.pointer = 0;
        this.start = 0;
        this.end = 0;
        this.musicMode = false;
        this.mask = 0x00;
    }
    Fetcher.prototype.contructor = function () {
        this.reset();
    };
    Fetcher.prototype.reset = function () {
        this.pointer = this.start = this.end = this.mask = 0;
        this.musicMode = false;
    };
    Fetcher.prototype.next = function () {
        if (this.musicMode) {
            return;
        }
        this.pointer = (this.pointer + 0x07ff) & 0x07ff;
        this._updateMask();
    };
    Fetcher.prototype.setStart = function (start) {
        this.start = start;
        this.mask = 0x00;
        this._updateMask();
    };
    Fetcher.prototype.setEnd = function (end) {
        this.end = end;
        this._updateMask();
    };
    Fetcher.prototype.setLow = function (value) {
        this.pointer = (this.pointer & 0x0700) | value;
        this._updateMask();
    };
    Fetcher.prototype.setHigh = function (value) {
        this.pointer = (this.pointer & 0xff) | ((value & 0x07) << 8);
        this._updateMask();
    };
    Fetcher.prototype.setMusicMode = function (value) {
        this.musicMode = (value & 0x10) !== 0;
    };
    Fetcher.prototype.forwardClock = function (clocks) {
        if (!this.musicMode) {
            return;
        }
        var period = this.start + 1, newPointerLow = ((this.pointer & 0xff) + period - clocks % period) % period, distanceStart = (256 + this.start - newPointerLow) & 0xff, distanceEnd = (256 + this.end - newPointerLow) & 0xff;
        this.pointer = (this.pointer & 0x0700) | newPointerLow;
        this.mask = distanceStart > distanceEnd ? 0 : 0xff;
    };
    Fetcher.prototype._updateMask = function () {
        if ((this.pointer & 0xff) === this.start) {
            this.mask = 0xff;
        }
        if ((this.pointer & 0xff) === this.end) {
            this.mask = 0x00;
        }
    };
    return Fetcher;
}());

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],90:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Soc_1 = require("./harmony/Soc");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var CartridgeDPCPlus = (function (_super) {
    tslib_1.__extends(CartridgeDPCPlus, _super);
    function CartridgeDPCPlus(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = new Array(6);
        _this._fetchers = new Array(8);
        _this._fractionalFetchers = new Array(8);
        _this._musicFetchers = new Array(3);
        _this._parameters = new Uint8Array(8);
        _this._parameterIndex = 0;
        _this._rng = 0;
        _this._clockAccumulator = 0;
        _this._lastCpuTime = 0;
        _this._fastFetch = false;
        _this._ldaPending = false;
        _this._cpuTimeProvider = null;
        _this._soc = new Soc_1.default();
        if (buffer.length < 28 * 0x0400 || buffer.length > 0x8000) {
            throw new Error("not a DPC+ image: invalid lenght " + buffer.length);
        }
        _this._rom = _this._soc.getRom();
        for (var i = 0; i < 6; i++) {
            _this._banks[i] = new Uint8Array(_this._rom.buffer, 0x0c00 + i * 0x1000, 0x1000);
        }
        _this._ram = _this._soc.getRam();
        _this._imageRam = new Uint8Array(_this._ram.buffer, 0x0c00, 0x1000);
        var offset = 0x8000 - buffer.length;
        for (var i = 0; i < buffer.length; i++) {
            _this._rom[offset + i] = buffer[i];
        }
        for (var i = 0; i < 8; i++) {
            _this._fetchers[i] = new Fetcher();
            _this._fractionalFetchers[i] = new FractionalFetcher();
        }
        for (var i = 0; i < 3; i++) {
            _this._musicFetchers[i] = new MusicFetcher();
        }
        _this._soc.trap.addHandler(function (message) { return _this.triggerTrap(2, message); });
        _this.reset();
        return _this;
    }
    CartridgeDPCPlus.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, ['DPC+'.split('').map(function (x) { return x.charCodeAt(0); })]);
        return signatureCounts[0] === 2;
    };
    CartridgeDPCPlus.prototype.init = function () {
        return this._soc.init();
    };
    CartridgeDPCPlus.prototype.reset = function () {
        this._soc.reset();
        this._currentBank = this._banks[5];
        for (var i = 0; i < 0x0300; i++) {
            this._soc.setRam32(i << 2, this._soc.getRom32(i << 2));
        }
        for (var i = 0x1b00; i < 0x2000; i++) {
            this._soc.setRam32((0x0300 + i - 0x1b00) << 2, this._soc.getRom32(i << 2));
        }
        this._currentBank = this._banks[5];
        for (var i = 0; i < 8; i++) {
            this._parameters[i] = 0;
        }
        for (var i = 0; i < 8; i++) {
            this._fetchers[i].reset();
            this._fractionalFetchers[i].reset();
        }
        for (var i = 0; i < 3; i++) {
            this._musicFetchers[i].reset();
        }
        this._parameterIndex = 0;
        this._fastFetch = this._ldaPending = false;
        this._rng = 0x2b435044;
        this._lastCpuTime = 0;
        this._clockAccumulator = 0;
    };
    CartridgeDPCPlus.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_dpc_plus;
    };
    CartridgeDPCPlus.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeDPCPlus.prototype.setCpuTimeProvider = function (provider) {
        this._cpuTimeProvider = provider;
        return this;
    };
    CartridgeDPCPlus.prototype.read = function (address) {
        return this._access(address, this._bus.getLastDataBusValue());
    };
    CartridgeDPCPlus.prototype.peek = function (address) {
        return this._currentBank[address & 0x0fff];
    };
    CartridgeDPCPlus.prototype.write = function (address, value) {
        this._access(address, value);
    };
    CartridgeDPCPlus.prototype.triggerTrap = function (reason, message) {
        _super.prototype.triggerTrap.call(this, reason, message);
    };
    CartridgeDPCPlus.prototype._access = function (address, value) {
        address &= 0x0fff;
        var readResult = this._currentBank[address];
        if (this._fastFetch && this._ldaPending && address > 0x7f && address < 0x0ff6 && readResult < 0x28) {
            address = readResult;
        }
        this._ldaPending = false;
        if (address < 0x28) {
            var idx = address & 0x07, fetcher = this._fetchers[idx], fractionalFetcher = this._fractionalFetchers[idx];
            var result = 0;
            switch ((address >>> 3) & 0x07) {
                case 0x00:
                    switch (idx) {
                        case 0x00:
                            this._advanceRng();
                            return this._rng & 0xff;
                        case 0x01:
                            this._rewindRng();
                            return this._rng & 0xff;
                        case 0x02:
                            return (this._rng >>> 8) & 0xff;
                        case 0x03:
                            return (this._rng >>> 16) & 0xff;
                        case 0x04:
                            return (this._rng >>> 24) & 0xff;
                        case 0x05: {
                            this._clockMusicFetchers();
                            var acc = 0;
                            for (var i = 0; i < 3; i++) {
                                acc += this._imageRam[(this._musicFetchers[i].waveform << 5) + this._musicFetchers[i].waveformSample()];
                            }
                            return acc & 0xff;
                        }
                    }
                    return 0;
                case 0x01:
                    result = this._imageRam[fetcher.pointer];
                    fetcher.increment();
                    return result;
                case 0x02:
                    result = this._imageRam[fetcher.pointer] & fetcher.mask();
                    fetcher.increment();
                    return result;
                case 0x03:
                    result = this._imageRam[fractionalFetcher.pointer >>> 8];
                    fractionalFetcher.increment();
                    return result;
                case 0x04:
                    return idx < 4 ? fetcher.mask() : 0;
                default:
                    return 0;
            }
        }
        else if (address < 0x80) {
            var idx = address & 0x07, fetcher = this._fetchers[idx], fractionalFetcher = this._fractionalFetchers[idx];
            switch (((address - 0x28) >>> 3) & 0x0f) {
                case 0x00:
                    fractionalFetcher.setPointerLo(value);
                    break;
                case 0x01:
                    fractionalFetcher.setPointerHi(value);
                    break;
                case 0x02:
                    fractionalFetcher.setFraction(value);
                    break;
                case 0x03:
                    fetcher.top = value;
                    break;
                case 0x04:
                    fetcher.bottom = value;
                    break;
                case 0x05:
                    fetcher.setPointerLo(value);
                    break;
                case 0x06:
                    switch (idx) {
                        case 0x00:
                            this._fastFetch = value === 0;
                            break;
                        case 0x01:
                            if (this._parameterIndex < 8) {
                                this._parameters[this._parameterIndex++] = value;
                            }
                            break;
                        case 0x02:
                            this._dispatchFunction(value);
                            break;
                        case 0x05:
                        case 0x06:
                        case 0x07:
                            this._musicFetchers[idx - 0x05].waveform = value & 0x7f;
                            break;
                    }
                    break;
                case 0x07:
                    fetcher.decrement();
                    this._imageRam[fetcher.pointer] = value;
                    break;
                case 0x08:
                    fetcher.setPointerHi(value);
                    break;
                case 0x09:
                    switch (idx) {
                        case 0x00:
                            this._rng = 0x2b435044;
                            break;
                        case 0x01:
                            this._rng = (this._rng & 0xffffff00) | value;
                            break;
                        case 0x02:
                            this._rng = (this._rng & 0xffff00ff) | (value << 8);
                            break;
                        case 0x03:
                            this._rng = (this._rng & 0xff00ffff) | (value << 16);
                            break;
                        case 0x04:
                            this._rng = (this._rng & 0x00ffffff) | (value << 24);
                            break;
                        case 0x05:
                        case 0x06:
                        case 0x07:
                            this._musicFetchers[idx - 0x05].frequency = this._soc.getRam32(0x2000 - 0x400 + (value << 2));
                            break;
                    }
                    break;
                case 0x0a:
                    this._imageRam[fetcher.pointer] = value;
                    fetcher.increment();
                    break;
                default:
                    break;
            }
        }
        else if (address > 0x0ff5 && address < 0x0ffc) {
            this._currentBank = this._banks[address - 0x0ff6];
        }
        if (this._fastFetch && address > 0x7f && address < 0x0ff6) {
            this._ldaPending = readResult === 0xa9;
        }
        return readResult;
    };
    CartridgeDPCPlus.prototype._clockMusicFetchers = function () {
        var cpuTime = this._cpuTimeProvider();
        this._clockAccumulator += (cpuTime - this._lastCpuTime) * 20000;
        this._lastCpuTime = cpuTime;
        var clocks = Math.floor(this._clockAccumulator);
        this._clockAccumulator -= clocks;
        if (clocks === 0) {
            return;
        }
        for (var i = 0; i < 3; i++) {
            this._musicFetchers[i].increment(clocks);
        }
    };
    CartridgeDPCPlus.prototype._dispatchFunction = function (index) {
        var romBase = this._parameters[0] + (this._parameters[1] << 8);
        switch (index) {
            case 0:
                this._parameterIndex = 0;
                break;
            case 1:
                for (var i = 0; i < this._parameters[3]; i++) {
                    this._ram[0x0c00 + ((this._fetchers[this._parameters[2] & 0x07].pointer + i) & 0x0fff)] = this._rom[0x0c00 + (romBase + i) % 0x7400];
                }
                this._parameterIndex = 0;
                break;
            case 2:
                for (var i = 0; i < this._parameters[3]; i++) {
                    this._ram[0x0c00 + ((this._fetchers[this._parameters[2] & 0x07].pointer + i) & 0x0fff)] = this._parameters[0];
                }
                this._parameterIndex = 0;
                break;
            case 254:
            case 255:
                this._soc.run(0x0c0b);
                break;
        }
    };
    CartridgeDPCPlus.prototype._advanceRng = function () {
        this._rng = (this._rng & (1 << 10) ? 0x10adab1e : 0x00) ^ ((this._rng >>> 11) | (this._rng << 21));
    };
    CartridgeDPCPlus.prototype._rewindRng = function () {
        this._rng =
            this._rng & (1 << 31)
                ? ((0x10adab1e ^ this._rng) << 11) | ((0x10adab1e ^ this._rng) >>> 21)
                : (this._rng << 11) | (this._rng >>> 21);
    };
    return CartridgeDPCPlus;
}(AbstractCartridge_1.default));
exports.default = CartridgeDPCPlus;
var Fetcher = (function () {
    function Fetcher() {
        this.pointer = 0;
        this.top = 0;
        this.bottom = 0;
    }
    Fetcher.prototype.contructor = function () {
        this.reset();
    };
    Fetcher.prototype.reset = function () {
        this.pointer = this.top = this.bottom = 0;
    };
    Fetcher.prototype.setPointerHi = function (value) {
        this.pointer = (this.pointer & 0xff) | ((value & 0x0f) << 8);
    };
    Fetcher.prototype.setPointerLo = function (value) {
        this.pointer = (this.pointer & 0x0f00) | (value & 0xff);
    };
    Fetcher.prototype.increment = function () {
        this.pointer = (this.pointer + 1) & 0xfff;
    };
    Fetcher.prototype.decrement = function () {
        this.pointer = (this.pointer + 0xfff) & 0xfff;
    };
    Fetcher.prototype.mask = function () {
        return ((this.top - (this.pointer & 0xff)) & 0xff) > ((this.top - this.bottom) & 0xff) ? 0xff : 0;
    };
    return Fetcher;
}());
var FractionalFetcher = (function () {
    function FractionalFetcher() {
        this.pointer = 0;
        this.fraction = 0;
    }
    FractionalFetcher.prototype.contructor = function () {
        this.reset();
    };
    FractionalFetcher.prototype.reset = function () {
        this.pointer = this.fraction = 0;
    };
    FractionalFetcher.prototype.setPointerHi = function (value) {
        this.pointer = (this.pointer & 0x00ffff) | ((value & 0x0f) << 16);
    };
    FractionalFetcher.prototype.setPointerLo = function (value) {
        this.pointer = (this.pointer & 0x0f00ff) | ((value & 0xff) << 8);
    };
    FractionalFetcher.prototype.setFraction = function (value) {
        this.fraction = value;
        this.pointer &= 0x0fff00;
    };
    FractionalFetcher.prototype.increment = function () {
        this.pointer = (this.pointer + this.fraction) & 0x0fffff;
    };
    return FractionalFetcher;
}());
var MusicFetcher = (function () {
    function MusicFetcher() {
        this.frequency = ~0;
        this.counter = ~0;
        this.waveform = 0;
        this.reset();
    }
    MusicFetcher.prototype.reset = function () {
        this.frequency = 0;
        this.waveform = 0;
        this.counter = 0;
    };
    MusicFetcher.prototype.increment = function (clocks) {
        this.counter = (this.counter + clocks * this.frequency) | 0;
    };
    MusicFetcher.prototype.waveformSample = function () {
        return this.counter >>> 27;
    };
    return MusicFetcher;
}());

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./harmony/Soc":107,"./util":110,"tslib":25}],91:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeF8_1 = require("./CartridgeF8");
var CartridgeE0_1 = require("./CartridgeE0");
var Cartridge3F_1 = require("./Cartridge3F");
var Cartridge3E_1 = require("./Cartridge3E");
var CartridgeFE_1 = require("./CartridgeFE");
var CartridgeUA_1 = require("./CartridgeUA");
var CartridgeE7_1 = require("./CartridgeE7");
var CartridgeFA2_1 = require("./CartridgeFA2");
var CartridgeEF_1 = require("./CartridgeEF");
var CartridgeDPCPlus_1 = require("./CartridgeDPCPlus");
var CartridgeCDF_1 = require("./CartridgeCDF");
var Cartridge0840_1 = require("./Cartridge0840");
var CartridgeDetector = (function () {
    function CartridgeDetector() {
    }
    CartridgeDetector.prototype.detectCartridgeType = function (buffer) {
        if (buffer.length % 8448 === 0) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_supercharger;
        }
        if (buffer.length <= 0x0800) {
            return CartridgeInfo_1.default.CartridgeType.vanilla_2k;
        }
        if (buffer.length >= 10240 && buffer.length <= 10496) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_DPC;
        }
        switch (buffer.length) {
            case 0x1000:
                return CartridgeInfo_1.default.CartridgeType.vanilla_4k;
            case 0x2000:
                return this._detect8k(buffer);
            case 0x3000:
                return CartridgeInfo_1.default.CartridgeType.bankswitch_12k_FA;
            case 0x4000:
                return this._detect16k(buffer);
            case 0x7000:
                return CartridgeInfo_1.default.CartridgeType.bankswitch_FA2;
            case 0x7400:
                return this._detect29k(buffer);
            case 0x8000:
                return this._detect32k(buffer);
            case 0x10000:
                return this._detect64k(buffer);
            default:
                return CartridgeInfo_1.default.CartridgeType.unknown;
        }
    };
    CartridgeDetector.prototype._detect8k = function (buffer) {
        var f8Matches = CartridgeF8_1.default.matchesBuffer(buffer);
        if (CartridgeE0_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_E0;
        }
        if (Cartridge3F_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_3F;
        }
        if (CartridgeUA_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_UA;
        }
        if (!f8Matches && CartridgeFE_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_FE;
        }
        if (Cartridge0840_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_econobanking;
        }
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_F8;
    };
    CartridgeDetector.prototype._detect16k = function (buffer) {
        if (CartridgeE7_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_16k_E7;
        }
        return CartridgeInfo_1.default.CartridgeType.bankswitch_16k_F6;
    };
    CartridgeDetector.prototype._detect29k = function (buffer) {
        if (CartridgeFA2_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_FA2;
        }
        return CartridgeInfo_1.default.CartridgeType.bankswitch_dpc_plus;
    };
    CartridgeDetector.prototype._detect32k = function (buffer) {
        if (Cartridge3E_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_3E;
        }
        if (CartridgeDPCPlus_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_dpc_plus;
        }
        if (CartridgeCDF_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_cdf;
        }
        return CartridgeInfo_1.default.CartridgeType.bankswitch_32k_F4;
    };
    CartridgeDetector.prototype._detect64k = function (buffer) {
        if (CartridgeEF_1.default.matchesBuffer(buffer)) {
            return CartridgeInfo_1.default.CartridgeType.bankswitch_64k_EF;
        }
        return CartridgeInfo_1.default.CartridgeType.bankswitch_64k_F0;
    };
    return CartridgeDetector;
}());
exports.default = CartridgeDetector;

},{"./Cartridge0840":83,"./Cartridge3E":85,"./Cartridge3F":86,"./CartridgeCDF":88,"./CartridgeDPCPlus":90,"./CartridgeE0":92,"./CartridgeE7":93,"./CartridgeEF":94,"./CartridgeF8":98,"./CartridgeFA2":100,"./CartridgeFE":101,"./CartridgeInfo":103,"./CartridgeUA":106}],92:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var cartridgeUtil = require("./util");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeE0 = (function (_super) {
    tslib_1.__extends(CartridgeE0, _super);
    function CartridgeE0(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = new Array(8);
        _this._activeBanks = new Array(4);
        if (buffer.length !== 0x2000) {
            throw new Error("buffer is not an 8k cartridge image: invalid length " + buffer.length);
        }
        for (var i = 0; i < 8; i++) {
            _this._banks[i] = new Uint8Array(0x0400);
        }
        for (var i = 0; i < 0x0400; i++) {
            for (var j = 0; j < 8; j++) {
                _this._banks[j][i] = buffer[j * 0x0400 + i];
            }
        }
        _this.reset();
        return _this;
    }
    CartridgeE0.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0x8d, 0xe0, 0x1f],
            [0x8d, 0xe0, 0x5f],
            [0x8d, 0xe9, 0xff],
            [0x0c, 0xe0, 0x1f],
            [0xad, 0xe0, 0x1f],
            [0xad, 0xe9, 0xff],
            [0xad, 0xed, 0xff],
            [0xad, 0xf3, 0xbf]
        ]);
        for (var i = 0; i < signatureCounts.length; i++) {
            if (signatureCounts[i] > 0) {
                return true;
            }
        }
        return false;
    };
    CartridgeE0.prototype.reset = function () {
        for (var i = 0; i < 4; i++) {
            this._activeBanks[i] = this._banks[7];
        }
    };
    CartridgeE0.prototype.read = function (address) {
        address &= 0x0fff;
        if (address >= 0x0fe0 && address < 0x0ff8) {
            this._handleBankswitch(address);
        }
        return this._activeBanks[address >> 10][address & 0x03ff];
    };
    CartridgeE0.prototype.peek = function (address) {
        address &= 0x0fff;
        return this._activeBanks[address >> 10][address & 0x03ff];
    };
    CartridgeE0.prototype.write = function (address, value) {
        var addressMasked = address & 0x0fff;
        if (addressMasked >= 0x0fe0 && addressMasked < 0x0ff8) {
            this._handleBankswitch(addressMasked);
        }
        return _super.prototype.write.call(this, address, value);
    };
    CartridgeE0.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_E0;
    };
    CartridgeE0.prototype._handleBankswitch = function (address) {
        if (address < 0x0fe8) {
            this._activeBanks[0] = this._banks[address - 0x0fe0];
        }
        else if (address < 0x0ff0) {
            this._activeBanks[1] = this._banks[address - 0x0fe8];
        }
        else {
            this._activeBanks[2] = this._banks[address - 0x0ff0];
        }
    };
    return CartridgeE0;
}(AbstractCartridge_1.default));
exports.default = CartridgeE0;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],93:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var cartridgeUtil = require("./util");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartrdigeE7 = (function (_super) {
    tslib_1.__extends(CartrdigeE7, _super);
    function CartrdigeE7(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = new Array(8);
        _this._ram0 = new Uint8Array(0x0400);
        _this._ram1Banks = new Array(4);
        _this._ram0Enabled = false;
        if (buffer.length !== 0x4000) {
            throw new Error("buffer is not a 16k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 8; i++) {
            _this._banks[i] = new Uint8Array(0x0800);
        }
        for (var i = 0; i < 4; i++) {
            _this._ram1Banks[i] = new Uint8Array(0x100);
        }
        for (var i = 0; i < 0x0800; i++) {
            for (var j = 0; j < 8; j++) {
                _this._banks[j][i] = buffer[j * 0x0800 + i];
            }
        }
        _this.reset();
        return _this;
    }
    CartrdigeE7.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0xad, 0xe2, 0xff],
            [0xad, 0xe5, 0xff],
            [0xad, 0xe5, 0x1f],
            [0xad, 0xe7, 0x1f],
            [0x0c, 0xe7, 0x1f],
            [0x8d, 0xe7, 0xff],
            [0x8d, 0xe7, 0x1f]
        ]);
        for (var i = 0; i < signatureCounts.length; i++) {
            if (signatureCounts[i] > 0) {
                return true;
            }
        }
        return false;
    };
    CartrdigeE7.prototype.reset = function () {
        this._bank0 = this._banks[0];
        this._ram1 = this._ram1Banks[0];
        this._ram0Enabled = false;
    };
    CartrdigeE7.prototype.read = function (address) {
        this._handleBankswitch(address & 0x0fff);
        return this.peek(address);
    };
    CartrdigeE7.prototype.peek = function (address) {
        address &= 0x0fff;
        if (address < 0x0800) {
            if (this._ram0Enabled) {
                return address >= 0x0400 ? this._ram0[address - 0x0400] : 0;
            }
            else {
                return this._bank0[address];
            }
        }
        if (address <= 0x09ff) {
            return address >= 0x0900 ? this._ram1[address - 0x0900] : 0;
        }
        return this._banks[7][0x07ff - (0x0fff - address)];
    };
    CartrdigeE7.prototype.write = function (address, value) {
        address &= 0x0fff;
        this._handleBankswitch(address);
        if (address < 0x0400) {
            if (this._ram0Enabled) {
                this._ram0[address] = value;
            }
            else {
                _super.prototype.write.call(this, address, value);
            }
        }
        else if (address < 0x0800) {
            _super.prototype.write.call(this, address, value);
        }
        else if (address < 0x08ff) {
            this._ram1[address - 0x0800] = value;
        }
        else {
            _super.prototype.write.call(this, address, value);
        }
    };
    CartrdigeE7.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_16k_E7;
    };
    CartrdigeE7.prototype.randomize = function (rng) {
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < this._ram1Banks[i].length; j++) {
                this._ram1Banks[i][j] = rng.int(0xff);
            }
        }
        for (var i = 0; i < this._ram0.length; i++) {
            this._ram0[i] = rng.int(0xff);
        }
    };
    CartrdigeE7.prototype._handleBankswitch = function (address) {
        if (address < 0x0fe0) {
            return;
        }
        if (address <= 0x0fe6) {
            this._bank0 = this._banks[address & 0x000f];
            this._ram0Enabled = false;
        }
        else if (address === 0x0fe7) {
            this._ram0Enabled = true;
        }
        else if (address <= 0x0feb) {
            this._ram1 = this._ram1Banks[address - 0x0fe8];
        }
    };
    return CartrdigeE7;
}(AbstractCartridge_1.default));
exports.default = CartrdigeE7;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],94:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var CartridgeEF = (function (_super) {
    tslib_1.__extends(CartridgeEF, _super);
    function CartridgeEF(buffer, _supportSC) {
        if (_supportSC === void 0) { _supportSC = true; }
        var _this = _super.call(this) || this;
        _this._supportSC = _supportSC;
        _this._bus = null;
        _this._banks = new Array(16);
        _this._ram = new Uint8Array(0x80);
        _this._hasSC = false;
        if (buffer.length !== 0x10000) {
            throw new Error("buffer is not a 64k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 16; i++) {
            _this._banks[i] = new Uint8Array(0x1000);
        }
        for (var i = 0; i < 0x1000; i++) {
            for (var j = 0; j < 16; j++) {
                _this._banks[j][i] = buffer[j * 0x1000 + i];
            }
        }
        _this.reset();
        return _this;
    }
    CartridgeEF.matchesBuffer = function (buffer) {
        var matchMagic = function (magicString) {
            var magic = magicString.split('').map(function (x) { return x.charCodeAt(0); });
            for (var i = 0; i < magic.length; i++) {
                if (magic[i] !== buffer[0xfff8 + i]) {
                    return false;
                }
            }
            return true;
        };
        if (buffer.length !== 0x10000) {
            return false;
        }
        if (matchMagic('efef') || matchMagic('efsc')) {
            return true;
        }
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0x0c, 0xe0, 0xff],
            [0xad, 0xe0, 0xff],
            [0x0c, 0xe0, 0x1f],
            [0xad, 0xe0, 0x1f]
        ]);
        for (var i = 0; i < 4; i++) {
            if (signatureCounts[i] > 0) {
                return true;
            }
        }
        return false;
    };
    CartridgeEF.prototype.reset = function () {
        this._bank = this._banks[15];
        this._hasSC = false;
    };
    CartridgeEF.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_64k_EF;
    };
    CartridgeEF.prototype.randomize = function (rng) {
        for (var i = 0; i < this._ram.length; i++) {
            this._ram[i] = rng.int(0xff);
        }
    };
    CartridgeEF.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeEF.prototype.read = function (address) {
        this._access(address & 0x0fff, this._bus.getLastDataBusValue());
        return this.peek(address);
    };
    CartridgeEF.prototype.peek = function (address) {
        address &= 0x0fff;
        if (this._hasSC && address >= 0x0080 && address < 0x0100) {
            return this._ram[address - 0x80];
        }
        else {
            return this._bank[address];
        }
    };
    CartridgeEF.prototype.write = function (address, value) {
        address &= 0x0fff;
        if (address < 0x80 && this._supportSC) {
            this._hasSC = true;
        }
        this._access(address, value);
    };
    CartridgeEF.prototype._access = function (address, value) {
        if (address < 0x80 && this._hasSC) {
            this._ram[address] = value;
            return;
        }
        if (address >= 0x0fe0 && address <= 0x0fef) {
            this._bank = this._banks[address - 0x0fe0];
        }
    };
    return CartridgeEF;
}(AbstractCartridge_1.default));
exports.default = CartridgeEF;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],95:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeF0 = (function (_super) {
    tslib_1.__extends(CartridgeF0, _super);
    function CartridgeF0(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = new Array(16);
        _this._bankIdx = 0;
        if (buffer.length !== 0x10000) {
            throw new Error("buffer is not a 64k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 16; i++) {
            _this._banks[i] = new Uint8Array(0x1000);
        }
        for (var i = 0; i < 0x1000; i++) {
            for (var j = 0; j < 16; j++) {
                _this._banks[j][i] = buffer[j * 0x1000 + i];
            }
        }
        _this.reset();
        return _this;
    }
    CartridgeF0.prototype.reset = function () {
        this._bankIdx = 0;
        this._currentBank = this._banks[this._bankIdx];
    };
    CartridgeF0.prototype.read = function (address) {
        address &= 0x0fff;
        this._handleBankswitch(address);
        return this._currentBank[address];
    };
    CartridgeF0.prototype.peek = function (address) {
        return this._currentBank[address & 0x0fff];
    };
    CartridgeF0.prototype.write = function (address, value) {
        address &= 0xfff;
        this._handleBankswitch(address);
        _super.prototype.write.call(this, address, value);
    };
    CartridgeF0.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_64k_F0;
    };
    CartridgeF0.prototype._handleBankswitch = function (address) {
        if (address === 0x0ff0) {
            this._bankIdx = (this._bankIdx + 1) & 0x0f;
            this._currentBank = this._banks[this._bankIdx];
        }
    };
    return CartridgeF0;
}(AbstractCartridge_1.default));
exports.default = CartridgeF0;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],96:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeF4 = (function (_super) {
    tslib_1.__extends(CartridgeF4, _super);
    function CartridgeF4(buffer, _supportSC) {
        if (_supportSC === void 0) { _supportSC = true; }
        var _this = _super.call(this) || this;
        _this._supportSC = _supportSC;
        _this._bus = null;
        _this._banks = new Array(8);
        _this._ram = new Uint8Array(0x80);
        _this._hasSC = false;
        if (buffer.length !== 0x8000) {
            throw new Error("buffer is not a 32k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 8; i++) {
            _this._banks[i] = new Uint8Array(0x1000);
        }
        for (var i = 0; i < 0x1000; i++) {
            for (var j = 0; j < 8; j++) {
                _this._banks[j][i] = buffer[j * 0x1000 + i];
            }
        }
        _this.reset();
        return _this;
    }
    CartridgeF4.prototype.reset = function () {
        this._bank = this._banks[0];
        this._hasSC = false;
    };
    CartridgeF4.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_32k_F4;
    };
    CartridgeF4.prototype.randomize = function (rng) {
        for (var i = 0; i < this._ram.length; i++) {
            this._ram[i] = rng.int(0xff);
        }
    };
    CartridgeF4.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeF4.prototype.read = function (address) {
        this._access(address & 0x0fff, this._bus.getLastDataBusValue());
        return this.peek(address);
    };
    CartridgeF4.prototype.peek = function (address) {
        address &= 0x0fff;
        if (this._hasSC && address >= 0x0080 && address < 0x0100) {
            return this._ram[address - 0x80];
        }
        else {
            return this._bank[address];
        }
    };
    CartridgeF4.prototype.write = function (address, value) {
        address &= 0x0fff;
        if (address < 0x80 && this._supportSC) {
            this._hasSC = true;
        }
        this._access(address, value);
    };
    CartridgeF4.prototype._access = function (address, value) {
        if (address < 0x80 && this._hasSC) {
            this._ram[address] = value;
            return;
        }
        if (address >= 0x0ff4 && address <= 0x0ffb) {
            this._bank = this._banks[address - 0x0ff4];
        }
    };
    return CartridgeF4;
}(AbstractCartridge_1.default));
exports.default = CartridgeF4;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeF6 = (function (_super) {
    tslib_1.__extends(CartridgeF6, _super);
    function CartridgeF6(buffer, _supportSC) {
        if (_supportSC === void 0) { _supportSC = true; }
        var _this = _super.call(this) || this;
        _this._supportSC = _supportSC;
        _this._bank = null;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        _this._bank2 = new Uint8Array(0x1000);
        _this._bank3 = new Uint8Array(0x1000);
        _this._hasSC = false;
        _this._saraRAM = new Uint8Array(0x80);
        _this._bus = null;
        if (buffer.length !== 0x4000) {
            throw new Error("buffer is not a 16k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
            _this._bank2[i] = buffer[0x2000 + i];
            _this._bank3[i] = buffer[0x3000 + i];
        }
        _this.reset();
        return _this;
    }
    CartridgeF6.prototype.reset = function () {
        this._bank = this._bank0;
        this._hasSC = false;
    };
    CartridgeF6.prototype.read = function (address) {
        this._access(address & 0x0fff, this._bus.getLastDataBusValue());
        return this.peek(address);
    };
    CartridgeF6.prototype.peek = function (address) {
        address &= 0x0fff;
        if (this._hasSC && address >= 0x0080 && address < 0x0100) {
            return this._saraRAM[address - 0x80];
        }
        return this._bank[address];
    };
    CartridgeF6.prototype.write = function (address, value) {
        address &= 0x0fff;
        if (address < 0x80 && this._supportSC) {
            this._hasSC = true;
        }
        this._access(address, value);
    };
    CartridgeF6.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_16k_F6;
    };
    CartridgeF6.prototype.randomize = function (rng) {
        for (var i = 0; i < this._saraRAM.length; i++) {
            this._saraRAM[i] = rng.int(0xff);
        }
    };
    CartridgeF6.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeF6.prototype._access = function (address, value) {
        if (address < 0x80 && this._hasSC) {
            this._saraRAM[address] = value & 0xff;
            return;
        }
        switch (address) {
            case 0x0ff6:
                this._bank = this._bank0;
                break;
            case 0x0ff7:
                this._bank = this._bank1;
                break;
            case 0x0ff8:
                this._bank = this._bank2;
                break;
            case 0x0ff9:
                this._bank = this._bank3;
                break;
        }
    };
    return CartridgeF6;
}(AbstractCartridge_1.default));
exports.default = CartridgeF6;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var CartridgeF8 = (function (_super) {
    tslib_1.__extends(CartridgeF8, _super);
    function CartridgeF8(buffer, _supportSC) {
        if (_supportSC === void 0) { _supportSC = true; }
        var _this = _super.call(this) || this;
        _this._supportSC = _supportSC;
        _this._bank = null;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        _this._hasSC = false;
        _this._saraRAM = new Uint8Array(0x80);
        _this._bus = null;
        if (buffer.length !== 0x2000) {
            throw new Error("buffer is not an 8k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
        }
        _this.reset();
        return _this;
    }
    CartridgeF8.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [[0x8d, 0xf9, 0x1f]]);
        return signatureCounts[0] >= 2;
    };
    CartridgeF8.prototype.reset = function () {
        this._bank = this._bank1;
        this._hasSC = false;
    };
    CartridgeF8.prototype.read = function (address) {
        this._access(address & 0x0fff, this._bus.getLastDataBusValue());
        return this.peek(address);
    };
    CartridgeF8.prototype.peek = function (address) {
        address &= 0x0fff;
        if (this._hasSC && address >= 0x0080 && address < 0x0100) {
            return this._saraRAM[address - 0x80];
        }
        return this._bank[address];
    };
    CartridgeF8.prototype.write = function (address, value) {
        address &= 0x0fff;
        if (address < 0x80 && this._supportSC) {
            this._hasSC = true;
        }
        this._access(address, value);
    };
    CartridgeF8.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_F8;
    };
    CartridgeF8.prototype.randomize = function (rng) {
        for (var i = 0; i < this._saraRAM.length; i++) {
            this._saraRAM[i] = rng.int(0xff);
        }
    };
    CartridgeF8.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeF8.prototype._access = function (address, value) {
        if (address < 0x80 && this._hasSC) {
            this._saraRAM[address] = value & 0xff;
            return;
        }
        switch (address) {
            case 0x0ff8:
                this._bank = this._bank0;
                break;
            case 0x0ff9:
                this._bank = this._bank1;
                break;
        }
    };
    return CartridgeF8;
}(AbstractCartridge_1.default));
exports.default = CartridgeF8;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],99:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeFA = (function (_super) {
    tslib_1.__extends(CartridgeFA, _super);
    function CartridgeFA(buffer) {
        var _this = _super.call(this) || this;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        _this._bank2 = new Uint8Array(0x1000);
        _this._ram = new Uint8Array(0x0100);
        if (buffer.length !== 0x3000) {
            throw new Error("buffer is not a 12k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
            _this._bank2[i] = buffer[0x2000 + i];
        }
        _this.reset();
        return _this;
    }
    CartridgeFA.prototype.reset = function () {
        this._bank = this._bank0;
    };
    CartridgeFA.prototype.randomize = function (rng) {
        for (var i = 0; i < this._ram.length; i++) {
            this._ram[i] = rng.int(0xff);
        }
    };
    CartridgeFA.prototype.read = function (address) {
        this._handleBankswitch(address & 0x0fff);
        return this.peek(address);
    };
    CartridgeFA.prototype.peek = function (address) {
        address &= 0x0fff;
        if (address >= 0x0100 && address < 0x0200) {
            return this._ram[address & 0xff];
        }
        else {
            return this._bank[address];
        }
    };
    CartridgeFA.prototype.write = function (address, value) {
        address &= 0x0fff;
        this._handleBankswitch(address);
        if (address < 0x0100) {
            this._ram[address] = value & 0xff;
        }
        else {
            _super.prototype.write.call(this, address, value);
        }
    };
    CartridgeFA.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_12k_FA;
    };
    CartridgeFA.prototype._handleBankswitch = function (address) {
        switch (address) {
            case 0x0ff8:
                this._bank = this._bank0;
                break;
            case 0x0ff9:
                this._bank = this._bank1;
                break;
            case 0x0ffa:
                this._bank = this._bank2;
                break;
        }
    };
    return CartridgeFA;
}(AbstractCartridge_1.default));
exports.default = CartridgeFA;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"tslib":25}],100:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var CartridgeFA2 = (function (_super) {
    tslib_1.__extends(CartridgeFA2, _super);
    function CartridgeFA2(buffer) {
        var _this = _super.call(this) || this;
        _this._banks = new Array(7);
        _this._ram = new Uint8Array(0x100);
        _this._savedRam = new Uint8Array(0x100);
        _this._accessCounter = 0;
        _this._accessCounterLimit = 0;
        if (buffer.length !== 0x7000 && buffer.length !== 0x7400) {
            throw new Error("buffer is not a 28k/29k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 7; i++) {
            _this._banks[i] = new Uint8Array(0x1000);
        }
        var offset = buffer.length === 0x7000 ? 0 : 0x0400;
        for (var i = 0; i < 0x1000; i++) {
            for (var j = 0; j < 7; j++) {
                _this._banks[j][i] = buffer[j * 0x1000 + i + offset];
            }
        }
        _this.reset();
        return _this;
    }
    CartridgeFA2.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0xa0, 0xc1, 0x1f, 0xe0],
            [0x00, 0x80, 0x02, 0xe0]
        ]);
        return signatureCounts[0] > 0 || signatureCounts[1] > 0;
    };
    CartridgeFA2.prototype.reset = function () {
        this._accessCounter = 0;
        this._accessCounterLimit = 0;
        this._bank = this._banks[0];
    };
    CartridgeFA2.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_FA2;
    };
    CartridgeFA2.prototype.randomize = function (rng) {
        for (var i = 0; i < this._ram.length; i++) {
            this._ram[i] = rng.int(0xff);
        }
    };
    CartridgeFA2.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    CartridgeFA2.prototype.read = function (address) {
        this.write(address & 0x0fff, this._bus.getLastDataBusValue());
        return this.peek(address);
    };
    CartridgeFA2.prototype.peek = function (address) {
        address &= 0x0fff;
        if (address >= 0x0100 && address < 0x0200) {
            return this._ram[address - 0x0100];
        }
        else if (address === 0x0ff4) {
            return this._accessCounter >= this._accessCounterLimit
                ?
                    this._bank[address] & ~0x40
                :
                    this._bank[address] | 0x40;
        }
        else {
            return this._bank[address];
        }
    };
    CartridgeFA2.prototype.write = function (address, value) {
        address &= 0x0fff;
        this._accessCounter++;
        if (address < 0x0100) {
            this._ram[address] = value;
            return;
        }
        if (address === 0x0ff4) {
            return this._handleIo();
        }
        if (address >= 0x0ff5 && address <= 0x0ffb) {
            this._bank = this._banks[address - 0x0ff5];
        }
    };
    CartridgeFA2.prototype._handleIo = function () {
        if (this._accessCounter < this._accessCounterLimit) {
            return;
        }
        if (this._ram[0xff] === 1) {
            for (var i = 0; i < 0x100; i++) {
                this._ram[i] = this._savedRam[i];
            }
            this._accessCounterLimit = 10;
        }
        else if (this._ram[0xff] === 2) {
            for (var i = 0; i < 0x100; i++) {
                this._savedRam[i] = this._ram[i];
            }
            this._accessCounterLimit = 100;
        }
        else {
            return;
        }
        this._accessCounter = 0;
        this._ram[0xff] = 0;
    };
    return CartridgeFA2;
}(AbstractCartridge_1.default));
exports.default = CartridgeFA2;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],101:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var CartridgeFE = (function (_super) {
    tslib_1.__extends(CartridgeFE, _super);
    function CartridgeFE(buffer) {
        var _this = _super.call(this) || this;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        _this._lastAccessWasFE = false;
        _this._lastAddressBusValue = -1;
        if (buffer.length !== 0x2000) {
            throw new Error("buffer is not an 8k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
        }
        _this.reset();
        return _this;
    }
    CartridgeFE.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0x20, 0x00, 0xd0, 0xc6, 0xc5],
            [0x20, 0xc3, 0xf8, 0xa5, 0x82],
            [0xd0, 0xfb, 0x20, 0x73, 0xfe],
            [0x20, 0x00, 0xf0, 0x84, 0xd6]
        ]);
        for (var i = 0; i < signatureCounts.length; i++) {
            if (signatureCounts[i] > 0) {
                return true;
            }
        }
        return false;
    };
    CartridgeFE.prototype.reset = function () {
        this._bank = this._bank0;
        this._lastAccessWasFE = false;
        this._lastAddressBusValue = -1;
    };
    CartridgeFE.prototype.read = function (address) {
        return this._bank[address & 0x0fff];
    };
    CartridgeFE.prototype.write = function (address, value) {
        _super.prototype.write.call(this, address, value);
    };
    CartridgeFE.prototype.setBus = function (bus) {
        this._bus = bus;
        this._bus.event.read.addHandler(CartridgeFE._onBusAccess, this);
        this._bus.event.write.addHandler(CartridgeFE._onBusAccess, this);
        return this;
    };
    CartridgeFE.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_FE;
    };
    CartridgeFE._onBusAccess = function (accessType, self) {
        var lastAddressBusValue = self._lastAddressBusValue;
        self._lastAddressBusValue = self._bus.getLastAddresBusValue();
        if (self._lastAddressBusValue === lastAddressBusValue) {
            return;
        }
        if (self._lastAccessWasFE) {
            self._bank = (self._bus.getLastDataBusValue() & 0x20) > 0 ? self._bank0 : self._bank1;
        }
        self._lastAccessWasFE = self._bus.getLastAddresBusValue() === 0x01fe;
    };
    return CartridgeFE;
}(AbstractCartridge_1.default));
exports.default = CartridgeFE;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],102:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Cartridge2k_1 = require("./Cartridge2k");
var Cartridge4k_1 = require("./Cartridge4k");
var CartridgeF8_1 = require("./CartridgeF8");
var CartridgeF6_1 = require("./CartridgeF6");
var CartridgeE0_1 = require("./CartridgeE0");
var CartridgeFE_1 = require("./CartridgeFE");
var Cartridge3F_1 = require("./Cartridge3F");
var Cartridge3E_1 = require("./Cartridge3E");
var CartridgeUA_1 = require("./CartridgeUA");
var CartridgeFA_1 = require("./CartridgeFA");
var CartridgeE7_1 = require("./CartridgeE7");
var CartridgeF0_1 = require("./CartridgeF0");
var CartridgeEF_1 = require("./CartridgeEF");
var CartridgeF4_1 = require("./CartridgeF4");
var CartridgeFA2_1 = require("./CartridgeFA2");
var CartridgeSupercharger_1 = require("./CartridgeSupercharger");
var CartridgeDPC_1 = require("./CartridgeDPC");
var CartridgeDPCPlus_1 = require("./CartridgeDPCPlus");
var CartridgeCDF_1 = require("./CartridgeCDF");
var Cartridge0840_1 = require("./Cartridge0840");
var CartridgeInfo_1 = require("./CartridgeInfo");
var CartridgeDetector_1 = require("./CartridgeDetector");
var CartridgeFactory = (function () {
    function CartridgeFactory() {
    }
    CartridgeFactory.prototype.createCartridge = function (buffer, cartridgeType) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var cartridge;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cartridge = this._createCartridge(buffer, cartridgeType);
                        return [4, cartridge.init()];
                    case 1:
                        _a.sent();
                        return [2, cartridge];
                }
            });
        });
    };
    CartridgeFactory.prototype._createCartridge = function (buffer, cartridgeType) {
        if (typeof cartridgeType === 'undefined') {
            var detector = new CartridgeDetector_1.default();
            cartridgeType = detector.detectCartridgeType(buffer);
        }
        switch (cartridgeType) {
            case CartridgeInfo_1.default.CartridgeType.vanilla_2k:
                return new Cartridge2k_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.vanilla_4k:
                return new Cartridge4k_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_F8:
                return new CartridgeF8_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_E0:
                return new CartridgeE0_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_3F:
                return new Cartridge3F_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_FE:
                return new CartridgeFE_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_UA:
                return new CartridgeUA_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_DPC:
                return new CartridgeDPC_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_8k_econobanking:
                return new Cartridge0840_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_12k_FA:
                return new CartridgeFA_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_16k_F6:
                return new CartridgeF6_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_16k_E7:
                return new CartridgeE7_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_FA2:
                return new CartridgeFA2_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_32k_F4:
                return new CartridgeF4_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_64k_F0:
                return new CartridgeF0_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_64k_EF:
                return new CartridgeEF_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_3E:
                return new Cartridge3E_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_supercharger:
                return new CartridgeSupercharger_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_dpc_plus:
                return new CartridgeDPCPlus_1.default(buffer);
            case CartridgeInfo_1.default.CartridgeType.bankswitch_cdf:
                return new CartridgeCDF_1.default(buffer);
            default:
                throw new Error("invalid or unsupported cartridge image");
        }
    };
    return CartridgeFactory;
}());
exports.default = CartridgeFactory;

},{"./Cartridge0840":83,"./Cartridge2k":84,"./Cartridge3E":85,"./Cartridge3F":86,"./Cartridge4k":87,"./CartridgeCDF":88,"./CartridgeDPC":89,"./CartridgeDPCPlus":90,"./CartridgeDetector":91,"./CartridgeE0":92,"./CartridgeE7":93,"./CartridgeEF":94,"./CartridgeF0":95,"./CartridgeF4":96,"./CartridgeF6":97,"./CartridgeF8":98,"./CartridgeFA":99,"./CartridgeFA2":100,"./CartridgeFE":101,"./CartridgeInfo":103,"./CartridgeSupercharger":105,"./CartridgeUA":106,"tslib":25}],103:[function(require,module,exports){
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

},{}],104:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CartridgeInterface;
(function (CartridgeInterface) {
    var TrapPayload = (function () {
        function TrapPayload(reason, cartridge, message) {
            this.reason = reason;
            this.cartridge = cartridge;
            this.message = message;
        }
        return TrapPayload;
    }());
    CartridgeInterface.TrapPayload = TrapPayload;
})(CartridgeInterface || (CartridgeInterface = {}));
exports.default = CartridgeInterface;

},{}],105:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var Header_1 = require("./supercharger/Header");
var blob_1 = require("./supercharger/blob");
var CartridgeSupercharger = (function (_super) {
    tslib_1.__extends(CartridgeSupercharger, _super);
    function CartridgeSupercharger(buffer) {
        var _this = _super.call(this) || this;
        _this._loadCount = 0;
        _this._loads = null;
        _this._headers = null;
        _this._rom = new Uint8Array(0x800);
        _this._ramBanks = new Array(3);
        _this._bank0 = null;
        _this._bank1 = null;
        _this._bank1Type = 1;
        _this._transitionCount = 0;
        _this._pendingWriteData = 0;
        _this._pendingWrite = false;
        _this._lastAddressBusValue = -1;
        _this._writeRamEnabled = false;
        _this._loadInProgress = false;
        _this._loadTimestamp = 0;
        _this._cpuTimeProvider = null;
        if (buffer.length % 8448 !== 0) {
            throw new Error("not a supercharger image --- invalid size");
        }
        _this._loadCount = buffer.length / 8448;
        _this._loads = new Array(_this._loadCount);
        _this._headers = new Array(_this._loadCount);
        for (var i = 0; i < _this._loadCount; i++) {
            _this._loads[i] = new Uint8Array(8448);
        }
        for (var i = 0; i < 8448; i++) {
            for (var j = 0; j < _this._loadCount; j++) {
                _this._loads[j][i] = buffer[j * 8448 + i];
            }
        }
        for (var i = 0; i < _this._loadCount; i++) {
            _this._headers[i] = new Header_1.default(_this._loads[i]);
            if (!_this._headers[i].verify()) {
                console.log("load " + i + " has invalid checksum");
            }
        }
        for (var i = 0; i < 3; i++) {
            _this._ramBanks[i] = new Uint8Array(0x0800);
        }
        _this._setupRom();
        _this.reset();
        return _this;
    }
    CartridgeSupercharger.prototype.reset = function () {
        this._setBankswitchMode(0);
        this._transitionCount = 0;
        this._pendingWrite = false;
        this._pendingWriteData = 0;
        this._lastAddressBusValue = -1;
        this._writeRamEnabled = false;
        this._loadInProgress = false;
        this._loadTimestamp = 0;
    };
    CartridgeSupercharger.prototype.setBus = function (bus) {
        this._bus = bus;
        this._bus.event.read.addHandler(CartridgeSupercharger._onBusAccess, this);
        this._bus.event.write.addHandler(CartridgeSupercharger._onBusAccess, this);
        return this;
    };
    CartridgeSupercharger.prototype.setCpuTimeProvider = function (provider) {
        this._cpuTimeProvider = provider;
        return this;
    };
    CartridgeSupercharger.prototype.setRng = function (rng) {
        this._rng = rng;
        return this;
    };
    CartridgeSupercharger.prototype.read = function (address) {
        return this._access(address, this._bus.getLastDataBusValue());
    };
    CartridgeSupercharger.prototype.peek = function (address) {
        address &= 0x0fff;
        return address < 0x0800 ? this._bank0[address] : this._bank1[address & 0x07ff];
    };
    CartridgeSupercharger.prototype.write = function (address, value) {
        this._access(address, value);
    };
    CartridgeSupercharger.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_supercharger;
    };
    CartridgeSupercharger._onBusAccess = function (type, self) {
        var address = self._bus.getLastAddresBusValue();
        if (address !== self._lastAddressBusValue && !self._loadInProgress) {
            if (self._transitionCount <= 5) {
                self._transitionCount++;
            }
            self._lastAddressBusValue = address;
        }
    };
    CartridgeSupercharger.prototype._access = function (address, value) {
        address &= 0x0fff;
        if (this._loadInProgress) {
            if ((this._cpuTimeProvider() - this._loadTimestamp) > 1E-3) {
                this._loadInProgress = false;
            }
            else {
                return value;
            }
        }
        var readValue = address < 0x0800 ? this._bank0[address] : this._bank1[address & 0x07ff];
        if ((address & 0x0f00) === 0 && (!this._pendingWrite || !this._writeRamEnabled)) {
            this._pendingWriteData = address & 0x00ff;
            this._transitionCount = 0;
            this._pendingWrite = true;
            return readValue;
        }
        if (address === 0x0ff8) {
            this._setBankswitchMode((this._pendingWriteData & 28) >>> 2);
            this._writeRamEnabled = (this._pendingWriteData & 0x02) > 0;
            this._pendingWrite = false;
            return readValue;
        }
        if (address === 0x0ff9 && this._bank1Type === 1 && ((this._lastAddressBusValue & 0x1fff) < 0xff)) {
            this._loadIntoRam(value);
            return readValue;
        }
        if (this._pendingWrite && this._writeRamEnabled && this._transitionCount === 5) {
            this._pendingWrite = false;
            if (address < 0x0800) {
                this._bank0[address] = this._pendingWriteData;
            }
            else if (this._bank1Type === 0) {
                this._bank1[address & 0x07ff] = this._pendingWriteData;
            }
            else {
                return readValue;
            }
            return this._pendingWriteData;
        }
        return readValue;
    };
    CartridgeSupercharger.prototype._setBankswitchMode = function (mode) {
        switch (mode) {
            case 0:
                return this._configureBanks(2, 1);
            case 1:
                return this._configureBanks(0, 1);
            case 2:
                return this._configureBanks(2, 0, 0);
            case 3:
                return this._configureBanks(0, 0, 2);
            case 4:
                return this._configureBanks(2, 1);
            case 5:
                return this._configureBanks(1, 1);
            case 6:
                return this._configureBanks(2, 0, 1);
            case 7:
                return this._configureBanks(1, 0, 2);
            default:
                throw new Error('invalid bankswitching mode');
        }
    };
    CartridgeSupercharger.prototype._configureBanks = function (bank0, bank1Type, bank1) {
        if (bank1 === void 0) { bank1 = 0; }
        this._bank0 = this._ramBanks[bank0];
        this._bank1Type = bank1Type;
        this._bank1 = bank1Type === 0 ? this._ramBanks[bank1] : this._rom;
    };
    CartridgeSupercharger.prototype._setupRom = function () {
        for (var i = 0; i < 0x0800; i++) {
            this._rom[i] = 0;
        }
        for (var i = 0; i < blob_1.bios.length; i++) {
            this._rom[i] = blob_1.bios[i];
        }
        this._rom[0x07ff] = this._rom[0x07fd] = 0xf8;
        this._rom[0x07fe] = this._rom[0x07fc] = 0x07;
    };
    CartridgeSupercharger.prototype._loadIntoRam = function (loadId) {
        var loadIndex;
        for (loadIndex = 0; loadIndex < this._loadCount; loadIndex++) {
            if (this._headers[loadIndex].multiloadId === loadId || this._loadCount === 1) {
                break;
            }
        }
        if (loadIndex >= this._loadCount) {
            console.log("no load with id " + loadId);
        }
        var header = this._headers[loadIndex], load = this._loads[loadIndex];
        for (var blockIdx = 0; blockIdx < header.blockCount; blockIdx++) {
            var location_1 = header.blockLocation[blockIdx];
            var bank = location_1 & 0x03;
            if (bank > 2) {
                bank = 0;
                console.log("invalid bank for block " + blockIdx + ", load " + loadIndex);
            }
            var base = ((location_1 & 28) >>> 2) * 256;
            var checksum = location_1 + header.blockChecksum[blockIdx];
            for (var i = 0; i < 256; i++) {
                checksum += load[256 * blockIdx + i];
                this._ramBanks[bank][base + i] = load[256 * blockIdx + i];
            }
            if ((checksum & 0xff) !== 0x55) {
                console.log("load " + loadIndex + ", block " + blockIdx + ": invalid checksum");
            }
        }
        this._rom[0x7f0] = header.controlWord;
        this._rom[0x7f1] = this._rng.int(0xff);
        this._rom[0x7f2] = header.startAddressLow;
        this._rom[0x7f3] = header.startAddressHigh;
        this._loadInProgress = true;
        this._loadTimestamp = this._cpuTimeProvider();
    };
    return CartridgeSupercharger;
}(AbstractCartridge_1.default));
exports.default = CartridgeSupercharger;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./supercharger/Header":108,"./supercharger/blob":109,"tslib":25}],106:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var AbstractCartridge_1 = require("./AbstractCartridge");
var CartridgeInfo_1 = require("./CartridgeInfo");
var cartridgeUtil = require("./util");
var CartridgeUA = (function (_super) {
    tslib_1.__extends(CartridgeUA, _super);
    function CartridgeUA(buffer) {
        var _this = _super.call(this) || this;
        _this._bus = null;
        _this._bank = null;
        _this._bank0 = new Uint8Array(0x1000);
        _this._bank1 = new Uint8Array(0x1000);
        if (buffer.length !== 0x2000) {
            throw new Error("buffer is not an 8k cartridge image: wrong length " + buffer.length);
        }
        for (var i = 0; i < 0x1000; i++) {
            _this._bank0[i] = buffer[i];
            _this._bank1[i] = buffer[0x1000 + i];
        }
        _this.reset();
        return _this;
    }
    CartridgeUA.matchesBuffer = function (buffer) {
        var signatureCounts = cartridgeUtil.searchForSignatures(buffer, [
            [0x8d, 0x40, 0x02],
            [0xad, 0x40, 0x02],
            [0xbd, 0x1f, 0x02]
        ]);
        for (var i = 0; i < signatureCounts.length; i++) {
            if (signatureCounts[i] > 0) {
                return true;
            }
        }
        return false;
    };
    CartridgeUA.prototype.reset = function () {
        this._bank = this._bank0;
    };
    CartridgeUA.prototype.read = function (address) {
        return this._bank[address & 0x0fff];
    };
    CartridgeUA.prototype.setBus = function (bus) {
        this._bus = bus;
        bus.event.read.addHandler(CartridgeUA._onBusAccess, this);
        bus.event.write.addHandler(CartridgeUA._onBusAccess, this);
        return this;
    };
    CartridgeUA.prototype.getType = function () {
        return CartridgeInfo_1.default.CartridgeType.bankswitch_8k_UA;
    };
    CartridgeUA._onBusAccess = function (accessType, self) {
        switch (self._bus.getLastAddresBusValue()) {
            case 0x0220:
                self._bank = self._bank0;
                break;
            case 0x0240:
                self._bank = self._bank1;
                break;
        }
    };
    return CartridgeUA;
}(AbstractCartridge_1.default));
exports.default = CartridgeUA;

},{"./AbstractCartridge":82,"./CartridgeInfo":103,"./util":110,"tslib":25}],107:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var thumbulator_ts_1 = require("thumbulator.ts");
var microevent_ts_1 = require("microevent.ts");
var hex_1 = require("../../../../tools/hex");
function hostIsLittleEndian() {
    var buffer8 = new Uint8Array([1, 2, 3, 4]), buffer32 = new Uint32Array(buffer8.buffer);
    return buffer32[0] === 0x04030201;
}
var Soc = (function () {
    function Soc(blx32Handler) {
        if (blx32Handler === void 0) { blx32Handler = function () { return 3; }; }
        var _this = this;
        this.trap = new microevent_ts_1.Event();
        this._thumbulatorBus = {
            read16: function (address) {
                if (address & 0x01) {
                    _this._triggerTrap("unaligned 16 bit ARM read from " + hex_1.encode(address, 8, false));
                    return 0;
                }
                var region = address >>> 28, addr = address & 0x0fffffff;
                switch (region) {
                    case 0x0:
                        if (addr < 0x8000) {
                            return _this.getRom16(addr);
                        }
                        break;
                    case 0x4:
                        if (addr < 0x2000) {
                            return _this.getRam16(addr);
                        }
                        break;
                    case 0xe:
                        switch (addr) {
                            case 0x001fc000:
                                return _this._armMamcr;
                        }
                        break;
                    default:
                }
                _this._triggerTrap("invalid 16 bit ARM read from " + hex_1.encode(address, 8, false));
            },
            read32: function (address) {
                if (address & 0x03) {
                    _this._triggerTrap("unaligned 32 bit ARM read from " + hex_1.encode(address, 8, false));
                    return 0;
                }
                var region = address >>> 28, addr = address & 0x0fffffff;
                switch (region) {
                    case 0x0:
                        if (addr < 0x8000) {
                            return _this.getRom32(addr);
                        }
                        break;
                    case 0x4:
                        if (addr < 0x2000) {
                            return _this.getRam32(addr);
                        }
                        break;
                    case 0xe:
                        switch (addr) {
                            case 0x8004:
                            case 0x8008:
                                return 0;
                        }
                        break;
                    default:
                }
                _this._triggerTrap("invalid 32 bit ARM read from " + hex_1.encode(address, 8, false));
            },
            write16: function (address, value) {
                if (address & 0x01) {
                    _this._triggerTrap("unaligned 16 bit ARM write: " + hex_1.encode(value, 4) + " -> " + hex_1.encode(address, 8, false));
                    return;
                }
                var region = address >>> 28, addr = address & 0x0fffffff;
                switch (region) {
                    case 0x04:
                        if (addr < 0x2000) {
                            _this.setRam16(addr, value & 0xffff);
                            return;
                        }
                        break;
                    case 0xe:
                        switch (addr) {
                            case 0x001fc000:
                                _this._armMamcr = value;
                                return;
                        }
                        break;
                }
                _this._triggerTrap("invalid 16 bit ARM write: " + hex_1.encode(value, 4) + " -> " + hex_1.encode(address, 8, false));
            },
            write32: function (address, value) {
                if (address & 0x03) {
                    _this._triggerTrap("unaligned 32 bit ARM write: " + hex_1.encode(value, 8, false) + " -> " + hex_1.encode(address, 8, false));
                    return;
                }
                var region = address >>> 28, addr = address & 0x0fffffff;
                switch (region) {
                    case 0x4:
                        if (addr < 0x2000) {
                            _this.setRam32(addr, value);
                            return;
                        }
                    case 0xe:
                        switch (addr) {
                            case 0x8004:
                            case 0x8008:
                                return;
                        }
                        break;
                }
                _this._triggerTrap("invalid 32 bit ARM write: " + hex_1.encode(value, 8, false) + " -> " + hex_1.encode(address, 8, false));
            }
        };
        this._romBuffer = new ArrayBuffer(0x8000);
        this._ramBuffer = new ArrayBuffer(0x2000);
        this._armMamcr = 0;
        this._thumbulator = null;
        if (hostIsLittleEndian()) {
            this.getRom16 = function (address) { return _this._rom16[address >>> 1]; };
            this.getRom32 = function (address) { return _this._rom32[address >>> 2]; };
            this.getRam16 = function (address) { return _this._ram16[address >>> 1]; };
            this.getRam32 = function (address) { return _this._ram32[address >>> 2]; };
            this.setRam16 = function (address, value) { return (_this._ram16[address >>> 1] = value); };
            this.setRam32 = function (address, value) { return (_this._ram32[address >>> 2] = value); };
        }
        else {
            this.getRom16 = function (address) { return _this._rom8[address] | (_this._rom8[address + 1] << 8); };
            this.getRom32 = function (address) {
                return _this._rom8[address] |
                    (_this._rom8[address + 1] << 8) |
                    (_this._rom8[address + 2] << 16) |
                    (_this._rom8[address + 3] << 24);
            };
            this.getRam16 = function (address) { return _this._ram8[address] | (_this._ram8[address + 1] << 8); };
            this.getRam32 = function (address) {
                return _this._ram8[address] |
                    (_this._ram8[address + 1] << 8) |
                    (_this._ram8[address + 2] << 16) |
                    (_this._ram8[address + 3] << 24);
            };
            this.setRam16 = function (address, value) {
                _this._ram8[address] = value & 0xff;
                _this._ram8[address + 1] = (value >>> 8) & 0xff;
            };
            this.setRam32 = function (address, value) {
                _this._ram8[address] = value & 0xff;
                _this._ram8[address + 1] = (value >>> 8) & 0xff;
                _this._ram8[address + 2] = (value >>> 16) & 0xff;
                _this._ram8[address + 3] = (value >>> 24) & 0xff;
            };
        }
        this._rom8 = new Uint8Array(this._romBuffer);
        this._rom16 = new Uint16Array(this._romBuffer);
        this._rom32 = new Uint32Array(this._romBuffer);
        this._ram8 = new Uint8Array(this._ramBuffer);
        this._ram16 = new Uint16Array(this._ramBuffer);
        this._ram32 = new Uint32Array(this._ramBuffer);
        this._thumbulator = new thumbulator_ts_1.default(this._thumbulatorBus, {
            stopAddress: 32772,
            trapOnBx32: blx32Handler
        });
        this.reset();
    }
    Soc.prototype.init = function () {
        return this._thumbulator.init();
    };
    Soc.prototype.reset = function () { };
    Soc.prototype.getRom = function () {
        return this._rom8;
    };
    Soc.prototype.getRam = function () {
        return this._ram8;
    };
    Soc.prototype.run = function (entry) {
        this._thumbulator.reset();
        this._thumbulator.enableDebug(false);
        for (var i = 0; i <= 12; i++) {
            this._thumbulator.writeRegister(i, 0);
        }
        this._thumbulator.writeRegister(13, 0x40001fb4);
        this._thumbulator.writeRegister(14, 32772 + 1);
        this._thumbulator.writeRegister(15, entry);
        this._armMamcr = 0;
        var trap = this._thumbulator.run(500000);
        if (trap !== 20 && trap !== 10) {
            this._triggerTrap("ARM execution trapped: " + trap);
        }
    };
    Soc.prototype.getThumbulator = function () {
        return this._thumbulator;
    };
    Soc.prototype._triggerTrap = function (message) {
        this._thumbulator.abort();
        this.trap.dispatch(message);
    };
    return Soc;
}());
exports.default = Soc;

},{"../../../../tools/hex":134,"microevent.ts":10,"thumbulator.ts":23}],108:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Header = (function () {
    function Header(buffer) {
        this.blockLocation = null;
        this.blockChecksum = null;
        this.startAddressLow = buffer[0x2000];
        this.startAddressHigh = buffer[0x2001];
        this.controlWord = buffer[0x2002];
        this.blockCount = buffer[0x2003];
        this.checksum = buffer[0x2004];
        this.multiloadId = buffer[0x2005];
        this.progressBarSpeedLow = buffer[0x2006];
        this.progressBarSpeedHigh = buffer[0x2007];
        this.blockLocation = new Uint8Array(this.blockCount);
        this.blockChecksum = new Uint8Array(this.blockCount);
        for (var i = 0; i < this.blockCount; i++) {
            this.blockLocation[i] = buffer[0x2000 + 16 + i];
            this.blockChecksum[i] = buffer[0x2000 + 64 + i];
        }
    }
    Header.prototype.verify = function () {
        var checksum = this.startAddressLow +
            this.startAddressHigh +
            this.controlWord +
            this.blockCount +
            this.checksum +
            this.multiloadId +
            this.progressBarSpeedLow +
            this.progressBarSpeedHigh;
        return (checksum & 0xff) === 0x55;
    };
    return Header;
}());
exports.default = Header;

},{}],109:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var base64_1 = require("../../../../tools/base64");
exports.bios = base64_1.decode('pfqFgEwY+HjYqQCi/5qqqJUA6ND7TBj4ogCtBvCN+P+gAKIolATKEPuiHJSByhD7qQCFG4UchR2FHoUfhRmFGoUIhQGpEIUhhQKiB8rK0P2pAIUghRCFEYUChSqpBYUKqf+FDYUOhQ+FhIWFqfCFg6l0hQmpDIUVqR+FF4WCqQeFGaIIoACFAojQ+4UChQKpAoUChQCFAoUChQKpAIUAyhDkBoNmhCaFpYOFDaWEhQ6lhYUPpoLKhoKGF+AK0MOpAoUBohygAIQZhAmUgcoQ+6IArADw6rwA9+jQ9qILvRL5lfDKEPilgEzwAKIGvR35lfDKEPiu8P+GgLwA8K3x/67y/4b0rvP/hvWi/6AAmkzwAI35/637/9D7TOv4jfj/TAAA');

},{"../../../../tools/base64":131}],110:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function searchForSignatures(buffer, signatures) {
    var candidates = [], counts = signatures.map(function (signature) { return 0; });
    for (var i = 0; i < buffer.length; i++) {
        for (var iCandidate = 0; iCandidate < candidates.length; iCandidate++) {
            var candidate = candidates[iCandidate], signature = signatures[candidate.signature];
            if (buffer[i] === signature[candidate.nextIndex]) {
                if (++candidate.nextIndex === signature.length) {
                    counts[candidate.signature]++;
                    candidates.splice(iCandidate, 1);
                    iCandidate--;
                }
            }
            else {
                candidates.splice(iCandidate, 1);
                iCandidate--;
            }
        }
        for (var iSignature = 0; iSignature < signatures.length; iSignature++) {
            var signature = signatures[iSignature];
            if (signature.length > 0 && buffer[i] === signature[0]) {
                if (signature.length === 1) {
                    counts[iSignature]++;
                }
                else {
                    candidates.push({
                        signature: iSignature,
                        nextIndex: 1
                    });
                }
            }
        }
    }
    return counts;
}
exports.searchForSignatures = searchForSignatures;
function searchForSignature(buffer, signature) {
    for (var i = 0; i < buffer.length; i++) {
        var j = void 0;
        for (j = 0; j < signature.length && (buffer[i + j] === signature[j] || signature[j] < 0); j++) { }
        if (j === signature.length) {
            return i;
        }
    }
    return -1;
}
exports.searchForSignature = searchForSignature;

},{}],111:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Ball = (function () {
    function Ball(_collisionMask, _flushLineCache) {
        this._collisionMask = _collisionMask;
        this._flushLineCache = _flushLineCache;
        this.color = 0xffffffff;
        this.collision = 0;
        this._enabledOld = false;
        this._enabledNew = false;
        this._enabled = false;
        this._hmmClocks = 0;
        this._counter = 0;
        this._moving = false;
        this._width = 1;
        this._effectiveWidth = 0;
        this._lastMovementTick = 0;
        this._rendering = false;
        this._renderCounter = -4;
        this._widths = new Uint8Array([1, 2, 4, 8]);
        this._delaying = false;
        this.reset();
    }
    Ball.prototype.reset = function () {
        this.color = 0xffffffff;
        this.collision = 0;
        this._width = 1;
        this._enabledOld = false;
        this._enabledNew = false;
        this._enabled = false;
        this._counter = 0;
        this._rendering = false;
        this._renderCounter = -4;
        this._moving = false;
        this._hmmClocks = 0;
        this._delaying = false;
        this._effectiveWidth = 0;
        this._lastMovementTick = 0;
    };
    Ball.prototype.enabl = function (value) {
        var enabledNewOldValue = this._enabledNew;
        this._enabledNew = (value & 2) > 0;
        if (enabledNewOldValue !== this._enabledNew && !this._delaying) {
            this._flushLineCache();
            this._updateEnabled();
        }
    };
    Ball.prototype.hmbl = function (value) {
        this._hmmClocks = (value >>> 4) ^ 0x8;
    };
    Ball.prototype.resbl = function (counter) {
        this._counter = counter;
        this._rendering = true;
        this._renderCounter = -4 + (counter - 157);
    };
    Ball.prototype.ctrlpf = function (value) {
        var width = this._widths[(value & 0x30) >>> 4];
        if (width !== this._width) {
            this._flushLineCache();
        }
        this._width = width;
    };
    Ball.prototype.vdelbl = function (value) {
        var oldDelaying = this._delaying;
        this._delaying = (value & 0x01) > 0;
        if (oldDelaying !== this._delaying) {
            this._flushLineCache();
            this._updateEnabled();
        }
    };
    Ball.prototype.startMovement = function () {
        this._moving = true;
    };
    Ball.prototype.movementTick = function (clock, apply) {
        this._lastMovementTick = this._counter;
        if (clock === this._hmmClocks) {
            this._moving = false;
        }
        if (this._moving && apply) {
            this.tick(false);
        }
        return this._moving;
    };
    Ball.prototype.tick = function (isReceivingHclock) {
        this.collision = this._rendering && this._renderCounter >= 0 && this._enabled ? 0 : this._collisionMask;
        var starfieldEffect = this._moving && isReceivingHclock;
        if (this._counter === 156) {
            var starfieldDelta = (this._counter - this._lastMovementTick + 160) % 4;
            this._rendering = true;
            this._renderCounter = -4;
            if (starfieldEffect && starfieldDelta === 3 && this._width < 4) {
                this._renderCounter++;
            }
            switch (starfieldDelta) {
                case 3:
                    this._effectiveWidth = this._width === 1 ? 2 : this._width;
                    break;
                case 2:
                    this._effectiveWidth = 0;
                    break;
                default:
                    this._effectiveWidth = this._width;
                    break;
            }
        }
        else if (this._rendering && ++this._renderCounter >= (starfieldEffect ? this._effectiveWidth : this._width)) {
            this._rendering = false;
        }
        if (++this._counter >= 160) {
            this._counter = 0;
        }
    };
    Ball.prototype.getPixel = function (colorIn) {
        return this.collision ? colorIn : this.color;
    };
    Ball.prototype.shuffleStatus = function () {
        var oldEnabledOld = this._enabledOld;
        this._enabledOld = this._enabledNew;
        if (this._delaying && this._enabledOld !== oldEnabledOld) {
            this._flushLineCache();
            this._updateEnabled();
        }
    };
    Ball.prototype.setColor = function (color) {
        if (color !== this.color && this._enabled) {
            this._flushLineCache();
        }
        this.color = color;
    };
    Ball.prototype._updateEnabled = function () {
        this._enabled = this._delaying ? this._enabledOld : this._enabledNew;
    };
    return Ball;
}());
exports.default = Ball;

},{}],112:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DelayQueue = (function () {
    function DelayQueue(_length, size) {
        this._length = _length;
        this._nextIndex = 0;
        this._indices = new Uint8Array(0xff);
        this._queue = new Array(this._length);
        for (var i = 0; i < this._length; i++) {
            this._queue[i] = new QueueEntry(size);
        }
    }
    DelayQueue.prototype.reset = function () {
        for (var i = 0; i < this._length; i++) {
            this._queue[i].nextIndex = 0;
        }
    };
    DelayQueue.prototype.push = function (address, value, delay) {
        if (delay >= this._length) {
            throw new Error('delay exceeds queue length');
        }
        var currentIndex = this._indices[address];
        if (currentIndex < this._length) {
            this._queue[currentIndex].remove(address);
        }
        var index = (this._nextIndex + delay) % this._length;
        this._queue[index].push(address, value);
        this._indices[address] = index;
        return this;
    };
    DelayQueue.prototype.execute = function (handler, scope) {
        var entry = this._queue[this._nextIndex];
        this._nextIndex = (this._nextIndex + 1) % this._length;
        for (var i = 0; i < entry.nextIndex; i++) {
            handler(entry.addresses[i], entry.values[i], scope);
            this._indices[entry.addresses[i]] = 0xff;
        }
        entry.nextIndex = 0;
    };
    return DelayQueue;
}());
exports.default = DelayQueue;
var QueueEntry = (function () {
    function QueueEntry(size) {
        this.size = size;
        this.nextIndex = 0;
        this.addresses = new Uint8Array(size);
        this.values = new Uint8Array(size);
    }
    QueueEntry.prototype.push = function (address, value) {
        if (this.nextIndex >= this.size) {
            throw new Error('delay queue overflow');
        }
        this.addresses[this.nextIndex] = address;
        this.values[this.nextIndex] = value;
        this.nextIndex++;
    };
    QueueEntry.prototype.remove = function (address) {
        var i;
        for (i = 0; i < this.nextIndex; i++) {
            if (this.addresses[i] === address) {
                break;
            }
        }
        if (i < this.nextIndex) {
            this.addresses[i] = this.addresses[this.nextIndex - 1];
            this.values[i] = this.values[this.nextIndex - 1];
            this.nextIndex--;
        }
    };
    return QueueEntry;
}());

},{}],113:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var FrameManager = (function () {
    function FrameManager(_config) {
        this._config = _config;
        this.newFrame = new microevent_ts_1.Event();
        this.vblank = false;
        this.surfaceBuffer = null;
        this._vblankLines = 0;
        this._kernelLines = 0;
        this._overscanLines = 0;
        this._linesWithoutVsync = 0;
        this._state = 0;
        this._vsync = false;
        this._lineInState = 0;
        this._surfaceFactory = null;
        this._surface = null;
        this._frameStart = -1;
        switch (this._config.tvMode) {
            case 0:
                this._vblankLines = 40;
                this._kernelLines = 192;
                this._overscanLines = 30;
                break;
            case 1:
            case 2:
                this._vblankLines = 48;
                this._kernelLines = 228;
                this._overscanLines = 36;
                break;
            default:
                throw new Error("invalid tv mode " + this._config.tvMode);
        }
        this._frameStart = this._config.frameStart;
        this.reset();
    }
    FrameManager.prototype.reset = function () {
        this.vblank = false;
        this.surfaceBuffer = null;
        this._linesWithoutVsync = 0;
        this._state = 0;
        this._vsync = false;
        this._lineInState = 0;
        this._surface = null;
    };
    FrameManager.prototype.nextLine = function () {
        if (!this._surfaceFactory) {
            return;
        }
        this._lineInState++;
        switch (this._state) {
            case 0:
            case 1:
                if (++this._linesWithoutVsync > 150) {
                    this._setState(2);
                }
                break;
            case 2:
                if (this._frameStart >= 0) {
                    if (this._lineInState > this._frameStart) {
                        this._startFrame();
                    }
                }
                else {
                    if (this._lineInState >=
                        (this.vblank ? this._vblankLines : this._vblankLines - 10)) {
                        this._startFrame();
                    }
                }
                break;
            case 3:
                if (this._lineInState >= this._kernelLines + 20) {
                    this._finalizeFrame();
                }
                break;
            case 4:
                if (this._lineInState >= this._overscanLines - 20) {
                    this._setState(0);
                }
                break;
        }
    };
    FrameManager.prototype.isRendering = function () {
        return this._state === 3 && !!this._surface;
    };
    FrameManager.prototype.setVblank = function (vblank) {
        if (this._surfaceFactory) {
            this.vblank = vblank;
        }
    };
    FrameManager.prototype.setVsync = function (vsync) {
        if (!this._surfaceFactory || vsync === this._vsync) {
            return;
        }
        this._vsync = vsync;
        switch (this._state) {
            case 0:
                this._linesWithoutVsync = 0;
            case 2:
            case 4:
                if (vsync) {
                    this._setState(1);
                }
                break;
            case 1:
                if (!vsync) {
                    this._setState(2);
                }
                break;
            case 3:
                if (vsync) {
                    this._finalizeFrame();
                }
                break;
        }
    };
    FrameManager.prototype.getHeight = function () {
        return this._kernelLines + 20;
    };
    FrameManager.prototype.setSurfaceFactory = function (factory) {
        this._surfaceFactory = factory;
    };
    FrameManager.prototype.getCurrentLine = function () {
        return this._state === 3 ? this._lineInState : 0;
    };
    FrameManager.prototype.getDebugState = function () {
        return this._getReadableState() + ", line = " + this._lineInState + ", " + ("vblank = " + (this.vblank ? '1' : '0'));
    };
    FrameManager.prototype._getReadableState = function () {
        switch (this._state) {
            case 0:
                return "wait for vsync start";
            case 1:
                return "wait for vsync end";
            case 2:
                return "wait for frame start";
            case 3:
                return "frame";
            case 4:
                return "overscan";
        }
    };
    FrameManager.prototype._startFrame = function () {
        this._setState(3);
        this._surface = this._surfaceFactory();
        this.surfaceBuffer = this._surface.getBuffer();
    };
    FrameManager.prototype._finalizeFrame = function () {
        if (this._state !== 3) {
            throw new Error("finalize frame in invalid state " + this._state);
        }
        this.newFrame.dispatch(this._surface);
        this._setState(4);
    };
    FrameManager.prototype._setState = function (newState) {
        this._state = newState;
        this._lineInState = 0;
    };
    return FrameManager;
}());
exports.default = FrameManager;

},{"microevent.ts":10}],114:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LatchedInput = (function () {
    function LatchedInput(_switch) {
        this._switch = _switch;
        this._modeLatched = false;
        this._latchedValue = 0;
        this.reset();
    }
    LatchedInput.prototype.reset = function () {
        this._modeLatched = false;
        this._latchedValue = 0;
    };
    LatchedInput.prototype.vblank = function (value) {
        if (value & 0x40) {
            this._modeLatched = true;
        }
        else {
            this._modeLatched = false;
            this._latchedValue = 0x80;
        }
    };
    LatchedInput.prototype.inpt = function () {
        var value = this._switch.read() ? 0 : 0x80;
        if (this._modeLatched) {
            this._latchedValue &= value;
            value = this._latchedValue;
        }
        return value;
    };
    return LatchedInput;
}());
exports.default = LatchedInput;

},{}],115:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var drawCounterDecodes_1 = require("./drawCounterDecodes");
var Missile = (function () {
    function Missile(_collisionMask, _flushLineCache) {
        this._collisionMask = _collisionMask;
        this._flushLineCache = _flushLineCache;
        this.color = 0xffffffff;
        this.collision = 0;
        this._enabled = false;
        this._enam = false;
        this._resmp = -1;
        this._hmmClocks = 0;
        this._counter = 0;
        this._moving = false;
        this._width = 1;
        this._effectiveWidth = 0;
        this._lastMovementTick = 0;
        this._rendering = false;
        this._renderCounter = -4;
        this._widths = new Uint8Array([1, 2, 4, 8]);
        this.reset();
    }
    Missile.prototype.reset = function () {
        this.color = 0xffffffff;
        this._width = 1;
        this._enabled = false;
        this._counter = 0;
        this._rendering = false;
        this._renderCounter = -4;
        this._moving = false;
        this._hmmClocks = 0;
        this._decodes = drawCounterDecodes_1.decodesMissile[0];
        this._resmp = -1;
        this._enam = false;
        this._effectiveWidth = 0;
        this._lastMovementTick = 0;
    };
    Missile.prototype.enam = function (value) {
        var enam = (value & 2) > 0, enabled = enam && this._resmp === 0;
        if (enam !== this._enam || enabled !== this._enabled) {
            this._flushLineCache();
        }
        this._enam = enam;
        this._enabled = enabled;
    };
    Missile.prototype.hmm = function (value) {
        this._hmmClocks = (value >>> 4) ^ 0x8;
    };
    Missile.prototype.resm = function (counter, hblank) {
        this._counter = counter;
        if (this._rendering) {
            if (this._renderCounter < 0) {
                this._renderCounter = -4 + (counter - 157);
            }
            else {
                switch (this._width) {
                    case 8:
                        this._renderCounter = counter - 157 + (this._renderCounter >= 4 ? 4 : 0);
                        break;
                    case 4:
                        this._renderCounter = counter - 157;
                        break;
                    case 2:
                        if (hblank) {
                            this._rendering = this._renderCounter > 1;
                        }
                        else if (this._renderCounter === 0) {
                            this._renderCounter++;
                        }
                        break;
                    default:
                        if (hblank) {
                            this._rendering = this._renderCounter > 0;
                        }
                        break;
                }
            }
        }
    };
    Missile.prototype.resmp = function (value, player) {
        var resmp = value & 0x02;
        if (resmp === this._resmp) {
            return;
        }
        this._flushLineCache();
        this._resmp = resmp;
        if (resmp) {
            this._enabled = false;
        }
        else {
            this._enabled = this._enam;
            this._counter = player.getRespClock();
        }
    };
    Missile.prototype.nusiz = function (value) {
        this._width = this._widths[(value & 0x30) >>> 4];
        this._decodes = drawCounterDecodes_1.decodesMissile[value & 0x07];
        if (this._rendering && this._renderCounter >= this._width) {
            this._rendering = false;
        }
    };
    Missile.prototype.startMovement = function () {
        this._moving = true;
    };
    Missile.prototype.movementTick = function (clock, apply) {
        this._lastMovementTick = this._counter;
        if (clock === this._hmmClocks) {
            this._moving = false;
        }
        if (this._moving && apply) {
            this.tick(false);
        }
        return this._moving;
    };
    Missile.prototype.tick = function (isReceivingHclock) {
        this.collision = this._rendering && this._renderCounter >= 0 && this._enabled ? 0 : this._collisionMask;
        var starfieldEffect = this._moving && isReceivingHclock;
        if (this._decodes[this._counter] && !this._resmp) {
            var starfieldDelta = (this._counter - this._lastMovementTick + 160) % 4;
            this._rendering = true;
            this._renderCounter = -4;
            if (starfieldEffect && starfieldDelta === 3 && this._width < 4) {
                this._renderCounter++;
            }
            switch (starfieldDelta) {
                case 3:
                    this._effectiveWidth = this._width === 1 ? 2 : this._width;
                    break;
                case 2:
                    this._effectiveWidth = 0;
                    break;
                default:
                    this._effectiveWidth = this._width;
                    break;
            }
        }
        else if (this._rendering && ++this._renderCounter >= (starfieldEffect ? this._effectiveWidth : this._width)) {
            this._rendering = false;
        }
        if (++this._counter >= 160) {
            this._counter = 0;
        }
    };
    Missile.prototype.getPixel = function (colorIn) {
        return this.collision ? colorIn : this.color;
    };
    Missile.prototype.setColor = function (color) {
        if (color !== this.color && this._enabled) {
            this._flushLineCache();
        }
        this.color = color;
    };
    return Missile;
}());
exports.default = Missile;

},{"./drawCounterDecodes":124}],116:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var PCMChannel_1 = require("./PCMChannel");
var R_MAX = 30;
var R = 1;
var VOL_MAX = 0x1e;
var mixingTable = new Float32Array(VOL_MAX + 1);
var __init;
(function (__init) {
    for (var vol = 0; vol <= VOL_MAX; vol++) {
        mixingTable[vol] = vol / VOL_MAX * (R_MAX + R * VOL_MAX) / (R_MAX + R * vol);
    }
})(__init = exports.__init || (exports.__init = {}));
var PCMAudio = (function () {
    function PCMAudio(_config) {
        this._config = _config;
        this.newFrame = new microevent_ts_1.Event();
        this.togglePause = new microevent_ts_1.Event();
        this._currentOutputBuffer = null;
        this._bufferIndex = 0;
        this._sampleRate = 0;
        this._counter = 0;
        this._isActive = false;
        this._channel0 = new PCMChannel_1.default();
        this._channel1 = new PCMChannel_1.default();
        this._sampleRate = (this._config.tvMode === 0 ? 60 * 262 : 50 * 312) * 2;
        this._frameSize = (this._config.tvMode === 0 ? 262 : 312) * 4;
        this.reset();
    }
    PCMAudio.prototype.getChannels = function () {
        var _this = this;
        return [
            {
                audv: function (value) { return _this._channel0.audv(value); },
                audc: function (value) { return _this._channel0.audc(value); },
                audf: function (value) { return _this._channel0.audf(value); },
                reset: function () { return _this.reset(); },
                setActive: function (active) { return _this.setActive(active); }
            },
            {
                audv: function (value) { return _this._channel1.audv(value); },
                audc: function (value) { return _this._channel1.audc(value); },
                audf: function (value) { return _this._channel1.audf(value); },
                reset: function () { return undefined; },
                setActive: function () { return undefined; }
            }
        ];
    };
    PCMAudio.prototype.reset = function () {
        this._bufferIndex = 0;
        this._counter = 0;
        this._channel0.reset();
        this._channel1.reset();
    };
    PCMAudio.prototype.tick = function () {
        switch (this._counter) {
            case 9:
            case 81:
                this._channel0.phase0();
                this._channel1.phase0();
                break;
            case 37:
            case 149:
                this._currentOutputBuffer.getContent()[this._bufferIndex++] =
                    mixingTable[this._channel0.phase1() + this._channel1.phase1()];
                if (this._bufferIndex === this._currentOutputBuffer.getLength()) {
                    this._dispatchBuffer();
                }
                break;
        }
        if (++this._counter === 228) {
            this._counter = 0;
        }
    };
    PCMAudio.prototype.isPaused = function () {
        return !this._isActive;
    };
    PCMAudio.prototype.setActive = function (isActive) {
        if (isActive === this._isActive) {
            return;
        }
        this._isActive = isActive;
        this.togglePause.dispatch(!isActive);
    };
    PCMAudio.prototype.getSampleRate = function () {
        return this._sampleRate;
    };
    PCMAudio.prototype.getFrameSize = function () {
        return this._frameSize;
    };
    PCMAudio.prototype.setFrameBufferFactory = function (factory) {
        this._bufferFactory = factory;
        if (!this._currentOutputBuffer && factory) {
            this._currentOutputBuffer = factory();
            this._bufferIndex = 0;
        }
    };
    PCMAudio.prototype._dispatchBuffer = function () {
        this.newFrame.dispatch(this._currentOutputBuffer);
        this._currentOutputBuffer = this._bufferFactory ? this._bufferFactory() : null;
        this._bufferIndex = 0;
    };
    return PCMAudio;
}());
exports.default = PCMAudio;

},{"./PCMChannel":117,"microevent.ts":10}],117:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PCMChannel = (function () {
    function PCMChannel() {
        this._audv = 0;
        this._audc = 0;
        this._audf = 0;
        this._clkEnable = false;
        this._noiseFeedback = false;
        this._noiseCounterBit4 = false;
        this._pulseCounterHold = false;
        this._divCounter = 0;
        this._noiseCounter = 0;
        this._pulseCounter = 0;
        this.reset();
    }
    PCMChannel.prototype.reset = function () {
        this._audc = this._audf = this._audv = 0;
        this._clkEnable = false;
        this._noiseFeedback = false;
        this._noiseCounterBit4 = false;
        this._pulseCounterHold = false;
        this._divCounter = 0;
        this._noiseCounter = 0;
        this._pulseCounter = 0;
    };
    PCMChannel.prototype.phase0 = function () {
        if (this._clkEnable) {
            this._noiseCounterBit4 = !!(this._noiseCounter & 0x01);
            switch (this._audc & 0x03) {
                case 0x00:
                case 0x01:
                    this._pulseCounterHold = false;
                    break;
                case 0x02:
                    this._pulseCounterHold = (this._noiseCounter & 0x1e) !== 0x02;
                    break;
                case 0x03:
                    this._pulseCounterHold = !this._noiseCounterBit4;
                    break;
            }
            switch (this._audc & 0x03) {
                case 0x00:
                    this._noiseFeedback =
                        !!((this._pulseCounter ^ this._noiseCounter) & 0x01) ||
                            !(this._noiseCounter !== 0 || this._pulseCounter !== 0x0a) ||
                            !(this._audc & 0x0c);
                    break;
                default:
                    this._noiseFeedback =
                        !!((this._noiseCounter & 0x04 ? 1 : 0) ^ (this._noiseCounter & 0x01)) ||
                            this._noiseCounter === 0;
                    break;
            }
        }
        this._clkEnable = this._divCounter === this._audf;
        if (this._divCounter === this._audf || this._divCounter === 0x1f) {
            this._divCounter = 0;
        }
        else {
            this._divCounter++;
        }
    };
    PCMChannel.prototype.phase1 = function () {
        var pulseFeedback = false;
        if (this._clkEnable) {
            switch (this._audc >>> 2) {
                case 0x00:
                    pulseFeedback =
                        !!((this._pulseCounter & 0x02 ? 1 : 0) ^ (this._pulseCounter & 0x01)) &&
                            this._pulseCounter !== 0x0a &&
                            !!(this._audc & 0x03);
                    break;
                case 0x01:
                    pulseFeedback = !(this._pulseCounter & 0x08);
                    break;
                case 0x02:
                    pulseFeedback = !this._noiseCounterBit4;
                    break;
                case 0x03:
                    pulseFeedback = !(!!(this._pulseCounter & 0x02) || !(this._pulseCounter & 0x0e));
                    break;
            }
            this._noiseCounter >>>= 1;
            if (this._noiseFeedback) {
                this._noiseCounter |= 0x10;
            }
            if (!this._pulseCounterHold) {
                this._pulseCounter = ~(this._pulseCounter >>> 1) & 0x07;
                if (pulseFeedback) {
                    this._pulseCounter |= 0x08;
                }
            }
        }
        return (this._pulseCounter & 0x01) * this._audv;
    };
    PCMChannel.prototype.audc = function (value) {
        this._audc = value & 0x0f;
    };
    PCMChannel.prototype.audf = function (value) {
        this._audf = value & 0x1f;
    };
    PCMChannel.prototype.audv = function (value) {
        this._audv = value & 0x0f;
    };
    return PCMChannel;
}());
exports.default = PCMChannel;

},{}],118:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var C = 68e-9, RPOT = 1e6, R0 = 1.8e3, U = 5, LINES_FULL = 380;
var PaddleReader = (function () {
    function PaddleReader(clockFreq, _paddle) {
        var _this = this;
        this._paddle = _paddle;
        this._uThresh = 0;
        this._u = 0;
        this._dumped = false;
        this._value = 0.5;
        this._timestamp = 0;
        this._cpuTimeProvider = null;
        this._uThresh = U * (1 - Math.exp(-LINES_FULL * 228 / clockFreq / (RPOT + R0) / C));
        this._paddle.valueChanged.addHandler(function (value) {
            _this._updateValue();
            _this._value = value;
        });
        this.reset();
    }
    PaddleReader.prototype.setCpuTimeProvider = function (provider) {
        this._cpuTimeProvider = provider;
        this._timestamp = this._cpuTimeProvider();
    };
    PaddleReader.prototype.reset = function () {
        this._u = 0;
        this._value = this._paddle.getValue();
        this._dumped = false;
        this._timestamp = this._cpuTimeProvider ? this._cpuTimeProvider() : 0;
    };
    PaddleReader.prototype.vblank = function (value) {
        var oldValue = this._dumped;
        if (value & 0x80) {
            this._dumped = true;
            this._u = 0;
        }
        else if (oldValue) {
            this._dumped = false;
            this._timestamp = this._cpuTimeProvider();
        }
    };
    PaddleReader.prototype.inpt = function () {
        this._updateValue();
        var state = this._dumped ? false : this._u >= this._uThresh;
        return state ? 0x80 : 0;
    };
    PaddleReader.prototype._updateValue = function () {
        if (this._dumped) {
            return;
        }
        var timestamp = this._cpuTimeProvider();
        this._u =
            U * (1 - (1 - this._u / U) * Math.exp(-(timestamp - this._timestamp) / (this._value * RPOT + R0) / C));
        this._timestamp = timestamp;
    };
    return PaddleReader;
}());
exports.default = PaddleReader;

},{}],119:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var drawCounterDecodes_1 = require("./drawCounterDecodes");
var Player = (function () {
    function Player(_collisionMask, _flushLineCache) {
        this._collisionMask = _collisionMask;
        this._flushLineCache = _flushLineCache;
        this.color = 0xffffffff;
        this.collision = 0;
        this._hmmClocks = 0;
        this._counter = 0;
        this._moving = false;
        this._divider = 1;
        this._dividerPending = 1;
        this._dividerChangeCounter = -1;
        this._sampleCounter = 0;
        this._rendering = false;
        this._renderCounter = -5;
        this._renderCounterTripPoint = 0;
        this._patternNew = 0;
        this._patternOld = 0;
        this._pattern = 0;
        this._reflected = false;
        this._delaying = false;
        this.reset();
    }
    Player.prototype.reset = function () {
        this.color = 0xffffffff;
        this.collision = 0;
        this._hmmClocks = 0;
        this._counter = 0;
        this._moving = false;
        this._rendering = false;
        this._renderCounter = -5;
        this._decodes = drawCounterDecodes_1.decodesPlayer[0];
        this._patternNew = 0;
        this._patternOld = 0;
        this._pattern = 0;
        this._reflected = false;
        this._delaying = false;
        this._sampleCounter = 0;
        this._dividerPending = 0;
        this._dividerChangeCounter = -1;
        this._setDivider(1);
    };
    Player.prototype.grp = function (pattern) {
        if (pattern === this._patternNew) {
            return;
        }
        this._patternNew = pattern;
        if (!this._delaying) {
            this._flushLineCache();
            this._updatePattern();
        }
    };
    Player.prototype.hmp = function (value) {
        this._hmmClocks = (value >>> 4) ^ 0x8;
    };
    Player.prototype.nusiz = function (value, hblank) {
        var masked = value & 0x07;
        switch (masked) {
            case 5:
                this._dividerPending = 2;
                break;
            case 7:
                this._dividerPending = 4;
                break;
            default:
                this._dividerPending = 1;
        }
        var oldDecodes = this._decodes;
        this._decodes = drawCounterDecodes_1.decodesPlayer[masked];
        if (this._decodes !== oldDecodes &&
            this._rendering &&
            this._renderCounter - -5 < 2 &&
            !this._decodes[(this._counter - this._renderCounter + -5 + 159) % 160]) {
            this._rendering = false;
        }
        if (this._dividerPending === this._divider) {
            return;
        }
        if (!this._rendering) {
            this._setDivider(this._dividerPending);
            return;
        }
        var delta = this._renderCounter - -5;
        switch ((this._divider << 4) | this._dividerPending) {
            case 0x12:
            case 0x14:
                if (hblank) {
                    if (delta < 4) {
                        this._setDivider(this._dividerPending);
                    }
                    else {
                        this._dividerChangeCounter = delta < 5 ? 1 : 0;
                    }
                }
                else {
                    if (delta < 3) {
                        this._setDivider(this._dividerPending);
                    }
                    else {
                        this._dividerChangeCounter = 1;
                    }
                }
                break;
            case 0x21:
            case 0x41:
                if (delta < (hblank ? 4 : 3)) {
                    this._setDivider(this._dividerPending);
                }
                else if (delta < (hblank ? 6 : 5)) {
                    this._setDivider(this._dividerPending);
                    this._renderCounter--;
                }
                else {
                    this._dividerChangeCounter = hblank ? 0 : 1;
                }
                break;
            case 0x42:
            case 0x24:
                if (this._renderCounter < 1 || (hblank && this._renderCounter % this._divider === 1)) {
                    this._setDivider(this._dividerPending);
                }
                else {
                    this._dividerChangeCounter = this._divider - (this._renderCounter - 1) % this._divider;
                }
                break;
            default:
                throw new Error('cannot happen');
        }
    };
    Player.prototype.resp = function (counter) {
        this._counter = counter;
        if (this._rendering && this._renderCounter - -5 < 4) {
            this._renderCounter = -5 + (counter - 157);
        }
    };
    Player.prototype.refp = function (value) {
        var oldReflected = this._reflected;
        this._reflected = (value & 0x08) > 0;
        if (this._reflected !== oldReflected) {
            this._flushLineCache();
            this._updatePattern();
        }
    };
    Player.prototype.vdelp = function (value) {
        var oldDelaying = this._delaying;
        this._delaying = (value & 0x01) > 0;
        if (this._delaying !== oldDelaying) {
            this._flushLineCache();
            this._updatePattern();
        }
    };
    Player.prototype.startMovement = function () {
        this._moving = true;
    };
    Player.prototype.movementTick = function (clock, apply) {
        if (clock === this._hmmClocks) {
            this._moving = false;
        }
        if (this._moving && apply) {
            this.tick();
        }
        return this._moving;
    };
    Player.prototype.tick = function () {
        this.collision =
            this._rendering &&
                this._renderCounter >= this._renderCounterTripPoint &&
                this._pattern & (1 << this._sampleCounter)
                ? 0
                : this._collisionMask;
        if (this._decodes[this._counter]) {
            this._rendering = true;
            this._renderCounter = -5;
            this._sampleCounter = 0;
        }
        else if (this._rendering) {
            this._renderCounter++;
            switch (this._divider) {
                case 1:
                    if (this._renderCounter > 0) {
                        this._sampleCounter++;
                    }
                    if (this._renderCounter >= 0 &&
                        this._dividerChangeCounter >= 0 &&
                        this._dividerChangeCounter-- === 0) {
                        this._setDivider(this._dividerPending);
                    }
                    break;
                default:
                    if (this._renderCounter > 1 && (this._renderCounter - 1) % this._divider === 0) {
                        this._sampleCounter++;
                    }
                    if (this._renderCounter > 0 &&
                        this._dividerChangeCounter >= 0 &&
                        this._dividerChangeCounter-- === 0) {
                        this._setDivider(this._dividerPending);
                    }
                    break;
            }
            if (this._sampleCounter > 7) {
                this._rendering = false;
            }
        }
        if (++this._counter >= 160) {
            this._counter = 0;
        }
    };
    Player.prototype.getPixel = function (colorIn) {
        return this.collision ? colorIn : this.color;
    };
    Player.prototype.shufflePatterns = function () {
        var oldPatternOld = this._patternOld;
        this._patternOld = this._patternNew;
        if (this._delaying && oldPatternOld !== this._patternOld) {
            this._flushLineCache();
            this._updatePattern();
        }
    };
    Player.prototype.getRespClock = function () {
        switch (this._divider) {
            case 1:
                return (this._counter - 5 + 160) % 160;
            case 2:
                return (this._counter - 9 + 160) % 160;
            case 4:
                return (this._counter - 12 + 160) % 160;
            default:
                throw new Error("cannot happen: invalid divider " + this._divider);
        }
    };
    Player.prototype.setColor = function (color) {
        if (color !== this.color && this._pattern) {
            this._flushLineCache();
        }
        this.color = color;
    };
    Player.prototype._updatePattern = function () {
        this._pattern = this._delaying ? this._patternOld : this._patternNew;
        if (!this._reflected) {
            this._pattern =
                ((this._pattern & 0x01) << 7) |
                    ((this._pattern & 0x02) << 5) |
                    ((this._pattern & 0x04) << 3) |
                    ((this._pattern & 0x08) << 1) |
                    ((this._pattern & 0x10) >>> 1) |
                    ((this._pattern & 0x20) >>> 3) |
                    ((this._pattern & 0x40) >>> 5) |
                    ((this._pattern & 0x80) >>> 7);
        }
    };
    Player.prototype._setDivider = function (divider) {
        this._divider = divider;
        this._renderCounterTripPoint = divider === 1 ? 0 : 1;
    };
    return Player;
}());
exports.default = Player;

},{"./drawCounterDecodes":124}],120:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Playfield = (function () {
    function Playfield(_collisionMask, _flushLineCache) {
        this._collisionMask = _collisionMask;
        this._flushLineCache = _flushLineCache;
        this.collision = 0;
        this._colorLeft = 0;
        this._colorRight = 0;
        this._color = 0;
        this._colorP0 = 0;
        this._colorP1 = 0;
        this._colorMode = 0;
        this._pattern = 0;
        this._refp = false;
        this._reflected = false;
        this._pf0 = 0;
        this._pf1 = 0;
        this._pf2 = 0;
        this._x = 0;
        this.reset();
    }
    Playfield.prototype.reset = function () {
        this._pattern = 0;
        this._reflected = false;
        this._refp = false;
        this._pf0 = 0;
        this._pf1 = 0;
        this._pf2 = 0;
        this._color = 0;
        this._colorP0 = 0;
        this._colorP1 = 0;
        this._colorMode = 0;
        this._applyColors();
    };
    Playfield.prototype.pf0 = function (value) {
        if (this._pf0 === value >>> 4) {
            return;
        }
        this._flushLineCache();
        this._pf0 = value >>> 4;
        this._pattern = (this._pattern & 0x000ffff0) | this._pf0;
    };
    Playfield.prototype.pf1 = function (value) {
        if (this._pf1 === value) {
            return;
        }
        this._flushLineCache();
        this._pf1 = value;
        this._pattern =
            (this._pattern & 0x000ff00f) |
                ((value & 0x80) >>> 3) |
                ((value & 0x40) >>> 1) |
                ((value & 0x20) << 1) |
                ((value & 0x10) << 3) |
                ((value & 0x08) << 5) |
                ((value & 0x04) << 7) |
                ((value & 0x02) << 9) |
                ((value & 0x01) << 11);
    };
    Playfield.prototype.pf2 = function (value) {
        if (this._pf2 === value) {
            return;
        }
        this._flushLineCache();
        this._pf2 = value;
        this._pattern = (this._pattern & 0x00000fff) | ((value & 0xff) << 12);
    };
    Playfield.prototype.ctrlpf = function (value) {
        var reflected = (value & 0x01) > 0, colorMode = (value & 0x06) === 0x02 ? 1 : 0;
        if (reflected === this._reflected && colorMode === this._colorMode) {
            return;
        }
        this._flushLineCache();
        this._reflected = reflected;
        this._colorMode = colorMode;
        this._applyColors();
    };
    Playfield.prototype.setColor = function (color) {
        if (color !== this._color && this._colorMode === 0) {
            this._flushLineCache();
        }
        this._color = color;
        this._applyColors();
    };
    Playfield.prototype.setColorP0 = function (color) {
        if (color !== this._colorP0 && this._colorMode === 1) {
            this._flushLineCache();
        }
        this._colorP0 = color;
        this._applyColors();
    };
    Playfield.prototype.setColorP1 = function (color) {
        if (color !== this._colorP1 && this._colorMode === 1) {
            this._flushLineCache();
        }
        this._colorP1 = color;
        this._applyColors();
    };
    Playfield.prototype.tick = function (x) {
        this._x = x;
        if (x === 80 || x === 0) {
            this._refp = this._reflected;
        }
        if (x & 0x03) {
            return;
        }
        var currentPixel;
        if (this._pattern === 0) {
            currentPixel = 0;
        }
        else if (x < 80) {
            currentPixel = this._pattern & (1 << (x >>> 2));
        }
        else if (this._refp) {
            currentPixel = this._pattern & (1 << (39 - (x >>> 2)));
        }
        else {
            currentPixel = this._pattern & (1 << ((x >>> 2) - 20));
        }
        this.collision = currentPixel ? 0 : this._collisionMask;
    };
    Playfield.prototype.getPixel = function (colorIn) {
        if (!this.collision) {
            return this._x < 80 ? this._colorLeft : this._colorRight;
        }
        return colorIn;
    };
    Playfield.prototype._applyColors = function () {
        switch (this._colorMode) {
            case 0:
                this._colorLeft = this._colorRight = this._color;
                break;
            case 1:
                this._colorLeft = this._colorP0;
                this._colorRight = this._colorP1;
                break;
        }
    };
    return Playfield;
}());
exports.default = Playfield;

},{}],121:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var WaveformAudio_1 = require("./WaveformAudio");
var PCMAudio_1 = require("./PCMAudio");
var Missile_1 = require("./Missile");
var Playfield_1 = require("./Playfield");
var Player_1 = require("./Player");
var Ball_1 = require("./Ball");
var LatchedInput_1 = require("./LatchedInput");
var PaddleReader_1 = require("./PaddleReader");
var FrameManager_1 = require("./FrameManager");
var DelayQueue_1 = require("./DelayQueue");
var palette = require("./palette");
var Tia = (function () {
    function Tia(_config, joystick0, joystick1, paddles) {
        var _this = this;
        this._config = _config;
        this.newFrame = new microevent_ts_1.Event();
        this.trap = new microevent_ts_1.Event();
        this._cpu = null;
        this._bus = null;
        this._delayQueue = new DelayQueue_1.default(10, 20);
        this._hstate = 0;
        this._hctr = 0;
        this._collisionUpdateRequired = false;
        this._movementClock = 0;
        this._movementInProgress = false;
        this._extendedHblank = false;
        this._xDelta = 0;
        this._linesSinceChange = 0;
        this._maxLinesTotal = 0;
        this._colorBk = 0xff000000;
        this._priority = 0;
        this._collisionMask = 0;
        this._player0 = new Player_1.default(31744, function () { return _this._flushLineCache(); });
        this._player1 = new Player_1.default(17344, function () { return _this._flushLineCache(); });
        this._missile0 = new Missile_1.default(8760, function () { return _this._flushLineCache(); });
        this._missile1 = new Missile_1.default(4390, function () { return _this._flushLineCache(); });
        this._playfield = new Playfield_1.default(1099, function () { return _this._flushLineCache(); });
        this._ball = new Ball_1.default(2197, function () { return _this._flushLineCache(); });
        this._waveformAudio = new Array(2);
        this._pcmAudio = null;
        this._audio = new Array(2);
        this._frameManager = new FrameManager_1.default(this._config);
        this._frameManager.newFrame.addHandler(Tia._onNewFrame, this);
        this._palette = this._getPalette(this._config);
        this._input0 = new LatchedInput_1.default(joystick0.getFire());
        this._input1 = new LatchedInput_1.default(joystick1.getFire());
        this._pcmAudio = new PCMAudio_1.default(this._config);
        var pcmChannels = this._pcmAudio.getChannels();
        for (var i = 0; i < 2; i++) {
            this._waveformAudio[i] = new WaveformAudio_1.default(this._config);
            this._audio[i] = this._config.pcmAudio ? pcmChannels[i] : this._waveformAudio[i];
        }
        var clockFreq = this._getClockFreq(this._config);
        this._paddles = new Array(4);
        for (var i = 0; i < 4; i++) {
            this._paddles[i] = new PaddleReader_1.default(clockFreq, paddles[i]);
        }
        this.reset();
    }
    Tia.prototype.reset = function () {
        this._hctr = 0;
        this._movementInProgress = false;
        this._extendedHblank = false;
        this._movementClock = 0;
        this._priority = 0;
        this._hstate = 0;
        this._collisionMask = 0;
        this._colorBk = 0xff000000;
        this._linesSinceChange = 0;
        this._collisionUpdateRequired = false;
        this._maxLinesTotal = 0;
        this._xDelta = 0;
        this._delayQueue.reset();
        this._frameManager.reset();
        this._missile0.reset();
        this._missile1.reset();
        this._player0.reset();
        this._player1.reset();
        this._playfield.reset();
        this._ball.reset();
        this._audio[0].reset();
        this._audio[1].reset();
        this._input0.reset();
        this._input1.reset();
        for (var i = 0; i < 4; i++) {
            this._paddles[i].reset();
        }
        if (this._cpu) {
            this._cpu.resume();
        }
    };
    Tia.prototype.setCpu = function (cpu) {
        this._cpu = cpu;
        return this;
    };
    Tia.prototype.setCpuTimeProvider = function (provider) {
        for (var i = 0; i < 4; i++) {
            this._paddles[i].setCpuTimeProvider(provider);
        }
        return this;
    };
    Tia.prototype.getWidth = function () {
        return 160;
    };
    Tia.prototype.getHeight = function () {
        return this._frameManager.getHeight();
    };
    Tia.prototype.setSurfaceFactory = function (factory) {
        this._frameManager.setSurfaceFactory(factory);
        return this;
    };
    Tia.prototype.getWaveformChannel = function (i) {
        return this._waveformAudio[i];
    };
    Tia.prototype.getPCMChannel = function () {
        return this._pcmAudio;
    };
    Tia.prototype.setAudioEnabled = function (state) {
        this._audio[0].setActive(state && this._config.enableAudio);
        this._audio[1].setActive(state && this._config.enableAudio);
    };
    Tia.prototype.read = function (address) {
        var lastDataBusValue = this._bus.getLastDataBusValue();
        var result;
        switch (address & 0x0f) {
            case 8:
                result = this._config.emulatePaddles ? this._paddles[0].inpt() : 0;
                break;
            case 9:
                result = this._config.emulatePaddles ? this._paddles[1].inpt() : 0;
                break;
            case 10:
                result = this._config.emulatePaddles ? this._paddles[2].inpt() : 0;
                break;
            case 11:
                result = this._config.emulatePaddles ? this._paddles[3].inpt() : 0;
                break;
            case 12:
                result = this._input0.inpt();
                break;
            case 13:
                result = this._input1.inpt();
                break;
            case 0:
                result =
                    (this._collisionMask & 8760 & 31744 ? 0x40 : 0) |
                        (this._collisionMask & 8760 & 17344 ? 0x80 : 0);
                break;
            case 1:
                result =
                    (this._collisionMask & 4390 & 17344 ? 0x40 : 0) |
                        (this._collisionMask & 4390 & 31744 ? 0x80 : 0);
                break;
            case 2:
                result =
                    (this._collisionMask & 31744 & 2197 ? 0x40 : 0) |
                        (this._collisionMask & 31744 & 1099 ? 0x80 : 0);
                break;
            case 3:
                result =
                    (this._collisionMask & 17344 & 2197 ? 0x40 : 0) |
                        (this._collisionMask & 17344 & 1099 ? 0x80 : 0);
                break;
            case 4:
                result =
                    (this._collisionMask & 8760 & 2197 ? 0x40 : 0) |
                        (this._collisionMask & 8760 & 1099 ? 0x80 : 0);
                break;
            case 5:
                result =
                    (this._collisionMask & 4390 & 2197 ? 0x40 : 0) |
                        (this._collisionMask & 4390 & 1099 ? 0x80 : 0);
                break;
            case 7:
                result =
                    (this._collisionMask & 8760 & 4390 ? 0x40 : 0) |
                        (this._collisionMask & 31744 & 17344 ? 0x80 : 0);
                break;
            case 6:
                result = this._collisionMask & 2197 & 1099 ? 0x80 : 0;
                break;
            default:
                result = 0;
                break;
        }
        return (result & 0xc0) | (lastDataBusValue & 0x3f);
    };
    Tia.prototype.peek = function (address) {
        return this.read(address);
    };
    Tia.prototype.write = function (address, value) {
        var v = 0;
        switch (address & 0x3f) {
            case 2:
                this._cpu.halt();
                break;
            case 3:
                this._flushLineCache();
                this._rsync();
                break;
            case 0:
                this._frameManager.setVsync((value & 0x02) > 0);
                break;
            case 1:
                this._input0.vblank(value);
                this._input1.vblank(value);
                for (var i = 0; i < 4; i++) {
                    this._paddles[i].vblank(value);
                }
                this._delayQueue.push(1, value, 1);
                break;
            case 29:
                this._delayQueue.push(29, value, 1);
                break;
            case 30:
                this._delayQueue.push(30, value, 1);
                break;
            case 34:
                this._delayQueue.push(34, value, 2);
                break;
            case 35:
                this._delayQueue.push(35, value, 2);
                break;
            case 18:
                this._flushLineCache();
                this._missile0.resm(this._resxCounter(), this._hstate === 0);
                break;
            case 19:
                this._flushLineCache();
                this._missile1.resm(this._resxCounter(), this._hstate === 0);
                break;
            case 40:
                this._missile0.resmp(value, this._player0);
                break;
            case 41:
                this._missile1.resmp(value, this._player1);
                break;
            case 43:
                this._delayQueue.push(43, value, 2);
                break;
            case 4:
                this._flushLineCache();
                this._missile0.nusiz(value);
                this._player0.nusiz(value, this._hstate === 0);
                break;
            case 5:
                this._flushLineCache();
                this._missile1.nusiz(value);
                this._player1.nusiz(value, this._hstate === 0);
                break;
            case 42:
                this._delayQueue.push(42, value, 6);
                break;
            case 9:
                this._flushLineCache();
                this._colorBk = this._palette[(value & 0xff) >>> 1];
                break;
            case 6:
                v = this._palette[(value & 0xff) >>> 1];
                this._missile0.setColor(v);
                this._player0.setColor(v);
                this._playfield.setColorP0(v);
                break;
            case 7:
                v = this._palette[(value & 0xff) >>> 1];
                this._missile1.setColor(v);
                this._player1.setColor(v);
                this._playfield.setColorP1(v);
                break;
            case 13:
                this._delayQueue.push(13, value, 2);
                break;
            case 14:
                this._delayQueue.push(14, value, 2);
                break;
            case 15:
                this._delayQueue.push(15, value, 2);
                break;
            case 10:
                this._setPriority(value);
                this._playfield.ctrlpf(value);
                this._ball.ctrlpf(value);
                break;
            case 8:
                this._flushLineCache();
                v = this._palette[(value & 0xff) >>> 1];
                this._playfield.setColor(v);
                this._ball.color = v;
                break;
            case 27:
                this._delayQueue
                    .push(27, value, 1)
                    .push(241, 0, 1);
                break;
            case 28:
                this._delayQueue
                    .push(28, value, 1)
                    .push(240, 0, 1)
                    .push(242, 0, 1);
                break;
            case 16:
                this._flushLineCache();
                this._player0.resp(this._resxCounter());
                break;
            case 17:
                this._flushLineCache();
                this._player1.resp(this._resxCounter());
                break;
            case 11:
                this._delayQueue.push(11, value, 1);
                break;
            case 12:
                this._delayQueue.push(12, value, 1);
                break;
            case 32:
                this._delayQueue.push(32, value, 2);
                break;
            case 33:
                this._delayQueue.push(33, value, 2);
                break;
            case 37:
                this._player0.vdelp(value);
                break;
            case 38:
                this._player1.vdelp(value);
                break;
            case 31:
                this._delayQueue.push(31, value, 1);
                break;
            case 36:
                this._delayQueue.push(36, value, 2);
                break;
            case 20:
                this._flushLineCache();
                this._ball.resbl(this._resxCounter());
                break;
            case 39:
                this._ball.vdelbl(value);
                break;
            case 44:
                this._flushLineCache();
                this._collisionMask = 0;
                break;
            case 21:
                this._audio[0].audc(value);
                break;
            case 22:
                this._audio[1].audc(value);
                break;
            case 23:
                this._audio[0].audf(value);
                break;
            case 24:
                this._audio[1].audf(value);
                break;
            case 25:
                this._audio[0].audv(value);
                break;
            case 26:
                this._audio[1].audv(value);
                break;
        }
    };
    Tia.prototype.getDebugState = function () {
        return ('' +
            ("hclock: " + this._hctr + "   line: " + this._frameManager.getCurrentLine() + "\n") +
            this._frameManager.getDebugState());
    };
    Tia.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    Tia.prototype.cycle = function () {
        this._delayQueue.execute(Tia._delayedWrite, this);
        this._collisionUpdateRequired = false;
        if (this._linesSinceChange < 2) {
            this._tickMovement();
            if (this._hstate === 0) {
                this._tickHblank();
            }
            else {
                this._tickHframe();
            }
            if (this._collisionUpdateRequired && !this._frameManager.vblank) {
                this._updateCollision();
            }
        }
        else {
            if (this._hctr === 0) {
                this._cpu.resume();
            }
        }
        if (++this._hctr >= 228) {
            this._nextLine();
        }
        if (this._config.pcmAudio) {
            this._pcmAudio.tick();
        }
    };
    Tia._delayedWrite = function (address, value, self) {
        switch (address) {
            case 1:
                self._flushLineCache();
                self._frameManager.setVblank((value & 0x02) > 0);
                break;
            case 42:
                self._flushLineCache();
                self._movementClock = 0;
                self._movementInProgress = true;
                if (!self._extendedHblank) {
                    self._clearHmoveComb();
                    self._extendedHblank = true;
                }
                self._missile0.startMovement();
                self._missile1.startMovement();
                self._player0.startMovement();
                self._player1.startMovement();
                self._ball.startMovement();
                break;
            case 13:
                self._playfield.pf0(value);
                break;
            case 14:
                self._playfield.pf1(value);
                break;
            case 15:
                self._playfield.pf2(value);
                break;
            case 27:
                self._player0.grp(value);
                break;
            case 28:
                self._player1.grp(value);
                break;
            case 240:
                self._player0.shufflePatterns();
                break;
            case 241:
                self._player1.shufflePatterns();
                break;
            case 32:
                self._player0.hmp(value);
                break;
            case 33:
                self._player1.hmp(value);
                break;
            case 34:
                self._missile0.hmm(value);
                break;
            case 35:
                self._missile1.hmm(value);
                break;
            case 36:
                self._ball.hmbl(value);
                break;
            case 43:
                self._missile0.hmm(0);
                self._missile1.hmm(0);
                self._player0.hmp(0);
                self._player1.hmp(0);
                self._ball.hmbl(0);
                break;
            case 11:
                self._player0.refp(value);
                break;
            case 12:
                self._player1.refp(value);
                break;
            case 242:
                self._ball.shuffleStatus();
                break;
            case 31:
                self._ball.enabl(value);
                break;
            case 29:
                self._missile0.enam(value);
                break;
            case 30:
                self._missile1.enam(value);
                break;
        }
    };
    Tia._onNewFrame = function (surface, self) {
        var linesTotal = self._frameManager.getCurrentLine();
        if (linesTotal > self._maxLinesTotal) {
            self._maxLinesTotal = linesTotal;
        }
        if (linesTotal < self._maxLinesTotal) {
            var buffer = surface.getBuffer(), base = 160 * linesTotal, boundary = self._maxLinesTotal * 160;
            for (var i = base; i < boundary; i++) {
                buffer[i] = 0xff000000;
            }
        }
        self.newFrame.dispatch(surface);
    };
    Tia.prototype._tickMovement = function () {
        if (!this._movementInProgress) {
            return;
        }
        if ((this._hctr & 0x3) === 0) {
            var apply = this._hstate === 0;
            var m = false;
            var movementCounter = this._movementClock > 15 ? 0 : this._movementClock;
            m = this._missile0.movementTick(movementCounter, apply) || m;
            m = this._missile1.movementTick(movementCounter, apply) || m;
            m = this._player0.movementTick(movementCounter, apply) || m;
            m = this._player1.movementTick(movementCounter, apply) || m;
            m = this._ball.movementTick(movementCounter, apply) || m;
            this._movementInProgress = m;
            this._collisionUpdateRequired = m;
            this._movementClock++;
        }
    };
    Tia.prototype._tickHblank = function () {
        switch (this._hctr) {
            case 0:
                this._extendedHblank = false;
                this._cpu.resume();
                break;
            case 67:
                if (!this._extendedHblank) {
                    this._hstate = 1;
                }
                break;
            case 75:
                if (this._extendedHblank) {
                    this._hstate = 1;
                }
                break;
        }
        if (this._extendedHblank && this._hctr > 67) {
            this._playfield.tick(this._hctr - 68 + this._xDelta);
        }
    };
    Tia.prototype._tickHframe = function () {
        var y = this._frameManager.getCurrentLine(), x = this._hctr - 68 + this._xDelta;
        this._collisionUpdateRequired = true;
        this._playfield.tick(x);
        this._tickSprites();
        if (this._frameManager.isRendering()) {
            this._renderPixel(x, y);
        }
    };
    Tia.prototype._tickSprites = function () {
        this._missile0.tick(true);
        this._missile1.tick(true);
        this._player0.tick();
        this._player1.tick();
        this._ball.tick(true);
    };
    Tia.prototype._nextLine = function () {
        if (this._linesSinceChange >= 2) {
            this._cloneLastLine();
        }
        this._hctr = 0;
        this._playfield.tick(0);
        if (!this._movementInProgress) {
            this._linesSinceChange++;
        }
        this._hstate = 0;
        this._xDelta = 0;
        this._frameManager.nextLine();
        if (this._frameManager.isRendering() && this._frameManager.getCurrentLine() === 0) {
            this._flushLineCache();
        }
    };
    Tia.prototype._cloneLastLine = function () {
        var y = this._frameManager.getCurrentLine();
        if (!this._frameManager.isRendering() || y === 0) {
            return;
        }
        var delta = y * 160, prevDelta = (y - 1) * 160;
        for (var x = 0; x < 160; x++) {
            this._frameManager.surfaceBuffer[delta + x] = this._frameManager.surfaceBuffer[prevDelta + x];
        }
    };
    Tia.prototype._getPalette = function (config) {
        switch (config.tvMode) {
            case 0:
                return palette.NTSC;
            case 1:
                return palette.PAL;
            case 2:
                return palette.SECAM;
            default:
                throw new Error('invalid TV mode');
        }
    };
    Tia.prototype._getClockFreq = function (config) {
        return config.tvMode === 0
            ? 60 * 228 * 262
            : 50 * 228 * 312;
    };
    Tia.prototype._renderPixel = function (x, y) {
        if (this._frameManager.vblank) {
            this._frameManager.surfaceBuffer[y * 160 + x] = 0xff000000;
            return;
        }
        var color = this._colorBk;
        switch (this._priority) {
            case 0:
                color = this._playfield.getPixel(color);
                color = this._ball.getPixel(color);
                color = this._missile1.getPixel(color);
                color = this._player1.getPixel(color);
                color = this._missile0.getPixel(color);
                color = this._player0.getPixel(color);
                break;
            case 1:
                color = this._missile1.getPixel(color);
                color = this._player1.getPixel(color);
                color = this._missile0.getPixel(color);
                color = this._player0.getPixel(color);
                color = this._playfield.getPixel(color);
                color = this._ball.getPixel(color);
                break;
            case 2:
                color = this._ball.getPixel(color);
                color = this._missile1.getPixel(color);
                color = this._player1.getPixel(color);
                color = this._playfield.getPixel(color);
                color = this._missile0.getPixel(color);
                color = this._player0.getPixel(color);
                break;
            default:
                throw new Error('invalid priority');
        }
        this._frameManager.surfaceBuffer[y * 160 + x] = color;
    };
    Tia.prototype._updateCollision = function () {
        this._collisionMask |=
            ~this._player0.collision &
                ~this._player1.collision &
                ~this._missile0.collision &
                ~this._missile1.collision &
                ~this._ball.collision &
                ~this._playfield.collision;
    };
    Tia.prototype._clearHmoveComb = function () {
        if (this._frameManager.isRendering() && this._hstate === 0) {
            var offset = this._frameManager.getCurrentLine() * 160;
            for (var i = 0; i < 8; i++) {
                this._frameManager.surfaceBuffer[offset + i] = 0xff000000;
            }
        }
    };
    Tia.prototype._resxCounter = function () {
        return this._hstate === 0
            ? this._hctr >= 73 ? 158 : 159
            : 157;
    };
    Tia.prototype._rsync = function () {
        var x = this._hctr > 68 ? this._hctr - 68 : 0;
        this._xDelta = 157 - x;
        if (this._frameManager.isRendering()) {
            var y = this._frameManager.getCurrentLine(), base = y * 160 + x, boundary = base + (y + 1) * 160;
            for (var i = base; i < boundary; i++) {
                this._frameManager.surfaceBuffer[i] = 0xff000000;
            }
        }
        this._hctr = 225;
    };
    Tia.prototype._setPriority = function (value) {
        var priority = value & 0x04 ? 1 : value & 0x02 ? 2 : 0;
        if (priority !== this._priority) {
            this._flushLineCache();
            this._priority = priority;
        }
    };
    Tia.prototype._flushLineCache = function () {
        var wasCaching = this._linesSinceChange >= 2;
        this._linesSinceChange = 0;
        if (wasCaching) {
            var rewindCycles = this._hctr;
            for (this._hctr = 0; this._hctr < rewindCycles; this._hctr++) {
                if (this._hstate === 0) {
                    this._tickHblank();
                }
                else {
                    this._tickHframe();
                }
            }
        }
    };
    return Tia;
}());
exports.default = Tia;
(function (Tia) {
    var TrapPayload = (function () {
        function TrapPayload(reason, tia, message) {
            this.reason = reason;
            this.tia = tia;
            this.message = message;
        }
        return TrapPayload;
    }());
    Tia.TrapPayload = TrapPayload;
})(Tia || (Tia = {}));
exports.default = Tia;

},{"./Ball":111,"./DelayQueue":112,"./FrameManager":113,"./LatchedInput":114,"./Missile":115,"./PCMAudio":116,"./PaddleReader":118,"./Player":119,"./Playfield":120,"./WaveformAudio":123,"./palette":125,"microevent.ts":10}],122:[function(require,module,exports){
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

},{"../../../tools/AudioOutputBuffer":128,"../../../tools/base64":131,"../Config":79}],123:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var ToneGenerator_1 = require("./ToneGenerator");
var WaveformAudio = (function () {
    function WaveformAudio(_config) {
        this._config = _config;
        this.bufferChanged = new microevent_ts_1.Event();
        this.volumeChanged = new microevent_ts_1.Event();
        this.stop = new microevent_ts_1.Event();
        this._volume = -1;
        this._tone = -1;
        this._frequency = -1;
        this._active = false;
        this._toneGenerator = null;
        this._toneGenerator = new ToneGenerator_1.default(this._config);
        this.reset();
    }
    WaveformAudio.prototype.reset = function () {
        this._volume = -1;
        this._tone = -1;
        this._frequency = -1;
    };
    WaveformAudio.prototype.audc = function (value) {
        value &= 0x0f;
        if (value === this._tone) {
            return;
        }
        this._tone = value;
        this._dispatchBufferChanged();
    };
    WaveformAudio.prototype.audf = function (value) {
        value &= 0x1f;
        if (value === this._frequency) {
            return;
        }
        this._frequency = value;
        this._dispatchBufferChanged();
    };
    WaveformAudio.prototype.audv = function (value) {
        value &= 0x0f;
        if (value === this._volume) {
            return;
        }
        this._volume = value / 15;
        this.volumeChanged.dispatch(this._volume);
    };
    WaveformAudio.prototype.setActive = function (active) {
        this._active = active;
        if (active) {
            this._dispatchBufferChanged();
        }
        else {
            this.stop.dispatch(undefined);
        }
    };
    WaveformAudio.prototype.getVolume = function () {
        return this._volume >= 0 ? this._volume : 0;
    };
    WaveformAudio.prototype.getBuffer = function (key) {
        return this._toneGenerator.getBuffer(key);
    };
    WaveformAudio.prototype._getKey = function () {
        return this._toneGenerator.getKey(this._tone, this._frequency);
    };
    WaveformAudio.prototype._dispatchBufferChanged = function () {
        if (this._active && this.bufferChanged.hasHandlers) {
            this.bufferChanged.dispatch(this._getKey());
        }
    };
    return WaveformAudio;
}());
exports.default = WaveformAudio;

},{"./ToneGenerator":122,"microevent.ts":10}],124:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var decodes0 = new Uint8Array(160), decodes1 = new Uint8Array(160), decodes2 = new Uint8Array(160), decodes3 = new Uint8Array(160), decodes4 = new Uint8Array(160), decodes6 = new Uint8Array(160);
exports.decodesMissile = [
    decodes0,
    decodes1,
    decodes2,
    decodes3,
    decodes4,
    decodes0,
    decodes6,
    decodes0
];
exports.decodesPlayer = [
    decodes0,
    decodes1,
    decodes2,
    decodes3,
    decodes4,
    decodes0,
    decodes6,
    decodes0
];
[decodes0, decodes1, decodes2, decodes3, decodes4, decodes6].forEach(function (decodes) {
    for (var i = 0; i < 160; i++) {
        decodes[i] = 0;
    }
    decodes[156] = 1;
});
decodes1[12] = 1;
decodes2[28] = 1;
decodes3[12] = decodes3[28] = 1;
decodes4[60] = 1;
decodes6[28] = decodes6[60] = 1;

},{}],125:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NTSC = new Uint32Array([
    0xff000000,
    0xff4a4a4a,
    0xff6f6f6f,
    0xff8e8e8e,
    0xffaaaaaa,
    0xffc0c0c0,
    0xffd6d6d6,
    0xffececec,
    0xff004848,
    0xff0f6969,
    0xff1d8686,
    0xff2aa2a2,
    0xff35bbbb,
    0xff40d2d2,
    0xff4ae8e8,
    0xff54fcfc,
    0xff002c7c,
    0xff114890,
    0xff2162a2,
    0xff307ab4,
    0xff3d90c3,
    0xff4aa4d2,
    0xff55b7df,
    0xff60c8ec,
    0xff001c90,
    0xff1539a3,
    0xff2853b5,
    0xff3a6cc6,
    0xff4a82d5,
    0xff5997e3,
    0xff67aaf0,
    0xff74bcfc,
    0xff000094,
    0xff1a1aa7,
    0xff3232b8,
    0xff4848c8,
    0xff5c5cd6,
    0xff6f6fe4,
    0xff8080f0,
    0xff9090fc,
    0xff640084,
    0xff7a1997,
    0xff8f30a8,
    0xffa246b8,
    0xffb359c6,
    0xffc36cd4,
    0xffd27ce0,
    0xffe08cec,
    0xff840050,
    0xff9a1968,
    0xffad307d,
    0xffc04692,
    0xffd059a4,
    0xffe06cb5,
    0xffee7cc5,
    0xfffc8cd4,
    0xff900014,
    0xffa31a33,
    0xffb5324e,
    0xffc64868,
    0xffd55c7f,
    0xffe36f95,
    0xfff080a9,
    0xfffc90bc,
    0xff940000,
    0xffa71a18,
    0xffb8322d,
    0xffc84842,
    0xffd65c54,
    0xffe46f65,
    0xfff08075,
    0xfffc9084,
    0xff881c00,
    0xff9d3b18,
    0xffb0572d,
    0xffc27242,
    0xffd28a54,
    0xffe1a065,
    0xffefb575,
    0xfffcc884,
    0xff643000,
    0xff805018,
    0xff986d2d,
    0xffb08842,
    0xffc5a054,
    0xffd9b765,
    0xffebcc75,
    0xfffce084,
    0xff304000,
    0xff4e6218,
    0xff69812d,
    0xff829e42,
    0xff99b854,
    0xffaed165,
    0xffc2e775,
    0xffd4fc84,
    0xff004400,
    0xff1a661a,
    0xff328432,
    0xff48a048,
    0xff5cba5c,
    0xff6fd26f,
    0xff80e880,
    0xff90fc90,
    0xff003c14,
    0xff185f35,
    0xff2d7e52,
    0xff429c6e,
    0xff54b787,
    0xff65d09e,
    0xff75e7b4,
    0xff84fcc8,
    0xff003830,
    0xff165950,
    0xff2b766d,
    0xff3e9288,
    0xff4faba0,
    0xff5fc2b7,
    0xff6ed8cc,
    0xff7cece0,
    0xff002c48,
    0xff144d69,
    0xff266a86,
    0xff3886a2,
    0xff479fbb,
    0xff56b6d2,
    0xff63cce8,
    0xff70e0fc
]);
exports.PAL = new Uint32Array([
    0xff000000,
    0xff2b2b2b,
    0xff525252,
    0xff767676,
    0xff979797,
    0xffb6b6b6,
    0xffd2d2d2,
    0xffececec,
    0xff000000,
    0xff2b2b2b,
    0xff525252,
    0xff767676,
    0xff979797,
    0xffb6b6b6,
    0xffd2d2d2,
    0xffececec,
    0xff005880,
    0xff1a7196,
    0xff3287ab,
    0xff489cbe,
    0xff5cafcf,
    0xff6fc0df,
    0xff80d1ee,
    0xff90e0fc,
    0xff005c44,
    0xff1a795e,
    0xff329376,
    0xff48ac8c,
    0xff5cc2a0,
    0xff6fd7b3,
    0xff80eac4,
    0xff90fcd4,
    0xff003470,
    0xff1a5189,
    0xff326ba0,
    0xff4884b6,
    0xff5c9ac9,
    0xff6fafdc,
    0xff80c2ec,
    0xff90d4fc,
    0xff146400,
    0xff35801a,
    0xff529832,
    0xff6eb048,
    0xff87c55c,
    0xff9ed96f,
    0xffb4eb80,
    0xffc8fc90,
    0xff140070,
    0xff351a89,
    0xff5232a0,
    0xff6e48b6,
    0xff875cc9,
    0xff9e6fdc,
    0xffb480ec,
    0xffc890fc,
    0xff5c5c00,
    0xff76761a,
    0xff8e8e32,
    0xffa4a448,
    0xffb8b85c,
    0xffcbcb6f,
    0xffdcdc80,
    0xffecec90,
    0xff5c0070,
    0xff741a84,
    0xff893296,
    0xff9e48a8,
    0xffb05cb7,
    0xffc16fc6,
    0xffd180d3,
    0xffe090e0,
    0xff703c00,
    0xff895a19,
    0xffa0752f,
    0xffb68e44,
    0xffc9a557,
    0xffdcba68,
    0xffecce79,
    0xfffce088,
    0xff700058,
    0xff891a6e,
    0xffa03283,
    0xffb64896,
    0xffc95ca7,
    0xffdc6fb7,
    0xffec80c6,
    0xfffc90d4,
    0xff702000,
    0xff893f19,
    0xffa05a2f,
    0xffb67444,
    0xffc98b57,
    0xffdca168,
    0xffecb579,
    0xfffcc888,
    0xff800034,
    0xff961a4a,
    0xffab325f,
    0xffbe4872,
    0xffcf5c83,
    0xffdf6f93,
    0xffee80a2,
    0xfffc90b0,
    0xff880000,
    0xff9d1a1a,
    0xffb03232,
    0xffc24848,
    0xffd25c5c,
    0xffe16f6f,
    0xffef8080,
    0xfffc9090,
    0xff000000,
    0xff2b2b2b,
    0xff525252,
    0xff767676,
    0xff979797,
    0xffb6b6b6,
    0xffd2d2d2,
    0xffececec,
    0xff000000,
    0xff2b2b2b,
    0xff525252,
    0xff767676,
    0xff979797,
    0xffb6b6b6,
    0xffd2d2d2,
    0xffececec
]);
exports.SECAM = new Uint32Array([
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff,
    0xff000000,
    0xffff2121,
    0xff793cf0,
    0xffff50ff,
    0xff00ff7f,
    0xffffff7f,
    0xff3fffff,
    0xffffffff
]);

},{}],126:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var BoardInterface_1 = require("../board/BoardInterface");
var StateMachineCpu_1 = require("../cpu/StateMachineCpu");
var Memory_1 = require("./Memory");
var Board = (function () {
    function Board(cpuFactory) {
        var _this = this;
        this.clock = new microevent_ts_1.Event();
        this.trap = new microevent_ts_1.Event();
        this._trap = false;
        this._clockMode = 1;
        this._timer = {
            tick: function (clocks) { return _this._tick(clocks); },
            start: function (scheduler, sliceHint) { return _this._start(scheduler, sliceHint); },
            stop: function () { return _this._stop(); },
            isRunning: function () { return !!_this._runTask; }
        };
        this.cpuClock = this.clock;
        this._bus = this._createBus();
        if (typeof cpuFactory === 'undefined') {
            cpuFactory = function (bus) { return new StateMachineCpu_1.default(bus); };
        }
        this._cpu = cpuFactory(this._bus);
        this._cpu.setInvalidInstructionCallback(function () { return _this._onInvalidInstruction(); });
    }
    Board.prototype.getCpu = function () {
        return this._cpu;
    };
    Board.prototype.getBus = function () {
        return this._bus;
    };
    Board.prototype.getTimer = function () {
        return this._timer;
    };
    Board.prototype.reset = function (hard) {
        this._cpu.reset();
        this._bus.reset();
        if (hard) {
            this._bus.clear();
        }
        return this;
    };
    Board.prototype.boot = function () {
        var clock = 0;
        if (this._cpu.executionState !== 0) {
            throw new Error('Already booted!');
        }
        while (this._cpu.executionState !== 1) {
            this._cpu.cycle();
            clock++;
        }
        this.clock.dispatch(clock);
        return this;
    };
    Board.prototype.suspend = function () { };
    Board.prototype.resume = function () { };
    Board.prototype.triggerTrap = function (reason, message) {
        this._stop();
        this._trap = true;
        if (this.trap.hasHandlers) {
            this.trap.dispatch(new BoardInterface_1.default.TrapPayload(reason, this, message));
        }
        else {
            throw new Error(message);
        }
        return this;
    };
    Board.prototype.getBoardStateDebug = function () {
        return undefined;
    };
    Board.prototype.setClockMode = function (clockMode) {
        this._clockMode = clockMode;
        return this;
    };
    Board.prototype.getClockMode = function () {
        return this._clockMode;
    };
    Board.prototype._createBus = function () {
        return new Memory_1.default();
    };
    Board.prototype._tick = function (clocks) {
        var i = 0, clock = 0;
        this._trap = false;
        while (i++ < clocks && !this._trap) {
            this._cpu.cycle();
            clock++;
            if (this._clockMode === 0 &&
                this._cpu.executionState === 1 &&
                this.clock.hasHandlers) {
                this.clock.dispatch(clock);
                clock = 0;
            }
        }
        if (clock > 0 && this.clock.hasHandlers) {
            this.clock.dispatch(clock);
        }
        return clock;
    };
    Board.prototype._start = function (scheduler, sliceHint) {
        if (sliceHint === void 0) { sliceHint = 100000; }
        if (this._runTask) {
            return;
        }
        this._sliceHint = sliceHint;
        this._runTask = scheduler.start(this._executeSlice, this);
    };
    Board.prototype._executeSlice = function (board) {
        board._tick(board._sliceHint);
    };
    Board.prototype._stop = function () {
        if (!this._runTask) {
            return;
        }
        this._runTask.stop();
        this._runTask = undefined;
    };
    Board.prototype._onInvalidInstruction = function () {
        this.triggerTrap(0, 'invalid instruction');
    };
    return Board;
}());
exports.default = Board;

},{"../board/BoardInterface":40,"../cpu/StateMachineCpu":46,"./Memory":127,"microevent.ts":10}],127:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Memory = (function () {
    function Memory() {
        this._data = new Uint8Array(0x10000);
        this.clear();
    }
    Memory.prototype.reset = function () { };
    Memory.prototype.clear = function () {
        for (var i = 0; i < 0x10000; i++) {
            this._data[i] = 0;
        }
    };
    Memory.prototype.read = function (address) {
        return this._data[address];
    };
    Memory.prototype.peek = function (address) {
        return this._data[address];
    };
    Memory.prototype.readWord = function (address) {
        return this._data[address] + (this._data[(address + 1) & 0xffff] << 8);
    };
    Memory.prototype.write = function (address, value) {
        this._data[address] = value;
    };
    Memory.prototype.poke = function (address, value) {
        this._data[address] = value;
    };
    return Memory;
}());
exports.default = Memory;

},{}],128:[function(require,module,exports){
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

},{}],129:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var ClockProbe = (function () {
    function ClockProbe(_scheduler) {
        this._scheduler = _scheduler;
        this.frequencyUpdate = new microevent_ts_1.Event();
        this._counter = 0;
        this._frequency = 0;
    }
    ClockProbe.prototype.attach = function (clock) {
        if (this._clock) {
            this.detach();
        }
        this._clock = clock;
        clock.addHandler(this._clockHandler, this);
        return this;
    };
    ClockProbe.prototype.start = function () {
        if (this._measurementTask) {
            return this;
        }
        this._timestamp = Date.now();
        this._counter = 0;
        this._measurementTask = this._scheduler.start(this._updateMeasurement, this);
        return this;
    };
    ClockProbe.prototype.detach = function () {
        if (!this._clock) {
            return this;
        }
        this._clock.removeHandler(this._clockHandler, this);
        this._clock = undefined;
        return this;
    };
    ClockProbe.prototype.stop = function () {
        if (!this._measurementTask) {
            return this;
        }
        this._measurementTask.stop();
        this._measurementTask = undefined;
        return this;
    };
    ClockProbe.prototype.getFrequency = function () {
        return this._frequency;
    };
    ClockProbe.prototype._updateMeasurement = function (probe) {
        var timestamp = Date.now();
        probe._frequency = probe._counter / (timestamp - probe._timestamp) * 1000;
        probe._counter = 0;
        probe._timestamp = timestamp;
        probe.frequencyUpdate.dispatch(probe._frequency);
    };
    ClockProbe.prototype._clockHandler = function (clocks, ctx) {
        ctx._counter += clocks;
    };
    return ClockProbe;
}());
exports.default = ClockProbe;

},{"microevent.ts":10}],130:[function(require,module,exports){
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

},{}],131:[function(require,module,exports){
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

},{}],132:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function encode(value, width) {
    var result = Math.abs(value).toString(2);
    if (typeof width !== 'undefined') {
        while (result.length < width) {
            result = '0' + result;
        }
    }
    return (value < 0 ? '-' : '') + '0b' + result;
}
exports.encode = encode;

},{}],133:[function(require,module,exports){
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

},{"tslib":25}],134:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function encodeWithPrefix(value, width, signed, prefix) {
    if (signed === void 0) { signed = true; }
    if (prefix === void 0) { prefix = ''; }
    if (!signed && value < 0) {
        return (encodeWithPrefix(value >>> 16, width && width > 8 ? width - 4 : 4, false, prefix) +
            encodeWithPrefix(value & 0xffff, 4));
    }
    var result = Math.abs(value)
        .toString(16)
        .toUpperCase();
    if (typeof width !== 'undefined') {
        while (result.length < width) {
            result = '0' + result;
        }
    }
    return (value < 0 ? '-' : '') + prefix + result;
}
function encode(value, width, signed) {
    if (signed === void 0) { signed = true; }
    return encodeWithPrefix(value, width, signed, '$');
}
exports.encode = encode;
function decode(value) {
    var sign = value.match(/^-/) ? -1 : 1;
    var stripped = value.replace(/^-/, '').toUpperCase();
    if (stripped.match(/^0X[0-9A-F]+$/)) {
        stripped = stripped.replace(/^0x/, '');
    }
    else if (stripped.match(/^\$[0-9A-F]+$/)) {
        stripped = stripped.replace(/^\$/, '');
    }
    else {
        throw new TypeError('invalid hex number ' + value);
    }
    return sign * parseInt(stripped, 16);
}
exports.decode = decode;

},{}],135:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var InducedMember = (function () {
    function InducedMember(_value, _mapper, _adopter) {
        this._value = _value;
        this._mapper = _mapper;
        this._adopter = _adopter;
    }
    InducedMember.prototype.adopt = function (target) {
        this._adopter(this._value, target);
    };
    InducedMember.prototype.get = function () {
        return this._mapper(this._value.get());
    };
    InducedMember.prototype.release = function () {
        this._value.release();
    };
    InducedMember.prototype.dispose = function () {
        this._value.dispose();
    };
    return InducedMember;
}());
exports.default = InducedMember;

},{}],136:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var InducedMember_1 = require("./InducedMember");
var InducedPool = (function () {
    function InducedPool(_mapper, _adopter) {
        if (_adopter === void 0) { _adopter = function () {
            throw new Error('adopt is not supported');
        }; }
        this._mapper = _mapper;
        this._adopter = _adopter;
        this._map = new WeakMap();
    }
    InducedPool.prototype.get = function (original) {
        if (!this._map.has(original)) {
            this._map.set(original, new InducedMember_1.default(original, this._mapper, this._adopter));
        }
        return this._map.get(original);
    };
    return InducedPool;
}());
exports.default = InducedPool;

},{"./InducedMember":135}],137:[function(require,module,exports){
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

},{"./PoolMember":138,"microevent.ts":10}],138:[function(require,module,exports){
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

},{}],139:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SeedrandomGenerator = (function () {
    function SeedrandomGenerator(_rng) {
        this._rng = _rng;
    }
    SeedrandomGenerator.prototype.single = function () {
        return this._rng.quick();
    };
    SeedrandomGenerator.prototype.double = function () {
        return this._rng.double();
    };
    SeedrandomGenerator.prototype.int32 = function () {
        return this._rng.int32();
    };
    SeedrandomGenerator.prototype.int = function (max) {
        return (this._rng.int32() >>> 0) % (max + 1);
    };
    SeedrandomGenerator.prototype.saveState = function () {
        return this._rng.state();
    };
    return SeedrandomGenerator;
}());
exports.default = SeedrandomGenerator;

},{}],140:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var seedrandom = require("seedrandom");
var SeedrandomGenerator_1 = require("./SeedrandomGenerator");
function createRng(seed) {
    if (seed < 0) {
        seed = Math.random();
    }
    return new SeedrandomGenerator_1.default(seedrandom.alea(seed, {
        state: true
    }));
}
exports.createRng = createRng;
function restoreRng(state) {
    return new SeedrandomGenerator_1.default(seedrandom.alea('', {
        state: state
    }));
}
exports.restoreRng = restoreRng;

},{"./SeedrandomGenerator":139,"seedrandom":14}],141:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var setImmediate_1 = require("./setImmediate");
var ImmediateScheduler = (function () {
    function ImmediateScheduler() {
    }
    ImmediateScheduler.prototype.start = function (worker, context) {
        var terminate = false;
        function handler() {
            if (terminate) {
                return;
            }
            worker(context);
            setImmediate_1.setImmediate(handler);
        }
        setImmediate_1.setImmediate(handler);
        return {
            stop: function () { return (terminate = true); }
        };
    };
    return ImmediateScheduler;
}());
exports.default = ImmediateScheduler;

},{"./setImmediate":146}],142:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PeriodicScheduler = (function () {
    function PeriodicScheduler(_period) {
        this._period = _period;
    }
    PeriodicScheduler.prototype.setPeriod = function (period) {
        this._period = period;
        return this;
    };
    PeriodicScheduler.prototype.getPeriod = function () {
        return this._period;
    };
    PeriodicScheduler.prototype.start = function (worker, context) {
        var _this = this;
        var terminate = false;
        var handler = function () {
            if (terminate) {
                return;
            }
            worker(context);
            setTimeout(handler, _this._period);
        };
        setTimeout(handler, this._period);
        return {
            stop: function () { return (terminate = true); }
        };
    };
    return PeriodicScheduler;
}());
exports.default = PeriodicScheduler;

},{}],143:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getTimestamp = self.performance && self.performance.now
    ? function () { return self.performance.now(); }
    : function () { return Date.now(); };
exports.default = getTimestamp;

},{}],144:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getTimestamp_1 = require("../getTimestamp");
var setImmediate_1 = require("../setImmediate");
var CORRECTION_THESHOLD = 3, MAX_ACCUMULATED_DELTA = 100;
var ConstantCyclesScheduler = (function () {
    function ConstantCyclesScheduler() {
    }
    ConstantCyclesScheduler.prototype.start = function (worker, context) {
        var terminate = false, targetSleepInterval = -1, lastYieldTimestamp = 0, accumulatedDelta = 0;
        function handler() {
            if (terminate) {
                return;
            }
            var timestamp0 = getTimestamp_1.default(), targetDuration = worker(context) || 0, timestamp1 = getTimestamp_1.default();
            var delay = targetDuration - timestamp1 + timestamp0;
            if (targetSleepInterval >= 0) {
                accumulatedDelta += targetSleepInterval - timestamp0 + lastYieldTimestamp;
            }
            if (accumulatedDelta > MAX_ACCUMULATED_DELTA) {
                accumulatedDelta = MAX_ACCUMULATED_DELTA;
            }
            else if (accumulatedDelta < -MAX_ACCUMULATED_DELTA) {
                accumulatedDelta = -MAX_ACCUMULATED_DELTA;
            }
            if (Math.abs(accumulatedDelta) > CORRECTION_THESHOLD) {
                delay += accumulatedDelta;
                accumulatedDelta = 0;
            }
            if (delay < 0) {
                delay = 0;
                accumulatedDelta = delay;
            }
            if (delay > 0) {
                setTimeout(handler, Math.round(delay));
            }
            else {
                setImmediate_1.setImmediate(handler);
            }
            targetSleepInterval = delay;
            lastYieldTimestamp = getTimestamp_1.default();
        }
        setImmediate_1.setImmediate(handler);
        return {
            stop: function () { return (terminate = true); }
        };
    };
    return ConstantCyclesScheduler;
}());
exports.default = ConstantCyclesScheduler;

},{"../getTimestamp":143,"../setImmediate":146}],145:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getTimestamp_1 = require("../getTimestamp");
var setImmediate_1 = require("../setImmediate");
var SAFETY_FACTOR = 3;
var ConstantTimesliceScheduler = (function () {
    function ConstantTimesliceScheduler() {
    }
    ConstantTimesliceScheduler.prototype.start = function (worker, context, _timeSlice) {
        var timeSlice = _timeSlice || 100;
        var timestamp0 = getTimestamp_1.default(), emulationTime = 0, running = true;
        function handler() {
            if (!running) {
                return;
            }
            var timestamp = getTimestamp_1.default();
            var delta = timestamp - timestamp0 - emulationTime;
            if (delta > SAFETY_FACTOR * timeSlice) {
                delta = SAFETY_FACTOR * timeSlice;
                timestamp0 = timestamp - delta;
                emulationTime = 0;
            }
            emulationTime += worker(context, delta);
            var timeToSleep = timeSlice - getTimestamp_1.default() + timestamp;
            if (timeToSleep > 0) {
                setTimeout(handler, timeToSleep);
            }
            else {
                setImmediate_1.setImmediate(handler);
            }
        }
        setImmediate_1.setImmediate(handler);
        return { stop: function () { return (running = false); } };
    };
    return ConstantTimesliceScheduler;
}());
exports.default = ConstantTimesliceScheduler;

},{"../getTimestamp":143,"../setImmediate":146}],146:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var polyfill = require("setimmediate2");
var index = 0;
function setImmediate(callback) {
    if (index === 0) {
        setTimeout(callback, 0);
    }
    else {
        polyfill.setImmediate(callback);
    }
    index = (index + 1) % 10;
}
exports.setImmediate = setImmediate;

},{"setimmediate2":22}],147:[function(require,module,exports){
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

},{"microevent.ts":10}],148:[function(require,module,exports){
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

},{"microevent.ts":10}],149:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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

},{"./FrameMergeProcessor":147,"./PassthroughProcessor":148}],150:[function(require,module,exports){
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

},{"./ProcessorFactory":149}],151:[function(require,module,exports){
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

},{}],152:[function(require,module,exports){
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

},{"screenfull":13}],153:[function(require,module,exports){
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

},{}],154:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var Pool_1 = require("../../tools/pool/Pool");
var InducedPool_1 = require("../../tools/pool/InducedPool");
var AudioOutputBuffer_1 = require("../../tools/AudioOutputBuffer");
var PCMAudioEndpoint = (function () {
    function PCMAudioEndpoint(_output) {
        var _this = this;
        this._output = _output;
        this.newFrame = new microevent_ts_1.Event();
        this.togglePause = new microevent_ts_1.Event();
        this._audioBufferPool = new Pool_1.default(function () { return new AudioOutputBuffer_1.default(new Float32Array(_this.getFrameSize()), _this.getSampleRate()); });
        this._audioBufferMap = new WeakMap();
        this._pcmDataPool = new InducedPool_1.default(function (buffer) { return buffer.getContent(); }, function (value, target) {
            return value.get().replaceUnderlyingBuffer(target);
        });
        this._output.newFrame.addHandler(function (buffer) {
            return _this.newFrame.dispatch(_this._pcmDataPool.get(_this._audioBufferMap.get(buffer)));
        });
        this._output.togglePause.addHandler(function (paused) { return _this.togglePause.dispatch(paused); });
        this._output.setFrameBufferFactory(function () {
            var wrappedBuffer = _this._audioBufferPool.get();
            if (!_this._audioBufferMap.has(wrappedBuffer.get())) {
                _this._audioBufferMap.set(wrappedBuffer.get(), wrappedBuffer);
            }
            return wrappedBuffer.get();
        });
    }
    PCMAudioEndpoint.prototype.getSampleRate = function () {
        return this._output.getSampleRate();
    };
    PCMAudioEndpoint.prototype.getFrameSize = function () {
        return this._output.getFrameSize();
    };
    PCMAudioEndpoint.prototype.isPaused = function () {
        return this._output.isPaused();
    };
    return PCMAudioEndpoint;
}());
exports.default = PCMAudioEndpoint;

},{"../../tools/AudioOutputBuffer":128,"../../tools/pool/InducedPool":136,"../../tools/pool/Pool":137,"microevent.ts":10}],155:[function(require,module,exports){
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

},{"tslib":25}],156:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var microevent_ts_1 = require("microevent.ts");
var Pool_1 = require("../../tools/pool/Pool");
var ArrayBufferSurface_1 = require("../../video/surface/ArrayBufferSurface");
var InducedPool_1 = require("../../tools/pool/InducedPool");
var ProcessorPipeline_1 = require("../../video/processing/ProcessorPipeline");
var VideoEndpoint = (function () {
    function VideoEndpoint(_video, videoProcessing) {
        var _this = this;
        this._video = _video;
        this.newFrame = new microevent_ts_1.Event();
        this._poolMembers = new WeakMap();
        this._surfaces = new WeakMap();
        this._surfacePool = new InducedPool_1.default(function (imageData) { return _this._surfaces.get(imageData); });
        this._videoProcessor = new ProcessorPipeline_1.default(videoProcessing);
        this._videoProcessor.init(this._video.getWidth(), this._video.getHeight());
        this._pool = new Pool_1.default(function () { return new ImageData(_this._video.getWidth(), _this._video.getHeight()); });
        this._video.setSurfaceFactory(function () {
            var poolMember = _this._pool.get(), imageData = poolMember.get();
            if (!_this._surfaces.has(imageData)) {
                var newSurface = ArrayBufferSurface_1.default.createFromArrayBuffer(imageData.width, imageData.height, imageData.data.buffer);
                _this._surfaces.set(imageData, newSurface.fill(0xff000000));
            }
            var surface = _this._surfaces.get(imageData);
            _this._poolMembers.set(surface, poolMember);
            return surface;
        });
        this._video.newFrame.addHandler(function (imageData) {
            return _this._videoProcessor.processSurface(_this._surfacePool.get(_this._poolMembers.get(imageData)));
        });
        this._videoProcessor.emit.addHandler(function (wrappedSurface) {
            return _this.newFrame.dispatch(_this._poolMembers.get(wrappedSurface.get()));
        });
    }
    VideoEndpoint.prototype.getWidth = function () {
        return this._video.getWidth();
    };
    VideoEndpoint.prototype.getHeight = function () {
        return this._video.getHeight();
    };
    return VideoEndpoint;
}());
exports.default = VideoEndpoint;

},{"../../tools/pool/InducedPool":136,"../../tools/pool/Pool":137,"../../video/processing/ProcessorPipeline":150,"../../video/surface/ArrayBufferSurface":151,"microevent.ts":10}],157:[function(require,module,exports){
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

},{"./audio/PCMChannel":159,"./audio/WaveformChannel":160,"async-mutex":2,"tslib":25}],158:[function(require,module,exports){
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

},{}],159:[function(require,module,exports){
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

},{"../../../tools/RingBuffer":130,"./LinearResampler":158}],160:[function(require,module,exports){
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

},{}],161:[function(require,module,exports){
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

},{"microevent.ts":10,"tslib":25}],162:[function(require,module,exports){
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

},{"../../driver/WebAudio":157,"tslib":25}],"stellaCLI":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var StellaCLI_1 = require("../cli/stella/StellaCLI");
var JqtermCLIRunner_1 = require("../cli/JqtermCLIRunner");
var PrepackagedFilesystemProvider_1 = require("../fs/PrepackagedFilesystemProvider");
var SimpleCanvasVideo_1 = require("./driver/SimpleCanvasVideo");
var KeyboardIO_1 = require("./stella/driver/KeyboardIO");
var WebAudio_1 = require("./stella/driver/WebAudio");
var FullscreenVideo_1 = require("./driver/FullscreenVideo");
var MouseAsPaddle_1 = require("./driver/MouseAsPaddle");
var VideoEndpoint_1 = require("./driver/VideoEndpoint");
var PCMAudioEndpoint_1 = require("./driver/PCMAudioEndpoint");
function run(_a) {
    var fileBlob = _a.fileBlob, terminalElt = _a.terminalElt, interruptButton = _a.interruptButton, clearButton = _a.clearButton, canvas = _a.canvas, pageConfig = _a.pageConfig, cartridgeFileInput = _a.cartridgeFileInput, cartridgeFileInputLabel = _a.cartridgeFileInputLabel;
    var fsProvider = new PrepackagedFilesystemProvider_1.default(fileBlob), cli = new StellaCLI_1.default(fsProvider), runner = new JqtermCLIRunner_1.default(cli, terminalElt, {
        interruptButton: interruptButton,
        clearButton: clearButton
    });
    cli.allowQuit(false);
    var canvasElt = canvas.get(0), context = canvasElt.getContext('2d');
    context.fillStyle = 'solid black';
    context.fillRect(0, 0, canvasElt.width, canvasElt.height);
    cli.hardwareInitialized.addHandler(function () {
        var board = cli.getBoard(), videoDriver = setupVideo(canvas.get(0), board), fullscreenDriver = new FullscreenVideo_1.default(videoDriver);
        setupAudio(board, cli);
        setupKeyboardControls(canvas, board, fullscreenDriver);
        setupPaddles(board.getPaddle(0));
        board.setAudioEnabled(true);
    });
    runner.startup();
    if (cartridgeFileInput) {
        setupCartridgeReader(cli, cartridgeFileInput, cartridgeFileInputLabel);
    }
    if (pageConfig) {
        if (pageConfig.tvMode) {
            cli.pushInput("tv-mode " + pageConfig.tvMode + "\n");
        }
        if (pageConfig.audio) {
            cli.pushInput("audio " + pageConfig.audio + "\n");
        }
        if (pageConfig.paddles) {
            cli.pushInput("paddles " + pageConfig.paddles + "\n");
        }
        if (pageConfig.seed) {
            cli.pushInput("seed " + pageConfig.seed + "\n");
        }
        if (pageConfig.pcm) {
            cli.pushInput("pcm " + pageConfig.pcm + "\n");
        }
        if (pageConfig.cartridge) {
            cli.pushInput("load-cartridge " + pageConfig.cartridge + "\n");
        }
    }
}
exports.run = run;
function setupCartridgeReader(cli, cartridgeFileInput, cartridgeFileInputLabel) {
    var onCliStateChange = cartridgeFileInputLabel
        ? function () {
            return cli.getState() === 0 ? cartridgeFileInputLabel.show() : cartridgeFileInputLabel.hide();
        }
        : function () { return undefined; };
    cli.events.stateChanged.addHandler(onCliStateChange);
    onCliStateChange();
    cartridgeFileInput.change(function (e) {
        var files = e.currentTarget.files;
        if (files.length !== 1) {
            return;
        }
        var reader = new FileReader(), file = files[0];
        reader.addEventListener('load', function () {
            if (cli.getState() !== 0) {
                return;
            }
            cli.loadCartridgeFromBuffer(new Uint8Array(reader.result), file.name);
        });
        reader.readAsArrayBuffer(files[0]);
    });
}
function setupVideo(canvas, board) {
    var driver = new SimpleCanvasVideo_1.default(canvas);
    driver.init();
    driver.bind(new VideoEndpoint_1.default(board.getVideoOutput()));
    return driver;
}
function setupAudio(board, cli) {
    var driver = new WebAudio_1.default();
    try {
        driver.init();
    }
    catch (e) {
        console.log("audio unavailable: " + e.message);
    }
    var config = board.getConfig();
    driver.bind(config.pcmAudio, config.pcmAudio ? [new PCMAudioEndpoint_1.default(board.getPCMChannel())] : board.getWaveformChannels());
    cli.events.stateChanged.addHandler(function (newState) {
        switch (newState) {
            case 2:
                driver.resume();
                break;
            case 1:
                driver.pause();
                break;
        }
    });
}
function setupKeyboardControls(element, board, fullscreenDriver) {
    var ioDriver = new KeyboardIO_1.default(element.get(0));
    ioDriver.bind(board.getJoystick0(), board.getJoystick1(), board.getControlPanel());
    ioDriver.toggleFullscreen.addHandler(function () { return fullscreenDriver.toggle(); });
}
function setupPaddles(paddle0) {
    var paddleDriver = new MouseAsPaddle_1.default();
    paddleDriver.bind(paddle0);
}

},{"../cli/JqtermCLIRunner":33,"../cli/stella/StellaCLI":35,"../fs/PrepackagedFilesystemProvider":38,"./driver/FullscreenVideo":152,"./driver/MouseAsPaddle":153,"./driver/PCMAudioEndpoint":154,"./driver/SimpleCanvasVideo":155,"./driver/VideoEndpoint":156,"./stella/driver/KeyboardIO":161,"./stella/driver/WebAudio":162}]},{},[])
//# sourceMappingURL=stellaCLI.js.map
