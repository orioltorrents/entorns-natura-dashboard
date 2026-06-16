# Dashboard d'Avaluacio Interactiu - Entorns de Natura

Dashboard web per visualitzar notes, assoliments i dades d'auto/coavaluacio dels projectes d'Entorns de Natura de 4t d'ESO.

El frontend esta fet amb HTML, CSS i JavaScript pur, i es connecta a Google Sheets mitjancant una API de Google Apps Script.

## Funcionalitats generals

- Carrega la llista de projectes des d'un full mestre de Google Sheets.
- Mostra logos dinamics segons el projecte seleccionat:
  - Projecte Rius
  - No a la MAT
  - LiquenCity
  - Projecte Orenetes
  - Vespa velutina
- Detecta columnes de notes de manera dinamica.
- Filtra per grup-classe, amb seleccio multiple de grups.
- Filtra per rol cooperatiu quan la columna existeix o es pot derivar.
- Ordena les dades representades:
  - ordre original
  - de mes gran a mes petit
  - de mes petit a mes gran
- Grafica notes numeriques sobre 4.
- Grafica assoliments amb lletres:
  - AE
  - AN
  - AS
  - NA
- Mostra el valor de cada barra al grafic.
- Mostra una caixa de recompte per AE, AN, AS i NA quan la columna seleccionada es d'assoliments.
- Mostra una taula detallada amb alumne, grup, rol i nota seleccionada.

## Estructura del projecte

```text
entorns-natura-dashboard/
|-- index.html
|-- styles.css
|-- app.js
|-- Code_recomanat.gs
|-- Code.gs
|-- README.md
`-- assets/
    `-- logos/
        |-- Entorns-de-natura.png
        |-- LiquenCity.png
        |-- No a la MAT.jpg
        |-- Orenetes.png
        |-- ProjecteRius_AssociacioHabitats.jpeg
        `-- Vespa-velutina.png
```

## Fitxers principals

- `index.html`: estructura del dashboard, selectors, grafic, caixa de resum i taula.
- `styles.css`: estils visuals, capcalera, targetes, controls, grafic, taula i resum d'assoliments.
- `app.js`: logica del dashboard, connexio amb Apps Script, filtres, ordenacio, deteccio de columnes i grafics.
- `Code_recomanat.gs`: codi recomanat per copiar a Google Apps Script.
- `Code.gs`: fitxer de treball/comparacio amb versions anteriors. No copiar-lo sencer a Apps Script si conte mes d'una versio.

## Google Apps Script

El fitxer recomanat per al backend es:

```text
Code_recomanat.gs
```

Aquest codi exposa dues accions:

```text
?accio=obtenir_index
?accio=obtenir_notes&url=...&pestanya=...
```

El backend llegeix la pestanya `fitxers` del full mestre i obre els Google Sheets dels projectes per URL, ID o nom de fitxer.

Tambe detecta automaticament quan les capcaleres estan a la segona fila. En aquests casos, si les columnes identificatives estan buides, forca:

```text
Columna D -> grup-classe
Columna F -> cognoms, nom
Columna I -> rol
```

Aixo es important per projectes com Orenetes, LiquenCity i Vespa velutina.

## Configuracio al frontend

La URL de l'Apps Script es defineix a `app.js`:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
```

Quan es desplegui una nova versio del Google Apps Script, cal comprovar que aquesta URL continua apuntant al desplegament correcte.

## Logos

Els logos han d'estar dins:

```text
assets/logos/
```

Els noms actuals que espera el codi son:

```text
Entorns-de-natura.png
ProjecteRius_AssociacioHabitats.jpeg
No a la MAT.jpg
LiquenCity.png
Orenetes.png
Vespa-velutina.png
```

La logica de seleccio de logo esta a `app.js`, a la constant `LOGOS_PROJECTES`.

## Notes numeriques i assoliments

Les notes numeriques es representen sobre una escala de 0 a 4.

Els assoliments es converteixen internament aixi:

```text
AE = 4
AN = 3
AS = 2
NA = 1
```

Aixo permet ordenar i graficar columnes amb lletres. Al grafic es mostren les lletres originals, no els numeros interns.

## Us local

Com que el projecte es HTML, CSS i JavaScript pur, es pot obrir directament `index.html` al navegador.

Si el navegador bloqueja alguna peticio o si es vol simular millor GitHub Pages, es pot servir la carpeta amb un servidor local senzill.

## Professors

Oriol Rovira Bertran
Oriol Torrents Cabestany
