var createFocusTrap = require('../../');

var container = document.getElementById('arrows-vertical-only');

var focusTrap = createFocusTrap('#arrows-vertical-only', {
  onActivate: function() {
    container.className = 'trap is-active';
  },
  onDeactivate: function() {
    container.className = 'trap';
  },
  trapVerticalArrows: true,
  clickOutsideDeactivates: true,
  trapTabs: false,
  trapFocus: false
});

document
  .getElementById('activate-arrows-vertical-only')
  .addEventListener('click', function() {
    focusTrap.activate();
  });

document
  .getElementById('deactivate-arrows-vertical-only')
  .addEventListener('click', function() {
    focusTrap.deactivate();
  });
