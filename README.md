maki
====

Concept: An offline web-app media library, requiring no installation.

The library is generated using a PHP script, thereafter all data is cached locally, so you can use the library offline.

Demo
----
You can see a library generated using a couple of hundred films here: http://danielgwood.com/lab/maki-demo.

Usage
-----
In this early version, the setup process is a little unintuitive, requiring CLI usage of PHP:

1. Clone repo
2. Get an API key for TMDB: http://docs.themoviedb.apiary.io/
3. Put your API key in generator/config.php where shown
4. Ensure there is a writable directory for the cache, according to the constant in config.php
5. Run the generator script in CLI PHP, passing in a list of films via standard input
6. Once the generator has completed, you should be able to view your library at index.html

Contributing
------------
See the official TODO list: https://github.com/danielgwood/maki/blob/master/TODO.md