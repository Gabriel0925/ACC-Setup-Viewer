// Configuration du service worker
navigator.serviceWorker.register("/sw.js").then(enregistrement => { // service worker enregistré
    // on écoute si un nouveau service est dispo
    enregistrement.addEventListener("updatefound", () => {
        let sw = enregistrement.installing
        // on écoute si un new service worker est installé
        sw.addEventListener("statechange", () => {
            if (sw.state == "installed" && navigator.serviceWorker.controller) { // si le sw est installé et qu'il y a deja un sw actif alors un nouveau sw est dispo
                logoDynamique("Mise à jour auto...")
            }
        })
    })
}).catch(error => {
    console.log(error)
})