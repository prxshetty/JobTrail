console.log('Content script loaded');

(function() {
  console.log('Email Categorizer Content Script Loaded');

  function processEmails() {
    const emailItems = document.querySelectorAll('tr.zA');

    emailItems.forEach((emailItem) => {
      if (emailItem.getAttribute('data-processed')) return;

      emailItem.setAttribute('data-processed', 'true');

      const subjectElement = emailItem.querySelector('.bog');
      const snippetElement = emailItem.querySelector('.y2');
      const senderElement = emailItem.querySelector('.yP, .zF'); // Added this line

      const subject = subjectElement ? subjectElement.innerText : '';
      const snippet = snippetElement ? snippetElement.innerText : '';
      const sender = senderElement ? senderElement.innerText : ''; // Added this line

      const emailContent = `${snippet}`;

      chrome.runtime.sendMessage(
        {
          action: 'categorizeEmail',
          content: emailContent,
          subject: subject,
          sender: sender // Added this line
        },
        (response) => {
          console.log('Categorization response:', response);
          if (response && response.category) {
            applyLabel(emailItem, response.category);
          }
        }
      );
    });
  }

  function applyLabel(emailItem, category) {
    const labelSpan = document.createElement('span');
    labelSpan.innerText = category;
    labelSpan.className = 'email-category-label';
    
    switch (category.toLowerCase()) {
      case 'rejection':
        labelSpan.style.backgroundColor = '#ff4c4c';
        break;
      case 'acceptance':
        labelSpan.style.backgroundColor = '#4caf50';
        break;
      case 'interview':
        labelSpan.style.backgroundColor = '#2196f3';
        break;
      case 'assessment':
        labelSpan.style.backgroundColor = '#ff9800';
        break;
      case 'applicant':
        labelSpan.style.backgroundColor = '#e91e63';
        break;
      case 'job alerts':
        labelSpan.style.backgroundColor = '#00bcd4';
        break;
      case 'n':
        labelSpan.style.backgroundColor = '#9c27b0';
        break;
      case 'not job-related':
        labelSpan.style.backgroundColor = '#9e9e9e';
        break;
      default:
        labelSpan.style.backgroundColor = '#9e9e9e';
    }

    emailItem.querySelector('.yW').appendChild(labelSpan);
  }

  setInterval(processEmails, 5000);
})();