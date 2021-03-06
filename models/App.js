// Save a reference to the global object (`window` in the browser, `global`
// on the server).
var root = this;

// The top-level namespace. All public Backbone classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
var App, server = false;
if (typeof exports !== 'undefined') {
    App = exports;
    server = true;
} else {
    App = root.App = {};
}

// Require Underscore, Backbone & BackboneIO, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

var BackboneIO = root.BackboneIO;
if ((typeof require !== 'undefined')) Backbone = require('backbone');

App.Model = Backbone.Model.extend({
    urlRoot: 'app',
    backend: 'appbackend',
    idAttribute: '_id',
    initialize: function () {
        if (!server) {
            this.bindBackend();

            this.bind('backend', function(method, model) {
                console.log ('got from backend:', method, model);
            });
        }
        console.log ('creating new App.Model');

        return Backbone.Model.prototype.initialize.call (this);
    },
    defaults: {
        _id: 1,
        title: 'MBC Playout {mlt edition}', 
        subtitle: 'A simple Playout server built with magic and love',
        state: 0,
        state_name: ['UNKNOWN', 'SYNCING', 'LOADING', 'PREROLL', 'PAUSED', 'PLAYING', 'REMOVED'],
        config: {
            scrape_path: "/home/xaiki/Downloads",
        },
        error: {
            melted: [],
        },
        timezone: 'UTC',
    },
});

App.Status = App.Model.extend ({
    defaults: {
        _id: 2,
        piece: {
            previous: null,
            current:  null,
            next:     null,
        },
        show: {
            previous: null,
            current:  null,
            next:     null,
        },
        source: null,
        on_air: false,

    },
});

if(server) module.exports = App;
else root.App = App;
