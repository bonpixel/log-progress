/*****************************************************************************
 * LogDisplay stuff
 ****************************************************************************/

function LogDisplay() {
    this.$deployLogModal = null;
    this.$deployLogModalList = null;
    this.$banner = null;

    this.cachedHeight = null;
    this.logLineCount = null;
    this.pollUrl = null;
    this.callback = null;
    this.isOpen = null;
    this.progressTrackers = [];
    this.currentProgressTracker = null;
}

LogDisplay.prototype.startLogDisplay = function(pollUrl, callback) {

    var _this = this;
    this.logLineCount = 0;
    this.pollUrl = pollUrl;
    this.callback = callback;

    //////////////////////
    // Create the modal //
    //////////////////////

    if(this.$deployLogModal){
        this.$deployLogModal = null;
    }

    this.$deployLogModal = $("<div />");
    this.$deployLogModal
        .addClass('deployLogModal')
        .appendTo('body');

    this.$deployLogModalList = $('<ul/>').appendTo(this.$deployLogModal);

    this.$deployLogModal.dialog({
        position: "center top+30",
        draggable: false,
        modal: true,
        title: "Deploy Status",
        width: 900,
        height: 400,
        create: function (){
            $("body").addClass("modal-open");
        },
        close: function(){
            $("body").removeClass("modal-open");
            _this.$deployLogModal.remove();
            _this.progressTrackers = [];
        },
        buttons: [
            {
                id : 'deployLogClose',
                class: 'closeBtn',
                text : "Close",
                disabled: true,
                click : function() {
                    $(this).dialog("close");
                    return;
                },
            }
        ]
    });

    this.cachedHeight = this.$deployLogModal.height();
    this.$deployLogModal.css({height: 0});
    this.isOpen = false;

    var headerHTML;
    if(typeof(ProgressTracker) == 'undefined'){
        headerHTML = '<div class="stagesWrap"><h2 class="introMessage">STATUS: Deploying&hellip;</h2></div><div class="messagesWrap"></div>';
    } else {
        headerHTML = '<div class="stagesWrap"><h2 class="introMessage">Gathering Stages&hellip;</h2></div><div class="messagesWrap"></div>';
    }

    ///////////////////////
    // Create the header //
    ///////////////////////
    this.$banner = $('<div/>');
    this.$banner
        .addClass('deployLogBanner')
        .html(headerHTML)
        .insertBefore(this.$deployLogModal);


    //////////////////////////
    // Create toggle button //
    //////////////////////////
    this.$toggleLogsBtn = $('<div/>');
    this.$toggleLogsBtn
        .addClass('toggleLogsBtn')
        .html('<span>Show Logs</span>')
        .insertAfter(this.$deployLogModal);

    // Bind events
    this.$toggleLogsBtn.on('click', _this.toggleLogs.bind(_this) );

    if(typeof(ProgressTracker) == 'undefined'){
        this.toggleLogs();
    }



    this.poll();
};

LogDisplay.prototype.poll = function() {
    var _this = this;
    // Lazy use of global scope >:(
    setTimeout( function(){ _this.update(); }, 2000);
};

LogDisplay.prototype.update = function() {
    var _this = this;
    var url = buildinfoServerUrl + this.pollUrl + "?skipLines=" + this.logLineCount;
    $.ajax({
        url: url,
        type: 'GET',
        error: genericAjaxErrorHandler,
        success: function(data) {

            if(typeof(ProgressTracker) != 'undefined'){
                _this.appendParsedLogData( _this.parseLogData(data), _this.$deployLogModal );
            }

            // check to see if we are at the bottom before appending the logs
            _this.checkForScroll();

            // Add the new log files to the logs
            $.each(data.logLines, function(index,logMessage) {
                _this.$deployLogModal.find("ul").append($("<li>" + logMessage + "</li>"));
            });

            // If we were at the bottom, then scroll to the new bottom after append
            if(_this.willScroll){_this.scrollToEnd();}

            _this.logLineCount += data.logLines.length;
            if (data.running) {
                _this.poll();
            } else {
                _this.$deployLogModal.parent().find('.closeBtn').button('enable');

                // alert("Process complete.");
                if (_this.callback) {
                    _this.callback();
                }
            }
        }
    });
};

LogDisplay.prototype.parseLogData = function(data) {
    var logLines = data.logLines.join('\n'),
        pattern = /^%{3}\s{0,}(.+(?=:(?:\s{0,})))(?:\:\s{0,})(.+(?=\s))(?:\s{0,}%{4})/gm,
        result,
        results = [],
        resultsAll = [];

    while ( ( result = pattern.exec(logLines) ) !== null ) {
        resultsAll.push(result);

        switch( result[1] ) {

            case "STAGES":
                var currentStages = result[2].replace(/\s?,\s?/gm, ',').split(',');

                // if there is a current ProgressTracker then error it.
                if(this.currentProgressTracker){ this.currentProgressTracker.failStage(); }
                var progressTracker = new ProgressTracker( this.$banner.find('.stagesWrap'), currentStages, {
                    append: this.progressTrackers.length > 0 ? true : false,
                    deactivatePrevious: true
                });

                // Append additional ProgressTrackers to the array
                this.progressTrackers.push(progressTracker);

                // Set the currently active ProgressTracker to the new one
                this.currentProgressTracker = progressTracker;
                break;

            case "STATUS":
                this.currentProgressTracker.incrementStage();

                results.push(result);
                // console.log(result);
                break;

            case "SUCCESS":
                this.currentProgressTracker.incrementStage();

                results.push(result);
                // console.log(result);
                break;

            case "FAIL":
                this.currentProgressTracker.failStage();

                results.push(result);
                // console.log(result);
                break;

            case "FINISHED":

                // If Failed
                if( result[2] === "FAIL"){
                    this.currentProgressTracker.failStage();
                }

                if( result[2] === "SUCCESS"){
                    this.currentProgressTracker.incrementStage();
                }

                results.push(result);
                // console.log(result);
                break;

            default:
                break;
        }
    }

    return (results.length > 0) ? results : null;
};

LogDisplay.prototype.appendParsedLogData = function(parsed, element){
    // fail fast
    if(!parsed){ return; }

    var status = parsed[parsed.length -1][1],
        message = parsed[parsed.length -1][2],
        $cache = this.$banner.find('.messagesWrap');

    if( $cache.children().length > 0){
        $cache
            .children()
                .velocity( "transition.fadeOut", function( els ){
                    $(els).remove();
                    $('<h2 class="status">' + status + ':</h2><h2 class="message">' + message + '</h2>')
                        .css({opacity: 0})
                        .appendTo($cache)
                        .velocity( "transition.fadeIn");
                });
    } else {
        $('<h2 class="status">' + status + ':</h2><h2 class="message">' + message + '</h2>')
            .appendTo($cache)
            .css( {opacity: 0} )
            .velocity( "transition.fadeIn" );
    }
};

LogDisplay.prototype.checkForScroll = function(element){
    if(this.$deployLogModalList.position().top - this.cachedHeight + this.$deployLogModalList.outerHeight() < 10 ||
        this.$deployLogModalList.outerHeight() < this.cachedHeight ){
        this.willScroll = true;
    } else {
        this.willScroll = false;
    }
};

LogDisplay.prototype.scrollToEnd = function(){
    this.$deployLogModalList
        .velocity("scroll", {
            duration: 500,
            easing: "easeInOutQuint",
            offset: this.$deployLogModalList.outerHeight() - this.cachedHeight,
            container: this.$deployLogModal
        });
};

LogDisplay.prototype.toggleLogs = function(ev){
    var _this = this;

    if(_this.isOpen){
        this.$toggleLogsBtn
            .html('<span>Show Logs</span>');

        this.$deployLogModal.velocity({
            height: 0
        }, function(){
            _this.isOpen = false;
        });

    } else {
        this.$toggleLogsBtn
            .html('<span>Hide Logs</span>');

        this.$deployLogModal.velocity({
            height: _this.cachedHeight
        }, function(){
            _this.isOpen = true;
        });
    }
};
