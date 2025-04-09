// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Assure-toi que cette ligne est bien décommentée !

function App() {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [viewMode, setViewMode] = useState('player'); // 'player' ou 'playlist'

  const audioRef = useRef(null);

  // Effet pour charger la playlist
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

  // Effet pour changer la source audio quand l'index change
  useEffect(() => {
    if (playlist.length > 0 && audioRef.current) {
      if (currentTrackIndex < 0 || currentTrackIndex >= playlist.length) { return; } // Sécurité
      const currentTrack = playlist[currentTrackIndex];
      console.log('Attempting to set audio src:', currentTrack?.audioSrc);
      if (currentTrack && typeof currentTrack.audioSrc === 'string') {
        const audioSrcChanged = audioRef.current.src !== new URL(currentTrack.audioSrc, window.location.href).href;

        // Si la source change, on la met à jour
        if (audioSrcChanged) {
             audioRef.current.src = currentTrack.audioSrc;
             audioRef.current.load(); // Charger explicitement la nouvelle source
             console.log("Audio source set to:", currentTrack.audioSrc);

             // Si on DOIT jouer après le changement de source
             if (isPlaying) {
                 // Essayer de jouer après un petit délai OU via événement 'canplay'
                 let playPromise = audioRef.current.play();
                 if (playPromise !== undefined) {
                    playPromise.catch(error => {
                       console.error("Play error on src change:", error);
                       // Essayer à nouveau si l'interaction utilisateur est requise
                       // ou gérer l'erreur comme il convient
                    });
                 }
             }
        } else if (isPlaying && audioRef.current.paused) {
            // Si la source est la même mais qu'on doit jouer et que c'est en pause
            // (cas où on re-sélectionne le même morceau pour le jouer)
             let playPromise = audioRef.current.play();
             if (playPromise !== undefined) {
                 playPromise.catch(error => console.error("Play error on same src:", error));
             }
        }

      } else {
        console.error('Invalid or missing audioSrc for track:', currentTrack);
      }
    }
  }, [currentTrackIndex, playlist]); // Déclenché seulement si l'index ou la playlist change

  // Effet séparé pour gérer play/pause basé sur l'état isPlaying
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
        // Essayer de jouer
        let playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Play error on isPlaying change:", error);
                // Si l'erreur est due à l'interaction, remettre isPlaying à false
                if (error.name === 'NotAllowedError') {
                    setIsPlaying(false);
                }
            });
        }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]); // Déclenché seulement si isPlaying change


  // ----- Gestionnaires d'événements de l'élément <audio> -----
  const handleTimeUpdate = () => { setCurrentTime(audioRef.current.currentTime); };
  const handleLoadedMetadata = () => { setDuration(audioRef.current.duration); };
  const handleTrackEnd = () => { playNext(); };


  // ----- Fonctions de contrôle -----
  const togglePlayPause = () => { if (playlist.length === 0) return; setIsPlaying(!isPlaying); };

  // Fonctions Précédent/Suivant simplifiées
  const playNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    // La lecture sera gérée par les useEffect
    console.log("playNext called, new index:", nextIndex);
  };

  const playPrevious = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIndex);
     // La lecture sera gérée par les useEffect
    console.log("playPrevious called, new index:", prevIndex);
  };

  const handleProgressChange = (event) => {
    if(!audioRef.current || !duration) return; // Sécurité
    const newTime = Number(event.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // ----- Formatage du temps -----
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) { return '0:00'; }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ----- Gestion vue et sélection -----
  const handleSelectTrack = (index) => {
     if (index !== currentTrackIndex) {
         setCurrentTrackIndex(index);
         setIsPlaying(true); // Lance la lecture du nouveau morceau
     } else {
         // Si on clique sur le morceau déjà en cours, on bascule play/pause
         togglePlayPause();
     }
     setViewMode('player'); // Rebascule vers la vue lecteur après sélection
   };

  // ----- Rendu du composant -----

  const currentTrack = playlist[currentTrackIndex];
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Affichage chargement initial
   if (playlist.length === 0) {
     // On pourrait vouloir afficher la nav même pendant le chargement
     // return <div>Chargement de la playlist...</div>;
     // Pour l'instant, on laisse passer pour afficher la structure vide et la nav
   }


  return (
    <div className="app-wrapper"> {/* Conteneur global */}

      {/* Contenu Principal qui change selon la vue */}
      <div className="main-content">

        {/* Affichage conditionnel : Lecteur */}
        {viewMode === 'player' && (
          <div className="player-container"> {/* Conteneur pour la vue Lecteur */}
            {currentTrack ? (
                <>
                <div className="cover-art">
                    <img
                    src={currentTrack.coverSrc || '/default-cover.png'}
                    alt={`Jaquette de ${currentTrack.title}`}
                    onError={(e) => e.target.src = '/default-cover.png'}
                    />
                </div>
                <div className="track-info">
                    <h2>{currentTrack.title}</h2>
                    <p>{currentTrack.artist}</p>
                </div>
                </>
            ) : (
                // Affichage si playlist vide ou pas encore chargée
                <div className="track-info">
                    <h2>Aucune piste chargée</h2>
                    <p>Vérifiez la playlist.</p>
                </div>
            )}

            {/* Zone des contrôles du lecteur (uniquement visible en mode Player) */}
            <div className="player-controls-area">
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleTrackEnd}
                // Préchargement des métadonnées pour avoir la durée plus vite
                preload="metadata"
              />
              <div className="progress-bar">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0" max={duration || 0} value={currentTime}
                  onChange={handleProgressChange} disabled={!currentTrack || !duration}
                  style={{ '--progress-percent': `${progressPercent}%` }}
                  aria-label="Barre de progression"
                />
                <span>{formatTime(duration)}</span>
              </div>
              <div className="controls">
                <button onClick={playPrevious} disabled={playlist.length < 2} aria-label="Précédent">
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6 8.5 6V6z"></path></svg>
                </button>
                <button onClick={togglePlayPause} className="play-pause-btn" disabled={!currentTrack} aria-label={isPlaying ? 'Pause' : 'Lecture'}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>
                  )}
                </button>
                <button onClick={playNext} disabled={playlist.length < 2} aria-label="Suivant">
                   <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
                </button>
              </div>
            </div> {/* Fin player-controls-area */}
          </div> // Fin player-container
        )}

        {/* Affichage conditionnel : Liste */}
        {viewMode === 'playlist' && (
          <div className="playlist-view-container"> {/* Conteneur pour la vue Liste */}
            <h2 className="playlist-title">Liste de lecture</h2>
            <div className="playlist-list">
              {playlist.length > 0 ? (
                  playlist.map((track, index) => (
                  <div
                      // Utilisation de track.id ou index comme clé
                      key={track.id?.toString() || index}
                      className={`playlist-item ${index === currentTrackIndex ? 'playing' : ''}`}
                      onClick={() => handleSelectTrack(index)}
                      role="button" // Indique que c'est cliquable
                      tabIndex={0} // Permet la navigation clavier
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectTrack(index)} // Accessibilité clavier
                  >
                      <img
                          src={track.coverSrc || '/default-cover.png'}
                          alt="" // Alt vide car décoratif
                          className="playlist-item-cover"
                          onError={(e) => e.target.src = '/default-cover.png'}
                          loading="lazy" // Chargement différé des images de la liste
                      />
                      <div className="playlist-item-info">
                          <span className="playlist-item-title">{track.title}</span>
                          <span className="playlist-item-artist">{track.artist}</span>
                      </div>
                      {/* Indicateur visuel si le morceau est en cours */}
                      {index === currentTrackIndex && (
                          isPlaying ? (
                             <svg className="playing-indicator" viewBox="0 0 24 24"><path fill="var(--spotify-green)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"></path></svg>
                          ) : (
                             <svg className="playing-indicator paused" viewBox="0 0 24 24"><path fill="var(--spotify-light-gray)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"></path></svg>
                          )
                       )}
                  </div>
                  ))
              ) : (
                  <p className="playlist-empty">La playlist est vide.</p>
              )}
            </div>
          </div> // Fin playlist-view-container
        )}

      </div> {/* Fin main-content */}


      {/* Barre de Navigation Fixe en Bas */}
      <nav className="bottom-nav">
        <button
          className={`nav-button ${viewMode === 'player' ? 'active' : ''}`}
          onClick={() => setViewMode('player')}
          aria-label="Afficher le lecteur"
        >
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path></svg>
          <span>Lecteur</span>
        </button>
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