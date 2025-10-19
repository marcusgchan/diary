# Memory Map

The goal of this app is to remember/document traveling destinations and places visited. This is done by creating diary entries with images. Assuming the images have geolocation metadata, the app will display a map with markers of all the photos uploaded. Clicking on a specific photo will lead back to the diary entry.

## Features

- Users can create, edit, and delete diaries
- For each diary, users can create a diary entry
- The diary entry text editor is created with lexical and supports image uploads (WYSIWYG editor)
- Currently working on the image upload and google maps integration

## Dependencies

- docker (docker desktop is probably the easiest)
- node
- pnpm

## How to run

Run to startup the database and minio (s3) containers:

```bash
docker compose up
```

Start the Nextjs server:

```bash
pnpm run dev
```

Once the containers are running, run this to sync the schema with database. This only needs to be done initially when the database has no tables or if any changes are made to the schema:

```bash
pnpm run push
```
