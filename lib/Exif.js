"use strict";

var TagFormats = require('./TagFormats');
var TagDictionary = require('./TagDictionary');
var BufferUtils = require ('./BufferUtils');

module.exports = {
    fromBuffer: function(buffer) {
        console.log(buffer.getShort(0, true));

        /**
         * JPEG SOI
         */
        if (buffer[0] !== 0xFF && buffer[1] !== 0xD8) {
            console.log('Error: not jpg SOI marker');
            return false;
        }

        var APP1Offset = 2;

        /**
         * APP0 Marker
         */
        if (buffer[2] === 0xFF && buffer[3] === 0xE0) {
            APP1Offset += 2 + buffer.getShort(4, true);
            console.log('APP0 found, new APP1 offset:', APP1Offset);
        }

        /**
         * APP1 Marker
         */
        // TODO: exif section could be at different position in file? (+ short)
        if (buffer[APP1Offset] !== 0xFF && buffer[APP1Offset + 1] !== 0xE1) {
            console.log('Error: no exif APP1 marker');
            return false;
        }

        /**
         * APP1 data size
         */
        console.log('data size:', buffer.getShort(APP1Offset + 2, true));
        // if buffer length exceeds the APP1 data size (+ preceeding data), we can stop loading
        if (buffer.length > APP1Offset + buffer.getShort(APP1Offset + 2, true)) {
            // TODO: stop loading
        }

        /**
         * EXIF header 'Exif\0\0'
         */
        var exifOffset = APP1Offset + 4;
        if (
            buffer[exifOffset] !== 0x45 // E
            || buffer[exifOffset + 1] !== 0x78 // x
            || buffer[exifOffset + 2] !== 0x69 // i
            || buffer[exifOffset + 3] !== 0x66 // f
            || buffer[exifOffset + 4] !== 0x00 // \0
            || buffer[exifOffset + 5] !== 0x00 // \0
        ) {
            console.log('Error: APP1 data has no exif header');
            return false;
        }

        /**
         * TIFF header
         */
        var TIFFHeaderOffset = exifOffset + 6;

        // Byte align of exif data is specified in first byte of tiff header
        var bigEndian = buffer.getShort(TIFFHeaderOffset) === 0x4D4D;

        if (buffer.getShort(TIFFHeaderOffset + 2, bigEndian) !== 0x002A) {
            console.log('Error: Tiff header invalid (wrong endianness?)')
        }

        /**
         * IFD0 Image information
         */
        // Note: Usually IFD0 starts immediately after TIFF header, which means this will hold 0x14 (20)
        var IFDOffset = TIFFHeaderOffset + buffer.getLong(TIFFHeaderOffset + 4, bigEndian);
        var result = readTags(buffer, IFDOffset, TIFFHeaderOffset, TagDictionary.IFD0, bigEndian);
        IFDOffset = result[0];
        var tags = {IFD0 : result[1]};

        /**
         * IFD1 Thumbnail information
         */
        // at end of IFD0, either offset or empty
        var IFD1Link = buffer.getLong(IFDOffset, bigEndian);
        if (IFD1Link > 0) {
            result = readTags(buffer, TIFFHeaderOffset + IFD1Link, TIFFHeaderOffset, TagDictionary.IFD1, bigEndian);
            IFDOffset = result[0];
            tags.IFD1 = result[1];
        }

        /**
         * Exif IFD
         */
        if (tags.IFD0[0x8769] && tags.IFD0[0x8769].value) {
            console.log('Exif IFD at:', tags.IFD0[0x8769].value);
            result = readTags(buffer, TIFFHeaderOffset + tags.IFD0[0x8769].value, TIFFHeaderOffset, TagDictionary.Exif, bigEndian);
            tags.Exif = result[1];
        }

        /**
         * GPS IFD
         */
        if (tags.IFD0[0x8825] && tags.IFD0[0x8825].value) {
            console.log('GPS IFD at:', tags.IFD0[0x8825].value);
            result = readTags(buffer, TIFFHeaderOffset + tags.IFD0[0x8825].value, TIFFHeaderOffset, TagDictionary.GPS, bigEndian);
            tags.GPS = result[1];
        }

        /**
         * Interoperability IFD
         */
        if (tags.IFD0[0xA005] && tags.IFD0[0xA005].value) {
            console.log('Interoperability IFD at:', tags.IFD0[0xA005].value);
            // TODO
        }

        /**
         * Makernotes IFD
         */
        if (tags.IFD0[0x927C] && tags.IFD0[0x927C].value) {
            console.log('Makernotes IFD at:', tags.IFD0[0x927C].value);
            // TODO
        }

        return tags;
    },
    reduceTags: function (tags) {
        let output = {};
        for (let tagKey in tags) {
            let tag = tags[tagKey];
            if (tag.name) {
                output[tag.name] = tag.value;
            }
        }
        return output;
    }
}

// enrichDefaults: function (tags, dictionary) {
//     "use strict";
//
//     // TODO
//     // iterate over dictionary & add with defaults as needed
//
//     if (typeof tag[1].value === 'undefined' && dictionary[tag[0]].default) {
//         tag[1].value = dictionary[tag[0]].default;
//     }
// }
//
// validate: function (tags, dictionary) {
//     // TODO: validate format & components
// }

function readTags(buffer, offset, TIFFHeaderOffset, dictionary, bigEndian) {
    "use strict";

    let tags = {};
    let entries = buffer.getShort(offset, bigEndian);
    offset += 2;

    for (let i = 0; i < entries; i++) {
        let tag = readTag(buffer, offset, TIFFHeaderOffset, bigEndian);

        // add the tag name from dictionary
        if (dictionary[tag[0]]) {
            tag[1].name = dictionary[tag[0]];
        }

        tags[tag[0]] = tag[1];
        offset += 12;
    }

    return [offset, tags];
}

function readTag(buffer, tagOffset, TIFFHeaderOffset, bigEndian) {
    "use strict";

    // tag number
    let number = buffer.getShort(tagOffset, bigEndian);

    // tag value descriptors
    let tag = {
        raw: {
            format: buffer.getShort(tagOffset + 2, bigEndian),
            components: buffer.getLong(tagOffset + 4, bigEndian)
        }
    };

    // tag value offset (is another offset if value is larger than 4 bytes)
    let valueOffset = tagOffset + 8;
    let valueSize = tagValueSize(tag.raw.format, tag.raw.components);
    if (valueSize > 4) {
        valueOffset = TIFFHeaderOffset + buffer.getLong(valueOffset, bigEndian);
    }

    // read the value
    tag.raw.data = buffer.slice(valueOffset, valueOffset + valueSize);
    tag.value = readValue(tag.raw.data, tag.raw.format, tag.raw.components, bigEndian);

    return [number, tag];
}

function readValue(buffer, format, components, bigEndian) {
    "use strict";

    if (typeof TagFormats[format] === 'undefined') {
        throw new Error('Tag format not understood');
    }

    if (typeof TagFormats[format].resolver !== 'function') {
        return undefined;
    }

    let value = [];
    let offset = 0;
    let valueSize = tagValueSize(format, 1);

    // read value components with resolver
    for (let i = 0; i < components; i++) {
        value.push(TagFormats[format].resolver.call(buffer, offset, bigEndian));
        offset += valueSize;
    }

    // flatten single value components
    if (value.length === 1) {
        value = value[0];
    }

    // flatten strings & trim NULL termination
    if (format === 2) {
        value = value.join('');
        value = value.trimRight();
    }

    return value;
}

function tagValueSize(format, components) {
    if (typeof TagFormats[format] === 'undefined') {
        throw new Error('Tag format not understood');
    }
    return components * TagFormats[format].size;
}
