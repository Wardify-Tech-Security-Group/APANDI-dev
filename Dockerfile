FROM php:8.3-apache

# Configurar zona horaria oficial de Chile (MINEDUC / Reloj Control)
ENV TZ=America/Santiago
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Instalar extensión nativa PDO MySQL / mysqli (idéntico a cualquier Hosting cPanel en Chile)
RUN docker-php-ext-install pdo pdo_mysql mysqli && a2enmod rewrite headers

# Copiar el contenido web estático (HTML + Tailwind + JS API) y el puente MySQL al DocumentRoot
COPY public/ /var/www/html/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
