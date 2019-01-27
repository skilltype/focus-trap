var tabbable = require('tabbable');
var xtend = require('xtend');

var activeFocusTraps = (function() {
  var trapQueue = [];
  return {
    activateTrap: function(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];
        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);
      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },

    deactivateTrap: function(trap) {
      var trapIndex = trapQueue.indexOf(trap);
      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
})();

function focusTrap(element, userOptions) {
  var doc = document;
  var container =
    typeof element === 'string' ? doc.querySelector(element) : element;

  var config = xtend(
    {
      returnFocusOnDeactivate: true,
      escapeDeactivates: true,
      trapHorizontalArrows: false,
      trapVerticalArrows: false,
      trapTabs: true,
      trapFocus: true
    },
    userOptions
  );

  var state = {
    tabbableNodes: null,
    firstTabbableNode: null,
    lastTabbableNode: null,
    activeTabbableNodeIndex: 0,
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    advanceOnUnpause: 0
  };

  var trap = {
    activate: activate,
    deactivate: deactivate,
    pause: pause,
    unpause: unpause,
    destroy: destroy,
    advance: advanceTabbable,
    advanceOnUnpause: advanceOnUnpause
  };

  if (!config.trapFocus) {
    container.addEventListener('focusin', checkContainerFocusIn, true);
  }

  updateTabbableNodes();

  return trap;

  function updateActiveTabbableNode(e) {
    var activeElement = doc.activeElement;
    if (e && e.target) {
      activeElement = e.target;
    }
    // if activeElement (focused) is in the container,
    //   make it our active tabbable node
    if (container.contains(activeElement)) {
      state.tabbableNodes.forEach(function(node, idx) {
        if (node === activeElement) {
          state.activeTabbableNodeIndex = idx;
          state.mostRecentlyFocusedNode = node;
        }
      });
    }
  }

  function activate(activateOptions) {
    if (state.active) return;

    // updateTabbableNodes();

    state.active = true;
    state.paused = false;
    state.nodeFocusedBeforeActivation = doc.activeElement;

    updateActiveTabbableNode();

    var onActivate =
      activateOptions && activateOptions.onActivate
        ? activateOptions.onActivate
        : config.onActivate;
    if (onActivate) {
      onActivate();
    }

    addListeners();
    return trap;
  }

  function deactivate(deactivateOptions) {
    if (!state.active) return;

    removeListeners();

    state.active = false;
    state.paused = false;

    activeFocusTraps.deactivateTrap(trap);

    var onDeactivate =
      deactivateOptions && deactivateOptions.onDeactivate !== undefined
        ? deactivateOptions.onDeactivate
        : config.onDeactivate;
    if (onDeactivate) {
      onDeactivate();
    }

    var returnFocus =
      deactivateOptions && deactivateOptions.returnFocus !== undefined
        ? deactivateOptions.returnFocus
        : config.returnFocusOnDeactivate;
    if (returnFocus) {
      delay(function() {
        tryFocus(state.nodeFocusedBeforeActivation);
      });
    }

    return trap;
  }

  function destroy() {
    deactivate();
    container.removeEventListener('focusin', checkContainerFocusIn, true);
  }

  function pause() {
    if (state.paused || !state.active) return;
    state.paused = true;
    removeListeners();
  }

  function unpause() {
    if (!state.paused || !state.active) return;
    state.paused = false;
    addListeners();
    tryFocus(state.mostRecentlyFocusedNode);
  }

  function advanceOnUnpause(incrementBy) {
    if (!state.paused || !state.active) return;
    var nextActiveIndex = getNextActiveNodeIndex(incrementBy);
    state.mostRecentlyFocusedNode = state.tabbableNodes[nextActiveIndex];
    state.activeTabbableNodeIndex = nextActiveIndex;
  }

  function addListeners() {
    if (!state.active) return;

    // There can be only one listening focus trap at a time
    activeFocusTraps.activateTrap(trap);

    // updateTabbableNodes();

    // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.
    delay(function() {
      tryFocus(getInitialFocusNode());
    });
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, true);
    doc.addEventListener('touchstart', checkPointerDown, true);
    doc.addEventListener('click', checkClick, true);
    doc.addEventListener('keydown', checkKey, true);

    return trap;
  }

  function removeListeners() {
    if (!state.active) return;

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);

    return trap;
  }

  function getNodeForOption(optionName) {
    var optionValue = config[optionName];
    var node = optionValue;
    if (!optionValue) {
      return null;
    }
    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue);
      if (!node) {
        throw new Error('`' + optionName + '` refers to no known node');
      }
    }
    if (typeof optionValue === 'function') {
      node = optionValue();
      if (!node) {
        throw new Error('`' + optionName + '` did not return a node');
      }
    }
    return node;
  }

  function getInitialFocusNode() {
    var node;
    if (getNodeForOption('initialFocus') !== null) {
      node = getNodeForOption('initialFocus');
    } else if (container.contains(doc.activeElement)) {
      node = doc.activeElement;
    } else {
      node = state.firstTabbableNode || getNodeForOption('fallbackFocus');
    }

    if (!node) {
      throw new Error(
        "You can't have a focus-trap without at least one focusable element"
      );
    }

    return node;
  }

  // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.
  function checkPointerDown(e) {
    if (container.contains(e.target)) return;
    if (config.clickOutsideDeactivates) {
      deactivate({
        returnFocus: false
      });
    }
    // } else {
    //   e.preventDefault();
    // }
  }

  // In case focus escapes the trap for some strange reason, pull it back in.
  function checkFocusIn(e) {
    // // In Firefox when you Tab out of an iframe the Document is briefly focused.
    if (container.contains(e.target) || e.target instanceof Document) {
      return;
    }
    if (!config.trapFocus) {
      trap.deactivate({
        returnFocus: false
      });
      return;
    }
    // e.stopImmediatePropagation();
    // tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
  }

  // if we're not trapping focus, we want to allow the focus to come and go
  //   but activate when container receives focus and pause when it
  //   loses focus (latter handled in checkFocusIn)
  function checkContainerFocusIn(e) {
    if (config.trapFocus) {
      return;
    }
    if (!state.active) {
      trap.activate();
      // the click may have focused a node, so update our activeIndex
    }
  }

  function checkKey(e) {
    if (config.escapeDeactivates !== false && isEscapeEvent(e)) {
      e.preventDefault();
      deactivate();
      return;
    }
    if (isNextEvent(e) || isPrevEvent(e)) {
      moveFocus(e);
      return;
    }
  }

  function moveFocus(e) {
    // updateTabbableNodes();
    var isTrappable = config.trapTabs || !isTabEvent(e);
    if (isPrevEvent(e)) {
      advanceTabbable(-1, isTrappable);
    } else if (isNextEvent(e)) {
      advanceTabbable(1, isTrappable);
    } else {
      return;
    }
    if (isTrappable) {
      e.preventDefault();
    }
  }

  function getNextActiveNodeIndex(incrementBy, skipWrap) {
    var nextIndex = state.activeTabbableNodeIndex + incrementBy;
    if (nextIndex === state.tabbableNodes.length) {
      if (skipWrap) {
        nextIndex = state.tabbableNodes.length - 1;
      } else {
        nextIndex = 0;
      }
    }
    if (nextIndex < 0) {
      if (skipWrap) {
        nextIndex = 0;
      } else {
        nextIndex = state.tabbableNodes.length - 1;
      }
    }
    return nextIndex;
  }

  function advanceTabbable(incrementBy, isTrappable) {
    state.activeTabbableNodeIndex = getNextActiveNodeIndex(
      incrementBy,
      !isTrappable
    );
    if (isTrappable) {
      tryFocus(state.tabbableNodes[state.activeTabbableNodeIndex]);
    }
  }

  function checkClick(e) {
    updateActiveTabbableNode(e);
    if (config.clickOutsideDeactivates) return;
    if (container.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function updateTabbableNodes() {
    state.tabbableNodes = tabbable(container);
    state.firstTabbableNode = state.tabbableNodes[0] || getInitialFocusNode();
    state.lastTabbableNode =
      state.tabbableNodes[state.tabbableNodes.length - 1] ||
      getInitialFocusNode();
    // find active
    state.activeTabbableNodeIndex = 0;
    state.tabbableNodes.forEach(function(node, idx) {
      if (node === document.activeElement) {
        state.activeTabbableNodeIndex = idx;
      }
    });
  }

  function tryFocus(node) {
    if (node === doc.activeElement) return;
    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus();
    state.mostRecentlyFocusedNode = node;
    if (isSelectableInput(node)) {
      node.select();
    }
  }

  function isNextArrowEvent(e) {
    return (
      (config.trapHorizontalArrows &&
        (e.key === 'ArrowRight' || e.keyCode === 39)) ||
      (config.trapVerticalArrows && (e.key === 'ArrowDown' || e.keyCode === 40))
    );
  }

  function isPrevArrowEvent(e) {
    return (
      (config.trapHorizontalArrows &&
        (e.key === 'ArrowLeft' || e.keyCode === 37)) ||
      (config.trapVerticalArrows && (e.key === 'ArrowUp' || e.keyCode === 38))
    );
  }

  function isNextEvent(e) {
    return isNextTabEvent(e) || isNextArrowEvent(e);
  }

  function isPrevEvent(e) {
    return isPrevTabEvent(e) || isPrevArrowEvent(e);
  }

  function isTabEvent(e) {
    return e.key === 'Tab' || e.keyCode === 9;
  }

  function isNextTabEvent(e) {
    return isTabEvent(e) && !e.shiftKey;
  }

  function isPrevTabEvent(e) {
    return isTabEvent(e) && e.shiftKey;
  }
}

function isSelectableInput(node) {
  return (
    node.tagName &&
    node.tagName.toLowerCase() === 'input' &&
    typeof node.select === 'function'
  );
}

function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
}

function delay(fn) {
  return setTimeout(fn, 0);
}

module.exports = focusTrap;
