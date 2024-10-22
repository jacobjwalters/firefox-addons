# Firefox Addons
This repo serves as a container for my firefox addons. Each is kept in its own subdirectory.

Currently, they're all in a very experimental state; I'm learning how to write extensions alongside experimenting with what I *want* to make, so things like styling aren't yet in a good state.

## Thoth
Named after the Egyptian god of wisdom, knowledge, and writing.

A semantic indexer. You can use this addon to search through your history for semantically similar pages.

This addon will, after you've 60s on a given page:
- Grab the text contents of the page, plus some metadata;
- Send the text over to an llamafile embedding endpoint
- Send the embedding and the page data over to a database (through a proxy daemon).

Then, you can click on the addon's icon to see a list of pages that you've previously indexed that are semantically similar to the current one!

There are also a few keybindings:
- Alt-Shift-Q: Force index current page, cancelling the timer.
- Alt-Shift-A: Display a query box. This allows you to semantically search the collection.
- Alt-Shift-D: Semantically search via the contents of the current page (or current selection if it exists)

### Notes
For thoth to work, you must be running thothd on a server.
thothd currently expects a correctly configured postgres instance with specific schema already set up; I plan to update it to automatically create the database if it doesn't exist already.

Currently, *you* can't run this; it relies on having thothd running at a particular URL, and a llamafile running at a different particular URL.

### TODO
- Style the popup display
- Allow custom endpoints for embedding/thothd
- thothd: Check if DB exists; if not, instantiate it

## Seshat
Named after Thoth's counterpart, Seshat. She was seen as a scribe and record keeper.

Seshat allows you to write notes about users across various sites.
It's similar to the tagging system from RES, but primarily for orange website/lobste.rs, and is capable of merging accounts between sites, so notes about a user on one site will appear on the other.

### TODO
- Fix styling on certain pages (currently it's unreliable and can be interfered with by the site's styling)
- Data import/export (to a db?)
- Better merge UI
- Let the user add external accounts directly from the popup

