(function($) {
    var db = [];
    var genres = [];
    var collections = [];
    var cast = [];
    var directors = [];
    var years = [];
    var filter = {};
    var currentMenu = null;
    var errorTimeout = null;

    function showError(message, isFatal)
    {
        window.clearTimeout(errorTimeout);
        $('body').append('<div class="error"><h1>Error</h1><p>' + message + '</p></div>');

        if(!isFatal) {
            errorTimeout = window.setTimeout("$('.error').fadeOut()", 5000);
        }
    }

    function showLoading()
    {
        $('.loading').show();
        window.setTimeout("$('.loading').fadeOut();", 5000);
    }

    function updateMenus()
    {
        // Build main menu
        var html = '<nav class="option-listing"><ul><li class="selected"><a href="#all" data-value="all">All films</a></li>';
        if(genres.length > 1) {
            html += '<li><a href="#genres" data-value="genres">Genres</li>';
        }
        if(collections.length > 1) {
            html += '<li><a href="#collections" data-value="collections">Collections</li>';
        }
        if(cast.length > 1) {
            html += '<li><a href="#cast" data-value="cast">Cast</li>';
        }
        if(directors.length > 1) {
            html += '<li><a href="#directors" data-value="directors">Directors</li>';
        }
        if(years.length > 1) {
            html += '<li><a href="#years" data-value="years">Release years</li>';
        }
        html += '</ul></nav>';

        // Build submenus
        var all = {genres: genres, collections: collections, cast: cast, directors: directors, years: years};
        for(var i in all) {
            var subgroup = all[i];

            if(subgroup.length > 0) {
                html += '<nav id="option-' + i + '" class="option-listing"><ul>';

                for(var j in subgroup) {
                    html += '<li><a href="#filter" data-key="' + i + '" data-value="' + subgroup[j] + '">' + subgroup[j] + '</li>';
                }

                html += '</ul></nav>';
            }
        };

        // Build film listing
        html += '<nav class="film-listing"></nav>';

        $('#listings-container').append(html);
    }

    function updateFilmListing()
    {
        var html = '<ul>';

        for(var i in db) {
            var currentFilm = db[i];

            if(currentFilm.showing) {
                html += '<li><a href="#info" data-id="' + currentFilm.id + '">' + currentFilm.title + '</li>';
            }
        }
        html += '</ul>';

        $('.film-listing').html(html);
    }

    function showMenu(value)
    {
        if(currentMenu !== value && $('#option-' + value)) {
            if(currentMenu === null) {
                $('.option-listing').css('left', 0);
            }

            $('#option-' + currentMenu).css('z-index', 0);
            $('#option-' + value).css('z-index', 1);

            $('#option-' + value).animate(
                {
                    left: '16em'
                },
                {
                    duration: 'normal',
                    step: function(now, fx) {
                        if(currentMenu === null) {
                            $('.film-listing').css('margin-left', (16 + now)+'em');
                        }
                    },
                    complete: function() {
                        $('#option-' + currentMenu).css('left', 0);
                        currentMenu = value;
                    }
                }
            );
        }
    }

    function hideAllMenus()
    {
        currentMenu = null;
        updateFilter(false);
        $('.selected').removeClass('selected');
        $('.option-listing').css('left', 0);
        $('.film-listing').css('margin-left', '16em');
    }

    function updateFilter(key, value)
    {
        if(key === false) {
            // Remove all filters
            filter = {};
            for(var i in db) {
                db[i]['showing'] = true;
            }

            // Re-render
            updateStats();
            updateFilmListing();

            return;
        }

        if($.isEmptyObject(filter) || !(filter.hasOwnProperty(key) && filter[key] === value)) {
            // Remember the filter value
            filter = {};
            filter[key] = value;

            // If we're filtering for a collection, get the collection array first
            var collection = [];
            if(key === 'collections') {
                for(var i in collectionsMap) {
                    if(collectionsMap[i]['name'] === value) {
                        collection = collectionsMap[i]['films'];
                    }
                }
            }

            // Filter the items
            for(var i in db) {
                var currentFilm = db[i];
                currentFilm.showing = false;

                if(key === 'genres' && $.inArray(value, currentFilm.genres) !== -1) {
                    currentFilm.showing = true;

                } else if(key === 'collections' && $.inArray(currentFilm.title, collection) !== -1) {
                    currentFilm.showing = true;

                } else if(key === 'cast' && $.inArray(value, currentFilm.cast) !== -1) {
                    currentFilm.showing = true;

                } else if(key === 'directors' && $.inArray(value, currentFilm.director) !== -1) {
                    currentFilm.showing = true;

                } else if(key === 'years' && currentFilm.releaseYear == value) {
                    currentFilm.showing = true;
                }
            }

            // Re-render
            updateFilmListing();
            updateStats();
        }
    }

    function updateStats()
    {
        var count = 0;
        var mins = 0;
        for(var i in db) {
            if(db[i].showing) {
                count++;
                mins += db[i].runningTime;
            }
        }

        $('.count-showing').text(count);
        $('.count-total').text(db.length);
        $('.count-time').text((mins / 60).toFixed(1));
    }

    function showFilmInfo(id)
    {
        // Lookup film
        var film = false;
        for(var i in db) {
            if(db[i]['id'] === id) {
                film = db[i];
                break;
            }
        }

        if(!film) {
            showError('Film not found!');
            return;
        }

        // Display details
        $('.info-title').html(film.title);
        $('.info-year + dd:eq(0)').html(film.releaseYear);
        $('.info-director + dd:eq(0)').html(film.director.join(', '));
        $('.info-blurb').html(film.overview);
        $('.info-tagline').html(film.tagline);
        $('.info-runningtime+dd:eq(0)').html(film.runningTime + ' minutes');

        $('.info-poster').attr('src', 'cache/' + film.poster);

        Math.round(stars);
        var html = '';
        var stars = 0;
        while(stars < film.rating) {
            html += '<img src="assets/img/star-filled.png" alt="Star">';
            stars++;
        }
        while(stars < 10) {
            html += '<img src="assets/img/star-empty.png" alt="Empty star">';
            stars++;
        }
        $('.info-rating + dd:eq(0)').html(html);

        $('.info-cast-expand').remove();
        var html = '';
        for(var i in film.cast) {
            html += '<li>' + film.cast[i] + '</li>';
        }
        $('.info-cast').html(html);
        if(film.cast.length > 16) {
            $('.info-cast').wrap('<div class="info-cast-collapse" />');
            $('.info-cast-collapse').after('<a id="show-all-cast" class="info-cast-expand" href="#show-all-cast">Show all</a>');

        } else if($('.info-cast-collapse').length > 0) {
            $('.info-cast').unwrap();
        }

        var html = '';
        for(var i in film.genres) {
            html += '<dd>' + film.genres[i] + '</dd>';
        }
        $('.info-genres ~ dd').remove()
        $('.info-genres').after(html);

        // Set up container
        $('#info-container').fadeIn();
    }

    function hideFilmInfo()
    {
        $('#info-container').hide();
    }

    function showAllCast()
    {
        $('.info-cast-expand').remove();
        $('.info-cast-collapse').animate(
            {
                height: $('.info-cast').height(),
                borderWidth: 0
            },
            200,
            function() {
                $('.info-cast-collapse').replaceWith($('.info-cast-collapse').html());
            }
        );
    }

    function initialiseDB()
    {
        if(!films || films.length < 1) {
            showError("No cache file detected! Please run the generator.", true);
        }

        for(var i in films) {
            var currentFilm = films[i];

            currentFilm.showing = true;
            db.push(currentFilm);

            genres = genres.concat(currentFilm.genres || []);
            cast = cast.concat(currentFilm.cast || []);
            directors.push(currentFilm.director);
            years.push(currentFilm.releaseYear);
        }

        genres.sort();
        cast.sort();
        directors.sort();
        years.sort();

        var removeDuplicates = function(item) {
            if(item.toString() === this.previousValue) {
                return false;
            }

            this.previousValue = item.toString();
            return true;
        };

        genres = genres.filter(removeDuplicates, {previousValue: null});
        cast = cast.filter(removeDuplicates, {previousValue: null});
        directors = directors.filter(removeDuplicates, {previousValue: null});
        years = years.filter(removeDuplicates, {previousValue: null});

        if(collectionsMap.length > 0) {
            for(var i in collectionsMap) {
                collections.push(collectionsMap[i]['name']);
            }
        }
    }

    function initialise()
    {
        // Initialise database
        initialiseDB();

        // Loading screen
        showLoading();

        // Request full screen
        var elem = document.getElementById("maki");
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }

        // Show initial stats
        updateStats();

        // Build menus
        updateMenus();
        updateFilmListing();
    }

    $('body').on('click', '.option-listing a', function(event) {
        event.preventDefault();

        if($(this).attr('href') === '#all') {
            // "All films"
            hideAllMenus();

        } else if($(this).attr('href') === '#filter') {
            // 2nd-level menu
            $(this).parent().siblings().removeClass('selected');
            updateFilter($(this).data('key'), $(this).data('value'));

        } else {
            // 1st-level menu
            $('.selected').removeClass('selected');
            showMenu($(this).data('value'));
        }

        $(this).parent().addClass('selected');
    });

    $('body').on('click', '.film-listing a', function(event) {
        event.preventDefault();
        showFilmInfo($(this).data('id'));
    });

    $('body').on('click', '#show-all-cast', function(event) {
        event.preventDefault();
        showAllCast();
    })

    $('body').on('click', '#close-info-container', function(event) {
        event.preventDefault();
        hideFilmInfo();
    });

    $('html').on('scroll', function(event) {
        console.log('hello!');
        hideFilmInfo();
    });

    $(document).ready(function() {
        initialise();
    })

})(jQuery);