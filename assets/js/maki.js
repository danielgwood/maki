;(function($) {
    var db = [];
    var genres = [];
    var collections = [];
    var cast = [];
    var directors = [];
    var years = [];
    var filter = {};
    var viewMode = 'posters';
    var currentMenu = null;
    var errorTimeout = null;
    var searchIndex = null;
    var longestRunningTime = 1;

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
        window.setTimeout("$('.loading').fadeOut();", 3000);
    }

    function updateMenus()
    {
        // Build browse menu
        var html = '';
        if (collections.length > 1) {
            html += '<li><a href="#collections" data-value="collections"><i class="fa fa-folder-open"></i> Collections</li>';
        }
        if (genres.length > 1) {
            html += '<li><a href="#genres" data-value="genres"><i class="fa fa-heart"></i> Genres</li>';
        }
        if (cast.length > 1) {
            html += '<li><a href="#cast" data-value="cast"><i class="fa fa-theater-masks"></i> Cast</li>';
        }
        if (directors.length > 1) {
            html += '<li><a href="#directors" data-value="directors"><i class="fa fa-bullhorn"></i> Directors</li>';
        }
        if (years.length > 1) {
            html += '<li><a href="#years" data-value="years"><i class="fa fa-calendar"></i> Release years</li>';
        }
        $('#browse-menu').append(html);

        // Build submenus
        html = '';

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
        $('#main-menu').after(html);
    }

    function updateFilmListing()
    {
        if (viewMode === 'posters') {
            // show poster thumbnails
            var html = '<div>'

            for(var i in db) {
                var currentFilm = db[i];

                if(currentFilm.showing) {
                    html += '<a class="film-listing-poster" href="#info" data-action="info" data-value="' + currentFilm.id + '" title="' + currentFilm.title + '"><img src="cache/' + currentFilm.poster + '" alt="' + currentFilm.title + '" /></a>';
                }
            }

            html += '</div>';

        } else {
            // text list
            var html = '<ul>';

            for(var i in db) {
                var currentFilm = db[i];

                if(currentFilm.showing) {
                    html += '<li><a href="#info" data-id="' + currentFilm.id + '">' + currentFilm.title + '</li>';
                }
            }

            html += '</ul>';
        }

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
                    duration: 200,
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
        if (key === false) {
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

        if ($.isEmptyObject(filter) || !(filter.hasOwnProperty(key) && filter[key] === value)) {
            // Remember the filter value
            filter = {};
            filter[key] = value;

            // If we're filtering for a collection, get the collection array first
            var collection = [];
            if (key === 'collections') {
                for (var i in collectionsMap) {
                    if (collectionsMap[i]['name'] === value) {
                        collection = collectionsMap[i]['films'];
                    }
                }
            }

            // Filter the items
            for (var i in db) {
                var currentFilm = db[i];
                currentFilm.showing = false;

                if (key === 'genres' && $.inArray(value, currentFilm.genres) !== -1) {
                    currentFilm.showing = true;

                } else if (key === 'collections' && $.inArray(currentFilm.title, collection) !== -1) {
                    currentFilm.showing = true;

                } else if (key === 'cast' && $.inArray(value, currentFilm.cast) !== -1) {
                    currentFilm.showing = true;

                } else if (key === 'directors' && $.inArray(value, currentFilm.director) !== -1) {
                    currentFilm.showing = true;

                } else if (key === 'years' && currentFilm.releaseYear == value) {
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
            html += '<i class="fa fa-star info-rating-star-filled"></i>';
            stars++;
        }
        while(stars < 10) {
            html += '<i class="fa fa-star info-rating-star-empty"></i>';
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
        hideSuggestForm();
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

    function showRandomFilm()
    {
        var i = random(0, films.length);

        showFilmInfo(films[i].id);
    }

    function searchFilms(term)
    {
        $('.selected').removeClass('selected');
        $('#search').addClass('selected');

        var results = searchIndex.search(
            term,
            {
                fields: {
                    title: { boost: 5, bool: "AND" },
                    cast: { boost: 2, bool: "AND" },
                    directors: { boost: 2, bool: "AND" },
                    overview: { boost: 1 }
                },
                expand: true
            }
        );

        if (results.length === 0) {
            $('#search-no-results').show();

        } else {
            $('#search-no-results').hide();

            for (var i in films) {
                var j = 0;
                var matched = false;

                while (j < results.length) {
                    if (results[j] != null && results[j].doc.id == films[i].id) {
                        matched = true;
                        films[i]['showing'] = true;
                        results[j] = null;
                        break;
                    }

                    j++;
                }

                if (!matched) {
                    films[i]['showing'] = false;
                }
            }
        }

        // Re-render
        updateFilmListing();
        updateStats();
    }

    function clearSearch()
    {
        $('#search-no-results').hide();
        $('#search').removeClass('selected');
        $('a[href="#all"]').parent().addClass('selected');

        for (var i in films) {
            films[i]['showing'] = true;
        }

        // Re-render
        updateFilmListing();
        updateStats();
    }

    function initialiseSuggestForm()
    {
        if (longestRunningTime < 180) {
            $('#suggest-duration').val(longestRunningTime);
            $('#suggest-duration-range').val(longestRunningTime);
        }

        $('#suggest-duration').attr('max', longestRunningTime);
        $('#suggest-duration-range').attr('max', longestRunningTime);

        $('#suggest-duration-range').on('input', function(event) {
            $('#suggest-duration').val($(this).val());
        });
        $('#suggest-duration-range').on('change', function(event) {
            $('#suggest-duration').val($(this).val());
        });

        $('#suggest-duration').on('change', function(event) {
            $('#suggest-duration-range').val($(this).val());
        });

        var genreOpts = '';
        for (var i in genres) {
            genreOpts += '<option value="' + genres[i] + '">' + genres[i] + '</option>';
        }
        $('#suggest-genres').append(genreOpts);
    }

    function showSuggestForm()
    {
        $('#suggest-results').hide();
        $('#suggest-no-results').hide();

        $('#listings-container').hide();

        $('#suggest-container').fadeIn("slow");
    }

    function hideSuggestForm()
    {
        $('#listings-container').show();
        $('#suggest-container').fadeOut(50);
        window.scrollTo(0, 0);
    }

    function suggestFilms(count, maxRunningTime, genres)
    {
        $('#suggest-results').hide();
        $('#suggest-no-results').hide();

        var matches = [];

        // find ALL matches
        for (var i in films) {
            var currentFilm = films[i];

            if (currentFilm.runningTime > maxRunningTime) {
                continue;
            }

            if (genres.length === 1 && genres[0] === "all") {
                matches.push(currentFilm);

            } else {
                var matchesGenre = false;

                for (var j in genres) {
                    if (currentFilm.genres.indexOf(genres[j]) !== -1) {
                        matchesGenre = true;
                        break;
                    }
                }

                if (matchesGenre) {
                    matches.push(currentFilm);
                }
            }
        }

        if (matches.length > 0) {
            // randomise
            matches = shuffle(matches);

            // narrow to count
            matches = matches.slice(0, count);
        }

        // display
        if (matches.length == 0) {
            $('#suggest-no-results').show();
            smoothScrollDanielSawka($('#suggest-no-results').offset().top, 50);

        } else {
            var results = '';

            for (var i in matches) {
                results += '<li>';

                results += '<div class="suggest-results-poster">';
                results += '<img src="cache/' + matches[i]['poster'] + '">';
                results += '</div>';

                results += '<div class="suggest-results-details">';

                results += '<h3>' + matches[i]['title'] + '</h3>';
                results += '<p>' + matches[i]['overview'] + '</p>';

                results += '<a class="btn" href="#info" data-action="info" data-value="' + matches[i]['id'] + '"><i class="fas fa-film"></i> Full details</a>';

                results += '</div>';

                results += '</li>';
            }

            $('#suggest-results')
                .html(results)
                .show();

            smoothScrollDanielSawka($('#suggest-results').offset().top - 50, 200);
        }
    }

    function changeViewMode(mode)
    {
        viewMode = mode;

        $('a[data-action="view-mode"]').removeClass('selected');
        $('a[data-action="view-mode"][data-value="' + mode + '"]').addClass('selected');

        updateFilmListing();
    }

    function initialiseDB()
    {
        if (!films || films.length < 1) {
            showError("No cache file detected! Please run the generator.", true);
        }

        searchIndex = elasticlunr(function (){
            this.addField('title');
            this.addField('overview');
            this.addField('cast');
            this.addField('directors');
            this.setRef('id');
        });

        var searchEntry;
        for (var i in films) {
            var currentFilm = films[i];

            currentFilm.showing = true;
            db.push(currentFilm);

            genres = genres.concat(currentFilm.genres || []);
            cast = cast.concat(currentFilm.cast || []);
            directors.push(currentFilm.director);
            years.push(currentFilm.releaseYear);

            searchEntry = {
                id:        currentFilm.id,
                title:     currentFilm.title,
                overview:  currentFilm.overview,
                cast:      currentFilm.cast,
                directors: currentFilm.directors
            };
            searchIndex.addDoc(searchEntry);

            if (currentFilm.runningTime && parseInt(currentFilm.runningTime) > longestRunningTime) {
                longestRunningTime = parseInt(currentFilm.runningTime);
            }
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

        if (collectionsMap.length > 0) {
            for(var i in collectionsMap) {
                collections.push(collectionsMap[i]['name']);
            }
        }
    }

    function random(min, max)
    {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function shuffle(array)
    {
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    function smoothScrollDanielSawka(elementY, duration)
    {
        var startingY = window.pageYOffset;
        var diff = elementY - startingY;
        var start;

        window.requestAnimationFrame(function step(timestamp) {
            if (!start) {
                start = timestamp;
            }

            var time = timestamp - start;
            var percent = Math.min(time / duration, 1);

            window.scrollTo(0, startingY + diff * percent);

            if (time < duration) {
                window.requestAnimationFrame(step);
            }
        });
    }

    function initialise()
    {
        // Initialise database
        initialiseDB();

        // Loading screen
        showLoading();

        // Show initial stats
        updateStats();

        // Build menus
        updateMenus();
        updateFilmListing();

        // Suggest tool
        initialiseSuggestForm();
    }

    $('body').on('click', '.option-listing a', function(event) {
        event.preventDefault();

        if($(this).attr('href') === '#all') {
            // "All films"
            hideAllMenus();
            $(this).parent().addClass('selected');

        } else if($(this).attr('href') === '#random') {
            // Randomiser!
            showRandomFilm();

        } else if($(this).attr('href') === '#suggest') {
            // Suggest tool
            showSuggestForm();

        } else if($(this).attr('href') === '#filter') {
            // 2nd-level menu
            $(this).parent().siblings().removeClass('selected');
            updateFilter($(this).data('key'), $(this).data('value'));
            $(this).parent().addClass('selected');

        } else {
            // 1st-level menu
            $('.selected').removeClass('selected');
            showMenu($(this).data('value'));
            $(this).parent().addClass('selected');
        }
    });

    $('body').on('click', '[data-action="info"]', function(event) {
        event.preventDefault();
        showFilmInfo($(this).data('value'));
    });

    $('body').on('click', '#show-all-cast', function(event) {
        event.preventDefault();
        showAllCast();
    })

    $('body').on('click', '#close-info-container', function(event) {
        event.preventDefault();
        hideFilmInfo();
    });

    $('body').on('keyup', function(event) {
        if (event.key === "Escape") {
            if ($('#info-container').is(':visible')) {
                hideFilmInfo();
                event.preventDefault();

            } else if ($('#suggest-container').is(':visible')) {
                hideSuggestForm();
                event.preventDefault();
            }
        }
    });

    $('#search').on('submit', function(event) {
        event.preventDefault();

        if ($('#search-term').val().length > 2) {
            searchFilms($('#search-term').val());
        } else {
            clearSearch();
        }
    });

    $('#search-term').on('keyup', function(event) {
        if ($('#search-term').val().length > 2) {
            searchFilms($('#search-term').val());
        } else {
            clearSearch();
        }
    });

    $('#suggest-form').on('submit', function(event) {
        event.preventDefault();

        suggestFilms(
            $('#suggest-number').val(),
            $('#suggest-duration').val(),
            $('#suggest-genres').val()
        );
    });

    $('body').on('click', '#close-suggest-container', function(event) {
        event.preventDefault();
        hideSuggestForm();
    });

    $('a[data-action="view-mode"]').on('click', function(event) {
        event.preventDefault();
        changeViewMode($(this).data('value'));
    });

    $(document).ready(function() {
        initialise();
    })

})(jQuery);
