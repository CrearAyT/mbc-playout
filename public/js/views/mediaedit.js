window.EditView = Backbone.View.extend({
    el: '#content',
    events: {
        "click #create-playlist" : "createPlaylist",
        "click #universe li"     : "switchPlaylist",
        "click #right-pane .kill-media-list"  : "killEditList",
        "click .playlist-button-array .save"  : "savePlaylist",
        "click .playlist-button-array .delete": "delPlaylist",
    },
    initialize: function () {
        _.bindAll(this, 'createPlaylist', 'savePlaylist', 'delPlaylist');
        this.render();
    },
    render: function () {
        $(this.el).html(template.mediaedit());
        new UniverseListView({collection: Universe,
                             el: $("#universe")});
        new MediaListView({model: mediaDB,
                           dragSource: true,
                           el: $("#left-pane")});
        if (editList)
            this.showPlaylist(editList);

        return this;
    },
    showPlaylist: function (list) {
        this.editview = new MediaListView({model: list,
                                           el: $("#right-pane")});

        console.log ('show edit view', this.editview);

        $('.no-playlist-alert',     this.el).hide();
        $('.playlist-button-array', this.el).show();
    },
    createPlaylist: function () {
        console.log ("re-instanciating editList");
        editList = new Media.List();

        this.showPlaylist (editList)
    },
    killEditList: function () {
        editList = null;
        $('.playlist-button-array', this.el).hide();
        $('.no-playlist-alert', this.el).show();
    },
    switchPlaylist: function (event, a) {
        var plid = Universe.get(event.currentTarget.id);
        console.log ('swittching to', plid);
        this.showPlaylist (plid);
    },
    savePlaylist: function (event) {
        var medias = this.editview.model.get('models');
        var name   = this.editview.model.get('name');
        var id     = this.editview.model.get_id();

        console.log ("i want to save", this.editview.model, medias, id);
        $('.alert-empty-playlist').hide();
        $('.alert-unnamed-playlist').hide();
        if (! medias.length) {
            console.log ("noooo medias");
            $('.alert-empty-playlist').show();
            return;
        }
        if (!name) {
            console.log ("noooo ");
            this.editview.editListName();
            $('.alert-unnamed-playlist').show();
            return;
        }

        if (! Universe.get(id)) {
            var item = Universe.create (this.editview.model.attributes);
            console.log ('WE HAVE ADDED TO THE UNIVERSE', this.editview.model, item);
        } else {
            this.editview.model.save();
            console.log ('universe knows of us, just saving');
        }
    },
    delPlaylist: function () {
        console.log ("i want to delete", this.editview.model);
        var id = this.editview.model.get_id();
        if (id) {
//            this.editview.model.destroy();
            Universe.remove (id);
        }
    },
});