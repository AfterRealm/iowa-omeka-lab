# Iowa Letters Lab · Omeka S 4.1.1 Docker Stack

A local development environment for **Omeka S 4.1.1**, built from scratch because every public Omeka S Docker image on Docker Hub was either stale (`omeka/omeka-s` last updated 2017, ships beta3) or shipped with broken default configuration (`libnamic/omeka-s` ships an unrouted nginx).

This stack is the backend for the [Iowa Letters digital edition prototype](https://github.com/AfterRealm/iowa-letters-prototype), a portfolio piece for the University of Iowa Libraries Web Application Developer (Digital Scholarship & Publishing Support) role, May 2026.

## What's here

- `Dockerfile`: custom Omeka S 4.1.1 image built on `php:8.3-fpm-bookworm`. Installs required PHP extensions (pdo_mysql, gd, exif, intl, zip, mbstring, opcache, imagick) and pulls the upstream Omeka S release zip.
- `entrypoint.sh`: writes `config/database.ini` from env vars and waits for the DB before forking php-fpm.
- `nginx.conf`: fronts PHP-FPM, denies executable PHP under `/files/`, protects `/config/` and `/application/data/`.
- `docker-compose.yml`: three-service stack (MariaDB 11 + the custom Omeka S image + nginx 1.27).
- `populate.py`: populates the install via Omeka's REST API: one Resource Template ("Civil War Letter") with twelve Dublin Core properties, one Item Set, six Items.
- `create_site.py`: creates the public-facing Site, a Home page with `browsePreview` block, and attaches the item set.
- `screenshot.mjs`, `screenshot-public.mjs`: Playwright scripts that log in and capture screenshots of the admin and public-facing site.

## Quick start

```bash
# 1. Build and start
docker compose up -d --build

# 2. Wait for the install wizard
curl http://localhost:8090/install  # should return 200

# 3. Complete the install (web wizard or POST)
# (web: open localhost:8090 in a browser)

# 4. Create an API key
# Log in at /admin → click your profile → API keys → New
# Then set them in your shell:
export OMEKA_KEY_ID=<your_key_identity>
export OMEKA_KEY_CRED=<your_key_credential>

# 5. Populate items and create the site
python populate.py
python create_site.py
```

## What this proves

The same six items modeled in the [prototype's JSON file](https://github.com/AfterRealm/iowa-letters-prototype/blob/main/data/items.json) live as real Omeka S items here, organized in a Resource Template that mirrors the Dublin Core fields used in the prototype. The two sides are designed to be swappable. A one-line change in the prototype's `site.js` switches from the static JSON file to live Omeka API calls.

## Why custom Docker

Three failed attempts before this approach:

1. **`omeka/omeka-s:latest`**: official image, last updated May 2017. Ships Omeka S 1.0.0-beta3 with PHP 7.1. Incompatible with MySQL 8 default auth; ancient codebase doesn't reflect current Omeka behavior.
2. **`libnamic/omeka-s:4.1.1`**: community image, October 2025. Current Omeka version. But ships with the stock Debian nginx config (no PHP routing enabled), so out of the box it serves a directory listing instead of the application.
3. **Custom build from upstream zip**: works, reproducibly. The Dockerfile is committed here.

This kind of "the published image doesn't work; I'll build my own from the official release" pattern is exactly the kind of legacy-modernization judgment call the LIT role description names.

## License

The Iowa Letters illustrative content is fabricated for this portfolio piece. The Docker tooling here is MIT.
