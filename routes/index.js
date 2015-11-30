var express = require('express');
var router = express.Router();
var locscan = require('../lib/GeoExtract.js');

/* GET home page. */
router.all('/', function(req, res, next) {
    var url = '',
        vars = {};

    // TODO: sanitize
    if (req.body.url && req.body.url.length > 0) {
        locscan.fromUrl(req.body.url, (result) => {

            vars.url = req.body.url;

            if (typeof result.error === 'undefined') {
                result = locscan.formatFeatureCollection([result]);
                // vars.geo = JSON.stringify(result);
                vars.geo = result;
            }

            // console.log('VARS', vars);
            response(req, res, 'map', vars);
        });
    } else {
        vars.geo = {"type":"FeatureCollection","features":[]};
        response(req, res, 'index', vars);
    }
});

function response(req, res, template, vars) {
    if (isAjax(req)) {
        res.json(vars);
        res.end();
    } else {
        vars.geo = JSON.stringify(vars.geo);
        res.render(template, vars);
    }
}

function isAjax(req) {
    if (
        req.headers
        && req.headers['x-requested-with']
        && req.headers['x-requested-with'] === 'XMLHttpRequest'
    ) {
        return true;
    }
    return false;
}

module.exports = router;
