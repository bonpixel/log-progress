/*****************************************************************************
 * ProgressTracker stuff
 ****************************************************************************/

var ProgressTracker = function( $el, stages, options) {

  var
    // $el = $el,                                    // Target to place the ProgressTracker in
    $wrapper = null,                              // Wrapper for the entire Progress Tracker
    $preProgressBar = null,                       // Progress bar indicating in progress
    $progressBar = null,                          // Progress bar indicating complete
    $icons = [],                                  // Indexed 1:1 with each node
    $stages = [],                                 // All stages for the Progress Tracker as jQuery objects
    // stages = stages,                              // All stages for the Progress Tracker
    currentStage = null,                          // Current stage the Progress Tracker has marked COMPLETE
    currentStageIndex = -1,                       // Current index of the stage marked COMPLETE
    staticIcon = 'fa-circle-o',                   // Font Awesome Icon used for STATIC/NOT STARTED stages
    completeIcon = 'fa-dot-circle-o',             // Font Awesome Icon used for COMPLETE stages
    progressIcon = 'fa-circle-o-notch fa-spin',   // Font Awesome Icon used for PROGRESS stages
    warningIcon = 'fa-warning',                   // Font Awesome Icon used for WARNING stages
    errorIcon = 'fa-close',                       // Font Awesome Icon used for ERROR stages
    totalStageCount = 0
  ;

  var defaultOptions = {
    append: true,
    deactivatePrevious: false
  };

  var opts = $.extend(defaultOptions, options);

  // Private functions
  var create,
    incrementComplete,
    incrementProgressBar,
    errorProgressBar,
    errorStage,
    warningStage;

  create = function(){
    //when init attach after the dom node specified
    //
    var html = [];

    $el = $el;
    stages = stages;
    totalStageCount = stages.length;

    // make nodes
    for ( var i = 0; i < stages.length; i++ ) {
      var text = stages[i],
        cssClass = stages[i].toLowerCase().replace( /\s+/gm, '-' );
      html.push( '<div class="stageItem ' + cssClass + '"><i class="fa ' + staticIcon + '"></i><span class="text">' + text + '</span></div>' );
    }

    // make wrapper
    $wrapper = $( '<div/>' )
      .addClass( 'progressTrackerWrap' );

    // make preProgressBar
    $preProgressBar = $( '<div/>' )
      .addClass( 'preProgressBar' )
      .appendTo( $wrapper );

    // make progressbar
    $progressBar = $( '<div/>' )
      .addClass( 'progressBar' )
      .appendTo( $wrapper );

    // make subwrapper
    $stages = $( '<div/>' )
      .addClass( 'stages' )
      .html( html.join( '' ) )
      .appendTo( $wrapper );


    // add everything to the target element but first animate out what is already in there
    // If you want to replace the existing contents
    if( $el.children().length > 0 && !opts.append ){
      var currentChildren = $el.children();

      // append new hidden
      $stages.children().css( { opacity: 0 } );
      $preProgressBar.css( { opacity: 0 } );
      $progressBar.css( { opacity: 0 } );

      $wrapper.appendTo( $el );

      // Fade out Current
      $el
        .children()
        .velocity( "transition.fadeOut" , function( els ){

          // delete current
          $(currentChildren).remove();

          $wrapper.velocity({ opacity: 1 }, { display: "block" });

          // fade in new
          // Animate, reveal (sequentially)
          $stages.children()
            .css( { opacity: 0 } )
            .velocity( "transition.fadeIn", {
              stagger: 1000/$stages.children().length,
              drag: true,
              complete: function(){
                $preProgressBar.velocity( "transition.fadeIn" );
                $progressBar.velocity( "transition.fadeIn" );
              }
            });

        });
    }
    // If you want to append the existing contents
    else {
      if(opts.deactivatePrevious){
        $el
          .find('.progressTrackerWrap')
          .addClass('unactive');
      }

      $wrapper.appendTo( $el );

      // Animate, reveal (sequentially)
      $preProgressBar.css( { opacity: 0 } );
      $progressBar.css( { opacity: 0 } );
      $stages.children()
        .css( {opacity: 0} )
        .velocity( "transition.fadeIn", {
          stagger: 1000/$stages.children().length,
          drag: true,
          complete: function(){
            $preProgressBar.velocity( "transition.fadeIn" );
            $progressBar.velocity( "transition.fadeIn" );
          }
        });
    }

  };


  incrementComplete = function(){
    // update the dom accordingly
    if( currentStageIndex !== -1 ){
      $stages
        .children()
          .eq( currentStageIndex )
            .removeClass( 'isInProgress' )
            .addClass( 'isComplete' )
            .find( '.fa' )
              .removeClass( staticIcon + ' ' + progressIcon )
              .addClass( completeIcon );
    }

    if(currentStageIndex + 1 < totalStageCount){
      $stages
        .children()
          .eq( currentStageIndex+1 )
            .addClass( 'isInProgress' )
            .find( '.fa' )
              .removeClass( staticIcon )
              .addClass( progressIcon );
    }
  };


  incrementProgressBar = function(){
    var position,
      nextPosition;

    // advance the progress bar
    if( currentStageIndex > -1 ){
      position = $stages
        .children()
          .eq( currentStageIndex )
            .position().left;
      $progressBar.css( {width: position - $progressBar.position().left } );
    }

    // advance the preprogressbar
    if( currentStageIndex + 1 < totalStageCount ){
      nextPosition = $stages
        .children()
          .eq( currentStageIndex + 1 )
            .position().left;
      $preProgressBar.css( {width: nextPosition - $preProgressBar.position().left } );
    }
  };

  errorProgressBar = function() {
    $preProgressBar.addClass( 'isError' );
  };

  errorStage = function( elIndex ) {
    $stages
      .children()
        .eq( elIndex )
          .removeClass( 'isInProgress' )
          .addClass( 'isError' )
          .find( '.fa' )
            .removeClass( staticIcon + ' ' + progressIcon )
            .addClass( errorIcon );
  };

  warningStage = function( elIndex ) {
    $stages
      .children()
        .eq( elIndex )
          .removeClass( 'isInProgress' )
          .addClass( 'isWarning' )
          .find( '.fa' )
            .removeClass( staticIcon + ' ' + progressIcon )
            .addClass( warningIcon );
  };



  // Public API
  incrementStage = function(){
    incrementProgressBar();
    incrementComplete();
    ++currentStageIndex;

    return this;
  };

  failStage = function(){
    errorProgressBar();
    errorStage( currentStageIndex );

    // Add warnings to the stages after the error
    for (var i = currentStageIndex + 1; i < stages.length; i++) {
      warningStage( i );
    }

    return this;
  };


  // create the element
  create();

  // Return API
  return {
    incrementStage: incrementStage,
    failStage: failStage
  };
};
