<?php

/**
 * Maki
 *
 * This script generates the film library. At the moment it
 * isn't a very user-friendly process, as it requires you to
 * use it from the command line.
 *
 * @author Daniel G Wood <https://github.com/danielgwood>
 */

// TMDb API class, courtesy of Jonas De Smet
// https://github.com/glamorous/TMDb-PHP-API
require 'TMDb.php';

// Configuration
require 'config.php';

// Read in movies
$movieTitles = array();
$in = fopen('php://stdin', 'r');
while(!feof($in)){
    $title = cleanupTitle(fgets($in, 4096));
    if(strlen($title) > 0) {
        $movieTitles[] = $title;
    }
}

try {
    // Check cache directory is writable
    if(!file_exists(CACHE_DIR) || !is_dir(CACHE_DIR) || !is_writable(CACHE_DIR)) {
        throw new Exception('Cache directory not writable!');
    }

    // Initialise the DB
    $handle = null;
    $dbFilename = CACHE_DIR . DIRECTORY_SEPARATOR . 'films.js';
    $existingInDB = array();
    if(!file_exists($dbFilename)) {
        // New DB
        if(!$handle = fopen($dbFilename, 'w+')) {
             throw new Exception('Could not open DB file for writing!');
        }
        fwrite($handle, "var films = [\n");

    } else {
        // Already a DB file, just append
        if(!$handle = fopen($dbFilename, 'a+')) {
             throw new Exception('Could not open DB file for writing!');
        }
        ftruncate($handle, filesize($dbFilename)-3); // TODO should do this better really
        fwrite($handle, ",\n");

        // Avoid adding titles multiple times
        $db = json_decode('[' . str_replace(array('var films = [', "\n", "\t"), '', file_get_contents($dbFilename)) . ']');
        if(!is_array($db)) {
            throw new Exception('DB corrupt');
        }
        foreach($db as $film) {
            $existingInDB[] = $film->id;
        }
        unset($db);
        sort($existingInDB);
    }

    // Check input
    if(count($movieTitles) < 1) {
        throw new Exception('You must provide at least one movie to look up!');
    }

    // Setup a connection to TMDb
    if(API_KEY === 'TODO_FILL_ME_IN') {
        throw new Exception('Woah there Susan, did you forget to set your API key?');
    }
    $tmdb = new TMDb(API_KEY);

    // Look each movie up in TMDb
    $i = 0;
    $unrecognisedMovies = array();
    foreach($movieTitles as $movieTitle) {
        // Title may include an embedded year, eg "Something (2001)"
        $title = $movieTitle;
        $year = null;
        if(preg_match_all('/^(.+)\(([0-9]{4})\)\s*$/i', $title, $matches)) {
            $title = trim($matches[1][0]);
            $year = (int)$matches[2][0];
        }

        $searchResult = $tmdb->searchMovie($title, 1, false, $year);
        if($searchResult && isset($searchResult['results']) && count($searchResult['results']) > 0) {
            // Found a film, yeah!
            $movieId = $searchResult['results'][0]["id"];

            // Skip it if we already have it
            if(!in_array($movieId, $existingInDB)) {
                // Get detailed info
                $movieDetails = $tmdb->getMovie($movieId);
                $movieCast = $tmdb->getMovieCast($movieId);

                // Build up info to save
                $movie = array(
                    'id' => $movieId,
                    'title' => $movieDetails['title'],
                    'overview' => $movieDetails['overview'],
                    'tagline' => $movieDetails['tagline'],
                    'releaseYear' => date('Y', strtotime($movieDetails['release_date'])),
                    'rating' => ($movieDetails['vote_count'] > 0) ? $movieDetails['vote_average'] : false,
                    'director' => array(),
                    'genres' => array(),
                    'cast' => array(),
                    'runningTime' => (int)$movieDetails['runtime']
                );

                foreach($movieDetails['genres'] as $genre) {
                    $movie['genres'][] = $genre['name'];
                }

                if(isset($movieCast['crew'])) {
                    foreach($movieCast['crew'] as $crewMember) {
                        if($crewMember['job'] != 'Director') {
                            continue;
                        }

                        $movie['director'][] = $crewMember['name'];
                    }
                }

                if(isset($movieCast['cast'])) {
                    foreach($movieCast['cast'] as $castMember) {
                        $movie['cast'][] = $castMember['name'];
                    }
                }

                // Download the poster?
                $posterURL = $tmdb->getImageUrl($movieDetails['poster_path'], TMDb::IMAGE_POSTER, 'w342');
                $posterFile = substr($posterURL, strrpos($posterURL, '/')+1);
                if(!file_exists(CACHE_DIR . DIRECTORY_SEPARATOR . $posterFile)) {
                    file_put_contents(CACHE_DIR . DIRECTORY_SEPARATOR . $posterFile, file_get_contents($posterURL));
                }
                $movie['poster'] = $posterFile;

                // Write this film to the DB
                fwrite($handle, "\t" . json_encode($movie));
                if($i < count($movieTitles)-1) {
                    fwrite($handle, ",\n");
                }
            }

        } else {
            // No matches at all for this film
            $unrecognisedMovies[] = $movieTitle;
        }

        // Indicate progress and sleep a while before next movie
        $i++;
        echo '.';
        sleep(API_DELAY);
    }

    // Done!
    fwrite($handle, "\n];");
    fclose($handle);

    echo "\nLibrary generated and saved to cache.\n";

    // Any movies not found?
    if(count($unrecognisedMovies) > 0) {
        throw new Exception("\nThe following movies were not found:\n" . implode("\n", $unrecognisedMovies));
    }

} catch(\Exception $e) {
    // Probably API issue
    echo $e->getMessage() . "\n";
}


/**
 * Helper function to clean up input
 * @param string $title
 * @return string
 */
function cleanupTitle($title)
{
    return trim($title);
}