# Manual utilizator final - Optimizer 

## 1. Scopul aplicatiei

Optimizer  este o aplicatie pentru administrarea membrilor, serviciilor, anunturilor, platilor, notificarilor si rapoartelor unei organizatii. Aplicatia este impartita pe module, iar accesul la fiecare functie depinde de drepturile primite de utilizatorul autentificat.

Manualul descrie functiile disponibile in interfata `erp-ui` si fluxurile sustinute de API-ul `erp-laravel`.

## 2. Autentificare si sesiune

### Login

Utilizatorul se autentifica din pagina de login cu e-mail/utilizator si parola. Organizatia este detectata din configuratia aplicatiei si este trimisa catre API la autentificare.

Dupa autentificare:

- se deschide consola ERP;
- meniul afiseaza doar modulele pentru care utilizatorul are drepturi;
- tokenul de acces este folosit automat la fiecare cerere API.

### Logout

Butonul de logout inchide sesiunea curenta si sterge tokenul local. Daca tokenul expira sau API-ul raspunde cu `401`, aplicatia sterge tokenul si cere autentificare din nou.

### Schimbare parola

Din meniul utilizatorului, pagina `Security` permite schimbarea parolei. Utilizatorul completeaza parola curenta, parola noua si confirmarea. Regulile exacte de complexitate sunt validate de server; daca parola nu respecta politica, mesajul de eroare vine din API.

## 3. Navigare generala

Meniul principal contine modulele operationale:

- Dashboard
- Organizatii / locatii
- Filiale / grupuri de locatii
- Administratori
- Grupuri si drepturi
- Campuri custom
- Utilizatori / membri
- Servicii
- Anunturi / articole
- Campanii
- SMS si notificari
- Plati si facturare
- Rapoarte

La finalul meniului principal exista randurile de profil pentru utilizatorul autentificat si, daca exista, pentru copiii asociati. Aceste randuri sunt inchise implicit si pot fi extinse pentru acces la:

- informatii cont;
- securitate;
- confidentialitate / GDPR;
- anunturile mele;
- serviciile mele.

## 4. Dashboard

Dashboard-ul este pagina principala dupa autentificare.

Utilizatorul poate vedea anunturile publicate pentru el direct pe dashboard. Daca are drepturi de dashboard sau rapoarte, vede si indicatorii operationali:

- numarul de membri activi;
- servicii expirate, suspendate sau care necesita verificare;
- venitul total;
- locatii active;
- grafic venituri pe perioada;
- distributia statusurilor membrilor;
- activitate recenta;
- starea automatizarilor, cum ar fi notificari de expirare servicii.

Dashboard-ul afiseaza calendarul saptamanii pentru toti utilizatorii autentificati. Utilizatorul poate naviga intre saptamani si poate apasa pe un eveniment pentru a vedea detalii precum ora, locatia, categoria, statusul, locurile disponibile, descrierea si eventualele conditii de serviciu activ sau plata.

Dashboard-ul permite marcarea anunturilor ca citite. Butoanele `Refresh` reincarca datele din API pentru grafice, calendar sau feed.

## 5. Organizatii, locatii si filiale

### Organizatii / locatii

Modulul de locatii permite administrarea punctelor, sediilor sau organizatiilor operationale din cadrul tenantului curent.

Functii:

- listare locatii;
- cautare si filtrare;
- creare locatie;
- editare locatie;
- stergere locatie;
- asociere utilizatori la locatie;
- asociere locatie la un grup de locatii.

O locatie poate avea nume, descriere si grup de locatie.

### Filiale / grupuri de locatii

Grupurile de locatii organizeaza mai multe locatii sub o structura comuna.

Functii:

- listare grupuri;
- creare grup;
- editare grup;
- stergere grup;
- vizualizarea locatiilor incluse.

## 6. Administratori

Modulul Administratori gestioneaza utilizatorii cu rol administrativ sau operational.

Functii:

- listare administratori;
- cautare;
- creare administrator;
- editare date administrator;
- activare/dezactivare cont;
- asociere grupuri de drepturi;
- asociere locatii;
- administrare campuri custom;
- vizualizare activitate, daca utilizatorul are drept de vizualizare.

Administratorii primesc acces la module prin grupuri si drepturi.

## 7. Grupuri si drepturi

Modulul `Grupuri si drepturi` controleaza accesul la aplicatie.

### Grupuri

Un grup reuneste unul sau mai multe drepturi. Utilizatorii atasati la grup primesc drepturile grupului.

Functii:

- listare grupuri;
- creare grup;
- editare nume, eticheta si descriere;
- atasare drepturi;
- stergere grup.

### Drepturi

Drepturile definesc accesul la functii precum vizualizare, creare, editare, export sau administrare.

Functii:

- listare drepturi;
- creare drept;
- editare drept;
- stergere drept.

Exemple de drepturi:

- `users.view`, `users.manage`
- `user-documents.view`, `user-documents.upload`, `user-documents.delete`
- `services.view`, `services.manage`
- `payments.view`, `payments.manage`
- `reports.view`, `reports.export`
- `gdpr.export`, `gdpr.process`

## 8. Campuri custom

Campurile custom permit organizatiei sa adauge informatii suplimentare pe entitati precum utilizatori.

Functii:

- listare campuri;
- creare camp custom;
- editare camp;
- stergere camp;
- definire tip camp;
- definire optiuni pentru campurile cu selectie;
- setare camp obligatoriu;
- salvarea valorilor custom pe profilul unui utilizator.

Tipuri suportate in interfata/API:

- text;
- textarea;
- number;
- date;
- datetime;
- email;
- phone;
- select;
- multi-select;
- checkbox / boolean;
- file, daca backend-ul permite tipul pentru entitatea respectiva.

## 9. Utilizatori / membri

Modulul Utilizatori gestioneaza clientii si membrii organizatiei.

### Lista membri

Utilizatorul poate:

- vedea lista de membri;
- cauta dupa nume, e-mail sau cod;
- controla numarul de rezultate pe pagina;
- vedea tutorele sub numele membrului, daca membrul are un tutore asociat;
- vedea statusul contului;
- vedea serviciile asociate;
- vedea locatiile asociate;
- deschide formularul de editare;
- sterge sau anonimiza un utilizator, in functie de regulile GDPR ale serverului.

### Date utilizator

In formularul de membru se pot administra:

- prenume;
- nume;
- e-mail;
- telefon;
- cod utilizator;
- status activ/inactiv;
- grupuri;
- locatii;
- consimtamant notificari SMS si e-mail;
- campuri custom.

### Cod utilizator

Tabul de cod permite:

- introducerea manuala a codului;
- ascunderea/afisarea codului;
- scanarea codului prin tastatura sau cititor compatibil.

### Serviciile unui membru

Tabul de servicii permite:

- adaugarea unui serviciu la membru;
- setarea datei de start;
- vizualizarea datei de expirare;
- vizualizarea statusului assignment-ului;
- vizualizarea numarului de accesari folosite;
- vizualizarea motivului de suspendare;
- vizualizarea platilor asociate serviciului;
- adaugarea unei plati pentru serviciu;
- activarea unui serviciu gratuit;
- suspendarea unui serviciu;
- reluarea unui serviciu suspendat;
- consumarea unui acces pentru servicii cu limita de acces;
- stergerea assignment-ului din profil.

### Grade

Modulul Grade permite organizatiei sa defineasca niveluri precum Centura Alba, Albastra sau Neagra.

Utilizatorii cu dreptul `grades.manage` pot:

- crea, edita, activa/dezactiva si sterge logic grade;
- acorda un grad unui user cu data obtinerii si descriere;
- modifica sau sterge o obtinere din istoricul userului;
- selecta un grad si lista userii al caror grad activ este acel grad.

Istoricul este pastrat. Gradul activ este ultima obtinere in ordine cronologica; daca doua obtineri au aceeasi data, este activa cea adaugata ultima. Datele viitoare nu sunt acceptate.

Lista userilor este paginata si filtrata pe server. Stergerea logica a unui grad nu elimina obtinerile deja inregistrate.

Statusuri posibile:

- `pending`
- `active`
- `reserved`
- `expired`
- `suspended`
- `consumed`

### Documentele unui membru

Tabul Documente apare in profilul membrului pentru operatorii cu drepturi dedicate.

Functii:

- incarcare document in storage privat;
- setare categorie, titlu, descriere, data de expirare si filiala;
- descarcare securizata prin URL temporar semnat;
- inlocuire document, cu pastrarea legaturii la versiunea veche;
- stergere document;
- audit pentru upload, download, inlocuire si stergere.

Categorii disponibile:

- cerere de inscriere;
- act de identitate;
- acord GDPR;
- adeverinta;
- contract;
- fotografie;
- alte documente.

Fisierele acceptate sunt PDF, JPG, PNG, DOC si DOCX, cu limita de 10 MB. Serverul valideaza extensia si MIME-ul si poate rula scanare antivirus daca este configurat.

### Activitate utilizator

Tabul de activitate afiseaza actiuni de business si audit, cum ar fi:

- user creat sau actualizat;
- serviciu atribuit;
- serviciu activat;
- plata inregistrata;
- SMS trimis;
- alte modificari relevante.

Activitatea poate fi filtrata dupa tip si interval de timp.

### GDPR administrativ pentru utilizator

Daca operatorul are drepturile necesare, in formularul unui membru apare tabul GDPR.

Functii:

- vizualizare date personale;
- vizualizare istoric consimtaminte;
- rectificare nume, telefon sau e-mail;
- inregistrare consimtamant sau retragere consimtamant;
- creare export de date personale;
- verificare status export;
- descarcare export cand este disponibil;
- creare cerere de stergere;
- procesare cerere de stergere, daca operatorul are drept `gdpr.process`.

## 10. Servicii

Modulul Servicii administreaza tipurile de servicii disponibile.

### Lista servicii

Utilizatorul poate:

- lista servicii;
- cauta servicii;
- filtra active/inactive;
- vedea nume, descriere, tip, pret, durata, regula de expirare si status;
- vedea membrii atasati unui serviciu;
- crea, edita, sterge sau restaura servicii, in functie de drepturi.

### Creare si editare serviciu

Campuri disponibile:

- nume;
- descriere;
- tip serviciu: membership sau access pass;
- pret;
- moneda;
- durata in zile;
- regula de expirare;
- data fixa de expirare, daca regula este fixed date;
- perioada de gratie;
- numar maxim de accesari;
- numar maxim de utilizatori;
- status activ/inactiv.

Reguli importante:

- serviciile gratuite pot fi activate fara plata;
- serviciile platite raman in asteptare pana la o plata confirmata;
- activarea este facuta de backend si seteaza automat datele lifecycle.

## 11. Anunturi / articole

Modulul Articole/Anunturi gestioneaza comunicarile publicate in feed.

### Lista articole

Utilizatorul poate:

- lista articole;
- vedea statusul;
- vedea perioada de publicare;
- vedea prioritatea;
- deschide detalii;
- crea articol;
- edita articol;
- sterge articol, in functie de drepturi.

### Creare si editare articol

Campuri disponibile:

- titlu;
- descriere;
- status: draft, scheduled, published, expired;
- segment audienta;
- segment dinamic salvat;
- prioritate;
- data publicare;
- data expirare;
- grupuri tinta;
- locatii tinta.

Audiente posibile:

- toti utilizatorii;
- abonati activi;
- utilizatori expirati;
- grupuri;
- locatii;
- segment dinamic salvat.

### Feed si confirmare vizualizare

Backend-ul poate livra feed personalizat pentru utilizator si poate marca articolul ca vizualizat. Vizibilitatea depinde de status, perioada, organizatie, grupuri, locatii, servicii si segment.

## 12. Campanii

Modulul Campanii gestioneaza campanii e-mail sau SMS.

### Lista campanii

Utilizatorul poate:

- lista campanii;
- vedea canalul: mail sau SMS;
- vedea statusul;
- vedea data programarii;
- edita campanii draft;
- face preview destinatari;
- vedea statistici;
- anula campanii programate.

### Creare si editare campanie

Campuri disponibile:

- nume;
- canal: mail sau SMS;
- subiect;
- continut;
- segment tinta.

Doar campaniile cu status `draft` pot fi editate.

### Preview destinatari

Preview-ul arata:

- numarul total de destinatari eligibili;
- pana la 100 de destinatari din publicul curent.

Publicul se calculeaza dinamic pe baza segmentului ales.

### Programare si anulare

O campanie poate fi programata prin setarea campului `scheduled_at`. Campaniile programate sunt procesate automat de jobul backend. Daca o campanie nu mai trebuie trimisa, ea poate fi anulata cat timp statusul permite acest lucru.

### Statistici

Statisticile includ:

- total livrari;
- pending;
- sent;
- failed;
- skipped, de obicei pentru destinatari fara consimtamant valid.

## 13. SMS si notificari

Modulul SMS afiseaza istoricul mesajelor SMS.

Functii:

- listare SMS-uri;
- filtrare dupa utilizator;
- filtrare dupa serviciu;
- filtrare dupa status;
- filtrare dupa perioada;
- cautare;
- vizualizare mesaj, destinatar si status.

Sistemul de notificari poate trimite mesaje prin:

- SMS;
- e-mail;

Utilizatorii pot avea preferinte si consimtaminte pe canal. Daca un consimtamant este retras, livrarea poate fi marcata ca `skipped`.

## 14. Plati si facturare

Modulul Plati gestioneaza tranzactiile si chitantelor.

### Lista plati

Utilizatorul poate:

- lista plati;
- vedea status;
- vedea metoda de plata;
- vedea providerul si referinta externa;
- vedea numarul chitantei;
- vedea modelul atasat;
- vedea suma;
- vedea datele de plata, confirmare sau eroare;
- descarca chitanta, daca plata este confirmata;
- naviga catre modelul asociat, daca exista ruta UI.

### Creare plata

O plata poate fi asociata cu:

- assignment de serviciu (`service_user`);
- model operational asociat, daca este disponibil in sistem.

Campuri uzuale:

- prenume;
- nume;
- suma;
- metoda: cash, card sau transfer bancar;
- data platii;
- referinta model.

Reguli importante:

- platile cash sunt confirmate imediat;
- cardul si transferul pot incepe ca initiate/pending si sunt confirmate prin callback;
- o plata confirmata pentru serviciu poate activa serviciul asociat;
- chitanta este disponibila doar pentru plati confirmate cu numar de chitanta.

## 15. Rapoarte si segmente

Modulul Rapoarte ofera analiza financiara si administrarea segmentelor dinamice.

### Raport financiar

Filtre disponibile:

- data de la;
- data pana la;
- grupare pe zi sau luna;
- status plata;
- tip plata;
- tip serviciu;
- locatie;
- administrator;
- segment.

Indicatori afisati:

- total confirmat;
- total rambursat;
- net;
- numar tranzactii;
- reinnoiri;
- facturat;
- platit;
- restant;
- reconciliere bancara;
- venit pe perioada.

### Export rapoarte

Utilizatorii cu drept de export pot:

- crea export CSV;
- crea export XLSX;
- verifica status export;
- descarca fisierul cand statusul este complet.

### Segmente dinamice

Segmentele definesc grupuri de membri pe criterii.

Criterii disponibile in UI:

- activ/inactiv;
- expirat;
- expira in N zile;
- locatie;
- tip serviciu.

Functii:

- creare segment;
- editare segment;
- stergere segment;
- folosire segment ca filtru in raport;
- preview membri din segment.

Segmentele sunt reutilizate pentru rapoarte, articole si campanii.

## 16. Profilul meu

### Informatii cont

Pagina afiseaza:

- nume;
- e-mail;
- telefon;
- grupuri;
- locatii;
- campuri custom.

### Serviciile mele

Pagina arata serviciile utilizatorului autentificat:

- nume;
- pret;
- durata;
- data start;
- data expirare;
- accesari folosite;
- data reluare;
- status;
- motiv status, daca exista.

### Anunturile mele

Pagina arata anunturile vizibile pentru utilizatorul autentificat. Utilizatorul poate:

- vedea titlul si continutul anuntului;
- vedea data publicarii si data expirarii, daca exista;
- vedea prioritatea;
- vedea daca anuntul este citit sau necitit;
- marca anuntul ca citit.

### Confidentialitate / GDPR

Utilizatorul isi poate gestiona drepturile personale:

- vizualizare date personale;
- rectificare date personale;
- inregistrare consimtamant sau retragere consimtamant;
- creare export date personale;
- verificare status export;
- descarcare export;
- creare cerere de stergere.

## 17. Drepturi si acces

Daca un modul sau buton lipseste, cel mai probabil utilizatorul nu are dreptul necesar.

Regula generala:

- drepturile `*.view` permit vizualizarea;
- drepturile `*.manage` permit administrarea;
- unele functii au drepturi dedicate, cum ar fi `reports.export` sau `gdpr.process`.
- daca un utilizator nu are niciun drept explicit in grupuri, primeste implicit doar acces la profilul propriu (`profile.view`); modulele operationale raman ascunse.

Exemple:

- pentru membri: `users.view`, `users.manage`;
- pentru documentele membrilor: `user-documents.view`, `user-documents.upload`, `user-documents.delete`;
- pentru servicii: `services.view`, `services.manage`;
- pentru articole: `articles.view`, `articles.manage`;
- pentru plati: `payments.view`, `payments.manage`;
- pentru rapoarte: `reports.view`, `reports.export`;
- pentru segmente: `segments.view`, `segments.manage`;
- pentru GDPR: `gdpr.export`, `gdpr.process`.

## 18. Mesaje, erori si stari

Aplicatia afiseaza mesaje pentru:

- incarcare date;
- salvare reusita;
- erori de validare;
- lipsa drepturi;
- lipsa rezultate;
- eroare API;
- status export;
- confirmari pentru stergere sau anulare.

Pentru erorile de validare, mesajele serverului sunt prioritare. Exemple:

- parola nu respecta politica;
- camp obligatoriu lipsa;
- plata nu este confirmata;
- campanie non-draft nu poate fi editata;
- acces interzis.

## 19. Procese automate

Unele actiuni sunt procesate automat de backend:

- publicarea articolelor programate;
- expirarea articolelor vechi;
- notificari de lifecycle serviciu;
- SMS-uri de expirare serviciu;
- trimiterea campaniilor programate;
- exporturi financiare;
- exporturi GDPR;
- activarea serviciilor dupa confirmarea platilor.

Utilizatorul vede rezultatul in UI prin statusuri, refresh sau descarcarea fisierelor generate.

## 20. Recomandari de utilizare

- Verificati drepturile utilizatorului daca un modul nu apare in meniu.
- Folositi `Refresh` dupa operatii asincrone, cum ar fi exporturile.
- Pentru campanii, folositi `Preview` inainte de programare.
- Pentru servicii platite, verificati ca plata este confirmata si legata de assignment-ul corect.
- Pentru cereri GDPR, folositi exportul inainte de stergere daca utilizatorul solicita o copie a datelor.
- Pentru segmente, testati cu `Preview membri` inainte de folosirea lor in rapoarte sau campanii.
