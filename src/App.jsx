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

  // --- NOUVEAUX ETATS pour Starter Packs ---
  const [starterPacks, setStarterPacks] = useState([]); // Liste des images/packs
  const [currentPackIndex, setCurrentPackIndex] = useState(0); // Index de l'image affichée

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
         console.log('>>> Starter pack data fetched:', data); // Log ajouté
         if (!Array.isArray(data)) {
             console.error("ERREUR: Starter pack data n'est pas un tableau!", data); // Log erreur
             throw new Error('Starter pack data is not an array');
         }
         setStarterPacks(data);
         console.log('>>> setStarterPacks a été appelé.'); // Log ajouté
      })
      .catch(error => console.error(">>> Erreur DANS CATCH starter packs:", error)); // Log erreur
  }, []);


  // --- Logique Restaurée : Effet pour changer la source audio ---
  useEffect(() => {
    if (playlist.length > 0 && audioRef.current) {
      if (currentTrackIndex < 0 || currentTrackIndex >= playlist.length) {
          console.warn("Index de piste invalide:", currentTrackIndex);
          return;
      }
      const currentTrack = playlist[currentTrackIndex];
      console.log('>>> useEffect[trackIndex] - Nouveau currentTrack:', currentTrack);
      if (currentTrack && typeof currentTrack.audioSrc === 'string') {
        // Construit l'URL absolue pour une comparaison fiable
        const newSrcAbsolute = new URL(currentTrack.audioSrc, window.location.href).href;
        const currentSrcAbsolute = audioRef.current.src ? new URL(audioRef.current.src, window.location.href).href : null;

        // Change seulement si la source est différente
        if (newSrcAbsolute !== currentSrcAbsolute) {
           console.log('>>> Changement de source audio vers:', newSrcAbsolute);
           audioRef.current.src = currentTrack.audioSrc; // Chemin relatif est ok ici
           audioRef.current.load(); // Important pour charger la nouvelle source

           // Si on doit jouer directement après le changement
           if (isPlaying) {
             // Laisse l'autre useEffect (celui sur [isPlaying]) gérer le play()
             // pour éviter les conditions de course ou double appel.
             // Ou on peut tenter un play ici, mais l'autre effet est plus propre.
              let playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => console.error("Play error on src change direct:", e));
              }
           }
        }
      } else {
        console.error('>>> useEffect[trackIndex] - audioSrc invalide pour la piste:', currentTrack);
      }
    }
  }, [currentTrackIndex, playlist]); // Déclenché si l'index ou la playlist change


  // --- Logique Restaurée : Effet pour gérer play/pause ---
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
      audioRef.current.pause();
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
        setDuration(audioRef.current.duration);
     }
  };
  const handleTrackEnd = () => {
    console.log("Track ended, playing next.");
    playNext();
  };


  // ----- Fonctions de contrôle Audio (Restaurées) -----
  const togglePlayPause = () => {
    if (playlist.length === 0 || !audioRef.current) return;
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    // Optionnel: forcer la lecture même si en pause ? Généralement non.
    // setIsPlaying(true); // A décommenter si on veut *toujours* jouer au suivant
    console.log("playNext called, new index:", nextIndex);
  };

  const playPrevious = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIndex);
    // Optionnel: forcer la lecture même si en pause ? Généralement non.
    // setIsPlaying(true); // A décommenter si on veut *toujours* jouer au précédent
    console.log("playPrevious called, new index:", prevIndex);
  };

  const handleProgressChange = (event) => {
    if (!audioRef.current || isNaN(duration) || duration === 0) return; // Vérifie duration
    const newTime = Number(event.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime); // Met à jour l'UI immédiatement
  };

  // ----- Formatage du temps (Restauré)-----
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) { return '0:00'; }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `<span class="math-inline">\{minutes\}\:</span>{seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ----- Gestion vue et sélection (Restaurée)-----
  const handleSelectTrack = (index) => {
     if (index < 0 || index >= playlist.length) return; // Sécurité

     if (index !== currentTrackIndex) {
         setCurrentTrackIndex(index);
         setIsPlaying(true); // Lance la lecture du nouveau morceau
     } else {
         // Si on clique sur le morceau déjà en cours, on bascule play/pause
         togglePlayPause();
     }
     setViewMode('player'); // Rebascule vers la vue lecteur après sélection
   };

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

  const currentTrack = playlist[currentTrackIndex]; // Peut être undefined si playlist vide
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const currentStarterPack = starterPacks[currentPackIndex]; // Peut être undefined

  // Logs de rendu (gardés pour débogage si besoin)
  console.log('>>> RENDERING - viewMode:', viewMode);
  console.log('>>> RENDERING - playlist state (contenu):', playlist);
  console.log('>>> RENDERING - currentTrackIndex:', currentTrackIndex);
  console.log('>>> RENDERING - currentTrack object:', currentTrack);


  return (
    <div className="app-wrapper">

      {/* Contenu Principal qui change selon la vue */}
      <div className="main-content">

        {/* --- Vue Lecteur (JSX Restauré) --- */}
        {viewMode === 'player' && (
          <div className="player-container">
            {currentTrack ? (
              <>
                <div className="cover-art">
                  <img
                    key={currentTrack.id || currentTrackIndex} // Change key on track change
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
              // Fallback si pas de piste (playlist vide ou index invalide)
              <div className="track-info">
                <h2>{playlist.length > 0 ? "Erreur piste" : "Playlist vide"}</h2>
                <p>Chargez une playlist valide.</p>
              </div>
            )}

            {/* Zone des contrôles du lecteur (Restaurée) */}
            <div className="player-controls-area">
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleTrackEnd}
                preload="metadata" // Précharge les métadonnées
                // Ne pas mettre src ici, géré par useEffect
              />
              <div className="progress-bar">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0" max={duration || 0} value={currentTime}
                  onChange={handleProgressChange}
                  disabled={!currentTrack || !duration || isNaN(duration)} // Désactive si pas de piste ou durée invalide
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

        {/* --- Vue Liste (Mapping Restauré) --- */}
        {viewMode === 'playlist' && (
          <div className="playlist-view-container">
            <h2 className="playlist-title">Liste de lecture</h2>
            <div className="playlist-list">
              {playlist.length > 0 ? (
                playlist.map((track, index) => (
                  <div
                    key={track.id?.toString() || index} // Clé plus robuste
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
                      onError={(e) => e.target.src = '/default-cover.png'}
                      loading="lazy"
                    />
                    <div className="playlist-item-info">
                      <span className="playlist-item-title">{track.title}</span>
                      <span className="playlist-item-artist">{track.artist}</span>
                    </div>
                    {/* Indicateur visuel si le morceau est en cours */}
                    {index === currentTrackIndex && (
                      isPlaying ? (
                         <svg className="playing-indicator" viewBox="0 0 24 24"><path fill="var(--spotify-green)" d="M