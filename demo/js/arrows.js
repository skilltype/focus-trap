var createFocusTrap = require('../../');

var container = document.getElementById('arrows');

var focusTrap = createFocusTrap('#arrows', {
  onActivate: function() {
    container.className = 'trap is-active';
  },
  onDeactivate: function() {
    container.className = 'trap';
  },
  trapVerticalArrows: true,
  trapHorizontalArrows: true
});

document
  .getElementById('activate-arrows')
  .addEventListener('click', function() {
    focusTrap.activate();
  });

document
  .getElementById('deactivate-arrows')
  .addEventListener('click', function() {
    focusTrap.deactivate();
  });
