# Manual utilizator final - Evenimente

## Scop

Modulul Evenimente gestioneaza evenimente, recurente, aparitii si participanti. Acest document este separat de manualul general deoarece modulul nu trebuie afisat momentan in manualul principal pentru utilizatorul final.

## Lista evenimente

Utilizatorul poate:

- lista evenimente;
- cauta dupa titlu;
- filtra dupa categorie;
- filtra dupa status;
- filtra dupa recurenta;
- filtra evenimente care cer serviciu activ;
- filtra evenimente platite;
- sorta dupa data creare, data start sau titlu;
- vedea detalii;
- deschide calendarul lunar sau saptamanal;
- edita eveniment;
- vedea aparitiile;
- sterge eveniment.

## Creare si editare eveniment

Campuri disponibile:

- categorie eveniment;
- titlu;
- descriere;
- locatie;
- ora inceput;
- ora sfarsit;
- data start;
- data final;
- tip recurenta: o singura data, saptamanal, lunar;
- zile de recurenta pentru evenimente saptamanale;
- zi lunara pentru evenimente lunare;
- serviciu activ obligatoriu;
- serviciu specific obligatoriu;
- eveniment platit;
- suma si moneda pentru plata;
- numar maxim de participanti;
- status: activ, inactiv sau anulat.

## Categorii evenimente

Utilizatorii cu dreptul `events.manage` pot deschide meniul Categorii evenimente.

Pentru categorii se pot face urmatoarele actiuni:

- listare cu paginare;
- cautare dupa nume sau descriere;
- filtrare dupa status activ/inactiv;
- creare categorie cu nume, culoare, descriere si status;
- editare categorie;
- stergere categorie.

Stergerea unei categorii nu sterge evenimentele existente. Evenimentele asociate raman in sistem fara categorie.

## Calendar evenimente

Calendarul incarca dinamic aparitiile evenimentelor pentru intervalul afisat. In modul lunar, request-ul API este facut strict pentru luna selectata si se repeta cand utilizatorul schimba luna.

Utilizatorul poate:

- comuta intre vedere lunara si vedere saptamanala;
- naviga la luna sau saptamana anterioara/urmatoare;
- reveni rapid la perioada curenta;
- filtra aparitiile dupa categorie;
- filtra aparitiile dupa status;
- deschide participantii unei aparitii direct din calendar.

## Aparitii eveniment

Pentru fiecare eveniment, sistemul genereaza aparitii.

Utilizatorul poate:

- vedea lista aparitiilor;
- vedea statusul aparitiei;
- deschide lista de participanti pentru o aparitie.

## Participanti

Pentru o aparitie, utilizatorul poate:

- lista participantii;
- adauga rapid unul sau mai multi participanti din lista de useri eligibili;
- cauta useri eligibili dupa nume, email, telefon sau cod user;
- actualiza status participant;
- sterge participant;
- inregistra plata participantului, daca evenimentul este platit.

Fluxul Adauga rapid se deschide ca zona de lucru in pagina participantilor pentru aparitia selectata, nu ca popup. Lista afiseaza doar userii care pot fi adaugati la acea aparitie: useri vizibili in organizatia curenta, care nu sunt deja participanti si care indeplinesc conditia de serviciu activ daca evenimentul o cere. Utilizatorul poate selecta mai multi useri, inclusiv toti userii din pagina curenta de rezultate, apoi ii poate salva intr-o singura actiune. Statusul initial propus este `registered`, dar poate fi schimbat inainte de salvare.

Pasi pentru adaugare rapida:

- deschide aparitia evenimentului si intra in pagina de participanti;
- apasa Adauga participant;
- cauta userii dupa nume, email, telefon sau cod user, daca lista initiala este prea mare;
- selecteaza unul sau mai multi useri din lista;
- optional, schimba statusul sau completeaza note comune;
- apasa butonul de adaugare pentru a salva toti userii selectati.

Daca aparitia nu mai are locuri disponibile pentru statusuri active (`registered` sau `attended`), salvarea este blocata. Pentru evenimentele care cer serviciu activ, lista afiseaza doar userii care indeplinesc conditia.

Statusuri participant:

- registered;
- attended;
- cancelled;
- no_show.
