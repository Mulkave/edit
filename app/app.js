// ====================================
// Pane
// ====================================

angular.module('pane', ['ace', 'util']);

var PaneController = function ($scope, detector, pubsub) {
  $scope.mode = 'html';
  $scope.change = function () {
    pubsub.emit('pane:source:change');
  };

  pubsub.on('pane:source:change', function () {
    var result = detector($scope.source);
    if( result.length > 0 ) {
      $scope.mode = result;
    }
  });

  pubsub.on('pane:source:request', function () {
    pubsub.emit('pane:source:response', $scope.source);
  });
};

// ====================================
// Preview
// ====================================

angular.module('edit', ['pane']);

var PreviewController = function ($scope, pubsub) {
  $scope.timeout = null;
  $scope.root = document.querySelector('.preview');

  $scope.request_source = function () {
    $scope.timeout = null;
    pubsub.emit('pane:source:request');
  };

  // Prepare a fresh frame
  pubsub.on('pane:source:response', function (source) {
    var fresh = {};
    fresh.elem = document.createElement('iframe');
    fresh.elem.setAttribute('frameborder', '0');
    $scope.root.prependChild(fresh.elem);
    // Wait till next tick
    setTimeout(pubsub.emit.bind(pubsub, 'pane:fresh:ready', source), 1);
    $scope.fresh = fresh;
  });

  pubsub.on('pane:fresh:ready', function (source) {
    var fresh = $scope.fresh;
    try {

      fresh.window = fresh.elem.contentWindow;
      fresh.document = fresh.window.document;

      fresh.document.open();
      fresh.document.write(source);
      fresh.document.close();

      pubsub.emit('pane:fresh:done');

    } catch(e) {
      console.log(e);
    }
  });

  // Swap out the elements & call for the stale element to be removed
  pubsub.on('pane:fresh:done', function () {
    if( $scope.active ) {
      $scope.stale = $scope.active;
      pubsub.emit('pane:stale:remove');
    }
    $scope.active = $scope.fresh;
    $scope.active.elem.classList.add('active');
  });

  // Remove the active class, and remove it next tick
  pubsub.on('pane:stale:remove', function () {
    if( ! $scope.stale ) return;
    $scope.stale.elem.classList.remove('active');
    setTimeout($scope.root.removeChild.bind($scope.root, $scope.stale.elem), 200);
  });

  pubsub.on('pane:source:change', function () {
    if( $scope.timeout ) {
      clearTimeout($scope.timeout);
    }
    $scope.timeout = setTimeout($scope.request_source.bind(this), 200);
  });
};