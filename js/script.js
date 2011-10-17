(function (window, undefined) {
    // custom ko bindings
    ko.bindingHandlers['dblclick'] = {
        'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var newValueAccessor = function () {
                var result = {};
                result['dblclick'] = valueAccessor();
                return result;
            };
            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindingsAccessor, viewModel);
        }
    };
    ko.bindingHandlers['stext'] = {
        'update': function (element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if ((value === null) || (value === undefined))
                value = '';

            // take first 20 chars
            if (value.length > 20) value = $.trim(value.substring(0, 20)) + '...';
            typeof element.innerText == 'string' ? element.innerText = value
                                             : element.textContent = value;
        }
    };
    var flash;
    ko.bindingHandlers['flash'] = {
        'update': function (element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor()),
                $element = $(element);
            if ((value === null) || (value === undefined))
                value = '';


            if (flash !== undefined) {
                clearTimeout(flash);
                $element.stop().animate({ opacity: 1 }, 0);
            }
            $element.show();
            typeof element.innerText == 'string' ? element.innerText = value
                                             : element.textContent = value;

            flash = setTimeout(function () {
                $element.animate({ opacity: 0 }, 3 * 1000, 'easeOutCubic');
            }, 2 * 1000);
        }
    };
    ko.bindingHandlers['audio'] = {
        'init': function (element, valueAccessor) {
            var $element = $(element);

            if (!$element.is('audio')) { // can only be used on an audio element
                return;
            }
            var modelValue = valueAccessor(),
                bindingInfo = ko.utils.unwrapObservable(modelValue),
                currentTrack = bindingInfo.value,
                playlist = ko.utils.unwrapObservable(bindingInfo.playlist),
                $gutter = $(bindingInfo.gutter).length == 1 ? $(bindingInfo.gutter) : $('#gutter'), // conventions
                $loading = $(bindingInfo.loading).length == 1 ? $(bindingInfo.loading) : $('#loading'),
                $playtoggle = $(bindingInfo.playtoggle).length == 1 ? $(bindingInfo.playtoggle) : $('#playtoggle'),
                supportsBuffer = !!element.buffered && element.buffered.length > 0;

            $element.bind('progress', function () {
                if (supportsBuffer)
                    $loading.css({ width: parseInt(((element.buffered.end(0) / element.duration) * 100), 10) | 0 + '%' });  // bitwise OR coalesces anything into a number
            }).bind('play', function () {
                $playtoggle.addClass('playing');
            }).bind('pause ended', function () {
                $playtoggle.removeClass('playing');
            }).bind('ended', function () {
                var currentIndex = playlist.indexOf(currentTrack()) | 0,
                    total = playlist.length;
                if (currentIndex < total - 1) {
                    currentIndex++;
                    currentTrack(playlist[currentIndex]);
                }
                else {
                    currentTrack(playlist[0]);
                }
                element.play(); // resume playback
            });

            var initialized = false,
                manualSeek = false,
                timeupdateHandler = function () {
                    var valueToWrite,
                        remaining = parseInt(element.duration - element.currentTime, 10) | 0,
                        mins = Math.floor(remaining / 60, 10),
                        secs = remaining - mins * 60;

                    valueToWrite = {
                        currentTime: ko.observable(parseInt(element.currentTime, 10) | 0),
                        duration: parseInt(element.duration, 10) | 0,
                        percent: ko.observable(parseInt(element.currentTime / element.duration, 10) | 0),
                        timeleft: ko.observable('-' + mins + ':' + (secs > 9 ? secs : '0' + secs))
                    };

                    if (!manualSeek) $gutter.slider('option', { value: valueToWrite.currentTime() });

                    if ($gutter.slider('option', 'max') != valueToWrite.duration) { // update slider max size
                        $gutter.slider('option', 'max', valueToWrite.duration);
                    }

                    if (!initialized) { // bind slide events
                        $gutter.bind('slidestart', function () {
                            manualSeek = true;
                        }).bind('slidestop', function (e, ui) {
                            manualSeek = false;
                            element.currentTime = ui.value;
                        });
                        initialized = true;
                    }
                    if (ko.isWriteableObservable(currentTrack().timeinfo)) {
                        if (currentTrack().timeinfo() !== valueToWrite) {
                            currentTrack().timeinfo(valueToWrite);
                        }
                    }
                };
            ko.utils.registerEventHandler(element, "timeupdate", timeupdateHandler);
        }
    };

    // main app
    var app = window["app"] = {};
    app.utils = (function () {
        return {
            arrayDistinct: function (array) {
                array = array || [];
                var u = {}, ret = [];
                for (var i = 0, l = array.length; i < l; ++i) {
                    if (array[i] in u)
                        continue;
                    ret.push(array[i]);
                    u[array[i]] = 1;
                }
                return ret;
            }
        };
    })();
    app.Track = function (id, song, artist, album, files) { // track object
        return {
            id: id,
            song: song,
            artist: artist,
            album: album,
            files: files,
            timeinfo: ko.observable(),
            jumpTo: function () {
                app.viewModel.currentTrack(this);
                app.viewModel.play();
            },
            prettyName: song + ' by ' + artist
        };
    };
    var player = function () { // player viewmodel
        var that = this;
        // normally some sort of server call would populate this.
        that.library = ko.observableArray([
                new app.Track(1, 'Wheels', 'Cake', 'Pressure Chief', { mp3: 'music/Cake-Pressure Chief-01-Wheels.mp3', ogg: 'music/Cake-Pressure Chief-01-Wheels.ogg' }),
                new app.Track(2, 'The Guitar Man', 'Cake', 'Pressure Chief', { mp3: 'music/Cake-Pressure Chief-06-The Guitar Man.mp3', ogg: 'music/Cake-Pressure Chief-06-The Guitar Man.ogg' }),
                new app.Track(3, 'Dancing Shoes', 'Arctic Monkeys', 'Whatever People Say I Am, That\'s What I\'m Not', { mp3: 'music/04 - Arctic Monkeys - Dancing Shoes.mp3', ogg: 'music/04 - Arctic Monkeys - Dancing Shoes.ogg' }),
                new app.Track(4, 'C.R.E.A.M.', 'Wu-Tang Clan', 'Enter the Wu-Tang', { mp3: 'music/Wu-Tang Clan-Enter The Wu-Tang_ 36 Chambers-08-C.R.E.A.M.mp3', ogg: 'music/Wu-Tang Clan-Enter The Wu-Tang_ 36 Chambers-08-C.R.E.A.M.ogg' })
            ]);
        that.search = ko.observable('');
        that.sortBy = function (column, asc) {
            return that.library.sort(function (a, b) {
                if (asc)
                    return a[column] == b[column] ? 0 : (a[column] > b[column] ? -1 : 1);

                return a[column] == b[column] ? 0 : (a[column] < b[column] ? -1 : 1);
            });
        };
        that.volume = ko.observable(1);
        that.preMuteVolume = ko.observable(1);
        that.currentTrack = ko.observable();
        that.play = function () {
            var audio = $('#player')[0];
            if (audio) audio.play();
        };
        that.pause = function () {
            var audio = $('#player')[0];
            if (audio) audio.pause();
        };
        that.playtoggle = function () {
            if (that.currentTrack() == null) that.currentTrack(that.library()[0]); // add track if there isn't one 
            var audio = $('#player')[0];

            if (audio) {
                if (audio.paused) { that.play(); that.message('play'); }
                else { that.pause(); that.message('paused'); }
            }
        };
        that.skip = function () {
            var current = that.filteredLibrary().indexOf(that.currentTrack()) | 0,
                total = that.filteredLibrary().length;
            if (current < total - 1) {
                current++;
                that.currentTrack(that.filteredLibrary()[current]);
            }
            else {
                that.currentTrack(that.filteredLibrary()[0]);
            }
        };
        that.prev = function () {
            var audio = $('#player')[0],
                currentTime = audio.currentTime | 0;
            var current = that.filteredLibrary().indexOf(that.currentTrack()) | 0,
                total = that.filteredLibrary().length;
            if (currentTime > 1) {
                audio.currentTime = 0;
            } else {
                if (current > 0) {
                    current--;
                    that.currentTrack(that.filteredLibrary()[current]);
                }
                else {
                    that.currentTrack(that.filteredLibrary()[total - 1]);
                }
            }
        };
        that.up = function () {
            var vol = that.volume() + .05;
            if (vol <= 1) that.volume(vol);
            else that.message('volume: maxed');
        };
        that.down = function () {
            var vol = that.volume() - .05;
            if (vol >= 0) that.volume(vol);
            else that.message('volume: muted');
        };
        that.mutetoggle = function () {
            var vol = that.volume(),
                premute = that.preMuteVolume(),
                $mutetoggle = $('#mutetoggle');
            if (vol === 0) {
                that.volume(premute);
                that.message('volume: ' + Math.round(premute * 100) + '%');
                $mutetoggle.removeClass('mute');
            } else {
                that.preMuteVolume(vol);
                that.volume(0);
                that.message('volume: muted');
                $mutetoggle.addClass('mute');
            }
        };
        that.message = ko.observable('');
    };
    app.viewModel = new player();

    // subscribers
    app.viewModel.currentTrack.subscribe(function (value) {
        var $audio = $('#player'),
            $loading = $('#loading'),
            audio = $audio[0],
            wasPlaying = audio && !audio.paused,
            $current = $('.track[data-id="' + value.id + '"]');

        $loading.css({ width: '0' }); // reset loading indicator

        $audio.children('#mp3').attr('src', value.files.mp3);
        $audio.children('#ogg').attr('src', value.files.ogg);
        audio.load(); // force src to load

        $current.siblings().removeClass('playing');
        $current.addClass('playing');

        app.viewModel.message(value.prettyName);
        if (wasPlaying) app.viewModel.play();
    });

    app.viewModel.volume.subscribe(function (value) {
        var audio = $('#player')[0];
        if (audio) {
            audio.volume = value;
        }
        app.viewModel.message('volume: ' + Math.round(value * 100) + '%');
    });

    // dependent observables
    app.viewModel.timeleft = ko.dependentObservable(function () {
        var currentTrack = this.currentTrack();
        return currentTrack ? currentTrack.timeinfo() ? currentTrack.timeinfo().timeleft() : '-0:00' : '-0:00';
    }, app.viewModel);

    app.viewModel.filteredLibrary = ko.dependentObservable(function () {
        var that = this;
        return ko.utils.arrayFilter(that.library(), function (t) {
            return t.song.match(new RegExp(that.search(), 'i'))
                || t.artist.match(new RegExp(that.search(), 'i'))
                    || t.album.match(new RegExp(that.search(), 'i'));
        });
    }, app.viewModel);

    app.viewModel.artists = ko.dependentObservable(function () {
        return app.utils.arrayDistinct(ko.utils.arrayMap(this.library(), function (m) { return m.artist; })).sort(function (a, b) {
            return a.artist == b.artist ? 0 : (a.artist > b.artist ? -1 : 1);
        });
    }, app.viewModel);
    app.viewModel.albums = ko.dependentObservable(function () {
        return app.utils.arrayDistinct(ko.utils.arrayMap(this.library(), function (m) { return m.album; }));
    }, app.viewModel);

    // init
    ko.applyBindings(app.viewModel);
})(window);

$(function () {
    // wire up jqueryui stuff
    $('#gutter').slider({
        value: 0,
        step: 0.01,
        orientation: "horizontal",
        range: "min",
        animate: true
    });
    
    // wire up events
    $('#filters').delegate('.filter', 'click', function () {
        app.viewModel.search(ko.dataFor(this));
    });
    $('#clear-filter').click(function () {
        app.viewModel.search('');
    });
    $('.sort a').click(function () {
        var $parent = $(this).parent(),
            asc = $parent.hasClass('asc') > 0,
            desc = $parent.hasClass('desc') > 0;

        $parent.siblings().removeClass('asc desc');

        if (asc || desc)
            $parent.toggleClass('asc desc');
        else $parent.addClass('asc');

        app.viewModel.sortBy($(this).html().toLowerCase(), asc);
    });
    
    var touchSupport = $('html').hasClass('touch'),
        press = touchSupport ? 'touchstart' : 'mousedown',
        release = touchSupport ? 'touchend' : 'mouseup';
    
    $('#play-controls a').bind(press, function () {
        var $this = $(this);
        $this.css({ left: '1px', top: '1px' });
    }).bind(release, function () {
        var $this = $(this);
        $this.css({ left: '0', top: '0' });
    });

    // disable volume controls in iOS because they simply dont work
    if (window.navigator.userAgent.match(/(ipad|ipod|iphone)/i)) {
        $('#mutetoggle, #volume-down, #volume-up').hide();
    }
    
    // anti-fouc
    $('#wrapper').fadeIn(1000 * 1.5);
});
















