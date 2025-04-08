// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // On importera les styles juste après

function App() {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Référence à l'élément audio HTML
  const audioRef = useRef(null);

  // Charger la playlist au démarrage
  useEffect(() => {
    fetch('/playlist.json') // Chemin relatif à la racine public
      .then(response => response.json())
      .then(data => setPlaylist(data))
      .catch(error => console.error("Erreur chargement playlist:", error));
  }, []); // Tableau vide = exécuter une seule fois au montage

  // Effet pour gérer la source audio quand l'index change
  useEffect(() => {
    if (playlist.length > 0 && audioRef.current) {
      const currentTrack = playlist[currentTrackIndex];
      audioRef.current.src = currentTrack.audioSrc;
      // Charger l'audio mais ne pas jouer automatiquement au changement de piste
      // (sauf si on était déjà en lecture)
      if (isPlaying) {
        // Petit délai pour s'assurer que le fichier est prêt
        setTimeout(() => {
          audioRef.current.play().catch(e => console.error("Play error:", e));
        }, 150);
      }
    }
  }, [currentTrackIndex, playlist]); // Ré-exécuter si l'index ou la playlist change

  // Effet pour gérer play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]); // Ré-exécuter si isPlaying change

  // ----- Gestionnaires d'événements de l'élément <audio> -----

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleTrackEnd = () => {
    // Passe automatiquement à la piste suivante à la fin
    playNext();
  };

  // ----- Fonctions de contrôle -----

  const togglePlayPause = () => {
    if (playlist.length === 0) return; // Ne rien faire si playlist vide
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length; // Boucle à la fin
    setCurrentTrackIndex(nextIndex);
    // Assurer la lecture si on clique sur suivant alors que c'était en pause
     if (!isPlaying) {
       setIsPlaying(true);
    }
  };

  const playPrevious = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length; // Boucle au début
    setCurrentTrackIndex(prevIndex);
     // Assurer la lecture si on clique sur précédent alors que c'était en pause
     if (!isPlaying) {
       setIsPlaying(true);
     }
  };

  const handleProgressChange = (event) => {
    const newTime = Number(event.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // ----- Formatage du temps -----
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `<span class="math-inline">\{minutes\}\:</span>{seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ----- Rendu du composant -----

  const currentTrack = playlist[currentTrackIndex];

  if (playlist.length === 0) {
    return <div>Chargement de la playlist...</div>;
  }

  return (
    <div className="player-container">
      <div className="cover-art">
        <img
          src={currentTrack?.coverSrc || '/default-cover.png'} // Image par défaut si pas de jaquette
          alt={`Jaquette de ${currentTrack?.title}`}
          onError={(e) => e.target.src = '/default-cover.png'} // Fallback si image non trouvée
        />
      </div>

      <div className="track-info">
        <h2>{currentTrack?.title || "Aucune Piste"}</h2>
        <p>{currentTrack?.artist || "Artiste Inconnu"}</p>
      </div>

      {/* Élément audio caché mais contrôlé par notre UI */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
        // Ne pas afficher les contrôles par défaut
      />

      <div className="progress-bar">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          disabled={!currentTrack} // Désactiver si pas de piste chargée
        />
        <span>{formatTime(duration)}</span>
      </div>

      <div className="controls">
        <button onClick={playPrevious} disabled={playlist.length < 2}> {/* Désactiver si < 2 pistes */}
          ⏮️ {/* Précédent */}
        </button>
        <button onClick={togglePlayPause} className="play-pause-btn" disabled={!currentTrack}>
          {isPlaying ? '⏸️' : '▶️'} {/* Pause / Lecture */}
        </button>
        <button onClick={playNext} disabled={playlist.length < 2}> {/* Désactiver si < 2 pistes */}
          ⏭️ {/* Suivant */}
        </button>
      </div>
    </div>
  );
}

export default App;