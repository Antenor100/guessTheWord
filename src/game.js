class GuessTheWordGame {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        // Initialize API key from localStorage if available
        this.apiKey = localStorage.getItem('openai_api_key') || null;
        
        // Track used words across the entire game
        this.usedWords = new Set();
    }

    initializeElements() {
        // Start Screen Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.endScreen = document.getElementById('end-screen');

        // Game Setup Elements
        this.playerCountSelect = document.getElementById('player-count');
        this.languageSelect = document.getElementById('game-language');
        this.difficultySelect = document.getElementById('game-difficulty');
        this.roundTimeInput = document.getElementById('round-time');
        this.wordsPerRoundInput = document.getElementById('words-per-round');
        this.startGameBtn = document.getElementById('start-game-btn');

        // Game Play Elements
        this.currentPlayerSpan = document.getElementById('current-player');
        this.timerSpan = document.getElementById('timer');
        this.mimeDescription = document.getElementById('mime-description');
        this.correctGuessBtn = document.getElementById('correct-guess');
        this.skipWordBtn = document.getElementById('skip-word');
        this.playerScoresDiv = document.getElementById('player-scores');
        this.finalScoresDiv = document.getElementById('final-scores');
        this.restartGameBtn = document.getElementById('restart-game-btn');
        this.currentWordCountSpan = document.getElementById('current-word-count');
    }

    setupEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.correctGuessBtn.addEventListener('click', () => this.endRound(true));
        this.skipWordBtn.addEventListener('click', () => this.skipWord());
        this.restartGameBtn.addEventListener('click', () => this.restartGame());
    }

    async startGame() {
        // Confirmation messages for different languages
        const confirmMessages = {
            portuguese: 'Todos os jogadores estão prontos? Clique em OK para começar.',
            english: 'Are all players ready? Click OK to start.',
            spanish: '¿Todos los jugadores están listos? Haga clic en Aceptar para comenzar.'
        };

        // Get confirmation from players
        const confirmMessage = confirmMessages[this.language] || confirmMessages.english;
        const isReady = confirm(confirmMessage);

        if (!isReady) {
            return; // Exit if players are not ready
        }

        // Gather game settings
        this.playerCount = parseInt(this.playerCountSelect.value);
        this.language = this.languageSelect.value;
        this.difficulty = this.difficultySelect.value;
        this.roundTime = parseInt(this.roundTimeInput.value);
        this.wordsPerRound = parseInt(this.wordsPerRoundInput.value);

        // Initialize game state
        this.currentPlayerIndex = 0;
        this.playerScores = {
            hits: Array(this.playerCount).fill(0),
            misses: Array(this.playerCount).fill(0)
        };
        this.currentRound = 0;

        // Initialize word tracking
        this.playerWords = Array(this.playerCount).fill().map(() => []);

        // Show loading indicator
        this.showLoadingIndicator();

        try {
            // Select multiple random words for the round
            await this.selectRandomWords();

            // Switch screens
            this.startScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');

            // Start the timer
            this.startRoundTimer();

            // Update player turn display
            this.updatePlayerTurn();
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Erro ao iniciar o jogo. Por favor, tente novamente.');
            this.hideLoadingIndicator();
        }
    }

    showLoadingIndicator() {
        // Create loading indicator if it doesn't exist
        if (!this.loadingIndicator) {
            this.loadingIndicator = document.createElement('div');
            this.loadingIndicator.className = 'loading-indicator';
            this.loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <p>Carregando palavras...</p>
            `;
            document.body.appendChild(this.loadingIndicator);
        }
        this.loadingIndicator.style.display = 'flex';
    }

    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }

    async selectRandomWords() {
        try {
            // Fetch words from ChatGPT API
            this.currentWords = await this.fetchWordsFromChatGPT(this.language, this.difficulty, this.wordsPerRound);
            
            // Set initial word to guess
            this.currentWordIndex = 0;
            this.currentWord = this.currentWords[this.currentWordIndex];
            
            // Update mime description and word count
            this.updateWordDisplay();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
        } catch (error) {
            console.error('Error fetching words from ChatGPT:', error);
            
            // Use fallback words if API fails
            this.currentWords = this.getFallbackWords(this.language, this.difficulty, this.wordsPerRound);
            
            // Set initial word to guess
            this.currentWordIndex = 0;
            this.currentWord = this.currentWords[this.currentWordIndex];
            
            // Update mime description and word count
            this.updateWordDisplay();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
        }
    }
    
    async fetchWordsFromChatGPT(language, difficulty, count = 5) {
        // Check if API key is available
        if (!this.apiKey) {
            this.apiKey = prompt('Please enter your OpenAI API key (it will be stored in your browser):');
            if (this.apiKey) {
                localStorage.setItem('openai_api_key', this.apiKey);
            } else {
                throw new Error('API key is required to fetch words');
            }
        }

        // Define prompts based on language
        const prompts = {
            portuguese: `Gere ${count} palavras ${this.getDifficultyDescription(difficulty, 'pt')} em português para um jogo de mímica. Retorne apenas as palavras separadas por vírgula, sem explicações adicionais.`,
            english: `Generate ${count} ${this.getDifficultyDescription(difficulty, 'en')} words in English for a charades game. Return only the words separated by commas, without additional explanations.`,
            spanish: `Genera ${count} palabras ${this.getDifficultyDescription(difficulty, 'es')} en español para un juego de mímica. Devuelve solo las palabras separadas por comas, sin explicaciones adicionales.`
        };

        // Make API request to ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.apiKey
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompts[language]
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // Parse the comma-separated words and clean them
        let words = content.split(',').map(word => word.trim()).filter(word => word.length > 0);
        
        // Filter out already used words
        words = words.filter(word => !this.usedWords.has(word.toLowerCase()));
        
        // If not enough unique words, use fallback
        if (words.length < count) {
            console.warn('Not enough unique words returned from API, using fallback');
            return this.getFallbackWords(language, difficulty, count);
        }
        
        // Add selected words to used words set
        words.slice(0, count).forEach(word => this.usedWords.add(word.toLowerCase()));
        
        return words.slice(0, count);
    }

    getDifficultyDescription(difficulty, lang) {
        const descriptions = {
            pt: {
                easy: 'simples e fáceis',
                medium: 'de dificuldade média',
                hard: 'difíceis e complexas'
            },
            en: {
                easy: 'simple and easy',
                medium: 'of medium difficulty',
                hard: 'difficult and complex'
            },
            es: {
                easy: 'simples y fáciles',
                medium: 'de dificultad media',
                hard: 'difíciles y complejas'
            }
        };
        
        return descriptions[lang][difficulty];
    }

    getFallbackWords(language, difficulty, count) {
        // Fallback word database in case API calls fail
        const wordDatabase = {
            portuguese: {
                easy: [
                    "Gato", "Árvore", "Carro", "Casa", "Pão", "Bola", "Livro", "Água", "Sol", "Lua"
                ],
                medium: [
                    "Liberdade", "Coragem", "Inteligência", "Amizade", "Viagem", "Música", "Dança", "Pintura", "Esporte", "Cinema"
                ],
                hard: [
                    "Efêmero", "Ubíquo", "Resiliência", "Paradigma", "Idiossincrasia", "Perspicácia", "Ambiguidade", "Dicotomia", "Paradoxo", "Metáfora"
                ]
            },
            english: {
                easy: [
                    "Cat", "Tree", "Car", "House", "Bread", "Ball", "Book", "Water", "Sun", "Moon"
                ],
                medium: [
                    "Freedom", "Courage", "Intelligence", "Friendship", "Travel", "Music", "Dance", "Painting", "Sports", "Cinema"
                ],
                hard: [
                    "Ephemeral", "Ubiquitous", "Resilience", "Paradigm", "Idiosyncrasy", "Perspicacity", "Ambiguity", "Dichotomy", "Paradox", "Metaphor"
                ]
            },
            spanish: {
                easy: [
                    "Gato", "Árbol", "Coche", "Casa", "Pan", "Pelota", "Libro", "Agua", "Sol", "Luna"
                ],
                medium: [
                    "Libertad", "Coraje", "Inteligencia", "Amistad", "Viaje", "Música", "Baile", "Pintura", "Deporte", "Cine"
                ],
                hard: [
                    "Efímero", "Ubicuo", "Resiliencia", "Paradigma", "Idiosincrasia", "Perspicacia", "Ambigüedad", "Dicotomía", "Paradoja", "Metáfora"
                ]
            }
        };

        // Filter out already used words
        let availableWords = wordDatabase[language][difficulty].filter(
            word => !this.usedWords.has(word.toLowerCase())
        );
        
        // If not enough unique words, reset the used words set
        if (availableWords.length < count) {
            this.usedWords.clear();
            availableWords = wordDatabase[language][difficulty];
        }
        
        // Shuffle and select words
        const selectedWords = this.shuffleArray(availableWords).slice(0, count);
        
        // Add selected words to used words set
        selectedWords.forEach(word => this.usedWords.add(word.toLowerCase()));
        
        return selectedWords;
    }

    // Helper function to shuffle an array (Fisher-Yates algorithm)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    updateWordDisplay() {
        // Get the appropriate instruction text based on language
        const instructionText = this.getInstructionText();
        
        // Update mime description and word count
        this.mimeDescription.textContent = `${instructionText}: ${this.currentWord}`;
        
        // Update word count display
        const wordCountText = this.getWordCountText();
        this.currentWordCountSpan.textContent = wordCountText;
        
        // Add a hidden element to show the word (for debugging or future reveal)
        const wordRevealElement = document.getElementById('word-reveal');
        if (wordRevealElement) {
            wordRevealElement.textContent = this.currentWords.join(', ');
            wordRevealElement.classList.add('hidden'); // Keep it hidden by default
        }
    }
    
    getInstructionText() {
        const instructions = {
            portuguese: "Faça mímica da palavra",
            english: "Act out the word",
            spanish: "Haz mímica de la palabra"
        };
        
        return instructions[this.language] || instructions.english;
    }
    
    getWordCountText() {
        const wordCountTexts = {
            portuguese: `Palavra ${this.currentWordIndex + 1} de ${this.wordsPerRound}`,
            english: `Word ${this.currentWordIndex + 1} of ${this.wordsPerRound}`,
            spanish: `Palabra ${this.currentWordIndex + 1} de ${this.wordsPerRound}`
        };
        
        return wordCountTexts[this.language] || wordCountTexts.english;
    }

    startRoundTimer() {
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.remainingTime = this.roundTime;
        this.timerSpan.textContent = this.remainingTime;

        this.timerInterval = setInterval(() => {
            this.remainingTime--;
            this.timerSpan.textContent = this.remainingTime;

            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                this.endPlayerTurn();
            }
        }, 1000);
    }

    endRound(guessedCorrectly) {
        // Update scores for the current word
        if (guessedCorrectly) {
            this.playerScores.hits[this.currentPlayerIndex]++;
            
            // Record the word as correctly guessed
            this.playerWords[this.currentPlayerIndex].push({
                word: this.currentWord,
                status: 'correct'
            });
            
            // Move to next word in the round
            this.currentWordIndex++;
            
            // Check if all words in the round have been guessed
            if (this.currentWordIndex >= this.wordsPerRound) {
                // End this player's turn
                clearInterval(this.timerInterval);
                this.endPlayerTurn();
            } else {
                // Move to next word in the current round
                this.currentWord = this.currentWords[this.currentWordIndex];
                this.updateWordDisplay();
            }
        } else {
            // For incorrect guess, count it as a miss and record the word
            this.playerScores.misses[this.currentPlayerIndex]++;
            
            // Record the word as incorrectly guessed
            this.playerWords[this.currentPlayerIndex].push({
                word: this.currentWord,
                status: 'incorrect'
            });
        }
    }

    skipWord() {
        // Penalize the player for skipping by incrementing misses
        this.playerScores.misses[this.currentPlayerIndex]++;
        
        // Record the skipped word
        this.playerWords[this.currentPlayerIndex].push({
            word: this.currentWord,
            status: 'skipped'
        });
        
        // Move to next word in the round
        this.currentWordIndex++;
        
        // Check if all words in the round have been guessed
        if (this.currentWordIndex >= this.wordsPerRound) {
            // End this player's turn
            clearInterval(this.timerInterval);
            this.endPlayerTurn();
        } else {
            // Move to next word in the current round
            this.currentWord = this.currentWords[this.currentWordIndex];
            this.updateWordDisplay();
        }
    }
    
    async endPlayerTurn() {
        // Count any remaining unguessed words as misses
        while (this.currentWordIndex < this.wordsPerRound) {
            this.playerScores.misses[this.currentPlayerIndex]++;
            this.currentWordIndex++;
        }

        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        
        // Increment round
        this.currentRound++;
        
        // Check if game is over
        if (this.currentRound >= this.playerCount) {
            this.endGame();
            return;
        }
        
        // Confirmation messages for different languages
        const confirmMessages = {
            portuguese: `Jogador ${this.currentPlayerIndex + 1}, está pronto? Clique em OK para começar.`,
            english: `Player ${this.currentPlayerIndex + 1}, are you ready? Click OK to start.`,
            spanish: `Jugador ${this.currentPlayerIndex + 1}, ¿está listo? Haga clic en Aceptar para comenzar.`
        };

        // Get confirmation from next player
        const confirmMessage = confirmMessages[this.language] || confirmMessages.english;
        const isReady = confirm(confirmMessage);

        if (!isReady) {
            // If not ready, revert player index
            this.currentPlayerIndex = (this.currentPlayerIndex - 1 + this.playerCount) % this.playerCount;
            this.currentRound--; // Revert round increment
            return; // Exit if player is not ready
        }
        
        // Show loading indicator while fetching new words
        this.showLoadingIndicator();
        
        try {
            // Reset for next player's turn
            await this.selectRandomWords();
            this.startRoundTimer();
            this.updatePlayerTurn();
        } catch (error) {
            console.error('Error preparing next player turn:', error);
            alert('Erro ao preparar a próxima rodada. Por favor, tente novamente.');
            this.hideLoadingIndicator();
        }
    }

    updatePlayerTurn() {
        this.currentPlayerSpan.textContent = this.currentPlayerIndex + 1;
    }

    endGame() {
        // Make sure timer is cleared
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.gameScreen.classList.add('hidden');
        this.endScreen.classList.remove('hidden');

        // Determine the winner
        const maxHits = Math.max(...this.playerScores.hits);
        const winners = this.playerScores.hits.reduce((acc, hits, index) => {
            if (hits === maxHits) {
                acc.push(index + 1);
            }
            return acc;
        }, []);

        // Display final scores with clear formatting
        this.finalScoresDiv.innerHTML = this.playerScores.hits.map((hits, index) => {
            const winnerText = this.getWinnerText(winners.includes(index + 1));
            const playerText = this.getPlayerText();
            const correctWordsText = this.getCorrectWordsText();
            const errorsText = this.getErrorsText();
            
            // Create word list with icons
            const wordListHTML = this.playerWords[index].map(wordItem => {
                let icon = '❓'; // Default icon for unguessed
                switch(wordItem.status) {
                    case 'correct':
                        icon = '✅';
                        break;
                    case 'incorrect':
                        icon = '❌';
                        break;
                    case 'skipped':
                        icon = '➡️';
                        break;
                }
                return `<li>${icon} ${wordItem.word}</li>`;
            }).join('');

            return `<div class="player-score ${winners.includes(index + 1) ? 'winner' : ''}">
                <h3>${playerText} ${index + 1} ${winnerText}</h3>
                <p>${correctWordsText}: ${hits}</p>
                <p>${errorsText}: ${this.playerScores.misses[index]}</p>
                <h4>Palavras:</h4>
                <ul style="list-style-type: none">${wordListHTML}</ul>
            </div>`;
        }).join('');
    }
    
    getWinnerText(isWinner) {
        if (!isWinner) return '';
        
        const winnerTexts = {
            portuguese: '🏆 VENCEDOR',
            english: '🏆 WINNER',
            spanish: '🏆 GANADOR'
        };
        
        return winnerTexts[this.language] || winnerTexts.english;
    }
    
    getPlayerText() {
        const playerTexts = {
            portuguese: 'Jogador',
            english: 'Player',
            spanish: 'Jugador'
        };
        
        return playerTexts[this.language] || playerTexts.english;
    }
    
    getCorrectWordsText() {
        const correctWordsTexts = {
            portuguese: 'Palavras Acertadas',
            english: 'Correct Words',
            spanish: 'Palabras Correctas'
        };
        
        return correctWordsTexts[this.language] || correctWordsTexts.english;
    }
    
    getErrorsText() {
        const errorsTexts = {
            portuguese: 'Erros',
            english: 'Errors',
            spanish: 'Errores'
        };
        
        return errorsTexts[this.language] || errorsTexts.english;
    }

    restartGame() {
        this.endScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
    }
}

// new GuessTheWordGame();

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new GuessTheWordGame();
});