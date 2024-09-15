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

      const emailContent = `${subject} ${snippet}`;

      chrome.runtime.sendMessage(
        {
          action: 'categorizeEmail',
          content: emailContent
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
      default:
        labelSpan.style.backgroundColor = '#9e9e9e';
    }

    emailItem.querySelector('.yW').appendChild(labelSpan);
  }

  setInterval(processEmails, 5000);
})();