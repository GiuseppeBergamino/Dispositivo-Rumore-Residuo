const path = require("path");
const fs = require("fs");

// Creazione server Fastify
const fastify = require("fastify")({
  logger: false,
});

const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// Funzione per leggere la memoria e ripristinare il backup se necessario
function leggiMemoria(callback) {
    const filePath = path.join(__dirname, "memoria.json");
    const backupPath = path.join(__dirname, "backup_memoria.json");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err || !data.trim()) {
            console.error("Errore nella lettura di memoria.json, tentativo di ripristino...");
            fs.readFile(backupPath, "utf8", (backupErr, backupData) => {
                if (backupErr || !backupData.trim()) {
                    console.error("Errore: Anche backup_memoria.json è corrotto o vuoto!");
                    return callback([]);
                }
                console.warn("Memoria ripristinata con successo dal backup!");
                fs.writeFile(filePath, backupData, "utf8", () => {
                    callback(JSON.parse(backupData));
                });
            });
        } else {
            try {
                callback(JSON.parse(data));
            } catch (parseErr) {
                console.error("Errore nel parsing di memoria.json, tentativo di ripristino...");
                fs.readFile(backupPath, "utf8", (backupErr, backupData) => {
                    if (backupErr || !backupData.trim()) {
                        console.error("Errore: Anche backup_memoria.json è corrotto!");
                        return callback([]);
                    }
                    console.warn("Memoria ripristinata dal backup!");
                    fs.writeFile(filePath, backupData, "utf8", () => {
                        callback(JSON.parse(backupData));
                    });
                });
            }
        }
    });
}

//richiamo questa funzione all'avvio del server, prima che il frontend faccia richieste
//se serve ripristino memoria.js all'ultima versione non corrotta di backup_memoria.js
function ripristinaMemoriaSeCorrotta() {
    const filePath = path.join(__dirname, "memoria.json");
    const backupPath = path.join(__dirname, "backup_memoria.json");

    try {
        let memoria = JSON.parse(fs.readFileSync(filePath, "utf8"));
        console.log(`Memoria caricata correttamente (${memoria.length} urla).`);
    } catch (error) {
        console.error("Errore nel parsing di memoria.json! Tentativo di ripristino dal backup...");
        try {
            let backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
            fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf8");
            console.log("Ripristino completato da backup_memoria.json.");
        } catch (backupError) {
            console.error("Errore anche nel backup! Creazione di un nuovo file vuoto...");
            fs.writeFileSync(filePath, "[]", "utf8");
        }
    }
}



// Serviamo i file statici dalla cartella "public"
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

// Integrazione Handlebars per il rendering
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Route principale (pagina web)

fastify.get("/", function (request, reply) {
  return reply.view("/src/pages/index.hbs", {
    title: "Dispositivo di Memoria a Rumore Residuo",
    message: "Interactive Installation",
    seo: seo
  });
});

// API per salvare le urla nel file JSON
// API per salvare gli urli e aggiornare il backup
fastify.post("/salva-urlo", function (request, reply) {
    const nuovoUrlo = request.body;
    const filePath = path.join(__dirname, "memoria.json");
    const backupPath = path.join(__dirname, "backup_memoria.json");

    leggiMemoria((memoria) => {
        // Aggiungiamo il nuovo urlo
        nuovoUrlo.numero_urlo = memoria.length;
        memoria.push(nuovoUrlo);

        // Scriviamo su memoria.json
        fs.writeFile(filePath, JSON.stringify(memoria, null, 2), "utf8", (writeErr) => {
            if (writeErr) {
                console.error("Errore nella scrittura di memoria.json:", writeErr);
                return reply.status(500).send({ error: "Errore nella scrittura del file" });
            }

            // Se il salvataggio di memoria.json è andato a buon fine, aggiorniamo il backup
            fs.writeFile(backupPath, JSON.stringify(memoria, null, 2), "utf8", (backupErr) => {
                if (backupErr) {
                    console.error("Attenzione: Il backup non è stato aggiornato correttamente!", backupErr);
                } else {
                    console.log("Backup aggiornato con successo.");
                }
            });

            return reply.send({ success: true, numero_urlo: nuovoUrlo.numero_urlo });
        });
    });
});

// API che permette al frontend di leggere il numero di lucciole 
// da memoria.json.
fastify.get("/numero-lucciole", function (request, reply) {
    const filePath = path.join(__dirname, "memoria.json");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Errore nella lettura del file JSON:", err);
            return reply.status(500).send({ error: "Errore nella lettura del file" });
        }

        let memoria = [];
        if (data) {
            try {
                memoria = JSON.parse(data);
            } catch (parseError) {
                console.error("Errore nel parsing del JSON:", parseError);
                return reply.status(500).send({ error: "Errore nel parsing del file" });
            }
        }

        return reply.send({ numLucciole: memoria.length });
    });
});

// Endpoint per ottenere il numero di lucciole in tempo reale
fastify.get("/controlla-nuove-lucciole", function (request, reply) {
    const filePath = path.join(__dirname, "memoria.json");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Errore nella lettura del file JSON:", err);
            return reply.status(500).send({ error: "Errore nella lettura del file" });
        }

        let memoria = [];
        if (data) {
            try {
                memoria = JSON.parse(data);
            } catch (parseError) {
                console.error("Errore nel parsing del JSON:", parseError);
                return reply.status(500).send({ error: "Errore nel parsing del file" });
            }
        }

        return reply.send({ numLucciole: memoria.length });
    });
});

fastify.get("/memoria", function (request, reply) {
  // — opzionale: chiave di accesso —
  // if (request.query.key !== process.env.MEMORIA_KEY) {
  //   return reply.status(403).send({ error: "Accesso non autorizzato" });
  // }

  const filePath = path.join(__dirname, "memoria.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Errore nella lettura di memoria.json:", err);
      return reply.status(500).send({ error: "Impossibile leggere il file" });
    }

    reply.type("application/json").send(data); // restituisce tutto il JSON
  });
});


// Controlla e ripristina la memoria all'avvio del server
ripristinaMemoriaSeCorrotta();

// Avvio del server
fastify.listen({ port: process.env.PORT, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});
