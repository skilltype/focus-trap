var createFocusTrap = require('../../');

var container = document.getElementById('arrows-horizontal-only');

var focusTrap = createFocusTrap('#arrows-horizontal-only', {
  onActivate: function() {
    container.className = 'trap is-active';
  },
  onDeactivate: function() {
    container.className = 'trap';
  },
  trapHorizontalArrows: true,
  clickOutsideDeactivates: true,
  trapTabs: false,
  trapFocus: false
});

document
  .getElementById('activate-arrows-horizontal-only')
  .addEventListener('click', function() {
    focusTrap.activate();
  });

document
  .getElementById('deactivate-arrows-horizontal-only')
  .addEventListener('click', function() {
    focusTrap.deactivate();
  });
