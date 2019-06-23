---
title: Postgres 9.4 on Ubuntu 14.04
date: 2015-11-04 04:15:48
tags: postgres
---


## Connecting to psql command line

The installation procedure created a user account called postgres that is associated with the default Postgres role.

Run the command `psql` as user `postgres`

```bash
$ sudo -u postgres psql
psql (9.4.5)
Type "help" for help.

postgres=# \q
```

#### Run the shell as postgres user and execute psql command

Use `-i` option to run the shell specified by the target user's password database entry as a login shell.
sudo attempts to change to that user's home directory before running the shell.

```bash
$ sudo -i -u postgres
postgres@myhost ~ $ psql
psql (9.4.5)
Type "help" for help.

postgres=# \q
```

#### Connect to mydb

```bash
$ sudo -i -u postgres psql mydb

psql (9.4.5)
Type "help" for help.

mydb=# \conninfo
You are connected to database "mydb" as user "postgres" via socket in "/var/run/postgresql" at port "5432".
```

## Help
```bash
postgres=# help
You are using psql, the command-line interface to PostgreSQL.
Type:  \copyright for distribution terms
       \h for help with SQL commands
       \? for help with psql commands
       \g or terminate with semicolon to execute query
       \q to quit

postgres=# \?
...
Informational
  (options: S = show system objects, + = additional detail)
  ...
  \d[S+]                 list tables, views, and sequences
  \dg[+]  [PATTERN]      list roles
  \di[S+] [PATTERN]      list indexes
  \dm[S+] [PATTERN]      list materialized views
  \dn[S+] [PATTERN]      list schemas
  \dp     [PATTERN]      list table, view, and sequence access privileges
  \dt[S+] [PATTERN]      list tables
  \dv[S+] [PATTERN]      list views
  \l[+]   [PATTERN]      list databases
  \sf[+] FUNCNAME        show a function's definition
  \z      [PATTERN]      same as \dp


  \dt \*.                 list all tables in all schemas
                         without having to modify search_path

Connection
  \c[onnect] {[DBNAME|- USER|- HOST|- PORT|-] | conninfo}
                         connect to new database (currently "postgres")
  \encoding [ENCODING]   show or set client encoding
  \password [USERNAME]   securely change the password for a user
  \conninfo              display information about current connection

Operating System
  \cd [DIR]              change the current working directory
  \setenv NAME [VALUE]   set or unset environment variable
  \timing [on|off]       toggle timing of commands (currently off)
  \! [COMMAND]           execute command in shell or start interactive shell

```

## Info

#### `\conninfo`

```bash
postgres=# \conninfo
You are connected to database "postgres" as user "postgres" via socket in "/var/run/postgresql" at port "5432".
```

#### show current database

```bash
testdb=> select current_database();
 current_database
------------------
 testdb
(1 row)
```

#### show current user

```bash
testdb=> select current_user;
 current_user
--------------
 testuser
(1 row)
```

#### show server ip, port and version

```bash
testdb=> select inet_server_addr(), inet_server_port();
 inet_server_addr | inet_server_port
------------------+------------------
 127.0.0.1        |             5432
(1 row)


testdb=> select version();
                                               version
------------------------------------------------------------------------------------------------------
 PostgreSQL 9.4.5 on x86_64-unknown-linux-gnu, compiled by gcc (Ubuntu 4.8.2-19ubuntu1) 4.8.2, 64-bit
(1 row)
```

#### `\l` to show databases

```bash
postgres=# \l
                                  List of databases
   Name    |  Owner   | Encoding |   Collate   |    Ctype    |   Access privileges
-----------+----------+----------+-------------+-------------+-----------------------
 mydb      | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 |
 postgres  | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 |
 template0 | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +
           |          |          |             |             | postgres=CTc/postgres
 template1 | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +
           |          |          |             |             | postgres=CTc/postgres
(4 rows)
```

#### `\l+` to show databases with more info

```bash
// Show additional info using '+'
postgres=# \l+
                                                                    List of databases

   Name    |  Owner   | Encoding |   Collate   |    Ctype    |   Access privileges   |  Size   | Tablespace |                Description
-----------+----------+----------+-------------+-------------+-----------------------+---------+------------+--------------------------------------------
 mydb      | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 |                       | 6425 kB | pg_default |
 postgres  | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 |                       | 6548 kB | pg_default | default administrative connection database
 template0 | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +| 6417 kB | pg_default | unmodifiable empty database
           |          |          |             |             | postgres=CTc/postgres |         |            |
 template1 | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +| 6425 kB | pg_default | default template for new databases
           |          |          |             |             | postgres=CTc/postgres |         |            |
(4 rows)
```

#### `\dn *` to show all schemas

```bash
// List all schemas
postgres=# \dn *

        List of schemas
        Name        |  Owner
--------------------+----------
 information_schema | postgres
 pg_catalog         | postgres
 pg_temp_1          | postgres
 pg_toast           | postgres
 pg_toast_temp_1    | postgres
 public             | postgres
(6 rows)
```

#### `\dt` to show tables

```bash
// List information_schema's tables
postgres=# \dt information_schema.
                        List of relations
       Schema       |          Name           | Type  |  Owner
--------------------+-------------------------+-------+----------
 information_schema | sql_features            | table | postgres
 information_schema | sql_implementation_info | table | postgres
 information_schema | sql_languages           | table | postgres
 information_schema | sql_packages            | table | postgres
 information_schema | sql_parts               | table | postgres
 information_schema | sql_sizing              | table | postgres
 information_schema | sql_sizing_profiles     | table | postgres
(7 rows)
```

## Execute shell command

```bash
postgres=# \! pwd
/var/lib/postgresql

postgres=# \cd /tmp

postgres=# \! pwd
/tmp
```

## Set "postgres" user password

```bash
$ sudo -i -u postgres psql
psql (9.4.5)
Type "help" for help.

postgres=# \password

Enter new password:
Enter it again:
```

## Install adminpack
adminpack provides a number of support functions which pgAdmin and other administration
and management tools can use to provide additional functionality, such as remote management
of server log files.

```bash
postgres=# CREATE EXTENSION adminpack;
ERROR:  extension "adminpack" already exists
```

Hmm, I don't remember creating it. adminpack extension could be created as part of 9.4 install.

## Create testuser and testdb and grant privileges using sql

```bash
$ sudo -i -u postgres

postgres@myhost ~ $ createuser testuser

postgres@myhost ~ $ createdb testdb

postgres@myhost ~ $ psql
psql (9.4.5)
Type "help" for help.

postgres=# alter user testuser with encrypted password 'testpassword';
ALTER ROLE

postgres=# grant all privileges on database testdb to testuser;
GRANT

postgres=# \q
```

## Create user interactively and set password

```bash
$ sudo -i -u postgres createuser --interactive
Enter name of role to add: testuser2
Shall the new role be a superuser? (y/n) n
Shall the new role be allowed to create databases? (y/n) n
Shall the new role be allowed to create more new roles? (y/n) n
```

## Set user password using `psql`

```bash
$ sudo -i -u postgres psql

postgres=# \password testuser2
Enter new password: 
Enter it again: 
```

## Create user with full rights and create db for that user

* `-D` - no database creation rights
* `-A` - no add user rights
* `-P` - force password prompt

```bash
$ sudo -i -u postgres createuser -D -A -P testuser3
```

Create `testdb3` with owner as `testuser3`

```bash
$ sudo -i -u postgres createdb -O testuser3 testdb3
```

## Modify pg_hba.conf to use MD5 auth method to use encrypted password to login

```bash
$ psql -U testuser -W testdb
Password for user testuser:
psql: FATAL:  Peer authentication failed for user "testuser"
```

```bash
$ sudo vi /etc/postgresql/9.4/main/pg_hba.conf

#local   all             all                                     peer
local   all             all                                     md5
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
```

#### Listen on all network interfaces to allow user to connect over the network

```bash
$ sudo vi /etc/postgresql/9.4/main/postgresql.conf

listen_addresses = '*'
```

#### Restart postgres server
```bash
$ sudo service postgresql restart
 * Restarting PostgreSQL 9.4 database server                                                                     [ OK ]
```

`-W` option to ask for password.

```bash
$ psql -U testuser -W testdb
Password for user testuser:
psql (9.4.5)
Type "help" for help.

testdb=>

```

## Connecting to the database

#### Login with user/password

```bash
$ psql -h localhost -p 5432 -U testuser -W testdb
Password for user testuser: 

psql (9.4.5)
SSL connection (protocol: TLSv1.2, cipher: ECDHE-RSA-AES256-GCM-SHA384, bits: 256, compression: off)
Type "help" for help.

testdb=> 
```

#### Using URI format

Using URI format that allow to specify password. If password is not supplied, PostgreSQL looks for
a password file and prompt for password if the password file doesn't exist.

```bash
$ psql postgresql://testuser:testpassword@localhost:5432/testdb

psql (9.4.5)
SSL connection (protocol: TLSv1.2, cipher: ECDHE-RSA-AES256-GCM-SHA384, bits: 256, compression: off)
Type "help" for help.

testdb=> 
```


#### Using ~/.pgpass File
A password file `~/.pgpass` has this format:`host:port:dbname:user:password`

```bash
echo 'localhost:5432:testdb:testuser:testpassword' > ~/.pgpass
chmod 0600 ~/.pgpass
```

But you still need to specify user and database to connect to PostgreSQL server?

```bash
$ psql 
Password: 
psql: fe_sendauth: no password supplied

$ psql -U testuser
Password for user testuser: 
psql: fe_sendauth: no password supplied

$ psql -U testuser testdb
psql (9.4.5)
Type "help" for help.

testdb=> 
```


Use `*` to match anything.

```bash
$ cat ~/.pgpass
*:*:*:testuser:testpassword

$ psql -U testuser testdb
psql (9.4.5)
Type "help" for help.

testdb=> 
```

## References
 * Help.ubuntu.com,. (2015). PostgreSQL - Community Help Wiki. Retrieved 2 November 2015, from [https://help.ubuntu.com/community/PostgreSQL](https://help.ubuntu.com/community/PostgreSQL)
 * Digitalocean.com,. (2015). How To Install and Use PostgreSQL on Ubuntu 14.04 | DigitalOcean. Retrieved 2 November 2015, from [https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-14-04](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-14-04)
 * Postgresql.org,. (2015). PostgreSQL: Documentation: 9.4: psql. Retrieved 5 November 2015, from [http://www.postgresql.org/docs/9.4/static/app-psql.html](http://www.postgresql.org/docs/9.4/static/app-psql.html)
 * Postgresql.org,. 2015. 'Postgresql: Documentation: 9.4: The Pg_Hba.Conf File'. Accessed November 5 2015. [http://www.postgresql.org/docs/9.4/static/auth-pg-hba-conf.html](http://www.postgresql.org/docs/9.4/static/auth-pg-hba-conf.html).
 * Postgresql.org,. (2015). PostgreSQL: Documentation: 9.4: The Password File. Retrieved 7 November 2015, from [http://www.postgresql.org/docs/9.4/static/libpq-pgpass.html](http://www.postgresql.org/docs/9.4/static/libpq-pgpass.html)
