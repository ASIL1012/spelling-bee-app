let availableWords = [];

let timerInterval;
let timeLeft = 60;
let attempted = 0;
let correctScore = 0;
let currentWord = "";
let isGameActive = false;
const synth = window.speechSynthesis;

// -- DOM ELEMENTS --
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

// Setup DOM
const customWordsInput = document.getElementById('custom-words-input');
const triggerScanBtn = document.getElementById('trigger-scan-btn');
const scanUpload = document.getElementById('scan-upload');
const ocrStatus = document.getElementById('ocr-status');

// Game DOM
const elTimer = document.getElementById('timer');
const elAttempted = document.getElementById('attempted');
const elCorrect = document.getElementById('correct');
const teacherWordDisplay = document.getElementById('teacher-word-display');
const feedback = document.getElementById('feedback-message');
const audioAnim = document.getElementById('audio-animation');

// -- SETUP & OCR LOGIC --

// Map the visible scan button to the hidden file input
triggerScanBtn.addEventListener('click', () => {
    scanUpload.click();
});

// Event listener for when a user uploads an image
scanUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading spinner
    ocrStatus.classList.remove('hidden');
    customWordsInput.disabled = true;
    triggerScanBtn.disabled = true;

    try {
        // Run Tesseract OCR on the local image blob
        const result = await Tesseract.recognize(file, 'eng', {
            logger: m => console.log(m) // Optional: logs progress to console
        });

        const text = result.data.text;

        // Extract words ignoring numbers and punctuation
        const wordsArray = text.match(/[a-zA-Z]+/g);

        if (wordsArray && wordsArray.length > 0) {
            // Filter words to only those > 1 character, lowercase
            const parsedWords = wordsArray
                .filter(w => w.length > 1)
                .map(w => w.toLowerCase());

            // Populate text area, user can manually edit afterwards
            customWordsInput.value = parsedWords.join(', ');
        } else {
            alert("No English words detected in the image. Please try another one.");
        }
    } catch (err) {
        console.error("OCR Error:", err);
        alert("There was an error scanning the document. Please ensure it's a valid image.");
    } finally {
        // Re-enable UI
        ocrStatus.classList.add('hidden');
        customWordsInput.disabled = false;
        triggerScanBtn.disabled = false;
        // Reset file input so user can scan same file again if needed
        scanUpload.value = '';
    }
});

// Grade Links
document.getElementById('grade-4-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const grade4Words = ['always', 'animal', 'atoll', 'author', 'bake', 'bank', 'beginning', 'both', 'brave', 'breathe', 'character', 'community', 'compass', 'create', 'damage', 'development', 'direction', 'disease', 'distance', 'dream', 'east', 'edge', 'emotion', 'end', 'fabric', 'family', 'fire', 'force', 'germ', 'glass', 'goal', 'graph', 'growth', 'habitat', 'half', 'healthy', 'heart', 'hexagon', 'honest', 'hygiene', 'identify', 'illustrator', 'ingredient', 'insect', 'job', 'jump', 'kidney', 'kind', 'least', 'lung', 'laugh', 'map', 'metal', 'method', 'milk', 'most', 'movement', 'noun', 'north', 'nutrition', 'often', 'organ', 'paper', 'pattern', 'planet', 'plastic', 'poem', 'product', 'pull', 'push', 'quality', 'quarter', 'reduce', 'recycle', 'respect', 'reuse', 'root', 'safe', 'shape', 'sleep', 'south', 'speak', 'stem', 'story', 'stranger', 'taste', 'think', 'thousand', 'title', 'tongue', 'unique', 'usually', 'verb', 'vertex', 'visit', 'verbal', 'wood', 'wide', 'weather', 'zigzag'];
    customWordsInput.value = grade4Words.join(', ');
});

// -- AUDIO & GAMEPLAY LOGIC --

function speak(text) {
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Attempt to pick a good UK English voice
    const voices = synth.getVoices();
    const goodVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Google')) || voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en'));
    if (goodVoice) utterance.voice = goodVoice;

    utterance.rate = 0.85; // Slightly slower for spelling practice

    utterance.onstart = () => audioAnim.classList.add('playing');
    utterance.onend = () => audioAnim.classList.remove('playing');

    synth.speak(utterance);
}

function nextWord() {
    if (!isGameActive) return;

    // End game if we run out of words to prevent repetition in the same session
    if (availableWords.length === 0) {
        showFeedback("Word list completed!", "success");
        setTimeout(endGame, 1000);
        return;
    }

    currentWord = availableWords.pop();

    teacherWordDisplay.innerText = currentWord;
    feedback.className = 'feedback';
    feedback.innerText = "";

    setTimeout(() => speak(currentWord), 100);
}

function handleCorrect() {
    if (!isGameActive || !currentWord) return;

    attempted++;
    correctScore++;
    elAttempted.innerText = attempted;
    elCorrect.innerText = correctScore;

    showFeedback("Correct! 🎉", "success");
    teacherWordDisplay.style.transform = "scale(1.1)";
    setTimeout(() => teacherWordDisplay.style.transform = "scale(1)", 150);

    setTimeout(nextWord, 300);
}

function handleWrong() {
    if (!isGameActive || !currentWord) return;

    attempted++;
    elAttempted.innerText = attempted;

    showFeedback("Wrong. Moving to next word...", "error");
    teacherWordDisplay.style.animation = "shake 0.4s";
    setTimeout(() => teacherWordDisplay.style.animation = "none", 400);

    setTimeout(nextWord, 400);
}

function handleSkip() {
    if (!isGameActive || !currentWord) return;

    showFeedback("Skipped.", "warning");
    teacherWordDisplay.style.opacity = "0.5";
    setTimeout(() => teacherWordDisplay.style.opacity = "1", 300);

    setTimeout(nextWord, 300);
}

function showFeedback(msg, type) {
    feedback.innerText = msg;
    feedback.className = `feedback show ${type}`;
}

// Timer Logic
function startTimer() {
    timeLeft = 60;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    elTimer.innerText = `${timeLeft}s`;

    if (timeLeft <= 10) {
        elTimer.className = 'value danger';
    } else if (timeLeft <= 20) {
        elTimer.className = 'value warning';
    } else {
        elTimer.className = 'value';
    }
}

// State Management
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startGame() {
    // Determine the Word Bank from the textbox
    const rawInput = customWordsInput.value;
    if (rawInput.trim() !== '') {
        // Extract words
        const parsedWords = rawInput.match(/[a-zA-Z]+/g);
        if (parsedWords && parsedWords.length > 0) {
            // Deduplicate words using a Set
            gameWordBank = [...new Set(parsedWords.map(w => w.toLowerCase()))];
        } else {
            gameWordBank = [...DEFAULT_WORDS];
        }
    } else {
        gameWordBank = [...DEFAULT_WORDS];
    }

    // Shuffle the active words for the session without repeats
    availableWords = [...gameWordBank];
    for (let i = availableWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableWords[i], availableWords[j]] = [availableWords[j], availableWords[i]];
    }

    // Initialize Voice API
    if (synth.getVoices().length === 0) {
        synth.addEventListener('voiceschanged', () => { });
    }

    isGameActive = true;
    attempted = 0;
    correctScore = 0;
    elAttempted.innerText = '0';
    elCorrect.innerText = '0';

    showScreen('game');
    startTimer();
    nextWord();
}

function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    if (synth.speaking) synth.cancel();
    audioAnim.classList.remove('playing');

    document.getElementById('final-attempted').innerText = attempted;
    document.getElementById('final-correct').innerText = correctScore;

    showScreen('end');
}

// -- EVENT BINDINGS --
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('start'); // Send them back to setup screen
});
document.getElementById('repeat-btn').addEventListener('click', () => {
    if (isGameActive && currentWord) speak(currentWord);
});
document.getElementById('skip-btn').addEventListener('click', handleSkip);
document.getElementById('wrong-btn').addEventListener('click', handleWrong);
document.getElementById('correct-btn').addEventListener('click', handleCorrect);

// CSS animation added via JS injection
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    50% { transform: translateX(10px); }
    75% { transform: translateX(-10px); }
}
`;
document.head.appendChild(style);