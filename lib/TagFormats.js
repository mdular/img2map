require('./BufferUtils');

module.exports = {
    1: { // unsigned byte
        size: 1,
        resolver: Buffer.prototype.getByte
    },
    2: { // ascii string
        size: 1,
        resolver: Buffer.prototype.readASCII
    },
    3: { // unsigned short
        size: 2,
        resolver: Buffer.prototype.getShort
    },
    4: { // unsigned long
        size: 4,
        resolver: Buffer.prototype.getLong
    },
    5: { // unsigned rational
        size: 8,
        resolver: Buffer.prototype.getRational
    },
    6: { // signed byte
        size: 1
    },
    7: { // undefined
        size: 1,
        resolver: Buffer.prototype.getShort
    },
    8: { // signed short
        size: 2
    },
    9: { // signed long
        size: 4
    },
    10: { // signed rational
        size: 8
    },
    11: { // single float
        size: 4
    },
    12: { // double float
        size: 8
    }
};
