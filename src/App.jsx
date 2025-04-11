// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // États existants
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [viewMode, setViewMode] = useState('player'); // 'player', 'playlist', ou 'starterPack'

  // --- NOUVEAUX ETATS pour Starter Packs ---
  const [starterPacks, setStarterPacks] = useState([]); // Liste des images/packs
  const [currentPackIndex, setCurrentPackIndex] = useState(0); // Index de l'image affichée

  const audioRef = useRef(null);

  // Effet pour charger la playlist
  useEffect(() => {
    fetch('/playlist.json')
      .then(response => {
          // Vérifie si la réponse réseau est OK (status 200-299)
          if (!response.ok) {
            // Si non OK, rejette la promesse pour aller dans le .catch()
            return Promise.reject(`HTTP error! status: ${response.status}`);
          }
          // Si OK, essaie de parser le JSON
          return response.json();
      })
      .then(data => {
         // LOG 1: Affiche les données brutes reçues après le parsing JSON
         console.log('>>> Playlist data fetched:', data);

         // Vérifie si les données sont bien un tableau
         if (!Array.isArray(data)) {
            // LOG 2 (Erreur): Affiche si ce n'est pas un tableau
            console.error("ERREUR: Playlist data n'est pas un tableau!", data);
            // Stoppe l'exécution ici en lançant une erreur pour aller dans le .catch()
            throw new Error('Playlist data is not an array');
         }

         // Si c'est bien un tableau, mets à jour l'état
         setPlaylist(data);

         // LOG 3: Confirme que la mise à jour de l'état a été appelée
         console.log('>>> setPlaylist a été appelé.');
      })
      .catch(error => {
          // LOG 4 (Erreur): Affiche toute erreur survenue durant le fetch, le .json() ou la vérification Array.isArray
          console.error(">>> Erreur DANS CATCH playlist:", error);
      });
  }, []); // Tableau vide signifie exécuter une seule fois au montage


  // --- NOUVEL EFFET pour charger les Starter Packs ---
  useEffect(() => {
    fetch('/starterPacks.json')
      .then(response => response.ok ? response.json() : Promise.reject('Failed to load starter packs'))
      .then(data => {
         if (!Array.isArray(data)) { throw new Error('Starter pack data is not an array'); }
         setStarterPacks(data);
      })
      .catch(error => console.error("Erreur chargement starter packs:", error));
  }, []);


  // ... (useEffect pour changer la source audio reste pareil) ...
  useEffect(() => { /* ... */ }, [currentTrackIndex, playlist]);

  // ... (useEffect pour gérer play/pause reste pareil) ...
  useEffect(() => { /* ... */ }, [isPlaying]);


  // ----- Gestionnaires d'événements de l'élément <audio> -----
  const handleTimeUpdate = () => { /* ... */ };
  const handleLoadedMetadata = () => { /* ... */ };
  const handleTrackEnd = () => { playNext(); };


  // ----- Fonctions de contrôle Audio -----
  const togglePlayPause = () => { /* ... */ };
  const playNext = () => { /* ... */ };
  const playPrevious = () => { /* ... */ };
  const handleProgressChange = (event) => { /* ... */ };
  const formatTime = (timeInSeconds) => { /* ... */ };
  const handleSelectTrack = (index) => { /* ... */ };


  // --- NOUVELLES FONCTIONS pour Starter Packs ---
  const nextStarterPack = () => {
    if (starterPacks.length === 0) return;
    setCurrentPackIndex(prevIndex => (prevIndex + 1) % starterPacks.length);
  };

  const prevStarterPack = () => {
     if (starterPacks.length === 0) return;
    setCurrentPackIndex(prevIndex => (prevIndex - 1 + starterPacks.length) % starterPacks.length);
  };


  // ----- Rendu du composant -----

  const currentTrack = playlist[currentTrackIndex];
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const currentStarterPack = starterPacks[currentPackIndex]; // Récupère le pack actuel
  console.log('>>> RENDERING - viewMode:', viewMode);
  console.log('>>> RENDERING - playlist state (contenu):', playlist); // Affiche le contenu réel
  console.log('>>> RENDERING - currentTrackIndex:', currentTrackIndex);
  console.log('>>> RENDERING - currentTrack object:', currentTrack); // currentTrack est défini plus haut

// --- FIN LOGS AJOUTES ---

  return (
    <div className="app-wrapper">

      {/* Contenu Principal qui change selon la vue */}
      <div className="main-content">

        {/* --- Vue Lecteur --- */}
        {viewMode === 'player' && (
          <div className="player-container">
             {/* ... contenu du lecteur ... */}
             {currentTrack ? ( <>{/* ... cover, info, controls ... */} </> ) : ( <div>Aucune piste...</div>)}
             <div className="player-controls-area"> {/* ... audio, progress, controls ... */} </div>
          </div>
        )}

        {/* --- Vue Liste --- */}
        {viewMode === 'playlist' && (
          <div className="playlist-view-container">
             <h2 className="playlist-title">Liste de lecture</h2>
             <div className="playlist-list">
                {/* ... mapping de la playlist ... */}
             </div>
          </div>
        )}

        {/* --- NOUVELLE VUE Starter Packs --- */}
        {viewMode === 'starterPack' && (
          <div className="starter-pack-view-container">
            <h2 className="starter-pack-title">Starter Packs</h2>
            {starterPacks.length > 0 && currentStarterPack ? (
              <div className="starter-pack-carousel">
                <button
                    onClick={prevStarterPack}
                    className="starter-pack-nav prev"
                    aria-label="Précédent Pack"
                    disabled={starterPacks.length < 2} // Désactiver si < 2 packs
                 >
                   &#10094; {/* Chevron gauche */}
                </button>

                <div className="starter-pack-image-frame"> {/* Le cadre autour de l'image */}
                   <img
                     // Utilise une clé qui change pour forcer le rechargement/transition (optionnel)
                     key={currentStarterPack.id || currentPackIndex}
                     src={currentStarterPack.imageSrc}
                     alt={currentStarterPack.title || `Starter Pack ${currentPackIndex + 1}`}
                     className="starter-pack-image"
                     onError={(e) => e.target.style.display='none'} // Masquer si erreur image
                   />
                   {/* Tu pourrais ajouter le titre ici si tu veux */}
                   {/* <p className="starter-pack-image-title">{currentStarterPack.title}</p> */}
                </div>

                <button
                    onClick={nextStarterPack}
                    className="starter-pack-nav next"
                    aria-label="Suivant Pack"
                    disabled={starterPacks.length < 2} // Désactiver si < 2 packs
                 >
                    &#10095; {/* Chevron droit */}
                 </button>
              </div>
            ) : (
              <p>Chargement des starter packs...</p>
            )}
             {/* Indicateur de position (optionnel) */}
             <div className="starter-pack-dots">
                {starterPacks.map((pack, index) => (
                    <span
                        key={pack.id || index}
                        className={`dot ${index === currentPackIndex ? 'active' : ''}`}
                        onClick={() => setCurrentPackIndex(index)} // Permet de cliquer sur les points
                    ></span>
                ))}
             </div>
          </div>
        )}

      </div> {/* Fin main-content */}


      {/* Barre de Navigation Fixe en Bas (Modifiée) */}
      <nav className="bottom-nav">
         {/* NOUVEAU BOUTON STARTER PACKS (tout à gauche) */}
         <button
           className={`nav-button ${viewMode === 'starterPack' ? 'active' : ''}`}
           onClick={() => setViewMode('starterPack')}
           aria-label="Afficher les Starter Packs"
         >
           {/* Icône exemple (à remplacer par une meilleure si tu as) */}
           <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 11.01L3 11v2h18zM3 16h18v2H3zM21 6H3v2.01L21 8z"></path></svg>
           <span>Starter Packs</span>
         </button>

         {/* Bouton Lecteur */}
         <button
           className={`nav-button ${viewMode === 'player' ? 'active' : ''}`}
           onClick={() => setViewMode('player')}
           aria-label="Afficher le lecteur"
         >
           <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path></svg>
           <span>Lecteur</span>
         </button>

         {/* Bouton Playlist */}
         <button
           className={`nav-button ${viewMode === 'playlist' ? 'active' : ''}`}
           onClick={() => setViewMode('playlist')}
           aria-label="Afficher la liste de lecture"
         >
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zm0-8h14V7H7z"></path></svg>
           <span>Playlist</span>
         </button>
      </nav>

    </div> // Fin app-wrapper
  );
}

export default App;