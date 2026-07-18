let currentSong = new Audio();
let songs = [];
let currFolder = "";

// Helper to format seconds to MM:SS
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Fetch songs from a specific playlist folder using info.json
async function getSongs(folder) {
    currFolder = folder;
    try {
        const response = await fetch(`${folder}/info.json`);
        if (!response.ok) throw new Error("Could not fetch info.json");
        const data = await response.json();
        
        songs = data.songs || [];
        
        // Show all the songs in the playlist UI
        const songUL = document.querySelector(".songList ul");
        songUL.innerHTML = ""; // Clear existing
        
        songs.forEach(song => {
            // Derive title from filename, removing .mp3 and replacing dashes
            const title = song.replace(".mp3", "").replaceAll("%20", " ").replaceAll("-", " ");
            songUL.innerHTML += `<li>
                <img class="invert" width="34" src="img/music.svg" alt="Music Icon">
                <div class="info">
                    <div>${title}</div>
                    <div>Unknown Artist</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="Play">
                </div> 
            </li>`;
        });

        // Attach an event listener to each song item
        Array.from(document.querySelectorAll(".songList li")).forEach((e, index) => {
            e.addEventListener("click", () => {
                playMusic(songs[index]);
            });
        });

        return songs;
    } catch (error) {
        console.error("Error loading songs:", error);
        return [];
    }
}

// Play a specific track
const playMusic = (track, pause = false) => {
    if (!track) return;
    currentSong.src = `${currFolder}/${track}`;
    
    const playBtn = document.getElementById("play");

    if (!pause) {
        currentSong.play().catch(e => console.error("Error playing audio:", e));
        if(playBtn) playBtn.src = "img/pause.svg";
    } else {
        if(playBtn) playBtn.src = "img/play.svg";
    }
    
    // Display track name without extension
    let trackName = decodeURI(track).replace(".mp3", "").replaceAll("-", " ");
    document.querySelector(".songinfo").innerHTML = trackName;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
    
    // Highlight the active song in playlist
    highlightActiveSong(track);
}

// Highlight the currently playing song in the sidebar
function highlightActiveSong(track) {
    const listItems = document.querySelectorAll(".songList li");
    listItems.forEach(li => {
        li.style.backgroundColor = ""; // Reset
    });
    
    const index = songs.indexOf(track);
    if (index !== -1 && listItems[index]) {
        listItems[index].style.backgroundColor = "#2a2a2a";
    }
}

// Display all playlists from playlists.json
async function displayAlbums() {
    try {
        const response = await fetch('songs/playlists.json');
        if (!response.ok) throw new Error("Could not fetch playlists.json");
        const folders = await response.json();
        
        const cardContainer = document.querySelector(".cardContainer");
        cardContainer.innerHTML = ""; // Clear loader if any

        for (const item of folders) {
            try {
                if (typeof item === 'string' || item.type === 'folder') {
                    const folder = typeof item === 'string' ? item : item.folder;
                    let a = await fetch(`songs/${folder}/info.json`);
                    let folderInfo = await a.json(); 
                    
                    cardContainer.innerHTML += `<div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                    stroke-linejoin="round" />
                            </svg>
                        </div>
                        <img src="songs/${folder}/cover.jpg" alt="Cover for ${folderInfo.title}" onerror="this.src='img/music.svg'">
                        <h2>${folderInfo.title}</h2>
                        <p>${folderInfo.description}</p>
                    </div>`;
                } else if (item.type === 'file') {
                    cardContainer.innerHTML += `<div data-file="true" class="card">
                        <div class="play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                    stroke-linejoin="round" />
                            </svg>
                        </div>
                        <img loading="lazy" src="songs/${item.cover}" alt="Cover for ${item.title}" onerror="this.src='img/music.svg'">
                        <h2>${item.title}</h2>
                        <p>${item.description}</p>
                    </div>`;
                }
            } catch (err) {
                console.error("Failed to load item info for", item, err);
            }
        }

        // Load the playlist whenever a card is clicked
        Array.from(document.getElementsByClassName("card")).forEach(e => { 
            e.addEventListener("click", async item => {
                const folder = item.currentTarget.dataset.folder;
                if (folder) {
                    await getSongs(`songs/${folder}`);
                    if (songs.length > 0) {
                        playMusic(songs[0]);
                    } else {
                        // Friendly message if a folder has no songs
                        alert("No songs available yet.");
                    }
                } else {
                    // Friendly message for the new placeholder cards
                    alert("Songs will be added soon.");
                }
            })
        });
    } catch (error) {
        console.error("Failed to display albums:", error);
        document.querySelector(".cardContainer").innerHTML = "<p style='padding:20px; color:red;'>Failed to load playlists.</p>";
    }
}

async function main() {
    // Initial fetch to populate player if playlists exist
    await getSongs("songs/playlist1");
    if (songs.length > 0) {
        playMusic(songs[0], true);
    } else {
        document.querySelector(".songinfo").innerHTML = "No song selected";
    }

    // Display all the albums on the page
    await displayAlbums();

    // DOM Elements
    const playBtn = document.getElementById("play");
    const nextBtn = document.getElementById("next");
    const prevBtn = document.getElementById("previous");
    const seekbar = document.querySelector(".seekbar");
    const volumeInput = document.querySelector(".range input");
    const volumeImg = document.querySelector(".volume img");

    // Attach an event listener to play button
    playBtn.addEventListener("click", () => {
        if (!currentSong.src) return;
        if (currentSong.paused) {
            currentSong.play().catch(e => console.error("Playback failed:", e));
            playBtn.src = "img/pause.svg";
        }
        else {
            currentSong.pause();
            playBtn.src = "img/play.svg";
        }
    });

    // Listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
        }
    });

    // Add an event listener to seekbar
    seekbar.addEventListener("click", e => {
        if (isNaN(currentSong.duration)) return;
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Auto next song
    currentSong.addEventListener("ended", () => {
        let trackName = decodeURIComponent(currentSong.src.split("/").pop());
        let index = songs.indexOf(trackName);
        
        if (index !== -1 && (index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        } else {
            playBtn.src = "img/play.svg";
        }
    });

    // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Add an event listener to previous
    prevBtn.addEventListener("click", () => {
        if (!currentSong.src) return;
        currentSong.pause();
        
        let trackName = decodeURIComponent(currentSong.src.split("/").pop());
        let index = songs.indexOf(trackName);
        
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1]);
        } else if (songs.length > 0) {
            // Loop back to start or stay on first song (stay on first song implemented)
            playMusic(songs[0]);
        }
    });

    // Add an event listener to next
    nextBtn.addEventListener("click", () => {
        if (!currentSong.src) return;
        currentSong.pause();
        
        let trackName = decodeURIComponent(currentSong.src.split("/").pop());
        let index = songs.indexOf(trackName);
        
        if (index !== -1 && (index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // Add an event to volume
    volumeInput.addEventListener("change", (e) => {
        const vol = parseInt(e.target.value) / 100;
        currentSong.volume = vol;
        if (currentSong.volume > 0){
            volumeImg.src = volumeImg.src.replace("mute.svg", "volume.svg");
        } else {
            volumeImg.src = volumeImg.src.replace("volume.svg", "mute.svg");
        }
    });

    // Add event listener to mute the track
    volumeImg.addEventListener("click", e => { 
        if(e.target.src.includes("volume.svg")){
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            volumeInput.value = 0;
        }
        else{
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = 0.10;
            volumeInput.value = 10;
        }
    });
}

// Start application
main(); 
