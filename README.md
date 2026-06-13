# 📊 Dashboard d'Avaluació Interactiu – Entorns de la Natura

Aquest projecte consisteix en un **Dashboard interactiu en HTML, CSS i JavaScript** dissenyat per visualitzar de forma dinàmica i en temps real el rendiment, les notes i el procés d'auto/coavaluació dels alumnes de 4t d'ESO a la matèria d'Entorns de la Natura. 

El sistema està completament automatitzat: utilitza **Google Apps Script (GAS)** com a base de dades (Backend API) i s'allotja de manera gratuïta a **GitHub Pages** (Frontend).

---

## 🚀 Característiques Principals

*   **Connexió en Temps Real:** Qualsevol nota modificada o afegida als Google Sheets es reflecteix al dashboard de forma immediata en refrescar la pàgina.
*   **Radiografia Dinàmica de Columnes:** El dashboard no té columnes fixes; llegeix la primera fila de qualsevol full i separa automàticament les dades de l'alumne de les columnes de notes numèriques.
*   **Filtres Creuats d'Aula:** Permet filtrar instantàniament les gràfiques i les dades per **Grup-Classe** (4t A, B, C...) i per **Rol Cooperatiu** (Coordinador/a, Científic/a, Cartògraf/a, Informàtic/a).
*   **Alertes Visuals de Rendiment:** La taula de dades detalla tot l'alumnat del filtre seleccionat i destaca automàticament en **color vermell** les notes inferiors a 5 per facilitar la detecció de necessitats de suport o coavaluació.
*   **Gràfics Interactius:** Utilitza la llibreria *Chart.js* per dibuixar distribucions de barres netes i adaptades a la mida de la pantalla (ordinador o mòbil).

---

## 📂 Estructura dels Arxius a GitHub

El repositori està organitzat seguint els estàndards de desenvolupament web net:

```text
entorns-natura-dashboard/
├── index.html     # L'esquelet del dashboard (selectors, gràfic i taula)
├── styles.css     # El disseny visual i maquetació professional (Card-Layout)
├── app.js         # El cervell: connexió amb l'API de Google, filtres i gràfics
└── README.md      # Documentació del projecte (aquest fitxer)
---

## 👥 Professors
Oriol Rovira Bertran 
Oriol Torrents Cabestany