var http = require('http');
var https = require('https');
var ExifImage = require('exif').ExifImage;

module.exports = {
    mem: {},
    fromUrl : function (url, callback, forceUpdate) {
        if (this.mem[url] && !forceUpdate) {
            callback(this.formatGeoPoint(this.mem[url]));
            return true;
        }

        var proto;

        // TODO: sanitize / validate url
        if (/https/.test(url)) {
            proto = https;
        } else {
            proto = http;
        }

        proto.get(url, (res) => {
            if (parseInt(res.headers['content-length'], 10) > 20000000) { // 20 Mb
                res.destroy();
                console.log('too big, skipped ' + url);
                callback({error:'too big, skipped ' + url});
                return false;
            }
            var buf = new Buffer(parseInt(res.headers['content-length'], 10));
            var bytesReceived = 0;

            res.on('error', (e) => {
                console.log('Error: ' + e.message);
                callback({error: e.message});
                return false;
            });

            res.on('data', (chunk) => {
                chunk.copy(buf, bytesReceived, 0, chunk.length);
                bytesReceived += chunk.length;
            });

            res.on('end', () => {
                // fs.writeFile(download, buf);
                // console.log('END', bytesReceived / 1024);

                this.getCoordsFromBuffer(buf, (err, result) => {
                    if (err) {
                        callback({error:err});
                        return false;
                    } else {
                        this.mem[url] = result;
                        callback(this.formatGeoPoint(result));
                        return true;
                    }
                });
            })
        }).on('error', (evt) => {
            console.log('Error:', evt.message);
            callback({error: evt.message});
            return false;
        });
    },
    getCoordsFromBuffer: function(buffer, callback) {
        new ExifImage({image: buffer}, (err, exif) => {
            if (err) {
                console.log(err);
                callback(err, null);
                return false;
            }

            // console.log('EXIF GPS', exif.gps);

            if (typeof exif.gps === 'undefined') {
                console.log('gps information missing');
                callback('gps information missing', null);
                return false;
            }

            if (typeof exif.gps.GPSLongitude === 'undefined'
              || typeof exif.gps.GPSLongitudeRef === 'undefined'
              || typeof exif.gps.GPSLatitude === 'undefined'
              || typeof exif.gps.GPSLatitudeRef === 'undefined'
            ) {
                console.log('gps information incomplete');
                callback('gps information incomplete', null);
                return false;
            }

            var coordinates = [
                this.getLong(exif.gps),
                this.getLat(exif.gps),
                this.getAlt(exif.gps)
            ];

            callback(null, coordinates);
        });
    },
    // getGeoJSON: function (features) {
    //
    // },
    formatFeatureCollection: function (features) {
        return {
            type: "FeatureCollection",
            // "metadata":{"generated":1447837646000,"url":"http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojsonp","title":"USGS Magnitude 2.5+ Earthquakes, Past Week","status":200,"api":"1.1.1","count":253},
            features: features
        };
    },
    formatGeoPoint: function (coords) {
        // console.log('LAT', this.getLat(exif.gps));
        // console.log('LONG', this.getLong(exif.gps));

        return {
            type: "Feature",
            // "properties":{"mag":3.1,"place":"168km NNW of The Valley, Anguilla","time":1447829711900,"updated":1447835298306,"tz":-240,"url":"http://earthquake.usgs.gov/earthquakes/eventpage/pr15322002","detail":"http://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/pr15322002.geojsonp","felt":0,"cdi":1,"mmi":null,"alert":null,"status":"REVIEWED","tsunami":0,"sig":148,"net":"pr","code":"15322002","ids":",pr15322002,","sources":",pr,","types":",cap,dyfi,geoserve,nearby-cities,origin,tectonic-summary,","nst":15,"dmin":1.53701745,"rms":0.33,"gap":316.8,"magType":"Md","type":"earthquake","title":"M 3.1 - 168km NNW of The Valley, Anguilla"},
            geometry: {
                type: "Point",
                coordinates: coords
            }
            // "id":"a"
        };
    },
    getLat: function (exif) {
        var val = this.extractDms(exif.GPSLatitude);

        if (exif.GPSLatitudeRef.toUpperCase() === 'S') {
            return -val;
        }

        return val;
    },
    getLong: function (exif) {
        var val = this.extractDms(exif.GPSLongitude);

        if (exif.GPSLongitudeRef.toUpperCase() === 'W') {
            return -val;
        }

        return val;
    },
    getAlt: function (exif) {
        return exif.GPSAltitude || 0;
    },
    extractDms: function (dmsArray) {
        return this.dmsToDecimal(dmsArray[0], dmsArray[1], dmsArray[2]);
    },
    dmsToDecimal: function (d, m, s) {
        // dd = d + m/60 + s/3600
        return (d + m / 60 + s / 3600);
    }
};
