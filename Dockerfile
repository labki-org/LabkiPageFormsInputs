FROM php:8.3-apache

# System deps + mod_rewrite
RUN apt-get update && apt-get install -y \
		libicu-dev \
		libzip-dev \
		unzip \
		git \
		curl \
		default-mysql-client \
	&& docker-php-ext-install calendar intl mysqli pdo_mysql zip opcache \
	&& rm -rf /var/lib/apt/lists/* \
	&& a2enmod rewrite

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# MediaWiki core
ARG MW_BRANCH=REL1_44
RUN rm -rf /var/www/html/* \
	&& curl -fSL "https://github.com/wikimedia/mediawiki/archive/refs/heads/${MW_BRANCH}.tar.gz" \
		| tar xz --strip-components=1 -C /var/www/html

WORKDIR /var/www/html

# MW core deps (include dev for PHPUnit)
RUN composer install --no-progress --prefer-dist

# SMW + PageForms via Composer (required by our extension)
ARG SMW_VERSION=6.0
ARG PF_VERSION=6.0
RUN echo '{"require":{"mediawiki/semantic-media-wiki":"~'"${SMW_VERSION}"'","mediawiki/page-forms":"~'"${PF_VERSION}"'"}}' > composer.local.json \
	&& composer update --no-progress --prefer-dist

# ParserFunctions + Vector skin (not bundled in core tarball)
RUN git clone --depth 1 -b "${MW_BRANCH}" \
		https://github.com/wikimedia/mediawiki-extensions-ParserFunctions.git \
		extensions/ParserFunctions \
	&& git clone --depth 1 -b "${MW_BRANCH}" \
		https://github.com/wikimedia/mediawiki-skins-Vector.git \
		skins/Vector \
	&& rm -rf extensions/ParserFunctions/.git skins/Vector/.git

# Directories for the user-mounted extension and logs
RUN mkdir -p /mw-user-extensions /var/log/mediawiki cache images \
	&& chown -R www-data:www-data cache images /var/log/mediawiki /mw-user-extensions

COPY docker-entrypoint-dev.sh /usr/local/bin/docker-entrypoint-dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-dev.sh

ENTRYPOINT ["docker-entrypoint-dev.sh"]
CMD ["apache2-foreground"]
