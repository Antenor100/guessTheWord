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

// Function to fetch words from ChatGPT API
async function fetchWords(language, difficulty, count = 5) {
    try {
        // Define prompts based on language
        const prompts = {
            portuguese: `Gere ${count} palavras ${difficultyDescription(difficulty, 'pt')} em português para um jogo de mímica. Retorne apenas as palavras separadas por vírgula, sem explicações adicionais.`,
            english: `Generate ${count} ${difficultyDescription(difficulty, 'en')} words in English for a charades game. Return only the words separated by commas, without additional explanations.`,
            spanish: `Genera ${count} palabras ${difficultyDescription(difficulty, 'es')} en español para un juego de mímica. Devuelve solo las palabras separadas por comas, sin explicaciones adicionales.`
        };

        // Make API request to ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getApiKey() // Function to get API key (defined below)
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
        const words = content.split(',').map(word => word.trim()).filter(word => word.length > 0);
        
        // Ensure we have enough words, if not, use fallback
        if (words.length < count) {
            console.warn('Not enough words returned from API, using fallback');
            return getFallbackWords(language, difficulty, count);
        }
        
        return words;
    } catch (error) {
        console.error('Error fetching words from API:', error);
        return getFallbackWords(language, difficulty, count);
    }
}

// Helper function to get difficulty description in different languages
function difficultyDescription(difficulty, lang) {
    const descriptions = {
        pt: {
            easy: 'simples e fáceis',
            medium: 'de dificuldade média',
            hard: 'difíceis'
        },
        en: {
            easy: 'simple and easy',
            medium: 'of medium difficulty',
            hard: 'difficult'
        },
        es: {
            easy: 'simples y fáciles',
            medium: 'de dificultad media',
            hard: 'difíciles'
        }
    };
    
    return descriptions[lang][difficulty];
}

// Function to get fallback words from the static database
function getFallbackWords(language, difficulty, count) {
    const availableWords = wordDatabase[language][difficulty];
    
    // If we need more words than available, we'll repeat some
    if (count > availableWords.length) {
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(availableWords[i % availableWords.length]);
        }
        return result;
    }
    
    // Otherwise, return random selection of words
    return shuffleArray([...availableWords]).slice(0, count);
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to get API key - in a real app, this would be more secure
// For this demo, we'll use a simple prompt to get the key from the user
let apiKey = null;

function getApiKey() {
    if (!apiKey) {
        // In a real app, you would use a more secure method to store and retrieve the API key
        // This is just a simple implementation for demonstration purposes
        apiKey = localStorage.getItem('openai_api_key');
        
        if (!apiKey) {
            apiKey = prompt('Please enter your OpenAI API key (it will be stored in your browser):');
            if (apiKey) {
                localStorage.setItem('openai_api_key', apiKey);
            }
        }
    }
    
    return apiKey;
}