const VERSION_CACHE = "V0.0.0"
// tous les fichiers qu'on glisse dans le cache pour le mode hors ligne
const fileInCache = [
    "./",
    
    "index.html", "manifest.json", "script.js", "style.css", "sw.js",

    "assets/icon-192.png", "assets/icon-512.png", "assets/icon-navigateur.png",  "assets/configuration-sw.js",
]

// script que le navigateur fait tourner en arrière plan, séparement de ma page web

// self désigne le service worker
self.addEventListener("install", (event) => { // pr forcer la maj du sw
    self.skipWaiting()
    // console.log(`${VERSION_CACHE} Install`)

    // on met dans le cache les fichiers
    event.waitUntil((async () => { // waitUntil attend une promesse
        const cache = await caches.open(VERSION_CACHE) // on ouvre le cache
        cache.addAll(fileInCache)
    })()) // on appelle direct la fonction async pour avoir la promesse
})

// le nouveau sw prend le controle
self.addEventListener("activate", (event) => {
    clients.claim() // pour que le nouveau sw prenne le controle de la page web

    // on supprime les anciens caches quand ya une nouvelle version du sw qui prend le controle
    event.waitUntil((async () => {
        const keys = await caches.keys()
        //console.log("All : ", keys)
        // on parcours chaque clé du cache et on suppr les anciens caches qui sont inutiles
        await Promise.all( // on attend que toutes les clés soit supprimée pour continuer
            keys.map((key) => {
                //console.log("Nom de la clé : ", key)
                if (key != VERSION_CACHE) {
                    // console.log("Clé suppr : ", key)
                    return caches.delete(key)
                }
                //console.log(keys)
            })
        )
    })())
    // console.log(`${VERSION_CACHE} Activate`)
})

self.addEventListener("fetch", (event) => {
    // console.log(`Fetching : ${event.request.url}, Mode : ${event.request.mode}`)

    // lorsque qu'une page demande un file dans le cache
    event.respondWith((async () => { // respondWith attend une promesse
        try { // quand on est en ligne, on essaye de recup le fichier sur internet
            //console.log("EN-LIGNE")
            const preloadResponse = await event.preloadResponse
            if (preloadResponse) {return preloadResponse}

            return await fetch(event.request) // await pour attendre que la promesse renvoie le fichier et si il y a une erreur ça ira dans le catch

        } catch(e) { // quand on est hors ligne, on recup le fichier dans le cache
            //console.log("HORS-LIGNE")
            const cache = await caches.open(VERSION_CACHE) // on ouvre le cache
            const responseCache = await cache.match(event.request, {ignoreSearch: true})
            if (responseCache) {return responseCache}

            // si il n'y a rien dans le cache ce qui peut être lié à un oublie d'incrémentation ou de remplissage du tableau fileIinCache alors
            // on revoie vers la page d'accueil de ACC qui elle sera tjrs accessible (le nom du fichier ne changera pas dans le temps)
            if (event.request.mode == "navigate") {
                return await cache.match("/index.html", {ignoreSearch: true})
            }
        }

    })()) // on appelle direct la fonction async pour avoir la promesse
})
