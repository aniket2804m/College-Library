// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

// ===== Voice Command Handler for Pages =====
let voiceCommandRecognition = null;
let isVoiceListening = false;

// Initialize voice command system if supported
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceCommandRecognition = new SpeechRecognition();
  
  voiceCommandRecognition.continuous = false;
  voiceCommandRecognition.interimResults = false;
  voiceCommandRecognition.lang = 'en-US';

  voiceCommandRecognition.onstart = function() {
    isVoiceListening = true;
    console.log('Voice command listening started');
  };

  voiceCommandRecognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    handlePageVoiceCommand(transcript);
    voiceCommandRecognition.stop();
  };

  voiceCommandRecognition.onend = function() {
    isVoiceListening = false;
    console.log('Voice command listening ended');
  };

  voiceCommandRecognition.onerror = function(event) {
    console.error('Voice command error:', event.error);
    isVoiceListening = false;
  };
}

// Function to display voice message on current page
window.showPageVoiceMessage = function(message, type = 'info') {
  let messageEl = document.getElementById('pageVoiceMessage');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'pageVoiceMessage';
    document.body.appendChild(messageEl);
  }
  
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  
  switch(type) {
    case 'success':
      messageEl.style.background = '#4CAF50';
      break;
    case 'error':
      messageEl.style.background = '#f44336';
      break;
    case 'info':
      messageEl.style.background = '#2196F3';
      break;
    default:
      messageEl.style.background = '#667eea';
  }
  
  messageEl.style.display = 'block';
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 3000);
};

// Handle voice commands for open books page
window.handlePageVoiceCommand = function(transcript) {
  const command = transcript.toLowerCase().trim();
  console.log('Page Voice Command:', command);
  
  // Check if we're on the listings page
  const listingContainer = document.getElementById('listingContainer');
  if (listingContainer) {
    handleListingsPageCommand(command);
    return;
  }
  
  // Check if we're on the show page
  const showPageContent = document.querySelector('.show-img');
  if (showPageContent) {
    handleShowPageCommand(command);
    return;
  }
};

// Handle voice commands on listings page
window.handleListingsPageCommand = function(command) {
  const listingContainer = document.getElementById('listingContainer');
  const listings = Array.from(listingContainer.querySelectorAll('.listing-link'));
  
  // Commands to open book by number
  if (/open book (\d+)/i.test(command)) {
    const match = command.match(/open book (\d+)/i);
    const bookNumber = parseInt(match[1]) - 1; // Convert to 0-based index
    
    if (bookNumber >= 0 && bookNumber < listings.length) {
      const bookLink = listings[bookNumber];
      showPageVoiceMessage(`Opening book ${bookNumber + 1}...`, 'info');
      setTimeout(() => {
        bookLink.click();
      }, 500);
    } else {
      showPageVoiceMessage(`Book number ${bookNumber + 1} not found!`, 'error');
    }
    return;
  }
  
  // Commands to open book by title/name
  if (/open|show|read|view/i.test(command)) {
    const keywords = command.replace(/open|show|read|view/gi, '').trim();
    
    for (let listing of listings) {
      const title = listing.querySelector('.card-text b')?.textContent.toLowerCase() || '';
      if (title.includes(keywords.toLowerCase())) {
        showPageVoiceMessage(`Opening ${title}...`, 'success');
        setTimeout(() => {
          listing.click();
        }, 500);
        return;
      }
    }
  }
  
  // Command to open all books one by one
  if (/show all books|open all|display all/i.test(command)) {
    showPageVoiceMessage(`Found ${listings.length} books. Click the microphone and say "Open book 1", "Open book 2", etc.`, 'info');
    return;
  }
  
  // List all books by voice
  if (/list all books|what books|show books|which books/i.test(command)) {
    const bookList = listings.map((l, i) => `${i + 1}. ${l.querySelector('.card-text b')?.textContent}`).join('\n');
    showPageVoiceMessage(`Available Books: ${bookList}`, 'info');
    return;
  }
};

// Handle voice commands on show page (book details page)
window.handleShowPageCommand = function(command) {
  const editBtn = document.querySelector('a[href*="/edit"]');
  const deleteBtn = document.querySelector('button.btn-dark');
  const submitReviewBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Submit Review'));
  
  // Edit book command
  if (/edit|modify|change|update book/i.test(command)) {
    if (editBtn) {
      showPageVoiceMessage('Navigating to edit page...', 'info');
      setTimeout(() => {
        editBtn.click();
      }, 500);
    } else {
      showPageVoiceMessage('You cannot edit this book', 'error');
    }
    return;
  }
  
  // Delete book command
  if (/delete|remove|discard|trash book/i.test(command)) {
    if (deleteBtn) {
      showPageVoiceMessage('Deleting book...', 'error');
      setTimeout(() => {
        deleteBtn.click();
      }, 500);
    } else {
      showPageVoiceMessage('You cannot delete this book', 'error');
    }
    return;
  }
  
  // Submit review command
  if (/submit review|post review|leave review|add review/i.test(command)) {
    if (submitReviewBtn) {
      showPageVoiceMessage('Submitting your review...', 'success');
      setTimeout(() => {
        submitReviewBtn.click();
      }, 500);
    } else {
      showPageVoiceMessage('Please login to submit a review', 'error');
    }
    return;
  }
  
  // Set rating by voice
  if (/rate|rating|stars?/i.test(command)) {
    const ratingMatch = command.match(/(\d+)\s*(?:star|rating|out of 5)?/i);
    if (ratingMatch) {
      const rating = parseInt(ratingMatch[1]);
      if (rating >= 1 && rating <= 5) {
        const starLabel = document.querySelector(`label[for="first-rate${rating}"]`);
        if (starLabel) {
          showPageVoiceMessage(`Setting rating to ${rating} stars...`, 'info');
          setTimeout(() => {
            starLabel.click();
          }, 500);
        }
      }
    }
    return;
  }
  
  // Back/Go back command
  if (/back|go back|previous|return/i.test(command)) {
    showPageVoiceMessage('Going back...', 'info');
    setTimeout(() => {
      window.history.back();
    }, 500);
    return;
  }
};

// Add keyboard shortcut to activate voice commands (Hold Alt and press V)
document.addEventListener('keydown', function(event) {
  if (event.altKey && event.key.toLowerCase() === 'v') {
    if (voiceCommandRecognition && !isVoiceListening) {
      try {
        voiceCommandRecognition.start();
        showPageVoiceMessage('🎤 Listening... Speak now!', 'info');
      } catch (error) {
        console.error('Error starting voice command:', error);
      }
    }
  }
});