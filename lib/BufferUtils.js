Buffer.prototype.readRange = function (start, length, base) {
    "use strict";
    var range = '';
    if (typeof base === 'undefined') {
        base = 16;
    }
    for (let i = start, max = start + length; i < max; i++) {
        range += this[i].toString(base);
    }
    return range;
}

// TODO: benchmark difference
Buffer.prototype.getString = function (offset, length) {
  // var string = [];
  var string = '';
  for (var i = offset; i < offset + length; i++) {
    // string.push(String.fromCharCode(this[i]));
    string += this[i] !== 0x00 ? String.fromCharCode(this[i]) : ' ';
  }
  return string;
  // return string.join('');
};

Buffer.prototype.getByte = function (offset) {
    return this[offset];
}

Buffer.prototype.getShort = function (offset, bigEndian) {
    if (bigEndian) {
        return (this[offset] << 8) + this[offset + 1];
    }
    return (this[offset + 1] << 8) + this[offset];
}

Buffer.prototype.getLong = function (offset, bigEndian) {
    if (bigEndian || typeof bigEndian === 'undefined') {
        return (this[offset] << 24) + (this[offset + 1] << 16) + (this[offset + 2] << 8) + this[offset + 3];
    }
    return (this[offset + 3] << 24) + (this[offset + 2] << 16) + (this[offset + 1] << 8) + this[offset];
}

Buffer.prototype.readASCII = function (offset, bigEndian) {
    return this[offset] !== 0x00 ? String.fromCharCode(this[offset]) : ' ';
}

Buffer.prototype.getRational = function (offset, bigEndian) {
    var numerator = this.getLong(offset, bigEndian);
    var denominator = this.getLong(offset + 4, bigEndian);
    return numerator / denominator;
}
