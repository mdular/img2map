var ajax = {
    post: function (url, postData, onSuccess, onError, onComplete) {
        var req = this.createRequest('post', url, onSuccess, onError, onComplete);
        this.sendPost(req.xhr, postData);
        return req;
    },
    get: function (url, onSuccess, onError, onComplete) {
        var req = this.createRequest('get', url, onSuccess, onError, onComplete);
        this.sendGet(req.xhr);
        return req;
    },
    createRequest: function (method, url, onSuccess, onError, onComplete) {
        var req = {
            xhr: new XMLHttpRequest(),
            readyStateHandler: function (evt) {
                if (this.isLoading()) {
                    return;
                }

                if (this.xhr.status !== 200) {
                    this.onError(this.xhr.status, this.xhr.responseText);
                } else {
                    this.onSuccess(req.xhr.responseText);
                }

                this.onComplete(this.xhr);
            },
            onSuccess: function () {
                console.log('AJAX SUCCESS', arguments);
            },
            onError: function () {
                console.log('AJAX ERROR', arguments);
            },
            onComplete: function () {
                console.log('AJAX COMPLETE', arguments);
            },
            isLoading: function () {
                return this.xhr.readyState !== XMLHttpRequest.DONE;
            }
        };

        // override default handlers
        if (typeof onSuccess === 'function') {
            req.onSuccess = onSuccess;
        }
        if (typeof onError === 'function') {
            req.onError = onError;
        }
        if (typeof onComplete === 'function') {
            req.onComplete = onComplete;
        }

        // bind listeners
        req.xhr.onreadystatechange = function () {
            req.readyStateHandler.apply(req, arguments);
        }
        req.xhr.onerror = req.onError;
        req.xhr.ontimeout = req.onError;

        // open request
        req.xhr.open(method, url);

        // set xhr header
        req.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        return req;
    },
    sendPost: function (req, postData) {
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        // req.setRequestHeader("Content-Length", postData.length);
        // req.setRequestHeader("Connection", "close");
        req.send(postData);
    },
    sendGet: function (req) {
        req.send();
    }
};
