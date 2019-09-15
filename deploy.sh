#!/bin/bash

hexo generate --deploy
rsync -azhv public/ ninegene1:/var/www/ninegene.com/public/
