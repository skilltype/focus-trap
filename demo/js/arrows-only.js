var createFocusTrap = require('../../');

var container = document.getElementById('arrows-only');

var focusTrap = createFocusTrap('#arrows-only', {
  onActivate: function() {
    container.className = 'trap is-active';
  },
  onDeactivate: function() {
    container.className = 'trap';
  },
  trapVerticalArrows: true,
  trapHorizontalArrows: true,
  clickOutsideDeactivates: true,
  trapTabs: false,
  trapFocus: false
});

document
  .getElementById('activate-arrows-only')
  .addEventListener('click', function() {
    focusTrap.activate();
  });

document
  .getElementById('deactivate-arrows-only')
  .addEventListener('click', function() {
    focusTrap.deactivate();
  });
