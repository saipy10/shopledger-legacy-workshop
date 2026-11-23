# Repository Guidelines

## Stack and Module Map

ShopLedger uses Node.js with CommonJS modules, Express 4, and `body-parser`. Its browser UI is plain HTML, CSS, and JavaScript. Runtime records are stored as JSON.

- `server.js` creates the app, mounts routes, serves `public/`, and renders invoices.
- `routes/` contains the product, order, customer, and report API handlers.
- `lib/` contains pricing, tax, inventory, order, ledger, report, date, coupon, invoice, and JSON store logic.
- `public/` contains the UI; `config.js` holds server and shop settings; `data/db.json` is the local store.

## Commands

- `npm start` starts the server (`node server.js`); the default port is 3000 and can be overridden with `PORT`.
- `npm test` is configured as a placeholder and exits with an error; no project test runner is configured.

## Change Rules

- Before changing behaviour, write characterization tests that capture the existing behaviour.
- Change only the module the ticket is about; avoid unrelated edits across modules.
- Tests must never read or write `data/db.json`. Use isolated test data instead.
- Do not add dependencies. Use the existing Node.js and installed packages.
