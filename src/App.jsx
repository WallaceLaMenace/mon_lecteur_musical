// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Vérifie que cette ligne est bien active

function App() {
  // États existants
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [viewMode, setViewMode] = useState('player'); // 'player', 'playlist', ou 'starterPack'
  const [starterPacks, setStarterPacks] = useState([]); // Liste des images/packs
  const [currentPackIndex, setCurrentPackIndex] = useState(0); // Index de l'image affichée
  const [isShuffle, setIsShuffle] = useState(false); // false = désactivé, true = activé

  const audioRef = useRef(null);

  // Effet pour charger la playlist
  useEffect(() => {
    fetch('/playlist.json')
      .then(response => {
          if (!response.ok) { return Promise.reject(`HTTP error! status: ${response.status}`); }
          return response.json();
      })
      .then(data => {
         console.log('>>> Playlist data fetched:', data);
         if (!Array.isArray(data)) {
            console.error("ERREUR: Playlist data n'est pas un tableau!", data);
            throw new Error('Playlist data is not an array');
         }
         setPlaylist(data);
         console.log('>>> setPlaylist a été appelé.');
      })
      .catch(error => {
          console.error(">>> Erreur DANS CATCH playlist:", error);
      });
  }, []);

  // --- NOUVEL EFFET pour charger les Starter Packs ---
  useEffect(() => {
    fetch('/starterPacks.json')
      .then(response => response.ok ? response.json() : Promise.reject('Failed to load starter packs'))
      .then(data => {
         console.log('>>> Starter pack data fetched:', data);
         if (!Array.isArray(data)) {
             console.error("ERREUR: Starter pack data n'est pas un tableau!", data);
             throw new Error('Starter pack data is not an array');
         }
         setStarterPacks(data);
         console.log('>>> setStarterPacks a été appelé.');
      })
      .catch(error => console.error(">>> Erreur DANS CATCH starter packs:", error));
  }, []);


  // --- Effet pour changer la source audio ---
  useEffect(() => {
    // Vérifie si la playlist a des éléments, si la ref audio existe
    // et si l'index est valide
    if (playlist.length > 0 && audioRef.current && currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
      const currentTrack = playlist[currentTrackIndex];
      console.log('>>> useEffect[trackIndex] - Nouveau currentTrack:', currentTrack);

      // Vérifie si la piste et sa source audio sont valides
      if (currentTrack && typeof currentTrack.audioSrc === 'string') {
        const newSrcAbsolute = new URL(currentTrack.audioSrc, window.location.href).href;
        const currentSrcAbsolute = audioRef.current.src ? new URL(audioRef.current.src, window.location.href).href : null;

        // Change la source seulement si elle est réellement différente
        if (newSrcAbsolute !== currentSrcAbsolute) {
           console.log('>>> Changement de source audio vers:', newSrcAbsolute);
           audioRef.current.src = currentTrack.audioSrc;
           audioRef.current.load(); // Important pour charger la nouvelle source

           // Si on doit jouer directement après le changement (état isPlaying est vrai)
           // On laisse l'autre useEffect gérer le play pour plus de propreté,
           // mais on pourrait aussi le forcer ici si besoin.
           // if (isPlaying) { audioRef.current.play().catch(e => console.error("Play error:", e)); }
        }
      } else {
        console.error('>>> useEffect[trackIndex] - audioSrc invalide pour la piste:', currentTrack);
         // Optionnel: mettre en pause si la source est invalide?
         // setIsPlaying(false);
         // audioRef.current.src = ''; // Vider la source?
      }
    } else if (playlist.length > 0) {
        // Cas où l'index est invalide mais la playlist existe
        console.warn("Index de piste invalide:", currentTrackIndex);
        // Optionnel: revenir au premier morceau ou arrêter?
        // setCurrentTrackIndex(0);
        // setIsPlaying(false);
        // audioRef.current.src = '';
    }
  }, [currentTrackIndex, playlist]); // Déclenché si l'index ou la playlist change


  // --- Effet pour gérer play/pause ---
  useEffect(() => {
    if (!audioRef.current) return; // Ne rien faire si la ref audio n'est pas prête

    if (isPlaying) {
      // Essaye de jouer si l'état est 'playing'
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Play error on isPlaying change:", error);
          // Si l'erreur est due à une interaction utilisateur manquante,
          // on remet isPlaying à false pour que l'UI soit cohérente.
          if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
            setIsPlaying(false);
          }
        });
      }
    } else {
      // Met en pause si l'état est 'paused'
      // Vérifier si audioRef.current existe toujours (paranoïa)
      if (audioRef.current) {
          audioRef.current.pause();
      }
    }
  }, [isPlaying]); // Déclenché seulement si isPlaying change


  // ----- Gestionnaires d'événements de l'élément <audio> -----
  const handleTimeUpdate = () => {
    if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
    }
  };
  const handleLoadedMetadata = () => {
     if (audioRef.current) {
        // Vérifier si la durée est un nombre valide avant de la définir
        const newDuration = audioRef.current.duration;
        if (!isNaN(newDuration) && isFinite(newDuration)) {
            setDuration(newDuration);
        } else {
            console.warn("Durée invalide reçue:", newDuration);
            setDuration(0); // Mettre une valeur par défaut
        }
     }
  };
  const handleTrackEnd = () => {
    console.log("Track ended, playing next.");
    playNext();
  };


  // ----- Fonctions de contrôle Audio -----
  const togglePlayPause = () => {
    if (playlist.length === 0 || !audioRef.current) return;
    setIsPlaying(prevIsPlaying => !prevIsPlaying); // Utilisation de la fonction de mise à jour
  };

    // --- Fonction MODIFIÉE : playNext ---
    const playNext = () => {
      if (playlist.length === 0) return;
  
      if (isShuffle) {
        // Mode Aléatoire activé
        if (playlist.length <= 1) return; // Rien à faire s'il n'y a qu'un morceau ou moins
  
        let randomIndex;
        // Boucle pour s'assurer qu'on ne rejoue pas le même morceau directement
        do {
          randomIndex = Math.floor(Math.random() * playlist.length);
        } while (randomIndex === currentTrackIndex);
        console.log("playNext (Shuffle) called, new index:", randomIndex);
        setCurrentTrackIndex(randomIndex);
  
      } else {
        // Mode Séquentiel (comme avant)
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        console.log("playNext (Sequential) called, new index:", nextIndex);
        setCurrentTrackIndex(nextIndex);
      }
      // Optionnel: remettre isPlaying à true si on veut forcer la lecture ?
      // if (!isPlaying) setIsPlaying(true);
    };
  
    // --- Fonction MODIFIÉE : playPrevious ---
    // Pour la simplicité, on fait aussi un aléatoire différent pour "précédent" en mode shuffle
    // Une vraie gestion d'historique serait plus complexe.
    const playPrevious = () => {
      if (playlist.length === 0) return;
  
       if (isShuffle) {
          // Mode Aléatoire activé
          if (playlist.length <= 1) return;
          let randomIndex;
          do {
              randomIndex = Math.floor(Math.random() * playlist.length);
          } while (randomIndex === currentTrackIndex);
          console.log("playPrevious (Shuffle) called, new index:", randomIndex);
          setCurrentTrackIndex(randomIndex);
  
       } else {
          // Mode Séquentiel (comme avant)
          const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
          console.log("playPrevious (Sequential) called, new index:", prevIndex);
          setCurrentTrackIndex(prevIndex);
       }
       // Optionnel: remettre isPlaying à true si on veut forcer la lecture ?
       // if (!isPlaying) setIsPlaying(true);
    };

  const handleProgressChange = (event) => {
    if (!audioRef.current || isNaN(duration) || duration === 0) return;
    const newTime = Number(event.target.value);
    // Vérifier que newTime est dans les bornes valides
    if (newTime >= 0 && newTime <= duration) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime); // Met à jour l'UI immédiatement
    }
  };

  // ----- Formatage du temps (CORRIGÉ)-----
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) { return '0:00'; }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    // Retourne la chaîne MM:SS
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ----- Gestion vue et sélection -----
  const handleSelectTrack = (index) => {
     if (index < 0 || index >= playlist.length) return; // Sécurité

     if (index !== currentTrackIndex) {
         setCurrentTrackIndex(index);
         // Force la lecture SEULEMENT si on change de piste
         // Si on reclique sur la même piste, on laisse togglePlayPause gérer
         setIsPlaying(true);
     } else {
         togglePlayPause();
     }
     // Optionnel: Revenir à la vue lecteur systématiquement ?
     // Si on veut pouvoir rester sur la liste après avoir cliqué : commenter la ligne suivante
     setViewMode('player');
   };

     // --- NOUVELLE Fonction pour basculer le mode Shuffle ---
  const toggleShuffle = () => {
    setIsShuffle(prevIsShuffle => !prevIsShuffle);
    console.log("Shuffle mode toggled to:", !isShuffle);
  };

  // --- Fonctions pour Starter Packs ---
  const nextStarterPack = () => {
    if (starterPacks.length === 0) return;
    setCurrentPackIndex(prevIndex => (prevIndex + 1) % starterPacks.length);
  };

  const prevStarterPack = () => {
     if (starterPacks.length === 0) return;
    setCurrentPackIndex(prevIndex => (prevIndex - 1 + starterPacks.length) % starterPacks.length);
  };


  // ----- Rendu du composant -----

  // Définir currentTrack et currentStarterPack de manière plus sûre
  const currentTrack = (playlist && playlist.length > currentTrackIndex && currentTrackIndex >= 0) ? playlist[currentTrackIndex] : null;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const currentStarterPack = (starterPacks && starterPacks.length > currentPackIndex && currentPackIndex >= 0) ? starterPacks[currentPackIndex] : null;

  // Logs de rendu (gardés pour débogage si besoin)
  console.log('>>> RENDERING - viewMode:', viewMode);
  console.log('>>> RENDERING - playlist state (taille):', playlist?.length); // Utilise optional chaining
  console.log('>>> RENDERING - currentTrackIndex:', currentTrackIndex);
  console.log('>>> RENDERING - currentTrack object:', currentTrack);


  return (
    <div className="app-wrapper">

      {/* Contenu Principal qui change selon la vue */}
      <div className="main-content">

        {/* --- Vue Lecteur (JSX Restauré et Vérifié) --- */}
        {viewMode === 'player' && (
          <div className="player-container">
            {currentTrack ? (
              <>
                <div className="cover-art">
                  <img
                    key={currentTrack.id || currentTrackIndex} // Clé qui change force re-rendu img si besoin
                    src={currentTrack.coverSrc || '/default-cover.png'}
                    alt={`Jaquette de ${currentTrack.title}`}
                    onError={(e) => { e.target.onerror = null; e.target.src='/default-cover.png'; }} // Prévention boucle erreur
                  />
                </div>
                <div className="track-info">
                  <h2>{currentTrack.title || "Titre inconnu"}</h2>
                  <p>{currentTrack.artist || "Artiste inconnu"}</p>
                </div>
              </>
            ) : (
              // Fallback si pas de piste (playlist vide ou index invalide au rendu initial)
              <div className="track-info">
                <h2>{playlist && playlist.length > 0 ? "Erreur Piste" : "Playlist Vide"}</h2>
                <p>{playlist && playlist.length > 0 ? `Index: ${currentTrackIndex}` : "Chargez une playlist valide."}</p>
              </div>
            )}

            {/* Zone des contrôles du lecteur (Restaurée) */}
            <div className="player-controls-area">
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleTrackEnd}
                preload="metadata"
              />
              <div className="progress-bar">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0" max={duration || 0} value={currentTime}
                  onChange={handleProgressChange}
                  disabled={!currentTrack || !duration || isNaN(duration)}
                  style={{ '--progress-percent': `${progressPercent}%` }}
                  aria-label="Barre de progression"
                />
                <span>{formatTime(duration)}</span>
              </div>
              <div className="controls">
                  <button
                        onClick={toggleShuffle}
                        className={`shuffle-button ${isShuffle ? 'active' : ''}`} // Classe conditionnelle
                        aria-label="Aléatoire"
                        aria-pressed={isShuffle} // Pour l'accessibilité
                        disabled={playlist.length < 2} // Désactiver si < 2 pistes
                    >
                        {/* Icône Shuffle SVG */}
                        <svg viewBox="0 0 24 24" width="22" height="22"> {/* Ajuste la taille si besoin */}
                            <path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"></path>
                        </svg>
                    </button>
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

        {/* --- Vue Liste (Mapping Restauré et Vérifié) --- */}
        {viewMode === 'playlist' && (
          <div className="playlist-view-container">
            <h2 className="playlist-title">Liste de lecture</h2>
            <div className="playlist-list">
              {playlist && playlist.length > 0 ? ( // Ajout vérif playlist existe
                playlist.map((track, index) => (
                  <div
                    key={track.id?.toString() || index} // Utilise ID si dispo, sinon index
                    className={`playlist-item ${index === currentTrackIndex ? 'playing' : ''}`}
                    onClick={() => handleSelectTrack(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectTrack(index)}
                  >
                    <img
                      src={track.coverSrc || '/default-cover.png'}
                      alt=""
                      className="playlist-item-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src='/default-cover.png'; }}
                      loading="lazy"
                    />
                    <div className="playlist-item-info">
                      <span className="playlist-item-title">{track.title || "Titre inconnu"}</span>
                      <span className="playlist-item-artist">{track.artist || "Artiste inconnu"}</span>
                    </div>
                    {/* Indicateur visuel */}
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

        {/* --- Vue Starter Packs --- */}
        {viewMode === 'starterPack' && (
          <div className="starter-pack-view-container">
            <h2 className="starter-pack-title">Starter Packs</h2>
            {starterPacks.length > 0 && currentStarterPack ? (
              <div className="starter-pack-carousel">
                 <button onClick={prevStarterPack} className="starter-pack-nav prev" aria-label="Précédent Pack" disabled={starterPacks.length < 2}>&#10094;</button>
                 <div className="starter-pack-image-frame">
                    <img
                      key={currentStarterPack.id || currentPackIndex}
                      src={currentStarterPack.imageSrc}
                      alt={currentStarterPack.title || `Starter Pack ${currentPackIndex + 1}`}
                      className="starter-pack-image"
                      onError={(e) => { e.target.onerror = null; e.target.style.display='none'; }} // Masquer si erreur
                    />
                 </div>
                 <button onClick={nextStarterPack} className="starter-pack-nav next" aria-label="Suivant Pack" disabled={starterPacks.length < 2}>&#10095;</button>
              </div>
            ) : (
              <p>Chargement des starter packs...</p>
            )}
            <div className="starter-pack-dots">
                {starterPacks.map((pack, index) => (
                    <span key={pack.id || index} className={`dot ${index === currentPackIndex ? 'active' : ''}`} onClick={() => setCurrentPackIndex(index)}></span>
                ))}
             </div>
          </div> // Fin starter-pack-view-container
        )}

      </div> {/* Fin main-content */}


      {/* Barre de Navigation Fixe en Bas */}
      <nav className="bottom-nav">
         <button className={`nav-button ${viewMode === 'starterPack' ? 'active' : ''}`} onClick={() => setViewMode('starterPack')} aria-label="Afficher les Starter Packs">
           <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 11.01L3 11v2h18zM3 16h18v2H3zM21 6H3v2.01L21 8z"></path></svg>
           <span>Starter Packs</span>
         </button>
         <button className={`nav-button ${viewMode === 'player' ? 'active' : ''}`} onClick={() => setViewMode('player')} aria-label="Afficher le lecteur">
           <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path></svg>
           <span>Lecteur</span>
         </button>
         <button className={`nav-button ${viewMode === 'playlist' ? 'active' : ''}`} onClick={() => setViewMode('playlist')} aria-label="Afficher la liste de lecture">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zm0-8h14V7H7z"></path></svg>
           <span>Playlist</span>
         </button>
      </nav>

    </div> // Fin app-wrapper
  );
}

export default App;