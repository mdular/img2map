function initialize(collection) {
    var map;
    var mapCanvas = document.getElementById('map');

    map = new google.maps.Map(mapCanvas, getMapOptions(collection));
    map.data.addGeoJson(collection);
}

function getMapOptions(collection) {
    return {
        center: getCenter(collection),
        zoom: 2, // 1 = farthest, 17 = ~2 blocks
        // {ROADMAP: "roadmap", SATELLITE: "satellite", HYBRID: "hybrid", TERRAIN: "terrain"}
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
}

function getCenter(collection) {
    var lat = long = 0;

    if (collection.features instanceof Array && collection.features.length) {
        var feature = collection.features[0];
        lat = feature.geometry.coordinates[1];
        long = feature.geometry.coordinates[0];
    }

    return new google.maps.LatLng(lat, long);
}

function serialize(data) {
    var string = '';

    for (var key in data) {
        if (string.length > 0) {
            string += '&';
        }
        string += key + '=' + data[key];
    }

    return string;
}

function isImageURL(string) {
    return (
        // http or https
        (
            /http/.test(string)
            || /https/.test(string)
        )
        // and .jpg or .jpeg or .png
        && (
            /.jpg/.test(string)
            || /.jpeg/.test(string)
            || /.png/.test(string)
        )
    );
}

function bindForm() {
    var form = document.querySelector('#url-form'),
        action = form.action;
    var input = document.querySelector('#url-form [name=url]'),
        val = input.value;

    form.addEventListener('submit', function (evt) {
        // console.log(evt);
        evt.preventDefault();

        if (input.value === val) {
            return false;
        }

        val = input.value;

        if (!isImageURL(val)) {
            console.log('not a valid url');
            return false;
        }

        input.disabled = true;

        ajax.post(action, serialize({url:val})//);
        , function () {
            // console.log('Success', arguments);
            initialize(JSON.parse(arguments[0]).geo);
        }
        , function () {
            console.log('Error', arguments);
        }
        , function () {
            input.disabled = false;
        }
        );
    });
}

window.addEventListener('load', function () {
    console.log(data);

    if (data) {
        initialize(data);
    }

    bindForm();
});
