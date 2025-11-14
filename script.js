const intro = document.getElementById("intro");
const levelScreen = document.getElementById("levelScreen");
const cornerNames = document.getElementById("cornerNames");
const quizContainer = document.getElementById("quizContainer");
const startBtn = document.getElementById("startBtn");
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answers");
const nextButton = document.getElementById("next-btn");

// 🧠 NEW: DOM elements for the Timer and Progress Counter
const timerElement = document.getElementById("timer");
const progressElement = document.getElementById("progress-counter");
const progressBar = document.getElementById("progress-bar");

// 🧠 UPDATED: Timer and API configuration
const API_BASE_URL = "https://opentdb.com/api.php?amount=10&type=multiple";

// NEW: Time limits in seconds for each difficulty level
const TIME_LIMITS = {
    'easy': 120,    // 2 minutes
    'medium': 60,   // 1 minute
    'hard': 3000,   // 50 minutes (3000 seconds)
    'expert': 3000  // 50 minutes (3000 seconds)
};

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerId;
let timeLeft;
let currentLevelTime = 60; // Default or initial value

// 🧠 NEW: Array of search terms for dynamic background images
const BACKGROUND_IMAGE_CATEGORIES = [
    'horror,dark,eerie',
    'love,romance,heart',
    'fight,battle,action',
    'abstract,digital,futuristic,8k,wallpaper', // For "8k live wallpapers"
    'nature,landscape,serene',
    'cityscape,neon,urban',
    'space,galaxy,stars',
    'mystery,enigmatic,puzzle',
    'fantasy,magic,adventure'
];

// ----------------------------------------------------
// --- UTILITY FUNCTIONS (API Data Handling) ---
// ----------------------------------------------------

function mapLevelToDifficulty(level) {
    switch (level) {
        case 'easy':
            return 'easy';
        case 'medium':
            return 'medium';
        case 'hard':
            return 'hard';
        case 'expert':
            return 'hard';
        default:
            return 'medium';
    }
}

async function fetchQuestions(level) {
    questionElement.textContent = "Loading questions...";
    resetState();

    const difficulty = mapLevelToDifficulty(level);
    const apiURL = `${API_BASE_URL}&difficulty=${difficulty}`;

    try {
        const response = await fetch(apiURL);
        const data = await response.json();

        if (data.response_code === 0 && data.results.length > 0) {
            return data.results.map(item => {
                const answers = [...item.incorrect_answers, item.correct_answer];
                const shuffledAnswers = shuffleArray(answers);

                const correctIndex = shuffledAnswers.indexOf(item.correct_answer);

                return {
                    question: decodeHtml(item.question),
                    answers: shuffledAnswers.map(ans => decodeHtml(ans)),
                    correct: correctIndex,
                };
            });
        } else {
            console.error("API Error or No Results:", data.response_code);
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch questions:", error);
        return [];
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function decodeHtml(html) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = html;
    return textArea.value;
}


// ----------------------------------------------------
// --- TIMER LOGIC (UPDATED) ---
// ----------------------------------------------------

function startTimer() {
    timeLeft = currentLevelTime; // Use the stored time limit
    timerElement.textContent = formatTime(timeLeft);

    // Update progress bar for the new question starting at 100%
    // We need to stop previous transition, set to 100%, then start new transition
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';
    // Force reflow to apply width instantly before new transition starts
    void progressBar.offsetWidth;
    progressBar.style.transition = `width ${currentLevelTime}s linear`;
    progressBar.style.width = '0%'; // Animate from 100% to 0%

    // Clear any existing timer
    stopTimer();

    timerId = setInterval(() => {
        timeLeft--;
        timerElement.textContent = formatTime(timeLeft);

        if (timeLeft <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerId);
    progressBar.style.transition = 'none'; // Stop the progress bar animation
}

// Utility function to format seconds into M:SS or SS format
function formatTime(seconds) {
    if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
}


function handleTimeout() {
    stopTimer();
    questionElement.textContent = "Time's up!";

    // Immediately disable all buttons
    answerButtons.querySelectorAll(".btn").forEach((btn) => {
        btn.disabled = true;
    });

    // Show the correct answer
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion && answerButtons.children[currentQuestion.correct]) {
        answerButtons.children[currentQuestion.correct].style.background = "#28a745";
    }

    // Prepare to move to the next question
    nextButton.style.display = "block";
}

// 🧠 NEW: Function to fetch a random background image from categories
async function fetchRandomBackgroundImage() {
    const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGE_CATEGORIES.length);
    const category = BACKGROUND_IMAGE_CATEGORIES[randomIndex];
    const imageUrl = `https://source.unsplash.com/random/1920x1080/?${category}`;

    // Create a new Image object to preload the image
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
        document.body.style.backgroundImage = `url('${imageUrl}')`;
    };
    img.onerror = () => {
        console.error('Failed to load background image, falling back.');
        // Fallback to a default image or just background color if API fails
        document.body.style.backgroundImage = 'url("https://source.unsplash.com/random/1920x1080/?quiz")';
    };
}


// ----------------------------------------------------
// --- QUIZ FLOW & UI UPDATES ---
// ----------------------------------------------------

startBtn.addEventListener("click", () => {
    intro.classList.add("hidden");
    levelScreen.classList.remove("hidden");
    cornerNames.classList.remove("hidden");
    fetchRandomBackgroundImage(); // Set initial background for level screen
});

document.querySelectorAll(".level-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const level = btn.dataset.level;

        // NEW: Set the time limit based on the selected level
        currentLevelTime = TIME_LIMITS[level];

        levelScreen.classList.add("hidden");
        cornerNames.classList.add("hidden");
        quizContainer.classList.remove("hidden");

        questions = await fetchQuestions(level);

        if (questions.length > 0) {
            startQuiz();
        } else {
            questionElement.textContent = "Error loading questions. Please check your connection or try again.";
            nextButton.textContent = "Go Back";
            nextButton.style.display = "block";
            nextButton.removeEventListener("click", handleNextButtonClick);
            nextButton.addEventListener("click", goToLevelScreen, { once: true });
        }
    });
});

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    nextButton.textContent = "Next";

    nextButton.removeEventListener("click", goToLevelScreen);
    nextButton.addEventListener("click", handleNextButtonClick);
    showQuestion();
}

function showQuestion() {
    resetState();

    if (currentQuestionIndex >= questions.length) {
        showScore();
        return;
    }

    fetchRandomBackgroundImage(); // 🧠 NEW: Change background image for each new question!
    startTimer(); // Start the timer for the new question

    const currentQuestion = questions[currentQuestionIndex];

    // Update the progress counter
    progressElement.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

    // Update the progress bar for overall quiz progress
    // The progressBar itself is used for the timer, so we'll use a visual indication
    // Let's re-purpose the *width* for the overall quiz progress, but make sure the *timer animation* works on it too.
    // This part is a bit tricky with one progress bar. For simplicity, the *timer* will always animate 100% to 0%.
    // We'll update a different visual cue for overall progress if we had two bars.
    // For now, the progressBar will primarily serve the *timer* for the current question.

    questionElement.textContent = currentQuestion.question;

    currentQuestion.answers.forEach((answer, index) => {
        const button = document.createElement("button");
        button.textContent = answer;
        button.classList.add("btn");
        button.addEventListener("click", () => selectAnswer(index, button));
        answerButtons.appendChild(button);
    });
}

function resetState() {
    stopTimer(); // Stop the timer when resetting
    questionElement.classList.remove('flash-correct', 'flash-incorrect'); // Clear feedback
    nextButton.style.display = "none";
    while (answerButtons.firstChild) {
        answerButtons.removeChild(answerButtons.firstChild);
    }
    timerElement.textContent = formatTime(currentLevelTime); // Display the correct starting time

    // 🧠 NEW: Reset the *timer's* visual progress bar for the next question
    progressBar.style.transition = 'none'; // Clear any ongoing transition
    progressBar.style.width = '100%'; // Reset to full for the new question's timer animation
}

function selectAnswer(index, selectedButton) {
    stopTimer(); // Stop the timer immediately on answer selection

    const currentQuestion = questions[currentQuestionIndex];
    const buttons = answerButtons.querySelectorAll(".btn");

    if (index === currentQuestion.correct) {
        selectedButton.style.background = "#28a745"; // Green
        questionElement.classList.add('flash-correct'); // Add correct feedback
        score++;
    } else {
        selectedButton.style.background = "#dc3545"; // Red
        if (buttons[currentQuestion.correct]) { // Ensure button exists before styling
             buttons[currentQuestion.correct].style.background = "#28a745"; // Show correct answer
        }
        questionElement.classList.add('flash-incorrect'); // Add incorrect feedback
    }

    buttons.forEach((btn) => (btn.disabled = true));
    nextButton.style.display = "block";
}

function handleNextButtonClick() {
    // Remove feedback classes before moving to next question
    questionElement.classList.remove('flash-correct', 'flash-incorrect');

    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showScore();
    }
}

function showScore() {
    resetState();
    // Final Progress Bar update (100% complete)
    progressBar.style.width = '0%'; // Timer progress bar should be empty at the end.
    // We could make this 100% with a different color to signify "quiz complete" if we wanted.

    questionElement.innerHTML = `🏆 You scored <b>${score}</b> out of <b>${questions.length}</b>!`;

    // Clear the counter text
    progressElement.textContent = `Game Over`;

    nextButton.textContent = "Play Again";
    nextButton.style.display = "block";

    nextButton.removeEventListener("click", handleNextButtonClick);
    nextButton.addEventListener("click", goToLevelScreen, { once: true });

    // Optional: Set a "game over" themed background
    document.body.style.backgroundImage = `url('https://source.unsplash.com/random/1920x1080/?celebration,success')`;
}

function goToLevelScreen() {
    levelScreen.classList.remove("hidden");
    cornerNames.classList.remove("hidden");
    quizContainer.classList.add("hidden");

    // Reset the next button for the new game flow
    nextButton.removeEventListener("click", goToLevelScreen);
    nextButton.addEventListener("click", handleNextButtonClick);

    // Set a general background for the level screen
    fetchRandomBackgroundImage();
}

// Initial listener for the next button (defined for immediate use)
nextButton.addEventListener("click", handleNextButtonClick);

// 🧠 Initial background load for the intro screen
document.addEventListener('DOMContentLoaded', fetchRandomBackgroundImage);