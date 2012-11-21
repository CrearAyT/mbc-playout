var mongo = require('mongodb');
var _ = require('underscore'); 

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var Media = require (__dirname + '/../models/Media.js')
, mediaList = new Media.Collection();

exports.mediaList = mediaList;

_({'change':'change', 'add':'create'}).each(function (b, e) {
    mediaList.bind(e, function (model, col) {
        console.log("model " + e + "->" + b, model);
        _.each(col.sockets, function (socket) {
            socket.emit(col.url  + ':' + b, model.toJSON());
            socket.broadcast.emit(col.url  + ':' + b, model.toJSON());
        });
    });
});

var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('mediadb', server, {safe: true});

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'mediadb' database");
        db.collection('medias', {safe:true}, function(err, collection) {
            if (err) {
                console.log("The 'medias' collection doesn't exist. Creating it with sample data...");
                populateDB();
            } else {
                collection.find().toArray(function(err, items) {
                    console.log('re-adding', items);
                    _(items).each (function (item) {
                        console.log('re-adding', item);
                        mediaList.add (item);
                    });
                });
            }
            setTimeout(scrape_files, 100);
        });
    } else {
        console.log("Could not connect:", err);
        abort();
    }
});

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving media: ' + id);
    if (mediaList.get(id))
        res.send (mediaList.get(id));
};

exports.findAll = function(req, res) {
    console.log('Retrieving all medias');
    res.send(mediaList.models);
};

function _addMedia (media, err) {
    console.log ("adding media " + media._id + " : " + media.file);
    db.collection('medias', function(err, collection) {
        collection.update({'_id': media._id}, media, {upsert: true}, function(err, result) {
            if (err) {
                console.error(err, 'An error has occurred');
            } else {
                mediaList.add(media);
            }
        });
    });

};

exports.addMedia = function(req, res) {
    var media = req.body;
    var err;
    console.log('Adding media: ' + JSON.stringify(media));
    mediaList.add(media)
    res.send(JSON.stringify(media));
    return;
}

// FIXME: TODO
exports.updateMedia = function(req, res) {
    var id = req.params.id;
    var media = req.body;
    delete media._id;
    console.log('Updating media: ' + id);
    console.log(JSON.stringify(media));
    db.collection('medias', function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, media, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating media: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(media);
            }
        });
    });
}

exports.deleteMedia = function(req, res) {
    var id = req.params.id;
    console.log('Deleting media: ' + id);
    mediaList.get(id).remove();
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the application is started.
// You'd typically not find this code in a real-life app, since the database would already exist.
var populateDB = function() {
    /*
    setInterval(function () {_addMedia ({ file: 'test' + Date.now(), _id: Date.now()})},
                4*1000);

    return;
    */
}

function scrape_files () {
    var ffmpeg  = require('fluent-ffmpeg')
    , walk      = require('walk')
    , fs        = require ('fs')
    , spawn     = require('child_process').spawn
    , bs        = 10*1024*1024
    , observe   = process.env.HOME + "/Downloads";

    console.log ('launched obeserver on path: ' + observe);

    /* Ok, this a bit messy, it goes like this:
       + we get the file;
       + spawn a binary to calculate md5;
       + give that to the ffmpeg process that will:
         . extract codec data;
         . take a screenshot at 5s from start;
       + when all is done and good, we _addMedia, to get it into the medias objects;
    */

    function parse_file (file, stat, next) {
        if (! file.match(/\.(webm|mp4|flv|avi|mpeg|mpeg2|mpg|mkv|ogm|ogg)$/i)) {
            next();
            return;
        }
        var spawn = require('child_process').spawn,
        md5sum    = spawn('md5sum', [file]),
        md5       = "",
        exists    = fs.existsSync || require('path').existsSync;
        md5sum.stdout.on('data', function (data) {
            md5 = data.toString().split(' ')[0];
            next();

            if (mediaList.get(md5))
                return;

            if (exists('./public/sc/' + md5)) {
                console.log ('skeeping screenshot of: ' + md5);
                // extract it from DB
            } else {
                console.log (stat.name + ': ' + md5);
            }

            var proc = new ffmpeg({source: file})
                .withSize('150x100')
                .onCodecData(function(metadata) {
                    console.log(metadata);
                    metadata._id  = md5;
                    metadata.file = file;
                    _addMedia (metadata);
                })
                .withFps(1)
                .addOption('-ss', '5')
                .onProgress(function(progress) {
                    console.log(progress);
                })
                .saveToFile('./public/sc/' + md5 + '.jpg', function(retcode, error) {
                    console.log('file: ' + md5 + ' has been converted succesfully');
                });
/*
                .takeScreenshots({
                    count: 1,
                    timemarks : [ '10%'],
                    filename : md5}, './public/sc/', function (err, fn) {
                        console.log (md5 + ": sc ok");
                    });
*/
        });
    }

    //This listens for files found
    walk.walk(observe, { followLinks: false })
    .on('file', function (root, stat, next) {
        parse_file(root + '/' +  stat.name, stat, next);
    })
    .on('end', function () {
        console.log ("all done");
    });
}
