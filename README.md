# Travel Diary App

The goal of this app is to remember/document traveling destinations and places visited. The is done by creating diary entries with images. Assuming the images have geolocation metadata, the app will display a map with markers of all the photos uploaded. Clicking on a specific photo will lead back to the diary entry.

## Features

- Users can create, edit, and delete diaries
- For each diary, users can create a diary entry
- The diary entry text editor is created with lexical and supports image uploads (WYSIWYG editor)
- Currently working on the image upload and google maps integration

## How to run

Ensure you have docker and pnpm installed. Run:
```bash
docker compose up -w -build
```

Once the server is running, run this to sync the schema with database:
```bash
pnpm run push
```
