CREATE TABLE IF NOT EXISTS "AccountData" ("id" text NOT NULL,"json" text NOT NULL,"updatedAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "Album" ("id" integer NOT NULL,"json" text NOT NULL,"updatedAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "ArtistAlbum" ("id" integer NOT NULL,"json" text NOT NULL,"updatedAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "Artist" ("id" integer NOT NULL,"json" text NOT NULL,"updatedAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "Audio" ("id" integer NOT NULL,"br" int NOT NULL,"type" text NOT NULL,"srouce" text NOT NULL,"updateAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "Lyric" ("id" integer NOT NULL,"json" text NOT NULL,"updatedAt" integer NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "Playlist" ("id" integer NOT NULL,"json" text NOT NULL,"updatedAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "Track" ("id" integer NOT NULL,"json" text NOT NULL,"updatedAt" int NOT NULL, PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS "CoverColor" ("id" integer NOT NULL,"color" text NOT NULL, PRIMARY KEY (id));
