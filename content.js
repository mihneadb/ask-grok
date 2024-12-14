// Content script: Adds Grok integration to Twitter's interface
document.addEventListener("DOMContentLoaded", function () {
    const TWEET_SELECTOR = 'article[data-testid="tweet"]';
    const GROK_ICON_URL = chrome.runtime.getURL("icon-20.png");

    /**
     * Adds the Grok icon button to a tweet's action bar
     * @param {HTMLElement} tweet - The tweet article element
     */
    function addGrokIcon(tweet) {
        const actionBar = tweet.querySelector('div[role="group"]');
        // Prevent duplicates and invalid elements
        if (!actionBar || actionBar.querySelector('.grok-button')) return;

        // Create button structure matching Twitter's native buttons
        const grokButton = createActionButton();

        // Add click handler with proper event management
        grokButton.addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();
            openGrokBox(tweet);
        });

        // Insert before the last item (usually the share button)
        actionBar.insertBefore(grokButton, actionBar.lastChild);
    }

    /**
     * Creates the Grok action button with Twitter's native structure
     * @returns {HTMLButtonElement} The constructed button element
     */
    function createActionButton() {
        const grokButton = document.createElement('button');
        grokButton.setAttribute('role', 'button');
        grokButton.className = 'grok-button tweet-action-button';
        grokButton.setAttribute('aria-label', 'Ask Grok');

        const innerDiv = document.createElement('div');
        innerDiv.className = 'tweet-action-button-inner';

        const iconContainer = document.createElement('div');
        iconContainer.className = 'tweet-action-icon-container';

        const iconBackgroundDiv = document.createElement('div');
        iconBackgroundDiv.className = 'tweet-action-icon-background';

        const img = document.createElement('img');
        img.src = GROK_ICON_URL;
        img.alt = 'Grok';
        img.className = 'tweet-action-icon';

        iconContainer.appendChild(iconBackgroundDiv);
        iconContainer.appendChild(img);
        innerDiv.appendChild(iconContainer);
        grokButton.appendChild(innerDiv);

        return grokButton;
    }

    /**
     * Opens the Grok interaction modal for a specific tweet
     * @param {HTMLElement} tweet - The tweet article element
     */
    function openGrokBox(tweet) {
        if (document.querySelector('.grok-box')) return;

        const tweetUrl = getTweetUrl(tweet);
        if (!tweetUrl) return;

        const { overlay, grokBox, inputBox, closeGrokBox } = createGrokModal();
        document.body.appendChild(overlay);

        // Setup event handlers
        setupModalEventHandlers(overlay, grokBox, inputBox, closeGrokBox, tweetUrl);
    }

    /**
     * Extracts the tweet URL from a tweet element
     * @param {HTMLElement} tweet - The tweet article element
     * @returns {string|null} The tweet URL or null if not found
     */
    function getTweetUrl(tweet) {
        const timeElement = tweet.querySelector('time');
        const tweetUrlElement = timeElement?.closest('a');
        const tweetUrl = tweetUrlElement?.href;

        if (!tweetUrl) {
            console.error('Could not find tweet URL');
            return null;
        }
        return tweetUrl;
    }

    /**
     * Creates the Grok modal elements
     * @returns {Object} Object containing the modal elements and close function
     */
    function createGrokModal() {
        const overlay = document.createElement('div');
        overlay.className = 'grok-overlay';

        const grokBox = document.createElement('div');
        grokBox.className = 'grok-box';
        overlay.appendChild(grokBox);

        const closeButton = document.createElement('button');
        closeButton.className = 'grok-close-button';
        closeButton.innerHTML = '×';
        grokBox.appendChild(closeButton);

        const inputBox = document.createElement('textarea');
        inputBox.className = 'grok-input-box';
        inputBox.placeholder = 'Ask Grok about this post...';

        const askButton = document.createElement('button');
        askButton.className = 'grok-ask-button';
        askButton.textContent = 'Ask';

        grokBox.appendChild(inputBox);
        grokBox.appendChild(askButton);

        const closeGrokBox = () => {
            document.body.removeChild(overlay);
        };

        return { overlay, grokBox, inputBox, closeGrokBox };
    }

    /**
     * Sets up all event handlers for the Grok modal
     */
    function setupModalEventHandlers(overlay, grokBox, inputBox, closeGrokBox, tweetUrl) {
        // Focus the input immediately
        inputBox.focus();

        // Handle Escape key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeGrokBox();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Handle asking Grok
        const askGrok = () => {
            const query = inputBox.value.trim();
            const promptText = query || "Explain";
            const fullPrompt = `${promptText}\n\nX Post: ${tweetUrl}`;
            const grokUrl = `https://x.com/i/grok?text=${encodeURIComponent(fullPrompt)}`;
            window.open(grokUrl, '_blank');
            closeGrokBox();
        };

        // Event Listeners
        inputBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askGrok();
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeGrokBox();
        });

        const closeButton = grokBox.querySelector('.grok-close-button');
        closeButton.addEventListener('click', closeGrokBox);

        const askButton = grokBox.querySelector('.grok-ask-button');
        askButton.addEventListener('click', askGrok);
    }

    /**
     * Observes DOM changes to add Grok buttons to new tweets
     */
    function observeTweets() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const articles = node.querySelectorAll(TWEET_SELECTOR);
                        articles.forEach(addGrokIcon);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Start observing for tweets
    observeTweets();
});
