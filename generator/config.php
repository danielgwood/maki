<?php

/**
 * Maki
 *
 * @author Daniel G Wood <https://github.com/danielgwood>
 */

define('API_KEY', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'); // Get from http://api.themoviedb.org/2.1/
define('API_DELAY', 1);                                // Pause in secs between movie lookups to avoid flooding
define('CACHE_DIR', '../cache');                       // Writable directory (relative to generate.php)