// State
let currentQuote = null;
let favorites = [];
let currentCategory = 'all';
let isLoading = false;

// DOM Elements
const elements = {
    quoteText: document.getElementById('quoteText'),
    quoteAuthor: document.getElementById('quoteAuthor'),
    quoteTags: document.getElementById('quoteTags'),
    loading: document.getElementById('loading'),
    quoteDisplay: document.getElementById('quoteDisplay'),
    newQuoteBtn: document.getElementById('newQuoteBtn'),
    copyBtn: document.getElementById('copyBtn'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    copyMessage: document.getElementById('copyMessage'),
    favoritesSection: document.getElementById('favoritesSection'),
    favoritesList: document.getElementById('favoritesList'),
    favoritesCount: document.getElementById('favoritesCount'),
    categories: document.getElementById('categories')
};

// Fallback quotes in case API fails
const fallbackQuotes = [
    { text: "Жизнь - это то, что происходит с вами, пока вы строите другие планы.", author: "Джон Леннон" },
    { text: "Будьте собой; все остальные роли уже заняты.", author: "Оскар Уайльд" },
    { text: "Два дня в году, когда ничего нельзя сделать. Один называется вчера, другой - завтра.", author: "Далай Лама" },
    { text: "Успех - это способность идти от неудачи к неудаче, не теряя энтузиазма.", author: "Уинстон Черчилль" },
    { text: "Единственный способ делать великие дела - это любить то, что вы делаете.", author: "Стив Джобс" }
];

let lastQuoteId = null;
let usedQuoteIds = new Set();

// Fetch quote from API with multiple fallback options
async function fetchQuote() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    hideCopyMessage();
    
    try {
        // Try multiple APIs in sequence
        let quote = await tryQuotableAPI();
        
        if (!quote) {
            quote = await tryZenQuotesAPI();
        }
        
        if (!quote) {
            quote = getRandomFallbackQuote();
        }
        
        // Make sure we don't show the same quote twice in a row
        if (quote.id === lastQuoteId && usedQuoteIds.size < 10) {
            // Try one more time to get a different quote
            const retryQuote = await tryQuotableAPI();
            if (retryQuote && retryQuote.id !== lastQuoteId) {
                quote = retryQuote;
            }
        }
        
        lastQuoteId = quote.id;
        usedQuoteIds.add(quote.id);
        
        // Reset used quotes set if it gets too large
        if (usedQuoteIds.size > 50) {
            usedQuoteIds.clear();
        }
        
        currentQuote = quote;
        displayQuote();
        
    } catch (error) {
        console.error('Error fetching quote:', error);
        currentQuote = getRandomFallbackQuote();
        displayQuote();
    } finally {
        isLoading = false;
    }
}

// Try Quotable API
async function tryQuotableAPI() {
    try {
        let url = 'https://api.quotable.io/random';
        
        // Add category tag if not 'all'
        if (currentCategory !== 'all') {
            const tagMap = {
                'inspirational': 'inspirational',
                'life': 'life',
                'success': 'success',
                'wisdom': 'wisdom'
            };
            if (tagMap[currentCategory]) {
                url += `?tags=${tagMap[currentCategory]}`;
            }
        }
        
        // Add timestamp to prevent caching
        url += (url.includes('?') ? '&' : '?') + `nocache=${Date.now()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) throw new Error('Quotable API failed');
        
        const data = await response.json();
        
        console.log('✓ Quotable API:', data.content.substring(0, 40) + '...', 'ID:', data._id);
        
        return {
            text: data.content,
            author: data.author,
            tags: data.tags || [],
            id: data._id
        };
    } catch (error) {
        console.warn('Quotable API failed:', error.message);
        return null;
    }
}

// Try ZenQuotes API
async function tryZenQuotesAPI() {
    try {
        const url = `https://zenquotes.io/api/random/${Date.now()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store'
        });
        
        if (!response.ok) throw new Error('ZenQuotes API failed');
        
        const data = await response.json();
        const quote = data[0];
        
        console.log('✓ ZenQuotes API:', quote.q.substring(0, 40) + '...', 'Author:', quote.a);
        
        return {
            text: quote.q,
            author: quote.a,
            tags: [currentCategory !== 'all' ? currentCategory : 'wisdom'],
            id: `zen_${Date.now()}_${Math.random()}`
        };
    } catch (error) {
        console.warn('ZenQuotes API failed:', error.message);
        return null;
    }
}

// Get random fallback quote
function getRandomFallbackQuote() {
    const quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    console.log('✓ Using fallback quote');
    
    return {
        text: quote.text,
        author: quote.author,
        tags: ['wisdom'],
        id: `fallback_${Date.now()}_${Math.random()}`
    };
}

// Display quote
function displayQuote() {
    if (!currentQuote) return;
    
    elements.quoteText.textContent = `"${currentQuote.text}"`;
    elements.quoteAuthor.textContent = `— ${currentQuote.author}`;
    
    // Display tags
    elements.quoteTags.innerHTML = '';
    if (currentQuote.tags && currentQuote.tags.length > 0) {
        currentQuote.tags.slice(0, 2).forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = `#${tag}`;
            elements.quoteTags.appendChild(tagElement);
        });
    }
    
    // Update favorite button state
    updateFavoriteButton();
    
    // Show quote with animation
    elements.loading.style.display = 'none';
    elements.quoteDisplay.style.display = 'block';
}

// Show loading state
function showLoading() {
    elements.loading.style.display = 'block';
    elements.quoteDisplay.style.display = 'none';
}

// Copy to clipboard
function copyToClipboard() {
    if (!currentQuote) return;
    
    const text = `"${currentQuote.text}" - ${currentQuote.author}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showCopyMessage();
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showCopyMessage();
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    });
}

// Show copy message
function showCopyMessage() {
    elements.copyMessage.style.display = 'block';
    setTimeout(() => {
        hideCopyMessage();
    }, 2000);
}

// Hide copy message
function hideCopyMessage() {
    elements.copyMessage.style.display = 'none';
}

// Toggle favorite
function toggleFavorite() {
    if (!currentQuote) return;
    
    const isFavorite = favorites.some(fav => fav.id === currentQuote.id);
    
    if (isFavorite) {
        favorites = favorites.filter(fav => fav.id !== currentQuote.id);
    } else {
        favorites.push(currentQuote);
    }
    
    saveFavorites();
    updateFavoriteButton();
    updateFavoritesDisplay();
}

// Update favorite button state
function updateFavoriteButton() {
    if (!currentQuote) return;
    
    const isFavorite = favorites.some(fav => fav.id === currentQuote.id);
    
    if (isFavorite) {
        elements.favoriteBtn.classList.add('favorite-active');
    } else {
        elements.favoriteBtn.classList.remove('favorite-active');
    }
}

// Update favorites display
function updateFavoritesDisplay() {
    if (favorites.length === 0) {
        elements.favoritesSection.style.display = 'none';
        return;
    }
    
    elements.favoritesSection.style.display = 'block';
    elements.favoritesCount.textContent = favorites.length;
    
    elements.favoritesList.innerHTML = '';
    favorites.slice(0, 5).reverse().forEach(fav => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.innerHTML = `
            <p class="favorite-text">"${fav.text}"</p>
            <p class="favorite-author">— ${fav.author}</p>
        `;
        
        item.addEventListener('click', () => {
            currentQuote = fav;
            displayQuote();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        elements.favoritesList.appendChild(item);
    });
}

// Save favorites to localStorage
function saveFavorites() {
    try {
        localStorage.setItem('favoriteQuotes', JSON.stringify(favorites));
    } catch (error) {
        console.error('Failed to save favorites:', error);
    }
}

// Load favorites from localStorage
function loadFavorites() {
    try {
        const saved = localStorage.getItem('favoriteQuotes');
        if (saved) {
            favorites = JSON.parse(saved);
            updateFavoritesDisplay();
        }
    } catch (error) {
        console.error('Failed to load favorites:', error);
        favorites = [];
    }
}

// Handle category change
function handleCategoryChange(category) {
    if (currentCategory === category) return;
    
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    // Fetch new quote after short delay
    setTimeout(() => {
        fetchQuote();
    }, 150);
}

// Event Listeners
elements.newQuoteBtn.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Button clicked - fetching new quote...');
    fetchQuote();
});

elements.copyBtn.addEventListener('click', function(e) {
    e.preventDefault();
    copyToClipboard();
});

elements.favoriteBtn.addEventListener('click', function(e) {
    e.preventDefault();
    toggleFavorite();
});

// Category buttons
elements.categories.addEventListener('click', function(e) {
    const btn = e.target.closest('.category-btn');
    if (btn && btn.dataset.category) {
        handleCategoryChange(btn.dataset.category);
    }
});

// Initialize app
function init() {
    console.log('🚀 Quote Generator initialized');
    loadFavorites();
    fetchQuote();
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}