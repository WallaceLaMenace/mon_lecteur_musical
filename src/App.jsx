// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
// Retire l'import './App.css' d'ici si tu l'as mis (il est dans main.jsx)
// import './App.css'; // Assure-toi qu'il est importé une seule fois, idéalement dans main.jsx ou App.jsx

function App() {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // NOUVEL ETAT pour gérer la vue affichée ('player' ou 'playlist')
  const [viewMode, setViewMode] = useState('player');

  const audioRef = useRef(null);

  // ... (useEffect pour charger la playlist reste pareil) ...
  useEffect(() => {
      fetch('/playlist.json')
        .then(response => {
           if (!response.ok) { throw new Error('Network response was not ok'); }
           return response.json();
        })
        .then(data => {
           console.log('Playlist data fetched:', data);
           if (!Array.isArray(data)) { throw new Error('Playlist data is not an array'); }
           setPlaylist(data);
        })
        .catch(error => console.error("Erreur chargement ou parsing playlist:", error));
    }, []);


  // ... (useEffect pour source audio, useEffect pour play/pause restent pareils) ...
   useEffect(() => {
     if (playlist.length > 0 && audioRef.current) {
        if (currentTrackIndex < 0 || currentTrackIndex >= playlist.length) { return; } // Sécurité
        const currentTrack = playlist[currentTrackIndex];
        console.log('Current track object:', currentTrack);
        console.log('Attempting to set audio src:', currentTrack?.audioSrc);
        if (currentTrack && typeof currentTrack.audioSrc === 'string') {
           audioRef.current.src = currentTrack.audioSrc;
           if (isPlaying) {
             // On essaie de jouer seulement si la source a changé ET qu'on doit jouer
             // Utilisation de loadeddata pour s'assurer que le fichier est prêt
             audioRef.current.onloadeddata = () => {
                audioRef.current.play().catch(e => console.error("Play error:", e));
                // Nettoyer l'event listener pour éviter multiples exécutions
                audioRef.current.onloadeddata = null;
             }
             // Charger explicitement si besoin (certains navigateurs)
             audioRef.current.load();
           }
        } else {
           console.error('Invalid or missing audioSrc for track:', currentTrack);
        }
     }
   }, [currentTrackIndex, playlist]); // Déclenché si l'index ou la playlist change

   useEffect(() => {
     if (!audioRef.current || !audioRef.current.src) return; // Ne rien faire si pas de ref ou source

     if (isPlaying) {
        // Jouer seulement si la source est chargée (ou presque)
        if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA ou plus
            audioRef.current.play().catch(e => console.error("Play error:", e));
        } else {
            // Si pas prêt, on réessaiera quand loadeddata se déclenchera (voir useEffect précédent)
            // ou on peut ajouter un listener ici aussi
             audioRef.current.oncanplay = () => {
                 audioRef.current.play().catch(e => console.error("Play error:", e));
                 audioRef.current.oncanplay = null; // Nettoyer
             }
        }
     } else {
       audioRef.current.pause();
     }
   }, [isPlaying, audioRef.current?.src]); // Déclenché si isPlaying change OU si la source change

  // ... (handleTimeUpdate, handleLoadedMetadata, handleTrackEnd restent pareils) ...
   const handleTimeUpdate = () => { setCurrentTime(audioRef.current.currentTime); };
   const handleLoadedMetadata = () => { setDuration(audioRef.current.duration); };
   const handleTrackEnd = () => { playNext(); };

  // ... (togglePlayPause, playNext, playPrevious, handleProgressChange restent pareils) ...
   const togglePlayPause = () => { if (playlist.length === 0) return; setIsPlaying(!isPlaying); };
   const playNext = () => { /* ... */ };
   const playPrevious = () => { /* ... */ };
   const handleProgressChange = (event) => { /* ... */ };


  // ----- Formatage du temps -----
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) { // Correction : vérifier < 0 aussi
       return '0:00';
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; // Ligne Corrigée
  };

  // ----- NOUVELLES FONCTIONS -----

  // Fonction pour basculer entre les vues
  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'player' ? 'playlist' : 'player');
  };

  // Fonction appelée quand on clique sur un morceau dans la liste
  const handleSelectTrack = (index) => {
    if (index !== currentTrackIndex) {
        setCurrentTrackIndex(index); // Change l'index
        setIsPlaying(true);          // Lance la lecture
    } else {
        // Si on clique sur le morceau déjà en cours, on bascule play/pause
        togglePlayPause();
    }
    setViewMode('player'); // Rebascule vers la vue lecteur après sélection
  };


  // ----- Rendu du composant -----

  const currentTrack = playlist[currentTrackIndex];
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (playlist.length === 0 && viewMode !== 'playlist') { // Modifié pour permettre l'affichage de la liste même si vide
    // Afficher chargement seulement si on n'est pas en train d'essayer de voir la liste
     return <div>Chargement de la playlist...</div>;
   }


  return (
    // On peut englober dans un conteneur général si besoin
    // <div className="app-container">

    <div className="player-container">

      {/* Bouton pour changer de vue */}
      <button onClick={toggleViewMode} className="toggle-view-btn" aria-label={viewMode === 'player' ? "Afficher la liste" : "Afficher le lecteur"}>
         {viewMode === 'player' ? (
             <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zm0-8h14V7H7z"></path></svg> /* Icône Liste */
         ) : (
             <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v-2h-2z"></path></svg> /* Icône Info/Player */
         )}
      </button>


      {/* Affichage conditionnel : Lecteur OU Liste */}
      {viewMode === 'player' ? (
        <>
          {/* --- Vue Lecteur (ce qu'on avait avant) --- */}
          <div className="cover-art">
            <img
              src={currentTrack?.coverSrc || '/default-cover.png'}
              alt={`Jaquette de ${currentTrack?.title}`}
              onError={(e) => e.target.src = '/default-cover.png'}
            />
          </div>
          <div className="track-info">
            <h2>{currentTrack?.title || "Aucune Piste"}</h2>
            <p>{currentTrack?.artist || "Artiste Inconnu"}</p>
          </div>
        </>
      ) : (
        <>
          {/* --- Vue Liste --- */}
          <h2 className="playlist-title">Liste de lecture</h2>
          <div className="playlist-list">
            {playlist.length > 0 ? (
                playlist.map((track, index) => (
                <div
                    key={track.id || index} // Utiliser un ID unique si disponible, sinon l'index
                    className={`playlist-item ${index === currentTrackIndex ? 'playing' : ''}`}
                    onClick={() => handleSelectTrack(index)}
                >
                    <img
                    src={track.coverSrc || '/default-cover.png'}
                    alt="" // Alt vide car décoratif dans ce contexte
                    className="playlist-item-cover"
                    onError={(e) => e.target.src = '/default-cover.png'}
                    />
                    <div className="playlist-item-info">
                    <span className="playlist-item-title">{track.title}</span>
                    <span className="playlist-item-artist">{track.artist}</span>
                    </div>
                    {/* Indicateur visuel si le morceau est en cours */}
                    {index === currentTrackIndex && isPlaying && (
                        <svg className="playing-indicator" viewBox="0 0 24 24"><path fill="var(--spotify-green)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"></path></svg>
                    )}
                     {index === currentTrackIndex && !isPlaying && (
                        <svg className="playing-indicator paused" viewBox="0 0 24 24"><path fill="var(--spotify-light-gray)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"></path></svg>
                    )}
                </div>
                ))
            ) : (
                <p className="playlist-empty">La playlist est vide.</p>
            )}
          </div>
        </>
      )}

      {/* --- Contrôles (toujours visibles en bas) --- */}
      <div className="player-controls-area"> {/* Conteneur pour barre + boutons */}
        <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleTrackEnd}
        />
        <div className="progress-bar">
            <span>{formatTime(currentTime)}</span>
            <input
                type="range"
                min="0" max={duration || 0} value={currentTime}
                onChange={handleProgressChange} disabled={!currentTrack}
                style={{ '--progress-percent': `${progressPercent}%` }}
            />
            <span>{formatTime(duration)}</span>
        </div>
        <div className="controls">
             <button onClick={playPrevious} disabled={playlist.length < 2} aria-label="Précédent">
               <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"></path></svg>
             </button>
             <button onClick={togglePlayPause} className="play-pause-btn" disabled={!currentTrack} aria-label={isPlaying ? 'Pause' : 'Lecture'}>
               {isPlaying ? (
                 <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
               ) : (
                 <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
               )}
             </button>
             <button onClick={playNext} disabled={playlist.length < 2} aria-label="Suivant">
                <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
             </button>
        </div>
      </div>

    </div>
    // </div> // Fin app-container si utilisé
  );
}

export default App;