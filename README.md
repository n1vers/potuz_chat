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
```

## 3. Disain ja arhitektuur (Disain ja arhitektuur)

Käesolev peatükk keskendub rakenduse sisemisele struktuurile, moodulitevahelisele koostööle, turvavahevaradele ning andmete transformeerimise loogikale kliendi ja serveri vahel.

### 3.1. Tarkvara arhitektuur (tarkvara arhitektuur)
Süsteem on projekteeritud **kihilise arhitektuuri (Layered Architecture)** põhimõttel, tagades koodibaasi modulaarsuse, komponentide nõrga seotuse (loose coupling) ja lihtsa hooldatavuse. Iga sissetulev päring liigub läbi kindlalt piiritletud tasemete:

1. **Routing Layer (Marsruutimise kiht):** Võtab vastu HTTP päringud, tuvastab URL-i prefiksid ja suunab päringu edasi vastavale ressursside ruuterile.
2. **Middleware Layer (Vahevara kiht):** Teostab turvakontrollid, valideerib JWT sisselogimismärgi ja kontrollib kasutaja rollipõhiseid õigusi enne äriloogika käivitamist.
3. **Business Logic / Gateway Layer (Äriloogika ja lüüsi kiht):** Töötleb andmeid, tegeleb sõnumite kustutamise, valideerimise ja Socket.io kaudu reaalajas sündmuste levitamisega (broadcasting) kõigile klientidele.
4. **Data Access Layer (Andmekiht):** Suhtleb Mongoose mudelite kaudu otse MongoDB pilveandmebaasiga, täites asünkroonseid I/O operatsioone.

### 3.2. Moodulite kirjeldused (moodulite kirjeldused)
Rakenduse turvalisus ja rollipõhine juurdepääs (RBAC) põhineb kahel kriitilisel serveripoolsel vahevara moodulil, mis kaitsevad tundlikke API otspunkte.

#### 1. Autentimise vahevara (`middleware/authMiddleware.js`)
See moodul loeb kliendi päringu küpsistest (`req.cookies.token`) JWT märgise. Juurdepääsu tagamiseks tehakse andmebaasipäring `User.findById()`, et laadida süsteemi **kõige ajakohasem roll** otse andmebaasist. See lahendab probleemi, kus administraatori õiguste käsitsi muutmisel andmebaasis rakenduvad uued õigused koheselt, ilma et kasutaja peaks oma sessiooni katkestama (uuesti sisse logima).

```javascript
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Вы не авторизованы" });
    }

    // Tokeni valideerimine ja dekodeerimine salajase võtme abil
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Päritakse värsked andmed ja roll otse andmebaasist
    const dbUser = await User.findById(decoded.id);

    if (!dbUser) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    // Rikastatakse päringu objekti (req), tehes andmed kättesaadavaks järgmistele kihtidele
    req.user = {
      id: dbUser._id,
      username: dbUser.username,
      role: dbUser.role 
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Неверный или истёкший токен" });
  }
}

module.exports = authMiddleware;
const APP_PORT = process.env.PORT || 5000;

server.listen(APP_PORT, () => {
  console.log(`Realtime API started on port ${APP_PORT}`);
});
```
---

## 4. Testimine (Testimine)

See peatükk koondab süsteemi kvaliteedikontrolli põhimõtted, detailse testimisplaani, spetsiifilised testjuhtumid ning reaalsed tulemused pärast koodimuudatuste sisseviimist.

### 4.1. Testiplaan (testiplaan)
Rakenduse testimisel kasutatakse **funktsionaalset musta kasti testimist (Black-Box Testing)**, kus kontrollitakse süsteemi väljundeid vastavalt etteantud sisenditele, tundmata koodi sisemist struktuuri, ning **integratsioonitestimist**, et veenduda komponentide vahelise andmevahetuse (React $\leftrightarrow$ Express $\leftrightarrow$ MongoDB) korrektsuses. 

Erilist tähelepanu pööratakse kahele kriitilisele valdkonnale:
1. **Rollipõhise juurdepääsu kontroll (RBAC):** Veenduda, et autoriseerimise vahevarad blokeerivad või lubavad tegevusi vastavalt kasutaja rollile.
2. **Kliendiliidese veatolerantsus:** Kontrollida, kuidas Reacti liides reageerib serveri veakoodidele (403, 404).

### 4.2. Testjuhtumid (testjuhtumid)

#### TC-01: Tavakasutaja õiguste piirangute kontroll (Sõnumi kustutamine)
* **Eesmärk:** Veenduda, et rolliga `user` autentitud kasutaja ei saa süsteemist sõnumeid kustutada.
* **Eeltingimused:** Andmebaasis on kasutaja, kelle väljal `role` on väärtus `"user"`. Kasutaja on edukalt sisse logitud ja omab kehtivat JWT küpsist.
* **Testimissammud:**
  1. Avada arendustööriistad (Browser DevTools $\rightarrow$ Network vahekaart).
  2. Saata tavakasutaja sessioonist HTTP `DELETE` päring otspunktile `http://localhost:5000/v1/messages/6a1007524c8a5c2510db0857`.
  3. Jälgida serveri vastust ja andmebaasi seisundit.
* **Oodatav tulemus:** Serveri vahevara `checkRole("admin")` tuvastab õiguste puudumise, katkestab päringu ja tagastab staatuse `403 Forbidden` koos JSON sõnumiga `{ "message": "Puuduvad vajalikud õigused" }`. Sõnumit andmebaasist ei kustutata.

#### TC-02: Administraatori õiguste ja reaalajas sünkroniseerimise kontroll
* **Eesmärk:** Veenduda, et administraator saab sõnumeid kustutada ja muudatus kajastub reaalajas kõigil klientidel.
* **Eeltingimused:** Kasutaja roll on MongoDB Atlas keskkonnas muudetud väärtusele `"admin"`. Avatud on kaks erinevat brauseriakent (Klient A ja Klient B).
* **Testimissammud:**
  1. Logida Kliendi A aknas sisse administraatori kontoga.
  2. Vajutada soovitud sõnumi juures asuvale prügikasti ikoonile 🗑️.
  3. Jälgida võrgupäringut Kliendi A aknas ning visuaalset muutust Kliendi B (tavakasutaja) akna ekraanil.
* **Oodatav tulemus:** Server töötleb päringu edukalt, tagastab staatuse `200 OK`, kustutab kirje MongoDB-st ning saadab läbi Socket.io kõigile ühendatud seadmetele sündmuse `delete_message`. Sõnum kaob mõlema kliendi ekraanilt reaalajas.

#### TC-03: Kliendiliidese käitumine puuduva avatari korral (HTTP 404 käsitlemine)
* **Eesmärk:** Kontrollida, et serveripoolne pildifaili puudumine ei lõhu kasutajaliidest ja süsteem kuvab asenduskomponendi.
* **Eeltingimused:** Kasutaja dokumendis on väljal `avatar` väärtus `/uploads/avatars/missing-file.png`, kuid vastavat faili ei eksisteeri serveri kaustas `src/public/uploads/avatars/`.
* **Testimissammud:**
  1. Logida sisse ja avada vestlusaken (Chat room).
  2. Jälgida konsooli vigu (Console) ja kasutaja profiilipildi visuaalset kuvamist.
* **Oodatav tulemus:** Brauser saab serverilt faili pärimisel vastuseks `404 Not Found`. Element `<img>` vallandab `onError` sündmuse. Käivitub JavaScripti kood, mis seab pildi stiiliks `display: 'none'` ja lülitab sisse varu-div-elemendi (`display: 'flex'`), mis kuvab kasutaja nime esitähe.

### 4.3. Testitulemused (testitulemused)
Kõik käivitatud testjuhtumid on edukalt läbinud (**Passed**). 

* **Käsitsi ja automatiseeritud kontrollide tulemus:**
  * Rollide kontrollimise vahevara (middleware) stabiilsus on testitud olukorras, kus kasutaja rolli muudetakse otse andmebaasis ilma uut tokenit väljastamata. Süsteem suutis muudatuse reaalajas tuvastada ning õigused korrektselt delegeerida või blokeerida.
  * Kliendiliidese veatöötlus töötab korrektselt — serveri poolt tagastatud `403` ja `404` koodid püüti Reacti poolt kinni, hoides ära rakenduse krahhi (Crash) ning tagades kasutajale sujuva ja vigadeta kogemuse.
---

## 5. Kasutus- ja hooldusjuhend (Kasutus- ja hooldusjuhend)

See peatükk on mõeldud süsteemi administraatoritele, arendajatele ja hooldusmeeskonnale, kes vastutavad rakenduse igapäevase käitamise, tehnilise toe ja uute versioonide paigaldamise eest.

### 5.1. Süsteemi kasutamine (süsteemi kasutamine)
Rakenduse kasutajaliides kohandub dünaamiliselt vastavalt sisselogitud kasutaja rollile ja serveri õiguste kontrollile.

* **Tavakasutaja funktsionaalsus:**
  * Kasutaja saab kirjutada tekstiaknesse ja saata sõnumeid, mis ilmuvad reaalajas kõigi ühendatud kasutajate ekraanile.
  * Kasutaja näeb oma profiilipilti või selle puudumisel automaatselt genereeritud initsiaaliga asendusringi.
  * Sõnumid kuvatakse kronoloogilises järjekorras ning süsteem rühmitab need kuupäevabännerite (nt "Сегодня", "Вчера") alla.
* **Administraatori funktsionaalsus:**
  * Kui süsteem tuvastab kasutaja rolliks `"admin"`, aktiveerub Reacti koodis tingimuslik renderdamine, mis kuvab iga sõnumi juures prügikasti ikooni 🗑️.
  * Administraator saab mis tahes sõnumi kustutada, vajutades prügikasti ikoonile. Tegevus käivitab asünkroonse `DELETE` päringu serverile ja kustutab sõnumi reaalajas kõigi kasutajate ekraanilt.

### 5.2. Paigaldamine (paigaldamine)
Süsteemi lokaalseks seadistamiseks ja käivitamiseks arenduskeskkonnas tuleb järgida alljärgnevat tehnilist juhendit.

#### Eeltingimused:
Masinasse peab olema paigaldatud **Node.js** (soovitatavalt LTS versioon 20 või uuem) ja **npm** (Node Package Manager).

#### Samm 1: Projektikausta liikumine ja sõltuvuste paigaldamine
Liikuda terminalis serveri projektikausta ja käivitada käsund, mis laeb alla kõik vajalikud paketid (sh `express`, `mongoose`, `socket.io`, `jsonwebtoken`, `bcrypt`, `cookie-parser` ja `cors`):
```bash
cd chat-backend
npm install

---

## 6. Lisad (Lisad)

Käesolev peatükk koondab endasse süsteemi arendamiseks, sünkroniseerimiseks ja hooldamiseks vajalikud andmetabelid, arhitektuurilised skeemid ning ametlikud tehnilised viited rahvusvahelistele standarditele.

### 6.1. Tabelid (tabelid)

Süsteemi toimimise ja andmevoogude mõistmiseks on alljärgnevalt esitatud detailsed tabelid andmebaasi andmetüüpide käitumise, HTTP staatuskoodide tähenduste ning WebSocket sündmuste kohta.

#### 6.1.1. Andmete transformatsiooni võrdlustabel
Tabelis on välja toodud andmete olekud ja formaadid süsteemi eri kihtides: andmebaasis salvestatuna, võrgukihi transiidis (JSON kujul) ning kliendiliideses (React) lõppkasutajale kuvatuna.

| Funktsionaalne komponent | Olek andmebaasis (MongoDB Atlas) | Olek võrgukihi transiidis (API / JSON) | Kuvamine kasutajaliideses (React Frontend) |
| :--- | :--- | :--- | :--- |
| **Kasutaja roll (RBAC)** | `role: "admin"` (Range kontroll läbi Mongoose enum-valideerimise) | `{ "role": "admin" }` (Autentimispäringu vastuses sisalduv võtme-väärtuse paar) | Tingimuslik loogika: aktiveerib administraatori paneeli ja sõnumite juures prügikasti ikooni 🗑️. |
| **Sõnumi loomise aeg** | `createdAt: 2026-05-14T07:49:24.064+00:00` (ISODate tüüp) | `"createdAt": "2026-05-14T07:49:24.064Z"` (String-vormingus ISO-tempel) | Teisendatud kliendi kohalikuks kellaajaks (nt **10:49**). Rühmitatud kuupäevabänneri "14. mai 2026" alla. |
| **Kasutaja profiilipilt**| `avatar: "/uploads/avatars/pilt.png"` (Relatiivne teekond stringina) | `"avatar": "/uploads/avatars/pilt.png"` (Kasutajaobjekti alamväli JSON-is) | Dünaamiliselt kokku pandud täispikk URL: `http://localhost:5000/static/uploads/avatars/pilt.png` |

#### 6.1.2. Süsteemi HTTP veakoodide ja reageeringute spetsifikatsioon
Tabel kirjeldab, kuidas Expressi backend reageerib erinevatele turva- ja päringusündmustele ning kuidas Reacti klient neid käsitleb.

| HTTP kood | Staatus | Tekkepõhjus süsteemis | Kliendipoolne reaktsioon (React) |
| :--- | :--- | :--- | :--- |
| **200** | OK | Päring oli edukas (nt sõnumite ajaloo laadimine või administraatori tehtud sõnumi kustutamine). | Uuendatakse liidese olekut (state), kuvatakse andmed või eemaldatakse kustutatud element. |
| **201** | Created | Uus ressurss on edukalt loodud (nt uue kasutaja registreerimine). | Suunatakse kasutaja sisselogimise või peamisele vestluse lehele. |
| **401** | Unauthorized | Küpsistes puudub JWT token, see on aegunud või parandatud `authMiddleware` ei leia kasutajat ID alusel andmebaasist. | Katkestatakse sessioon, puhastatakse `localStorage` kasutajaandmetest ja suunatakse kasutaja `/login` lehele. |
| **403** | Forbidden | Kasutaja on autenditud, kuid vahevara `checkRole("admin")` tuvastas, et kasutaja roll on `user`, mis ei luba antud tegevust. | Kuvatakse konsoolis viga `AxiosError: Request failed with status code 403` ja kasutajale kuvatakse hoiatusteade. |
| **404** | Not Found | Küsitud API marsruuti ei eksisteeri või Expressi staatiline vahevara ei leia faili kaustast `src/public/uploads/avatars/`. | API puhul kuvatakse teade "Route not found". Pildi puhul käivitub `onError` sündmus ja kuvatakse initsiaaliga asendusring. |

#### 6.1.3. Reaalajas sünkroniseerimise WebSocket (Socket.io) sündmused
Tabel kirjeldab reaalajas toimivaid asünkroonseid sündmusi kliendi ja serveri vahel.

| Sündmuse nimi (Event) | Suund | Edastatavad andmed (Payload) | Süsteemi tegevus |
| :--- | :--- | :--- | :--- |
| `connection` | Klient $\rightarrow$ Server | Puudub | Server tuvastab uue aktiivse kliendi ühenduse ja loob talle unikaalse socketi ID. |
| `message` | Server $\rightarrow$ Kõik kliendid | Sõnumi objekt (ID, tekst, saatja andmed, kuupäev) | Sõnum lisatakse reaalajas kõigi ühendatud kasutajate ekraanile ja vaade keritakse automaatselt alla. |
| `delete_message` | Server $\rightarrow$ Kõik kliendid | Sõnumi unikaalne `_id` (String) | Reacti klient filtreerib sissetulnud ID alusel olemasolevate sõnumite massiivi ja eemaldab selle reaalajas ekraanilt. |

### 6.2. Skeemid (skeemid)

Skeemid kirjeldavad visuaalselt ja loogiliselt andmevoogude liikumist, turvakontrolle ja staatiliste failide laadimise mehaanikat. GitHub renderdab need automaatselt graafilisteks joonisteks.

#### 6.2.1. Rollipõhise autentimise ja päringu elutsükli skeem
See sekventsiaalskeem kirjeldab kasutaja päringu teekonda hetkest, kui administraator vajutab prügikasti nupule, kuni andmete reaalse kustutamiseni MongoDB andmebaasist ja sündmuse levitamiseni.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as React Klient
    participant Server as Express Server (server.js)
    participant Auth as authMiddleware.js
    participant Check as checkRole("admin")
    participant DB as MongoDB Atlas (User Model)

    Admin->>Server: DELETE /v1/messages/:id (вместе с Cookie)
    Server->>Auth: Передача управления
    Auth->>Auth: Чтение и верификация JWT токена
    alt Токен невалиден или отсутствует
        Auth-->>Admin: 401 Unauthorized
    else Токен валиден
        Auth->>DB: User.findById(decoded.id)
        DB-->>Auth: Возвращает dbUser (id, username, role)
        Auth->>Auth: Запись в req.user = dbUser
        Auth->>Check: next()
    end

    Check->>Check: Проверка: req.user.role === "admin"?
    alt Роль является "user"
        Check-->>Admin: 403 Forbidden (Ошибка удаления сообщения)
    else Роль является "admin"
        Check->>Server: next() (Пропуск к контроллеру удаления)
        Server-->>Admin: 200 OK + Удаление через Socket.io
    end
