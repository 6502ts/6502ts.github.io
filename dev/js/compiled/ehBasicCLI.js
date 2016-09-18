require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
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
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
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
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
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
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
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
  if (!isArray(list)) {
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
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

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
      case undefined:
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
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
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

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
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
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
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
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
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
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
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

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
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
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
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
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
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

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

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
  offset = offset | 0
  byteLength = byteLength | 0
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
  offset = offset | 0
  byteLength = byteLength | 0
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
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
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
  offset = offset | 0
  byteLength = byteLength | 0
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
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
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
  offset = offset | 0
  byteLength = byteLength | 0
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
  offset = offset | 0
  byteLength = byteLength | 0
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
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

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
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

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
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
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
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
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
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
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
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
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

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":2,"ieee754":3,"isarray":4}],2:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
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
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

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
  var eLen = nBytes * 8 - mLen - 1
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
      m = (value * c - 1) * Math.pow(2, mLen)
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

},{}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
(function (process){
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

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

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

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
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

},{"_process":7}],7:[function(require,module,exports){
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

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],9:[function(require,module,exports){
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

},{"./support/isBuffer":8,"_process":7,"inherits":5}],10:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var useNative = __webpack_require__(2);
	var Timer = __webpack_require__(3);
	var setTimeoutPolifill = __webpack_require__(4);
	var polifills = [
	    __webpack_require__(5),
	    __webpack_require__(6),
	    __webpack_require__(7),
	    __webpack_require__(8),
	    __webpack_require__(9)
	];
	var setImmediate;
	var clearImmediate;

	if (useNative()) {
	    setImmediate = context.setImmediate ||
	        context.msSetImmediate ||
	        usePolifill(polifills, setTimeoutPolifill);

	    clearImmediate = context.clearImmediate ||
	        context.msClearImmediate ||
	        Timer.clear;

	} else {
	    setImmediate = setTimeoutPolifill.init();
	    clearImmediate = Timer.clear;
	}

	exports.setImmediate = setImmediate;
	exports.clearImmediate = clearImmediate;

	exports.msSetImmediate = setImmediate;
	exports.msClearImmediate = clearImmediate;

	function usePolifill(polifills, def) {
	    for (var i = 0; i < polifills.length; i++) {
	        var polifill = polifills[ i ];
	        if (polifill.canUse()) {
	            return polifill.init();
	        }
	    }

	    return def.init();
	}


/***/ },
/* 1 */
/***/ function(module, exports) {

	/*jshint -W067*/
	'use strict';

	module.exports = (function() {
	    return this || (1, eval)('this');
	})();


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var context = __webpack_require__(1);

	// @see http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/
	module.exports = function() {
	    return !(context.navigator && /Trident|Edge/.test(context.navigator.userAgent));
	};


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);

	var nextId = 1;
	var tasks = {};
	var lock = false;

	function wrap(handler) {
	    var args = Array.prototype.slice.call(arguments, 1);

	    return function() {
	        handler.apply(undefined, args);
	    };
	}

	function create(args) {
	    tasks[ nextId ] = wrap.apply(undefined, args);
	    return nextId++;
	}

	function clear(handleId) {
	    delete tasks[ handleId ];
	}

	function run(handleId) {
	    if (lock) {
	        context.setTimeout( wrap( run, handleId ), 0 );

	    } else {
	        var task = tasks[ handleId ];

	        if (task) {
	            lock = true;

	            try {
	                task();

	            } finally {
	                clear( handleId );
	                lock = false;
	            }
	        }
	    }
	}

	exports.run = run;
	exports.wrap = wrap;
	exports.create = create;
	exports.clear = clear;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var Timer = __webpack_require__(3);

	exports.init = function() {
	    var polifill = function() {
	        var handleId = Timer.create(arguments);
	        context.setTimeout( Timer.wrap( Timer.run, handleId ), 0 );
	        return handleId;
	    };
	    polifill.usePolifill = 'setTimeout';
	    return polifill;
	};

	exports.canUse = function() {
	    return true;
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var Timer = __webpack_require__(3);

	exports.init = function() {
	    var polifill = function() {
	        var handleId = Timer.create(arguments);
	        context.process.nextTick( Timer.wrap( Timer.run, handleId ) );
	        return handleId;
	    };
	    polifill.usePolifill = 'nextTick';
	    return polifill;
	};

	// Don't get fooled by e.g. browserify environments.
	// For Node.js before 0.9
	exports.canUse = function() {
	    return (Object.prototype.toString.call(context.process) === '[object process]');
	};


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var Timer = __webpack_require__(3);

	exports.init = function() {
	    var messagePrefix = 'setImmediate$' + Math.random() + '$';

	    var onGlobalMessage = function(event) {
	        if (event.source === context &&
	            typeof(event.data) === 'string' &&
	            event.data.indexOf(messagePrefix) === 0) {

	            Timer.run(Number(event.data.slice(messagePrefix.length)));
	        }
	    };

	    if (context.addEventListener) {
	        context.addEventListener('message', onGlobalMessage, false);

	    } else {
	        context.attachEvent('onmessage', onGlobalMessage);
	    }

	    var polifill = function() {
	        var handleId = Timer.create(arguments);
	        context.postMessage(messagePrefix + handleId, '*');
	        return handleId;
	    };
	    polifill.usePolifill = 'postMessage';
	    return polifill;
	};

	// For non-IE10 modern browsers
	exports.canUse = function() {
	    if (context.importScripts || !context.postMessage) {
	        return false;
	    }

	    var asynch = true;
	    var oldOnMessage = context.onmessage;
	    context.onmessage = function() {
	        asynch = false;
	    };

	    context.postMessage('', '*');
	    context.onmessage = oldOnMessage;
	    return asynch;
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var Timer = __webpack_require__(3);

	exports.init = function() {
	    var channel = new context.MessageChannel();

	    channel.port1.onmessage = function(event) {
	        Timer.run(Number(event.data));
	    };

	    var polifill = function() {
	        var handleId = Timer.create(arguments);
	        channel.port2.postMessage(handleId);
	        return handleId;
	    };
	    polifill.usePolifill = 'messageChannel';
	    return polifill;
	};

	// For web workers, where supported
	exports.canUse = function() {
	    return Boolean(context.MessageChannel);
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var Timer = __webpack_require__(3);

	exports.init = function() {
	    var html = context.document.documentElement;
	    var polifill = function() {
	        var handleId = Timer.create(arguments);
	        var script = context.document.createElement('script');

	        script.onreadystatechange = function() {
	            Timer.run(handleId);
	            script.onreadystatechange = null;
	            html.removeChild(script);
	            script = null;
	        };

	        html.appendChild(script);
	        return handleId;
	    };

	    polifill.usePolifill = 'readyStateChange';
	    return polifill;
	};

	// For IE 6–8
	exports.canUse = function() {
	    return (context.document && ('onreadystatechange' in context.document.createElement('script')));
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var context = __webpack_require__(1);
	var Timer = __webpack_require__(3);

	exports.init = function() {
	    var polifill = function() {
	        var handleId = Timer.create(arguments);
	        var img = new context.Image();
	        img.onload = img.onerror = Timer.wrap( Timer.run, handleId );
	        img.src = '';

	        return handleId;
	    };
	    polifill.usePolifill = 'image';
	    return polifill;
	};

	exports.canUse = function() {
	    return Boolean(context.window && context.Image);
	};


/***/ }
/******/ ])
});
;
},{}],11:[function(require,module,exports){
"use strict";
var Event_1 = require('../tools/event/Event');
var AbstractCLI = (function () {
    function AbstractCLI() {
        this.events = {
            outputAvailable: new Event_1.default(),
            quit: new Event_1.default(),
            promptChanged: new Event_1.default(),
            prompt: new Event_1.default(),
            availableCommandsChanged: new Event_1.default()
        };
    }
    return AbstractCLI;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AbstractCLI;

},{"../tools/event/Event":31}],12:[function(require,module,exports){
"use strict";
var CommandInterpreter = (function () {
    function CommandInterpreter(commandTable) {
        this._commandTable = {};
        this._aliasTable = {};
        if (typeof (commandTable) !== 'undefined')
            this.registerCommands(commandTable);
    }
    CommandInterpreter.prototype.registerCommands = function (commandTable) {
        var _this = this;
        Object.keys(commandTable).forEach(function (command) { return _this._commandTable[command] = commandTable[command]; });
    };
    CommandInterpreter.prototype.execute = function (cmd) {
        cmd = cmd.replace(/;.*/, '');
        if (cmd.match(/^\s*$/))
            return '';
        var components = cmd.split(/\s+/).filter(function (value) { return !!value; }), commandName = components.shift();
        return this._locateCommand(commandName).call(this, components, cmd);
    };
    CommandInterpreter.prototype.getCommands = function () {
        return Object.keys(this._commandTable);
    };
    CommandInterpreter.prototype._locateCommand = function (name) {
        if (this._commandTable[name])
            return this._commandTable[name];
        if (this._aliasTable[name])
            return this._aliasTable[name];
        var candidates = Object.keys(this._commandTable).filter(function (candidate) { return candidate.indexOf(name) === 0; });
        var nCandidates = candidates.length;
        if (nCandidates > 1)
            throw new Error('ambiguous command ' + name + ', candidates are ' +
                candidates.join(', ').replace(/, $/, ''));
        if (nCandidates === 0)
            throw new Error('invalid command ' + name);
        return this._aliasTable[name] = this._commandTable[candidates[0]];
    };
    return CommandInterpreter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandInterpreter;

},{}],13:[function(require,module,exports){
"use strict";
var pathlib = require('path');
var Completer = (function () {
    function Completer(_availableCommands, _fsProvider) {
        this._availableCommands = _availableCommands;
        this._fsProvider = _fsProvider;
    }
    Completer.prototype.complete = function (cmd) {
        var chunks = cmd.split(/\s+/);
        if (chunks.length > 0 && chunks[0] === '')
            chunks.shift();
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
        if (!this._fsProvider)
            return [];
        if (path && path[path.length - 1] === pathlib.sep || path[path.length - 1] === '/') {
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
                return (_this._fsProvider.getTypeSync(path) === 0 /* DIRECTORY */ ?
                    pathlib.join(path, pathlib.sep) : path);
            }
            catch (e) {
                return path;
            }
        });
    };
    return Completer;
}());
var Completer;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Completer;

},{"path":6}],14:[function(require,module,exports){
"use strict";
var BoardInterface_1 = require('../machine/board/BoardInterface');
var hex = require('../tools/hex');
var util = require('util');
function decodeNumber(value) {
    try {
        return hex.decode(value);
    }
    catch (e) {
        if (!value.match(/^-?\d+$/))
            throw new TypeError('number expected, got ' + value);
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
            'step': this._step.bind(this),
            'step-clock': this._stepClock.bind(this),
            "reset": function () { return _this._reset(false); },
            "reset-hard": function () { return _this._reset(true); },
            'break-on': this._enableBreakpoints.bind(this),
            'break-off': this._disableBreakpoints.bind(this),
            'break': this._setBreakpoint.bind(this),
            'break-clear': this._clearBreakpoint.bind(this),
            'break-dump': this._showBreakpoints.bind(this),
            'break-clear-all': this._clearAllBreakpoints.bind(this),
            'trace-on': this._enableTrace.bind(this),
            'trace-off': this._disableTrace.bind(this),
            'trace': this._trace.bind(this)
        });
    }
    DebuggerFrontend.prototype.describeTrap = function (trap) {
        if (typeof (trap) === 'undefined')
            trap = this._debugger.getLastTrap();
        if (!trap)
            return '';
        var message = trap.message ? trap.message : 'unknown';
        switch (trap.reason) {
            case 0 /* cpu */:
                return util.format('CPU TRAP: %s', message);
            case 2 /* debug */:
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
        if (args.length < 1)
            throw new Error('at least one argument expected');
        return this._debugger.dumpAt(Math.abs(decodeNumber(args[0])), Math.abs(args.length > 1 ? decodeNumber(args[1]) : 1));
    };
    DebuggerFrontend.prototype._load = function (args) {
        if (args.length < 2)
            throw new Error('at least two arguments. expected');
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
        var clockHandler = function (clock) { return cycles += clock; };
        board.cpuClock.addHandler(clockHandler);
        var exception;
        try {
            this._debugger.getBoard().boot();
        }
        catch (e) {
            exception = e || new Error('unknown exception during boot');
        }
        board.cpuClock.removeHandler(clockHandler);
        if (exception)
            throw (exception);
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
        if (args.length < 1)
            throw new Error('at least one argument expected');
        var name = args.length > 1 ? args[1] : '-', address = decodeNumber(args[0]);
        this._debugger.setBreakpoint(address, name);
        return 'Breakpoint "' + name + '" at ' + hex.encode(address, 4);
    };
    DebuggerFrontend.prototype._clearBreakpoint = function (args) {
        if (args.length < 1)
            throw new Error('argument expected');
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
        return "clock stepped " + cycles + " cycles in " + time + " msec; now at " + this._debugger.disassemble(1) + "\n" + (trap ? this.describeTrap(trap) : '');
    };
    return DebuggerFrontend;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DebuggerFrontend;

},{"../machine/board/BoardInterface":20,"../tools/hex":32,"util":9}],15:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require('path');
var Board_1 = require('../machine/ehbasic/Board');
var Debugger_1 = require('../machine/Debugger');
var DebuggerFrontend_1 = require('./DebuggerFrontend');
var CommandInterpreter_1 = require('./CommandInterpreter');
var AbstractCLI_1 = require('./AbstractCLI');
var ImmedateScheduler_1 = require('../tools/scheduler/ImmedateScheduler');
var PeriodicScheduler_1 = require('../tools/scheduler/PeriodicScheduler');
var ClockProbe_1 = require('../tools/ClockProbe');
var OUTPUT_FLUSH_INTERVAL = 100;
var CLOCK_PROBE_INTERVAL = 1000;
var EhBasicCLI = (function (_super) {
    __extends(EhBasicCLI, _super);
    function EhBasicCLI(_fsProvider) {
        var _this = this;
        _super.call(this);
        this._fsProvider = _fsProvider;
        this._allowQuit = true;
        this._outputBuffer = '';
        this._inputBuffer = [];
        this._promptForInput = true;
        this._cliOutputBuffer = '';
        var board = new Board_1.default(), dbg = new Debugger_1.default(), commandInterpreter = new CommandInterpreter_1.default(), debuggerFrontend = new DebuggerFrontend_1.default(dbg, this._fsProvider, commandInterpreter), clockProbe = new ClockProbe_1.default(new PeriodicScheduler_1.default(CLOCK_PROBE_INTERVAL));
        dbg.attach(board);
        clockProbe.attach(board.cpuClock);
        clockProbe.frequencyUpdate.addHandler(function () { return _this.events.promptChanged.dispatch(undefined); });
        board.trap.addHandler(this._onTrap, this);
        commandInterpreter.registerCommands({
            quit: function () {
                if (_this._allowQuit)
                    _this._setState(2 /* quit */);
                return 'bye';
            },
            run: function () {
                _this._setState(1 /* run */);
                return 'running, press ctl-c to interrupt...';
            },
            input: function (args, cmd) {
                var data = cmd.replace(/^\s*input\s*/, '').replace(/\\n/, '\n'), length = data.length;
                for (var i = 0; i < length; i++)
                    _this._inputBuffer.push(data[i] === '\n' ? 0x0D : data.charCodeAt(i) & 0xFF);
                return '';
            },
            'run-script': function (args) {
                if (!args.length)
                    throw new Error('filename required');
                _this.runDebuggerScript(args[0]);
                return 'script executed';
            },
            'read-program': function (args) {
                if (!args.length)
                    throw new Error('filename required');
                _this.readBasicProgram(args[0]);
                return 'program read into buffer';
            }
        });
        board.getSerialIO()
            .setOutCallback(function (value) { return _this._serialOutHandler(value); })
            .setInCallback(function () { return _this._serialInHandler(); });
        this._commands = commandInterpreter.getCommands();
        this._board = board;
        this._commandInterpreter = commandInterpreter;
        this._scheduler = new ImmedateScheduler_1.default();
        this._clockProbe = clockProbe;
        this._debuggerFrontend = debuggerFrontend;
    }
    EhBasicCLI.prototype.runDebuggerScript = function (filename) {
        var _this = this;
        this._fsProvider.pushd(path.dirname(filename));
        try {
            this._fsProvider.readTextFileSync(path.basename(filename))
                .split('\n')
                .forEach(function (line) {
                _this.pushInput(line);
            });
        }
        catch (e) {
            this._fsProvider.popd();
            throw e;
        }
        this._fsProvider.popd();
    };
    EhBasicCLI.prototype.readBasicProgram = function (filename) {
        var _this = this;
        this._fsProvider.readTextFileSync(filename)
            .split('\n')
            .forEach(function (line) {
            var length = line.length;
            for (var i = 0; i < length; i++) {
                _this._inputBuffer.push(line.charCodeAt(i) & 0xFF);
            }
            _this._inputBuffer.push(0x0D);
        });
    };
    EhBasicCLI.prototype.startup = function () {
        this._setState(0 /* debug */);
        var scheduler = new PeriodicScheduler_1.default(OUTPUT_FLUSH_INTERVAL);
        this._flushOutputTask = scheduler.start(function (cli) { return cli._flushOutput(); }, this);
        this._prompt();
    };
    EhBasicCLI.prototype.shutdown = function () {
        if (!this._flushOutputTask)
            return;
        this._flushOutputTask.stop();
        this._flushOutputTask = undefined;
    };
    EhBasicCLI.prototype.readOutput = function () {
        var buffer = this._cliOutputBuffer;
        this._cliOutputBuffer = '';
        return buffer;
    };
    EhBasicCLI.prototype.availableCommands = function () {
        return this._commandInterpreter.getCommands();
    };
    EhBasicCLI.prototype.interrupt = function () {
        switch (this._state) {
            case 1 /* run */:
                this._setState(0 /* debug */);
                this._prompt();
                break;
            case 0 /* debug */:
                if (this._allowQuit)
                    this._setState(2 /* quit */);
                break;
        }
    };
    EhBasicCLI.prototype.outputAvailable = function () {
        return !!this._cliOutputBuffer;
    };
    EhBasicCLI.prototype.pushInput = function (data) {
        switch (this._state) {
            case 1 /* run */:
                var size = data.length;
                for (var i = 0; i < size; i++) {
                    this._inputBuffer.push(data.charCodeAt(i) & 0xFF);
                }
                this._inputBuffer.push(0x0D);
                break;
            case 0 /* debug */:
                try {
                    this._outputLine(this._commandInterpreter.execute(data));
                }
                catch (e) {
                    this._outputLine('ERROR: ' + e.message);
                }
                this._prompt();
                break;
        }
    };
    EhBasicCLI.prototype.allowQuit = function (toggle) {
        this._allowQuit = toggle;
    };
    EhBasicCLI.prototype.getPrompt = function () {
        var prompt = this._clockProbe.getFrequency() > 0 ?
            (this._clockProbe.getFrequency() / 1000000).toFixed(2) + ' MHz ' : '';
        switch (this._state) {
            case 1 /* run */:
                prompt += '[run] # ';
                break;
            case 0 /* debug */:
                prompt += '[dbg] # ';
                break;
        }
        return prompt;
    };
    EhBasicCLI.prototype.getFilesystemProvider = function () {
        return this._fsProvider;
    };
    EhBasicCLI.prototype._setState = function (newState) {
        if (this._state === newState)
            return;
        var timer = this._board.getTimer();
        this._state = newState;
        switch (this._state) {
            case 1 /* run */:
                if (this._outputBuffer) {
                    this._outputRaw(this._outputBuffer);
                    this._outputBuffer = '';
                }
                timer.start(this._scheduler);
                this._clockProbe.start();
                break;
            case 0 /* debug */:
                timer.stop();
                this._clockProbe.stop();
                break;
            case 2 /* quit */:
                timer.stop();
                if (this._allowQuit)
                    this.events.quit.dispatch(undefined);
                break;
        }
        this.events.promptChanged.dispatch(undefined);
    };
    EhBasicCLI.prototype._serialOutHandler = function (value) {
        switch (this._state) {
            case 0 /* debug */:
                this._outputBuffer += String.fromCharCode(value);
                this._outputLine('output event, buffer now\n' +
                    this._outputBuffer +
                    "\n");
                break;
            case 1 /* run */:
                this._outputRaw(String.fromCharCode(value));
                break;
        }
    };
    EhBasicCLI.prototype._serialInHandler = function () {
        if (this._inputBuffer.length > 0) {
            this._promptForInput = true;
            return this._inputBuffer.shift();
        }
        if (this._state === 1 /* run */ && this._promptForInput) {
            this._promptForInput = false;
            this._outputLine();
            this._prompt();
        }
        return 0;
    };
    EhBasicCLI.prototype._outputRaw = function (output) {
        this._cliOutputBuffer += output;
    };
    EhBasicCLI.prototype._outputLine = function (output) {
        if (output === void 0) { output = ''; }
        this._cliOutputBuffer += (output + "\n");
    };
    EhBasicCLI.prototype._flushOutput = function () {
        if (this._cliOutputBuffer)
            this.events.outputAvailable.dispatch(undefined);
    };
    EhBasicCLI.prototype._prompt = function () {
        this._flushOutput();
        this.events.prompt.dispatch(undefined);
    };
    EhBasicCLI.prototype._onTrap = function (trap, ctx) {
        if (ctx._state === 1 /* run */) {
            ctx._setState(0 /* debug */);
            ctx._outputLine('\n' + ctx._debuggerFrontend.describeTrap(trap));
            ctx._prompt();
        }
    };
    return EhBasicCLI;
}(AbstractCLI_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EhBasicCLI;

},{"../machine/Debugger":19,"../machine/ehbasic/Board":25,"../tools/ClockProbe":29,"../tools/scheduler/ImmedateScheduler":33,"../tools/scheduler/PeriodicScheduler":34,"./AbstractCLI":11,"./CommandInterpreter":12,"./DebuggerFrontend":14,"path":6}],16:[function(require,module,exports){
/// <reference path="../interface/jquery.terminal.d.ts"/>
"use strict";
var Completer_1 = require('./Completer');
var JqtermCLIRunner = (function () {
    function JqtermCLIRunner(_cli, terminalElt, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this._cli = _cli;
        this._updateCompleter();
        this._terminal = terminalElt.terminal(function (input, terminal) {
            return _this._cli.pushInput(input);
        }, {
            greetings: 'Ready.',
            completion: function (terminal, cmd, handler) {
                return handler(_this._completer.complete(terminal.get_command()).candidates);
            },
            exit: false,
            clear: false
        });
        this._cli.events.outputAvailable.addHandler(this._onCLIOutputAvailable, this);
        this._cli.events.promptChanged.addHandler(this._onCLIPromptChanged, this);
        this._cli.events.availableCommandsChanged.addHandler(this._updateCompleter.bind(this));
        if (options.interruptButton)
            options.interruptButton.mousedown(function () { return _this._cli.interrupt(); });
        if (options.clearButton)
            options.clearButton.mousedown(function () { return _this._terminal.clear(); });
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
    return JqtermCLIRunner;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JqtermCLIRunner;

},{"./Completer":13}],17:[function(require,module,exports){
"use strict";
var pathlib = require('path');
var AbstractFileSystemProvider = (function () {
    function AbstractFileSystemProvider() {
        this._directoryStack = [];
        this._cwd = '/';
    }
    AbstractFileSystemProvider.prototype.pushd = function (path) {
        this._directoryStack.unshift(this._cwd);
        if (typeof (path) !== 'undefined')
            this.chdir(path);
    };
    AbstractFileSystemProvider.prototype.popd = function () {
        if (this._directoryStack.length === 0)
            return;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AbstractFileSystemProvider;

},{"path":6}],18:[function(require,module,exports){
(function (Buffer){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var util = require('util');
var AbstractFileSystemProvider_1 = require('./AbstractFileSystemProvider');
var PrepackagedFilesystemProvider = (function (_super) {
    __extends(PrepackagedFilesystemProvider, _super);
    function PrepackagedFilesystemProvider(_blob) {
        _super.call(this);
        this._blob = _blob;
        this._cwd = '/';
    }
    PrepackagedFilesystemProvider.prototype.readBinaryFileSync = function (name) {
        name = this._resolvePath(name);
        var content = this._lookup(name);
        if (typeof (content) === 'undefined')
            throw new Error(util.format('%s not part of file bundle', name));
        if (!Buffer.isBuffer(content))
            throw new Error(util.format('%s is a directory, not a file', name));
        return content;
    };
    PrepackagedFilesystemProvider.prototype.readTextFileSync = function (name) {
        var buffer = this.readBinaryFileSync(name);
        return buffer.toString();
    };
    PrepackagedFilesystemProvider.prototype.readDirSync = function (name) {
        name = this._resolvePath(name);
        var content = this._lookup(name);
        if (typeof (content) === 'undefined')
            throw new Error(util.format('%s not part of file bundle', name));
        if (typeof (content) === 'string' || Buffer.isBuffer(content))
            throw new Error(util.format('%s is a file, not a directory', name));
        return Object.keys(content);
    };
    PrepackagedFilesystemProvider.prototype.getTypeSync = function (name) {
        name = this._resolvePath(name);
        var content = this._lookup(name);
        if (typeof (content) === 'undefined')
            throw new Error(util.format('%s not part of file bundle', name));
        if (Buffer.isBuffer(content)) {
            return 1 /* FILE */;
        }
        else {
            return 0 /* DIRECTORY */;
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
        if (name && typeof (scope[name]) === 'string')
            scope[name] = new Buffer(scope[name], 'base64');
        return name ? scope[name] : scope;
    };
    return PrepackagedFilesystemProvider;
}(AbstractFileSystemProvider_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PrepackagedFilesystemProvider;

}).call(this,require("buffer").Buffer)

},{"./AbstractFileSystemProvider":17,"buffer":1,"util":9}],19:[function(require,module,exports){
"use strict";
var Instruction_1 = require('./cpu/Instruction');
var Disassembler_1 = require('./cpu/Disassembler');
var CpuInterface_1 = require('./cpu/CpuInterface');
var BoardInterface_1 = require('./board/BoardInterface');
var hex = require('../tools/hex');
var binary = require('../tools/binary');
var util = require('util');
var Debugger = (function () {
    function Debugger(_traceSize, _stepMaxCycles) {
        if (_traceSize === void 0) { _traceSize = 1024; }
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
        if (!this._board)
            return;
        this._board.cpuClock.removeHandler(this._cpuClockHandler);
        this._board.trap.removeHandler(this._trapHandler);
        return this;
    };
    Debugger.prototype.clearAllBreakpoints = function () {
        for (var i = 0; i < 0x10000; i++)
            this._breakpoints[i] = 0;
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
            if (this._breakpoints[address])
                result += (hex.encode(address, 4) + ': ' +
                    this._breakpointDescriptions[address] + '\n');
        }
        return result.replace(/\n$/, '');
    };
    Debugger.prototype.loadBlock = function (block, at, from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = block.length - 1; }
        for (var i = 0; i <= to - from; i++)
            this._poke(at + i, block[i]);
    };
    Debugger.prototype.disassembleAt = function (start, length) {
        var i = 0, result = '', instruction, address;
        while (i < length) {
            address = (start + i) % 0x10000;
            instruction = Instruction_1.default.opcodes[this._peek(address)];
            result += ((this._breakpoints[address] ? '(B) ' : '    ') +
                hex.encode(address, 4) + ':   ' +
                this._disassembler.disassembleAt(address) + '\n');
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
            result += (this.disassembleAt(this._trace[(this._traceSize + this._traceIndex - length + i) % this._traceSize], 1) + '\n');
        }
        return result + this.disassemble(1);
    };
    Debugger.prototype.dumpAt = function (start, length) {
        var result = '', address;
        for (var i = 0; i < length; i++) {
            address = (start + i) % 0x10000;
            result += (hex.encode(address, 4) + ':   ' +
                hex.encode(this._peek(address), 2) + '\n');
        }
        return result.replace(/\n$/, '');
    };
    Debugger.prototype.dumpState = function () {
        var state = this._cpu.state;
        switch (this._cpu.executionState) {
            case 0 /* boot */:
        }
        var result = '' +
            'A = ' + hex.encode(state.a, 2) + '   ' +
            'X = ' + hex.encode(state.x, 2) + '   ' +
            'Y = ' + hex.encode(state.y, 2) + '   ' +
            'S = ' + hex.encode(state.s, 2) + '   ' +
            'P = ' + hex.encode(state.p, 4) + '\n' +
            'flags = ' + binary.encode(state.flags, 8) + '\n' +
            'state: ' + this._humanReadableExecutionState();
        var boardState = this._board.getBoardStateDebug();
        if (boardState) {
            result += ('\n' +
                '\n' +
                boardState);
        }
        return result;
    };
    Debugger.prototype.dumpStack = function () {
        return this.dumpAt(0x0100 + this._cpu.state.s, 0x100 - this._cpu.state.s);
    };
    Debugger.prototype.step = function (instructions) {
        var instruction = 0, cycles = 0, lastExecutionState = this._cpu.executionState, cpuCycles = 0, timer = this._board.getTimer();
        var cpuClockHandler = function (c) { return cpuCycles += c; };
        this._board.cpuClock.addHandler(cpuClockHandler);
        this._lastTrap = undefined;
        this._board.resume();
        while (instruction < instructions && !this._lastTrap && cycles < this._stepMaxCycles) {
            timer.tick(1);
            cycles++;
            if (lastExecutionState !== this._cpu.executionState) {
                lastExecutionState = this._cpu.executionState;
                if (lastExecutionState === 1 /* fetch */) {
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
            case 0 /* boot */:
                return 'boot';
            case 1 /* fetch */:
                return 'fetch';
            case 2 /* execute */:
                return 'execute';
        }
    };
    Debugger.prototype._attachToCpuIfNecessary = function () {
        if (this._traceEnabled || this._breakpointsEnabled) {
            this._lastInstructionPointer = this._cpu.getLastInstructionPointer() || 0;
            this._board.cpuClock.addHandler(this._cpuClockHandler, this);
            this._board.setClockMode(0 /* instruction */);
        }
        else {
            this._board.cpuClock.removeHandler(this._cpuClockHandler, this);
            this._board.setClockMode(1 /* lazy */);
        }
    };
    Debugger.prototype._cpuClockHandler = function (clocks, ctx) {
        var lastInstructionPointer = ctx._cpu.getLastInstructionPointer();
        if (ctx._cpu.executionState !== 1 /* fetch */ ||
            lastInstructionPointer === ctx._lastInstructionPointer) {
            return;
        }
        ctx._lastInstructionPointer = lastInstructionPointer;
        if (ctx._traceEnabled) {
            ctx._trace[ctx._traceIndex] = lastInstructionPointer;
            ctx._traceIndex = (ctx._traceIndex + 1) % ctx._traceSize;
            if (ctx._traceLength < ctx._traceSize)
                ctx._traceLength++;
        }
        if (ctx._breakpointsEnabled && ctx._breakpoints[ctx._cpu.state.p]) {
            ctx._board.triggerTrap(2 /* debug */, util.format('breakpoint "%s" at %s', ctx._breakpointDescriptions[ctx._cpu.state.p] || '', hex.encode(ctx._cpu.state.p)));
        }
    };
    Debugger.prototype._trapHandler = function (trap, dbg) {
        dbg._lastTrap = trap;
    };
    Debugger.prototype._peek = function (address) {
        return this._bus.peek(address % 0x10000);
    };
    Debugger.prototype._poke = function (address, value) {
        this._bus.poke(address % 0x10000, value & 0xFF);
    };
    return Debugger;
}());
;
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Debugger;

},{"../tools/binary":30,"../tools/hex":32,"./board/BoardInterface":20,"./cpu/CpuInterface":22,"./cpu/Disassembler":23,"./cpu/Instruction":24,"util":9}],20:[function(require,module,exports){
"use strict";
var BoardInterface;
(function (BoardInterface) {
    ;
    ;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BoardInterface;

},{}],21:[function(require,module,exports){
"use strict";
var Instruction_1 = require('./Instruction');
var CpuInterface_1 = require('./CpuInterface');
function setFlagsNZ(state, operand) {
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */)) |
        (operand & 0x80) |
        (operand ? 0 : 2 /* z */);
}
function opBoot(state, bus) {
    state.p = bus.readWord(0xFFFC);
}
function opAdc(state, bus, operand) {
    if (state.flags & 8 /* d */) {
        var d0 = (operand & 0x0F) + (state.a & 0x0F) + (state.flags & 1 /* c */), d1 = (operand >>> 4) + (state.a >>> 4) + (d0 > 9 ? 1 : 0);
        state.a = (d0 % 10) | ((d1 % 10) << 4);
        state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2 /* z */) |
            (d1 > 9 ? 1 /* c */ : 0); // carry
    }
    else {
        var sum = state.a + operand + (state.flags & 1 /* c */), result = sum & 0xFF;
        state.flags =
            (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */ | 64 /* v */)) |
                (result & 0x80) |
                (result ? 0 : 2 /* z */) |
                (sum >>> 8) |
                (((~(operand ^ state.a) & (result ^ operand)) & 0x80) >>> 1); // overflow
        state.a = result;
    }
}
function opAnd(state, bus, operand) {
    state.a &= operand;
    setFlagsNZ(state, state.a);
}
function opAslAcc(state) {
    var old = state.a;
    state.a = (state.a << 1) & 0xFF;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (state.a & 0x80) |
        (state.a ? 0 : 2 /* z */) |
        (old >>> 7);
}
function opAslMem(state, bus, operand) {
    var old = bus.read(operand), value = (old << 1) & 0xFF;
    bus.write(operand, value);
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (value & 0x80) |
        (value ? 0 : 2 /* z */) |
        (old >>> 7);
}
function opBit(state, bus, operand) {
    state.flags =
        (state.flags & ~(128 /* n */ | 64 /* v */ | 2 /* z */)) |
            (operand & (128 /* n */ | 64 /* v */)) |
            ((operand & state.a) ? 0 : 2 /* z */);
}
function opBrk(state, bus) {
    var nextOpAddr = (state.p + 1) & 0xFFFF;
    bus.write(state.s + 0x0100, (nextOpAddr >>> 8) & 0xFF);
    state.s = (state.s + 0xFF) & 0xFF;
    bus.write(state.s + 0x0100, nextOpAddr & 0xFF);
    state.s = (state.s + 0xFF) & 0xFF;
    bus.write(state.s + 0x0100, state.flags | 16 /* b */);
    state.s = (state.s + 0xFF) & 0xFF;
    state.flags |= 4 /* i */;
    state.p = (bus.readWord(0xFFFE));
}
function opClc(state) {
    state.flags &= ~1 /* c */;
}
function opCld(state) {
    state.flags &= ~8 /* d */;
}
function opCli(state) {
    state.flags &= ~4 /* i */;
}
function opClv(state) {
    state.flags &= ~64 /* v */;
}
function opCmp(state, bus, operand) {
    var diff = state.a + (~operand & 0xFF) + 1;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (diff & 0x80) |
        ((diff & 0xFF) ? 0 : 2 /* z */) |
        (diff >>> 8);
}
function opCpx(state, bus, operand) {
    var diff = state.x + (~operand & 0xFF) + 1;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (diff & 0x80) |
        ((diff & 0xFF) ? 0 : 2 /* z */) |
        (diff >>> 8);
}
function opCpy(state, bus, operand) {
    var diff = state.y + (~operand & 0xFF) + 1;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (diff & 0x80) |
        ((diff & 0xFF) ? 0 : 2 /* z */) |
        (diff >>> 8);
}
function opDec(state, bus, operand) {
    var value = (bus.read(operand) + 0xFF) & 0xFF;
    bus.write(operand, value);
    setFlagsNZ(state, value);
}
function opDex(state) {
    state.x = (state.x + 0xFF) & 0xFF;
    setFlagsNZ(state, state.x);
}
function opEor(state, bus, operand) {
    state.a = state.a ^ operand;
    setFlagsNZ(state, state.a);
}
function opDey(state) {
    state.y = (state.y + 0xFF) & 0xFF;
    setFlagsNZ(state, state.y);
}
function opInc(state, bus, operand) {
    var value = (bus.read(operand) + 1) & 0xFF;
    bus.write(operand, value);
    setFlagsNZ(state, value);
}
function opInx(state) {
    state.x = (state.x + 0x01) & 0xFF;
    setFlagsNZ(state, state.x);
}
function opIny(state) {
    state.y = (state.y + 0x01) & 0xFF;
    setFlagsNZ(state, state.y);
}
function opJmp(state, bus, operand) {
    state.p = operand;
}
function opJsr(state, bus, operand) {
    var returnPtr = (state.p + 0xFFFF) & 0xFFFF;
    bus.write(0x0100 + state.s, returnPtr >>> 8);
    state.s = (state.s + 0xFF) & 0xFF;
    bus.write(0x0100 + state.s, returnPtr & 0xFF);
    state.s = (state.s + 0xFF) & 0xFF;
    state.p = operand;
}
function opLda(state, bus, operand) {
    state.a = operand;
    setFlagsNZ(state, operand);
}
function opLdx(state, bus, operand) {
    state.x = operand;
    setFlagsNZ(state, operand);
}
function opLdy(state, bus, operand) {
    state.y = operand;
    setFlagsNZ(state, operand);
}
function opLsrAcc(state) {
    var old = state.a;
    state.a = state.a >>> 1;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (state.a & 0x80) |
        (state.a ? 0 : 2 /* z */) |
        (old & 1 /* c */);
}
function opLsrMem(state, bus, operand) {
    var old = bus.read(operand), value = old >>> 1;
    bus.write(operand, value);
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (value & 0x80) |
        (value ? 0 : 2 /* z */) |
        (old & 1 /* c */);
}
function opNop() { }
function opOra(state, bus, operand) {
    state.a |= operand;
    setFlagsNZ(state, state.a);
}
function opPhp(state, bus) {
    bus.write(0x0100 + state.s, state.flags);
    state.s = (state.s + 0xFF) & 0xFF;
}
function opPlp(state, bus) {
    var mask = 16 /* b */ | 32 /* e */;
    state.s = (state.s + 0x01) & 0xFF;
    state.flags = (state.flags & mask) | (bus.read(0x0100 + state.s) & ~mask);
}
function opPha(state, bus) {
    bus.write(0x0100 + state.s, state.a);
    state.s = (state.s + 0xFF) & 0xFF;
}
function opPla(state, bus) {
    state.s = (state.s + 0x01) & 0xFF;
    state.a = bus.read(0x0100 + state.s);
    setFlagsNZ(state, state.a);
}
function opRolAcc(state) {
    var old = state.a;
    state.a = ((state.a << 1) & 0xFF) | (state.flags & 1 /* c */);
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (state.a & 0x80) |
        (state.a ? 0 : 2 /* z */) |
        (old >>> 7);
}
function opRolMem(state, bus, operand) {
    var old = bus.read(operand), value = ((old << 1) & 0xFF) | (state.flags & 1 /* c */);
    bus.write(operand, value);
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (value & 0x80) |
        (value ? 0 : 2 /* z */) |
        (old >>> 7);
}
function opRorAcc(state) {
    var old = state.a;
    state.a = (state.a >>> 1) | ((state.flags & 1 /* c */) << 7);
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (state.a & 0x80) |
        (state.a ? 0 : 2 /* z */) |
        (old & 1 /* c */);
}
function opRorMem(state, bus, operand) {
    var old = bus.read(operand), value = (old >>> 1) | ((state.flags & 1 /* c */) << 7);
    bus.write(operand, value);
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (value & 0x80) |
        (value ? 0 : 2 /* z */) |
        (old & 1 /* c */);
}
function opRti(state, bus) {
    var returnPtr;
    state.s = (state.s + 1) & 0xFF;
    state.flags = bus.read(0x0100 + state.s);
    state.s = (state.s + 1) & 0xFF;
    returnPtr = bus.read(0x0100 + state.s);
    state.s = (state.s + 1) & 0xFF;
    returnPtr |= (bus.read(0x0100 + state.s) << 8);
    state.p = returnPtr;
}
function opRts(state, bus) {
    var returnPtr;
    state.s = (state.s + 1) & 0xFF;
    returnPtr = bus.read(0x0100 + state.s);
    state.s = (state.s + 1) & 0xFF;
    returnPtr += (bus.read(0x0100 + state.s) << 8);
    state.p = (returnPtr + 1) & 0xFFFF;
}
function opSbc(state, bus, operand) {
    if (state.flags & 8 /* d */) {
        var d0 = ((state.a & 0x0F) - (operand & 0x0F) - (~state.flags & 1 /* c */)), d1 = ((state.a >>> 4) - (operand >>> 4) - (d0 < 0 ? 1 : 0));
        state.a = (d0 < 0 ? 10 + d0 : d0) | ((d1 < 0 ? 10 + d1 : d1) << 4);
        state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
            (state.a & 0x80) |
            (state.a ? 0 : 2 /* z */) |
            (d1 < 0 ? 0 : 1 /* c */); // carry / borrow
    }
    else {
        operand = (~operand & 0xFF);
        var sum = state.a + operand + (state.flags & 1 /* c */), result = sum & 0xFF;
        state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */ | 64 /* v */)) |
            (result & 0x80) |
            (result ? 0 : 2 /* z */) |
            (sum >>> 8) |
            (((~(operand ^ state.a) & (result ^ operand)) & 0x80) >>> 1); // overflow
        state.a = result;
    }
}
function opSec(state) {
    state.flags |= 1 /* c */;
}
function opSed(state) {
    state.flags |= 8 /* d */;
}
function opSei(state) {
    state.flags |= 4 /* i */;
}
function opSta(state, bus, operand) {
    bus.write(operand, state.a);
}
function opStx(state, bus, operand) {
    bus.write(operand, state.x);
}
function opSty(state, bus, operand) {
    bus.write(operand, state.y);
}
function opTax(state) {
    state.x = state.a;
    setFlagsNZ(state, state.a);
}
function opTay(state) {
    state.y = state.a;
    setFlagsNZ(state, state.a);
}
function opTsx(state) {
    state.x = state.s;
    setFlagsNZ(state, state.x);
}
function opTxa(state) {
    state.a = state.x;
    setFlagsNZ(state, state.a);
}
function opTxs(state) {
    state.s = state.x;
}
function opTya(state) {
    state.a = state.y;
    setFlagsNZ(state, state.a);
}
function opAlr(state, bus, operand) {
    var old = state.a;
    state.a = (state.a & operand) >>> 1;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (state.a & 0x80) |
        (state.a ? 0 : 2 /* z */) |
        (old & 1 /* c */);
}
function opAxs(state, bus, operand) {
    var value = (state.a & state.x) + (~operand & 0xFF) + 1;
    state.x = value & 0xFF;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (state.x & 0x80) |
        ((state.x & 0xFF) ? 0 : 2 /* z */) |
        (value >>> 8);
}
function opDcp(state, bus, operand) {
    var value = (bus.read(operand) + 0xFF) & 0xFF;
    bus.write(operand, value);
    var diff = state.a + (~value & 0xFF) + 1;
    state.flags = (state.flags & ~(128 /* n */ | 2 /* z */ | 1 /* c */)) |
        (diff & 0x80) |
        ((diff & 0xFF) ? 0 : 2 /* z */) |
        (diff >>> 8);
}
function opLax(state, bus, operand) {
    state.a = operand;
    state.x = operand;
    setFlagsNZ(state, operand);
}
var Cpu = (function () {
    function Cpu(_bus, _rng) {
        this._bus = _bus;
        this._rng = _rng;
        this.executionState = 0 /* boot */;
        this.state = new CpuInterface_1.default.State();
        this._opCycles = 0;
        this._instructionCallback = null;
        this._invalidInstructionCallback = null;
        this._interruptPending = false;
        this._nmiPending = false;
        this._halted = false;
        this._operand = 0;
        this._lastInstructionPointer = 0;
        this.reset();
    }
    Cpu.prototype.setInterrupt = function () {
        this._interruptPending = true;
        return this;
    };
    Cpu.prototype.clearInterrupt = function () {
        this._interruptPending = false;
        return this;
    };
    Cpu.prototype.isInterrupt = function () {
        return this._interruptPending;
    };
    Cpu.prototype.nmi = function () {
        this._nmiPending = true;
        return this;
    };
    Cpu.prototype.halt = function () {
        this._halted = true;
        return this;
    };
    Cpu.prototype.resume = function () {
        this._halted = false;
        return this;
    };
    Cpu.prototype.isHalt = function () {
        return this._halted;
    };
    Cpu.prototype.setInvalidInstructionCallback = function (callback) {
        this._invalidInstructionCallback = callback;
        return this;
    };
    Cpu.prototype.getInvalidInstructionCallback = function () {
        return this._invalidInstructionCallback;
    };
    Cpu.prototype.getLastInstructionPointer = function () {
        return this._lastInstructionPointer;
    };
    Cpu.prototype.reset = function () {
        this.state.a = this._rng ? this._rng.int(0xFF) : 0;
        this.state.x = this._rng ? this._rng.int(0xFF) : 0;
        this.state.y = this._rng ? this._rng.int(0xFF) : 0;
        this.state.s = this._rng ? this._rng.int(0xFF) : 0;
        this.state.p = this._rng ? this._rng.int(0xFFFF) : 0;
        this.state.flags = (this._rng ? this._rng.int(0xFF) : 0) |
            4 /* i */ | 32 /* e */ | 16 /* b */;
        this.executionState = 0 /* boot */;
        this._opCycles = 7;
        this._interruptPending = false;
        this._nmiPending = false;
        this._instructionCallback = opBoot;
        return this;
    };
    Cpu.prototype.cycle = function () {
        if (this._halted) {
            return;
        }
        switch (this.executionState) {
            case 0 /* boot */:
            case 2 /* execute */:
                if (--this._opCycles === 0) {
                    this._instructionCallback(this.state, this._bus, this._operand);
                    this.executionState = 1 /* fetch */;
                }
                break;
            case 1 /* fetch */:
                // TODO: interrupt handling
                this._fetch();
        }
        return this;
    };
    Cpu.prototype._fetch = function () {
        var instruction = Instruction_1.default.opcodes[this._bus.read(this.state.p)];
        var addressingMode = instruction.addressingMode, dereference = false, slowIndexedAccess = false;
        this._lastInstructionPointer = this.state.p;
        switch (instruction.operation) {
            case 0 /* adc */:
                this._opCycles = 0;
                this._instructionCallback = opAdc;
                dereference = true;
                break;
            case 1 /* and */:
                this._opCycles = 0;
                this._instructionCallback = opAnd;
                dereference = true;
                break;
            case 2 /* asl */:
                if (addressingMode === 0 /* implied */) {
                    this._opCycles = 1;
                    this._instructionCallback = opAslAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = opAslMem;
                    slowIndexedAccess = true;
                }
                break;
            case 3 /* bcc */:
                if (this.state.flags & 1 /* c */) {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                break;
            case 4 /* bcs */:
                if (this.state.flags & 1 /* c */) {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                break;
            case 5 /* beq */:
                if (this.state.flags & 2 /* z */) {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                break;
            case 6 /* bit */:
                this._opCycles = 0;
                this._instructionCallback = opBit;
                dereference = true;
                break;
            case 7 /* bmi */:
                if (this.state.flags & 128 /* n */) {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                break;
            case 8 /* bne */:
                if (this.state.flags & 2 /* z */) {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                break;
            case 9 /* bpl */:
                if (this.state.flags & 128 /* n */) {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                break;
            case 11 /* bvc */:
                if (this.state.flags & 64 /* v */) {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                else {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                break;
            case 12 /* bvs */:
                if (this.state.flags & 64 /* v */) {
                    this._instructionCallback = opJmp;
                    this._opCycles = 0;
                }
                else {
                    addressingMode = 0 /* implied */;
                    this._instructionCallback = opNop;
                    this.state.p = (this.state.p + 1) & 0xFFFF;
                    this._opCycles = 1;
                }
                break;
            case 10 /* brk */:
                this._opCycles = 6;
                this._instructionCallback = opBrk;
                break;
            case 13 /* clc */:
                this._opCycles = 1;
                this._instructionCallback = opClc;
                break;
            case 14 /* cld */:
                this._opCycles = 1;
                this._instructionCallback = opCld;
                break;
            case 15 /* cli */:
                this._opCycles = 1;
                this._instructionCallback = opCli;
                break;
            case 16 /* clv */:
                this._opCycles = 1;
                this._instructionCallback = opClv;
                break;
            case 17 /* cmp */:
                this._opCycles = 0;
                this._instructionCallback = opCmp;
                dereference = true;
                break;
            case 18 /* cpx */:
                this._opCycles = 0;
                this._instructionCallback = opCpx;
                dereference = true;
                break;
            case 19 /* cpy */:
                this._opCycles = 0;
                this._instructionCallback = opCpy;
                dereference = true;
                break;
            case 20 /* dec */:
                this._opCycles = 3;
                this._instructionCallback = opDec;
                slowIndexedAccess = true;
                break;
            case 21 /* dex */:
                this._opCycles = 1;
                this._instructionCallback = opDex;
                break;
            case 22 /* dey */:
                this._opCycles = 1;
                this._instructionCallback = opDey;
                break;
            case 23 /* eor */:
                this._opCycles = 0;
                this._instructionCallback = opEor;
                dereference = true;
                break;
            case 24 /* inc */:
                this._opCycles = 3;
                this._instructionCallback = opInc;
                slowIndexedAccess = true;
                break;
            case 25 /* inx */:
                this._opCycles = 1;
                this._instructionCallback = opInx;
                break;
            case 26 /* iny */:
                this._opCycles = 1;
                this._instructionCallback = opIny;
                break;
            case 27 /* jmp */:
                this._opCycles = 0;
                this._instructionCallback = opJmp;
                break;
            case 28 /* jsr */:
                this._opCycles = 3;
                this._instructionCallback = opJsr;
                break;
            case 29 /* lda */:
                this._opCycles = 0;
                this._instructionCallback = opLda;
                dereference = true;
                break;
            case 30 /* ldx */:
                this._opCycles = 0;
                this._instructionCallback = opLdx;
                dereference = true;
                break;
            case 31 /* ldy */:
                this._opCycles = 0;
                this._instructionCallback = opLdy;
                dereference = true;
                break;
            case 32 /* lsr */:
                if (addressingMode === 0 /* implied */) {
                    this._opCycles = 1;
                    this._instructionCallback = opLsrAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = opLsrMem;
                    slowIndexedAccess = true;
                }
                break;
            case 33 /* nop */:
            case 56 /* dop */:
            case 57 /* top */:
                this._opCycles = 0;
                dereference = true;
                this._instructionCallback = opNop;
                break;
            case 34 /* ora */:
                this._opCycles = 0;
                this._instructionCallback = opOra;
                dereference = true;
                break;
            case 36 /* php */:
                this._opCycles = 2;
                this._instructionCallback = opPhp;
                break;
            case 35 /* pha */:
                this._opCycles = 2;
                this._instructionCallback = opPha;
                break;
            case 37 /* pla */:
                this._opCycles = 3;
                this._instructionCallback = opPla;
                break;
            case 38 /* plp */:
                this._opCycles = 3;
                this._instructionCallback = opPlp;
                break;
            case 39 /* rol */:
                if (addressingMode === 0 /* implied */) {
                    this._opCycles = 1;
                    this._instructionCallback = opRolAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = opRolMem;
                    slowIndexedAccess = true;
                }
                break;
            case 40 /* ror */:
                if (addressingMode === 0 /* implied */) {
                    this._opCycles = 1;
                    this._instructionCallback = opRorAcc;
                }
                else {
                    this._opCycles = 3;
                    this._instructionCallback = opRorMem;
                    slowIndexedAccess = true;
                }
                break;
            case 41 /* rti */:
                this._opCycles = 5;
                this._instructionCallback = opRti;
                break;
            case 42 /* rts */:
                this._opCycles = 5;
                this._instructionCallback = opRts;
                break;
            case 43 /* sbc */:
                this._opCycles = 0;
                this._instructionCallback = opSbc;
                dereference = true;
                break;
            case 44 /* sec */:
                this._opCycles = 1;
                this._instructionCallback = opSec;
                break;
            case 45 /* sed */:
                this._opCycles = 1;
                this._instructionCallback = opSed;
                break;
            case 46 /* sei */:
                this._opCycles = 1;
                this._instructionCallback = opSei;
                break;
            case 47 /* sta */:
                this._opCycles = 1;
                this._instructionCallback = opSta;
                slowIndexedAccess = true;
                break;
            case 48 /* stx */:
                this._opCycles = 1;
                this._instructionCallback = opStx;
                slowIndexedAccess = true;
                break;
            case 49 /* sty */:
                this._opCycles = 1;
                this._instructionCallback = opSty;
                slowIndexedAccess = true;
                break;
            case 50 /* tax */:
                this._opCycles = 1;
                this._instructionCallback = opTax;
                break;
            case 51 /* tay */:
                this._opCycles = 1;
                this._instructionCallback = opTay;
                break;
            case 52 /* tsx */:
                this._opCycles = 1;
                this._instructionCallback = opTsx;
                break;
            case 53 /* txa */:
                this._opCycles = 1;
                this._instructionCallback = opTxa;
                break;
            case 54 /* txs */:
                this._opCycles = 1;
                this._instructionCallback = opTxs;
                break;
            case 55 /* tya */:
                this._opCycles = 1;
                this._instructionCallback = opTya;
                break;
            case 58 /* alr */:
                this._opCycles = 0;
                this._instructionCallback = opAlr;
                break;
            case 59 /* axs */:
                this._opCycles = 0;
                this._instructionCallback = opAxs;
                break;
            case 60 /* dcp */:
                this._opCycles = 3;
                this._instructionCallback = opDcp;
                slowIndexedAccess = true;
                break;
            case 61 /* lax */:
                this._opCycles = 0;
                this._instructionCallback = opLax;
                dereference = true;
                break;
            default:
                if (this._invalidInstructionCallback)
                    this._invalidInstructionCallback(this);
                return;
        }
        this.state.p = (this.state.p + 1) & 0xFFFF;
        var value, base;
        switch (addressingMode) {
            case 1 /* immediate */:
                this._operand = this._bus.read(this.state.p);
                dereference = false;
                this.state.p = (this.state.p + 1) & 0xFFFF;
                this._opCycles++;
                break;
            case 2 /* zeroPage */:
                this._operand = this._bus.read(this.state.p);
                this.state.p = (this.state.p + 1) & 0xFFFF;
                this._opCycles++;
                break;
            case 3 /* absolute */:
                this._operand = this._bus.readWord(this.state.p);
                this.state.p = (this.state.p + 2) & 0xFFFF;
                this._opCycles += 2;
                break;
            case 4 /* indirect */:
                value = this._bus.readWord(this.state.p);
                if ((value & 0xFF) === 0xFF)
                    this._operand = this._bus.read(value) + (this._bus.read(value & 0xFF00) << 8);
                else
                    this._operand = this._bus.readWord(value);
                this.state.p = (this.state.p + 2) & 0xFFFF;
                this._opCycles += 4;
                break;
            case 5 /* relative */:
                value = this._bus.read(this.state.p);
                value = (value & 0x80) ? -(~(value - 1) & 0xFF) : value;
                this._operand = (this.state.p + value + 0x10001) & 0xFFFF;
                this.state.p = (this.state.p + 1) & 0xFFFF;
                this._opCycles += (((this._operand & 0xFF00) !== (this.state.p & 0xFF00)) ? 3 : 2);
                break;
            case 6 /* zeroPageX */:
                base = this._bus.read(this.state.p);
                this._bus.read(base);
                this._operand = (base + this.state.x) & 0xFF;
                this.state.p = (this.state.p + 1) & 0xFFFF;
                this._opCycles += 2;
                break;
            case 7 /* absoluteX */:
                value = this._bus.readWord(this.state.p);
                this._operand = (value + this.state.x) & 0xFFFF;
                if ((this._operand & 0xFF00) !== (value & 0xFF00)) {
                    this._bus.read((value & 0xFF00) | (this._operand & 0xFF));
                }
                this._opCycles += ((slowIndexedAccess || (this._operand & 0xFF00) !== (value & 0xFF00)) ? 3 : 2);
                this.state.p = (this.state.p + 2) & 0xFFFF;
                break;
            case 9 /* zeroPageY */:
                base = this._bus.read(this.state.p);
                this._bus.read(base);
                this._operand = (base + this.state.y) & 0xFF;
                this.state.p = (this.state.p + 1) & 0xFFFF;
                this._opCycles += 2;
                break;
            case 10 /* absoluteY */:
                value = this._bus.readWord(this.state.p);
                this._operand = (value + this.state.y) & 0xFFFF;
                if ((this._operand & 0xFF00) !== (value & 0xFF00)) {
                    this._bus.read((value & 0xFF00) | (this._operand & 0xFF));
                }
                this._opCycles += ((slowIndexedAccess || (this._operand & 0xFF00) !== (value & 0xFF00)) ? 3 : 2);
                this.state.p = (this.state.p + 2) & 0xFFFF;
                break;
            case 8 /* indexedIndirectX */:
                base = this._bus.read(this.state.p);
                this._bus.read(base);
                value = (base + this.state.x) & 0xFF;
                if (value === 0xFF) {
                    this._operand = this._bus.read(0xFF) + (this._bus.read(0x00) << 8);
                }
                else {
                    this._operand = this._bus.readWord(value);
                }
                this._opCycles += 4;
                this.state.p = (this.state.p + 1) & 0xFFFF;
                break;
            case 11 /* indirectIndexedY */:
                value = this._bus.read(this.state.p);
                if (value === 0xFF) {
                    value = this._bus.read(0xFF) + (this._bus.read(0x00) << 8);
                }
                else {
                    value = this._bus.readWord(value);
                }
                this._operand = (value + this.state.y) & 0xFFFF;
                if ((this._operand & 0xFF00) !== (value & 0xFF00)) {
                    this._bus.read((value & 0xFF00) | (this._operand & 0xFF));
                }
                this._opCycles += ((slowIndexedAccess || (value & 0xFF00) !== (this._operand & 0xFF00)) ? 4 : 3);
                this.state.p = (this.state.p + 1) & 0xFFFF;
                break;
        }
        if (dereference) {
            this._operand = this._bus.read(this._operand);
            this._opCycles++;
        }
        this.executionState = 2 /* execute */;
    };
    return Cpu;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Cpu;

},{"./CpuInterface":22,"./Instruction":24}],22:[function(require,module,exports){
"use strict";
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
        }
        return State;
    }());
    CpuInterface.State = State;
})(CpuInterface || (CpuInterface = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CpuInterface;

},{}],23:[function(require,module,exports){
"use strict";
var Instruction_1 = require('./Instruction');
var hex = require('../../tools/hex');
var Disassembler = (function () {
    function Disassembler(_bus) {
        this._bus = _bus;
    }
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
        var decodeSint8 = function (value) { return (value & 0x80) ? (-(~(value - 1) & 0xFF)) : value; };
        switch (instruction.addressingMode) {
            case 0 /* implied */:
                return operation;
            case 1 /* immediate */:
                return operation + ' #' + read8();
            case 2 /* zeroPage */:
                return operation + ' ' + read8();
            case 3 /* absolute */:
                return operation + ' ' + read16();
            case 4 /* indirect */:
                return operation + ' (' + read16() + ')';
            case 5 /* relative */:
                var distance = decodeSint8(this._peek(address + 1));
                return operation + ' ' +
                    hex.encode(distance, 2) + ' ; -> '
                    + hex.encode((0x10002 + address + distance) % 0x10000, 4);
            case 6 /* zeroPageX */:
                return operation + ' ' + read8() + ',X';
            case 7 /* absoluteX */:
                return operation + ' ' + read16() + ',X';
            case 8 /* indexedIndirectX */:
                return operation + ' (' + read8() + ',X)';
            case 9 /* zeroPageY */:
                return operation + ' ' + read8() + ',Y';
            case 10 /* absoluteY */:
                return operation + ' ' + read16() + ',Y';
            case 11 /* indirectIndexedY */:
                return operation + ' (' + read8() + '),Y';
            default:
                return 'INVALID';
        }
    };
    Disassembler.prototype._peek = function (address) {
        return this._bus.read(address % 0x10000);
    };
    Disassembler.prototype.setBus = function (bus) {
        this._bus = bus;
        return this;
    };
    Disassembler.prototype.getBus = function () {
        return this._bus;
    };
    return Disassembler;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Disassembler;

},{"../../tools/hex":32,"./Instruction":24}],24:[function(require,module,exports){
"use strict";
var Instruction = (function () {
    function Instruction(operation, addressingMode) {
        this.operation = operation;
        this.addressingMode = addressingMode;
    }
    Instruction.prototype.getSize = function () {
        switch (this.addressingMode) {
            case 1 /* immediate */:
            case 2 /* zeroPage */:
            case 6 /* zeroPageX */:
            case 9 /* zeroPageY */:
            case 8 /* indexedIndirectX */:
            case 11 /* indirectIndexedY */:
            case 5 /* relative */:
                return 2;
            case 3 /* absolute */:
            case 7 /* absoluteX */:
            case 10 /* absoluteY */:
            case 4 /* indirect */:
                return 3;
            default:
                return 1;
        }
    };
    return Instruction;
}());
;
var Instruction;
(function (Instruction) {
    ;
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
        OperationMap[OperationMap["invalid"] = 62] = "invalid";
    })(Instruction.OperationMap || (Instruction.OperationMap = {}));
    var OperationMap = Instruction.OperationMap;
    ;
    ;
    Instruction.opcodes = new Array(256);
})(Instruction || (Instruction = {}));
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Instruction;
// Opcodes init
var Instruction;
(function (Instruction) {
    (function () {
        for (var i = 0; i < 256; i++) {
            Instruction.opcodes[i] = new Instruction(62 /* invalid */, 12 /* invalid */);
        }
    })();
    (function () {
        var operation, addressingMode, opcode;
        for (var i = 0; i < 8; i++) {
            switch (i) {
                case 0:
                    operation = 34 /* ora */;
                    break;
                case 1:
                    operation = 1 /* and */;
                    break;
                case 2:
                    operation = 23 /* eor */;
                    break;
                case 3:
                    operation = 0 /* adc */;
                    break;
                case 4:
                    operation = 47 /* sta */;
                    break;
                case 5:
                    operation = 29 /* lda */;
                    break;
                case 6:
                    operation = 17 /* cmp */;
                    break;
                case 7:
                    operation = 43 /* sbc */;
                    break;
            }
            ;
            for (var j = 0; j < 8; j++) {
                switch (j) {
                    case 0:
                        addressingMode = 8 /* indexedIndirectX */;
                        break;
                    case 1:
                        addressingMode = 2 /* zeroPage */;
                        break;
                    case 2:
                        addressingMode = 1 /* immediate */;
                        break;
                    case 3:
                        addressingMode = 3 /* absolute */;
                        break;
                    case 4:
                        addressingMode = 11 /* indirectIndexedY */;
                        break;
                    case 5:
                        addressingMode = 6 /* zeroPageX */;
                        break;
                    case 6:
                        addressingMode = 10 /* absoluteY */;
                        break;
                    case 7:
                        addressingMode = 7 /* absoluteX */;
                        break;
                }
                if (operation === 47 /* sta */ && addressingMode === 1 /* immediate */)
                    addressingMode = 12 /* invalid */;
                if (operation !== 62 /* invalid */ && addressingMode !== 12 /* invalid */) {
                    opcode = (i << 5) | (j << 2) | 1;
                    Instruction.opcodes[opcode].operation = operation;
                    Instruction.opcodes[opcode].addressingMode = addressingMode;
                }
            }
        }
        function set(opcode, operation, addressingMode) {
            if (Instruction.opcodes[opcode].operation !== 62 /* invalid */) {
                throw new Error("entry for opcode " + opcode + " already exists");
            }
            Instruction.opcodes[opcode].operation = operation;
            Instruction.opcodes[opcode].addressingMode = addressingMode;
        }
        set(0x06, 2 /* asl */, 2 /* zeroPage */);
        set(0x0A, 2 /* asl */, 0 /* implied */);
        set(0x0E, 2 /* asl */, 3 /* absolute */);
        set(0x16, 2 /* asl */, 6 /* zeroPageX */);
        set(0x1E, 2 /* asl */, 7 /* absoluteX */);
        set(0x26, 39 /* rol */, 2 /* zeroPage */);
        set(0x2A, 39 /* rol */, 0 /* implied */);
        set(0x2E, 39 /* rol */, 3 /* absolute */);
        set(0x36, 39 /* rol */, 6 /* zeroPageX */);
        set(0x3E, 39 /* rol */, 7 /* absoluteX */);
        set(0x46, 32 /* lsr */, 2 /* zeroPage */);
        set(0x4A, 32 /* lsr */, 0 /* implied */);
        set(0x4E, 32 /* lsr */, 3 /* absolute */);
        set(0x56, 32 /* lsr */, 6 /* zeroPageX */);
        set(0x5E, 32 /* lsr */, 7 /* absoluteX */);
        set(0x66, 40 /* ror */, 2 /* zeroPage */);
        set(0x6A, 40 /* ror */, 0 /* implied */);
        set(0x6E, 40 /* ror */, 3 /* absolute */);
        set(0x76, 40 /* ror */, 6 /* zeroPageX */);
        set(0x7E, 40 /* ror */, 7 /* absoluteX */);
        set(0x86, 48 /* stx */, 2 /* zeroPage */);
        set(0x8E, 48 /* stx */, 3 /* absolute */);
        set(0x96, 48 /* stx */, 9 /* zeroPageY */);
        set(0xA2, 30 /* ldx */, 1 /* immediate */);
        set(0xA6, 30 /* ldx */, 2 /* zeroPage */);
        set(0xAE, 30 /* ldx */, 3 /* absolute */);
        set(0xB6, 30 /* ldx */, 9 /* zeroPageY */);
        set(0xBE, 30 /* ldx */, 10 /* absoluteY */);
        set(0xC6, 20 /* dec */, 2 /* zeroPage */);
        set(0xCE, 20 /* dec */, 3 /* absolute */);
        set(0xD6, 20 /* dec */, 6 /* zeroPageX */);
        set(0xDE, 20 /* dec */, 7 /* absoluteX */);
        set(0xE6, 24 /* inc */, 2 /* zeroPage */);
        set(0xEE, 24 /* inc */, 3 /* absolute */);
        set(0xF6, 24 /* inc */, 6 /* zeroPageX */);
        set(0xFE, 24 /* inc */, 7 /* absoluteX */);
        set(0x24, 6 /* bit */, 2 /* zeroPage */);
        set(0x2C, 6 /* bit */, 3 /* absolute */);
        set(0x4C, 27 /* jmp */, 3 /* absolute */);
        set(0x6C, 27 /* jmp */, 4 /* indirect */);
        set(0x84, 49 /* sty */, 2 /* zeroPage */);
        set(0x8C, 49 /* sty */, 3 /* absolute */);
        set(0x94, 49 /* sty */, 6 /* zeroPageX */);
        set(0xA0, 31 /* ldy */, 1 /* immediate */);
        set(0xA4, 31 /* ldy */, 2 /* zeroPage */);
        set(0xAC, 31 /* ldy */, 3 /* absolute */);
        set(0xB4, 31 /* ldy */, 6 /* zeroPageX */);
        set(0xBC, 31 /* ldy */, 7 /* absoluteX */);
        set(0xC0, 19 /* cpy */, 1 /* immediate */);
        set(0xC4, 19 /* cpy */, 2 /* zeroPage */);
        set(0xCC, 19 /* cpy */, 3 /* absolute */);
        set(0xE0, 18 /* cpx */, 1 /* immediate */);
        set(0xE4, 18 /* cpx */, 2 /* zeroPage */);
        set(0xEC, 18 /* cpx */, 3 /* absolute */);
        set(0x10, 9 /* bpl */, 5 /* relative */);
        set(0x30, 7 /* bmi */, 5 /* relative */);
        set(0x50, 11 /* bvc */, 5 /* relative */);
        set(0x70, 12 /* bvs */, 5 /* relative */);
        set(0x90, 3 /* bcc */, 5 /* relative */);
        set(0xB0, 4 /* bcs */, 5 /* relative */);
        set(0xD0, 8 /* bne */, 5 /* relative */);
        set(0xF0, 5 /* beq */, 5 /* relative */);
        set(0x00, 10 /* brk */, 0 /* implied */);
        set(0x20, 28 /* jsr */, 3 /* absolute */);
        set(0x40, 41 /* rti */, 0 /* implied */);
        set(0x60, 42 /* rts */, 0 /* implied */);
        set(0x08, 36 /* php */, 0 /* implied */);
        set(0x28, 38 /* plp */, 0 /* implied */);
        set(0x48, 35 /* pha */, 0 /* implied */);
        set(0x68, 37 /* pla */, 0 /* implied */);
        set(0x88, 22 /* dey */, 0 /* implied */);
        set(0xA8, 51 /* tay */, 0 /* implied */);
        set(0xC8, 26 /* iny */, 0 /* implied */);
        set(0xE8, 25 /* inx */, 0 /* implied */);
        set(0x18, 13 /* clc */, 0 /* implied */);
        set(0x38, 44 /* sec */, 0 /* implied */);
        set(0x58, 15 /* cli */, 0 /* implied */);
        set(0x78, 46 /* sei */, 0 /* implied */);
        set(0x98, 55 /* tya */, 0 /* implied */);
        set(0xB8, 16 /* clv */, 0 /* implied */);
        set(0xD8, 14 /* cld */, 0 /* implied */);
        set(0xF8, 45 /* sed */, 0 /* implied */);
        set(0x8A, 53 /* txa */, 0 /* implied */);
        set(0x9A, 54 /* txs */, 0 /* implied */);
        set(0xAA, 50 /* tax */, 0 /* implied */);
        set(0xBA, 52 /* tsx */, 0 /* implied */);
        set(0xCA, 21 /* dex */, 0 /* implied */);
        set(0xEA, 33 /* nop */, 0 /* implied */);
        // instructions for undocumented opcodes
        set(0x1A, 33 /* nop */, 0 /* implied */);
        set(0x3A, 33 /* nop */, 0 /* implied */);
        set(0x5A, 33 /* nop */, 0 /* implied */);
        set(0x7A, 33 /* nop */, 0 /* implied */);
        set(0xDA, 33 /* nop */, 0 /* implied */);
        set(0xFA, 33 /* nop */, 0 /* implied */);
        set(0x04, 56 /* dop */, 2 /* zeroPage */);
        set(0x14, 56 /* dop */, 6 /* zeroPageX */);
        set(0x34, 56 /* dop */, 6 /* zeroPageX */);
        set(0x44, 56 /* dop */, 2 /* zeroPage */);
        set(0x54, 56 /* dop */, 6 /* zeroPageX */);
        set(0x64, 56 /* dop */, 2 /* zeroPage */);
        set(0x74, 56 /* dop */, 6 /* zeroPageX */);
        set(0x80, 56 /* dop */, 1 /* immediate */);
        set(0x82, 56 /* dop */, 1 /* immediate */);
        set(0x89, 56 /* dop */, 1 /* immediate */);
        set(0xC2, 56 /* dop */, 1 /* immediate */);
        set(0xD4, 56 /* dop */, 6 /* zeroPageX */);
        set(0xE2, 56 /* dop */, 1 /* immediate */);
        set(0xF4, 56 /* dop */, 6 /* zeroPageX */);
        set(0x0C, 57 /* top */, 3 /* absolute */);
        set(0x1C, 57 /* top */, 7 /* absoluteX */);
        set(0x3C, 57 /* top */, 7 /* absoluteX */);
        set(0x5C, 57 /* top */, 7 /* absoluteX */);
        set(0x7C, 57 /* top */, 7 /* absoluteX */);
        set(0xDC, 57 /* top */, 7 /* absoluteX */);
        set(0xFC, 57 /* top */, 7 /* absoluteX */);
        set(0xEB, 43 /* sbc */, 1 /* immediate */);
        set(0x4B, 58 /* alr */, 1 /* immediate */);
        set(0xCB, 59 /* axs */, 1 /* immediate */);
        set(0xC7, 60 /* dcp */, 2 /* zeroPage */);
        set(0xD7, 60 /* dcp */, 6 /* zeroPageX */);
        set(0xCF, 60 /* dcp */, 3 /* absolute */);
        set(0xDF, 60 /* dcp */, 7 /* absoluteX */);
        set(0xDB, 60 /* dcp */, 10 /* absoluteY */);
        set(0xC3, 60 /* dcp */, 8 /* indexedIndirectX */);
        set(0xD3, 60 /* dcp */, 11 /* indirectIndexedY */);
        set(0xA7, 61 /* lax */, 2 /* zeroPage */);
        set(0xB7, 61 /* lax */, 9 /* zeroPageY */);
        set(0xAF, 61 /* lax */, 3 /* absolute */);
        set(0xBF, 61 /* lax */, 10 /* absoluteY */);
        set(0xA3, 61 /* lax */, 8 /* indexedIndirectX */);
        set(0xB3, 61 /* lax */, 11 /* indirectIndexedY */);
    })();
})(Instruction || (Instruction = {}));
;

},{}],25:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Board_1 = require('../vanilla/Board');
var Memory_1 = require('./Memory');
var Board = (function (_super) {
    __extends(Board, _super);
    function Board() {
        _super.apply(this, arguments);
    }
    Board.prototype.getSerialIO = function () {
        return this._bus;
    };
    Board.prototype._createBus = function () {
        return new Memory_1.default();
    };
    return Board;
}(Board_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Board;

},{"../vanilla/Board":27,"./Memory":26}],26:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Memory_1 = require('../vanilla/Memory');
var Memory = (function (_super) {
    __extends(Memory, _super);
    function Memory() {
        _super.apply(this, arguments);
        this._inCallback = function () { return 0x00; };
        this._outCallback = function () { return undefined; };
    }
    Memory.prototype.read = function (address) {
        if (address === 0xF004) {
            return this._inCallback(this);
        }
        else {
            return this._data[address];
        }
    };
    Memory.prototype.readWord = function (address) {
        if ((address & 0xFFF0) === 0xF000) {
            return this.read(address) + (this.read((address + 1) & 0xFFFF) << 8);
        }
        return this._data[address] + (this._data[(address + 1) & 0xFFFF] << 8);
    };
    Memory.prototype.write = function (address, value) {
        if (address === 0xF001) {
            this._outCallback(value, this);
        }
        else if (address < 0xC000) {
            this._data[address] = value;
        }
    };
    Memory.prototype.setInCallback = function (callback) {
        this._inCallback = callback;
        return this;
    };
    Memory.prototype.getInCallback = function () {
        return this._inCallback;
    };
    Memory.prototype.setOutCallback = function (callback) {
        this._outCallback = callback;
        return this;
    };
    Memory.prototype.getOutCallback = function () {
        return this._outCallback;
    };
    return Memory;
}(Memory_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Memory;

},{"../vanilla/Memory":28}],27:[function(require,module,exports){
"use strict";
var BoardInterface_1 = require('../board/BoardInterface');
var CpuInterface_1 = require('../cpu/CpuInterface');
var Cpu_1 = require('../cpu/Cpu');
var Memory_1 = require('./Memory');
var Event_1 = require('../../tools/event/Event');
var Board = (function () {
    function Board(cpuFactory) {
        var _this = this;
        this.clock = new Event_1.default();
        this.trap = new Event_1.default();
        this._trap = false;
        this._clockMode = 1 /* lazy */;
        this._timer = {
            tick: function (clocks) { return _this._tick(clocks); },
            start: function (scheduler, sliceHint) { return _this._start(scheduler, sliceHint); },
            stop: function () { return _this._stop(); },
            isRunning: function () { return !!_this._runTask; }
        };
        this.cpuClock = this.clock;
        this._bus = this._createBus();
        if (typeof (cpuFactory) === 'undefined')
            cpuFactory = function (bus) { return new Cpu_1.default(bus); };
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
        if (hard) {
            this._bus.clear();
        }
        return this;
    };
    Board.prototype.boot = function () {
        var clock = 0;
        if (this._cpu.executionState !== 0 /* boot */)
            throw new Error("Already booted!");
        while (this._cpu.executionState !== 1 /* fetch */) {
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
            if (this._clockMode === 0 /* instruction */ &&
                this._cpu.executionState === 1 /* fetch */ &&
                this.clock.hasHandlers) {
                this.clock.dispatch(clock);
                clock = 0;
            }
        }
        if (clock > 0 && this.clock.hasHandlers)
            this.clock.dispatch(clock);
        return clock;
    };
    Board.prototype._start = function (scheduler, sliceHint) {
        if (sliceHint === void 0) { sliceHint = 100000; }
        if (this._runTask)
            return;
        this._sliceHint = sliceHint;
        this._runTask = scheduler.start(this._executeSlice, this);
    };
    Board.prototype._executeSlice = function (board) {
        board._tick(board._sliceHint);
    };
    Board.prototype._stop = function () {
        if (!this._runTask)
            return;
        this._runTask.stop();
        this._runTask = undefined;
    };
    Board.prototype._onInvalidInstruction = function () {
        this.triggerTrap(0 /* cpu */, 'invalid instruction');
    };
    return Board;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Board;

},{"../../tools/event/Event":31,"../board/BoardInterface":20,"../cpu/Cpu":21,"../cpu/CpuInterface":22,"./Memory":28}],28:[function(require,module,exports){
"use strict";
var Memory = (function () {
    function Memory() {
        this._data = new Uint8Array(0x10000);
        this.clear();
    }
    Memory.prototype.clear = function () {
        for (var i = 0; i < 0x10000; i++)
            this._data[i] = 0;
    };
    Memory.prototype.read = function (address) {
        return this._data[address];
    };
    Memory.prototype.peek = function (address) {
        return this._data[address];
    };
    Memory.prototype.readWord = function (address) {
        return this._data[address] + (this._data[(address + 1) & 0xFFFF] << 8);
    };
    Memory.prototype.write = function (address, value) {
        this._data[address] = value;
    };
    Memory.prototype.poke = function (address, value) {
        this._data[address] = value;
    };
    return Memory;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Memory;

},{}],29:[function(require,module,exports){
"use strict";
var Event_1 = require('./event/Event');
var ClockProbe = (function () {
    function ClockProbe(_scheduler) {
        this._scheduler = _scheduler;
        this.frequencyUpdate = new Event_1.default();
        this._counter = 0;
        this._frequency = 0;
    }
    ClockProbe.prototype.attach = function (clock) {
        if (this._clock)
            this.detach();
        this._clock = clock;
        clock.addHandler(this._clockHandler, this);
        return this;
    };
    ClockProbe.prototype.start = function () {
        if (this._measurementTask)
            return;
        this._timestamp = Date.now();
        this._counter = 0;
        this._measurementTask = this._scheduler.start(this._updateMeasurement, this);
        return this;
    };
    ClockProbe.prototype.detach = function () {
        if (!this._clock)
            return;
        this._clock.removeHandler(this._clockHandler, this);
        this._clock = undefined;
        return this;
    };
    ClockProbe.prototype.stop = function () {
        if (!this._measurementTask)
            return;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClockProbe;

},{"./event/Event":31}],30:[function(require,module,exports){
"use strict";
function encode(value, width) {
    var result = Math.abs(value).toString(2);
    if (typeof (width) !== 'undefined') {
        while (result.length < width)
            result = '0' + result;
    }
    return (value < 0 ? '-' : '') + '0b' + result;
}
exports.encode = encode;

},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
"use strict";
function encode(value, width) {
    var result = Math.abs(value).toString(16).toUpperCase();
    if (typeof (width) !== 'undefined') {
        while (result.length < width)
            result = '0' + result;
    }
    return (value < 0 ? '-' : '') + '$' + result;
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

},{}],33:[function(require,module,exports){
"use strict";
var polyfill = require('setimmediate2');
var ImmediateScheduler = (function () {
    function ImmediateScheduler() {
    }
    ImmediateScheduler.prototype.start = function (worker, context) {
        var terminate = false;
        function handler() {
            if (terminate)
                return;
            worker(context);
            polyfill.setImmediate(handler);
        }
        polyfill.setImmediate(handler);
        return {
            stop: function () { return terminate = true; }
        };
    };
    return ImmediateScheduler;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImmediateScheduler;

},{"setimmediate2":10}],34:[function(require,module,exports){
"use strict";
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
            if (terminate)
                return;
            worker(context);
            setTimeout(handler, _this._period);
        };
        setTimeout(handler, this._period);
        return {
            stop: function () { return terminate = true; }
        };
    };
    return PeriodicScheduler;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PeriodicScheduler;

},{}],"ehBasicCLI":[function(require,module,exports){
/// <reference path="../interface/jquery.terminal.d.ts"/>
"use strict";
var EhBasicCLI_1 = require("../cli/EhBasicCLI");
var JqtermCLIRunner_1 = require('../cli/JqtermCLIRunner');
var PrepackagedFilesystemProvider_1 = require('../fs/PrepackagedFilesystemProvider');
function run(fileBlob, terminalElt, interruptButton, clearButton) {
    var fsProvider = new PrepackagedFilesystemProvider_1.default(fileBlob), cli = new EhBasicCLI_1.default(fsProvider), runner = new JqtermCLIRunner_1.default(cli, terminalElt, {
        interruptButton: interruptButton,
        clearButton: clearButton
    });
    cli.allowQuit(false);
    runner.startup();
}
exports.run = run;

},{"../cli/EhBasicCLI":15,"../cli/JqtermCLIRunner":16,"../fs/PrepackagedFilesystemProvider":18}]},{},[])
//# sourceMappingURL=ehBasicCLI.js.map