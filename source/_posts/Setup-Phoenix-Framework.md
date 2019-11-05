---
title: Setup Phoenix Framework
date: 2019-09-15 14:05:52
tags: elixir, phoenix framework
---

## Setup Phoenix Framework

### Install Erlang and Elixir on macOS 
```
$ brew update
$ brew install elixir
```
https://elixir-lang.org/install.html#macos

#### Check Erlang and Elixir Version
```
$ elixir -v
Erlang/OTP 22 [erts-10.4.4] [source] [64-bit] [smp:12:12] [ds:12:12:10] [async-threads:1] [hipe] [dtrace]

Elixir 1.9.1 (compiled with Erlang/OTP 22)
```

### Install Hex package manager
```
$ mix local.hex
```

### Install Phoenix Mix archive locally
```
$ mix archive.install hex phx_new
```
```
$ mix help archive.install
    mix archive.install path/to/archive.ez
    mix archive.install hex hex_package
    mix archive.install hex hex_package 1.2.3
```

https://hexdocs.pm/phoenix/installation.html


#### Check Phoenix Version
```
$ mix phx.new -v
Phoenix v1.4.10
```

### Install node.js
```
$ brew install nodejs
```
OR
```
nvm install stable
nvm alias default stable
```

### Run PostgresSQL docker container
```
$ mkdir -p $HOME/docker/volumes/postgres/data

$ docker run --name postgres --hostname postgres \
-e POSTGRES_PASSWORD=postgres \
-p 5432:5432 \
-v $HOME/docker/volumes/postgres/data:/var/lib/postgresql/data \
-d postgres:11
```
https://hub.docker.com/_/postgres/

### Drop inside container and run psql
```
$ docker exec -it postgres bash

root@postgres:/# psql -U postgres
psql (11.5 (Debian 11.5-1.pgdg90+1))
Type "help" for help.
```

#### List roles
```
postgres-# \du
                                   List of roles
 Role name |                         Attributes                         | Member of
-----------+------------------------------------------------------------+-----------
 postgres  | Superuser, Create role, Create DB, Replication, Bypass RLS | {}
```

### Check container logs
```
# Check container logs
$ docker logs postgres
```


