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

      const subject = subjectElement ? subjectElement.innerText : '';
      const snippet = snippetElement ? snippetElement.innerText : '';

      const emailContent = `${snippet}`;

      chrome.runtime.sendMessage(
        {
          action: 'categorizeEmail',
          content: emailContent,
          subject: subject
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
        labelSpan.style.backgroundColor = '#00bcd4'; // Cyan color for Job Alerts
        break;
      case 'n':
        labelSpan.style.backgroundColor = '#9c27b0';
        break;
      case 'not job-related':
        labelSpan.style.backgroundColor = '#9e9e9e';
        labelSpan.style.display = 'none'; // Hide the label for non-job-related emails
        break;
      default:
        labelSpan.style.backgroundColor = '#9e9e9e';
    }

    if (category.toLowerCase() !== 'not job-related') {
      emailItem.querySelector('.yW').appendChild(labelSpan);
    }
  }

  setInterval(processEmails, 5000);
})();