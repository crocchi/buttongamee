# buttongamee
PUZZLE NUMBER

//// TESTING AND LEARNING JS AND NODE.JS
//// 
PICCOLO GIOCO DI NUMERI X TESTARE NODE JS

## Sviluppo locale con Docker

Non serve installare Node.js, npm o MySQL sul computer: basta Docker.

```
docker-compose up --build
```

Il gioco sarà raggiungibile su http://localhost:8000 (MySQL parte in un container a parte, dati persistiti nel volume `mysql_data`).

Per fermare tutto: `docker-compose down` (aggiungi `-v` per cancellare anche i dati MySQL).

## Deploy su Hostinger

1. Crea un database MySQL da hPanel (Databases > MySQL Databases) e prendi host/utente/password/nome db.
2. Crea una "Node.js App" da hPanel, Application root = cartella `BACKEND`, Startup file = `index.js`.
3. Imposta le variabili d'ambiente dal pannello (o da un file `.env` basato su `BACKEND/.env.example`): `SESSION_SECRET`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `CORS_ORIGIN`.
4. Le tabelle MySQL vengono create automaticamente all'avvio (`initDb`); in alternativa importa manualmente `BACKEND/db/schema.sql` da phpMyAdmin.

