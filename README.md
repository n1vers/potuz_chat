# Realtime Chat Application – Tehniline Dokumentatsioon

Käesolev dokumentatsioon on koostatud tarkvaraprojekti "Realtime Chat Application" kohta, tagades andmete täielikkuse, terminoloogia järjepidevuse ning vastavuse kaasaegsetele arendusstandarditele. Dokumentatsioon on mõeldud arendajatele, süsteemiadministraatoritele ja hooldusmeeskonnale.

---

## 1. Projekti kirjeldus (Projekti kirjeldus)

See peatükk kirjeldab tarkvarasüsteemi eesmärke, ulatust ja nõudeid kolmest erinevast vaatenurgast: funktsionaalsed võimalused, mittefunktsionaalsed kvaliteedikriteeriumid ja kasutajaliidese stabiilsuse ootused.

### 1.1. Funktsionaalsed nõuded (funktsionaalsed nõuded)
Funktsionaalsed nõuded defineerivad süsteemi käitumise, teenused ja spetsiifilised funktsioonid, mida rakendus peab lõppkasutajale ja administraatorile tagama.

* **Kasutajate autentimine ja sessioonihaldus:**
  * Süsteem peab võimaldama uute kasutajate registreerimist (`POST /v1/auth/register`), kontrollides e-posti ja kasutajanime unikaalsust andmebaasis.
  * Autentimisel (`POST /v1/auth/login`) peab süsteem väljastama krüptograafiliselt allkirjastatud JSON Web Tokeni (JWT) ja salvestama selle kliendi brauserisse **HttpOnly** ja **Secure** atribuutidega küpsisesse. See välistab JavaScripti kaudu ligipääsu tokenile ja kaitseb sessiooni XSS (Cross-Site Scripting) rünnete eest.
* **Rollipõhine autoriseerimine (RBAC - Role-Based Access Control):**
  * Süsteem peab eristama kasutajarolle andmebaasi tasemel: `user` (tavakasutaja) ja `admin` (administraator).
  * Administraatoril peab olema eksklusiivne ja piiramatu õigus kustutada reaalajas mis tahes kasutaja saadetud sõnumeid otspunkti `DELETE /v1/messages/:id` kaudu. Tavakasutajal see õigus puudub.
* **Reaalajas andmevahetus (Real-time Messaging):**
  * Sõnumi saatmisel tuleb see koheselt salvestada MongoDB andmebaasi ning edastada Socket.io lüüsi kaudu kõigile aktiivsetele ja samasse vestlusruumi ühendatud klientidele.
  * Kui administraator kustutab sõnumi, peab süsteem edastama sündmuse `delete_message` kaudu sõnumi unikaalse ID, mille tulemusena eemaldatakse sõnum reaalajas ja ilma lehte värskendamata kõikide kasutajate ekraanilt.
* **Profiili ja meedia haldus:**
  * Kasutajal peab olema võimalus üles laadida unikaalne profiilipilt (avatar), mis salvestatakse serveri staatilisse kaustasüsteemi ning seotakse kasutaja profiiliga.

### 1.2. Mittefunktsionaalsed nõuded (mittefunktsionaalsed nõuded)
Mittefunktsionaalsed nõuded määravad süsteemi kvaliteedikriteeriumid, turvastandardid, jõudluspiirangud ja platvormi arhitektuurilised raamid.

* **Turvalisus ja andmekaitse:**
  * Kasutajate paroole ei tohi andmebaasi salvestada avatud tekstina (Plain Text). Paroolide räsimiseks on kohustuslik kasutada asünkroonset `bcrypt` algoritmi koos automaatse soolamisega (minimaalselt 10 salt round'i).
  * Serveri turvalisuse tõstmiseks ja potentsiaalsete haavatavuste peitmiseks tuleb tarkvaraliselt keelata Expressi vaikimisi lisatav päis `X-Powered-By` (`app.disable("x-powered-by")`).
  * CORS (Cross-Origin Resource Sharing) poliitika peab olema rangelt piiratud ainult usaldusväärse kliendi päritoluga (arendusrežiimis `http://localhost:5173`) ning lubama atribuuti `credentials: true`, et tagada turvamärkide liikumine küpsiste kaudu.
* **Jõudlus ja reageerimiskiirus:**
  * Reaalajas sõnumite kohaletoimetamise viivitusaeg (latency) ühelt kliendilt teisele WebSocket ühenduse kaudu ei tohi ületada 200 ms normaalse serverikoormuse korral.
  * Node.js sündmuste tsükkel (Event Loop) peab töötama täielikult asünkroonselt, tagades, et andmebaasi I/O päringud (Mongoose operatsioonid) ei blokeeri uute võrguühenduste või WebSocketi sündmuste vastuvõtmist.

### 1.3. Kasutajanõuded (kasutajanõuded)
Kasutajanõuded kirjeldavad süsteemi toimimist ja disaini lõppkasutaja vaatepunktist, keskendudes kasutatavusele, selgusele ja liidese stabiilsusele.

* **Sõnumite visuaalne eristatavus:** Kasutajaliides (UI) peab visuaalselt selgelt eristama sisselogitud kasutaja enda saadetud sõnumeid teiste kasutajate omadest. Oma sõnumid joondatakse ekraani paremale küljele (kasutades eristuvat spetsiifilist taustavärvi), teiste kasutajate sõnumid kuvatakse vasakul pool.
* **Sõnumite ajaline struktuur ja rühmitamine:** Kasutaja peab nägema iga sõnumi saatmise täpset aega kohalikus ajavööndis formaadis `HH:MM`. Sõnumid tuleb visuaalselt rühmitada kalendripäevade kaupa, kuvades dünaamilisi päisbännereid nagu "Сегодня" (Täna), "Вчера" (Eile) või konkreetset kuupäeva, kui sõnum on vanem.
* **Kasutajaliidese vigade taluvus (Fallback UI):** Kui kasutaja profiilipilti ei õnnestu serverist laadida (fail on kettalt kustutatud või tagastatakse HTTP viga 404), ei tohi liides koost laguneda ega kuvada tühja/katkist pildi ikooni. Selle asemel peab süsteem automaatselt lülituma asendusrežiimile (Fallback UI) ja kuvama stiiliseeritud värvilise ringi, mille sees on kasutaja nime esitäht.
* ---

## 2. Süsteemi kirjeldus (Süsteemi kirjeldus)

Käesolev peatükk annab üksikasjaliku ülevaate rakenduse tehnoloogilisest platvormist, serveri lähtekoodi ülesehitusest, liidestest ja andmebaasi struktuurist.

### 2.1. Kasutatud tehnoloogiad (kasutatud tehnoloogiad, programmeerimiskeeled, andmebaasid ja platvormid)
Süsteem on projekteeritud kaasaegsele, asünkroonsele ja sündmuspõhisele täis-JavaScript stakile, mis tagab minimaalse ressursikulu ja kiire reaalajas andmevahetuse.

* **Programmeerimiskeeled:** JavaScript (ECMAScript 2022+ standard nii kliendi- kui ka serveripoolel, tagades ühtse arendusloogika).
* **Kliendiraamistik (Frontend platvorm):** React.js (Single Page Application ehk SPA, mis on kokku pandud Vite ehitustööriistaga kiireks arenduseks ja optimeeritud tootmis koodiks).
* **Serveri platvorm ja raamistik (Backend):** Node.js runtime keskkond koos Express.js veebiraamistikuga, mis tegeleb HTTP päringute ja vahevarade (middleware) juhtimisega.
* **Andmebaasid ja objekt-andmete teisendajad (ODM):** MongoDB Atlas (pilvepõhine NoSQL dokumentide andmebaas) koos Mongoose ODM teegiga, mis tagab range andmeskeemide valideerimise.
* **Reaalajas side protokoll:** WebSockets, mis on teostatud Socket.io teegi abil. See tagab automaatse taasiühendamise (auto-reconnect) ja pikaajalised madala viivitusega ühendused kliendi ja serveri vahel.

### 2.2. Süsteemi üldine ülesehitus (süsteemi üldine ülesehitus)
Rakenduse serveripoolne käivitusloogika on koondatud faili `server.js`. See toimib süsteemi sisenemispunktina (Entry Point), mis konfigureerib globaalsed turvameetmed, algatab asünkroonsed andmebaasiühendused, käivitab WebSocketi lüüsi ning määrab staatiliste failide kättesaadavuse.

#### Serveri põhikood (`server.js`):
```javascript
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const initDatabase = require("./src/config/db");
const authApi = require("./src/routes/auth");
const profileApi = require("./src/routes/profile");
const chatsApi = require("./src/routes/chats");
const messagesApi = require("./src/routes/messages");
const setupRealtime = require("./src/gateway/socket");

const app = express();
const server = http.createServer(app);

// Sündmuspõhiste reaalaja moodulite ja andmebaasiühenduse käivitamine
setupRealtime(server);
initDatabase();

// Turvameede: eemaldatakse serveri identifitseerimist võimaldav päis ründajate eest
app.disable("x-powered-by");

// CORS konfiguratsioon küpsiste (credentials) turvaliseks toetamiseks
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Staatilise sisu (üleslaaditud avatarid) kättesaadavaks tegemine prefiksiga /static
app.use("/static", express.static(path.join(__dirname, "src", "public")));

// REST API otsupunktide (ruuterite) registreerimine
app.use("/v1/auth", authApi);
app.use("/v1/profile", profileApi);
app.use("/v1/chats", chatsApi); 
app.use("/v1/messages", messagesApi);

// Serveri elutsükli ja tervise seire otspunkt (Health Check)
app.get("/health", (_, response) => {
  response.json({
    ok: true,
    uptime: process.uptime(),
  });
});

// Universaalne 404 käsitleja puuduvate või vigaste marsruutide jaoks
app.use((request, response) => {
  response.status(404).json({
    error: "Route not found",
    path: request.originalUrl,
  });
});

const APP_PORT = process.env.PORT || 5000;

server.listen(APP_PORT, () => {
  console.log(`Realtime API started on port ${APP_PORT}`);
}); ---


