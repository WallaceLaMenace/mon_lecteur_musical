// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Importer le plugin

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // Ajouter la configuration PWA ici
      registerType: 'autoUpdate', // Met à jour automatiquement le service worker
      devOptions: {
         enabled: true // Active PWA en mode dev pour tester
      },
      manifest: {
        name: 'Mon Lecteur Musical',
        short_name: 'LecteurMP3',
        description: 'Un lecteur musical simple pour vos MP3 locaux',
        theme_color: '#ffffff', // Couleur de la barre d'outils du navigateur
        background_color: '#f0f0f0', // Couleur de fond de l'écran de démarrage
        display: 'standalone', // Mode plein écran sans UI navigateur
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png', // Chemin relatif au dossier public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            // Icône pour iOS (peut être la même que 512)
            src: '/icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'apple-touch-icon'
          },
           {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Bonne pratique pour certaines plateformes Android
          }
        ]
      }
    })
  ],
})